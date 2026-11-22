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

## 3. Status (sesi 2)
| Bagian | Status | Lokasi |
|---|---|---|
| Kantor skala Pion (kursi wingback, props x1,5, plafon 2,45, pintu SUCCIFY + cahaya celah, amplop, kalender THURSDAY/FRIDAY, laptop berlayar hidup, kaca pembesar melayang) | selesai | `src/scene/office.js` |
| Apartemen A/B/C (dunia foto sepia-biru / digeledah god ray / TKP Jumat strobo + garis polisi), jam beker retak 11:42, pantulan siluet bermahkota di kaca jam | selesai | `src/scene/apartment.js` |
| Eksterior senja (gedung No. 77, neon APARTMENTS, jendela 7B berpapan, poster MISSING DANIEL CROSS, hujan, kabel + burung) | selesai | `src/scene/exterior.js` |
| Foto anonim = still apartemen A (depan) + tulisan tangan "Find him before Friday." (belakang) | selesai | `src/tools/make_photo.py`, `src/scene/tex/` |
| Plan + cue adegan 1–13 | selesai | `src/plans/*.js`, `src/cues/*.txt` |
| Render adegan 1–2 (`s12`) | selesai | `~/pion/proj10/out/s12` (tidak di-commit) |
| Render adegan 3–13 | selesai | `src/tools/run_*.sh` (frame mentah di `~/pion/proj10/out`, tidak di-commit) |
| SFX ElevenLabs (25 suara) | selesai | `assets/sfx/*.mp3`, `src/sfx_gen.py` |
| Rakit film / overlay / mix | **selesai: v1 dikirim, lalu v2 (backsound misteri + VO jauh lebih keras) disetujui user** (22 Nov 2026) | `src/build_film.py`, `src/overlay_film.py`, `src/mix_film.py`, `src/assemble.sh` |

Peta adegan → plan (frame absolut, 60 fps): s12_office 0–510 · s23_apt 492–936 · s4_office 924–1266 · s5_ext 1260–1677 · s6_aptB 1674–2043 ·
s7_office 2040–2172 · s78_aptC 2166–2724 · s9_office 2724–3030 · s10_aptA 3018–3264 · s1113_office 3258–4404. Transisi diatur di `build_film.py`.

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

### Tambahan sesi 2
- File kerja di `~/pion/proj10` **di-symlink ke repo** (scene/*.js, plans, cues, *.py, scene/tex). Runner node (`render_seq.js`, `render_office.js`) disalin.
- `render_seq.js`: satu plan bisa memakai set berbeda per frame (`set: office|apartment|exterior`), `--skip` melewati frame yang sudah ada.
- Kartu karakter di kantor sekarang di-depth-test terhadap **pass oklusi** (props di layer 2: kalender, laptop, kaca pembesar). Apartemen/eksterior belum: jangan taruh objek di antara kamera dan karakter di sana.
- **Masukan user untuk konten berikutnya** (sudah dirangkum di `.claude/skills/pion-raja/BRIEF_KONTEN.md`): karakter 2D (seperti referensi, BUKAN model 3D)
  yang benar-benar ada di dunia 3D dengan bayangan jelas dan cahaya set (`charlayer.js`, `PANDUAN_INTEGRASI3D.md`), pakaian lebih cartoonish,
  VO jauh lebih keras + backsound genre. Template: `.claude/skills/pion-raja/examples/proj10_photograph/`.
- `charlayer.js` sudah terpasang di ketiga set di repo ini dan sudah diuji (still), tapi **video yang dikirim (v2) masih memakai versi lama** (kartu tempel).
  Render ulang dihentikan atas keputusan user: v2 sudah oke, integrasi untuk video berikutnya.
- Kecepatan: kantor ~3 dtk/frame (3 job), apartemen/eksterior lebih berat. Bayangan apartemen/eksterior di-bake (`shadowMap.autoUpdate = false`), tanpa transmission, lampu intensitas 0 dimatikan.
- Font tulisan tangan: Caveat (`assets/fonts`, dipasang oleh setup.sh).
- Rakit: `python3 build_film.py --check` → `python3 build_film.py` → `python3 overlay_film.py` → `python3 mix_film.py` → mux (lihat akhir HANDOFF).

## 5. Riwayat singkat yang relevan
- proj9 (patung tanah liat, Thailand) v2 sudah dikirim. Kodenya ada di skill `examples/proj9_clay/`.
  Green screen kata-kata bos dan semprotan ludah ada di `GreenFX.tsx`.
- Analisis referensi: cahaya, cahaya di model, environment, dan kamera, semuanya di `PANDUAN_SINEMATIK.md`.
