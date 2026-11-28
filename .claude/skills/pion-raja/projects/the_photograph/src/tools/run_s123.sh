cd ~/pion/proj10/scene
node render_seq.js ../plans/s12_office.js ../out/s12 --jobs 3 --from 0 --to 511 > ../out/s12.log 2>&1
node render_seq.js ../plans/s23_apt.js ../out/s23 --jobs 3 --from 492 --to 925 > ../out/s23.log 2>&1
echo ALLDONE >> ../out/s23.log
