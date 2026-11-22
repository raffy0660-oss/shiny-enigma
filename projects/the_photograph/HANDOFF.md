# Serah-terima: seri detektif Pion Raja, episode "The Photograph"

Dokumen ini merangkum **semua yang sudah direncanakan, dibahas, dan diputuskan** bersama user (sesi Nov 2026), supaya sesi baru
bisa melanjutkan tanpa kehilangan konteks. Bacaan wajib, berurutan:
1. Dokumen ini.
2. `PLAN.md`: 13 adegan dengan timing asli VO.
3. Skill `pion-raja`:
   - `.claude/skills/pion-raja/SKILL.md`
   - `ATURAN.md`
   - **`PANDUAN_SINEMATIK.md`** (§1–8)
   - `PERUBAHAN.md` (bagian v6)

## 1. Aturan kerja dari user (wajib)
- **Bahasa:** bicara dengan user dalam **Bahasa Indonesia**.
- **Format:** **1080x1920, 60 fps**.
- **Review:** cek **contact sheet / frame kunci sebelum mengirim**. Jangan kirim tanpa melihat hasilnya sendiri.
- **SFX:** dari ElevenLabs (`eleven_text_to_sound_v3`, lewat proxy, header `xi-api-key: dummy`), **plus `sfx_only.wav` terpisah**.
- **Teks:** semua teks overlay dibuat di **Remotion** (`castle3d/remotion/src/SceneOverlay.tsx`). Teks di dalam dunia 3D (papan, poster) boleh berupa tekstur.
- **Fakta:** jangan mengarang fakta. Cerita detektifnya fiktif dari narasi user, jadi ikuti narasinya.
- **Git:** jangan buat PR kecuali diminta. Commit dan push ke branch kerja. **Simpan pekerjaan ke repo sesering mungkin** (container sesi bisa hilang).
- **Pengiriman hasil:** taruh deliverable di scratchpad, lalu kirim dengan SendUserFile. Email user privat, jangan dicantumkan di mana pun.
- **Proses latar:** maksimal 2 jam per proses. Render panjang harus dipecah per rentang frame (`--from/--to/--frames`) lalu dilanjutkan.

## 2. Keputusan gaya (final sampai user minta lain)
- **Referensi:** 15 Shorts dari user (zip "Referensi Detektif.zip" di Google Drive user: 14 animasi stick-figure + 1 footage asli).
  Hasil analisisnya ada di `PANDUAN_SINEMATIK.md`, papan `REFERENSI_*.jpg`, dan alat analisis di `tools/refs_analysis/`.
  **Video 14** ("Why the Second Draw Always Wins") adalah patokan kualitas karakter.
- **Model 2D** (cue `style2d`, v4):
  - Kamera ortografis setinggi mata.
  - **Bentuk dasar (kepala, badan polos, bentuk bidak) rata tanpa volume.**
  - **Cahaya, bayangan inti, dan strip highlight hanya di pakaian dan aksesoris.**
  - Bayangan jatuh grafis bernuansa dingin: topi/mahkota di dahi, kepala di kerah.
  - Garis wajah hampir hitam, outline hitam x1,3, lengan garis tinta tipis.
- **Pion Raja:** kepala **merah bergradasi oranye** (bukan oranye rata), badan merah, mahkota emas, jubah, ermine, sarung tangan putih (ciri khas).
  Di seri ini Pion memakai kostum detektif (deerstalker, jubah kotak-kotak, monokel, kaca pembesar).
- **Bidak lain tidak pernah merah:**
  - Kuda: hitam arang
  - Benteng: biru
  - Gajah: ungu
  - Ratu: toska
  - Pion korban: gading
- **Baju:** hanya **Daniel** (pion gading: kemeja biru muda, rompi rajut mustard berleher V, dasi merah) dan **polisi**
  (benteng: seragam navy bertekstur, saku, jahitan, lencana, sabuk, topi di atas gerigi). Bidak lain **diberi baju nanti mengikuti cerita**
  (tambah di `outfitKit`/`outfitParts` di `engine/render.js`).
- **Cast:**
  - Pion Raja: detektif, narator "I"
  - Daniel Cross: korban
  - Officer Rook: polisi
  - Tersangka (kuda, gajah, ratu): belum dipakai di episode ini
- **Set kantor:**
  - Lampu gantung kap hijau menyorot tengah meja, dengan kerucut cahaya dan debu.
  - Berkas berserakan di meja.
  - Papan kasus berbenang merah di dinding, disinari lampu gambar kuningan.
  - Tirai dengan cahaya bulan biru, hujan di jendela.
- **Mood cahaya** (`applyMood` di `office.js`): `normal`, `tension`, `conflict`, `reveal`.
  User minta: **saat masuk konflik, cahaya harus berubah (biru, dll.) untuk membangun tensi semaksimal mungkin.**
  Mood patah tepat di kata belokan ("Then Friday", "It was me"); selain itu di-blend pelan.
