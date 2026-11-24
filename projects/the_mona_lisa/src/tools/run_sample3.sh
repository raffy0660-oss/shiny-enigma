#!/bin/bash
P=~/pion/proj13; M=/home/user/shiny-enigma/projects/the_mona_lisa/src; C=$M/cues
cd ~/pion/pion_raja; rm -rf $P/eng/sO_frames $P/eng/sO_track.json
node react_render.js --audio ../proj12/audio/silence_long.wav --start 5.6 --dur 5.15 --cues $C/s_O.txt --out ../proj13/eng/sO --png --bg green --blur 6 --jobs 3 --size 1080x1920 --view ../proj13/eng/view_s_O.json > $P/eng/sO.log 2>&1 || exit 1
cd $P/scene && node render_seq.js $P/plans/sample.js $P/out/sample --from 336 --to 645 --jobs 3 > $P/out/sample_r3.log 2>&1 || exit 1
cd $M && python3 overlay_sample.py > $P/final/sample_ov.log 2>&1 || exit 1
ffmpeg -v error -y -i $P/final/sample_ov.mp4 -i $P/final/sample_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 15.7 -movflags +faststart $P/final/mona_lisa_sample.mp4
echo DONE > $P/final/sample3.done
