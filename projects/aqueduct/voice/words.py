import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
import soundfile as sf, numpy as np
from scipy.signal import resample_poly
a, sr = sf.read(sys.argv[1]); a = resample_poly(a, 16000, sr).astype(np.float32)
segs, _ = m.transcribe(a, word_timestamps=True, beam_size=5)
W = []
for s in segs:
    for w in s.words: W.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
json.dump(W, open("words.json", "w"), indent=0)
print(" ".join(w["w"] for w in W)); print(len(W), "words")
