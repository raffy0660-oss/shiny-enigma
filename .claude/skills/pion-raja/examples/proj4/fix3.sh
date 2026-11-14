set -e
cd /home/user/proj4
for f in $(seq 429 474); do rm -f out4k/vframes/$(printf %04d $f).png; done
PLAN=$PWD/plan.json THUMBS=$PWD/thumbs.raw PAGE=$PWD/index_p4.html RW=2156 RH=3840 JOBS=3 node ../pion_raja/drive.js out4k/vframes $(python3 -c "print(','.join(map(str,list(range(429,475)))))") 2>&1 | tail -1
python3 composite4k.py out4k/p4_nosfx.mp4 | tail -1
ffmpeg -v error -y -i out4k/p4_nosfx.mp4 -i mix.m4a -map 0:v -map 1:a -c copy -movflags +faststart out4k/project4_pion_4k_v2.mp4
ffmpeg -v error -y -i out4k/project4_pion_4k_v2.mp4 -vf "select='between(n\,285\,310)+between(n\,455\,474)',crop=2160:2748:0:552,scale=160:204,drawtext=fontfile=/usr/share/fonts/opentype/inter/Inter-Bold.otf:text='%{n}':x=2:y=2:fontsize=18:fontcolor=yellow,tile=12x4" -frames:v 1 review/fix3.jpg
echo ALL_DONE
