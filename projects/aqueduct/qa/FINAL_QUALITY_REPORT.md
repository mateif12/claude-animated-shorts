# Final quality report: v2 (`final/aqueduct_short_FINAL_1080x1920.mp4`)
Built under the 120-minute budget (14:13:52 → 15:20 UTC, ≈66 min). The v1 video (`final/aqueduct_short_720x1280.mp4`) and its source (git history) are preserved.

## Specs (measured)
1080×1920 native render (MSAA ×4), 30 fps, 1,755 frames, 58.500 s, H.264 High CRF 17 (from a CRF 12 master), AAC 256 kb/s 48 kHz, 76 MB. Loudness −14.0 LUFS, true peak −1.3 dBFS. Frame QA (`qa/short_qa.py`, every frame): no black, unplanned white, frozen or popping frames.

## v1 problems → v2 status
| v1 problem (`qa/VISUAL_AUDIT.md`) | v2 |
|---|---|
| Sticker characters, wrong tool use, inconsistent scale | **Removed.** Shots now rely on architecture, tools and instruments, which cannot be badly integrated |
| Spring at the same height as the city, flat channel | Channel falls 0.25 % toward the city (spring ≈1.4 m higher); the water flows east, downstream |
| Treadwheel standing alone; floating ledge | One machine: wheel between the A-frame feet, rope from axle → jib pulley → lewis → load; the jib luffs to set the keystone; ledge fixed |
| Pyramid-roof temple, funnel fountain | Gable roof with a triangular pediment, column bases and capitals, front steps; Pompeii-type stone basin with a spout pillar, lead pipe and 3D jet |
| 2D cartoon water arcs and splash sprites | Removed; 3D spout from the spring rock, 3D fountain jet, flowing channel shader |
| Navy golden valley, neon grass, cone mountains | Warmer golden light (higher sun), lower world saturation, rugged mountains |
| 720p, no AA | Native 1080×1920, MSAA ×4 |
| Unclear shots | City aerial for "a million people"; groma with ranging poles in a straight line (arcade hidden: surveying comes first); tunnel portal with the shafts above; raw stone vs fresh pink lining with trowel, mortar tub and pottery shards; camera looks *into* the channel at the water front |

## Full-film inspection (one frame every 0.5 s: `qa/v2/overview_1.jpg`, `overview_2.jpg`)
Continuity, cuts and the flash are clean; the keystone is set on the rope (thud at 40.7 s, on "hold"); the fountain starts on "fountains" (49.5 s). The narration, music and SFX are unchanged from v1, so the timing to words is unchanged.

## Known limitations (not fixed within the budget)
- No people on screen. Crowd, cheering and mallet sounds remain as off-screen ambience.
- The chorobates close-ups (16–19 s) are plain compositions; the tunnel shot shows shafts and a portal, not a cutaway.
- The river under the arcade reads as a short bright strip in the aerials.
- The channel is shown open (real ones were roofed with slabs), and the gradient is exaggerated ×7 vs Nîmes so it can exist at all in a 570 m model. Both are noted in `research/RESEARCH.md`.
