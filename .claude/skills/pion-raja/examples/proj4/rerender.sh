set -e
cd /home/user/proj4; R=/home/user/pion_raja
rm -rf out4k/vframes
python3 -c "import json; P=json.load(open('plan.json')); print(','.join(str(o['f']) for o in P if o['vis']))" > vis.txt
PLAN=$PWD/plan.json THUMBS=$PWD/thumbs.raw PAGE=$PWD/index_p4.html RW=2156 RH=3840 JOBS=3 node $R/drive.js out4k/vframes $(cat vis.txt) | tail -1
cd $R
node react_render.js --audio /home/user/proj4/src/input.mp4 --start 3.933 --dur 3.167 --local --cues /home/user/proj4/cues/white1.txt --size 2156x3840 --out /home/user/proj4/out4k/w1 --bg black --png --jobs 3 | tail -1
node react_render.js --audio /home/user/proj4/src/input.mp4 --start 12.133 --dur 2.167 --local --cues /home/user/proj4/cues/white2.txt --size 2156x3840 --out /home/user/proj4/out4k/w2 --bg black --png --jobs 3 | tail -1
node react_render.js --audio /home/user/proj4/src/input.mp4 --start 22.8 --dur 2.433 --local --cues /home/user/proj4/cues/white3.txt --size 2156x3840 --out /home/user/proj4/out4k/w3 --bg black --png --jobs 3 | tail -1
cd /home/user/proj4
python3 composite4k.py out4k/p4_nosfx.mp4 | tail -1
ffmpeg -v error -y -i out4k/p4_nosfx.mp4 -i mix.m4a -map 0:v -map 1:a -c copy -movflags +faststart out4k/project4_pion_4k_v2.mp4
rm -f review/*.jpg
for s in $(seq 0 60 756); do e=$((s+59)); ffmpeg -v error -y -i out4k/project4_pion_4k_v2.mp4 -vf "select='between(n\,$s\,$e)',crop=2160:2748:0:552,scale=160:204,drawtext=fontfile=/usr/share/fonts/opentype/inter/Inter-Bold.otf:text='%{n}':x=2:y=2:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=12x5" -frames:v 1 review/r_$(printf %03d $s).jpg; done
echo ALL_DONE
