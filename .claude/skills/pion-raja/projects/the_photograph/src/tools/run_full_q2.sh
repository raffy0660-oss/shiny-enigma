cd ~/pion/proj10/scene
until grep -q Q1DONE ../out/q_full.log 2>/dev/null; do sleep 20; done
S() { node render_seq.js ../plans/$1.js ../out/$2 --jobs 3 --from $3 --to $4 > ../out/$2.log 2>&1; echo "$2 done" >> ../out/q_full.log; }
S s5_ext s5 1260 1678
S s6_aptB s6 1674 2044
S s7_office s7 2040 2173
S s78_aptC s78 2166 2725
echo Q2DONE >> ../out/q_full.log
