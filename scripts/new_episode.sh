#!/bin/bash
# Start a new episode from the standard starter: bash scripts/new_episode.sh <episode_name>
# Creates episodes/<episode_name>/ (refuses to overwrite) and installs the pinned dependencies.
set -e
cd "$(dirname "$0")/.."
NAME="$1"
[[ "$NAME" =~ ^[a-z0-9_-]+$ ]] || { echo "usage: bash scripts/new_episode.sh <episode_name>  (lowercase letters, digits, - or _)"; exit 1; }
[ -e "episodes/$NAME" ] && { echo "*** episodes/$NAME already exists: not overwriting"; exit 1; }
mkdir -p episodes
cp -r templates/episode "episodes/$NAME"
rm -rf "episodes/$NAME/node_modules" "episodes/$NAME/out"
cd "episodes/$NAME" && npm ci --no-audit --no-fund >/dev/null && python3 -c "import scipy, faster_whisper" 2>/dev/null || pip install -q scipy faster-whisper
echo "created episodes/$NAME"
echo "next: write SCRIPT.md for approval; then put the narration at episodes/$NAME/voice.mp3 and run: python3 scripts/analyze_voice.py"
