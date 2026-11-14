# Pion Raja: catatan perubahan

## v3: 33 ekspresi, pose soktahu, istana 3D dengan cahaya per emosi
- **18 ekspresi baru** (dari desain Pion 2D lama, digambar ulang dengan gaya wajah engine): `nangis` `tersedu`
  `girang` `bahagia` `cium` `lega` `gemas` `syok` `kesal` `ngiler` `merajuk` `memelas` `bosan` `cemas` `bangga`
  `ngamuk` `santai` `soktahu`. Semua punya mulut bicara sendiri dan yang bermata terbuka ikut berkedip. Lihat `EKSPRESI.jpg`.
- **Pose `soktahu`** (otomatis, atau `gest nerd`): kacamata kotak tebal, telunjuk kanan ke atas, tangan kiri membuka buku
  "THE BOOK OF LARP" seperti sedang dibaca, mata melirik ke buku. Lihat `SOKTAHU.jpg`.
- **Efek pencerahan**: saat `soktahu`, buku menyala emas sekitar 1,5 detik (cahaya ke wajah, bloom, garis silau,
  partikel naik) lalu meredup.
- **Cue `light`**: atur arah/warna cahaya toon Pion supaya cocok dengan background 3D.
- **Mode 3 `castle3d/`**: istana 3D di Blender (gaya game AAA) untuk Pion asli: bayangan asli dari model bayangan
  tak terlihat, peta cahaya ruangan yang dikalikan ke Pion dalam tingkat cel, 8 mood cahaya per emosi
  (hangat, marah, sedih, kaget, licik, duit, misteri, pencerahan), tahta emas besar, langit-langit kotak-kotak emas,
  patung batu catur, lampu gantung kap kuningan, garis tinta hitam di semua benda, framing Pion sekitar 60% frame.
  Panduan: `castle3d/PANDUAN_ISTANA3D.md`.

## v2: gerak lebih halus, bayangan lebih bagus, menyatu dengan video
Lihat `PERBANDINGAN_V2.jpg` untuk sebelum/sesudah.
- **Motion blur** di mode video (`drive.js`, env `BLUR`, `SHUTTER`) dan mode reaksi (`--blur`, `--shutter`).
  Shutter terpusat (setengah ke belakang, setengah ke depan), jadi frame benturan tetap jelas.
  Jumlah sampel menyesuaikan jarak gerak: frame diam tetap tajam, gerakan cepat sampai 16 sampel.
  Panjang blur dibatasi sekitar 4,5% tinggi Pion di layar supaya tetap terbaca. `BLUR=1` mematikan blur (draft cepat).
- **Tracking halus**: `smooth_track.py` menghilangkan getar pada `anchors.json`/`track.json` (regresi lokal tanpa delay,
  jendela menyesuaikan kecepatan, bobot bilateral). Spike satu frame dibuang. Cut, frame video yang beku, dan awal
  gerakan mendadak tidak ikut bergeser. Di data proj4: getar saat diam turun 2–3x, pergeseran maksimum di bawah 3 px.
- **Gerakan**: mahkota punya pegas sendiri (telat dan memantul setelah kepala). Ada ancang-ancang otomatis sebelum
  lompat/hop/launch, serta squash lalu memantul saat mendarat. Di mode reaksi ada jongkok lalu meregang sebelum `flyout`.
- **Bayangan**: 16 sampel area light (dulu 7) sehingga penumbra halus dan melebar sesuai tinggi. Bagian yang tinggi
  bayangannya lebih tipis. Ada contact shadow rapat di bawah alas, ambient occlusion di bawah kerah dan mahkota,
  serta contact shadow dua lapis di adegan istana. Opsional: `autoDir: true` di `SHOTCAM` (sisi cahaya diambil dari video).
- **Menyatu dengan video**: `integrate.py` mengukur ketajaman dan noise footage per frame, lalu melembutkan Pion,
  menambah light wrap di tepi, dan menambah grain yang sama. Dipakai oleh `composite*.py` di contoh.
- Render paralel tetap identik byte-per-byte dengan render satu job (sudah dicek di kedua mode).
- Catatan waktu: di 4K, adegan yang banyak gerak cepat 6–9x lebih lama dengan blur. Frame diam hampir tidak bertambah.


## Animasi & karakter
- **6 gesture baru dengan animasi tangan.** `clap`, `lookout`, `dance`, `facepalm`, `knock`, dan `cross` sudah ada
  di `timeline.js` tapi `gestureState()` tidak menanganinya, jadi tangan tidak pernah muncul. Sekarang:
  - clap: kira-kira 4 tepukan per detik, plus efek garis benturan kecil di titik tangan bertemu
  - lookout: tangan jadi "visor" di dahi, tangan lain di pinggang, kepala menoleh kiri-kanan
  - dance: kedua tangan naik-turun bergantian
  - facepalm: tangan menutup wajah, kepala sedikit menunduk
  - knock: tangan mengetuk ke depan, badan ikut maju-mundur
  - cross: tangan bersilang di dada
- **Gesture pendek sekarang tampil.** Ramp masuk/keluar dulu tetap 0.16 dtk, jadi gesture < 0.32 dtk
  (cross 10.0, facepalm 10.9, up 15.02) tidak pernah terlihat. Sekarang ramp = min(0.16, durasi/3).
- **Ganti ekspresi tanpa ghosting.** Crossfade diganti dengan "squash-pop": fitur wajah memipih,
  berganti di tengah, lalu memantul balik sedikit. Tidak ada lagi dua wajah bertumpuk transparan.
- **Kedip otomatis** (deterministik, interval 2–4.4 dtk, kadang kedip ganda) untuk ekspresi bermata terbuka
  (datar, senang, kaget, penasaran). Tidak berkedip saat ekspresi sedang berganti atau saat teleport.
- **Kilau putih di kepala** dipindah ke layer tekstur sendiri, jadi tidak ikut terdistorsi saat kedip/ganti ekspresi.
- **Bahu lengan ditutup** dengan bola sendi di dalam badan. Ujung tube yang terbuka dulu membuat outline bergerigi.
- **Mahkota emas berkilau.** Shader toon specular + fresnel sudah ada tapi `uSpec` tidak pernah diset.
  Posisi mata kamera (`uEye`) juga dibetulkan ke `[0, HC, 0]` (dulu `[0,10,20]`).
- **Motif ermine** diganti dari bercak acak menjadi "ekor ermine" klasik (tetesan + 3 titik) yang ter-tile rapi.
- Font kartu komentar, stempel FAKE, dan BONK sekarang punya fallback (`Inter, Arial Black, sans-serif`).

## Pipeline
- `drive.js`: render **paralel** (`JOBS=n`, default setengah jumlah core, maks 6), rentang frame `a-b`,
  resume dengan `SKIP=1`, dan fallback `require('playwright')`. Hasil per-chunk identik byte-per-byte
  dengan render berurutan, karena fisika disimulasi ulang dari awal shot.
- `objtrack.py`, `comp.py`, `verify.py`: path video bisa diatur lewat env `VIDEO=...` (default tetap path lama).
- **Baru: `preview.js`**: preview karakter tanpa video/tracking data. Membuat plan sintetis lalu me-render
  momen timeline jadi satu contact sheet.

```bash
node preview.js out.png 2.0,2.7,6.6,8.5 --pitch 20 --size 620
```

```bash
JOBS=4 node drive.js frames all
```

`before_after.png`: perbandingan sebelum/sesudah.
