#!/bin/bash
# resume after the container restart: render only the missing frames, then captions + mux
P=~/pion/proj13; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mona_lisa/src
cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --jobs 3 --skip > $P/out/film_resume.log 2>&1 || exit 1
cd $M && python3 overlay_film.py > $P/final/film_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.0 -movflags +faststart $P/final/the_mona_lisa_heist.mp4
echo DONE > $P/final/film.done
