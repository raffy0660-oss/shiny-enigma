cd ~/pion/pion_raja && node react_render.js --audio ../proj10/audio/vo.mp3 --start 15.4 --dur 5.7 --cues ../proj10/cues/s4_pion.txt --out ../proj10/eng/s4 --png --bg green --blur 6 --jobs 3 --size 2160x3840 > ../proj10/eng/s4.log 2>&1
cd ~/pion/proj10/scene && node render_seq.js ../plans/s4_office.js ../out/s4 --jobs 3 --from 924 --to 1267 > ../out/s4.log 2>&1
cd ~/pion/proj10 && python3 build_film.py --from 900 --to 1300 > final/s4fix_build.log 2>&1 && python3 overlay_film.py 924-1266 ov_b.mp4 > final/ov_b.log 2>&1
S=/tmp/claude-0/-home-user-shiny-enigma/599c6978-6adb-511d-9baf-eb7e4a5a98d4/scratchpad
cd final && ffmpeg -v error -y -f concat -safe 0 -i ov_list.txt -i film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.4 -movflags +faststart $S/the_photograph.mp4 && echo S4FIXDONE >> s4fix_build.log
