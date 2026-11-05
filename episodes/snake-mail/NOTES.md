# Snake Mail — production notes (2026-11-05)

Deliverable: `snake-mail-final.mp4` — 1080x1920, 30 fps, H.264 + AAC 48 kHz stereo, 71.033 s (2131 frames).

## Pipeline used (cartoon-3d-short skill, audio-first)
1. `voice.mp3` = the user's recording (byte-identical copy, md5 6fa3e0bd39ed1277a6f01bebfabd9bcd, 71.0008 s).
2. Word timings: faster-whisper `small.en` word timestamps -> `words.json` (187 words, all 18 script lines present).
3. Picture: `src/` = the bridge template adapted (Remotion + three.js). New `story.ts` (shots locked to word onsets,
   ship choreography, camera keys), `world.ts` (sea, toon galleys, harbour, meadow, beach), `cast.ts` (our own cast:
   Hannibal, Eumenes, messenger, sailors, snakes, pots, letter, arrow), `toon.ts` extended (beard, one eye, helmet,
   diadem, cape, pot / scroll / grapes props, new effect drawings). Ink, grade, painted textures, two-tone lighting,
   card shading and the sky/water shaders are the template's.
4. Sound: `audio/snake_audio.py` — original synthesized score (pizzicato + hand drums, D dorian, 120 bpm) and SFX
   with the template's DSP/instruments/SFX kit, placed on the same word-locked times; bed ducked under the voice.

## Mix
- The recording is decoded once and summed sample-for-sample (verified: max |pre-master mix - bed - voice| = 5.6e-17).
  No EQ, compression, edit, time-stretch or pause removal.
- Bed levels set against the bridge reference (music 10.4 LU, SFX 13.7 LU under the voice with an -8 dB duck), then
  the speech duck deepened to -12 dB after a per-word check; final stems at mix gain: voice -15.0, music -28.9,
  SFX -31.9 LUFS. The closing music button starts at 70.64 s, after the last word (70.60 s).
- Master (as in the bridge short): one uniform gain on the whole mix to -15 LUFS integrated (+6.3 dB; the raw
  recording measures -21.3 LUFS), then the bridge's look-ahead true-peak limiter at -1.2 dBTP (peaks only: max
  4.4 dB gain reduction, active on 7.3 % of samples).

## Render-budget decisions (hard 2-hour limit, CPU-only container, no GPU)
Measured in a short benchmark: full-quality 1080x1920 (MSAA 4 + lens blur + bloom) rendered roughly 6 frames/min
(several hours for 2131 frames).
To finish inside the limit, the final was rendered with:
- internal resolution 608x1080, upscaled to 1080x1920 with Lanczos + light unsharp (720x1280 was tested at
  ~20 frames/min; after a lost restart, 608x1080 at ~30-60 frames/min was needed to keep a safe margin);
- 15 fps "on twos" (each drawn frame held for two 30 fps frames, the classic cartoon cadence); every visual cue
  still lands within one 30 fps frame of its word;
- MSAA 2 (not 4); lens blur (depth of field) off on every shot (it was the single most expensive pass, ~2.3x);
  bloom off except in the golden-hour shots;
- character canvases at 0.56x resolution (matching the 608x1080 buffer).
Ink outlines, colour grade, two-tone lighting, painted textures, card shading, camera moves and all gags are intact.
Rendered in three chunks (15 fps frames 0-355, 356-710, 711-1065) so a crash costs one chunk. A first attempt crashed at a crossfade (`fx.ink.dispose` missing in the template build); fixed with an
optional call in `Snake.tsx`.

## Final checks (2026-11-05 10:12 UTC)
- 1080x1920, 30 fps, 2131 frames, 71.033 s; AAC 48 kHz stereo 71.033 s; full decode without errors.
- Whole recording inside (71.0008 s voice < 71.033 s audio); final audio vs master mix lag 0 samples, SNR 38 dB;
  voice/final envelope correlation 0.976; integrated -15.1 LUFS.
- 15 fps picture QA: no black, white or frozen spans. The MP4 (118.9 MB) is not committed: GitHub's per-file limit is 100 MB.
