# Pion Raja: catatan perubahan

## v6: detektif + gaya sinematik referensi (Nov 2026)
- **Bidak lain** (`drawPiece` di `render.js`, cue `piece <knight|rook|bishop|queen|pawn>`): kuda hitam arang (telinga, surai, moncong),
  benteng biru (puncak bergerigi, lencana emas), gajah ungu (kepala lonjong + bola), ratu toska (mahkota perak bermutiara, kalung),
  pion korban gading. Rig, lengan, sarung tangan, dan semua ekspresi wajah sama dengan Pion. Warnanya sengaja tidak ada yang merah.
- Gesture baru `call` (telepon di telinga) dan `gun` (senapan kartun di dada), dipakai di proj9 v2.
- Remotion: item `rage` (burst marah bergerigi), tag diklamp ke layar, `inOut` aman untuk item pendek, `GreenFX.tsx`
  (kata keluar dari mulut, semprotan ludah), `CastSheet.tsx` (cast sheet detektif).
- **Gaya 2D referensi** (cue `style2d`): kamera ortografis setinggi mata (tanpa perspektif), shader `uR2` = gradasi lukis/airbrush (sisi terang ke
  bayangan inti lembut satu sisi, tepi silhuet sedikit gelap, muka hampir rata, ikut warna cahaya adegan), warna asli dipertahankan (kepala Pion merah
  bergradasi oranye, `edge` per material),
  outline hampir hitam x1,3, lengan garis tinta tipis tanpa bola bahu, kilau kepala dimatikan.
- **Baju bidak** (cue `outfit`): `daniel` (kemeja biru muda, rompi rajut mustard berleher V, dasi merah, kancing) dan `police`
  (seragam navy, dasi hitam, sabuk + gesper emas, lencana, papan nama, epolet, topi polisi bertengger di atas gerigi benteng).
- **`PANDUAN_SINEMATIK.md`**: hasil analisis frame per frame 15 video referensi user (cahaya, warna, kamera, struktur cerita, caption).

## v5: Mode 4, dunia 3D three.js dengan gaya istana (proj7, Sphere Las Vegas)
- **Dunia 3D animasi** (`examples/proj7/scene`): kota dengan plaza, jalan, mobil, palem, gedung kartun
  (RoundedBox, warna cerah, atap kubah/kerucut), monumen (piramida kaca, menara rangka besi, menara jarum,
  bianglala), Sphere LED dengan emoji yang bisa meleleh jadi layar datar, lapangan football yang jatuh dengan gempa
  dan debu, kastil Pion untuk pose The Notebook. Render frame per frame lewat Playwright (`render_scene.js`).
- **Tampilan setara istana**: AgX + grade punchy, GTAO, garis tinta ala Freestyle dari tepi depth/normal,
  matahari golden hour, kabut, HDRI kota CC0, bump map, bloom hanya untuk emissive, vignette.
- **Pion di dunia 3D**: billboard frame engine, bayangan matahari asli (layer 1), bayangan kontak di kaki,
  digabung setelah AgX dan sebelum grade. Cahaya Pion lewat cue `light` searah matahari scene.
- **Remotion `SceneOverlay`**: garis ukur yang menempel ke titik 3D (`pts.json`), angka menghitung, lencana pop
  dengan gempa, caption atas/bawah, zoom-blur di potongan, video intro.
- **Engine**: `gest kantong` (tangan di saku), `booktitle deathnote` (buku soktahu jadi Death Note), ukuran tangan
  per gesture (`hs`).
- Panduan `PANDUAN_DUNIA3D.md` dan perintah siap-pakai untuk AI `PROMPT_AI_DUNIA3D.md`.

## v4.1: banjir, bawah air, baju renang (proj6, bubble ring)
- **Air di istana (`castle3d/water_fx.py`)**, dijalankan otomatis oleh `castle_video.py` kalau cue berisi perintah air.
  Efeknya dibuat di ruang scene (sebelum kamera Remotion), jadi ikut zoom, miring, dan motion blur kamera:
  - `<t> leak [y] [x]`: retakan di tembok kiri mulai bocor, aliran air kecil jatuh ke lantai dan membentuk genangan.
  - `<t> burst [y] [x]`: tembok jebol. Retakan melebar, lubang gelap, pecahan bata bergaris tinta, dan air deras
    gaya kartun (badan air, garis tinta, inti terang, garis busa mengalir, cipratan).
  - `<t> flood <dur>`: air naik dari lantai sampai menutup seluruh layar. Permukaannya bergelombang dan berbusa
    selama air masih masuk.
  - `<t> underwater`: adegan yang dari awal sudah di bawah air.
  - Tampilan bawah air: refraksi bergoyang, warna toska, kabut kedalaman, kaustik bergerak, sinar dari permukaan,
    partikel melayang, gelembung naik. Warna Pion dijaga sebagian supaya tetap terbaca.
  - Gelembung dari mulut otomatis saat Pion bicara di bawah air (`<t> breath 0..1` mengatur jumlahnya),
    `<t> blub <dur>` untuk "blubuk-blubuk" besar.
  - `<t> ring fail <dur>`: ring gelembung berbentuk aneh yang bergoyang lalu langsung pecah.
    `<t> ring good <dur>`: ring sempurna keluar dari mulut, lalu meluncur ke kamera sampai memenuhi layar.
  - Air dan pecahan tembok tetap di BELAKANG Pion (alpha Pion dari frame engine).
