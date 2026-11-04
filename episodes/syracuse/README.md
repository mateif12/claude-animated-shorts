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
npx remotion render src/index.ts SyracuseShort out/frames --sequence --image-format=jpeg --jpeg-quality=94 --scale=0.6666667 --props='{"post":{"dpr":0.6666667,"msaa":0,"bloom":false}}' --gl=swangle --concurrency=4 --timeout=300000
```
```bash
ffmpeg -framerate 30 -i out/frames/element-%04d.jpeg -i audio/mix.wav -vf "scale=1440:2560:flags=lanczos" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 256k -map 0:v:0 -map 1:a:0 -shortest out/syracuse_1440x2560.mp4
```

## Render note (CPU-only container)
This was produced in a cloud container with **no GPU**: three.js ran on SwiftShader. Measured costs:
- Full template post chain at 1080×1920: ~20 s/frame.
- Ink + grade at 720×1280: ~7.4 s/frame.

To finish in one session, the final was rendered at **720×1280 and upscaled ×2 (Lanczos) to the required 1440×2560**, with MSAA 0 and bloom off. Ink lines, two-tone shading, painted textures, lens blur on close-ups, grade and all camera work are kept.

On a GPU machine, render natively with `--scale 1.3333 --props='{"post":{"msaa":4}}'` (bloom is on by default) for the full-quality 2K master.
