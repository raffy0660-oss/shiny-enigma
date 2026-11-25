#!/bin/bash
P=~/pion/proj13; M=/home/user/shiny-enigma/projects/the_mona_lisa/src; C=$M/cues
cd ~/pion/pion_raja; rm -rf $P/eng/fG2_frames $P/eng/fG2_track.json
node react_render.js --audio ../proj12/audio/silence_long.wav --start 28.4 --dur 4.0 --cues $C/f_G2.txt --out ../proj13/eng/fG2 --png --bg green --blur 6 --jobs 3 --size 1080x1920 --view ../proj13/eng/view_f_G2.json > $P/eng/fG2.log 2>&1 || exit 1
for r in "648 744" "1464 1704" "1830 1944"; do set -- $r; cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --from $1 --to $2 --jobs 3 >> $P/out/rev3.log 2>&1 || exit 1; done
cd $M && python3 overlay_film.py > $P/final/film_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.0 -movflags +faststart $P/final/the_mona_lisa_heist.mp4
echo DONE > $P/final/rev3.done
