# Sound for the episode, built AROUND the supplied narration (voice.mp3 -> voice/voice.wav by analyze_voice.py).
# The voice is never edited, re-timed, pitch-shifted or regenerated: it is only level-matched in the final master.
# Music and SFX are written in STORY seconds (the times in story.ts / cast.ts) and placed on the voice timeline through
# voice/warp.json, so every hit keeps its word. Mix (Syracuse settings, production.config.json "audio"):
#   music bed ~10 LU under the voice, ducked 5 dB under every word (10 dB under the hook and the punchline),
#   SFX bed ~9 LU under the voice, ducked 5 dB under words (impacts still land on their word),
#   master -15 LUFS integrated, sample peak <= -2 dBFS (true peak <= -1 dBTP), exact video length, 48 kHz stereo 24-bit.
# Usage: python3 audio/episode_audio.py  -> audio/mix.wav, stem_*.wav, cues.md
import json, os, sys
import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp, bp, read_wav, write_wav, true_peak, phase, tt
import instruments as I
import sfx_gen as G

P = json.load(open(os.path.join(ROOT, "production.config.json")))
AU = P["audio"]; FPS = P["output"]["fps"]
if not os.path.exists(os.path.join(ROOT, "voice", "voice.wav")) or not os.path.exists(os.path.join(ROOT, "voice", "warp.json")):
    sys.exit("*** NARRATION MISSING OR NOT ANALYZED: put voice.mp3 in the episode folder and run python3 scripts/analyze_voice.py")
WARP = json.load(open(os.path.join(ROOT, "voice", "warp.json")))
TOTAL = WARP["videoFrames"]; DUR = TOTAL / FPS; N = ns(DUR)
F = I.m2f
_A = WARP["anchors"]


def W(ts):
    """story seconds -> voice (video) seconds (identity when the story was designed on this recording)"""
    if not _A: return ts
    xs, ys = [a[0] for a in _A], [a[1] for a in _A]
    if ts <= xs[0]: return ys[0] + ts - xs[0]
    if ts >= xs[-1]: return ys[-1] + ts - xs[-1]
    return float(np.interp(ts, xs, ys))


SFX = np.zeros((2, N)); MUS = np.zeros((2, N)); EVENTS = []


def ev(t, name, x, p=0.0, g=0.0):
    """SFX at story time t (s), pan p, gain g dB"""
    place(SFX, pan(x, p) if np.ndim(x) == 1 else x, W(t), dbg(g)); EVENTS.append((W(t), name, g))


def note(t, name, x, p=0.0, g=0.0):
    """music event at story time t"""
    place(MUS, pan(x, p) if np.ndim(x) == 1 else x, W(t), dbg(g))


# ---------------------------------------------------------------- comic sound kit (Syracuse)
def slide_whistle(f0, f1, dur, r, vib=0.0):
    t = tt(dur); f = f0 * (f1 / f0) ** (t / dur) * (1 + vib * np.sin(2 * np.pi * 6 * t))
    y = np.sin(phase(f)) + 0.15 * np.sin(2 * phase(f)) + 0.03 * hp(r.standard_normal(len(t)), 2000)
    return fades(y * np.clip(t / 0.02, 0, 1), 0.005, 0.05) * 0.5


def boing(r, f0=180, dur=0.6):
    t = tt(dur); f = f0 * (1 + 0.6 * np.exp(-t / 0.08) * np.cos(2 * np.pi * 11 * t))
    return fades(np.sin(phase(f)) * np.exp(-t / 0.25) * 0.7, 0.002, 0.05)


def thunk(r, f0=140, dur=0.25, bright=1.0):
    t = tt(dur)
    body = np.sin(phase(f0 * (1 + 0.8 * np.exp(-t / 0.01)))) * np.exp(-t / 0.06)
    return fades(body + 0.6 * bp(r.standard_normal(len(t)), 800, 5000 * bright, 1) * np.exp(-t / 0.008), 0.0, 0.03)


def falling_whistle(dur, r, f0=1900, f1=500):
    t = tt(dur); f = f0 * (f1 / f0) ** (t / dur)
    return fades(np.sin(phase(f)) * np.clip(t / 0.15, 0, 1) * 0.35 + 0.05 * bp(r.standard_normal(len(t)), 600, 3000, 1), 0.01, 0.02)


def pour(dur, r):
    t = tt(dur)
    return G.bubbles(dur, r, 260 + 0 * t, 400, 3000, (0.004, 0.02), np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)) * 0.7


# ---------------------------------------------------------------- score building blocks (original, write per episode)
rm = rng(77)


def fanfare(t0, q, vel=0.8, transpose=0, g=0.0):
    for b, L, m in [(0, .75, 62), (.75, .25, 62), (1, 1, 69), (2, .5, 67), (2.5, .5, 69), (3, 1, 74), (4, 1.5, 72), (5.5, .5, 69), (6, 2, 70)]:
        note(t0 + b * q, "horn", I.brass(F(m + transpose), L * q * 0.95, vel, rm, kind="horn"), 0.2, g)
        note(t0 + b * q, "horn2", I.brass(F(m + transpose - 5), L * q * 0.95, vel * 0.7, rm, kind="horn"), -0.2, g - 4)
    for b, m in [(0, 38), (2, 45), (4, 41), (6, 46)]:
        note(t0 + b * q, "tuba", I.brass(F(m + transpose), 1.8 * q, vel, rm, kind="tuba"), 0, g - 1)


