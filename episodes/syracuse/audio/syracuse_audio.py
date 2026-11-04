# Sound for "The One Guy Who Made Rome Look Stupid": an original mock-epic score (Roman pomp vs. Archimedes' lyre),
# a synthesized SFX stem from an event table locked to the picture (story.ts times), and the final mix: voice
# unchanged, music ducked under speech (~10 LU below the voice, the "+3 dB music" standard), SFX bed, master to
# -15 LUFS with a true-peak limiter. Reuses the bridge short's synth modules (dsp.py, instruments.py, sfx_gen.py).
# Usage: python syracuse_audio.py   -> mix.wav, stem_*.wav, cues.md (next to this file)
import json
import os
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp, bp, read_wav, write_wav, true_peak, phase, tt
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
# narration-first: the supplied voice.mp3 (decoded by scripts/analyze_voice.py) is the clock. Every time below is
# STORY time (the timing the animation was designed on); W() maps it onto the recording via voice/warp.json.
if not os.path.exists(os.path.join(ROOT, "voice.mp3")) or not os.path.exists(os.path.join(ROOT, "voice", "warp.json")):
    raise SystemExit("*** NARRATION MISSING: put the recorded narration at episodes/syracuse/voice.mp3 and run python3 scripts/analyze_voice.py")
WARP = json.load(open(os.path.join(ROOT, "voice", "warp.json")))
TOTAL = WARP["videoFrames"]
DUR = TOTAL / FPS
N = ns(DUR)
_A = WARP["anchors"]


def W(ts):
    """story seconds -> voice seconds (identity without anchors)"""
    if not _A:
        return ts
    xs, ys = [a[0] for a in _A], [a[1] for a in _A]
    if ts <= xs[0]:
        return ys[0] + ts - xs[0]
    if ts >= xs[-1]:
        return ys[-1] + ts - xs[-1]
    return float(np.interp(ts, xs, ys))
F = I.m2f
EVENTS = []


def ev(t, name, x, p=0.0, g=0.0, buf=None):
    """place one sound (mono/stereo) at t seconds, pan p, gain g dB, logging it for cues.md"""
    place(buf if buf is not None else SFX, pan(x, p) if np.ndim(x) == 1 else x, W(t), dbg(g))
    EVENTS.append((W(t), name, g))


# ---------------------------------------------------------------- custom comic sounds
def slide_whistle(f0, f1, dur, r, vib=0.0):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + vib * np.sin(2 * np.pi * 6 * t))
    y = np.sin(phase(f)) + 0.15 * np.sin(2 * phase(f))
    y += 0.03 * hp(r.standard_normal(len(t)), 2000)
    return fades(y * np.clip(t / 0.02, 0, 1), 0.005, 0.05) * 0.5


def boing(r, f0=180, dur=0.6):
    t = tt(dur)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.08) * np.cos(2 * np.pi * 11 * t))
    return fades(np.sin(phase(f)) * np.exp(-t / 0.25) * 0.7, 0.002, 0.05)


def thunk(r, f0=140, dur=0.25, bright=1.0):
    t = tt(dur)
    body = np.sin(phase(f0 * (1 + 0.8 * np.exp(-t / 0.01)))) * np.exp(-t / 0.06)
    click = bp(r.standard_normal(len(t)), 800, 5000 * bright, 1) * np.exp(-t / 0.008)
    return fades(body + 0.6 * click, 0.0, 0.03)


def falling_whistle(dur, r, f0=1900, f1=500):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return fades(np.sin(phase(f)) * np.clip(t / 0.15, 0, 1) * 0.35 + 0.05 * bp(r.standard_normal(len(t)), 600, 3000, 1), 0.01, 0.02)


def pour(dur, r):
    t = tt(dur)
    return G.bubbles(dur, r, 260 + 0 * t, 400, 3000, (0.004, 0.02), np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)) * 0.7