- **Mengapung**: `<t> float <0..1> [dur]` (naik, melayang, bergoyang pelan, miring) dan `<t> panic <0..1> [dur]`
  (meronta). Bayangan di lantai ikut menipis karena tinggi Pion terbaca dari track.
- **Kostum `costume swim`**: baju renang garis biru-putih, tanpa jubah, lengan oranye, kacamata renang tosca
  (lensa besar, karet tebal, tali melingkar kepala). Mahkota tetap dipakai.
- **5 ekspresi baru**: `melet` (lidah keluar, fokus), `gembung` (pipi penuh udara), `tiup` (mulut "o"),
  `malu` (melirik, pipi merah, keringat), `sewot` (malu tapi mulai marah).
- **6 gesture baru**: `flail` (panik di air), `tread` (mengayuh pelan), `cough` (dehem, kepalan di mulut),
  `windup` (ancang-ancang lalu dorong ke depan), `blow` (tangan di depan mulut saat meniup), `gaya` (finger gun ke kamera).
- `castle_video.py --stop scene` berhenti setelah frame scene (+ air), untuk cek cepat tanpa Remotion.
- Track engine sekarang juga menyimpan posisi mulut (`items.mouth`), level mengapung, dan buka mulut per frame.

## Tambahan sesi shampoo (proj5)
- **`gest crownlift [dur] [kiri|kanan]`**: tangan meraih mahkota (.28 s), mengangkatnya (.32 s), tahan, lalu memasang
  lagi (.45 s terakhir). Kepala botak berkilau "ting", tangan lain menunjuk kepala, AO dahi dari mahkota ikut hilang.
- **Lengan**: tabung lengan memakai frame rotation-minimising. Sebelumnya frame berbalik saat lengan melewati
  vertikal, tabung terpuntir dan muncul duri gelap di outline (terlihat di gesture tangan ke atas).

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
- **Micro zoom otomatis**: cue `autozoom` (zoom snap tiap N kata, level bergantian, punch di kata dengan `!`, pusat di
  wajah) dan `engine/microzoom.py` untuk video yang sudah jadi.
- **Kamera baru (`camplan.js`)**: zoom bertahap sampai 1,5x yang halus tanpa momentum/getar dan ditahan sampai kata
  berikutnya, sudut + kemiringan per atmosfer, zoom out tiap ganti mood. Dipakai engine dan Remotion.
- **Gerakan otomatis (`acting`)**: goyang, condong, memantul, lompat di "!", "take" saat ganti ekspresi, melirik saat diam.
- **Video istana `castle_video.py` + Remotion**: plate bersih per mood, bayangan Pion dan cahaya di badannya ikut
  bergerak bersama Pion, crossfade antar mood, kamera halus + motion blur kamera, audio.
- **Model istana lebih detail** (blender-modeling): kolom marmer beralur dengan alas dan kepala pilar, bingkai jendela
  berbatu kunci, list dinding, alas patung bertingkat dengan plakat emas, cincin di patung catur, list dan paku emas di tahta.
- **Studio preview 3D di browser** (`castle3d/studio`, three.js): istana real-time, Pion 2D, cahaya per mood,
  rencana kamera, timeline, kamera bebas, klik benda untuk melihat namanya.
- **Shading kartun Pion**: pita cel analitik yang halus di semua zoom, bayangan bernuansa sejuk seperti cat tangan,
  rim light tegas berwarna cahaya ruangan.
- **Render lebih cepat**: compositing hanya di area Pion dan bayangannya dengan plate yang di-cache (sekitar 1,5x),
  engine memakai semua core, dan cache plate otomatis dibuat ulang kalau script berubah.
- **Pencahayaan diukur dan diperbaiki** (`light_check.py`, skill lighting): pemisahan nilai Pion dari latar di semua
  8 mood sekarang ≥ 0,10 (sebelumnya hanya pencerahan yang lolos). Lihat `pion3d/cahaya_sebelum_sesudah.jpg`.
- **Subtitle karaoke dihapus** dari engine. Cue `word` tetap ada sebagai penanda waktu kata (untuk `autozoom`).

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
