#!/bin/bash
# full film: engine segments (2 queues) -> scene frames -> captions -> mux
P=~/pion/proj13; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mona_lisa/src; C=$M/cues
cd ~/pion/pion_raja
R() { rm -rf $P/eng/$1_frames $P/eng/$1_track.json; node react_render.js --audio ../proj12/audio/silence_long.wav --start $2 --dur $3 --cues $C/$4.txt --out ../proj13/eng/$1 --png --bg green --blur 6 --jobs 2 --size 1080x1920 --view ../proj13/eng/view_$4.json > $P/eng/$1.log 2>&1; echo "$1 done" >> $P/eng/film_eng.log; }
rm -f $P/eng/film_eng.log
( R fO 5.6 5.2 f_O; R fG2 28.4 4.0 f_G2; R fC 49.2 10.2 f_C ) &
( R fG1 10.8 13.6 f_G1; R fS 32.4 16.8 f_S; R fK 67.6 5.4 f_K ) &
wait
cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --jobs 3 > $P/out/film.log 2>&1 || exit 1
cd $M && python3 overlay_film.py > $P/final/film_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.0 -movflags +faststart $P/final/the_mona_lisa_heist.mp4
echo DONE > $P/final/film.done
