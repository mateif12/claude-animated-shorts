#!/usr/bin/env bash
# Final export: mux the Remotion picture (h264 CRF 12 intermediate) with the 48 kHz mix and encode the delivery file.
# Remotion writes a silent audio track, so map video from input 0 and audio from input 1 only (skill gotcha).
set -euo pipefail
cd "$(dirname "$0")"
ffmpeg -y -v error -i ../remotion/out/final/video_noaudio.mp4 -i ../audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest \
  -metadata title="Rivers in the Sky: How the Romans Built Aqueducts" aqueduct_short_720x1280.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels:format=duration,size -of compact aqueduct_short_720x1280.mp4
