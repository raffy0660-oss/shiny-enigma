#!/bin/bash
# sample: wait for the engine segments + heist frames, render office/gallery, captions, mux
P=~/pion/proj13; M=/home/user/shiny-enigma/projects/the_mona_lisa/src
until [ -f $P/eng/sO_track.json ] && [ -f $P/eng/sA_track.json ] && grep -q "^done" $P/out/sample_h.log 2>/dev/null; do sleep 15; done
cd $P/scene && node render_seq.js $P/plans/sample.js $P/out/sample --from 336 --to 942 --jobs 3 > $P/out/sample_r.log 2>&1 || exit 1
cd $M && python3 overlay_sample.py > $P/final/sample_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/sample_ov.mp4 -i $P/final/sample_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 15.7 -movflags +faststart $P/final/mona_lisa_sample.mp4
echo DONE > $P/final/sample.done
