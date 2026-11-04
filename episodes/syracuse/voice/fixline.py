# Re-synthesize single lines in place: each new take starts at the old line's start time; the timeline after it is
# unchanged (the following pause absorbs any length difference). Usage: python fixline.py <idx> "<text>" [length_scale]
import json, sys, wave, subprocess, numpy as np
i, text = int(sys.argv[1]), sys.argv[2]; LS = sys.argv[3] if len(sys.argv) > 3 else "0.92"
L = json.load(open("lines.json"))
subprocess.run(["piper", "-m", "model/en_US-ryan-high.onnx", "--length-scale", LS, "--sentence-silence", "0", "-f", "/tmp/claude-0/fix.wav"], input=text.encode(), check=True, capture_output=True)
w = wave.open("/tmp/claude-0/fix.wav"); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32); sr = w.getframerate()
nz = np.where(np.abs(a) > 300)[0]; a = a[max(0, nz[0] - int(0.02 * sr)): nz[-1] + int(0.05 * sr)]
w = wave.open("voice_raw.wav"); y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).copy()
s0, e0 = int(L[i]["start"] * sr), int(L[i]["end"] * sr)
limit = int(L[i + 1]["start"] * sr) - int(0.08 * sr) if i + 1 < len(L) else len(y)
assert s0 + len(a) <= limit, f"new take too long: {len(a)/sr:.2f}s, slot {(limit-s0)/sr:.2f}s"
y[s0:e0] = 0; y[s0:s0 + len(a)] = a
L[i]["text"] = text; L[i]["end"] = round(L[i]["start"] + len(a) / sr, 3)
with wave.open("voice_raw.wav", "wb") as o: o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes(np.clip(y, -32767, 32767).astype(np.int16).tobytes())
json.dump(L, open("lines.json", "w"), indent=1)
print(f"line {i}: {len(a)/sr:.2f}s (was {(e0-s0)/sr:.2f}s, slot {(limit-s0)/sr:.2f}s)")
