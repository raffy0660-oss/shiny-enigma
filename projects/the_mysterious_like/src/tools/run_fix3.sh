#!/bin/bash
# after run_fix_all2: swap in the phone-grip engine segments, re-render hook + his-phone ranges, overlay, mux
P=~/pion/proj12; M=/home/user/shiny-enigma/projects/the_mysterious_like/src
until [ -f $P/final/fixhp.done ] && [ -f $P/eng/redo_hp2.done ]; do sleep 30; done
cd $P/eng; for s in pA:pA3 pH2:pH2c; do a=${s%%:*}; b=${s##*:}; rm -rf ${a}_frames; mv ${b}_frames ${a}_frames; mv ${b}_track.json ${a}_track.json; done
cd $P/scene
for r in "0 643" "3156 3241"; do set -- $r; node render_seq.js $P/plans/film.js $P/out/film --from $1 --to $2 --jobs 3 >> $P/out/fix3.log 2>&1 || exit 1; done
cd $P && python3 $M/overlay_film.py > $P/final/film_ov.log 2>&1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 66.19 -movflags +faststart $P/final/the_mysterious_like.mp4
echo DONE > $P/final/fix3.done
