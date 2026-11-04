# Analyze the supplied narration (voice.mp3 at the episode root) and derive every timing the production needs.
# The MP3 is the AUTHORITATIVE narration: it is decoded (no tempo / pitch change, no edits), never regenerated.
# Speech recognition is used ONLY to find where each word is spoken (alignment), never to change the voice.
#
# Writes:
#   voice/voice.wav      decoded narration, 48 kHz, original channels, same duration (the mix reads this)
#   voice/words.json     [{w, s, e}] word timings in the recording
#   voice/lines.json     [{i, text, start, end}] one entry per script line (SCRIPT.md narration block), aligned
#   voice/warp.json      story-time -> voice-time anchors + video length (src/videos/*/timewarp.ts reads it)
#   voice/TIMING.md      human-readable report: duration, frames, lines, pauses, deviations from the script, loudness
#
# Usage: python3 scripts/analyze_voice.py [--tag SECONDS]
#   --tag   silent visual tag after the last word (default: the story's own tail, else 1.0 s)
# If voice/story_words.json exists (the word timing the animation was designed on), the warp aligns those words to the
# recording so existing animation follows the new voice; otherwise the warp is the identity (design directly on it).
import argparse, difflib, json, math, os, re, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = lambda *p: os.path.join(ROOT, "voice", *p)
MP3 = os.path.join(ROOT, "voice.mp3")
FPS = 30


def die(msg):
    print("\n*** " + msg + "\n", file=sys.stderr)
    sys.exit(2)


def norm(w):
    w = w.lower().replace("’", "'")
    w = re.sub(r"[^a-z0-9']", "", w)
    nums = {"60": "sixty", "214": "twofourteen", "70": "seventy", "5": "five", "2": "two"}
    return nums.get(w, w)


