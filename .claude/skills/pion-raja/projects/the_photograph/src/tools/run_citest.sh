cd ~/pion/proj10/scene
node render_seq.js ../plans/s12_office.js ../out/ci_t --jobs 3 --frames 110,290,420 > /dev/null 2>&1
node render_seq.js ../plans/s7_office.js ../out/ci_t --jobs 3 --frames 2072,2084,2096,2110 > /dev/null 2>&1
node render_seq.js ../plans/s6_aptB.js ../out/ci_t --jobs 3 --frames 1690,1700,1760,1880,1960,2030 > /dev/null 2>&1
node render_seq.js ../plans/s78_aptC.js ../out/ci_t --jobs 3 --frames 2200,2330,2440 > /dev/null 2>&1
node render_seq.js ../plans/s23_apt.js ../out/ci_t --jobs 2 --frames 520,690 > /dev/null 2>&1
node render_seq.js ../plans/s5_ext.js ../out/ci_t --jobs 2 --frames 1380,1530 > /dev/null 2>&1
echo CIDONE > ../out/ci_t/done.txt