# ---------------------------------------------------------------- SFX event table (times from story.ts / cast.ts)
SFX = np.zeros((2, N))
r = rng(214)
# ambience: sea + breeze + gulls on the sea shots (0-47.2), beach breeze (47.2-56.9), festival murmur (56.9-62.4)
sea = G.water_bed(W(47.3) - W(0.0), r, close=0.6, slosh_rate=0.6)
ev(0.0, "sea bed (shots 1-10)", fades(sea, 0.05, 1.0), 0, -16)
ev(0.0, "breeze", fades(G.breeze(DUR, r, level=0.8), 0.1, 1.0), 0, -24)
ev(1.0, "gulls", G.bird_chirps(W(17.0) - W(1.0), r, density=0.25), 0.4, -22)
ev(47.3, "beach waves", fades(G.water_bed(W(56.9) - W(47.3), r, close=0.3, slosh_rate=0.3), 0.3, 0.6), 0, -20)
ev(53.4, "crickets (golden)", fades(G.crickets(max(1.0, DUR - W(53.4)), r), 0.6, 1.0), 0, -24)
for k in range(10):  # festival chatter behind the wall
    ev(56.9 + 0.2 * k, "festival babble", fades(G.babble(W(62.3) - W(56.9), r, r.uniform(110, 210), r.uniform(0.95, 1.15)), 0.3, 0.6), r.uniform(-0.6, 0.6), -30)
# oars: a stroke every 1.1 s while the fleet rows (shots 1, 3, 5)
for t0 in np.arange(0.3, 21.0, 1.1):
    if 5.0 < t0 < 5.3 or 10.4 < t0 < 17.3:
        continue
    ev(t0, "oar stroke", G.bubbles(0.5, r, 300, 400, 2400, (0.004, 0.02), np.exp(-tt(0.5) / 0.15)) * 0.8, r.uniform(-0.4, 0.4), -17)
# hook: chain creak + drips while the ship hangs, scratch of the compass on "geometry"
ev(2.72, "chain creak (hanging ship)", G.creak(2.3, r, rate0=60, rate1=90), -0.2, -14)
for k in range(8):
    ev(2.8 + k * 0.28, "drip", G.bubbles(0.15, r, 30, 900, 3000, (0.004, 0.01), np.exp(-tt(0.15) / 0.05)), r.uniform(-0.3, 0.3), -20)
ev(4.34, "compass scratch", G.stick_slip(0.9, 70, r) * 0.6, 0.2, -18)
ev(5.08, "flash whoosh", G.whoosh(0.6, r, peak=0.3), 0, -12)
ev(9.75, "gulp", G.oof(r, "oh", base=170) * 0.7, -0.2, -14)
ev(12.75, "lyre sparkle", I.glock(F(86), 0.4, r), 0.3, -20)
# claw sequence
ev(19.55, "beam swing creak", G.creak(1.2, r, rate0=50, rate1=120, scale=1.4), 0, -9)
ev(19.85, "beam whoosh", G.whoosh(0.8, r, peak=0.45, f_lo=200, f_hi=1200), 0, -12)
ev(20.55, "chain run", G.rattle(0.45, r, density=45, heavy=True), 0, -12)
ev(21.0, "claw clank", G.clink(r, f0=420, dur=0.4, bright=0.8), 0, -8)
ev(21.02, "claw thunk", thunk(r, 90, 0.3), 0, -8)
ev(21.85, "hull groan", G.creak(1.5, r, rate0=30, rate1=80, scale=1.6), 0, -8)
ev(21.9, "water pouring off hull", pour(1.6, r), 0, -12)
for k, b in enumerate([140, 120, 160]):
    ev(22.0 + 0.2 * k, "crew whoa", G.whoa(r, base=b, dur=0.6), (k - 1) * 0.4, -12)
