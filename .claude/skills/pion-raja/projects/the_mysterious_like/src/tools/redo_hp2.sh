#!/bin/bash
# phone gripped at its lower end (engine change): re-do the hook pickup (pA) and his-phone hold (pH2) -> pA3 / pH2c
P=~/pion/proj12; C=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mysterious_like/src/cues
cd ~/pion/pion_raja; rm -rf $P/eng/pA3_frames $P/eng/pH2c_frames
node react_render.js --audio ../proj12/audio/silence_long.wav --start 0 --dur 10.72 --cues $C/f_pA.txt --out ../proj12/eng/pA3 --png --bg green --blur 6 --jobs 2 --size 1080x1920 --view ../proj12/eng/view_f_pA.json > $P/eng/pA3.log 2>&1
node react_render.js --audio ../proj12/audio/silence_long.wav --start 52.6 --dur 1.42 --cues $C/f_pH2.txt --out ../proj12/eng/pH2c --png --bg green --blur 6 --jobs 2 --size 1080x1920 --view ../proj12/eng/view_f_pH2.json > $P/eng/pH2c.log 2>&1
echo DONE > $P/eng/redo_hp2.done
