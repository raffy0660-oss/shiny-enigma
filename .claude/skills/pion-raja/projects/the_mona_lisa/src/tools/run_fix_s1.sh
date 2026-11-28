#!/bin/bash
P=~/pion/proj13; M=/home/user/shiny-enigma/.claude/skills/pion-raja/projects/the_mona_lisa/src
until [ -f $P/final/sample.done ]; do sleep 15; done
cd $P/scene && node render_seq.js $P/plans/sample.js $P/out/sample --from 0 --to 140 --jobs 3 > $P/out/sample_f1.log 2>&1 || exit 1
cd $M && python3 overlay_sample.py > $P/final/sample_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/sample_ov.mp4 -i $P/final/sample_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 15.7 -movflags +faststart $P/final/mona_lisa_sample.mp4
echo DONE > $P/final/sample_f1.done
