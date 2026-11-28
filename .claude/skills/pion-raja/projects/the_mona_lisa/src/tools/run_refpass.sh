#!/bin/bash
# reference pass: CCTV POV frames, post (grade, smash zooms, HUD), overlay (rings, time cards, zoom-blur cuts), mux
P=~/pion/proj13; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mona_lisa/src
cp $M/plans/film.js $P/plans/film.js
cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --from 1944 --to 2100 --jobs 3 > $P/out/refpass.log 2>&1 || exit 1
cd $M && python3 post_film.py > $P/final/post.log 2>&1 || exit 1
python3 overlay_film.py > $P/final/film_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.0 -movflags +faststart $P/final/the_mona_lisa_heist_v3.mp4
echo DONE > $P/final/refpass.done
