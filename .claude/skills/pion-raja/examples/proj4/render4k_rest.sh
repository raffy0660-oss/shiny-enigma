set -e
cd /home/user/pion_raja
node react_render.js --audio /home/user/proj4/src/input.mp4 --start 3.933 --dur 3.167 --local --cues /home/user/proj4/cues/white1.txt --size 2156x3840 --out /home/user/proj4/out4k/w1 --bg black --png --jobs 3 | tail -1
node react_render.js --audio /home/user/proj4/src/input.mp4 --start 12.133 --dur 2.167 --local --cues /home/user/proj4/cues/white2.txt --size 2156x3840 --out /home/user/proj4/out4k/w2 --png --jobs 3 | tail -1
node react_render.js --audio /home/user/proj4/src/input.mp4 --start 22.8 --dur 2.433 --local --cues /home/user/proj4/cues/white3.txt --size 2156x3840 --out /home/user/proj4/out4k/w3 --bg black --png --jobs 3 | tail -1
echo REST_DONE
