# Sound for "Rivers in the Sky": an original score + synthesized SFX on the picture's event table, ducked under the
# narration and mastered to -14 LUFS / -1 dBTP. Reuses the skill's synthesis library (dsp.py, instruments.py,
# sfx_gen.py). Every time below comes from remotion/src/videos/aqueduct/story.ts (frames / 30) or voice/words.json.
import json, os, subprocess
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, pan, st, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 1755
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
r = rng(2026)
EV = []  # cue sheet rows

def bus():
    return np.zeros((2, N))

def put(b, x, t, gain_db=0.0, p=0.0, name=""):
    x = np.asarray(x, float)
    x = pan(x, p) if x.ndim == 1 else x
    place(b, x, t, dbg(gain_db))
    if name: EV.append((round(t, 3), name, gain_db))

def seg(x, dur, fin=0.3, fout=0.4):
    x = st(x)[:, :ns(dur)]
    return fades(x, fin, fout)

# ================================================================ SFX
S = bus()
# --- ambience beds per place ---
def amb(t0, t1, water=0.0, wind=1.0, birds=0.4, crowd=0, name=""):
    d = t1 - t0
    if wind: put(S, seg(G.breeze(d, r, level=wind), d, 0.2, 0.3), t0, -14, name=f"breeze ({name})")
    if birds: put(S, seg(G.bird_chirps(d, r, density=birds), d, 0.2, 0.3), t0, -20, name=f"birds ({name})")
    if water: put(S, seg(G.water_bed(d, r, close=water, slosh_rate=0.5), d, 0.15, 0.3), t0, -16 + 6 * (water - 0.5), name=f"water flow ({name})")
    if crowd:
        out = np.zeros((2, ns(d)))
        for v in range(crowd):
            base, scale = (r.uniform(100, 140), 1.0) if v % 2 else (r.uniform(180, 230), 1.15)
            y = lp(G.babble(d, r, base, scale, r.uniform(3.6, 4.6), r.uniform(0.5, 0.75)), 3000, 1) * r.uniform(0.4, 1.0)
            out += pan(y, r.uniform(-0.8, 0.8))
        put(S, fades(out, 0.25, 0.4), t0, -24, name=f"crowd murmur ({name})")

amb(0, F(78), water=0.8, wind=0.7, birds=0.3, name="hook, channel")
amb(F(78), F(150), water=0.0, wind=1.3, birds=0.5, name="hook, aerial")
amb(F(150), F(222), wind=0.4, birds=0.2, crowd=6, name="city")
amb(F(222), F(298), wind=1.0, birds=0.5, name="view west")
amb(F(298), F(404), water=1.0, wind=0.6, birds=0.6, name="spring")
amb(F(404), F(586), wind=0.9, birds=0.7, name="surveyors")
amb(F(586), F(769), water=0.7, wind=0.7, birds=0.4, name="channel slope")
amb(F(769), F(908), wind=1.0, birds=0.3, name="tunnel hill")
amb(F(908), F(1004), water=0.25, wind=1.2, birds=0.5, name="valley")
amb(F(1004), F(1254), wind=0.6, birds=0.3, crowd=2, name="construction")
amb(F(1254), F(1368), wind=0.8, birds=0.4, name="sealing")
amb(F(1368), F(1456), water=1.0, wind=0.6, birds=0.4, name="spring gate / water run")
amb(F(1456), F(1543), water=0.6, wind=0.3, crowd=8, name="city fountain")
amb(F(1543), DUR, water=0.3, wind=1.0, birds=0.5, name="ending")
# --- transitions ---
for f, name in [(78, "cut to aerial"), (150, "white flash"), (222, "cut west"), (462, "cut"), (690, "cut"), (852, "cut"), (1074, "cut"), (1160, "cut"), (1414, "cut, water run"), (1456, "cut to city")]:
    put(S, G.whoosh(0.7, r, peak=0.18, tail=0.2), F(f) - 0.18, -20 if name != "white flash" else -14, 0.2 * r.uniform(-1, 1), "whoosh " + name)
