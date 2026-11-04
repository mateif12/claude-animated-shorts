import json
W = json.load(open("words.json"))
cues, cur = [], []
for w in W:
    cur.append(w)
    txt = " ".join(x["w"] for x in cur)
    if w["w"][-1] in ".?!," and len(txt) > 18 or len(txt) > 38 or w["w"].endswith("..."):
        cues.append(cur); cur = []
if cur: cues.append(cur)
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
out = []
for i, c in enumerate(cues):
    a = max(0, c[0]["s"] - 0.05); b = c[-1]["e"] + 0.25
    if i + 1 < len(cues): b = min(b, cues[i + 1][0]["s"] - 0.02)
    txt = " ".join(x["w"] for x in c).replace("five thirty-nine B.C.,", "539 BC,"); out.append(f"{i+1}\n{ts(a)} --> {ts(b)}\n{txt}\n")
open("../final/babylon_short_FINAL.srt", "w").write("\n".join(out))
print(len(out)); print(out[0], out[-1])
