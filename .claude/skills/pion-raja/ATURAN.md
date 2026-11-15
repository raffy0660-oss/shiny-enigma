# Aturan kerja dari user (WAJIB dibaca sebelum mulai project baru)

1. **Render 4K** (2160x3840) untuk hasil akhir.
2. **Cek video frame per frame**: sebelum mulai (pelajari semua frame video asli) dan sesudah render (review semua frame hasil akhir).
3. **Eye placement viewer**: taruh pion DI titik fokus tiap shot (tempat aksi / topik video terjadi), supaya
   penonton melihat poin video dan pion bersamaan dalam satu pandangan. Jangan taruh pion terpisah jauh / di pojok / area kosong.
4. **Pion harus terasa di dalam video**: berdiri di permukaan solid yang ter-track, dekat orang/objek utama, tidak melayang.
5. **Masuk tanpa spam teleport**: pakai lompat, jatuh dari atas, meluncur, terbang. Transisi antar scene harus halus (terbang ke kamera, zoom-blur).
6. **Interaktif semaksimal mungkin dengan isi video**: berinteraksi dengan orang/objek (misal: menampar bokong, menginjak-injak, ikut terseret, menggantung di alat).
7. **Saat pion bicara**: mulut/jelly mengikuti audio. Tanpa subtitle (subtitle dibuat terpisah di editor kalau perlu).
8. **Hook (clip awal)**: pion sedikit lebih besar dan masuk dengan dramatis.
9. Layar putih = scene full commentary (istana / tempat sesuai cerita), latar penuh tanpa kekosongan, kamera bergerak (zoom pelan, miring/dutch angle, tidak terlalu dekat).
10. Sound effect untuk setiap aksi pion (sfx.py), plus sfx_only.wav terpisah.
11. Ukuran pion jangan terlalu kecil maupun terlalu besar (kecuali hook / close-up).

Kode: pion_raja/ (engine, render, react mode, castle/hospital, sfx). Contoh lengkap: proj1/, proj2/ (plan_*.py, cues/, composite*.py).
12. **Kamera jangan monoton** (gaya v3.1, `engine/camplan.js` / cue `autozoom`): zoom bertahap 1,18x -> 1,34x -> 1,5x tiap
    2-3 kata, halus dan DITAHAN sampai titik zoom berikutnya (tanpa getar/overshoot), kata dengan `!` langsung 1,5x,
    tiap mood punya sudut + kemiringan sendiri, dan tiap ganti atmosfer kamera zoom out ke normal dulu.
13. **Tidak boleh ada yang terpotong border**: Pion (engine) adalah layer 2D yang ditempel ke istana 3D. Semua yang keluar
    dari jendela kamera engine (mahkota diangkat, tangan, props, karakter kedua) terpotong lurus. `castle_video.py`
    sekarang otomatis membuat jendela engine menutupi seluruh scene + margin (`--eframe auto`, resolusi ikut naik) dan
    mengecek setiap frame: kalau ada yang menyentuh tepi, engine dirender ulang dengan jendela lebih lebar. Jangan
    pakai `--eframe` sempit kecuali sudah dicek dengan `border_hits`.
14. **60 fps** untuk hasil akhir (motion lebih halus): `react_render.js` dan `castle_video.py` default `--fps 60`
    (simulasi engine memakai dt = 1/fps, kamera camplan dan Remotion ikut fps track). Footage asli 30 fps saat
    dirakit: jadikan 60 fps dengan `ffmpeg -vf minterpolate=fps=60:mi_mode=mci` (atau `fps=60` untuk duplikasi frame
    kalau interpolasi membuat artefak), lalu tempel scene Pion 60 fps di atasnya.