ev(22.9, "tension creak", G.creak(0.8, r, rate0=90, rate1=140), 0, -14)
ev(24.5, "release clank", G.clink(r, f0=300, dur=0.3), 0, -10)
ev(24.55, "fall whistle", falling_whistle(0.42, r, 1300, 400), 0, -14)
ev(24.97, "GIANT SPLASH", G.splash_big(r), 0, -2)
ev(24.97, "hull crack", G.wood_crack(r), 0, -8)
ev(25.08, "plume droop 1", slide_whistle(900, 520, 0.45, r), -0.2, -16)
# boulders
for t0, tl, big in [(26.55, 27.27, 0), (28.9, 30.0, 1)]:
    ev(t0, "catapult thunk", thunk(r, 70 if big else 100, 0.35), 0.3, -10)
    ev(t0 + 0.02, "catapult arm whoosh", G.whoosh(0.4, r, peak=0.2), 0.3, -16)
    ev(tl - (0.95 if big else 0.6), "incoming whistle", falling_whistle(0.95 if big else 0.6, r, 1700 if big else 2100, 450), 0, -12 if big else -15)
    ev(tl, "boulder splash" + (" (huge)" if big else ""), G.splash_big(r) * (1.0 if big else 0.55), 0, -1 if big else -6)
    ev(tl + 0.06, "plume droop", slide_whistle(820 if big else 900, 430 if big else 560, 0.5, r), -0.2, -16)
ev(30.02, "timpani boom", I.timpani(F(38), 1.0, r), 0, -8)
ev(30.1, "dazed tweets", G.bird_chirps(1.5, r, density=1.2), 0.2, -20)
# loopholes + arrows
for k in range(4):
    ev(33.38 + 0.12 * k, "stone slide", G.stick_slip(0.22, 140, r) * 0.7, 0.1 * k, -12)
for a in [34.75, 34.98, 35.25]:
    ev(a - 0.05, "arrow zip", G.whoosh(0.18, r, peak=0.15, f_lo=1500, f_hi=6000), 0.3, -12)
    ev(a + 0.12, "arrow thunk", thunk(r, 180, 0.2, 1.4), 0, -7)
ev(34.9, "plume droop", slide_whistle(760, 480, 0.4, r), -0.2, -18)
# sambuca
ev(36.2, "ladder ropes creak", G.creak(2.6, r, rate0=40, rate1=70, scale=1.2), 0, -12)
ev(37.9, "PLUME BOING (up)", boing(r, 220), 0, -9)
for k in range(3):
    ev(38.0 + 0.07 * k, "sambuca crew hurrah", G.hurrah(r, r.uniform(120, 170), r.uniform(0.95, 1.1)), (k - 1) * 0.4, -15)
ev(38.95, "rock falling whistle", falling_whistle(0.67, r, 1500, 380), 0, -12)
ev(39.62, "CRASH: rock on ladder", G.wood_crack(r), 0, -2)
ev(39.62, "timber tear", G.timber_tear(r, 1.0), 0, -6)
ev(39.7, "plume flop", slide_whistle(700, 260, 0.7, r), -0.2, -14)
ev(40.1, "crew oofs", G.oof(r, "ow"), 0.3, -12)
ev(40.77, "ladder splash", G.splash_big(r) * 0.7, 0, -5)
ev(41.3, "rock splash", G.splash_big(r) * 0.5, 0.2, -7)
# the joke: helmet poured out, a fish
ev(43.95, "helmet off", G.clink(r, f0=650, dur=0.2), 0, -16)
ev(44.3, "water pouring", pour(2.4, r), -0.2, -11)
ev(45.38, "fish flop", thunk(r, 260, 0.1, 2.0), -0.3, -14)
ev(45.75, "fish flop", thunk(r, 300, 0.1, 2.0), -0.35, -16)
# jumpy men
for k, b in enumerate([140, 170, 120]):
    ev(49.0 + 0.03 * k, "collective gasp", G.oof(r, "oh", base=b), (k - 1) * 0.4, -12)
ev(50.25, "tiny stick tick", thunk(r, 900, 0.08, 2.0), 0.1, -12)
for k in range(7):
    ev(51.95 + 0.06 * k, "panic whoa", G.whoa(r, base=r.uniform(130, 200), dur=0.5), r.uniform(-0.6, 0.6), -11)
for k in range(22):
    ev(51.95 + k * 0.09, "running feet", G.stroll_step(r, scuff=0.8), r.uniform(-0.5, 0.5), -12)
