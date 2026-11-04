# Production workflow: cartoon-3d-short series

The standard way every episode of this series is made. Proven on **Syracuse, "The One Guy Who Made Rome Look Stupid"**
(approved 2026-11-04, `episodes/syracuse/`), which is the quality benchmark. The look comes from the bridge reference
(`templates/bridge/`, `SKILL.md`, `references/`), and that stays the style source.

**Key principle: you provide the voice; we create the story, animation, visuals, music and sound design around it.**
No narration is ever generated (no Piper, no TTS, no voice cloning) unless you explicitly ask for it.

---

## 1. The two phases

### Phase A: before recording (no animation yet)
1. **You give a topic.**
2. **Research** (see `RESEARCH.md` template). Every claim is marked documented / disputed / legend / comic exaggeration, with sources.
   If a source site is blocked in the session, say so in RESEARCH.md.
3. **Concept and script**: an entertaining, character-driven, historically grounded story. The script is written to be spoken aloud.
4. **Script delivery for approval**. It goes in `episodes/<name>/SCRIPT.md` and is posted in chat, containing:
   - episode title
   - complete English narration (in a ```narration block, one beat per line, `[pause]` = comic beat)
   - approximate duration (about 3.2 words/s plus pauses; target 55–70 s)
   - character list (personality and running joke for each)
   - a short description of the visual story (hook image, escalation, punchline)
5. **You approve the script, then record or generate the voice externally** and attach it as **`episodes/<name>/voice.mp3`**.

Nothing is animated or rendered before the script is approved **and** `voice.mp3` is present.

### Phase B: production, 120 minutes maximum (starts when the MP3 is attached)
| Step | Budget | What happens |
|---|---|---|
| Narration analysis + storyboard | 15 min | `analyze_voice.py`, then build `SHOTS.md` on the real word and pause timings |
| Scene preparation | 15 min | set, props, characters, camera keys |
| Animation and implementation | 20 min | story.ts / world.ts / cast.ts, audio event table; stills of new framings only |
| Final render + encode | 60 min | one resumable render with the production profile, then encode |
| QA + delivery | 10 min | `qa.py`, contact sheets, sync spot-checks, deliver the MP4 |

Research and the script (Phase A) are done before the MP3 exists. Your recording time is not counted.
These are maximum allocations. If the render is too slow, technical settings are reduced **before** any joke, scene or animation is cut
(section 7). No preview videos, no experimental renders, no repeated full renders.

---

## 2. Commands

```bash
bash scripts/new_episode.sh <episode_name>
```
This creates `episodes/<episode_name>/` from `templates/episode/` (it never overwrites an existing episode) and installs the pinned dependencies.

After `voice.mp3` is attached, everything runs inside the episode folder:
```bash
cd episodes/<episode_name>
```
```bash
python3 scripts/analyze_voice.py
```
This analyzes the narration and writes `voice/TIMING.md`, `words.json`, `lines.json`, `warp.json` and `voice.wav`.
```bash
bash scripts/produce.sh
```
That one command runs mix → render (resumable) → encode → QA and writes `<episode_name>_540x960.mp4`. It stops if `voice.mp3` is missing.

The individual steps (`produce.sh` runs them in this order):
```bash
python3 audio/episode_audio.py
```
```bash
node scripts/render.mjs
```
```bash
bash scripts/encode.sh
```
```bash
python3 scripts/qa.py <episode_name>_540x960.mp4
```
Look-check stills (new or changed framings only, video-timeline frame numbers):
```bash
node scripts/stills.mjs out/stills/x_ 120,640,1500
```
Type check:
```bash
npx tsc --noEmit -p .
```
The only errors you should see are the template's known JSX `Element | null` warnings in `Episode.tsx` / `Bridge.tsx`; anything else is a real error.

The Syracuse episode uses the same scripts (its audio script is `audio/syracuse_audio.py`; `npm run produce` works too).

---

## 3. Narration input convention

| Item | Location |
|---|---|
| Your recording (authoritative) | `episodes/<name>/voice.mp3` |
| Decoded copy used by the mix | `episodes/<name>/voice/voice.wav` (48 kHz, 24-bit, same length, no tempo/pitch change) |
| Timing report | `episodes/<name>/voice/TIMING.md` |
| Word timings | `episodes/<name>/voice/words.json` |
| Script lines → start/end | `episodes/<name>/voice/lines.json` |
| Story → voice time map + video length | `episodes/<name>/voice/warp.json` |

Rules for the supplied MP3:
- It is the authoritative narration. It is never rewritten, replaced, regenerated, trimmed, sped up, slowed down, pitch-shifted or denoised.
  The only processing is a level change in the final master.
- Speech recognition (faster-whisper `small.en`, CPU) is used **only to locate the words in time**. Where the recording differs from SCRIPT.md,
  the recording wins: `TIMING.md` lists every deviation so the picture can follow what was actually said.
- If `voice.mp3` is missing, `analyze_voice.py`, the audio script, `render.mjs` and `produce.sh` all stop with
  `NARRATION MISSING`. Production pauses and you are asked for the file. No generated speech is substituted.
- Put `voice.mp3` in git only if you want it versioned. Rendered frames, WAVs and `out/` are ignored.

### How the timing is analyzed (`scripts/analyze_voice.py`)
1. `ffprobe`: source duration, sample rate, channels and bit rate. `ffmpeg` decodes to `voice/voice.wav`, which must match the source duration.
2. `ebur128`: integrated loudness and peak (the master normalizes, so the voice is never clipped).
3. `silencedetect` (−38 dB, ≥ 0.25 s) gives every pause, listed with frame numbers. **Comic beats and visual reactions go in these pauses.**
4. Word timestamps give `words.json`. Script lines are matched to the recording by word-sequence alignment, giving `lines.json` (start/end per line).
5. **Video length** = last spoken word + tag. The tag is the story's own tail, else 1.0 s; override it with `--tag`.

### How scene timing is synchronized
- **New episodes:** the storyboard is written on the recording. Every frame number in `SHOTS.md` / `story.ts` comes from `TIMING.md` / `words.json`
  (frame = seconds × 30). Reactions land **0–3 frames before** their word, impacts land on the stressed syllable, and pauses carry the visual punchline.
  `warp.json` is the identity.
- **Re-recorded or replaced narration (e.g. Syracuse):** keep the animation's original clock in `voice/story_words.json` (+ `story_meta.json`).
  `analyze_voice.py` aligns those words to the new recording and writes monotonic anchors (story seconds ↔ voice seconds) to `warp.json`.
  - **Picture:** `src/videos/*/timewarp.ts` (`useStoryFrame()`) shows, at every video frame, the story frame that belongs to that moment of the voice.
    Between anchors the mapping is linear, so each action keeps its word and pauses stretch or shrink with the performance.
  - **Sound:** the audio script places every SFX and music cue through the same map (`W(t)`).
  - **Check before rendering:** read the deviations in `TIMING.md`. A changed line can need a small manual fix to the action on that line.

---

## 4. Standard production profile (`production.config.json`)

| Setting | Value | Why |
|---|---|---|
| Native output | **540×960** (composition 1080×1920 × scale 0.5) | the only size that renders in budget on the CPU-only container. Never upscaled and presented as more |
| Playback | **30 fps** | |
| Animation | **on twos**: every 2nd frame rendered (15 drawings/s), each held 2 frames | halves the render. Camera glides step at 15/s |
| Audio | full-rate 48 kHz stereo, exact video length, never slowed, stretched or duplicated | |
| Kept | ink outlines (InkPass), two-tone shading, painted HD textures, colour grade + NEUTRAL tone map, sky/fog/clouds, sea shader, character cards with card lighting, blinks, kicks, crossfades, flash | the series identity |
| Off | depth of field (`lens:false`), bloom, MSAA (`msaa:0`), grain | cost about 60 % of the frame time on SwiftShader |
| Shadows | sun shadow map **1024²** (world.ts) | was 4096 on the bridge |
| Character canvases | **720×1200** close (< 6 m), **420×700** mid (< 14 m), **240×400** far (cast.ts `tier()`) | was up to 1800×3000 |
| GL | SwiftShader (`swangle`), concurrency 4 | no GPU in the cloud container |
| Encode | x264 CRF 17, yuv420p, AAC 256 kb/s, faststart | |

On a GPU machine the same project can be rendered as a native 2K master (full look: DOF, bloom, MSAA 4):
```bash
npx remotion render src/index.ts <Composition> out/master.mp4 --codec h264 --crf 16 --scale 1.3333
```
Then mux `audio/mix.wav` with `-map 0:v:0 -map 1:a:0`.

---

## 5. Audio: music and sound effects around the supplied voice

All settings are in `production.config.json` → `audio`, applied by `audio/episode_audio.py` (and `syracuse_audio.py`):
- **Voice**: unchanged (gain only, in the master).
- **Music**: original score per episode from the template's instruments (brass fanfare/march, lyre, pizzicato, snare rolls, timpani…).
  - Level: a bed **10 LU below the voice**.
  - Ducking: **5 dB under every word** (from `words.json`), **10 dB** under the hook line and the punchline (`DEEP` windows).
  - Big musical hits go in the pauses **after** a punchline, never on top of it (Syracuse: the fanfare starts after "…by doing math.").
- **SFX**: synthesized event table locked to story times (slide whistles, boings, thunks, splashes, crashes, creaks, crowd vox…).
  - Level: a bed **9 LU below the voice**, ducked **5 dB under words**, so impacts still land on their word without masking it.
- **Master**: **−15 LUFS** integrated, sample peak **−2 dBFS** (true peak ≈ −1.9 dBTP), 0.25 s fade-out, exact length.
- **Comedic pauses**: keep them nearly silent (music ≤ −35 dBFS) when the joke is a dry beat. Put the visual reaction or a single SFX there.
- **Measured clarity check** (QA): each word's voice-to-background ratio from the stems must stay above 0 dB, with key punch words ≥ +4 dB
  (Syracuse: hook words were at −5 dB before the fix).

---

## 6. Estimating render time before committing

Measured on this container (4 vCPU, no GPU, SwiftShader):

| Configuration | s per rendered frame |
|---|---|
| Full bridge look, 1080×1920, MSAA 4 | ~20 |
| Ink + grade, 720×1280 | ~7.4 (in practice ~10 on full scenes) |
| No post at all, 720×1280 | ~4.3 |
| **Production profile, 540×960** | **3.0 (open sea) to 4.7 (wall walk / town)**, Syracuse average ~4.2 |

```
drawings = video_frames / 2
render_minutes ≈ 3 (bundle + browser start) + drawings × 4.2 / 60
```
Examples: a 60 s video (1800 frames → 900 drawings) takes ~66 min; a 55 s video ~61 min; Syracuse (66.3 s, 995 drawings) took 70 min.
**So 60 minutes of render covers about 54 s of video at Syracuse's complexity.** Lighter sets (open sea, few props, few characters) go faster
and dense towns go slower. Compute this right after `analyze_voice.py` (TIMING.md gives the frames) and adjust the plan **before** implementing.

During the render, `render.mjs` prints the measured s/drawing and the ETA every 25 drawings, and flags a projection over the render budget.

## 7. If the render is projected to exceed the budget
Decide at the first ETA lines (drawing 25–50). Order of measures. Story, jokes and scenes are never the first thing cut:
1. **Pure performance, no visual change.** You can stop (Ctrl-C) and resume: `render.mjs` continues from the last drawing.
   - Close anything else using CPU.
   - Check that no stale `chrome-headless-shell` processes from an earlier render are running. Kill them by PID, never with a
     `pkill -f` pattern that matches your own shell's command line.
2. **Cheaper geometry in the heaviest shots.**
   - Fewer far props (merlons, houses outside the frame), smaller crowds of far extras.
   - Turn off `castShadow` on far objects, or use shadow map 512.
   - These change little on screen at 540×960.
3. **Smaller character canvases for far characters** (tier < 14 m → 300×500).
4. **Shorten dead time, not jokes.**
   - Trim the silent tag to 0.6 s.
   - Remove a purely decorative establishing hold.
5. Only if still over: **re-plan before implementation** (simpler sets for one or two scenes). Never ship an upscaled or lower-frame-rate file without saying so.

Settings that change the look (for example post toggles) must not change in the middle of a render: restart from 0 if they do.

---

## 8. Frame inspection and final QA

**During the render (no extra renders):** finished drawings sit in `out/frames/chunk_*/` (file index × 2 + chunk start = frame).
Inspect the hook, each punchline frame from SHOTS.md and every new framing as soon as they exist:
```bash
python3 -c "from PIL import Image; import glob; fs=sorted(glob.glob('out/frames/chunk_*/*.jpeg'))[::40]; S=Image.new('RGB',(135*len(fs),240)); [S.paste(Image.open(f).resize((135,240)),(i*135,0)) for i,f in enumerate(fs)]; S.save('out/strip.jpg')"
```
Look for:
- blank or near-uniform frames (camera inside a prop)
- characters out of frame or hidden by geometry
- floating feet (feet must touch deck, ground or wall walk; contact shadow visible)
- wrong light (golden shots: sun from in front of the set, az 120–160 or −140; backlit sets go purple)
- unreadable jokes

**After encoding:** run `python3 scripts/qa.py <name>_540x960.mp4`. It writes `out/qa/report.md` and 2 s contact sheets, and fails on:
- wrong size or length
- missing audio
- loudness off −15 ±1 LUFS, or peak > −1 dBFS
- black frames, or blank frames (std < 0.035)

It also lists drawing-to-drawing pops (cuts are expected; flicker is not). Then:
- open 3–4 contact sheets around the punchlines;
- check sync: an action frame from SHOTS.md must match its word in `voice/words.json` within 3 frames;
- check the stem clarity of the punch words (section 5).

---

## 9. Hard-won rules (from the bridge and Syracuse productions)
- **Camera clearance:** hook and establishing shots go **high and wide, clear of every moving prop**. Syracuse's first hook flew through a
  galley's sail and rendered a blank frame. qa.py now flags near-uniform frames.
- **Golden light:** set `sunAz` so the sun is in front of the set (camera-relative az 120–160 or −140). Backlit sets read purple.
- **Characters touch the world:** deck or ground heights must match the card feet. Use contact shadows (`blob`) and props in the hands
  (shield, compass, helmet). Characters interact with props physically (cling, slide, fall, pour). Never a sticker.
- **Readability at 540×960:** a key character needs ≥ ~15 % of the frame height in the shot that carries the joke. Use an insert
  (foreground character + background event, as in Syracuse's Archimedes-and-hanging-ship shot) rather than a speck in a wide shot.
- **Crossfades:** the episode root's effect cleanup must guard `ink.dispose` (Syracuse render crashed at the first crossfade without it).
- **Remotion:** `--scale` values must give even pixel sizes for H.264. The profile renders a JPEG sequence and encodes with ffmpeg.
- **Never commit** voice models, WAVs or rendered frames (`.gitignore`). Large files (> 100 MB) break the push.
- **Story times live in story.ts and cast.ts**, and the audio event table mirrors them. Any timing change means re-running the audio script.

---

## 10. Checklist for every episode

**Phase A (before recording)**
- [ ] `bash scripts/new_episode.sh <name>`
- [ ] RESEARCH.md: claims table, disputed items excluded or flagged, sources (and which were readable)
- [ ] SCRIPT.md: title, narration block, duration, characters, visual story → posted in chat for approval
- [ ] Approved, then `voice.mp3` attached at `episodes/<name>/voice.mp3`

**Phase B (≤ 120 min from here)** — start a clock
- [ ] `python3 scripts/analyze_voice.py`: read TIMING.md (length, pauses, deviations), compute the render estimate (section 6)
- [ ] SHOTS.md on real timings: hook (first 3 s), escalation, punchline image, running jokes; comedy review answered
- [ ] Implementation (`story.ts`, `world.ts`, `cast.ts`, audio event table). `npx tsc --noEmit -p .`
- [ ] Stills of new or changed framings only (`node scripts/stills.mjs …`)
- [ ] `bash scripts/produce.sh`: watch the ETA lines and inspect frames as they land
- [ ] qa.py PASS, punchline sheets checked, sync spot-checks, punch-word clarity
- [ ] Deliver `<name>_540x960.mp4` with an honest report (resolution, on twos, what was cut, what to listen for), then commit and push

---

## Files of the system
| Path | Role |
|---|---|
| `templates/episode/` | the episode starter (production profile, engine, scripts, document templates) |
| `templates/episode/production.config.json` | the standard profile (render, audio, budget) |
| `templates/episode/src/videos/episode/` | engine: `Episode.tsx` (post chain + toggles), `timewarp.ts`, `ink/lensblur/grade/shade/cardshade/lights/paint/build.ts` (bridge look), `toon.ts` (character library incl. Syracuse additions), and starters for `story.ts` / `world.ts` / `cast.ts` |
| `templates/episode/scripts/` | `analyze_voice.py`, `render.mjs`, `encode.sh`, `qa.py`, `stills.mjs`, `produce.sh` (+ bridge helpers) |
| `templates/episode/audio/` | `episode_audio.py` (mix around the voice) + synth modules `dsp.py`, `instruments.py`, `sfx_gen.py` |
| `scripts/new_episode.sh` | creates `episodes/<name>/` from the starter |
| `templates/bridge/`, `references/`, `SKILL.md` | the visual reference and style rules (unchanged) |
| `episodes/syracuse/` | the benchmark episode, audio-first ready (`voice.mp3` goes in its folder) |
