# Pion Raja di istana 3D (gaya game AAA)

Karakter Pion **tetap Pion asli dari engine** (outline, wajah flat, ekspresi, gesture).
Blender hanya membuat **background 3D**, **bayangan**, dan **pencahayaan** yang menempel ke Pion.

```
engine Pion (PNG transparan)  ─┐
Blender: istana 3D + bayangan  ─┼─> comp_pion.py ─> frame jadi
Blender: peta cahaya di Pion   ─┘   (relight cel, light wrap, bayangan kontak, grain, grade)
```

## Setup (sekali per sesi)
```bash
bash .claude/skills/pion-raja/castle3d/setup.sh
```
Memasang lib EGL/GL, Blender 5.2 sebagai modul Python (`/opt/bpyenv`), numpy/pillow, lalu menyalin
engine ke `~/pion/pion_raja`. Butuh Python 3.13, ffmpeg, Node + Playwright (sudah ada di sesi cloud).
Opsional: pasang skill `scenario-blender-lighting-rendering` untuk bloom + vignette halus (kalau tidak ada, dilewati).

## Video jadi (paling lengkap): `castle_video.py`
```bash
cd .claude/skills/pion-raja/castle3d
python3 castle_video.py --cues cues.txt --audio vo.wav --out pion.mp4 --res 1080x1350
```
Satu file cue mengatur semuanya:
- **Ekspresi** menentukan mood cahaya. Saat mood berganti, ruangan dan cahaya di Pion crossfade 0,5 detik.
- **`word` + `autozoom`** menentukan kamera (`engine/camplan.js`):
  - zoom bertahap (default 1,18x → 1,34x → 1,5x) atau **template** `autozoom 2 1 pola`: 1,12x → 1,24x → 1,35x → 1,0x berulang (3 in, 1 out), transisi halus tanpa momentum atau getar;
  - level zoom **ditahan** sampai titik zoom berikutnya, dan kata dengan `!` langsung ke 1,5x;
  - **muka Pion selalu di tengah** setiap zoom (kamera mengikuti muka yang di-track per frame: goyang, lompat, terbang);
    tiap mood cuma punya **kemiringan** sendiri (tidak ada lagi geser ke pojok);
  - **barang di tengah**: `<t> zoomitem coin 1.3 0.3` (juga `pouch`, `book`, `floorbook`, `sebum`, `button`, `handL`,
    `handR`) memusatkan barang yang dipegang, lalu `<t> zoomto 1.0 0 0 0 0.3` kembali;
  - saat mood berganti, kamera **zoom out ke normal** lalu mulai zoom lagi dengan sudut berikutnya.
- **Gerakan Pion** (gesture, `acting`, terbang) membuat **bayangan di lantai dan cahaya di badannya ikut bergerak**.
  Bayangan ikut bergeser dan menipis saat Pion melompat. Tidak ada bekas bayangan yang diam.
  Cahaya di Pion datang dari **lampu titik yang diam di ruangan** (arah key mood itu), jadi saat dia bergoyang,
  miring, atau melompat mendekati lampu, terang-gelap di badannya ikut berubah.
- **Kamera bergerak = motion blur (shutter 270°, 8 sampel) + getaran halus** yang hanya muncul selama kamera
  bergerak (`--shake 0` mematikan, `--shake 0.5` lebih halus). Saat kamera diam, gambar diam.
- **Remotion** (`castle3d/remotion`) merakit hasil akhir: kamera, motion blur kamera, vignette, audio.
  Scene dirender 1,5x lebih besar dari output, jadi zoom 1,5x tetap tajam.

**Teks istilah (callout):** `<t> callout <dur> "TRICHORRHEXIS NODOSA" "hair that snaps at its weak points" top label="Medical term"`
memunculkan judul elegan di atas lapisan kamera (`remotion/src/Callouts.tsx`): label emas kecil, huruf muncul satu per
satu (naik + blur hilang), garis emas tersapu dari kiri ke kanan, subjudul miring, keluar memudar. Tidak ikut zoom atau
motion blur kamera. Ukuran huruf menyesuaikan panjang istilah (otomatis pindah baris kalau perlu).

**Tidak ada yang terpotong:** Pion engine adalah layer 2D. Jendela kamera engine (`--eframe`, default `auto`) dihitung
dari ukuran scene istana + margin 15%, resolusinya dinaikkan supaya Pion tetap setajam scene, lalu tiap frame dicek
(`border_hits`). Kalau ada yang menyentuh tepi jendela (mahkota terangkat, tangan, props, karakter kedua), engine
dirender ulang dengan jendela 1,3x lebih lebar (maksimal 3 kali).

