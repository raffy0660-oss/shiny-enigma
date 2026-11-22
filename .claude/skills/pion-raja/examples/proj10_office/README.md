# proj10: kantor detektif Pion (misteri)

Set three.js untuk seri detektif, mengikuti `PANDUAN_SINEMATIK.md`:
- Malam biru, dengan satu pool hangat dari lampu gantung kap hijau di atas meja. Ada kerucut cahaya bervolume dan debu melayang.
- Cahaya bulan menembus tirai (SpotLight dengan `map` garis-garis) di dinding kiri.
- Papan kasus disinari lampu gambar kuningan: foto, memo, jam 11:42, poster MISSING, kalender FRIDAY, kartu NO PRINTS,
  kliping koran, tanda tanya, dan benang merah yang membentuk "perjalanan kasus".
- Meja dengan berkas berserakan (laporan ketik, foto, memo, map manila, amplop tanpa pengirim, telepon putar, mug, kaca pembesar),
  kertas jatuh di lantai, karpet, kursi kulit, lemari arsip dengan laci terbuka, gantungan jas dengan trench coat dan topi,
  jam dinding (`setClock(11, 41)`), rak buku, lisensi detektif, dan jendela malam berhujan.

Cara pakai (symlink `node_modules` ke `proj9/scene/node_modules`, three 0.186):
```bash
node render_office.js out/ establish,wide,desk,board,low     # still per sudut
node render_office.js out/ --clip wide 5 --jobs 3            # klip 60 fps, push-in pelan, debu bergerak
```
Kursi ada di belakang meja (`DESK.z - 0.55`): di situlah Pion berdiri. Billboard Pion dipasang dengan pola proj9 `renderFrame`.
