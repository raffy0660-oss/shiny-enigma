#!/bin/bash
# 10 s sample: white 1 local 0.9-5.9 (video 5.5-10.5) + white 2 local 4.0-9.0 (video 29.0-34.0), with VO + SFX.
set -e
cd ~/pion/proj6
S=sample
ffmpeg -v error -y -ss 0.9 -t 5.0 -i final/w1.mp4 -an -vf "scale=1078:1920:flags=lanczos,fps=60" -c:v libx264 -crf 14 -preset medium $S/p1.mp4
ffmpeg -v error -y -t 5.0 -i $S/w2s.mp4 -an -vf "scale=1078:1920:flags=lanczos,fps=60" -c:v libx264 -crf 14 -preset medium $S/p2.mp4
# audio: VO + SFX for the same moments of the final timeline
ffmpeg -v error -y -ss 5.5 -t 5.0 -i src/vo.wav -ss 5.5 -t 5.0 -i sfx/sfx_only.wav \
  -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=longest:normalize=0[a]" -map "[a]" $S/a1.wav
ffmpeg -v error -y -ss 29.0 -t 5.0 -i src/vo.wav -ss 29.0 -t 5.0 -i sfx/sfx_only.wav \
  -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=longest:normalize=0[a]" -map "[a]" $S/a2.wav
ffmpeg -v error -y -i $S/p1.mp4 -i $S/p2.mp4 -i $S/a1.wav -i $S/a2.wav -filter_complex \
  "[0:v][1:v]xfade=transition=zoomin:duration=0.25:offset=4.75[v];[2:a][3:a]acrossfade=d=0.25[a0];[a0]alimiter=limit=0.95[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart $S/sampel_pion_10detik.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 $S/sampel_pion_10detik.mp4