Hasil per mood di-cache di folder `--work`, jadi render ulang (misal ganti cue) hanya mengulang engine dan compositing.
Cache-nya otomatis tidak dipakai kalau `build_castle.py`/`build_pion.py`, resolusi, sampel, atau kabut berubah.
Compositing hanya menghitung ulang area sekitar Pion dan bayangannya. Sisa frame diambil dari plate yang sudah
di-grade (plus grain) dan disiapkan sekali: sekitar 1,5x lebih cepat dari versi sebelumnya.
Waktu kira-kira: plate Blender sekitar 5-6 menit per mood di 1080x1350, compositing sekitar 0,3 detik per frame
(4 core), Remotion dengan motion blur kamera 6 sampel beberapa menit per 10 detik video. `--camblur 1` mematikan blur kamera,
`--blur 1` mematikan motion blur engine, `--novolume` tanpa kabut (lebih cepat).

## Air: bocor, tembok jebol, banjir, bawah air (`water_fx.py`)
Tulis perintah air di file cue yang sama; `castle_video.py` menjalankannya otomatis setelah compositing.
```
0.00 leak 0.50 0.15      # retak + bocor kecil di tembok kiri (tinggi 50% frame, 15% dari kiri)
2.18 burst 0.40 0.05     # tembok jebol: pecahan bata + air deras
2.30 flood 2.4           # air naik sampai penuh dalam 2,4 detik
2.62 float 0.75 0.9      # Pion mulai mengapung
2.62 panic 1 0.3         # ...sambil meronta
2.62 gest flail 3.3
2.70 blub 1.5            # gelembung besar dari mulut
```
Adegan yang dari awal di bawah air: `0 underwater`, `0 costume swim`, `0 float 0.95 0.01`.
Ring gelembung: `5.1 ring fail 0.4` (bentuk aneh, langsung pecah), `10.1 ring good 2.3` (meluncur ke kamera).
Pakai mood `hangat` di bawah air (cue `0 mood hangat`): warna toska dari air sudah cukup, mood gelap jadi suram.
Butuh `opencv-python-headless`.

## Cek pencahayaan (`light_check.py`)
Setelah mengubah mood cahaya, ukur dengan alat skill `scenario-blender-lighting-rendering`:
```bash
python3 emotion_sheet.py --out cek.png --work cek --res 432x540 --samples 16 --novolume
/opt/bpyenv/bin/python light_check.py -- --work cek
```
- **Yang diukur per mood:** pemisahan nilai Pion dari sekelilingnya (target ≥ 0,10, dicek hitam-putih),
  siluet yang menyatu dengan latar, gradasi terang-gelap di badan, fokus yang bersaing, clipping, dan vignette.
- **Value study:** `<mood>_values.png` (hitam-putih | kelompok nilai | squint).
- **Aturan yang dipakai:**
  - gelapkan set dulu, baru naikkan subjek;
  - lampu gantung tidak menerangi tahta di belakang Pion;
  - lampu bawah, rim, dan sorot mood hanya mengenai Pion;
  - rim di sisi datangnya cahaya;
  - Pion sedikit lebih terang per mood (`SUBJECT_EXP_MOOD` di `emotion_sheet.py`).
- **Hasil saat ini:** semua 8 mood ≥ 0,10. Sisa clipping di `kaget` ada di mata putih Pion (memang putih sesuai desain).

## Studio preview 3D di browser (`studio/`)
```bash
cd .claude/skills/pion-raja/castle3d/studio
python3 make_studio.py --cues cues.txt --audio vo.wav      # lalu buka http://localhost:8765/castle3d/studio/
```
- **Istana 3D real-time (three.js):** geometri sama dengan render Blender (`castle.glb`, diekspor sekali oleh
  `export_studio.py`). Bata, langit-langit kotak-kotak, dan kaca patri dibuat ulang sebagai tekstur.
- **Pion tetap 2D:** video Pion transparan dari engine di bidang yang selalu menghadap kamera, dan bayangannya
  jatuh ke lantai.
- **Cahaya per mood** dari data yang sama (`EMOTIONS`), dengan crossfade antar mood.
- **Kamera "Shot cam"** memakai rencana kamera yang sama (`camplan.js`: zoom, sudut, miring, getaran). Dengan
  "Free cam" kamu bisa memutar kamera bebas mengelilingi aula.
- **Kontrol:** timeline bisa digeser, Play/Pause dengan audio, tombol garis tinta, mood bisa dipaksa, exposure.
  Klik sebuah benda untuk melihat namanya.
- **Performa:** koin, ubin, dan paku digabung (satu draw call per material), matriks benda statis dibekukan,
  dan shader dikompilasi di awal.
- Studio untuk draft dan cek cepat (detik, bukan menit). Hasil final tetap dari `castle_video.py` (Cycles + Remotion).

## Cara tercepat: satu frame per mood
```bash
cd .claude/skills/pion-raja/castle3d
python3 emotion_sheet.py --out hasil.png --res 1080x1350 --samples 48 --only hangat,pencerahan
```
Per mood: render istana + peta cahaya, render Pion engine dengan ekspresi + cue `light` yang cocok, lalu gabung.
`--res 432x540 --samples 16` untuk cek cepat (sekitar 30-60 detik per mood). Render 1080x1350 sekitar 5 menit per mood.

