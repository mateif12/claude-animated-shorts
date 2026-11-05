#!/bin/bash
# Splice: part1[0-281] + patch[282-412] + part2[413-534] + patchB[535-590] + part2[591-710] + part3[711-1065] (15 fps), double to 30 fps, upscale
# 608x1080 -> 1080x1920 (Lanczos), trim to 2131 frames (71.033 s) and mux the final mix (whole recording inside).
set -e
cd /root/snake/out/snake
OUT=/home/user/claude-animated-shorts/episodes/snake-mail/snake-mail-final.mp4
ffmpeg -v error -y -i part1.mp4 -i patch.mp4 -i part2.mp4 -i patchB.mp4 -i part3.mp4 -filter_complex \
 "[0:v]trim=end_frame=282,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[2:v]split[p2a][p2b];[p2a]trim=start_frame=57:end_frame=179,setpts=PTS-STARTPTS[c];[3:v]setpts=PTS-STARTPTS[d];[p2b]trim=start_frame=235,setpts=PTS-STARTPTS[e];[4:v]setpts=PTS-STARTPTS[g];[a][b][c][d][e][g]concat=n=6:v=1:a=0[j]" \
 -map "[j]" -r 15 -c:v libx264 -preset fast -crf 10 joined15.mp4
ffprobe -v error -count_frames -show_entries stream=nb_read_frames -of csv joined15.mp4
ffmpeg -v error -y -i joined15.mp4 -i /root/snake/audio/mix.wav \
  -filter_complex "[0:v]fps=30,scale=1080:1920:flags=lanczos,unsharp=5:5:0.35:5:5:0.0,setsar=1,format=yuv420p[v]" \
  -map "[v]" -map 1:a:0 -frames:v 2131 -c:v libx264 -preset fast -crf 17 -profile:v high -level 4.2 \
  -r 30 -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels:format=duration,size -of default=nw=1 "$OUT"
