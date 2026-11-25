#!/bin/bash
P=~/pion/proj13; M=/home/user/shiny-enigma/projects/the_mona_lisa/src
until [ -f $P/final/film_fix.done ]; do sleep 20; done
cp $M/plans/film.js $P/plans/film.js
cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --from 4056 --to 4380 --jobs 3 > $P/out/film_fix2.log 2>&1 || exit 1
cd $M && python3 overlay_film.py > $P/final/film_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.0 -movflags +faststart $P/final/the_mona_lisa_heist.mp4
echo DONE > $P/final/film_fix2.done
