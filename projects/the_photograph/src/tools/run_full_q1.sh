cd ~/pion/proj10/scene
S() { node render_seq.js ../plans/$1.js ../out/$2 --jobs 3 --from $3 --to $4 > ../out/$2.log 2>&1; echo "$2 done" >> ../out/q_full.log; }
S s12_office s12 0 511
S s23_apt s23 492 937
S s4_office s4 924 1267
echo Q1DONE >> ../out/q_full.log
