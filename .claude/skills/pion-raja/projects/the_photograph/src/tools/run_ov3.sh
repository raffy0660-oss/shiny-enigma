cd ~/pion/proj10
python3 overlay_film.py 924-1266 ov_b.mp4 > final/ov_b.log 2>&1
python3 overlay_film.py 1267-3257 ov_c.mp4 > final/ov_c.log 2>&1
python3 overlay_film.py 3258-4403 ov_d.mp4 > final/ov_d.log 2>&1
until grep -q RESTOREDONE out/s12restore.log; do sleep 10; done
python3 build_film.py --from 0 --to 924 > final/buildA.log 2>&1
python3 overlay_film.py 0-923 ov_a.mp4 > final/ov_a.log 2>&1
echo OV3DONE > final/ov3.done
