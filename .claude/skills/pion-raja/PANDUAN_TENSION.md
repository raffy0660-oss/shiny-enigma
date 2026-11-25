# PANDUAN TENSION: detail terdalam dari 14 referensi untuk video detektif misterius

Lanjutan dari `PANDUAN_VIRAL.md` (naskah) dan `PANDUAN_KUALITAS.md` (kamera, gambar, caption). Panduan ini
berisi detail yang hanya terlihat kalau setiap frame dan setiap stem audio diukur, lalu toolkit yang
menerapkannya secara otomatis.

Catatan fps: file referensi aslinya **30 fps** (dicek dengan ffprobe), jadi tidak ada data 60 fps yang bisa
dilihat. Semua frame referensi dibaca (30 per detik), dan video kita dianalisa di 60 fps penuh.

Cara ukur:
- Per frame: kecerahan, kehangatan warna (R−B), saturasi, vignette (sudut ÷ tengah), ketajaman tengah dan
  atas (depth of field), rotasi kamera, dan getaran frekuensi tinggi.
- Audio dipisah menjadi 4 stem dengan Demucs (htdemucs: vokal, drum, bass, lainnya), lalu dianalisa dengan
  librosa.
- Semua kejadian dibandingkan dengan transkrip per kata. Setiap pola diuji terhadap kebetulan (waktu acak
  atau rata-rata semua kata), jadi yang tercatat di sini hanya yang lebih sering dari kebetulan.

Script: `tools/refs_analysis/{colortl.py, deep.py, audio.py}`.

## 1. Cahaya sebagai detak cerita

1. **Cahaya atau warna berubah besar (≥ 22 level luma) setiap ~3,6 detik**, median 10,9 kali per menit
   (rentang 3,8–15,4). Perubahan ini **2x lebih sering jatuh di awal kalimat** (44% dalam ±0,5 dtk dari awal
   kalimat, sementara waktu acak hanya 21%). Setiap kalimat baru terasa seperti "halaman baru".
2. **Arah perubahannya bergantian**, terang-hangat lalu redup-dingin. Mata tidak sempat terbiasa.
3. **Arc kecerahan seluruh video:** 1,00 1,06 1,06 1,00 **0,92 0,93 0,91** 1,05 1,04 1,05 (per 10% durasi).
   Bagian tengah (40–70%) paling gelap, tempat masalah memuncak. Mulai 70% (pivot "You see") gambar kembali
   terang. Mona Lisa v4 lompat-lompat tanpa pola: 0,99 0,75 1,19 0,99 1,00 0,52 0,89 2,15 0,97 0,55.
4. **Arc kehangatan:** pembuka hangat (+8), tengah dingin (−3 sampai −7), **lonjakan hangat besar di 70–80%
   (+20)** saat penjelasan atau rahasia terbongkar, lalu penutup dingin (−8). Rahasia = cahaya hangat.
5. **Kata "night" langsung mengubah siang jadi malam di lokasi yang sama**, tepat di kata itu (rata-rata −29,5
   luma). Malamnya biru navy dengan sumber cahaya misterius (cincin cahaya, jendela menyala, bulan). Planner
   kita menemukan kata itu dari transkrip, dan titiknya cocok dengan saat referensi benar-benar menggelap
   (selisih < 0,5 dtk di 4 video).
6. **Kata belok punya efek cahaya yang konsisten** (rata-rata semua kata = 0, jadi ini bukan kebetulan):

   | Kata | Luma | Kehangatan | Kecepatan kamera | Arah |
   |---|---|---|---|---|
   | "but" (30x) | −5,8 | −3,2 (lebih dingin) | ×1,42 | |
   | "then" (17x) | −1,4 | −7,6 | ×1,35 | 71% push-in |
   | "until" (11x) | +5,9 | +5,0 | **×2,19** | eskalasi |
   | "wait" (5x) | +5,6 | **+15,3** | ×0,77 | 80% push-in ke wajah |
   | "night" (6x) | **−29,5** | biru | ×0,85 | |
   | "everyone" (7x) | −2,8 | +4,1 | ×0,54 (melambat) | 86% push-in |

7. **Benda penekan waktu muncul di layar:** banner "OPENING TOMORROW", jam "until 6:00", "minutes until
   sunrise". Tenggat waktu yang terlihat menambah ketegangan tanpa kata tambahan.

## 2. Kamera yang hidup

8. **Banking roll:** kamera miring sekitar 32 kali per menit saat berbelok (median 3,8°, p90 12,9°,
   ~0,33 dtk per kejadian). Kita 15,6 kali per menit. Kamera yang ikut miring saat berbelok terasa seperti
   dibawa orang yang berlari, bukan rel robot.
9. **Getaran tangan halus:** residu frekuensi tinggi 0,76 px per frame di lebar 360 (≈ 2,3 px di 1080).
   Kita 0,28, hampir 3x lebih kaku.
