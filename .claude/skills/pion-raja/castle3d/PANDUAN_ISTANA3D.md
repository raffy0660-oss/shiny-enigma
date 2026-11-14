# Pion Raja di istana 3D (gaya game AAA)

Karakter Pion **tetap Pion asli dari engine** (outline, wajah flat, ekspresi, gesture, karaoke).
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
