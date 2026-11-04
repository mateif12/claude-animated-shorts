# Synthesize voice.wav line by line with Piper (en_US-ryan-high), inserting the per-line pause after each line.
import json, wave, subprocess, sys, numpy as np
LS = float(sys.argv[1]) if len(sys.argv) > 1 else 0.9
rows = [l.rstrip("\n").split("|", 1) for l in open("lines.txt") if l.strip()]
sr = 22050; out = []; lines = []; t = 0.0
for i, (pause, text) in enumerate(rows):
    subprocess.run(["piper", "-m", "model/en_US-ryan-high.onnx", "--length-scale", str(LS), "--sentence-silence", "0", "-f", f"/tmp/claude-0/l{i}.wav"], input=text.encode(), check=True, capture_output=True)
    w = wave.open(f"/tmp/claude-0/l{i}.wav"); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32); sr = w.getframerate()
    # trim leading/trailing silence
    nz = np.where(np.abs(a) > 300)[0]; a = a[max(0, nz[0] - int(0.02 * sr)): nz[-1] + int(0.05 * sr)]
    lines.append({"i": i, "text": text, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out.append(a); t += len(a) / sr
    gap = np.zeros(int(float(pause) * sr), np.float32); out.append(gap); t += len(gap) / sr
y = np.concatenate([np.zeros(int(0.08 * sr), np.float32)] + out)
for L in lines: L["start"] += 0.08; L["end"] += 0.08
y = np.clip(y, -32767, 32767).astype(np.int16)
with wave.open("voice_raw.wav", "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())
json.dump(lines, open("lines.json", "w"), indent=1)
print(f"{len(y)/sr:.2f}s", sum(len(r[1].split()) for r in rows), "words")
