# Final QA of the delivered MP4 (adapted from templates/scripts/short_qa.py for the production profile):
# specs, loudness / true peak, voice sync, black / white / blank (camera inside geometry) / frozen frames, pops measured
# drawing-to-drawing (on twos a 1-frame diff of 0 is normal), per-shot stats and 2 s contact sheets.
# usage: python3 scripts/qa.py <video.mp4>  -> out/qa/report.md + out/qa/sheet_*.jpg
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
vid = sys.argv[1]; out = "out/qa"; os.makedirs(out, exist_ok=True)
P = json.load(open("production.config.json")); N = P["drawEvery"]; FPS = P["output"]["fps"]
run = lambda *a: subprocess.run(a, capture_output=True, text=True)
R, FAIL = [], []
pr = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,nb_frames,sample_rate,channels:format=duration", "-of", "json", vid).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video"); au = [s for s in pr["streams"] if s["codec_type"] == "audio"]
dur = float(pr["format"]["duration"])
R.append(f"SPECS {v['width']}x{v['height']} {v['r_frame_rate']} fps, {v.get('nb_frames')} frames, {dur:.3f} s; audio: " + (", ".join(f"{s['sample_rate']} Hz {s['channels']}ch" for s in au) or "NONE"))
if (int(v["width"]), int(v["height"])) != (P["output"]["width"], P["output"]["height"]): FAIL.append("wrong size")
if not au: FAIL.append("no audio")
meta = json.load(open("voice/warp.json"))
if abs(dur - meta["videoFrames"] / FPS) > 0.05: FAIL.append(f"length {dur:.2f} s != {meta['videoFrames'] / FPS:.2f} s")
e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-").stderr
tail = e[e.rfind("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+)", tail).group(1)); pk = float(re.search(r"Peak:\s+(-?[\d.]+)", tail).group(1))
R.append(f"LOUDNESS {I:.1f} LUFS (target {P['audio']['targetLufs']}), true peak {pk:.1f} dBFS")
if abs(I - P["audio"]["targetLufs"]) > 1.0: FAIL.append("loudness off target")
if pk > -1.0: FAIL.append("true peak above -1 dBFS")
W, H = 180, 320
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); n = len(F)
L = (F.astype(np.float32) / 255 @ np.array([0.2126, 0.7152, 0.0722], np.float32)).reshape(n, -1)
mean, std = L.mean(1), L.std(1)
black = [i for i in range(n) if mean[i] < 0.04]; white = [i for i in range(n) if mean[i] > 0.93]
blank = [i for i in range(n) if std[i] < 0.035]  # near-uniform frame: camera inside a prop / sail / wall
D = np.abs(F[N::N].astype(np.int16) - F[:-N:N].astype(np.int16)).mean(axis=(1, 2, 3))  # drawing-to-drawing
med = np.array([np.median(D[max(0, i - 6):i + 7]) for i in range(len(D))])
pops = [(i + 1) * N for i in range(len(D)) if D[i] > 4 * med[i] + 2.0]
frozen, rs = [], None
for i, d in enumerate(D):
    if d < 0.02: rs = i if rs is None else rs
    else:
        if rs is not None and (i - rs) * N >= 24: frozen.append((rs * N, i * N))
        rs = None
R.append(f"FRAMES {n}; black {black[:12]}; white {white[:12]}; blank {blank[:12]}; frozen >=24f {frozen[:8]}")
R.append(f"POPS (drawing-to-drawing spikes; check for unplanned cuts / flicker): {pops[:30]}")
if black or blank: FAIL.append("black/blank frames")
for k in range(0, n, 60):
    S = Image.new("RGB", (108 * 10, 192 * 6), "black"); d = ImageDraw.Draw(S)
    for j in range(min(60, n - k)):
        x, y = (j % 10) * 108, (j // 10) * 192
        S.paste(Image.fromarray(F[k + j]).resize((108, 192)), (x, y)); d.rectangle([x, y, x + 34, y + 12], fill="black"); d.text((x + 2, y + 1), str(k + j), fill="yellow")
    S.save(os.path.join(out, f"sheet_{k:05d}.jpg"), quality=85)
R.append("RESULT: " + ("PASS" if not FAIL else "FAIL: " + "; ".join(FAIL)))
open(os.path.join(out, "report.md"), "w").write("\n".join(R) + "\n"); print("\n".join(R))
sys.exit(1 if FAIL else 0)
