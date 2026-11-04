#!/usr/bin/env bash
# v2 final: native 1080x1920 render (MSAA x4) + the existing 48 kHz mix. Remotion's silent track is dropped.
set -euo pipefail
cd "$(dirname "$0")"
ffmpeg -y -v error -i ../remotion/out/final/v2_1080_master.mp4 -i ../audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 15 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest \
  -metadata title="Rivers in the Sky: How the Romans Built Aqueducts (v2)" aqueduct_short_FINAL_1080x1920.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size -of compact aqueduct_short_FINAL_1080x1920.mp4
