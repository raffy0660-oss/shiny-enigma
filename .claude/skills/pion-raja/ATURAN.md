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
15. **Istilah penting = teks Remotion**: saat Pion menyebut istilah/nama/angka penting (misal "trichorrhexis nodosa"),
    tampilkan callout elegan dengan cue `<t> callout <dur> "ISTILAH" ["subjudul"] [top|bottom] [label="..."]`
    (label emas kecil, huruf muncul satu per satu, garis emas tersapu, subjudul). Ramai tapi rapi: maksimal 1 callout
    sekaligus, mulai tepat saat kata itu diucapkan, taruh di area yang tidak menutupi wajah Pion (biasanya `top`).
16. **Kamera template, selalu di tengah**: micro zoom pola 3x zoom in lalu 1x zoom out (`<t> autozoom 2 1 pola`: 1,12x ->
    1,24x -> 1,35x -> 1,0x, berulang), sedikit motion blur kamera dan getaran halus. **Saat Pion bicara, mukanya selalu
    di TENGAH frame** (kamera mengikuti muka yang di-track per frame, ikut goyang/lompat). Tidak boleh zoom ke samping
    model (offset pojok sudah dihapus; yang tersisa cuma kemiringan dutch).
17. **Audio kelas profesional**: musik latar yang cocok dengan karakter (ceria, jenaka, pizzicato/bassoon/glockenspiel) di
    bawah suara dan ducking saat Pion bicara, plus SFX ElevenLabs (`eleven_text_to_sound_v3`) untuk setiap aksi. Akun
    free tidak bisa memakai Music API: buat musik loop dengan SFX v3 (`loop: true`, sampai 30 detik).
18. **Zoom ke barang = barang di tengah**: setiap Pion menunjukkan/memegang barang, kamera zoom cepat dengan barang itu
    tepat di tengah frame (`<t> zoomitem <coin|pouch|book|floorbook|sebum|button|handL|handR> 1.3 0.3`, posisi barang
    di-track engine per frame), lalu langsung zoom out (`<t> zoomto 1.0 0 0 0 0.3`) dan kamera kembali ke muka.
    Jangan pakai offset `zoomto` kira-kira untuk barang.
19. **Pion sedikit lebih besar** di istana: `castle_video.py --pscale 1.12` (diskalakan dari titik alasnya).
20. **Gaya sinematik referensi user wajib** untuk video full animasi / dunia 3D: ikuti `PANDUAN_SINEMATIK.md` (spotlight saat hook,
    malam biru + 1 lampu hangat saat "But / Until one night", flash putih lalu hangat saat payoff, kamera terbang kontinu tiap ~1,65 dtk
    dengan ease sinus 0,6 dtk dan drift push-in 2%/dtk, lampu praktis + god ray + DOF, bayangan biru bukan hitam).
21. **Tangan bidak muncul hanya saat dibutuhkan**: bidak (Pion, maling, karakter lain) boleh punya tangan, tapi tangan
    muncul (pop in dengan pegas) hanya saat ada aksi tangan: meraih, meninju, memegang, menulis. Saat tidak dipakai
    (turun di tali, melompat, berdiri) tangan hilang. Rig maling museum: `F.thief.arms` (0..1).
22. **Benda yang DIBACA Pion menghadap Pion sendiri, BUKAN kamera**: buku yang dibuka, HP, kertas, layar: halaman /
    layarnya ke arah mata Pion, kamera melihat sampul belakang / punggung HP. Judul buku ditaruh di sampul luar supaya
    tetap terbaca dari kamera (`gest catat`: buku DEATH NOTE, halaman ke Pion, judul di kedua sampul luar).
    Kalau isi halaman / layar perlu terlihat penonton, pakai shot insert dari balik bahu Pion, jangan memutar bendanya.
24. **Ikuti PANDUAN_REFERENSI_DETEKTIF.md** untuk video detektif/explainer: ganti fokus kamera tiap 1-2 dtk, smash zoom ke benda di katanya, POV+HUD untuk rekaman, grade low-key misterius (bukan terang) dengan subjek tetap disorot, iris di beat tegang, close-up reaksi. TANPA garis konsentrasi (lihat 25).
23. **Gerakan aksi pakai fisika, bukan lerp keyframe**: tali = bandul (gravitasi, panjang tali berubah, efek Coriolis),
    berhenti di tali = pegas teredam (sedikit mantul), rotasi badan = inersia + redaman, puntiran tali = pegas torsi,
    tinju = impuls + hentakan balik, tangan = pegas mengikuti target. Lihat `projects/the_mona_lisa/src/plans/heist_sim.js`.
25. **Zoom = zoom saja, tanpa garis-garis** (garis konsentrasi radial / speed lines TIDAK ada di referensi, jangan dipakai).
    Zoom harus berangkat dari framing yang AGAK JAUH dulu, supaya saat zoom masuk benar-benar terasa "menampilkan sesuatu"
    (reveal). Jangan zoom dari framing yang sudah dekat.
26. **Kamera jangan terlalu dekat** (kelemahan terbesar versi kita). Pola referensi: karakter awalnya besar (close / medium),
    lalu kamera bergerak mundur / naik sehingga karakter jadi kecil dan lingkungannya terlihat (wide reveal). Setiap shot
    punya ruang di sekitar subjek; close-up hanya untuk beat reaksi, dan tidak berturut-turut.
27. **Tidak ada hard transition antar scene.** Pergantian latar selalu menyambung secara logis, latar 1 dan latar 2 punya
    hubungan di dalam dunia ceritanya, contohnya:
    - latar 1 berubah jadi **foto / layar / lukisan / poster** yang ada di latar 2 (kamera mundur dari foto itu);
    - latar 1 adalah **ruangan di dalam bangunan** yang berdiri di lingkungan latar 2 (kamera keluar lewat jendela / pintu,
      terbang mundur sampai bangunannya kelihatan, lalu turun ke latar 2); atau sebaliknya masuk lewat jendela;
    - latar 1 terlihat **di layar CCTV / HP / laptop** di latar 2, atau di **pantulan** (kaca, genangan, mata);
    - benda yang sama menyambungkan dua latar (match cut bentuk/benda: bulan -> lampu, bingkai kosong -> bingkai foto).
    Rencanakan rantai transisi ini di storyboard SEBELUM membangun set (set yang bersebelahan / bersarang dibangun dalam
    satu dunia 3D supaya kamera bisa terbang kontinu dari satu ke yang lain).
28. **Naskah, audio, dan packaging mengikuti `PANDUAN_VIRAL.md`** (hasil ukur 14 video referensi): kata pertama
    di ≤ 0.2 dtk; kalimat 1 = tindakan paling aneh yang konkret; tokoh yang meremehkan + 1 dialog lucu; re-hook
    "Wait…?" di 30–55%; pivot "You see," + analogi di 65–82%; payoff ironis yang mengulang pembuka; 3.6–3.8 kata/dtk
    tanpa jeda > 0.3 dtk; master -14 LUFS; video habis ≤ 0.25 dtk setelah kata terakhir, tanpa fade. Isi checklist di
    bagian H sebelum render.
