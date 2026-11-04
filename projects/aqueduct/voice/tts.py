# Kokoro v1.0 TTS: one steady documentary voice, generated sentence by sentence so the pauses are controlled.
import sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
K = Kokoro("/root/models/kokoro/kokoro-v1.0.onnx", "/root/models/kokoro/voices-v1.0.bin")
voice, speed = sys.argv[1], float(sys.argv[2])
lines = [l.strip() for l in open(sys.argv[3]) if l.strip()]
out, sr_all, parts = [], 24000, []
t = 0.25
out.append(np.zeros(int(0.25 * sr_all), np.float32))
for i, line in enumerate(lines):
    a, sr = K.create(line, voice=voice, speed=speed, lang="en-us")
    # trim leading/trailing silence
    idx = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, idx[0] - 240): idx[-1] + 480]
    parts.append({"i": i, "start": round(t, 3), "end": round(t + len(a) / sr, 3), "text": line})
    out.append(a.astype(np.float32)); t += len(a) / sr
    gap = 0.32 if line.endswith(("?", ".")) else 0.2
    out.append(np.zeros(int(gap * sr), np.float32)); t += gap
y = np.concatenate(out)
sf.write(sys.argv[4], y, sr_all)
json.dump(parts, open(sys.argv[4].replace(".wav", "_lines.json"), "w"), indent=1)
print("duration", round(len(y) / sr_all, 2))
