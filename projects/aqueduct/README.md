# Rivers in the Sky: How the Romans Built Aqueducts

An original 58.5 s vertical animated short (720x1280, 30 fps), made with the `cartoon-3d-short` skill in this repository (three.js inside Remotion, ink outlines, painted textures, the skill's character design, synthesized sound). It uses a speed-optimised hybrid render path (see below).

## Deliverables
| Path | What |
|---|---|
| `final/aqueduct_short_720x1280.mp4` | Final video (H.264 + AAC 48 kHz), 58.5 s |
| `final/subtitles.srt` | Timed English subtitles (kept off the picture, per the skill's no-captions rule) |
| `final/export.sh` | FFmpeg mux + final encode |
| `script/SCRIPT.md` | Narration script with fact references |
| `research/RESEARCH.md` | Historical research, sources, and what was checked but not used |
| `storyboard/SHOTS.md` | Shot plan / storyboard |
| `voice/` | `voice.wav` (Kokoro v1.0, `am_michael`), `words.json` (Whisper word timings), TTS and timing scripts |
| `audio/` | `aq_audio.py` (SFX + original score + mix), `mix.wav`, stems, `cues.md` (cue sheet + loudness report) |
| `remotion/` | Project source: `src/videos/aqueduct/*` (story, world, overlay, composition, plus the skill's shade/ink/grade/paint/toon modules) |
| `qa/` | Frame-by-frame QA report, contact sheets, render benchmark notes |

## Rebuild
```bash
cd remotion && npm install
npx remotion render src/index.ts AqueductShort out/final/video_noaudio.mp4 --gl=swangle --concurrency=2 --codec=h264 --crf=12
cd ../audio && python3 aq_audio.py
cd ../final && ./export.sh
```
In this container, Chromium is the preinstalled headless shell: add `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/<dir>/chrome-headless-shell`.

## Render path (speed-optimised)
Measured on this machine (4 vCPU, no GPU, SwiftShader WebGL):
| Pipeline | Resolution | Speed |
|---|---|---|
| Skill template as shipped (ink + DOF + bloom + grade, MSAA 4, 4K shadows, 3D character cards) | 1080x1920 | ~10.5 s/frame |
| Template, light post | 720x1280 | >4 s/frame |
| **This film:** 3D world with ink + tone map + grade (no DOF, no bloom, no MSAA, 1K shadows); characters and effects drawn on a 2D overlay with the same camera projection | 720x1280 | **~0.53 s/frame** (2 workers) |
