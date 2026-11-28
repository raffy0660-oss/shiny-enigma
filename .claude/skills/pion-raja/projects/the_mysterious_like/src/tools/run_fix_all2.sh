#!/bin/bash
# after the main pipeline: swap in re-done engine segments (hook hand pickup, his-phone hold, office cams/nod), re-render those ranges, overlay, mux
P=~/pion/proj12; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mysterious_like/src
until [ -f $P/final/film.done ] && [ -f $P/eng/redo_hp.done ] && [ -f $P/eng/redo_off.done ] && [ -f $P/eng/redo_pe.done ]; do sleep 30; done
cd $P/eng; rm -rf pA_frames pH2_frames; mv pA2_frames pA_frames; mv pH2b_frames pH2_frames; mv pA2_track.json pA_track.json; mv pH2b_track.json pH2_track.json; cp view_f_pA2.json view_f_pA.json; cp view_f_pH2b.json view_f_pH2.json
for s in pO1 pO2 pO3 pE; do rm -rf ${s}_frames; mv ${s}b_frames ${s}_frames; mv ${s}b_track.json ${s}_track.json; cp view_f_${s}b.json view_f_${s}.json; done
cd $P/scene
for r in "0 1018" "1950 2263" "2451 2677" "2718 2779" "3156 3241"; do set -- $r; node render_seq.js $P/plans/film.js $P/out/film --from $1 --to $2 --jobs 3 >> $P/out/fixall2.log 2>&1 || exit 1; done
cd $P && python3 $M/overlay_film.py > $P/final/film_ov.log 2>&1
ffmpeg -v error -y -i $P/final/film_ov.mp4 -i $P/final/film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 66.19 -movflags +faststart $P/final/the_mysterious_like.mp4
echo DONE > $P/final/fixhp.done
