cd ~/pion/proj10
until grep -q ENDFIXDONE final/endfix_build.log 2>/dev/null; do sleep 15; done
cd scene && node render_seq.js ../plans/s4_office.js ../out/s4 --jobs 3 --from 1050 --to 1267 > ../out/s4close.log 2>&1; cd ..
python3 build_film.py --from 1040 --to 1270 > final/s4close_build.log 2>&1 && python3 overlay_film.py 924-1266 ov_b.mp4 > final/ov_b.log 2>&1
S=/tmp/claude-0/-home-user-shiny-enigma/599c6978-6adb-511d-9baf-eb7e4a5a98d4/scratchpad
cd final && ffmpeg -v error -y -f concat -safe 0 -i ov_list.txt -i film_audio.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -t 73.4 -movflags +faststart $S/the_photograph.mp4 && echo S4CLOSEDONE >> s4close_build.log
