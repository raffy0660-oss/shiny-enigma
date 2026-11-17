#!/bin/bash
set -e
cd ~/pion/proj7/scene
rm -rf ~/pion/proj7/out/w1 ~/pion/proj7/out/w2
node render_scene.js w1 ~/pion/proj7/out/w1 --jobs 3 > ~/pion/proj7/scene_w1.log 2>&1
node render_scene.js w2 ~/pion/proj7/out/w2 --jobs 3 > ~/pion/proj7/scene_w2.log 2>&1
cd ~/pion/proj7
python3 overlay.py w1 > ov_w1.log 2>&1
python3 overlay.py w2 > ov_w2.log 2>&1
python3 assemble.py final/w1.mp4 final/w2.mp4 sfx/sfx_only.wav final/pion_sphere_final.mp4 > asm.log 2>&1
echo ALLDONE >> asm.log
