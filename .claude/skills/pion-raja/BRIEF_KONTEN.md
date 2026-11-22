# Brief konten Pion (WAJIB dibaca sebelum video berikutnya)

Rangkuman **semua arahan user** dari proyek "The Photograph" (sesi 1 + 2, Nov 2026) dan cara memenuhinya.
Video ke-2 harus memenuhi semuanya sejak awal, tanpa menunggu user mengoreksi lagi.
Kode yang sudah disetujui: `examples/proj10_photograph/` (template) dan `projects/the_photograph/` (proyek lengkap).

## 1. Cara kerja
- **Bahasa:** bicara dengan user dalam **Bahasa Indonesia**.
- **Format:** 1080x1920, **60 fps**.
- **Cek sebelum kirim:** lihat contact sheet / frame kunci sendiri sebelum mengirim apa pun. Kirim lewat **SendUserFile dari scratchpad**.
- **Git:** jangan buat PR. Commit dan push ke branch kerja **sesering mungkin** (container bisa hilang). Jangan commit frame mentah.
- **Alur per adegan:** plan + cue → commit → render engine (lip-sync VO) → render scene (pecah rentang frame) → contact sheet → perbaiki → commit.
- **Proses latar:** maksimal 2 jam per proses. Pakai `nohup` + file penanda selesai. Perintah tunggu yang panjang sering dihentikan aplikasi:
  cek cepat, atau jadwalkan check-in.
- **Sebelum mulai,** tanyakan hal yang benar-benar keputusan user (contoh dari sesi ini: hook sudah oke? pakai caption?).

## 2. Karakter
- **Gaya 2D, seperti 15 video referensi** (karakter gambar datar di dalam dunia 3D). **Jangan diganti jadi model 3D**: user menolak, harus tetap terlihat 2D.
  Engine `style2d` (bentuk rata, cahaya hanya di pakaian, outline tinta, lengan garis tipis).
- **Karakter harus benar-benar ADA di dalam dunia 3D, bukan ditempel:**
  - **Bayangan jelas** jatuh ke lantai dan dinding. Di video 1 bayangannya "hampir gak ada", dan itu keluhan utama.
  - Ikut **cahaya set:** warna lampu, strobo, god ray, lampu bawah.
  - **Tertutup objek** di depannya: meja, kalender, kusen, garis polisi.
  - **Tidak ada potongan kotak / garis lurus** di badan karakter.
  - Interaksi **fisika:** lompat parabola, debu, benda jatuh dengan gravitasi.

  Caranya: `charlayer.js`. Lihat `PANDUAN_INTEGRASI3D.md` dan papan `REFERENSI_INTEGRASI.jpg`.
- **Pakaian lebih cartoonish** (masukan untuk konten berikutnya): siluet tebal dan dibesar-besarkan (topi, kerah, kancing besar), blok warna cerah dan sederhana,
  kotak-kotak besar (bukan tekstur kain detail), jahitan tebal. Ubah di `outfitKit`/`outfitParts` (`engine/render.js`) dan tekstur cape/topi detektif.
- Pion Raja: kepala merah bergradasi oranye, badan merah, sarung tangan putih. Kostum detektif di seri ini. Bidak lain tidak pernah merah.
- **Nama di dalam video: "SUCCIFY"**, jangan "Pion Raja" (papan pintu, email, teks lain).

## 3. Dunia / set
- **Dunia dibuat seukuran badan karakter. Karakter tidak dikecilkan.** Kursi pas badannya, meja setinggi dadanya, props seukuran sarung tangannya,
  pintu/rak/plafon/papan untuk tinggi Pion (~1,03 m). Berlaku untuk semua set.
- Data kasus didekatkan ke karakter (di meja/objek dekatnya). Kamera zoom ke data, **karakter tetap terlihat** di frame. Jangan pergi jauh ke dinding.
- Lingkungan mengikuti `PANDUAN_SINEMATIK.md` §8: outline tinta, tekstur lukis bergaris, padat props bercerita, satu warna khas per lokasi.

