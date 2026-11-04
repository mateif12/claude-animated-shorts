#!/bin/bash
# Assemble the drawings (out/frames/chunk_*/ in frame order) at fps/drawEvery, output at fps (each drawing held
# drawEvery frames), native size (never upscaled), exact video length, muxed with audio/mix.wav (full-rate audio).
set -e
cd "$(dirname "$0")/.."
NAME=$(basename "$PWD")
read FPS N W H CRF <<< $(python3 -c "import json;p=json.load(open('production.config.json'));print(p['output']['fps'],p['drawEvery'],p['output']['width'],p['output']['height'],p['crf'])")
FRAMES=$(python3 -c "import json;print(json.load(open('out/render_meta.json'))['frames'])")
[ -f audio/mix.wav ] || { echo "*** audio/mix.wav missing: run the audio script first"; exit 2; }
mkdir -p out/seq && rm -f out/seq/*.jpeg
i=0
for d in $(ls -d out/frames/chunk_* | sort); do for f in $(ls $d/*.jpeg | sort); do ln -sf "$(realpath $f)" out/seq/$(printf "%05d" $i).jpeg; i=$((i+1)); done; done
NEED=$(( (FRAMES + N - 1) / N ))
[ $i -ge $NEED ] || { echo "*** only $i of $NEED drawings rendered: run node scripts/render.mjs again (it resumes)"; exit 2; }
DUR=$(python3 -c "print($FRAMES/$FPS)")
ffmpeg -y -v error -framerate $(python3 -c "print($FPS/$N)") -i out/seq/%05d.jpeg -i audio/mix.wav -map 0:v:0 -map 1:a:0 -r $FPS \
  -vf "scale=${W}:${H}:flags=lanczos" -c:v libx264 -crf $CRF -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -t $DUR \
  -movflags +faststart "${NAME}_${W}x${H}.mp4"
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,nb_frames:format=duration -of compact "${NAME}_${W}x${H}.mp4"
echo "wrote ${NAME}_${W}x${H}.mp4"
