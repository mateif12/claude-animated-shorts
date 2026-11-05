# Final checks: whole recording present, audio aligned with the master mix (lag 0), voice envelope correlation,
# video duration/frames, and the last word still audible before the end.
import json, subprocess, sys
import numpy as np
OUT = "/home/user/claude-animated-shorts/episodes/snake-mail/snake-mail-final.mp4"
SR = 48000
def dec(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:a:0", "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(np.float64)
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,nb_frames,duration,width,height,r_frame_rate:format=duration", "-of", "json", OUT], capture_output=True, text=True).stdout)
for s in pr["streams"]: print(s)
print("format duration", pr["format"]["duration"])
fin = dec(OUT)
mix = dec("/root/snake/audio/mix.wav")
voice = dec("/home/user/claude-animated-shorts/episodes/snake-mail/voice.mp3")
print(f"final audio {len(fin)/SR:.4f} s | mix {len(mix)/SR:.4f} s | voice file {len(voice)/SR:.4f} s")
n = min(len(fin), len(mix))
# lag between final audio and the master mix (AAC priming must be compensated by ffmpeg -> expect 0)
seg = slice(SR * 30, SR * 40)
best = max(range(-2000, 2001, 1), key=lambda L: float(np.dot(fin[seg.start + L: seg.stop + L], mix[seg])))
print("lag final vs mix (samples):", best)
err = fin[:n] - mix[:n]
print("final vs mix SNR dB:", round(10 * np.log10(np.sum(mix[:n] ** 2) / np.sum(err ** 2)), 1))
# voice envelope vs final envelope (20 ms RMS), correlation over the whole file
def env(x, w=960):
    k = len(x) // w
    return np.sqrt((x[: k * w].reshape(k, w) ** 2).mean(1))
ev, ef = env(voice), env(fin)
k = min(len(ev), len(ef))
print("voice/final envelope correlation:", round(float(np.corrcoef(ev[:k], ef[:k])[0, 1]), 3))
words = json.load(open("/root/snake/voice/words.json"))
last = words[-1]
a, b = int(last["s"] * SR), int(last["e"] * SR)
print(f"last word '{last['w']}' {last['s']}-{last['e']} s: voice RMS {np.sqrt(np.mean(voice[a:b]**2)):.4f}, final RMS {np.sqrt(np.mean(fin[a:b]**2)):.4f}; final audio ends {len(fin)/SR - last['e']:.3f} s after it")
print("voice file fully covered:", len(fin) >= len(voice), f"({len(fin) - len(voice)} samples spare)")