- **Kamera:**
  - Gerak besar tiap ~1,65 dtk, durasi 0,6 dtk, ease sinus, drift push-in pelan.
  - Hampir tanpa cut biasa. Transisi tembus objek (foto, kaca pembesar, kaca jam, layar).
  - **Masukan user di tes hook:** jangan pergi jauh ke dinding. **Data kasus ditaruh di meja, kamera zoom ke meja, dan karakter tetap
    terlihat di frame.** Terapkan prinsip ini ke adegan-adegan lain: karakter jangan hilang terlalu lama.

## 3. Status
| Bagian | Status | Lokasi |
|---|---|---|
| VO 73,4 dtk + timing per kata | selesai | `vo.mp3`, `vo_stt.json` |
| Rencana 13 adegan | selesai | `PLAN.md` |
| Model 2D v4 + baju Daniel/polisi | selesai | skill `engine/`, `assets/karakter_2d/`, `assets/cast_sheet_2d_v4.png` |
| Set kantor + mood cahaya | selesai | `src/scene/office.js` (salinan di skill `examples/proj10_office/`) |
| **Tes hook 5 dtk v2** (data di meja) | selesai, dikirim ke user | `tests/t5_test_v2.mp4`, plan `src/plans/hook.js`, cue `src/cues/t5b_pion.txt` |
| Adegan 2–13 | **belum** | lihat `PLAN.md` |
| Set apartemen terbengkalai (A dunia foto / B digeledah / C TKP Jumat) | belum | buat `src/scene/apartment.js` (pola sama dengan `office.js`) |
| Eksterior gedung + jalan senja | belum | |

**Jawaban user (sesi 2, 22 Nov 2026):**
1. **Tanpa caption** satu kata. Teks overlay hanya untuk data penting (11:42, FRIDAY, kartu DANIEL CROSS, metadata, email).
2. Hook v2 **oke dengan revisi**:
   - **Furnitur dan environment dibuat seukuran badan Pion.** Pion tidak dikecilkan; dunia di sekitarnya yang dibangun untuk Pion
     (kursi pas badannya, meja setinggi dadanya, props seukuran sarung tangannya, pintu/rak/gantungan untuk tinggi Pion).
     Berlaku untuk semua set (kantor, apartemen, eksterior).
   - **Stempel CASE SOLVED dihapus.**
3. **Nama di dalam video = "SUCCIFY"**, bukan "Pion Raja" (kaca pintu kantor, email pengirim di adegan 13, teks lain). Nama karakter di kode/cue tetap pion.
4. Gambar Pion yang tersapu besar di depan lensa saat kamera lewat sudah dikurangi di v2. Pastikan tetap rapi.

## 4. Cara kerja teknis
```bash
bash projects/the_photograph/setup.sh                    # sekali per sesi: ~/pion/pion_raja, ~/pion/castle3d/remotion, ~/pion/proj10
# 1) render Pion (engine) per adegan, lip-sync ke VO:
cd ~/pion/pion_raja && node react_render.js --audio ../proj10/audio/vo.mp3 --start <t0> --dur <dur> --local \
   --cues ../proj10/cues/<scene>.txt --out ../proj10/eng/<name> --size 1080x1920 --png --bg green --blur 6 --jobs 3
#    cue penting: style2d | detective 99 | piece <pawn|rook|knight|bishop|queen> | outfit <daniel|police> | <ekspresi> | look yaw pitch roll | gest <magnify|point|...> dur kanan
# 2) render scene 3D dengan kartu Pion (oklusi meja lewat clipping plane):
cd ~/pion/proj10/scene && ENG=<name> node render_seq.js ../plans/<scene>.js ../out/<scene> --jobs 3 [--from a --to b]
#    plan.js: { N, frame(f) -> { t, cam:{pos,tgt,fov,focus}, mood, mood2, moodK, lampK, pion:{eng, anchor, height, tint} } }
# 3) overlay Remotion (stamp/caption/tag/pop/rage) + audio: contoh overlay_t5.py dan mix_t5.py
```
- **Kecepatan render:** scene kantor sekitar 13 dtk/frame per job, 3 job ≈ 14 frame/menit (5 dtk = ~20 menit). Engine Pion sekitar 6,5 menit per 5 dtk.
  Video penuh 73 dtk ≈ 4.400 frame scene, jadi pecah per adegan. Tiap adegan: commit plan + cue, lalu render.
- **Pion di scene:** kartu menghadap kamera, `anchor [0, 0.48, DESK.z - 0.42]`, `height 1.15`, `tint` mengikuti lampu/mood.
- **Remotion:** komposisi `SceneOverlay` (item `stamp` baru: stempel merah), `GreenFX` (green screen), dan `CastSheet`.
- **Google Drive:** konektor hanya bisa download file < 10 MB. File besar perlu user set "siapa saja yang punya link", lalu `curl` dari
  `drive.usercontent.google.com` (host ini kadang diblokir. Kalau gagal, minta user memecah file).

## 5. Riwayat singkat yang relevan
- proj9 (patung tanah liat, Thailand) v2 sudah dikirim. Kodenya ada di skill `examples/proj9_clay/`.
  Green screen kata-kata bos dan semprotan ludah ada di `GreenFX.tsx`.
- Analisis referensi: cahaya, cahaya di model, environment, dan kamera, semuanya di `PANDUAN_SINEMATIK.md`.
