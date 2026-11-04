# Word timings for voice.wav with faster-whisper (word_timestamps); writes words.json [{w, s, e}]
import json
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
import wave, numpy as np
w = wave.open("/tmp/claude-0/v16.wav"); A = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
segs, _ = m.transcribe(A, word_timestamps=True, beam_size=5, language="en")
W = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
json.dump(W, open("words.json", "w"), indent=0)
print(" ".join(w["w"] for w in W))
