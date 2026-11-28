#!/bin/bash
P=~/pion/proj12; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mysterious_like/src; MV=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_photograph/src/tools/make_view.js
cd $P; mv_(){ node $MV plans/film.js $1 $2 $3 eng/view_f_$4.json ${5:-0} ${6:-55}; }
mv_ 0 643 1 pA; mv_ 0 643 0 vic -90; mv_ 642 1018 pion pO1 0 180; mv_ 1017 1327 0 pB; mv_ 1950 2263 pion pO2; mv_ 2451 2677 pion pO3 0 180; mv_ 2718 2779 0 pE 0 180; mv_ 2778 3157 0 pH 0 180; mv_ 3156 3241 0 pH2; mv_ 3477 3808 0 pH3
bash $P/run_film_eng.sh
rm -rf $P/out/film; cd $P/scene && node render_seq.js $P/plans/film.js $P/out/film --jobs 3 > $P/out/film.log 2>&1
cd $P && python3 $M/overlay_film.py > $P/final/film_ov.log 2>&1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 66.19 -movflags +faststart $P/final/the_mysterious_like.mp4
echo DONE > $P/final/film.done
