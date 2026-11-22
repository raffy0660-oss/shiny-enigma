#!/bin/bash
# resume.sh <seq> <mode> : render missing frames then overlay+assemble
SEQ=$1; MODE=$2; OUT=$3
cd ~/pion/proj9
miss=$(python3 -c "
import os;d='out/$SEQ';h=set(os.listdir(d)) if os.path.isdir(d) else set()
print(','.join(str(i) for i in range(1791) if '%05d.jpg'%i not in h))")
if [ -n "$miss" ]; then (cd scene && node render_scene.js clay ../out/$SEQ --mode $MODE --jobs 2 --frames $miss) > resume_$SEQ.log 2>&1 || exit 1; fi
SEQ=$SEQ python3 overlay.py > ov_$SEQ.log 2>&1 || exit 2
python3 assemble.py final/${SEQ}_ov.mp4 final/$OUT > asm_$SEQ.log 2>&1 || exit 3
ffmpeg -y -loglevel error -i final/$OUT -vf "fps=1/1.5,scale=270:-1,tile=6x5" -frames:v 1 final/sheet_$SEQ.jpg
echo DONE $SEQ
