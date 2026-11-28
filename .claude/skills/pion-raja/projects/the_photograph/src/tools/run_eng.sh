# engine renders for scenes 4-13 (absolute VO times), then the police loop
cd ~/pion/pion_raja
R() { node react_render.js --audio ../proj10/audio/vo.mp3 --start $2 --dur $3 --cues ../proj10/cues/$1_pion.txt --out ../proj10/eng/$1 --png --bg green --blur 6 --jobs 2 --size ${4:-1080x1920} > ../proj10/eng/$1.log 2>&1; echo "$1 done" >> ../proj10/eng/queue.log; }
R s5 21.0 6.95
R s6 27.9 6.15
R s7 34.0 2.2
R s8 36.1 9.3
R s9 45.4 5.1
node react_render.js --audio ../proj10/audio/silence.wav --start 0 --dur 4 --local --cues ../proj10/cues/s8_police.txt --out ../proj10/eng/s8_police --png --bg green --blur 1 --jobs 2 --size 1080x1920 > ../proj10/eng/pol.log 2>&1; echo "police done" >> ../proj10/eng/queue.log
R s11 54.3 19.1
R s4 15.4 5.7 2160x3840
echo ENGDONE >> ../proj10/eng/queue.log
