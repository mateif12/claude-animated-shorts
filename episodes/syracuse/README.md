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
| `voice/` | `lines.txt` → `synth.py` (Piper TTS, `en_US-ryan-high`) → `voice.wav`. `words.py` (faster-whisper) → `words.json`. The voice model is not committed: download it into `voice/model/`. |
| `audio/syracuse_audio.py` | Original score + SFX event table + mix (reuses the template's `dsp.py`, `instruments.py`, `sfx_gen.py`). Writes `mix.wav`, stems and `cues.md`. |
| `scripts/stills.mjs` | Linux port of `bridge-stills.mjs` (SwiftShader GL, `DPR=` env for a smaller buffer). |

## Rebuild
```bash
npm install
```
```bash
cd voice && python3 synth.py 0.92 && ffmpeg -y -i voice_raw.wav -ar 48000 voice.wav && python3 words.py && cd ..
```
```bash
cd audio && python3 syracuse_audio.py && cd ..
```
```bash
node scripts/render_final.mjs out/final 0
```
```bash
./scripts/encode_final.sh
```
(`encode_final.sh` expects `out/final` and, if a render was resumed, `out/final2`. Edit the two directory names inside it if your render isn't split.)

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