## Mood cahaya (ikut ekspresi)
| Mood | Ekspresi | Cahaya |
|---|---|---|
| `hangat` | senang imut ngakak datar girang bahagia cium lega gemas santai ngiler | lampu gantung oranye |
| `marah` | marah kesal ngamuk | merah dari bawah + rim merah |
| `sedih` | kecewa sakit nangis tersedu merajuk memelas | sinar bulan biru dari jendela samping |
| `kaget` | kaget syok | putih terang menyilaukan |
| `licik` | licik curiga sinis | hijau dari bawah + rim ungu |
| `duit` | duit bangga | emas, peti harta bersinar, sorot dari atas |
| `misteri` | penasaran ragu pusing bosan cemas | ungu-biru redup |
| `pencerahan` | soktahu | aula biru redup, buku terbuka memancarkan cahaya emas ke wajah |

Semua mood tetap menjaga ruangan terbaca (obor redup, pantulan langit-langit, kaca patri menyala tipis).

## Isi istana
Lantai papan catur marmer, karpet merah, tahta emas besar di depan jendela (sandaran beludru merah,
lengkung emas, mahkota menyembul di atas kepala Pion), tirai di belakang tahta, dua jendela kaca patri,
langit-langit melengkung **kotak-kotak emas** (panel merah marun, rosette emas, rusuk emas), list emas,
lampu gantung kap kuningan menghadap ke bawah, obor, peti harta + koin, patung batu catur (kuda, benteng,
gajah, ratu, raja), kabut tipis. **Garis tinta hitam (Freestyle)** di semua benda (siluet, tepi, lipatan).
Framing: Pion sekitar 60% tinggi frame, seperti video Pion biasa. 9:16 dan 4:5 punya framing sendiri.

## Langkah manual (kalau mau atur sendiri)
1. **Background + bayangan + posisi Pion**
   ```bash
   /opt/bpyenv/bin/python build_castle.py -- --out bg.blend --render bg.png --res 1080x1350 --samples 64 \
       --proxy --bbox bg.json --lightpass lp.png --mood chandelier --emotion marah
   ```
   `--proxy`: model Pion Blender tak terlihat kamera, tapi menjatuhkan bayangan. `--bbox`: posisi Pion di layar.
   `--lightpass`: peta cahaya ruangan di tubuh Pion. Opsi lain: `--novolume` (tanpa kabut, lebih cepat),
   `--no-outline`, `--hull-outline` (outline gaya lama, hanya perabot), `--mood warm|window|chandelier`.
2. **Pion engine** dengan cue `light` yang cocok (contoh di `PRESETS` dalam `emotion_sheet.py`):
   ```
   frame full
   light dir 0 -.45 .9 key .85 .2 .1 amb .22 .1 .08 rim .45 .08 .04 exp 1
   0.0 marah
   ```
   `node react_render.js --audio vo.wav --cues cue.txt --out eng --png` (di `~/pion/pion_raja`).
3. **Gabung**
   ```bash
   python3 comp_pion.py --bg bg.png --bbox bg.json --fg eng_frames/00010.png --light lp.png \
       --ref 75 --floor .38 --top 1.5 --sat 1.05 --tint 1.04,.94,.92 --contrast 1.08 --out final.png
   ```
   `--relight` kekuatan cahaya ruangan, `--bands` jumlah tingkat cel (0 = halus), `--wrap` light wrap,
   `--contact` bayangan kontak, `--grain`, `--dx/--dy/--scale` geser/skala Pion.

## Untuk video
Kamera background diam per adegan: render background + peta cahaya **sekali per mood**, lalu tiap frame
Pion engine digabung dengan `comp_pion.py`. Ganti ekspresi = crossfade ke plate mood berikutnya.
Peta cahaya mengikuti pose diam Pion. Gesture besar (tangan) tetap kena cahaya dari peta yang sama.

Micro zoom tiap beberapa kata untuk hasil istana: `python3 ../engine/microzoom.py --in hasil.mp4 --out hasil_zoom.mp4
--cues cues.txt --bbox bg.json` (pusat zoom di wajah Pion dari `--bbox`).

## Catatan
- Render memakai CPU (tanpa GPU): 1080x1350 64 sampel sekitar 5 menit, peta cahaya sekitar 30 detik.
- Model Blender `build_pion.py` hanya dipakai sebagai bayangan/peta cahaya. Proporsinya harus sama dengan
  engine (mahkota tidak diperbesar). comp_pion.py juga menaikkan "pulau" gelap yang terkurung area terang
  (tengah kepala yang sedikit lebih gelap), jadi tidak muncul titik gelap di wajah.
- `build_pion.py` / `build_pion_toon.py` juga bisa dipakai sendiri: Pion versi Blender realistis / kartun.
