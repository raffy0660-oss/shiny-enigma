#!/bin/bash
# Final assembly of "The Photograph": film frames -> Remotion data overlay -> mix -> 1080x1920 60 fps MP4 (+ sfx_only.wav)
# usage: bash assemble.sh <outdir>
set -e; P=~/pion/proj10; O=${1:-$P/final}; cd $P
python3 build_film.py --check | tail -1 | grep -q complete || { echo "frames missing"; python3 build_film.py --check; exit 1; }
python3 build_film.py
python3 overlay_film.py
python3 mix_film.py
ffmpeg -v error -y -i final/film_ov.mp4 -i final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -shortest -movflags +faststart "$O/the_photograph.mp4"
cp final/film_sfx_only.wav "$O/the_photograph_sfx_only.wav"
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of compact "$O/the_photograph.mp4"