10. **Gerak kamera TIDAK dikunci ke awal kata** (60% dalam ±0,1 dtk dari kata, acak 66%) dan hanya sedikit
    ke awal klausa (32% vs 27%). Kamera mengalir terus. Yang dikunci ke kalimat adalah **cahaya** (poin 1),
    bukan kamera.
11. **Vignette lembut:** sudut ÷ tengah = 0,79. Kita 0,40, terlalu berat sampai sudut frame hilang.
12. **Depth of field kuat:** ketajaman bagian atas frame hanya 0,09 dari bagian tengah (latar belakang blur,
    subjek tajam). Kita 0,33.
13. **Flash putih jarang**, 0–3 per video (6 dari 14 video), hanya di momen ledakan atau terbongkarnya rahasia.

## 3. Audio (dipisah per stem, 14 video)

| Ukuran | Referensi: median [rentang] | Mona Lisa v4 |
|---|---|---|
| Musik di bawah VO saat bicara | **20,8 dB** [16,7–22,8] | 11,9 dB (musik ~9 dB terlalu keras) |
| Musik terdengar | 99,7% waktu | 94% |
| Level musik di detik pertama / terakhir | +1,3 / +1,3 dB dari median (tanpa fade, tanpa swell) | −8 / **+16** dB |
| Arc level musik sepanjang video | datar ±1 dB | −5 sampai +4 dB |
| Arc drum | naik-turun ~9 dB (drum masuk-keluar) | |
| Tempo | 110 BPM [96–152] | 172 BPM |
| Onset per menit | 39 [13–56] | 15 |
| Hit di luar ketukan (SFX) per menit | **15,5** [1,9–27] (satu tiap ~4 dtk) | 1,6 |
| Energi bass < 120 Hz | 40% [19–73] | **78%** (gemuruh keruh) |
| Pusat spektrum musik | 606 Hz | 216 Hz |
| Lubang musik (turun ≥ 9 dB) | 0–7 per video, 0,25–0,5 dtk, berkumpul di 20–25%, 43–50%, 67–80% | |
| Pitch narator | 188 Hz [170–201] | 147 Hz |
| Rentang pitch narator (p10–p90) | **17,2 semitone** | 14,5 |
| Naik-turun volume VO (std) | 4,8 dB (VO dikompres rata) | 6,4 dB |
| Kecerahan VO (centroid) | 777 Hz (hangat) | 1013 Hz (tipis) |

Detail yang membangun tension:

14. **Ketegangan dibangun lewat aransemen, bukan volume.** Level musik datar dari awal sampai akhir, tapi drum
    masuk dan keluar (selisih ~9 dB). Bagian tegang = drum hilang dan tinggal pluck atau string. Bagian aksi =
    drum masuk.
15. **Musik penuh dari frame pertama dan berhenti mendadak di frame terakhir.** Tidak ada fade-in, tidak ada
    swell di akhir. Video yang langsung "panas" dari detik 0 dan selesai tanpa penutup terasa seperti
    terpotong, jadi orang menonton ulang.
16. **Lubang musik 0,25–0,5 dtk** tepat sebelum belokan cerita (seperempat, setengah, dan tiga perempat
    video). Hening sesaat sebelum "But…" membuat kalimat berikutnya terasa berat.
17. **SFX sekitar 15 per menit di luar ketukan musik:** satu bunyi kecil tiap ~4 detik (klik, whoosh, tik,
    benturan) yang menandai aksi di layar. Kita hampir tidak punya (1,6 per menit).
18. **Musiknya ringan dan terang** (pusat 606 Hz, bass 40%), bukan gemuruh berat. Misterius di referensi =
    pluck / pizzicato / string pelan dengan tempo ~110, bukan drone bass 78%.
19. **Narator membisik di kata belok** (rata-rata semua kata = 0):
    - "but": pitch −2,5 semitone, volume −3,2 dB, suara turun seperti membocorkan rahasia;
    - "wait": −2,7 semitone, −2,3 dB, dan musik ikut turun 1,9 dB;
    - "until": pitch turun tapi volume naik +1,9 dB (menekan);
    - "nobody": pitch naik +4,3 semitone (heran); "you": +2,1 semitone, +1,8 dB (menunjuk penonton).
20. **Narator lebih ekspresif dan lebih rata volumenya:** rentang pitch 17 semitone (kita 14,5), volume
    dikompres (std 4,8 dB), dan suaranya lebih hangat (centroid 777 Hz).

## 4. Toolkit implementasi

### `engine/tension.py`: transkrip → timeline tension

```
python3 engine/tension.py plan stt.json [--markers markers.txt] -o tension.json
python3 engine/tension.py chart tension.json chart.png
```

- Light beat di awal kalimat, minimal 2,8 dtk sekali (hasil di 15 transkrip: 10–15 per menit, referensi 10,9),
  bergantian terang-hangat dan redup-dingin, dengan arc kecerahan dan kehangatan dari poin 3–4.
- Kata belok (tabel poin 6) otomatis menjadi event cahaya dan kamera: speed multiplier dan push-in, keduanya
  di-ease (tidak ada lompatan).
