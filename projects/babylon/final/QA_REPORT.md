# QA REPORT — Babylon short

## Deliverables
| File | Status |
|---|---|
| `final/babylon_short_FINAL.mp4` | 1440×2560, 30 fps, H.264 High CRF 16, AAC 320 kb/s 48 kHz — see measured specs below |
| `final/babylon_short_FINAL.srt` | 33 cues from `voice/words.json` (separate file; nothing burned into the picture) |
| `SCRIPT.md`, `SHOTS.md`, `research/RESEARCH.md` | written |
| `voice/voice.wav`, `voice/words.json`, `voice/script.txt` | Kokoro v1.0 (ONNX), voice `af_heart`, speed 1.25; word times from faster-whisper, re-mapped to the script and hand-checked |
| `audio/mix.wav`, `audio/stems/{voice,music,sfx}.wav`, `audio/cues.md` | synthesized SFX + original march score (template audio toolkit) |
| Source | `src/videos/babylon/` (bridge template + `city.ts`, `roles.ts`, new outfits in `toon.ts`), `scripts/`, `audio/babylon_audio.py` |

## IMPORTANT deviation from the skill's render settings (honest disclosure)
This cloud container has **no GPU**. Measured on the bridge template's own settings (1080×1920, MSAA 4, 4096 shadow
map, ink + lens blur + bloom + grade): **107 s per frame** with SwiftShader and **23 s per frame** with Mesa lavapipe
(Vulkan) — 13-60 hours for 2070 frames. To finish inside the 120-minute budget the final was rendered with a reduced
"lite" post set, chosen by measurement (2.3 s/frame):

| Setting | Skill / bridge | This render |
|---|---|---|
| WebGL buffer | 1440×2560 (`--scale 1.3333`) | **540×960**, upscaled once to 1440×2560 with ffmpeg lanczos |
| Ink pass, NEUTRAL tone map, grade | on | on (unchanged) |
| Lens blur (DOF) | on (~1/3 of shots) | **off** (the DOF table is still in `story.ts`; it renders on a GPU machine) |
| Bloom | on | **off** (only affects the golden sun disc) |
| MSAA | 4× | **off** |
| Shadow map | 4096 | **1024** |

Consequence: the file meets the 1440×2560 container spec, but the picture carries 540×960 of real detail — softer
edges and thicker-looking ink than the bridge reference, and no depth-of-field. Re-rendering at full quality needs only
`PROPS='{}' node scripts/render.mjs out.mp4 0 2069 1.3333` on a GPU machine (no code changes).

## Visual review against the reference frames (preview stills, `out/sbs_preview.jpg`)
- Character system: matches (bean heads, plum ink, stick limbs, dot hands, blinks, walk cycles, contact shadows).
  New outfits: Cyrus (crenellated gold crown, purple robe, beard), gatekeeper (bronze conical helmet, beard, spear),
  scout (felt cap, trousers, kid build), Persian/Babylonian crowds.
- Environment: ink outlines, two-tone lighting, painted brick/glazed textures, fog = horizon colour, golden preset for
  the Herodotus sequence. Weaker than the reference: simpler geometry and fewer props per frame, flatter ground
  textures, glazed-brick animals read as generic cartoon beasts at close range.
- Fixed before the final render (seen in preview rounds 1-3): fog washing out the aerials, gatekeeper hidden behind a
  gate tower, soldiers outside the narrow vertical frame (gate entry, digging), a palm frond in front of the Sippar
  lens, gate leaves opening outward, Cyrus blocked by a follower under the gate, the low wading camera facing away.

## Historical plausibility checks
- The record (day light) and Herodotus's story (golden light) are kept separate in picture and narration.
- No gate-opening mechanism is shown: the gate is simply open from the "entered Babylon" shot on.
- Narration says "about a century later" for Herodotus (the brief's "centuries later" is inaccurate for him).
- City walls are ochre brick; only the gates / processional way are blue glazed (as at the Ishtar Gate). The brief's
  "enormous blue walls" was not followed literally for that reason.

## Automated QA of the exported file
Note: the 167 MB MP4 is not committed (GitHub rejects files over 100 MB); it is delivered directly and stays at `projects/babylon/final/`.
Measured on the exported `final/babylon_short_FINAL.mp4` (full report: `final/qa_auto_report.md`):
- **Specs:** 1440×2560, 30 fps, 2070 frames, 69.000 s, H.264 High CRF 16 (167 MB) + AAC 48 kHz stereo.
- **Loudness:** −15.1 LUFS integrated, LRA 2.3 LU, true peak −1.5 dBTP; no silences ≥ 0.3 s.
- **Frames:** no black, no unplanned white, no frozen spans ≥ 12 f; held frames 0 %.
- **Pops:** only f278, 578, 806, 962, 1258 and 1446, which are exactly the planned hard cuts inside shots.
- **Defect found and fixed:** the first assembly used ffmpeg's concat *demuxer*, which duplicated 2 frames at the seam
  between the halves (f1035), so every cut after it was 67 ms late. Re-assembled with the concat *filter*;
  re-run QA confirms the cuts land on their frames.

## Whole-film visual inspection (`final/qa_overview.jpg`, every 18th frame, plus 35 QA contact sheets)
Works: hook aerial (walls, river, approaching army, push to the blue gate), gatekeeper MS, scout-vs-wall scale gag,
Cyrus in camp, the column march, the Opis rout seen from above, Sippar, soldiers entering through the open gate, Cyrus
on the causeway, the golden legend sequence (riverbank, plug bursting, wading under the arch, festival), the twist
"?" beat, Cyrus under the gate, the sunset aerial.

**Known weaknesses I did not fix** (found after the 90-minute feature freeze, when a re-render would take ~40 min):
1. Shot 2 opens (f248-277) on a low wide where the gatekeeper is too small to read before the cut to his MS.
2. Shot 5: the four-horse chariot on the wall top is very small in the wide, so the gag mostly depends on the
   scout's reaction close-up.
3. Shot 14 (river sinking): dim, violet-heavy frame; the drop in the water level and the scout are hard to read.
4. Shot 15b (≈f1446-1470): a wading soldier's card is too close to the lens and shows as a large cut-off shape at the
   left edge for about 1 s.
5. Shot 16b: a dancer's head is cropped at the frame edge.
6. All shots: no depth of field or bloom, and 540×960 real detail (see the render-settings section above).
   Environments are simpler and less detailed than the reference series.
