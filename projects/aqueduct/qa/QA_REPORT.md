# QA report: "Rivers in the Sky" (final export)

File: `final/aqueduct_short_720x1280.mp4`. Checked with `qa/short_qa.py` (every frame), `ffprobe`, `ffmpeg ebur128` and a visual pass over the whole film (`qa/overview_*.jpg`: one frame in 15, plus 2 s contact sheets `qa/sheet_*.jpg`).

## Specs (measured)
| Check | Target | Result |
|---|---|---|
| Resolution | 720x1280 (9:16) | 720x1280 ✅ |
| Frame rate | 30 fps | 30/1 ✅ |
| Frames / duration | 45–60 s | 1,755 frames, 58.500 s ✅ |
| Video codec | H.264 | H.264 High, yuv420p, CRF 17, faststart ✅ |
| Audio | 48 kHz stereo | AAC 256 kb/s, 48 kHz, 2 ch ✅ |
| Loudness | −14 LUFS (platform norm) | −14.0 LUFS integrated, LRA 1.6 LU ✅ |
| True peak | ≤ −1 dBTP | −1.3 dBFS ✅ |
| Narration clarity | voice clearly above the bed | speech is 8.9 dB above music+SFX while the narrator talks; music ducked −9 dB, SFX −4 dB ✅ |
| Silences > 0.3 s below −45 dB | none | none ✅ |

## Frame-by-frame (all 1,755 frames)
- Black frames: **none**. Unplanned white frames: **none** (the 4-frame white flash at f150–153 is planned).
- Frozen spans ≥ 12 f: **none**. Held frames: 1 %.
- Unplanned pops (frame-difference spikes): **none**, including the two splice seams at f500 and f770.
- Per-shot luma/saturation: see `qa/report.md`.

## Issues found and fixed during QA
| # | Found by | Issue | Fix | Verified |
|---|---|---|---|---|
| 1 | per-shot luma (shot 5 mean 0.18 vs 0.47–0.65) | A worker standing ~1 m from the lens in the chorobates close-up (4c) was drawn as a giant face, and the overlay canvas kept that drawing into shot 5 | Characters closer than 2.5 m to the lens are never drawn; the overlay canvas is cleared at the start of every frame; frames 500–769 re-rendered and spliced | Shot 5 luma 0.612, no pops at the seams, visual check ✅ |
| 2–15 | two look-check rounds (41 stills) | Hook framing, crowd too close, camera inside a building, glide onto a wall, survey props sunk in terrain, weak framings, wheel cut off, workers/keystone out of frame, ending without the aqueduct, neon grass, near-lens blob | Camera, terrain and staging fixes before the final render | Final overview sheets ✅ |

## Picture/voice sync (visual beats vs words)
| Word | Spoken at | Picture / music beat | Lead |
|---|---|---|---|
| pump | 4.48 s (f134) | timpani + aerial push (f134) | on the word |
| gravity | 12.62 s (f379) | kick + timpani (f379) | on the word |
| arches | 32.54 s (f976) | timpani + cymbal, roll glide (f976) | on the word |
| six | 34.82 s (f1045) | mallet strike f1043 | 2 f early |
| hold | 40.74 s (f1222) | keystone thud + kick (f1222) | on the word |
| opened | 46.16 s (f1385) | gate up f1376-1386, burst f1385 | on the word |
| Fountains | 49.58 s (f1487) | fountain burst f1484, kick f1487 | 3 f early (burst) |
| Trevi | 56.30 s (f1689) | timpani + cymbal (f1689) | on the word |

Leads of 0–3 frames are intended: the skill lands reactions 0–3 frames before the word. The gate lift starts 9 frames before "opened" so that the water bursts on the word. Sound is placed on the same frame table, so audio and picture are locked by construction.

## Subtitles
`final/subtitles.srt`: 32 cues taken from the Whisper word timings. Spelling was corrected to the script: Nîmes, chorobates, tonnes, kilometres. Cues break at sentence ends and never overlap. They are not burned in, following the skill's no-captions rule.

## Character consistency
The same outfit definitions and head seeds are used throughout (`overlay.ts`). The engineer (off-white tunic, red sash, grey hair) appears in shots 4, 8 and 10. Labourers wear earth-tone tunics, and citizens wear coloured tunics/stolae; the same crowd is thirsty in shot 2 and cheering in shot 10.

## Known limitations
- Rendered at 720x1280, not 1080p/2K, to meet the time budget. The pipeline renders 1080x1920 unchanged at about 2.25x the render time (~40 min).
- DOF, bloom and MSAA are off for speed. Edges rely on the ink pass, so some fine diagonals alias slightly.
- Characters are drawn on an overlay, so they can never be occluded by scenery. Staging avoids any need for occlusion.
- Synthesized TTS narration (Kokoro). It is natural but not a human voice actor.
- Artistic licence: an open channel, and a time-compressed water run (see `research/RESEARCH.md`).