# --- city: jar clinks + footsteps ---
for k in range(6): put(S, lp(G.clink(r, r.uniform(700, 1300), 0.2, 0.4), 3000), F(160) + k * 0.9 + r.uniform(0, 0.3), -22, r.uniform(-0.6, 0.6), "clay jar knock")
for k in range(10): put(S, G.stroll_step(r, 0.6), F(152) + k * 0.47, -24, r.uniform(-0.5, 0.5))
# --- spring: splash on "gravity" (kick at 379) ---
put(S, G.bubbles(1.2, r, 60, 300, 2000, (0.006, 0.02)), F(379) - 0.05, -14, 0, "spring burble (gravity)")
# --- surveyors: footsteps on grass, wooden table knock, water-level trickle ---
for k in range(6): put(S, lp(G.stroll_step(r, 0.9), 2200), F(410) + k * 0.55, -24, -0.2)
put(S, lp(G.hammer_hit(r, 0.4), 900), F(470), -22, 0.1, "chorobates wood knock")
put(S, G.bubbles(1.4, r, 30, 900, 3200, (0.004, 0.012)), F(512), -22, 0, "water in the groove")
# --- tunnel hill: windlass creaks, buckets, muffled picks below ---
for k in range(9): put(S, G.creak(0.9, r, 70, 110, scale=0.8), F(775) + k * 0.52, -22, r.uniform(-0.6, 0.6), "windlass creak" if k == 0 else "")
for k in range(8): put(S, lp(G.hammer_hit(r, 0.6), 500), F(800) + k * 0.43 + r.uniform(0, 0.15), -20, r.uniform(-0.3, 0.3), "picks underground (muffled)" if k == 0 else "")
put(S, G.creak(1.6, r, 60, 140, scale=0.7), F(856), -16, 0, "rope + windlass close")
# --- valley: distant hammering for scale ---
for k in range(5): put(S, lp(G.hammer_hit(r, 0.5), 1500), F(915) + k * 0.6, -30, 0.5)
# --- construction ---
for f in [1004, 1022, 1043, 1061]: put(S, G.hammer_hit(r, 1.0), F(f) - 0.01, -10, -0.15, "mallet on chisel")
for f in [1004, 1022, 1043, 1061]: put(S, hp(G.bubbles(0.3, r, 80, 2500, 6000, (0.002, 0.006)), 2000), F(f), -20, -0.1, "stone chips")
put(S, seg(G.creak(5.0, r, 40, 55, scale=0.6, shape_pts=[(0, 0), (0.05, 1), (0.95, 1), (1, 0)]), 2.9), F(1078), -14, 0.3, "treadwheel creak")
put(S, seg(G.creak(2.8, r, 90, 150, scale=1.3), 2.8), F(1082), -20, -0.3, "rope strain")
for k in range(10): put(S, lp(G.stroll_step(r, 0.2), 900), F(1080) + k * 0.31, -18, 0.3, "feet on the wheel treads" if k == 0 else "")
put(S, G.creak(1.6, r, 50, 80, scale=0.9), F(1172), -16, 0, "keystone lowered")
put(S, lp(G.hammer_hit(r, 1.8), 350), F(1222) - 0.01, -6, 0, "keystone THUD")
for k in range(3): put(S, lp(G.hurrah(r, r.uniform(110, 160), 1.0), 3000), F(1226) + 0.18 * k, -18, -0.5 + 0.5 * k, "workers cheer" if k == 0 else "")
# --- sealing: trowel scrapes on each stroke ---
t0 = F(1254)
for k in range(5):
    sc = bp(r.standard_normal(ns(0.45)), 1500, 6000, 1) * np.sin(np.linspace(0, np.pi, ns(0.45))) ** 2
    put(S, sc, t0 + 0.25 + k * 1.21, -20, 0, "trowel scrape" if k == 0 else "")
# --- payoff ---
put(S, G.creak(0.8, r, 120, 70, scale=1.1), F(1376), -12, -0.2, "sluice gate lifts")
put(S, G.splash_big(r), F(1385), -12, 0, "water bursts through")
put(S, seg(G.water_bed(3.0, r, close=1.4, slosh_rate=2.0), 3.0), F(1414), -10, 0, "rushing water front")
put(S, G.splash_big(r), F(1484), -14, 0, "fountain bursts")
put(S, seg(G.water_bed(3.0, r, close=1.2, slosh_rate=1.5), 2.0), F(1486), -12, 0, "fountain jets")
for k in range(7): put(S, lp(G.hurrah(r, r.uniform(110, 260), r.uniform(1.0, 1.25), kid=(k == 3)), 3400), F(1488) + r.uniform(0, 0.9), -16, r.uniform(-0.8, 0.8), "crowd cheers" if k == 0 else "")
put(S, G.applause(1.8, r, 20), F(1500), -22, 0, "applause")
S = lp(S, 14000)

# ================================================================ MUSIC (original: D dorian/minor -> F/D major lift)
M = bus()
BPM = 100; BEAT = 60 / BPM; BAR = 4 * BEAT
m2f = I.m2f
CH = {"Dm": [50, 57, 62, 65], "Bb": [46, 53, 62, 65], "F": [41, 53, 60, 65], "C": [48, 55, 60, 64], "Gm": [43, 55, 62, 67], "D": [50, 57, 62, 66], "A": [45, 57, 61, 64]}
def chords(t0, seq, vel=0.5, bars=1.0):
    t = t0
    for c in seq:
        put(M, I.pad([m2f(n) for n in CH[c]], bars * BAR, vel, r, att=0.4, rel=0.8), t)
        t += bars * BAR
    return t
