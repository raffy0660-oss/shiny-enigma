# Eksperimen karakter manusia (sesi 28 Nov 2026)

Percobaan desain karakter manusia untuk konten baru, dengan target penonton Indonesia. Karakternya bukan Pion.
Contoh karakter yang dipakai: **Bang Udin** (tukang parkir) dan **anak SD**. Semua masih menunggu persetujuan user.

| Folder | Isi | Status |
|---|---|---|
| `1_sketsa/` | Sketsa 2D gaya video referensi (kepala bulat besar, badan kapsul, lengan garis). Isinya badan dasar 4 sudut, 8 warga Indonesia, dan 10 ekspresi. `sketsa.html` dirender lewat `render.js` (Playwright) | dikirim ke user |
| `2_pixel_voxel/` | Bang Udin versi **2D pixel sprite** dan **3D voxel** di set three.js gaya Pion (outline tinta, cahaya sore). `gen_char.py` menghasilkan `sprite.png` + `voxels.json`, `scene.html` adalah set-nya, `shot.js` driver render-nya | user minta gaya lain |
| `3_tiga_gaya/` | Bang Udin dalam 3 gaya di set yang sama: **paper cut-out**, **clay**, **low-poly retro** (`styles.html?style=paper\|clay\|lowpoly`). Ada juga versi "soft block" three.js (`block.html`) | user minta lebih mirip referensi |
| `4_blender_soft_block/` | Gaya **soft-block 3D** mengikuti gambar referensi user (blok bersegi lembut, tekstur cat, Cycles). `udin.py` = Bang Udin, `sd3.py` = **anak SD** (sedang dikerjakan: rambut jumputan, perbandingan `cmp_sd.jpg` di kiri referensi, kanan hasil). `ref_sd*.png` adalah potongan gambar referensi dari user | **terakhir dikerjakan** |

## Cara menjalankan

- three.js (folder 2 dan 3): taruh semua file folder 2 dan 3 dalam satu folder, lalu `npm install three@0.186.0`,
  `python3 -m http.server 8765`, dan `PAGE=styles.html node shot.js nama=style=clay,w=720,h=1000`.
- Blender (folder 4): pasang `bpy` sekali (`castle3d/setup.sh`, atau `python3 -m venv /opt/bpyenv && /opt/bpyenv/bin/pip install bpy==5.2.4`),
  lalu `/opt/bpyenv/bin/python sd3.py -- --view main|face|turn --res 1080x1600 --samples 128 --out sd.png`
  dan `python3 comp.py sd.png sd.jpg` (latar abu hangat seperti referensi).
  Render cepat untuk cek: `--res 480x900 --samples 32` (sekitar 25 detik di 4 core).

## Catatan dari user

- Target penonton Indonesia, cerita dengan plot twist. Saran konsep: Arisan 14 Kali, Peluit Tanpa Tukang Parkir, Wesel dari Bapak, Penumpang 23:47, 117 Pasang Sandal.
- User ingin karakter yang **semirip mungkin dengan gambar referensinya** (gaya blok 3D, karakter Indonesia: ojol, pemilik warung, anak SD, pegawai, tukang, kakek bersarung).
- Kerjakan **1 karakter dulu**, lalu tunggu approve user sebelum membuat yang lain.
