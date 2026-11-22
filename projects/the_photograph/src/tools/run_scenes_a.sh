# scene renders, part A (each waits for its engine render): s23 tail fix, s10, s5, s6, s7
cd ~/pion/proj10/scene
W() { until grep -q "^$1 done" ../eng/queue.log 2>/dev/null; do sleep 20; done; }
S() { node render_seq.js ../plans/$1.js ../out/$2 --jobs 3 --from $3 --to $4 --skip > ../out/$2.log 2>&1; echo "$2 done" >> ../out/queue.log; }
until grep -q "^done" ../out/s23.log; do sleep 20; done
node render_seq.js ../plans/s23_apt.js ../out/s23 --jobs 3 --frames $(seq -s, 636 738) > ../out/s23fix.log 2>&1; echo "s23 done" >> ../out/queue.log
S s10_aptA s10 3018 3265
W s5; S s5_ext s5 1260 1678
W s6; S s6_aptB s6 1674 2044
W s7; S s7_office s7 2040 2173
