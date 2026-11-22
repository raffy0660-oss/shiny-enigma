# Arahan user, sesi 2 (22 Nov 2026), urut waktu

Arsip arahan user, dipakai sebagai acuan konten berikutnya. Rangkuman aturannya ada di `.claude/skills/pion-raja/BRIEF_KONTEN.md`.

1. **Mulai sesi.** Lanjutkan produksi "The Photograph" adegan demi adegan (plan + cue → commit → render engine + scene → contact sheet → commit).
   Akhirnya: overlay Remotion, SFX ElevenLabs + `sfx_only.wav`, rakit 73,4 dtk 1080x1920 60 fps, kirim.
   Aturan: Bahasa Indonesia, kirim dari scratchpad lewat SendUserFile setelah dicek, tanpa PR, simpan ke repo sesering mungkin.
   Sebelum adegan 2, tanyakan: hook v2 oke? Caption satu kata dipakai?
2. **Jawaban.** Hook v2 oke dengan revisi:
   - "Buat furniture, environment menyesuaikan badan Pion: bukan Pion yang dikecilkan, tapi sekitarnya yang dibuat untuk si Pion."
   - CASE SOLVED tidak perlu.
   - Tanpa caption.
3. **"Jangan pakai nama Pion Raja, pakai nama succify."** (di dalam video)
4. Kalender tertutup karakter. "Aku pengen kamu bener-bener masukkin karakternya ke dalam video agar kena efek fisikanya juga."
   Kalau harus render ulang, jadikan saran konten berikutnya dan masukkan ke repo; atau revisi saja bagian yang error.
5. "Buat karakternya benar-benar ada di dalam video, bukan cuma kayak ditempel tanpa hukum fisika, shadow, pantulan cahaya. Karakterku ada framenya bentuk kotak, kayak ada yang dipotong."
6. "Kasih backsound yang cocok untuk video misteri. Volume voice over buat 1000, yang awalnya 100."
   Saran konten berikutnya: karakter langsung di dunia 3D, cahaya dan shadow realistis, pakaian lebih cartoonish. "Sekarang lakukan perintah awal itu aja."
7. **"Oke dah bagus"** (v2 disetujui). Rangkum semua prompting + kode yang disetujui ke repo, supaya video ke-2 bagus:
   karakter masuk ke dunia 3D dengan cahaya dan shadow yang bagus, "bukan seperti video ini, bayangannya hampir gak ada".
8. **"Tapi aku masih mau keliatan kayak 2D"**, seperti 15 video referensi. Prototipe model 3D dibatalkan; arahnya `charlayer.js`.
9. "Lihat foto kiri bawah, peletakan kakinya, kayak gak nginjak tanah. Itu karena kamu cuma nempel, gak ngatur posisi. Kalau diambil dari sudut kamera
   yang gak sejajar, malah kayak dia lurus di depan kamera, tapi tanahnya agak turun." → Karakter digambar dari sudut kamera adegan
   (`make_view.js` + engine `--view` + kartu `faceCam`, lantai `userData.ground`). Lihat `REFERENSI_SUDUT.jpg`.
10. "Ternyata ada beberapa SFX yang volumenya kurang tinggi, buat serame mungkin videonya tapi tetap terasa misterius. Kasih caption: kalau narator
    yang ngomong, polos kayak referensi (How One Cart Stopped an Entire Army); kalau karakter dalam video yang ngomong, kasih nama, jadi nama
    'succify' terus bawahnya baru teks (seperti foto RAKA / TAKE SATU)." → v3: item `cap` (polos / bernama otomatis), SFX dinormalisasi + whoosh
    otomatis + riser + hit, level VO -13 / musik -22 / SFX -18 LUFS.
11. "Masih ada error sih, tapi gpp, gausah direvisi, masukin ke repo aja." → v3 masuk repo (`final/`), tidak direvisi.
12. "Di video itu, seharusnya cuma pakai sudut pandang narator, jadi gausah ada nama." → Semua VO di The Photograph adalah narasi (orang pertama),
    jadi caption semuanya polos. Label nama hanya untuk dialog di dalam adegan (`DIALOG` di `overlay_film.py`, aturan di `BRIEF_KONTEN.md` §5).