def march(t0, t1, q, vel=0.6, g=0.0, bassline=(38, 45, 41, 45)):
    t, k = t0, 0
    while t < t1 - 0.05:
        m = bassline[(k // 2) % len(bassline)]
        if k % 2 == 0: note(t, "tuba", I.brass(F(m), q * 0.8, vel, rm, kind="tuba"), 0, g)
        else:
            note(t, "pah", I.brass(F(m + 24), q * 0.4, vel * 0.6, rm, kind="stab"), 0.25, g - 6)
            note(t, "pah", I.brass(F(m + 28), q * 0.4, vel * 0.5, rm, kind="stab"), -0.25, g - 7)
        note(t, "snare", I.snare(vel * (0.7 if k % 2 else 0.45), rm), 0.1, g - 9)
        t += q; k += 1


def lyre(t0, t1, q, vel=0.5, g=0.0, pattern=(62, 69, 74, 77, 76, 74, 69, 65)):
    t, k = t0, 0
    while t < t1 - 0.05:
        note(t, "lyre", I.pluck(F(pattern[k % len(pattern)]), vel, rm, dur=1.2, bright=0.35), 0.15 * ((k % 3) - 1), g)
        t += q; k += 1


def pizz(t0, t1, q, vel=0.55, g=0.0, notes=(62, 65, 69, 65, 64, 67, 70, 67)):
    t, k = t0, 0
    while t < t1 - 0.05:
        note(t, "pizz", I.pluck(F(notes[k % len(notes)]), vel, rm, dur=0.35, bright=0.6), 0.2 * ((k % 2) * 2 - 1), g)
        t += q; k += 1


def roll(t0, t1, v0, v1, g=-12):
    for tr, vr in I.snare_roll(t0, t1, v0, v1, rm): note(tr, "roll", I.snare(vr, rm, dur=0.15), 0.1, g)


# ================================================================ EPISODE CONTENT (replace) ==================
r = rng(1)
ev(0.0, "ambience", fades(G.breeze(DUR, r, level=0.8), 0.1, 1.0), 0, -24)
ev(4.0, "impact", thunk(r, 120, 0.3), 0, -8)
ev(4.05, "boing", boing(r), 0, -12)
march(0.1, 4.0, 60 / 112, 0.6, g=-3)
lyre(5.0, DUR - 0.5, 0.36, 0.5, g=-2)
DEEP = [(0.0, 3.0)]  # voice seconds where the music ducks extra deep (hook line, punchline)
# =============================================================================================================


def main():
    global MUS
    v, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR, sr
    vv = v if v.ndim == 2 else np.stack([v, v])
    if vv.shape[0] == 1: vv = np.concatenate([vv, vv])
    V = np.zeros((2, N)); V[:, :min(N, vv.shape[1])] = vv[:, :N]
    ir = make_ir(1.1, 3)
    MUS = MUS + 0.18 * convolve_st(MUS, ir)[:, :N]
    sfx = SFX + 0.1 * convolve_st(SFX, ir)[:, :N]
    words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
    env = np.zeros(N)
    for w in words: env[ns(max(0, w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
    sm = uniform_filter1d(env, ns(0.15))
    deep = np.zeros(N)
    for a, b in DEEP: deep[ns(a):ns(b)] = 1
    MUS *= dbg(-(AU["musicDuckDb"] + (AU["deepDuckDb"] - AU["musicDuckDb"]) * deep) * sm)[None, :]
    lv = integrated(V)
    MUS *= dbg((lv - AU["musicBelowVoiceLu"]) - integrated(MUS))
    sfx *= dbg((lv - AU["sfxBelowVoiceLu"]) - integrated(sfx))
    sfx *= dbg(-AU["sfxDuckDb"] * sm)[None, :]
    mix = V + MUS + sfx
    g = AU["targetLufs"] - integrated(mix); mix *= dbg(g)
    ceil = dbg(AU["ceilingDbfs"]); pk = np.max(np.abs(mix), axis=0)
    gain = uniform_filter1d(np.minimum(1.0, ceil / np.maximum(maximum_filter1d(pk, ns(0.004)), 1e-9)), ns(0.003))
    mix *= gain[None, :]; mix = fades(mix, 0.0, 0.25)
    write_wav(os.path.join(HERE, "mix.wav"), mix)
    for nm, x in [("voice", V * dbg(g)), ("music", MUS * dbg(g)), ("sfx", sfx * dbg(g))]: write_wav(os.path.join(HERE, f"stem_{nm}.wav"), x)
    rows = "\n".join(f"| {t:6.2f} | {round(t * FPS):5d} | {n} | {gg:+.0f} |" for t, n, gg in sorted(EVENTS))
    open(os.path.join(HERE, "cues.md"), "w").write(f"# Sound cues\n\nLength {DUR:.3f} s ({TOTAL} f), mix {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP.\n\n| t (s) | frame | SFX | dB |\n|---|---|---|---|\n{rows}\n")
    print(f"mix {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP, {DUR:.2f} s")


if __name__ == "__main__":
    main()
