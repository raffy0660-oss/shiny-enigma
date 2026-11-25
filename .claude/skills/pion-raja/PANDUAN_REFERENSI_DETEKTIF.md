# Pelajaran dari 14 video referensi detektif / explainer (Drive: "Referensi Detektif.zip")

Diukur dari videonya (ffmpeg scene detect + contact sheet tiap ~1,2 dtk + strip 5 fps):
14 video kartun 3D (karakter stick-figure di dunia 3D penuh warna), 56-78 dtk, 720x1280 30 fps.
(Video live action berbahasa Indonesia di zip itu salah kirim: BUKAN referensi, jangan dipakai.)

## Yang mereka lakukan (dan dulu belum ada di versi kita)
1. **Hampir tanpa hard cut** (0-1 cut per video). Satu dunia yang menyambung; kamera terus bergerak dan berganti fokus
   tiap 1-2 dtk (push, orbit, tilt, terbang lewat jendela/pintu). Pergantian tempat: dissolve 0,2 dtk atau
   whip-pan dengan motion blur (blur vertikal di strip 5 fps), bukan potong keras.
2. **Smash zoom ke benda kunci tepat di katanya** ("ticket" -> tiket memenuhi layar dalam ~0,15 dtk, lalu ditahan
   dengan drift kecil). Benda bukti selalu dibesarkan sampai terbaca.
3. **Close-up wajah memenuhi ~60% frame** untuk reaksi (kaget, keringat, mata), dengan dorong pelan.
4. **Warna bersih; adegan gelap tetap terbaca** lewat kolam cahaya, rim light, siluet di depan jendela terang, warna aksen kuat.
   CATATAN USER: untuk detektif JANGAN terang - harus misterius / tegang (grade low-key, bayangan teal, vignette dalam, grain),
   subjek tetap disorot lampu scene.
5. **Data jadi benda di dunia yang ikut VO**: counter 0299 -> 0300, timestamp, papan "OUR WINNERS", label 3D
   ("CLERKS / EVERYONE ELSE"), sertifikat kematian sebagai insert besar.
6. **POV layar dengan HUD**: dashcam (REC, kecepatan, jam) full screen; dipakai untuk "rekaman".
7. **Label 3D di dalam dunia**, bukan grafis tempel: papan / tulisan menempel di benda ("OUR WINNERS", "PRIZE CLAIMS").
8. **Cutaway / diorama**: potongan tanah (peti di bawah tanah), tampak atas meja / dinding foto untuk menjelaskan.
9. **Over-shoulder dialog** dengan kepala karakter depan besar dan blur; karakter keluar frame lewat pintu (blocking).
10. **Iris / spotlight** di beat penting ("But..."): sekeliling gelap menyempit ke wajah / benda; **bingkai latar depan** (jeruji, kusen, jendela bulat) untuk kedalaman; **insert waktu** (kalender, jam).
11. **Caption 1 kata**, putih tebal + outline hitam, di tengah agak bawah, ganti tiap kata.

## Yang sudah dipakai di "The Mona Lisa Heist" v3 (contoh implementasi)
- `post_film.py`: grade low-key misterius (v4; v3 terlalu terang menurut user); iris di beat tegang; (garis konsentrasi v4 DITOLAK user: tidak ada di referensi); smash zoom 0,14 dtk di kata kunci (hook, technician,
  disappeared, hatch, footprints, waiting, card, director); POV CCTV + HUD (REC, CAM 01, jam berjalan, scanline, noise).
- Shot rekaman CCTV = POV kamera plafon, hitam putih (`F.bw`, `cctvPov`).
- Remotion `SceneOverlay`: `word` ("UNTOUCHED"), `cuts` = flash zoom-blur di tiap ganti lokasi. (Item `ring` ada di komponen
  tapi tidak dipakai di film ini: lingkaran merah berasal dari video yang salah kirim.)

## Wajib untuk video berikutnya
- Ganti fokus kamera tiap 1-2 dtk tanpa hard cut di dalam satu lokasi; ganti lokasi pakai whip/zoom-blur atau dissolve.
- Setiap kata benda penting di VO = smash zoom / insert besar benda itu.
- Minimal 2-3 close-up reaksi Pion per menit.
- Grade low-key misterius untuk cerita detektif, tapi subjek selalu disorot (jangan keruh tanpa titik terang).
- Rekaman / layar = POV full screen dengan HUD.

## Koreksi user setelah v4 (wajib untuk konten berikutnya; lihat ATURAN 25-27)
- **Tidak ada efek garis-garis saat zoom.** Zoom murni. Mulai dari framing agak jauh agar zoom terasa sebagai reveal.
- **Kamera terlalu dekat = kelemahan utama kita.** Referensi: karakter besar di awal, lalu kamera mundur sampai karakter
  kecil di dalam lingkungannya. Beri ruang di sekitar subjek.
- **Tanpa hard transition.** Latar berpindah lewat hubungan di dunia cerita: latar 1 jadi foto/layar di latar 2, ruangan
  (latar 1) ada di dalam bangunan di lingkungan latar 2 (kamera keluar jendela -> bangunan -> lingkungan), pantulan, match
  cut benda. Storyboard menulis rantai transisi ini lebih dulu, set dibangun bersambung dalam satu dunia.

