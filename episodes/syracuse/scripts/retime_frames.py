# Re-time an already rendered episode to a new narration WITHOUT re-rendering (audio replacement, Option 1):
# every video frame of the recording's timeline shows the existing drawing whose story frame belongs to that moment
# of the voice (voice/warp.json, the same map timewarp.ts uses). No drawing is changed or generated; drawings are
# only held longer or shorter. Writes out/seq_voice/<frame>.jpeg symlinks (video frames) + out/retime_map.json.
# usage: python3 scripts/retime_frames.py <dir_with_frames_0..> [<dir_with_following_frames> ...]
import json, os, sys
import numpy as np
dirs = sys.argv[1:]
files = [os.path.join(d, f) for d in dirs for f in sorted(os.listdir(d)) if f.endswith(".jpeg")]
P = json.load(open("production.config.json")); FPS, N = P["output"]["fps"], P["drawEvery"]
W = json.load(open("voice/warp.json")); A = W["anchors"]
xs, ys = np.array([a[0] for a in A]), np.array([a[1] for a in A])
def to_story(tv):  # voice seconds -> story seconds (inverse of the anchors; linear outside)
    if tv <= ys[0]: return xs[0] + tv - ys[0]
    if tv >= ys[-1]: return xs[-1] + tv - ys[-1]
    return float(np.interp(tv, ys, xs))
out = "out/seq_voice"; os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
m = []
for v in range(W["videoFrames"]):
    k = int(min(len(files) - 1, max(0, round(to_story(v / FPS) * FPS / N))))
    os.symlink(os.path.abspath(files[k]), os.path.join(out, f"{v:05d}.jpeg")); m.append(k)
json.dump({"videoFrames": W["videoFrames"], "drawings": len(files), "map": m}, open("out/retime_map.json", "w"))
used = len(set(m)); holds = np.diff([i for i, k in enumerate(m) if i == 0 or k != m[i - 1]] + [len(m)])
print(f"{W['videoFrames']} video frames from {len(files)} drawings; drawings used {used}; hold lengths frames: min {holds.min()} median {int(np.median(holds))} max {holds.max()}")
