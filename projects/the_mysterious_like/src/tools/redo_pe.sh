#!/bin/bash
P=~/pion/proj12; C=/home/user/shiny-enigma/projects/the_mysterious_like/src/cues; MV=/home/user/shiny-enigma/projects/the_photograph/src/tools/make_view.js
until [ -f $P/eng/redo_off.done ]; do sleep 20; done
cd $P; node $MV plans/film.js 2718 2779 0 eng/view_f_pEb.json 0 180
cd ~/pion/pion_raja; rm -rf $P/eng/pEb_frames
node react_render.js --audio ../proj12/audio/silence_long.wav --start 45.3 --dur 1.02 --cues $C/f_pE.txt --out ../proj12/eng/pEb --png --bg green --blur 6 --jobs 1 --size 1080x1920 --view ../proj12/eng/view_f_pEb.json > $P/eng/pEb.log 2>&1
echo DONE > $P/eng/redo_pe.done