## 4. Kamera dan cahaya
- Kamera terbang kontinu: gerak besar tiap ~1,65 dtk, ease sinus ~0,6 dtk, drift push-in. Hampir tanpa cut biasa. Transisi tembus objek (foto, kaca pembesar, kaca jam, layar).
- **Mood cahaya membangun tensi:** `normal` → `tension` (biru naik) → `conflict` **tepat di kata belokan** ("Then Friday": biru pekat, strobo, petir)
  → `reveal` **tepat di kata twist** ("It was me": gelap, cahaya bawah dingin). Selain di kata belokan, di-blend pelan.
- Hook: spotlight pada karakter, lampu menyala tersendat. **Tanpa stempel "CASE SOLVED"** (user minta dihapus).

## 5. Teks
- **Tanpa caption** satu kata. Teks overlay Remotion hanya untuk **data penting**, dengan item `word` (besar, tebal, outline tinta):
  jam "11:42", "FRIDAY", "NO BODY / NO BLOOD / 0 FINGERPRINTS", nama + label ("DANIEL CROSS" · "MISSING · 5 YEARS").
- Teks di dalam dunia 3D (layar laptop, poster, kalender, tulisan tangan di foto) boleh berupa tekstur. Tulisan tangan memakai font Caveat.
- Pastikan teks yang dipegang/dibaca **masuk frame utuh** (tidak terpotong tepi 9:16).

## 6. Audio
- **Voice-over harus jauh lebih keras** (user: volume VO 100 → 1000). Patokan: VO -13 LUFS (kompresi ringan),
  **backsound musik sesuai genre** -24 LUFS (~11 dB di bawah VO), SFX + ambience -25 LUFS, limiter -1,5 dBTP, total ≈ -13,5 LUFS.
- **Backsound wajib ada.** Untuk misteri: pizzicato/piano penasaran → ostinato suspense + detak jam (mulai penggeledahan sampai belokan)
  → kotak musik mencekam saat twist.
- SFX ElevenLabs untuk setiap aksi + selalu kirim **`sfx_only.wav`** (musik + SFX tanpa VO).
- Akun ElevenLabs gratis: **tidak ada Music API**. Buat musik dari SFX v3 `loop: true` (≤30 dtk per bagian). **Kuota kredit hampir habis**
  (9.207 dari 10.000 per 22 Nov 2026): rencanakan dulu daftar suara, pakai ulang `projects/the_photograph/assets/sfx/`.

## 7. Jebakan teknis yang sudah ketemu (jangan diulang)
- Kartu tanpa depth test → karakter menutupi kalender. Clipping plane meja → potongan lurus "kotak". Pakai `charlayer.js`.
- Bibir alas gambar 2D sedikit di bawah titik kontak → tertanam di lantai saat depth test. `charlayer` menggeser kartu ke arah lensa (`push` 0,2).
- Bayangan proxy: pass bayangan three r186 mengambil `map`/`alphaTest` dari **material proxy**, jadi set di situ. Lampu statis di-bake tanpa proxy (`bake()`),
  satu lampu dinamis per set memperbarui bayangan karakter tiap frame.
- **Pilih lampu bayangan yang memang dominan di posisi karakter** (lampu jalan di sebelahnya, bukan matahari yang terhalang gedung), supaya bayangannya terlihat.
- Kartu menghadap kamera dan lampu dari belakang → tidak tersinari. Pakai cahaya dua sisi ("paper cut-out", sudah di `charlayer`).
- Lampu titik di apartemen butuh `castShadow` supaya cahayanya muncul (bug swiftshader). Bake sekali per versi.
- Transmission material + lampu intensitas 0 + bayangan per frame = render 5x lebih lambat. Bake bayangan statis, matikan lampu 0.
- Engine 4K: track tersimpan dalam piksel acuan 1080 (`render_seq` menskalakan). Cue `paperimg <file>` **tanpa waktu** di depannya.
- Remotion menyalin folder public: frame film harus **hardlink**, bukan symlink.
- Volume/teks: cek VO di jeda (musik terdengar?) dan ukur LUFS sebelum kirim.
