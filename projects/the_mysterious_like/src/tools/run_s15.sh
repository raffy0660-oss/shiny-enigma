#!/bin/bash
# after the scene render: captions overlay -> mux with the sample audio -> ~/pion/proj12/final/the_mysterious_like_sample15.mp4
P=~/pion/proj12; M=$(cd "$(dirname "$0")/.." && pwd)
until [ -f $P/out/s15/pts.json ]; do sleep 20; done
python3 $M/overlay_sample.py > $P/final/ov.log 2>&1 || { echo FAIL > $P/final/s15.done; exit 1; }
ffmpeg -v error -y -i $P/final/s15_ov.mp4 -i $P/final/s15_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 16.6 -movflags +faststart $P/final/the_mysterious_like_sample15.mp4
echo DONE > $P/final/s15.done
