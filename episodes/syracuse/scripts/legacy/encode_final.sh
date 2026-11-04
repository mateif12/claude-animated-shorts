#!/bin/bash
# Assemble the on-twos frames (out/final: frames 0..312, out/final2: frames 314..1988, every 2nd frame) at 15 fps,
# output 30 fps (each drawing held 2 frames), native 540x960 (no upscale), mux the final mix.
set -e
mkdir -p out/seq && rm -f out/seq/*.jpeg
i=0
for f in $(ls out/final/*.jpeg | sort) $(ls out/final2/*.jpeg | sort); do ln -sf "$(realpath $f)" out/seq/$(printf "%04d" $i).jpeg; i=$((i+1)); done
echo "$i drawings"
ffmpeg -y -v error -framerate 15 -i out/seq/%04d.jpeg -i audio/mix.wav -map 0:v:0 -map 1:a:0 -r 30 -c:v libx264 -crf 17 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 256k -t 66.3333 -movflags +faststart out/syracuse_540x960.mp4
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,nb_frames:format=duration -of compact out/syracuse_540x960.mp4