ev(51.9, "zip away whoosh", G.whoosh(0.5, r, peak=0.15), -0.4, -10)
ev(55.9, "sigh", G.oof(r, "ugh", base=110) * 0.8, 0.2, -15)
# ladders
for a in [61.13, 61.6]:
    ev(a, "ladder slam", G.hammer_hit(r, big=1.0), 0, -6)
ev(62.4, "pop up whoosh", G.whoosh(0.35, r, peak=0.12), 0, -14)
ev(62.92, "PLUME BOING (final up)", boing(r, 240, 0.8), 0, -8)
ev(64.82, "stick tick", thunk(r, 900, 0.08, 2.0), 0.15, -10)
ev(64.95, "shock sting slide", slide_whistle(1200, 300, 0.6, r), 0, -10)

# ---------------------------------------------------------------- score (original, D dorian, Roman pomp vs. lyre)
MUS = np.zeros((2, N))
rm = rng(77)


def note(t, name, x, p=0.0, g=0.0):
    place(MUS, pan(x, p) if np.ndim(x) == 1 else x, W(t), dbg(g))


def fanfare(t0, q, vel=0.8, transpose=0, g=0.0):
    """pompous Roman fanfare: (beat, len, midi) on horns + tuba roots"""
    phr = [(0, .75, 62), (.75, .25, 62), (1, 1, 69), (2, .5, 67), (2.5, .5, 69), (3, 1, 74), (4, 1.5, 72), (5.5, .5, 69), (6, 2, 70)]
    for b, L, m in phr:
        note(t0 + b * q, "horn", I.brass(F(m + transpose), L * q * 0.95, vel, rm, kind="horn"), 0.2, g)
        note(t0 + b * q, "horn2", I.brass(F(m + transpose - 5), L * q * 0.95, vel * 0.7, rm, kind="horn"), -0.2, g - 4)
    for b, m in [(0, 38), (2, 45), (4, 41), (6, 46)]:
        note(t0 + b * q, "tuba", I.brass(F(m + transpose), 1.8 * q, vel, rm, kind="tuba"), 0, g - 1)
    note(t0, "timp", I.timpani(F(38 + transpose), 0.8, rm), 0, g - 3)


