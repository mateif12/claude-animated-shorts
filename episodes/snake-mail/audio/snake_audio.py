# "Snake Mail" soundtrack: original synthesized score + SFX placed on the picture's word-locked times, mixed under the
# narrator's recording. The voice is used exactly as recorded (decoded once, no gain, EQ, compression, edit or speed
# change); only music + SFX are shaped and ducked under it. Output: mix.wav (48 kHz stereo 24-bit, picture length).
import json
import subprocess
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, st, place, dbg, write_wav, integrated, true_peak, make_ir, convolve_st, phase, modal
import instruments as I
import sfx_gen as X

FPS = 30
TOTAL = 2131
DUR = TOTAL / FPS
N = ns(DUR)
VOICE_MP3 = "/home/user/claude-animated-shorts/episodes/snake-mail/voice.mp3"
WORDS = json.load(open("/root/snake/voice/words.json"))

# ---------------- voice (untouched) ----------------
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", VOICE_MP3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
voice = np.frombuffer(raw, "<f4").astype(np.float64)
assert len(voice) <= N, (len(voice), N)
V = np.zeros((2, N)); V[:, : len(voice)] = voice  # mono voice on both channels, sample-for-sample
print("voice samples", len(voice), "=", len(voice) / SR, "s; video", DUR, "s")

M = np.zeros((2, N))   # music
S = np.zeros((2, N))   # sfx
R = rng(7)

# ---------------- score: cheeky pizzicato + hand drums, D dorian, 120 bpm ----------------
BEAT = 0.5
def m2f(m): return 440.0 * 2 ** ((m - 69) / 12)
D4 = 62
SCALE = {"D": 0, "E": 2, "F": 3, "G": 5, "A": 7, "B": 9, "C": 10}
def note(name, octv=0):
    return D4 + SCALE[name[0]] + 12 * octv + (1 if "#" in name else 0) + (-1 if "b" in name and len(name) > 1 else 0)
MOTIF = [("A", 0, 1), ("A", 0, 1), ("D", 1, 1), ("C", 1, 1), ("A", 0, 2), ("G", 0, 1), ("F", 0, 1),
         ("E", 0, 1), ("F", 0, 1), ("G", 0, 1), ("A", 0, 1), ("D", 0, 4)]  # durations in 8ths
MOTIF_B = [("F", 0, 1), ("A", 0, 1), ("C", 1, 1), ("A", 0, 1), ("B", 0, 2), ("A", 0, 2),
           ("G", 0, 1), ("F", 0, 1), ("E", 0, 1), ("C#", 0, 1), ("D", 0, 4)]
CHORDS = [("D", "A"), ("C", "G"), ("Bb", "F"), ("A", "E")]
def bass_m(n): return {"D": 38, "C": 36, "Bb": 34, "A": 33}[n]

