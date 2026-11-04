# Episode (from templates/episode)

Audio-first production: see `PRODUCTION_WORKFLOW.md` at the repository root.

1. Approve `SCRIPT.md`, then put the recorded narration at **`voice.mp3`** in this folder.
2. `python3 scripts/analyze_voice.py`: timing report in `voice/TIMING.md`.
3. Build `SHOTS.md`, `src/videos/episode/{story,world,cast}.ts` and `audio/episode_audio.py` on those timings.
4. `bash scripts/produce.sh`: mix, render (resumable), encode, QA, giving `<episode>_540x960.mp4`.