def script_lines():
    """narration lines: the fenced ```narration block of SCRIPT.md (one sentence / line per row)"""
    p = os.path.join(ROOT, "SCRIPT.md")
    if not os.path.exists(p):
        return []
    s = open(p, encoding="utf-8").read()
    m = re.search(r"```narration\n(.*?)```", s, re.S)
    body = m.group(1) if m else s
    return [l.strip() for l in body.splitlines() if l.strip() and not l.startswith("#")]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--tag", type=float, default=None); a = ap.parse_args()
    if not os.path.exists(MP3):
        die(f"NARRATION MISSING: put the recorded narration at {os.path.relpath(MP3, os.path.dirname(os.path.dirname(ROOT)))}\n"
            "    Production stops here. No generated voice is substituted.")
    os.makedirs(V(), exist_ok=True)
    # ---- decode (time-exact) ----
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels:format=duration,bit_rate",
                                    "-of", "json", MP3], capture_output=True, text=True).stdout)
    dur_src = float(pr["format"]["duration"]); st = pr["streams"][0]
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", MP3, "-ar", "48000", "-c:a", "pcm_s24le", V("voice.wav")], check=True)
    w = wave.open(V("voice.wav")); dur = w.getnframes() / w.getframerate(); w.close()
    # ---- loudness, peaks, pauses ----
    e = subprocess.run(["ffmpeg", "-i", V("voice.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = e[e.rfind("Summary:"):]
    I = re.search(r"I:\s+(-?[\d.]+) LUFS", tail); P = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
    sd = subprocess.run(["ffmpeg", "-i", V("voice.wav"), "-af", "silencedetect=n=-38dB:d=0.25", "-f", "null", "-"], capture_output=True, text=True).stderr
    sil = [(float(x), float(y)) for x, y in re.findall(r"silence_start: ([\d.]+).*?silence_end: ([\d.]+)", sd, re.S)]
    # ---- word timing (alignment only) ----
    from faster_whisper import WhisperModel
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", V("voice.wav"), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    A = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    segs, _ = m.transcribe(A, word_timestamps=True, beam_size=5, language="en")
    words = [{"w": x.word.strip(), "s": round(x.start, 3), "e": round(x.end, 3)} for sg in segs for x in sg.words]
    json.dump(words, open(V("words.json"), "w"), indent=0)
    first, last = (words[0]["s"], words[-1]["e"]) if words else (0.0, dur)
    # ---- script lines -> times ----
    S = script_lines(); lines, devs = [], []
    if S:
        sw = [(i, norm(t)) for i, l in enumerate(S) for t in l.split() if norm(t)]
        vw = [norm(x["w"]) for x in words]
        sm = difflib.SequenceMatcher(a=[t for _, t in sw], b=vw, autojunk=False)
        hit = {}
        for blk in sm.get_matching_blocks():
            for k in range(blk.size): hit[blk.a + k] = blk.b + k
        for op, a0, a1, b0, b1 in sm.get_opcodes():
            if op != "equal":
                devs.append(f"{op}: script \"{' '.join(t for _, t in sw[a0:a1])}\" vs spoken \"{' '.join(vw[b0:b1])}\"")
        for i, l in enumerate(S):
            idx = [hit[k] for k, (li, _) in enumerate(sw) if li == i and k in hit]
            lines.append({"i": i, "text": l, "start": words[min(idx)]["s"] if idx else None, "end": words[max(idx)]["e"] if idx else None})
        json.dump(lines, open(V("lines.json"), "w"), indent=1)
    # ---- warp: story time -> voice time ----
    anchors = []
    story_frames = None
    if os.path.exists(V("story_words.json")):
        ref = json.load(open(V("story_words.json")))
        sm = difflib.SequenceMatcher(a=[norm(x["w"]) for x in ref], b=[norm(x["w"]) for x in words], autojunk=False)
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                s0, v0 = ref[blk.a + k]["s"], words[blk.b + k]["s"]
                if not anchors or (s0 - anchors[-1][0] > 0.25 and v0 - anchors[-1][1] > 0.1):
                    anchors.append([round(s0, 3), round(v0, 3)])
        meta = json.load(open(V("story_meta.json"))) if os.path.exists(V("story_meta.json")) else {}
        story_frames = meta.get("storyFrames")
        story_tail = (story_frames / FPS - ref[-1]["e"]) if story_frames else 1.0
        anchors.insert(0, [0.0, 0.0]) if anchors and anchors[0][0] > 0 else None
        if anchors: anchors.append([round(ref[-1]["e"], 3), round(last, 3)])
        tag = a.tag if a.tag is not None else max(0.6, story_tail)
    else:
        tag = a.tag if a.tag is not None else 1.0
    video_frames = int(math.ceil((max(last, dur if not words else last) + tag) * FPS))
    video_frames = max(video_frames, int(math.ceil(dur * FPS)))
    json.dump({"anchors": anchors, "storyFrames": story_frames or video_frames, "videoFrames": video_frames,
               "voiceSeconds": round(dur, 3), "tagSeconds": round(tag, 2)}, open(V("warp.json"), "w"), indent=1)
    # ---- report ----
    R = [f"# Narration timing: {os.path.basename(ROOT)}", "",
         f"- Source: `voice.mp3`: {dur_src:.3f} s, {st.get('sample_rate')} Hz, {st.get('channels')} ch, {int(pr['format'].get('bit_rate', 0)) // 1000} kb/s",
         f"- Decoded `voice/voice.wav`: {dur:.3f} s (48 kHz, 24-bit; no tempo or pitch change)",
         f"- Speech: first word {first:.2f} s, last word ends {last:.2f} s; {len(words)} words, {len(words) / max(1e-3, last - first):.2f} words/s",
         f"- Loudness: {I.group(1) if I else '?'} LUFS integrated, peak {P.group(1) if P else '?'} dBFS (the mix normalizes; the voice is never clipped)",
         f"- **Video length: {video_frames} frames = {video_frames / FPS:.2f} s** (last word + {tag:.2f} s tag)",
         f"- Warp anchors (story to voice): {len(anchors)} {'(identity: design directly on this recording)' if not anchors else ''}", "",
         "## Script lines", "| # | start | end | frame | line |", "|---|---|---|---|---|"]
    for l in lines:
        R.append(f"| {l['i']} | {l['start'] if l['start'] is not None else '?'} | {l['end'] if l['end'] is not None else '?'} | "
                 f"{round(l['start'] * FPS) if l['start'] is not None else '?'} | {l['text']} |")
    R += ["", "## Pauses >= 0.25 s (comedic beats live here)", "| from | to | length | frames |", "|---|---|---|---|"]
    R += [f"| {x:.2f} | {y:.2f} | {y - x:.2f} s | {round(x * FPS)}-{round(y * FPS)} |" for x, y in sil if first - 0.05 < x < last]
    R += ["", "## Deviations from SCRIPT.md (check the recording; the recording wins)"] + ([f"- {d}" for d in devs] or ["- none"])
    open(V("TIMING.md"), "w").write("\n".join(R) + "\n")
    print("\n".join(R[:9]))
    print(f"\nwrote voice/voice.wav, words.json, lines.json, warp.json, TIMING.md ({len(devs)} script deviations)")


if __name__ == "__main__":
    main()
