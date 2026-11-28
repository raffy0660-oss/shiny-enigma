# scene renders, part B: s78 (needs s8 + police), s9, s1113, s4
cd ~/pion/proj10/scene
W() { until grep -q "^$1 done" ../eng/queue.log 2>/dev/null; do sleep 20; done; }
S() { node render_seq.js ../plans/$1.js ../out/$2 --jobs 3 --from $3 --to $4 --skip > ../out/$2.log 2>&1; echo "$2 done" >> ../out/queue.log; }
until grep -q "^s7 done" ../out/queue.log 2>/dev/null; do sleep 20; done
W s8; W police; S s78_aptC s78 2166 2725
W s9; S s9_office s9 2724 3031
W s11; S s1113_office s1113 3258 4405
W s4; S s4_office s4 924 1267
