#!/bin/bash
set -e
cd ~/pion/proj7/scene
rm -rf ~/pion/proj7/out/w2_fix
node render_scene.js w2 ~/pion/proj7/out/w2_fix --from 290 --jobs 3 > ~/pion/proj7/fix_w2.log 2>&1
cd ~/pion/proj7
python3 - <<'PY'
import json, os, shutil
a = json.load(open('out/w2/pts.json')); b = json.load(open('out/w2_fix/pts.json')); a.update(b)
for f in os.listdir('out/w2_fix'):
    if f.endswith('.jpg'): shutil.copy(os.path.join('out/w2_fix', f), os.path.join('out/w2', f))
json.dump(a, open('out/w2/pts.json', 'w'))
PY
rm -rf pub_w2
python3 overlay.py w2 > ov_w2.log 2>&1
python3 assemble.py final/w1.mp4 final/w2.mp4 sfx/sfx_only.wav final/pion_sphere_final.mp4 > asm.log 2>&1
echo FIXDONE >> asm.log