def ostinato(t0, t1, seq, vel=0.5):
    t, i = t0, 0
    while t < t1:
        c = CH[seq[int((t - t0) / BAR) % len(seq)]]
        n = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 12][i % 4]
        put(M, I.pluck(m2f(n), vel * (1.0 if i % 2 == 0 else 0.7), r, 0.5, 0.45), t, 0, 0.25 * (-1 if i % 2 else 1))
        t += BEAT / 2; i += 1
def bass(t0, t1, seq, vel=0.6):
    t = t0
    while t < t1:
        c = CH[seq[int((t - t0) / BAR) % len(seq)]]
        put(M, I.pluck(m2f(c[0] - 12), vel, r, 0.9, 0.2), t)
        t += BEAT
def timp(t, vel=0.8, note=38): put(M, I.timpani(m2f(note), vel, r), t, 0, 0, "timpani")
def cym(t, vel=0.5): put(M, I.cymbal(vel, r, 3.0, 0.8), t, 0, 0, "cymbal")
# hook: dark swell into the flash
chords(0.0, ["Dm", "Dm"], 0.45, 1.05)
for tt_, vv_ in I.snare_roll(F(100), F(150), 0.05, 0.6, r): put(M, I.snare(vv_, r, 0.25, buzz=True), tt_, -8)
timp(F(56) - 0.02, 0.5); timp(F(134), 0.7); cym(F(150), 0.6); timp(F(150), 0.9)
# problem: sparse, curious
chords(F(150), ["Dm", "Bb", "Gm"], 0.4, 1.0)
ostinato(F(226), F(404), ["Dm", "Bb"], 0.35)
timp(F(379), 0.8)  # gravity
# engineering: drive
chords(F(404), ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "C"], 0.42, 1.0)
ostinato(F(404), F(1004), ["Dm", "Bb", "F", "C"], 0.45)
bass(F(586), F(1004), ["Dm", "Bb", "F", "C"], 0.5)
for f in [586, 769, 908]: timp(F(f), 0.6)
timp(F(976), 0.9); cym(F(976), 0.35)  # "arches"
# construction: heavier, strikes on the beat of the mallets
chords(F(1004), ["Dm", "Gm", "Bb", "A"], 0.48, 1.0)
ostinato(F(1004), F(1254), ["Dm", "Gm", "Bb", "A"], 0.5)
bass(F(1004), F(1254), ["Dm", "Gm", "Bb", "A"], 0.6)
for f in [1004, 1043]: timp(F(f), 0.6)
timp(F(1222), 1.0); cym(F(1222), 0.4)  # keystone
# sealing: hold the breath
chords(F(1254), ["A", "A"], 0.35, 0.95)
for tt_, vv_ in I.snare_roll(F(1330), F(1385), 0.03, 0.5, r): put(M, I.snare(vv_, r, 0.25, buzz=True), tt_, -10)
# payoff: lift to F / D major, glockenspiel melody
cym(F(1385), 0.6); timp(F(1385), 1.0)
chords(F(1385), ["F", "C", "Dm", "Bb"], 0.5, 1.0)
ostinato(F(1385), F(1543), ["F", "C", "Dm", "Bb"], 0.5)
bass(F(1385), F(1543), ["F", "C", "Dm", "Bb"], 0.6)
mel = [(0, 72), (0.5, 74), (1, 77), (2, 76), (3, 74), (4, 72), (5, 74), (5.5, 76), (6, 77), (8, 81), (9, 79), (10, 77), (11, 76)]
for b_, n in mel: put(M, I.glock(m2f(n), 0.5, r, 1.6), F(1385) + b_ * BEAT, -4, 0.15)
timp(F(1487), 0.8); cym(F(1487), 0.45)
# ending: broad, resolves to D major on "today"
t = chords(F(1543), ["Bb", "F", "C"], 0.55, 1.0)
put(M, I.pad([m2f(n) for n in CH["D"]], DUR - t + 0.2, 0.6, r, att=0.3, rel=0.6), t)
ostinato(F(1543), t, ["Bb", "F", "C"], 0.4)
for b_, n in [(0, 77), (1, 76), (2, 74), (4, 72), (5, 74), (6, 76), (8, 74)]: put(M, I.glock(m2f(n), 0.45, r, 1.8), F(1543) + b_ * BEAT, -6, -0.1)
timp(F(1689), 1.0); cym(F(1689), 0.55)  # "Trevi"
M = convolve_st(M, make_ir(1.6, 7))[:, :N] * 0.8 + M * 0.6

# ================================================================ MIX
v, sr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
if sr != SR:
    from scipy.signal import resample_poly
    v = resample_poly(v.T if v.ndim == 2 else v, SR, sr, axis=0)
    v = v.T if v.ndim == 2 else v
