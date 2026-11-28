#!/bin/bash
# after the resumed render: apply the three shot fixes (walk hold, writing camera, CCTV reaction camera), overlay, mux
P=~/pion/proj13; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mona_lisa/src; C=$M/cues; MV=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_photograph/src/tools/make_view.js
until [ -f $P/final/film.done ]; do sleep 20; done
cp $M/plans/film.js $P/plans/film.js
cd $P && node $MV plans/film.js 648 1464 0 eng/view_f_G1.json 180 180 && node $MV plans/film.js 1704 1944 0 eng/view_f_G2.json 70 70 && node $MV plans/film.js 1944 2952 0 eng/view_f_S.json 180 180
cd ~/pion/pion_raja
R() { rm -rf $P/eng/$1_frames $P/eng/$1_track.json; node react_render.js --audio ../proj12/audio/silence_long.wav --start $2 --dur $3 --cues $C/$4.txt --out ../proj13/eng/$1 --png --bg green --blur 6 --jobs 2 --size 1080x1920 --view ../proj13/eng/view_$4.json > $P/eng/$1.log 2>&1; }
( R fG1 10.8 13.6 f_G1 ) & ( R fG2 28.4 4.0 f_G2; R fS 32.4 16.8 f_S ) & wait
for r in "808 960" "1830 1944" "2292 2346"; do set -- $r; cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --from $1 --to $2 --jobs 3 >> $P/out/film_fix.log 2>&1 || exit 1; done
cd $M && python3 overlay_film.py > $P/final/film_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.0 -movflags +faststart $P/final/the_mona_lisa_heist.mp4
echo DONE > $P/final/film_fix.done