- Malam otomatis dari kata night / midnight / dark, atau marker manual `night` / `day`. Juga ada marker
  `reveal` (lift putih + hangat 1,2 dtk) dan `drop` (musik berhenti sebentar).
- `light_at(P, t)` → {gain, warm, vig, night}; `cam_at(P, t)` → {speed, push, jitter_px}.

### `engine/tension_grade.py`: grade post yang membaca timeline

Grade low-key tapi di level terang referensi: gamma 0,88, S-curve, ekspansi highlight, hitam terangkat 0,045,
hangat/dingin dari timeline, malam = navy dengan saturasi sedikit turun, vignette 0,79, grain tipis 0,006, dan
jitter tangan sub-piksel.

Diuji pada render mentah Mona Lisa (seluruh film):

| | Mona Lisa v4 | grade tension | target |
|---|---|---|---|
| kecerahan | 47 | 65 | 70–100 |
| hitam p2 | 5 | 12 | 12–25 |
| highlight p98 | 161 | 175 | ≥ 210 |

**Pelajaran:** grade tidak bisa menciptakan titik terang yang tidak ada di render. Highlight harus dari lampu
di set 3D: lampu meja, jendela, layar, rim light di Pion, sumber cahaya misterius. Grade hanya merapikan level.

### `engine/camease.js`: banking, dutch, jitter

`track(keys, { bank: 2.5, jitter: 0.0015 })` mengembalikan `{ pos, tgt, fov, roll }`:
- `bank` = derajat roll per rad/s belokan, dihaluskan ±0,12 dtk, maks 13°;
- key boleh punya `roll` (derajat) untuk dutch angle yang disengaja;
- `jitter` = getaran tangan di target.

Renderer museum sudah membaca `F.cam.roll`.

### `engine/tension_mix.py`: mix seperti referensi

```
python3 engine/tension_mix.py --vo vo.wav --music music.wav --stt stt.json --tension tension.json \
        [--sfx sfx.json] --cues-out sfx_cues.json -o mix.wav
```

- Musik di **20,8 dB** di bawah VO saat bicara, tanpa fade-in, sampai frame terakhir.
- Lubang −14 dB 0,32 dtk sebelum "but / until / wait / then" yang membuka kalimat, dan di marker `drop`.
  "wait" juga menurunkan musik 2 dB selama 1 dtk.
- Low shelf −6 dB di 120 Hz pada musik.
- VO dikompres: diuji pada VO Mona Lisa, std turun 6,75 → 5,03 dB (referensi 4,8).
- `--cues-out` menulis daftar SFX yang disarankan (kata kerja fisik + light beat yang belum punya bunyi), siap
  dibuat dengan ElevenLabs sound-generation lalu dimasukkan lewat `--sfx` (`[{t, file, db}]`).
- Master **−14 LUFS, −1 dBTP** (dua pass loudnorm), berhenti 0,2 dtk setelah kata terakhir.

Diuji dengan me-remix stem Mona Lisa v4: hasilnya −14,0 LUFS, peak −1,0 dBFS, musik turun 12,2 dB, dan
17 saran SFX.

## 5. Cara membawakan narasi (untuk TTS)

- Pakai suara narator yang lebih tinggi dan hangat (pitch ~170–200 Hz), dengan stability rendah supaya
  ekspresif (target rentang pitch 17 semitone).
- Di eleven_v3, tandai kata belok dengan audio tag: `[whispers] But…`, `[whispers] Wait…`,
  `[emphatic] until…`, `[surprised] nobody…`. Hasilnya harus seperti tabel poin 19: "but" dan "wait" lebih
  rendah dan pelan.
- Generate satu paragraf sekaligus (tidak per kalimat) supaya tidak ada jeda (lihat `PANDUAN_VIRAL.md`).

## 6. Checklist tension (isi sebelum render)

- [ ] `tension.py plan` dijalankan dari STT final, dan grafiknya dicek (malam, reveal, drop sudah benar).
- [ ] Cahaya berubah tiap ~3–4 dtk di awal kalimat, bergantian hangat/dingin, dengan tengah paling gelap dan
      lonjakan hangat di 70–80%.
- [ ] Kata "night" = siang jadi malam navy di lokasi yang sama, dengan satu sumber cahaya misterius.
- [ ] Ada benda tenggat waktu di layar (jam, banner, kalender).
- [ ] Kamera: `bank: 2.5`, `jitter: 0.0015`, dutch angle di beat yang paling tegang.
- [ ] Vignette 0,79, latar belakang blur (DOF), flash putih hanya di reveal.
- [ ] Set punya titik terang (practical light) di setiap shot, agar p98 ≥ 210.
- [ ] Musik ringan ~110 BPM: drum keluar di bagian tegang, masuk di bagian aksi; tanpa fade; −20,8 dB di
      bawah VO.
- [ ] Lubang musik sebelum belokan; ~15 SFX per menit.
- [ ] Narator membisik di "but" / "wait".
- [ ] `qc_kualitas.py` lolos.
