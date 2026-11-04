#!/bin/bash
# One command from an attached voice.mp3 to the delivered MP4 (run inside the episode folder):
#   analyze the narration (if voice.mp3 is newer than its analysis) -> mix -> render (resumable) -> encode -> QA
# Stops immediately if voice.mp3 is missing. Never generates a voice.
set -e
cd "$(dirname "$0")/.."
[ -f voice.mp3 ] || { echo "*** NARRATION MISSING: put the recorded narration at $(pwd)/voice.mp3 (production stops; no generated voice is used)"; exit 2; }
T0=$(date +%s)
if [ ! -f voice/warp.json ] || [ voice.mp3 -nt voice/warp.json ]; then python3 scripts/analyze_voice.py; fi
AUD=$(ls audio/*_audio.py | head -1)
python3 "$AUD"
node scripts/render.mjs
bash scripts/encode.sh
python3 scripts/qa.py "$(basename "$PWD")_$(python3 -c "import json;o=json.load(open('production.config.json'))['output'];print(f\"{o['width']}x{o['height']}\")").mp4" || true
echo "production wall time: $(( ($(date +%s) - T0) / 60 )) min"
