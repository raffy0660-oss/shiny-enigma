Lanjutkan proyek video detektif Pion Raja, episode "The Photograph", di repo ini (branch `ccr-a35a51bf-0xh2wa`).

**Langkah awal:**
1. Baca berurutan:
   - `.claude/skills/pion-raja/projects/the_photograph/HANDOFF.md`: semua keputusan, aturan, status, dan cara kerja.
   - `.claude/skills/pion-raja/projects/the_photograph/PLAN.md`: 13 adegan dengan timing VO.
   - Skill `pion-raja` (`SKILL.md`, `ATURAN.md`, `PANDUAN_SINEMATIK.md` §1–8, `PERUBAHAN.md` v6).
2. Jalankan `bash .claude/skills/pion-raja/projects/the_photograph/setup.sh`.
3. Lakukan smoke test (render still kantor), lalu cek hasilnya.
4. Lihat `.claude/skills/pion-raja/projects/the_photograph/tests/t5_test_v2.mp4`. Itu tes hook 5 detik terakhir yang sudah kukirim. Gaya dan kualitasnya jadi patokan.

**Lanjutkan produksi, adegan demi adegan:**
- **Adegan 2** (4,56–10,24 dtk, "It all started when I received an anonymous photograph…"): amplop "NO SENDER" meluncur lewat celah pintu
  kantor, lalu Pion membukanya, lalu kamera menembus foto ke dunia foto (apartemen terbengkalai versi A, pudar, Daniel tergeletak).
  Untuk ini set apartemen perlu dibuat dulu: `src/scene/apartment.js` dengan pola sama seperti `office.js`.
  Versi A dunia foto, B digeledah (god ray, debu), C TKP Jumat (malam, sirene merah-biru, garis polisi).
  Ikuti panduan environment §8: outline tinta, tekstur lukis bergaris, padat props, satu warna khas.
- **Lalu adegan 3–13 sesuai `PLAN.md`.**
  Mood cahaya harus membangun tensi: `normal` → `tension` (biru naik, lampu tersendat) → `conflict` tepat di "Then Friday arrived" (biru pekat, sirene, petir) → `reveal` tepat di "It was me" (gelap total, cahaya bawah dingin).
  Prinsip dari user: data kasus didekatkan ke karakter (zoom ke meja/objek), karakter tetap terlihat, dan kamera terbang kontinu tiap ~1,65 dtk.
- **Setiap adegan:**
  1. Tulis plan + cue, lalu commit.
  2. Render engine Pion (lip-sync VO), lalu render scene. Pecah rentang frame karena proses latar dibatasi 2 jam.
  3. Cek contact sheet, perbaiki kalau perlu.
  4. Commit plan, cue, dan tes adegan ke repo. Jangan commit frame mentah yang besar.
- **Di akhir:**
  1. Overlay Remotion: stempel, 11:42, FRIDAY, kartu DANIEL CROSS, panel metadata, From: email, dll.
  2. SFX ElevenLabs + `sfx_only.wav`.
  3. Rakit 73,4 dtk 1080x1920 60 fps, kirim ke user.

**Sebelum adegan 2, tanyakan ke user (singkat, Bahasa Indonesia):**
1. Apakah tes hook v2 sudah oke?
2. Caption satu kata seperti di video referensi dipakai atau tidak?

**Aturan:**
- Bicara Bahasa Indonesia.
- Kirim hasil lewat SendUserFile dari scratchpad, dan cek dulu sebelum kirim.
- Jangan buat PR.
- Simpan semua pekerjaan ke repo sesering mungkin.
