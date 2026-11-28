#!/bin/bash
# office re-do: new laptop/typing cameras + less nod -> new views, engine segments pO1b/pO2b/pO3b
P=~/pion/proj12; C=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mysterious_like/src/cues; MV=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_photograph/src/tools/make_view.js
cd $P; node $MV plans/film.js 642 1018 pion eng/view_f_pO1b.json 0 180; node $MV plans/film.js 1950 2263 pion eng/view_f_pO2b.json 0 55; node $MV plans/film.js 2451 2677 pion eng/view_f_pO3b.json 0 180
cd ~/pion/pion_raja
R() { rm -rf $P/eng/$1_frames; node react_render.js --audio ../proj12/audio/silence_long.wav --start $2 --dur $3 --cues $C/f_$4.txt --out ../proj12/eng/$1 --png --bg green --blur 6 --jobs 1 --size 1080x1920 --view ../proj12/eng/view_f_$1.json > $P/eng/$1.log 2>&1; }
R pO1b 10.7 6.27 pO1; R pO2b 32.5 5.22 pO2; R pO3b 40.85 3.77 pO3
echo DONE > $P/eng/redo_off.done
