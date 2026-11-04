"""Babylon short: synthesized SFX + an original march score + the mix, built from the bridge template's audio
toolkit (dsp.py, instruments.py, sfx_gen.py). Every cue time comes from src/videos/babylon/story.ts / roles.ts
(frame / 30) or voice/words.json. Standard mix: music +3 dB (bed ~-10 LU under the voice instead of -13), SFX -6 dB,
voice unchanged. Writes audio/stems/{voice,music,sfx}.wav, audio/mix.wav (48 kHz, exact 69.000 s) and audio/cues.md.
usage: python babylon_audio.py"""
import os, json
import numpy as np
from dsp import (SR, ns, rng, st, place, pan, dbg, lp, hp, bp, fades, widen, make_ir, convolve_st, read_wav, write_wav,
                 integrated, true_peak, momentary_max)
import instruments as I
import sfx_gen as Gn
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS, TOTAL = 30, 2070
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []


def wd(x, r):
    x = np.asarray(x, float)
    return x if x.ndim > 1 else widen(x, r)


def pan_(x, p):
    x = np.asarray(x, float)
    return x if x.ndim > 1 else pan(x, p)



def cue(t, what):
    CUES.append((t, what))


def buf():
    return np.zeros((2, N))


# ------------------------------------------------------------------ voice
def load_voice():
    import soundfile as sf
    v, sr = sf.read(os.path.join(ROOT, "voice", "voice.wav"), dtype="float64")
    if v.ndim > 1:
        v = v.mean(axis=1)
    if sr != SR:
        v = signal.resample_poly(v, SR // 1000 * 1, sr // 1000)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


# ------------------------------------------------------------------ sfx helpers
def footsteps(b, t0, t1, rate, r, gain, stone=True, many=1, pp=0.0):
    t = t0
    while t < t1:
        for k in range(many):
            x = Gn.stroll_step(r, scuff=0.3 if stone else 0.7) if stone else Gn.boot(r, hard=0.6)
            place(b, pan_(x, pp + r.uniform(-0.3, 0.3) * (many > 1)), t + r.uniform(0, 0.06) * (many > 1), gain * r.uniform(0.7, 1.0))
        t += 1.0 / rate


def hooves(b, t0, t1, r, gain, rate=6.0):
    t = t0
    while t < t1:
        n = ns(0.09)
        tt_ = np.arange(n) / SR
        x = bp(r.standard_normal(n), 300, 2500) * np.exp(-tt_ / 0.018) + 0.6 * np.sin(2 * np.pi * 160 * tt_) * np.exp(-tt_ / 0.03)
        place(b, pan_(x, 0.2), t, gain * r.uniform(0.6, 1.0))
        t += 1 / rate * r.uniform(0.85, 1.15)


def rumble(dur, r, f=90):
    n = ns(dur)
    x = lp(r.standard_normal(n), f, 2) * 6
    return fades(x, 0.3, 0.6)


def gate_creak(r, dur=1.6):
    return Gn.creak(dur, r, rate0=60, rate1=95, rough=0.2, scale=1.4)


def dig_thud(r):
    n = ns(0.25)
    t = np.arange(n) / SR
    x = lp(r.standard_normal(n), 900) * np.exp(-t / 0.04) * 1.5 + np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.06)
    return x


def hit(r, big=1.0):
    """picture-cut impact: low boom + noise crack"""
    n = ns(2.2)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (48 + 40 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.5)
    crack = hp(r.standard_normal(n), 1500) * np.exp(-t / 0.03) * 0.5
    return (boom + crack) * big


