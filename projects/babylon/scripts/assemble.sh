#!/usr/bin/env bash
# Concat the two rendered halves (540x960 = the WebGL buffer of the software-GL render), upscale once to the 2K
# vertical spec (1440x2560, lanczos), H.264 High CRF 16, and mux the 48 kHz mix (Remotion's silent track dropped).
set -euo pipefail
cd "$(dirname "$0")/.."
# concat FILTER (frame-exact): the concat demuxer used container durations padded by Remotion's silent AAC track and
# duplicated 2 frames at the seam (found by short_qa.py: every cut after f1035 landed 2 frames late)
ffmpeg -y -v error -i out/final/partA.mp4 -i out/final/partB.mp4 -i audio/mix.wav \
  -filter_complex "[0:v:0][1:v:0]concat=n=2:v=1:a=0,scale=1440:2560:flags=lanczos,setsar=1[v]" -map "[v]" -map 2:a:0 \
  -c:v libx264 -preset medium -crf 16 -profile:v high -pix_fmt yuv420p -fps_mode passthrough \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -t 69.0 final/babylon_short_FINAL.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size -of compact final/babylon_short_FINAL.mp4