V = np.zeros((2, N)); vv = st(v); V[:, :min(N, vv.shape[1])] = vv[:, :N]
words = json.load(open(os.path.join(HERE, "..", "voice", "words.json")))
# ducking: -9 dB under speech (spans merged across short gaps), 80 ms attack, 450 ms release
mask = np.zeros(N)
for w in words: mask[ns(w["s"] - 0.08): ns(w["e"] + 0.12)] = 1  # words.json times are absolute in voice.wav

from scipy.ndimage import maximum_filter1d
mask = maximum_filter1d(mask, ns(0.3))  # bridge short gaps
def follow(x, att, rel):
    y = np.zeros_like(x); a, b = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); s_ = 0.0
    # vectorised enough: run on a 1 kHz control rate
    hop = SR // 1000; xs = x[::hop]; ys = np.zeros_like(xs); aa, bb = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    for i, v_ in enumerate(xs): s_ = (aa if v_ > s_ else bb) * s_ + (1 - (aa if v_ > s_ else bb)) * v_; ys[i] = s_
    return np.interp(np.arange(len(x)), np.arange(len(xs)) * hop, ys)
duck = follow(mask, 0.08, 0.45)
vL = integrated(V); V *= dbg(-16 - vL)                    # voice to -16 LUFS (it is then the loudest element)
mL = integrated(M); M *= dbg(-23 - mL)                    # music bed (before ducking)
sL = integrated(S); S *= dbg(-24 - sL)                    # SFX bed
gm = dbg(-9 * duck); gs = dbg(-4 * duck)
Mx, Sx = M * gm[None, :], S * gs[None, :]
Y = V + Mx + Sx
def limiter(x, ceil_db=-1.0, look=0.003, rel=0.08):
    c = dbg(ceil_db); pk = np.max(np.abs(x), axis=0); L = ns(look)
    pk = maximum_filter1d(pk, 2 * L + 1); g = np.minimum(1, c / np.maximum(pk, 1e-9))
    hop = 48; gs_ = g[::hop]; out = np.ones_like(gs_); s_ = 1.0; k = np.exp(-1 / (rel * SR / hop))
    for i, v_ in enumerate(gs_): s_ = v_ if v_ < s_ else k * s_ + (1 - k) * v_; out[i] = s_
    return x * np.interp(np.arange(x.shape[1]), np.arange(len(out)) * hop, out)[None, :]
Y *= dbg(-14 - integrated(Y))
for _ in range(3):
    Y = limiter(Y, -1.8)
    Y *= dbg(-14 - integrated(Y))
Y = limiter(Y, -1.8)
Y = fades(Y, 0.002, 0.6)
k = dbg(-14 - integrated(V + Mx + Sx)) if False else 1.0
write_wav(os.path.join(HERE, "mix.wav"), Y)
G_ = Y.std() / max((V + Mx + Sx).std(), 1e-9)
write_wav(os.path.join(HERE, "stem_voice.wav"), V * G_); write_wav(os.path.join(HERE, "stem_music.wav"), Mx * G_); write_wav(os.path.join(HERE, "stem_sfx.wav"), Sx * G_)
e = subprocess.run(["ffmpeg", "-i", os.path.join(HERE, "mix.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
summ = e[e.rfind("Summary:"):]
# speech-to-bed ratio measured where the narrator talks
sp = mask > 0.5
ratio = 10 * np.log10(np.mean(V[:, sp] ** 2) / max(np.mean((Mx + Sx)[:, sp] ** 2), 1e-12))
L = ["# Audio cue sheet and mix report", "", f"Duration {N / SR:.3f} s ({N} samples @ {SR} Hz, stereo, 24-bit). Picture: {TOTAL} frames @ {FPS} fps.", "",
     "## Mix", "- Voice: Kokoro v1.0 `am_michael`, gain only, set as the loudest element (-16 LUFS pre-master).",
     "- Music: original score (D dorian/minor to F/D major; pizzicato ostinato, pads, timpani, cymbals, glockenspiel), bed at -23 LUFS, ducked -9 dB under speech (80 ms attack, 450 ms release).",
     "- SFX: synthesized with the skill's library, bed at -24 LUFS, ducked -4 dB under speech.",
     f"- Speech-to-(music+SFX) power ratio while the narrator talks: **{ratio:.1f} dB**.",
     "- Master: normalised to -14 LUFS integrated, peak limiter at -1.2 dBFS.", "", "```", summ.strip(), "```", "", "## SFX and music events (time s | cue | gain dB)"]
L += [f"| {t:7.3f} | {n} | {g:+.0f} |" for t, n, g in sorted(EV)]
open(os.path.join(HERE, "cues.md"), "w").write("\n".join(L) + "\n")
print(summ); print("speech/bed ratio dB", round(ratio, 1))