def sfx_track():
    r = rng(5)
    b = buf()
    # ambience beds: wind on the plain / round the walls, city murmur, river
    wind = Gn.breeze(DUR, r, level=1.0, gust=0.25, bright=700)
    place(b, wd(wind, r) * 0.55, 0, 1)
    cue(0.0, "wind bed (whole film, swells round the walls 8.3-20.7)")
    place(b, wd(Gn.breeze(12.4, r, level=1.4, gust=0.35, bright=1200), r), fr(248), 0.5)
    # hook: distant army tramp + push whooshes + flash hit
    footsteps(b, 0.2, fr(248), 2.0, r, 0.18, stone=False, many=3)
    for tw in (fr(92 + 20), fr(170 + 17)):
        place(b, pan_(Gn.whoosh(1.0, r, peak=0.5), 0.0), tw - 0.5, 0.6); cue(tw, "push whoosh")
    place(b, pan_(hit(r, 0.9), 0), fr(248), 0.55); cue(fr(248), "flash hit (after the hook)")
    # gate CU: low rumble
    place(b, st(rumble(4.0, r)), fr(370), 0.4)
    # chariot on the wall top: hooves + wheel rumble; scout gasp on "chariot"
    hooves(b, 17.3, 21.0, r, 0.22, rate=7)
    place(b, st(rumble(3.7, r, f=140)), 17.3, 0.25); cue(17.3, "chariot hooves + wheels on the wall top")
    place(b, pan_(Gn.whoa(r), -0.1), 19.5, 0.35); cue(19.5, "scout gasp")
    # camp: flags, murmur
    place(b, wd(Gn.flag_flutter(2.4, r), r), fr(622), 0.25)
    place(b, wd(Gn.babble(2.4, r, 120, 1.0), r), fr(622), 0.08)
    # column on the march + cart
    footsteps(b, fr(694), fr(736), 2.0, r, 0.45, stone=False, many=4); cue(fr(694), "column footfalls")
    hooves(b, fr(694), fr(736), r, 0.12, rate=3)
    # Opis: battle rumble, impact on "defeated", running + shouts
    place(b, st(rumble(5.0, r, f=110)), fr(736), 0.6)
    place(b, pan_(hit(r, 1.0), 0), 27.1, 0.7); cue(27.1, "Opis impact (kick)")
    for k in range(5):
        place(b, pan_(Gn.whoa(r), r.uniform(-0.6, 0.6)), 27.2 + k * 0.25, 0.18)
    footsteps(b, 27.1, fr(876), 6.0, r, 0.25, stone=False, many=2)
    # Sippar: banner up
    place(b, wd(Gn.flag_flutter(1.4, r), r), 29.9, 0.35); cue(29.9, "banner flutter (Sippar)")
    footsteps(b, fr(876), fr(918), 2.0, r, 0.3, stone=False, many=3)
    # gate: creak as the shot opens on the open gate, feet on stone
    place(b, pan_(gate_creak(r), 0.1), fr(918) - 0.2, 0.35); cue(fr(918), "gate creak")
    footsteps(b, fr(918), fr(1006), 2.0, r, 0.4, stone=True, many=3); cue(fr(918), "footsteps on stone")
    # Cyrus arrives: steps + crowd cheer
    footsteps(b, fr(1006), fr(1088), 1.6, r, 0.5, stone=True)
    place(b, wd(Gn.applause(2.6, r, people=30), r), 34.0, 0.18); cue(34.0, "soldiers' cheer")
    # golden river: water beds
    place(b, wd(Gn.water_bed(fr(1314) - fr(1088), r, close=0.8, slosh_rate=0.5), r), fr(1088), 0.45); cue(fr(1088), "river bed (legend)")
    place(b, pan_(hit(r, 0.4), 0), 36.26, 0.35)
    # digging thuds, the plug breaks, rush of water
    t = 40.45
    while t < 42.0:
        place(b, pan_(dig_thud(r), r.uniform(-0.4, 0.4)), t, 0.5); t += 0.42 * r.uniform(0.85, 1.1)
    cue(40.45, "mattock thuds")
    place(b, pan_(Gn.splash_big(r), 0), fr(1262), 0.6); place(b, st(rumble(3.0, r, f=300)), fr(1262), 0.5); cue(fr(1262), "plug bursts: water rush")
    # river sinks: draining gurgle
    place(b, wd(Gn.bubbles(2.4, r, 30, 200, 1200), r), fr(1322), 0.4); cue(fr(1322), "water draining")
    # wading: sloshes
    place(b, wd(Gn.water_bed(fr(1500) - fr(1386), r, close=1.2, slosh_rate=1.6), r), fr(1386), 0.55); cue(fr(1386), "wading sloshes")
    # festival: crowd + cheers
    place(b, wd(Gn.babble(fr(1634) - fr(1500), r, 150, 1.1, rate=5.0), r), fr(1500), 0.35)
    place(b, wd(Gn.applause(3.0, r, people=24), r), 50.4, 0.2); cue(fr(1500), "festival crowd")
    # Xenophon CU: quiet sloshes
    place(b, wd(Gn.water_bed(fr(1709) - fr(1634), r, close=0.7, slosh_rate=0.7), r), fr(1634), 0.3)
    # the twist: hit + flash
    place(b, pan_(hit(r, 1.0), 0), 56.98, 0.75); cue(56.98, "twist hit + flash")
    # full river again
    place(b, wd(Gn.water_bed(fr(1852) - fr(1760), r, close=0.4, slosh_rate=0.4), r), fr(1760), 0.35)
    # Cyrus under the gate: steps on stone, gate echo
    footsteps(b, fr(1852), fr(1916), 1.6, r, 0.5, stone=True); cue(fr(1852), "Cyrus's footsteps on stone")
    # final aerial: wind swell
    place(b, wd(Gn.breeze(5.0, r, level=1.3, gust=0.3, bright=900), r), fr(1916), 0.4)
    return b


