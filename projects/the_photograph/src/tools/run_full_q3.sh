cd ~/pion/proj10/scene
until grep -q Q2DONE ../out/q_full.log 2>/dev/null; do sleep 20; done
S() { node render_seq.js ../plans/$1.js ../out/$2 --jobs 3 --from $3 --to $4 > ../out/$2.log 2>&1; echo "$2 done" >> ../out/q_full.log; }
S s9_office s9 2724 3031
S s1113_office s1113 3258 4405
echo Q3DONE >> ../out/q_full.log
