# Perintah siap-pakai: suruh AI membuat dunia 3D Pion

Salin blok di bawah ke AI (Claude Code). Isi bagian dalam `[...]`, lampirkan video, sketsa, dan zip skill
Pion terbaru. Panggil skill-nya di pesan yang sama supaya langsung dimuat.

```
/pion-raja /threejs-fundamentals /threejs-geometry /threejs-materials /threejs-textures /threejs-asset-pipeline /remotion-best-practices /elevenlabs-sound-effects

Ini video baru [lampirkan video]. Ada layar putih untuk adegan Pion. Buatkan dunia 3D animasinya.

Narasi:
N: [teks narasi utama]
P: [baris-baris Pion]

Storyboard (sesuai sketsa yang aku kirim, urut):
- Putih 1: [contoh: Pion menjelaskan di luar kerajaan, di belakangnya [benda] baru terlihat sebagian.
  Di kata "[kata]" kamera zoom out sampai [benda] terlihat penuh dan Pion jadi kecil. Pion membesar di sampingnya,
  lalu teks Remotion menjelaskan angka [angka] dengan garis ukur yang menempel ke bendanya.]
- Putih 2: [contoh: Pion di dalam istana soktahu membaca buku [judul], lalu transisi ke [tempat], Pion menunjuk
  [benda]. Di kata "[kata]" [benda] berubah bentuk menjadi [bentuk], angka [angka] menghitung naik, lalu
  [benda pembanding] jatuh satu per satu dengan efek gempa, label 1-2-3.]
- Pose khusus: [contoh: pose 1:1 seperti foto orang yang aku kirim].

Aturan wajib:
1. Baca ATURAN.md dan PANDUAN_DUNIA3D.md di skill pion-raja dulu. Pakai examples/proj7 sebagai template
   (scene/scene.js, render_scene.js, overlay.py, sfx/build_sfx.py, assemble.py).
2. Kualitas harus setara latar istana: AgX punchy, GTAO, garis tinta ala Freestyle dari depth + normal, kabut,
   bayangan matahari golden hour, bump map, bloom hanya untuk lampu, vignette. Bentuk bangunan bergaya kartun
   (sudut membulat, warna cerah, atap kubah atau kerucut), tapi grafiknya HD 3D. Latarnya di tengah kota yang
   ramai monumen dan gedung, bukan tanah kosong.
3. Pion adalah render engine asli (billboard). Cahaya Pion (cue `light`) harus searah dan sewarna dengan matahari
   scene. Bayangannya jatuh ke dunia, ada bayangan kontak di kaki, dan Pion digabung sebelum color grade.
4. Semua teks penjelas pakai Remotion (komposisi SceneOverlay): garis ukur dan angka menempel ke titik 3D lewat
   pts.json, angka menghitung, lencana pop dengan gempa, caption yang tidak menabrak Pion.
5. Fakta yang diucapkan Pion harus dicek ke sumber. Jangan mengarang angka.
6. SFX ElevenLabs untuk setiap aksi (satu request per suara), plus sfx_only.wav terpisah.
7. Output 1080x1920, 60 fps. Sebelum render penuh, kirim render uji beberapa frame kunci. Setelah render, review
   contact sheet dan perbaiki dulu baru kirim.
8. Kirim dulu sampel 10 detik (5 detik dari putih 1, 5 detik dari putih 2) sebelum video full.
```

## Tips untuk hasil terbaik

- Kirim sketsa per shot dengan label urutan (gambar 1, 2, 3, ...) dan tulis kata pemicunya di storyboard.
- Untuk pose yang harus mirip foto, kirim fotonya dan tulis "pose 1:1".
- Untuk perubahan bentuk (misalnya bulat menjadi datar), kirim sketsa tahapannya. Itu cukup sebagai referensi
  gerak dan tidak perlu tampil di video.
- Kalau kredit ElevenLabs habis, ganti key lewat formulir network secret (minta AI-nya membukakan).
