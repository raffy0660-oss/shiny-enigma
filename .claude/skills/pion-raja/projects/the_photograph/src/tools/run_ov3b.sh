cd ~/pion/proj10
S=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_photograph/src/overlay_film.py
python3 $S 924-1266 ov_b.mp4 > final/ov_b.log 2>&1
python3 $S 1267-3257 ov_c.mp4 > final/ov_c.log 2>&1
python3 $S 3258-4403 ov_d.mp4 > final/ov_d.log 2>&1
echo DONE > final/ov3b.done