def groove(t0, t1, vel=0.55, mel=True, drums=True, transpose=0):
    bar = 4 * BEAT
    k = 0
    t = t0
    while t < t1 - 0.05:
        ch = CHORDS[k % 4]
        root = bass_m(ch[0]) + transpose
        for b in range(4):
            tb = t + b * BEAT
            if tb >= t1: break
            place(M, pan(I.pluck(m2f(root + (7 if b % 2 else 0)), 0.9 * vel, R, 0.5, 0.35), -0.2), tb, 1.0)
            if b % 2 == 1:  # off-beat chord stabs
                for m in (root + 24, root + 27 if ch[0] in ("D", "A") else root + 28, root + 31):
                    place(M, pan(I.pluck(m2f(m), 0.28 * vel, R, 0.3, 0.6), 0.25), tb + 0.25, 1.0)
            if drums:
                place(M, pan(I.timpani(m2f(root + 12), 0.45 * vel, R, 0.5), 0.0) if b == 0 else pan(I.brush(0.5 * vel, R, 0.2), 0.3), tb, 0.6)
                place(M, pan(I.brush(0.25 * vel, R, 0.12), -0.3), tb + 0.25, 0.5)
        if mel:
            seq = MOTIF if (k // 2) % 2 == 0 else MOTIF_B
            if k % 2 == 0:
                tm = t
                for nm, o, d in seq:
                    if tm >= t1: break
                    place(M, pan(I.pluck(m2f(note(nm, o) + 12 + transpose), 0.55 * vel, R, 0.6, 0.75), 0.1), tm, 1.0)
                    tm += d * BEAT / 2
        t += bar
        k += 1

groove(0.0, 52.25, 0.6)
# hook sting + flash whoosh
for m in (62, 66, 69, 74):
    place(M, I.brass(m2f(m), 0.35, 0.6, R, "stab"), 4.5, 0.5)
# "Rome": a little fanfare blip
for i, m in enumerate((74, 78, 81)):
    place(M, I.glock(m2f(m), 0.5, R, 1.0), 18.08 + i * 0.09, 0.5)
# record-scratch stop before "Then the pots break" (music silent 52.3 -> 53.7)
fade = np.ones(N); a, b = ns(52.2), ns(52.32); fade[a:b] = np.linspace(1, 0, b - a); fade[b: ns(53.70)] = 0
M *= fade[None, :]
# snake chaos after the break: faster, tremolo strings stand-in (pad) + low timpani pulses
groove(53.74, 62.3, 0.55, mel=True, drums=True, transpose=-2)
place(M, I.pad([m2f(50), m2f(53), m2f(57)], 2.2, 0.5, R, att=0.05, rel=0.6), 55.8, 0.7)  # "venomous" stinger
for i, m in enumerate((79, 83, 86, 91)):
    place(M, I.musicbox(m2f(m), 0.6, R, 1.2), 58.84 + i * 0.12, 0.6)  # "harmless"
# golden: triumphant brass over plucks
groove(62.3, 70.2, 0.5, mel=False)
for t0, ms in [(62.4, (50, 57, 62)), (64.0, (48, 55, 64)), (65.6, (46, 53, 62)), (67.2, (45, 52, 61))]:
    for m in ms:
        place(M, I.brass(m2f(m), 1.4, 0.45, R, "horn"), t0, 0.35)
# button ending on "tag"
for m in (50, 57, 62, 66, 69):  # button after the last word ends (70.60 s), so it never covers "name tag"
    place(M, I.brass(m2f(m), 0.35, 0.6, R, "stab"), 70.64, 0.4)
place(M, pan(I.cymbal(0.5, R, 0.6), 0.2), 70.64, 0.3)
place(M, I.timpani(m2f(38), 0.7, R, 0.5), 70.64, 0.6)

# ---------------- SFX ----------------
def sfx(x, t, g=1.0, p=0.0):
    x = np.asarray(x, float)
    place(S, pan(x, p) if x.ndim == 1 else x, t, g)
def clonk(r, f0=420):
    return modal(0.35, [(f0, 1.0, 0.05), (f0 * 2.4, 0.5, 0.03), (f0 * 4.1, 0.25, 0.015)], r)
def boing(dur=0.6, f0=180, f1=420):
    t = tt(dur); f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.08)); vib = 1 + 0.08 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.3)
    return fades(np.sin(phase(f * vib)) * np.exp(-t / 0.25), 0.002, 0.05)
def hiss(dur, r, level=1.0):
    n = ns(dur); t = tt(dur)
    return fades(bp(colored(n, r, 0.0), 3500, 9000, 2) * level * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t)) * np.clip(t / 0.05, 0, 1), 0.01, 0.12)
def squawk(r):
    t = tt(0.35); f = 900 + 500 * np.sin(np.pi * t / 0.35)
    return fades((np.sign(np.sin(phase(f))) * 0.3 + np.sin(phase(f * 2)) * 0.3) * np.exp(-((t - 0.12) / 0.1) ** 2), 0.005, 0.05)
def rustle(dur, r):
    n = ns(dur); return fades(bp(colored(n, r, 0.3), 1500, 7000, 2) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * tt(dur)))), 0.02, 0.08)
def scratch():
    t = tt(0.32); f = 1800 * (1 - t / 0.32) + 300
    return fades(bp(R.standard_normal(len(t)), 400, 5000, 2) * np.sin(phase(f)) * 1.5, 0.003, 0.05)
def ha_laugh(r, base):
    out = np.zeros(ns(1.6))
    for i in range(6):
        x = X.oof(r, "oh", base=base * (1.15 - 0.04 * i), scale=1.05)[: ns(0.16)]
        place_ = ns(i * 0.2 + r.uniform(0, 0.03)); out[place_: place_ + len(x)] += fades(x, 0.005, 0.03)
    return out

