import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("base.en", device="cpu", compute_type="int8")
import soundfile as sf, numpy as np
from scipy.signal import resample_poly
a, sr = sf.read(sys.argv[1], dtype="float32")
a = resample_poly(a, 2, 3).astype(np.float32)
segs, _ = m.transcribe(a, word_timestamps=True, beam_size=5, initial_prompt="Babylon, Cyrus, Opis, Sippar, Herodotus, Euphrates, Xenophon, B.C.")
words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open(sys.argv[2], "w"), indent=0)
print(len(words)); print(" ".join(w["w"] for w in words))
