import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("/home/user/tts/kokoro-v1.0.onnx", "/home/user/tts/voices-v1.0.bin")
voice, speed = sys.argv[1], float(sys.argv[2])
paras = [l.strip() for l in open("script.txt") if l.strip()]
out = []
for i, p in enumerate(paras):
    a, sr = k.create(p, voice=voice, speed=speed, lang="en-us")
    out.append(a); out.append(np.zeros(int(sr * 0.25), dtype=np.float32))
y = np.concatenate(out[:-1])
y = np.concatenate([np.zeros(int(sr*0.15), np.float32), y, np.zeros(int(sr*0.6), np.float32)])
sf.write(sys.argv[3], y, sr); print(sr, len(y)/sr)
