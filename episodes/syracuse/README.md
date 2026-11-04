# Episode: "The One Guy Who Made Rome Look Stupid"

Archimedes vs. the Roman fleet at Syracuse (214–212 BC). A 66.3 s vertical cartoon short made with this repo's
`cartoon-3d-short` skill. It is built from `templates/bridge/` and uses the same look, post chain, character system and
sound modules.

| File | What |
|---|---|
| `RESEARCH.md` | Sources. Separates documented events from later traditions and comic staging. |
| `SCRIPT.md` | Final English narration (207 words). |
| `SHOTS.md` | Storyboard: every shot with frame ranges, word anchors and the joke it carries, plus the comedy review. |
| `src/videos/syracuse/` | Remotion + three.js source. `story.ts` (timeline, physics, cameras, DOF, kicks), `world.ts` (sea wall, town, temple, galleys, claw crane, catapults, sambuca, beach camp), `cast.ts` (who is where, per shot), `toon.ts` (template characters + Archimedes, Marcellus, Lucius, Roman helmets, plume, beard, shield, props). The other files are unchanged from the template, except `Bridge.tsx` (render-budget switches). |
| `voice/` | `story_words.json` (the clock the animation was designed on), `warp.json` (story → your recording), `TIMING.md`; `legacy_tts/` holds the retired placeholder-voice scripts. |
| `audio/syracuse_audio.py` | Original score + SFX event table + mix (reuses the template's `dsp.py`, `instruments.py`, `sfx_gen.py`). Writes `mix.wav`, stems and `cues.md`. |
| `scripts/` | Standard workflow scripts: `analyze_voice.py`, `render.mjs`, `encode.sh`, `qa.py`, `stills.mjs`, `produce.sh`. `production.config.json` holds the profile. |

## Narration: audio-first (since 2026-11-04)
The approved video used a generated placeholder voice. From now on the narration is **your recording**. Put it at:

**`episodes/syracuse/voice.mp3`**

(record the ```narration block in `SCRIPT.md`). Then, inside `episodes/syracuse/`:
```bash
python3 scripts/analyze_voice.py
```
This aligns your recording to the timing the animation was designed on (`voice/story_words.json`) and writes `voice/warp.json`
plus a report in `voice/TIMING.md`. Read its deviation list before rendering.
```bash
bash scripts/produce.sh
```
This runs mix → render (resumable) → encode → QA and writes a new `syracuse_540x960.mp4` (the approved placeholder version stays in git history).
Animation, music and SFX follow your voice through `src/videos/syracuse/timewarp.ts` and `W()` in `audio/syracuse_audio.py`.
Without `voice.mp3` every step stops with `NARRATION MISSING`. The retired placeholder TTS scripts are in `voice/legacy_tts/` and
`scripts/legacy/`; do not use them. See `PRODUCTION_WORKFLOW.md` at the repo root for the full workflow.

## Render note (CPU-only container): what the delivered file actually is
`syracuse_540x960.mp4` was rendered in a cloud container **without a GPU** (three.js on SwiftShader) under a hard
2-hour production limit. It is **native 540x960, not upscaled and not 2K**:
- **Resolution:** a 540x960 render buffer.
- **Timing:** animated **on twos**. 995 drawings, each held for 2 frames, encoded at 30 fps, so camera glides step at 15 per second.
- **Kept:** ink outlines, two-tone shading, painted textures, the colour grade, all characters, cameras, kicks and timing.
- **Turned off:** lens blur (depth of field), bloom (lantern and sun glow) and MSAA.

Measured cost: about 3–4.7 s per drawing in this configuration, 70 minutes in total. The full template look at 1080x1920 costs about 20 s per frame here.

To make the 2K master on a GPU machine, render all 1990 frames natively:
```bash
npx remotion render src/index.ts SyracuseShort out/video.mp4 --codec h264 --crf 16 --scale 1.3333
```
Then mux `audio/mix.wav` with `-map 0:v:0 -map 1:a:0`. Use `scripts/render_final.mjs` plus `scripts/encode_final.sh` only for the CPU path.