def march(t0, t1, q, vel=0.6, g=0.0, bassline=(38, 45, 41, 45)):
    """oom-pah march: tuba on 1/3, brass stabs on 2/4, snare pattern"""
    k = 0
    t = t0
    while t < t1 - 0.05:
        m = bassline[(k // 2) % len(bassline)]
        if k % 2 == 0:
            note(t, "tuba", I.brass(F(m), q * 0.8, vel, rm, kind="tuba"), 0, g)
        else:
            note(t, "pah", I.brass(F(m + 24), q * 0.4, vel * 0.6, rm, kind="stab"), 0.25, g - 6)
            note(t, "pah", I.brass(F(m + 28), q * 0.4, vel * 0.5, rm, kind="stab"), -0.25, g - 7)
        note(t, "snare", I.snare(vel * (0.7 if k % 2 else 0.45), rm), 0.1, g - 9)
        if k % 2:
            note(t + q / 2, "snare", I.snare(vel * 0.3, rm), 0.1, g - 12)
        t += q
        k += 1


def lyre(t0, t1, q, vel=0.5, g=0.0, pattern=(62, 69, 74, 77, 76, 74, 69, 65)):
    t, k = t0, 0
    while t < t1 - 0.05:
        note(t, "lyre", I.pluck(F(pattern[k % len(pattern)]), vel, rm, dur=1.2, bright=0.35), 0.15 * ((k % 3) - 1), g)
        if k % 4 == 0:
            note(t, "lyre bass", I.pluck(F(pattern[0] - 12), vel * 0.8, rm, dur=1.6, bright=0.2), 0, g - 3)
        t += q
        k += 1


def pizz(t0, t1, q, vel=0.55, g=0.0, notes=(62, 65, 69, 65, 64, 67, 70, 67)):
    t, k = t0, 0
    while t < t1 - 0.05:
        note(t, "pizz", I.pluck(F(notes[k % len(notes)]), vel, rm, dur=0.35, bright=0.6), 0.2 * ((k % 2) * 2 - 1), g)
        if k % 2 == 0:
            note(t, "pizz bass", I.pluck(F(notes[k % len(notes)] - 24), vel, rm, dur=0.5, bright=0.3), 0, g - 2)
        t += q
        k += 1


Q = 60 / 112  # 112 bpm march
fanfare(0.05, 0.31, 0.85, g=-1)                          # hook: Rome arrives (0 - 2.6)
lyre(2.72, 5.05, 0.29, 0.45, g=-2)                        # "...one old man doing geometry": the lyre answers
march(5.2, 10.35, Q, 0.62, g=-2)                          # Marcellus' confident march
note(8.85, "brass stab five", I.brass(F(74), 0.4, 0.8, rm, kind="stab"), 0, -4)
lyre(10.45, 17.25, 0.36, 0.5, g=-1, pattern=(62, 69, 74, 76, 77, 76, 74, 69, 67, 69, 72, 69))  # Archimedes' theme
note(10.45, "pad", I.pad([F(50), F(57), F(62)], 6.8, 0.35, rm), 0, -10)
march(17.35, 21.85, Q * 0.92, 0.55, g=-4, bassline=(38, 38, 45, 45))   # rowing in, tension
for tr, vr in I.snare_roll(19.5, 21.7, 0.2, 0.7, rm):
    note(tr, "roll", I.snare(vr, rm, dur=0.15), 0.1, -13)
for k, m in enumerate([62, 63, 64, 65, 66]):                           # chromatic climb while the ship rises
    note(21.85 + k * 0.29, "horn climb", I.brass(F(m), 0.27, 0.7, rm, kind="horn"), 0, -5)
# (silence 23.3 -> 24.9: "...stands it on its tail." / "Then it lets go.")
note(24.98, "cymbal crash", I.cymbal(0.7, rm), 0, -10)
pizz(25.25, 30.0, 0.27, 0.55, g=-3)                       # backing off: comic pizzicato
note(30.0, "tuba wah", I.brass(F(36), 0.9, 0.8, rm, kind="tuba", fall=-3), 0, -3)
pizz(30.6, 33.35, 0.32, 0.4, g=-5, notes=(62, 64, 65, 67, 69, 67, 65, 64))   # sneaking
note(34.82, "stab", I.brass(F(61), 0.25, 0.8, rm, kind="stab"), 0, -6)
march(35.7, 39.45, Q * 0.85, 0.6, g=-3, bassline=(38, 41, 43, 45))    # hope: the secret weapon
fanfare(37.9, 0.2, 0.7, g=-6)
for k, m in enumerate([45, 44, 43, 41]):                                # sad trombone after the crash
    note(40.05 + k * 0.42, "sad tuba", I.brass(F(m), 0.38 if k < 3 else 1.1, 0.7, rm, kind="tuba", fall=-1.5 if k == 3 else 0), 0, -4)
lyre(42.5, 47.2, 0.55, 0.35, g=-6, pattern=(62, 69, 74, 69))            # deadpan joke: sparse lyre
pizz(47.3, 51.9, 0.22, 0.45, g=-6, notes=(62, 62, 63, 62, 61, 62, 63, 64))   # jumpy tiptoe
for tr, vr in I.snare_roll(51.95, 53.3, 0.4, 0.9, rm):
    note(tr, "panic roll", I.snare(vr, rm, dur=0.15), 0.1, -10)
for k, m in enumerate([50, 48, 46, 45]):                                # waiting: slow tuba
    note(53.5 + k * 0.85, "slow tuba", I.brass(F(m), 0.8, 0.5, rm, kind="soft"), 0, -6)
note(53.5, "golden pad", I.pad([F(50), F(53), F(57)], 3.4, 0.35, rm), 0, -12)
lyre(56.95, 62.35, 0.2, 0.55, g=-4, pattern=(62, 66, 69, 74, 72, 69, 66, 69, 71, 67))  # festival dance (bright)
for t0 in np.arange(56.95, 62.35, 0.4):
    note(t0, "frame drum", I.brush(0.6, rm), 0, -10)
    note(t0 + 0.2, "triangle", I.triangle(0.3, rm, dur=0.4), 0.3, -18)
for tr, vr in I.snare_roll(62.4, 64.05, 0.15, 0.55, rm):   # quiet roll under the punchline, the fanfare lands after "math."
    note(tr, "punch roll", I.snare(vr, rm, dur=0.15), 0.1, -16)
fanfare(64.45, 0.2, 0.9, transpose=2, g=-2)                # Rome wins (by doing math)
note(65.0, "shock stab", I.brass(F(57), 0.5, 0.9, rm, kind="stab", fall=-4), 0, -3)
note(65.0, "timp", I.timpani(F(38), 1.0, rm), 0, -5)

# ---------------------------------------------------------------- mix
def main():
    global MUS
    v, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR, sr
    V = np.zeros((2, N)); vv = v if v.ndim == 2 else np.stack([v, v]); V[:, :min(N, vv.shape[1])] = vv[:, :N]
    ir = make_ir(1.1, 3)
    MUS = MUS + 0.18 * convolve_st(MUS, ir)[:, :N]
    sfx = SFX + 0.1 * convolve_st(SFX, ir)[:, :N]
    words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
    # duck the music -3 dB while speaking (soft 70 ms / 450 ms ramps)
    env = np.zeros(N)
    for w in words:
        env[ns(max(0, w["s"] - 0.08)):ns(w["e"] + 0.12)] = 1
    k = np.exp(-1 / (0.15 * SR / 100))
    e2 = np.repeat(env[::100], 100)[:N]
    sm = np.copy(e2)
    for i in range(1, len(sm)):
        pass
    from scipy.ndimage import uniform_filter1d
    sm = uniform_filter1d(e2, ns(0.15))
    # extra-deep duck under the hook line and the punchline (measured: words were masked by the fanfares)
    deep = np.zeros(N); deep[:ns(W(5.1))] = 1; deep[ns(W(62.3)):ns(W(64.2))] = 1
    MUS *= dbg(-(5.0 + 5.0 * deep) * sm)[None, :]
    SFXW = dbg(-5.0 * sm)[None, :]
    lv = integrated(V)
    lm, ls = integrated(MUS), integrated(sfx)
    MUS *= dbg((lv - 10.0) - lm)    # music bed 10 LU under the voice
    sfx *= dbg((lv - 9.0) - ls)     # SFX bed (impacts peak above it)
    sfx = sfx * SFXW
    mix = V + MUS + sfx
    g = -15.0 - integrated(mix)
    mix *= dbg(g)
    # simple look-ahead peak limiter to -1.2 dBTP
    ceil = dbg(-2.0)
    pk = np.max(np.abs(mix), axis=0)
    from scipy.ndimage import maximum_filter1d
    gain = np.minimum(1.0, ceil / np.maximum(maximum_filter1d(pk, ns(0.004)), 1e-9))
    gain = uniform_filter1d(np.minimum.accumulate(gain[::-1])[::-1] * 0 + gain, ns(0.003))
    mix *= gain[None, :]
    mix = fades(mix, 0.0, 0.25)
    write_wav(os.path.join(HERE, "mix.wav"), mix)
    for nm, x in [("voice", V * dbg(g)), ("music", MUS * dbg(g)), ("sfx", sfx * dbg(g))]:
        write_wav(os.path.join(HERE, f"stem_{nm}.wav"), x)
    rows = "\n".join(f"| {t:6.2f} | {round(t * FPS):5d} | {n} | {gg:+.0f} |" for t, n, gg in sorted(EVENTS))
    open(os.path.join(HERE, "cues.md"), "w").write(
        f"# Sound cues: The One Guy Who Made Rome Look Stupid\n\nLength {DUR:.3f} s ({TOTAL} f @ {FPS} fps), 48 kHz stereo.\n"
        f"Integrated loudness of the mix: {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP.\n\n"
        "| t (s) | frame | SFX event | gain dB |\n|---|---|---|---|\n" + rows + "\n")
    print("mix", integrated(mix), "LUFS; TP", true_peak(mix))


if __name__ == "__main__":
    main()
