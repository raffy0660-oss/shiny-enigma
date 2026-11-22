# re-render of the photo world (apartment A: the bulb light needs its (baked) shadow): s23 + s10, after part B's s9
cd ~/pion/proj10/scene
until grep -q "^s9 done" ../out/queue.log 2>/dev/null; do sleep 20; done
node render_seq.js ../plans/s23_apt.js ../out/s23 --jobs 3 --from 492 --to 937 --skip > ../out/s23.log 2>&1; echo "s23b done" >> ../out/queue.log
node render_seq.js ../plans/s10_aptA.js ../out/s10 --jobs 3 --from 3018 --to 3265 --skip > ../out/s10.log 2>&1; echo "s10b done" >> ../out/queue.log