# ------------------------------------------------------------------ music: original march (D, Phrygian-dominant colour)
BPM = 112
BEAT = 60 / BPM
D = 50  # MIDI D3
SC = [0, 1, 4, 5, 7, 8, 10, 12]  # phrygian dominant degrees


def note(deg, octv=0):
    o, i = divmod(deg, 7)
    return D + SC[i] + 12 * (o + octv)


THEME = [(0, 1), (2, 0.5), (3, 0.5), (4, 1), (3, 0.5), (2, 0.5), (1, 1), (2, 1), (4, 1.5), (3, 0.5), (2, 1), (1, 0.5), (0, 0.5), (0, 2)]


def music_track():
    r = rng(11)
    b = buf()
    rv = make_ir(1.4, 3)

    def tone(fn, t, gain, p=0.0):
        place(b, pan_(fn, p), t, gain)

    def theme(t0, transpose=0, fn="horn", gain=0.25, octv=1):
        t = t0
        for deg, d in THEME:
            f = I.m2f(note(deg + transpose, octv))
            x = I.brass(f, d * BEAT * 0.9, 0.7, r, kind=fn) if fn in ("horn", "stab", "soft", "tuba") else I.fife(f, d * BEAT * 0.85, 0.6, r)
            tone(x, t, gain, 0.15)
            t += d * BEAT
        return t

    def oompah(t0, t1, gain=0.3, snare=True):
        t, k = t0, 0
        while t < t1:
            root = I.m2f(note(0 if (k // 8) % 2 == 0 else 3, -1))
            if k % 2 == 0:
                tone(I.brass(root, BEAT * 0.45, 0.65, r, kind="tuba"), t, gain, -0.1)
            else:
                tone(I.brass(root * 1.5, BEAT * 0.3, 0.45, r, kind="soft"), t, gain * 0.6, 0.2)
            if snare:
                tone(I.snare(0.5 if k % 2 else 0.35, r), t, gain * 0.5, 0.05)
                if k % 4 == 3:
                    tone(I.snare(0.3, r), t + BEAT / 2, gain * 0.35, 0.05)
            t += BEAT; k += 1

    # hook: timpani roll building into the flash hit, horn call
    for k in range(int(8.2 / (BEAT / 4))):
        tk = k * BEAT / 4
        tone(I.timpani(I.m2f(D - 12), 0.15 + 0.5 * tk / 8.2, r, dur=0.6), tk, 0.25)
    theme(0.4, fn="horn", gain=0.18)
    tone(I.cymbal(0.9, r, dur=3.0), fr(248), 0.35); tone(I.timpani(I.m2f(D - 12), 1.0, r), fr(248), 0.5)
    cue(fr(248), "music: cymbal + timpani on the flash")
    # A: march (walls, scout gag)
    oompah(fr(248), 20.6, 0.3)
    theme(fr(248) + 2 * BEAT, fn="fife", gain=0.22, octv=2)
    t = theme(14.0, fn="fife", gain=0.2, octv=2)
    tone(I.glock(I.m2f(note(4, 2)), 0.7, r), 19.55, 0.25); cue(19.55, "music: glock 'ding' on 'chariot'")
    # A': Cyrus, bigger (trumpet-ish stabs)
    oompah(20.7, 36.2, 0.36)
    theme(20.75, fn="horn", gain=0.3, octv=1)
    theme(28.0, fn="stab", gain=0.22, octv=1)
    tone(I.cymbal(0.8, r), 27.1, 0.3); tone(I.timpani(I.m2f(D - 12), 1.0, r), 27.1, 0.45)
    # legend: mysterious pad + plucks, suspense pulse
    tone(I.cymbal(0.5, r, dur=2.0), 36.26, 0.2)
    for k, ch in enumerate([[0, 2, 4], [1, 3, 5], [0, 2, 4], [-2, 1, 3]]):
        fr_ = [I.m2f(note(d, 0)) for d in ch]
        tone(I.pad(fr_, 4.6, 0.5, r, att=0.8, rel=1.2), 36.3 + k * 4.5, 0.22)
    t = 36.4
    while t < 50.0:
        tone(I.pluck(I.m2f(note([0, 4, 2, 4][int(t / BEAT) % 4], 1)), 0.5, r), t, 0.18)
        t += BEAT / 2
    t = 46.2
    while t < 50.0:  # wading: soft timpani heartbeat
        tone(I.timpani(I.m2f(D - 12), 0.35, r, dur=0.8), t, 0.25); t += BEAT
    # festival: playful major-ish dance (plucks + triangle + snare)
    t, k = 50.0, 0
    while t < 54.3:
        tone(I.pluck(I.m2f(D + [12, 16, 19, 16][k % 4]), 0.6, r), t, 0.22)
        if k % 2 == 0:
            tone(I.triangle(0.4, r), t, 0.12)
        tone(I.snare(0.25, r), t, 0.08)
        t += BEAT / 2; k += 1
    # Xenophon: light echo of the theme in glock
    t = 54.5
    for deg, d in THEME[:6]:
        tone(I.glock(I.m2f(note(deg, 2)), 0.5, r), t, 0.15); t += d * BEAT * 0.5
    # twist: hit then suspended pad + low pulses
    tone(I.cymbal(1.0, r, dur=2.5), 56.98, 0.3); tone(I.timpani(I.m2f(D - 12), 1.0, r), 56.98, 0.5)
    tone(I.pad([I.m2f(D - 12), I.m2f(D - 11), I.m2f(D - 5)], 6.6, 0.5, r, att=1.0, rel=1.0), 57.2, 0.25)
    t = 58.0
    while t < 63.7:
        tone(I.timpani(I.m2f(D - 12), 0.4 + 0.4 * (t - 58) / 5.7, r, dur=0.7), t, 0.25); t += BEAT
    # finale: theme grand, final hit
    oompah(63.85, 67.9, 0.36)
    theme(63.9, fn="horn", gain=0.3, octv=1)
    tone(I.brass(I.m2f(D), 1.5, 0.9, r, kind="stab"), 68.05, 0.4)
    tone(I.brass(I.m2f(D - 12), 1.5, 0.9, r, kind="tuba"), 68.05, 0.45)
    tone(I.cymbal(1.0, r, dur=3.0), 68.05, 0.4); tone(I.timpani(I.m2f(D - 12), 1.0, r), 68.05, 0.6)
    cue(68.05, "music: final hit")
    wet = convolve_st(b, rv)[:, :N]
    out = b * 0.8 + wet * 0.35
    out[:, ns(DUR - 0.25):] *= np.linspace(1, 0, N - ns(DUR - 0.25))
    return out


# ------------------------------------------------------------------ mix
def lufs(x):
    return integrated(x)


def duck(m, words, depth=-3.0):
    g = np.zeros(N)
    for w in words:
        a, b = ns(max(0, w["s"] - 0.08)), ns(min(DUR, w["e"] + 0.12))
        g[a:b] = 1
    k = ns(0.12)
    g = np.convolve(g, np.ones(k) / k, mode="same")
    return m * dbg(depth * g)[None, :]


def main():
    os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
    words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
    v = load_voice()
    s = sfx_track()
    m = music_track()
    Lv = lufs(v)
    # bridge-template baselines: music bed -13 LU under the voice, SFX bed -12 LU; standard = music +3 dB, SFX -6 dB
    m = m * dbg((Lv - 13 + 3) - lufs(m))
    s = s * dbg((Lv - 12 - 6) - lufs(s))
    m = duck(m, words)
    mix = v + m + s
    # loudness to -15 LUFS, then a gentle peak limit at -1.2 dBTP
    gain = dbg(-15.0 - lufs(mix))
    mix *= gain; v *= gain; m *= gain; s *= gain
    from mix import limiter
    mix, _g = limiter(mix, -1.5)
    write_wav(os.path.join(HERE, "stems", "voice.wav"), v)
    write_wav(os.path.join(HERE, "stems", "music.wav"), m)
    write_wav(os.path.join(HERE, "stems", "sfx.wav"), s)
    write_wav(os.path.join(HERE, "mix.wav"), mix)
    rep = [f"# Babylon sound cues (auto-generated)\n", f"- length {mix.shape[1] / SR:.3f} s, 48 kHz stereo",
           f"- integrated {lufs(mix):.1f} LUFS, sample peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS, true peak {true_peak(mix):.1f} dBTP",
           f"- voice {lufs(v):.1f} LUFS, music {lufs(m):.1f} LUFS (bed {lufs(m) - lufs(v):+.1f} LU vs voice), sfx {lufs(s):.1f} LUFS ({lufs(s) - lufs(v):+.1f} LU)", "", "| t (s) | cue |", "|---|---|"]
    rep += [f"| {t:.2f} | {w} |" for t, w in sorted(CUES)]
    open(os.path.join(HERE, "cues.md"), "w").write("\n".join(rep) + "\n")
    print("\n".join(rep[:5]))


if __name__ == "__main__":
    main()