sfx(X.whoosh(0.7, R, 0.5, 300, 1600), 2.25, 0.35)            # wind-up
sfx(X.whoosh(1.3, R, 0.9, 400, 3000), 3.1, 0.55)              # pot flying at the lens
sfx(X.whoosh(0.5, R, 0.15, 800, 4000), 4.3, 0.45)             # into the flash
sfx(boing(0.7, 160, 520), 6.76, 0.5); sfx(I.brass(m2f(55), 0.5, 0.6, R, "tuba", scoop=-200), 6.85, 0.4)   # elephant pop + toot
sfx(X.creak(0.9, R, 90, 140), 6.9, 0.35, -0.3)                # ship leans
sfx(X.water_bed(5.5, R, 0.6), 7.85, 0.25)                     # harbour lapping
sfx(squawk(R), 9.0, 0.35, 0.3); sfx(squawk(R), 9.5, 0.3, 0.1)  # gull lands
sfx(X.whoosh(0.8, R, 0.4, 300, 2000), 13.0, 0.35)             # transition to the fleet
sfx(X.water_bed(5.5, R, 0.4), 13.3, 0.22)
sfx(X.bird_chirps(8.5, R, 0.8), 18.8, 0.25, -0.2)             # meadow
sfx(rustle(0.8, R), 23.2, 0.4); sfx(hiss(0.9, R), 23.4, 0.35, 0.2)
for i in range(10): sfx(clonk(R, 380 + 60 * (i % 4)), 24.22 + i * 0.11, 0.18, (i % 3 - 1) * 0.4)  # lids rattling
sfx(boing(0.5, 300, 120), 25.7, 0.35)                          # snake stretches / stuffed
sfx(clonk(R, 300), 26.7, 0.45)                                 # lid slammed
sfx(X.whoosh(0.8, R, 0.4, 300, 2000), 27.1, 0.3)
sfx(X.water_bed(4.2, R, 1.0, 1.6), 27.45, 0.3)                 # skiff oars
for i in range(6): sfx(X.splash_big(R)[: ns(0.4)] * np.exp(-tt(0.4) / 0.1), 27.7 + i * 0.7, 0.08)
sfx(rustle(0.5, R), 36.3, 0.4)                                 # scroll unrolled
for i, m in enumerate((55, 54, 53, 52)): sfx(I.brass(m2f(m), 0.32 if i < 3 else 0.7, 0.55, R, "horn", scoop=-30, fall=-120 if i == 3 else 0), 37.86 + i * 0.3, 0.3)  # sad "wah wah"
sfx(clonk(R, 900)[: ns(0.15)], 38.45, 0.25)                    # grape plop
sfx(X.whoosh(0.4, R, 0.1, 1000, 5000), 41.6, 0.35); sfx(I.glock(m2f(88), 0.8, R, 1.2), 41.7, 0.35)  # arrow pops on
for (tt0, vel) in I.snare_roll(43.6, 45.3, 0.2, 0.7, R): sfx(I.snare(vel, R, 0.2), tt0, 0.25)
sfx(X.whoosh(1.8, R, 1.2, 300, 1800), 43.6, 0.4)               # fleet charges
sfx(X.water_bed(2.6, R, 1.0, 2.0), 43.35, 0.3)
for i in range(6):
    t0 = 47.46 + (i % 3) * 0.45 + (0.3 if i % 3 == 2 else 0) + (i // 3) * 1.3
    sfx(X.whoosh(0.9, R, 0.35, 400, 2400), t0, 0.32, 0.3)
    sfx(clonk(R, 350 + 40 * i), t0 + 1.15, 0.3, -0.3)
sfx(ha_laugh(R, 120), 49.6, 0.5, -0.2); sfx(ha_laugh(R, 150), 49.75, 0.45, 0.25); sfx(ha_laugh(R, 105), 50.0, 0.4, 0.0)
for i in range(3): sfx(clonk(R, 260), 51.0 + i * 0.22, 0.35)   # drumming on a pot
sfx(scratch(), 52.2, 0.45)                                     # record scratch
c = X.wood_crack(R); sfx(hp(c, 900), 53.74, 0.5)               # the pot cracks
sfx(hiss(1.6, R, 1.3), 53.95, 0.5)
sfx(hiss(1.4, R, 0.8), 55.4, 0.3, -0.4)                        # "venomous"
for i, (tj, p) in enumerate([(60.26, -0.5), (60.61, 0.5), (60.96, -0.3), (61.31, 0.4)]):
    sfx(X.whoa(R), tj - 0.1, 0.35, p)
    sfx(X.splash_big(R), tj + 0.9, 0.22, p)
sfx(hiss(0.6, R, 0.6), 61.7, 0.25)
sfx(X.water_bed(2.6, R, 0.8, 1.5), 62.3, 0.3)                  # fleet rows away
sfx(X.water_bed(2.4, R, 1.0), 64.75, 0.3)                      # beach waves
for i in range(3): sfx(X.stroll_step(R, 0.8), 64.9 + i * 0.45, 0.35)
sfx(X.whoosh(0.6, R, 0.3, 300, 1800), 66.9, 0.3)
sfx(X.water_bed(4.0, R, 0.5), 67.1, 0.2)
sfx(I.glock(m2f(93), 0.6, R, 0.8), 70.28, 0.15)                # failed wink "ting"

# ---------------- mix: duck the bed under the voice, voice unchanged ----------------
spans = []
for w in WORDS:
    if spans and w["s"] - spans[-1][1] < 0.3: spans[-1][1] = w["e"]
    else: spans.append([w["s"], w["e"]])
env = np.zeros(N)
for s0, s1 in spans: env[max(0, ns(s0 - 0.08)): ns(s1 + 0.12)] = 1
# smooth attack 70 ms / release 450 ms
k_a, k_r = 1 / (0.07 * SR), 1 / (0.45 * SR)
sm = np.zeros(N); y = 0.0
for i in range(0, N, 48):
    tgt = env[i]; k = k_a if tgt > y else k_r
    y += (tgt - y) * min(1.0, k * 48)
    sm[i: i + 48] = y
duck = dbg(-8.0 * sm)
vL = integrated(V)
for name, X_ in (("music", M), ("sfx", S)):
    print(name, "raw LUFS", round(integrated(X_), 1))
# levels relative to the voice after ducking (bridge reference: music 10.4 LU, sfx 13.7 LU under the voice)
M *= dbg((vL - 10.4) - integrated(M * duck[None, :])); S *= dbg((vL - 13.7) - integrated(S * duck[None, :]))
duck = dbg(-12.0 * sm)  # levels were set with the -8 dB duck; speech ducking deepened to -12 dB for intelligibility
bed = (M + S) * duck[None, :]
pre = V + bed
# master: one uniform gain on the whole mix to -15 LUFS integrated (bridge master), then the bridge's look-ahead
# true-peak limiter at -1.2 dBTP (peaks only). Words, timing and pauses are untouched.
from scipy import signal as SG, ndimage
def limiter(x, ceil_db=-1.2, look=0.003, rel=0.08):
    c = dbg(ceil_db); n = x.shape[1]
    up = np.abs(SG.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy(); idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR)); gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]]); ends = np.concatenate([idx[brk], [idx[-1]]])
        for a_, b_ in zip(starts, ends):
            e = min(n, b_ + gap); seg = g1[a_:e]; out = np.empty(len(seg)); g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr); out[k] = g
            g2[a_:e] = out
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    return x * g3[None, :], g3
G = dbg(-15.0 - integrated(pre))
mix, gcurve = limiter(pre * G)
print("master gain dB", round(20 * np.log10(G), 2), "limiter max GR dB", round(-20 * np.log10(gcurve.min()), 2), "active >0.1dB %", round(100 * np.mean(gcurve < dbg(-0.1)), 2))
write_wav("/root/snake/audio/mix.wav", mix)
write_wav("/root/snake/audio/stem_bed.wav", bed)
print("at mix gain: voice LUFS", round(vL + 20*np.log10(G), 1), "music LUFS", round(integrated(M * duck) + 20*np.log10(G), 1), "sfx LUFS", round(integrated(S * duck) + 20*np.log10(G), 1))
print("mix LUFS", round(integrated(mix), 1), "TP", round(true_peak(mix), 2), "samples", mix.shape[1], "=", mix.shape[1] / SR)
res = np.abs(pre - bed - V).max()
print("voice untouched before master check (max |pre - bed - voice|):", res)
write_wav("/root/snake/audio/stem_voice_master.wav", V * G * gcurve[None, :])

# per-word check: voice vs bed (at the same master gain) over each word's span
import json as _j
bad = []
for w in WORDS:
    a_, b_ = ns(w["s"]), max(ns(w["e"]), ns(w["s"]) + 480)
    v_ = np.sqrt(np.mean((V[0, a_:b_] * G) ** 2)) + 1e-9; bb = np.sqrt(np.mean((bed[0, a_:b_] * G * gcurve[a_:b_]) ** 2)) + 1e-9
    m_ = 20 * np.log10(v_ / bb)
    if m_ < 8: bad.append((w["w"], w["s"], round(m_, 1)))
print("words with voice < 8 dB over bed:", bad)
