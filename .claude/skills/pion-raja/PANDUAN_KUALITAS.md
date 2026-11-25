# PANDUAN KUALITAS: kamera, zoom, gambar, caption, dan pembawaan (hasil ukur 14 referensi)

Pasangan dari `PANDUAN_VIRAL.md`: panduan itu mengatur naskah, yang ini mengatur kualitas produksinya.

Cara ukur: setiap frame dari ke-14 video dilacak dengan OpenCV (ORB + transformasi similarity), sehingga skala
zoom, geser, dan rotasi kamera terbaca per frame. Dari situ 284 zoom terdeteksi, dan 216 zoom yang lebih panjang
dari 0,45 detik dicocokkan dengan rumus easing. Kecerahan, level hitam dan putih, kontras, dan kepadatan detail
diambil dari 40 frame per video, lalu loudness dengan EBU R128.

Gambar pendukung:
- `REFERENSI_KURVA_ZOOM.png`: kurva zoom terukur dibanding sine, cubic, dan zoom kita.
- `REFERENSI_ZOOM_3D.jpg`: 4 zoom terbesar di referensi, frame per frame.
- `PERBANDINGAN_KUALITAS.jpg`: frame Mona Lisa v4 (atas) dibanding referensi (bawah).

Alat cek: `python3 tools/refs_analysis/qc_kualitas.py final.mp4 --stt stt.json` memberi OK atau `!!` untuk
setiap ukuran di bawah. Jalankan sebelum mengirim video.

## 1. Zoom dan gerak kamera

### Angka terukur

| Ukuran | Referensi | Mona Lisa v4 |
|---|---|---|
| Bentuk kurva rata-rata | **easeInOutSine** (RMS 0,026); kurva cubic in-out RMS 0,089 | crop 2D ease-out kubik |
| Durasi zoom panjang | median 0,8–1,6 dtk (p25–p75), median per video 0,77–1,57 dtk | 1,40 dtk (gerak 3D), crop 0,14 dtk |
| Besar zoom panjang | median 46%, sampai 4x (446%) | 40% |
| Punch pendek (< 0,45 dtk) | median **10%** saja | 12% dalam 0,14 dtk |
| Zoom keluar (pull-out) | 1 dari 3 zoom (15–50% per video) | 13% |
| Overshoot / settle | 15% zoom (32 dari 216) berakhir dengan lewat sedikit lalu kembali | |
| Kamera bergerak | 67–96% waktu | 86% |
| Hard cut per menit | median 1 per video, maks 7 per video | **15,6 per menit** |
| Jumlah zoom | ~19 per menit | ~25 per menit |

### Yang terlihat di frame (`REFERENSI_ZOOM_3D.jpg`)

1. **Zoom referensi bukan crop, tapi kamera 3D yang terbang.** Ada parallax: latar depan bergeser lebih cepat
   dari latar belakang, dan benda yang dekat lewat di depan lensa (panci di kapal, bingkai foto di meja).
2. **Zoom besar berfungsi sebagai transisi antar subjek.** Kamera terbang dari wide roller coaster ke wajah
   karakter (4,5x), dari kelompok yang tertawa ke kelompok lain di ruangan yang sama, atau mundur dari foto di
   meja sampai seluruh kantor terlihat. Inilah cara mereka menghindari hard cut (Aturan 27).
3. **Kecepatannya simetris:** mulai pelan, paling cepat di tengah (puncak kecepatan di 37–68% durasi, median
   sekitar 50%), lalu berhenti pelan. Tidak ada zoom yang "nabrak" berhenti.
4. **Kurvanya sine, bukan cubic.** Sine lebih lembut di awal dan akhir dan tidak punya bagian tengah yang
   terlalu cepat. Cubic in-out (dipakai `camplan.js`) terlihat lebih "mekanis".
5. **Zoom dihitung di ruang logaritmik.** Push 4x yang di-lerp linear terasa terburu-buru di awal dan merayap di
   akhir. `camease.js` meng-ease jarak kamera dan fov secara log, sehingga kecepatan yang dirasakan rata.
6. **Punch pendek kecil saja (~10%) dengan durasi ~0,3 dtk**, juga memakai sine. Punch besar yang cepat tidak
   ada di referensi.
7. **Settle kecil di 15% zoom:** kamera lewat sekitar 3% dari target lalu kembali dalam ~0,35 dtk. Ini memberi
   rasa "kamera dipegang orang", bukan robot. Jangan dipakai di semua zoom.
8. **Kamera hampir tidak pernah diam.** Di antara gerakan besar ada drift pelan (dorongan ~2%/dtk). Frame yang
   benar-benar diam hanya untuk lelucon visual.
9. **Gerakan cepat punya motion blur.** Ketajaman frame saat kamera cepat turun ke 0,45–0,73 dari frame diam di
   8 dari 14 video. Ini blur kamera asli, bukan efek garis.

### Cara pakai di plan: `engine/camease.js`

```js
const { track, punch } = require('<skill>/engine/camease.js');
const cam = track([
  { t: 0,   pos: [0, 1.6, 6], tgt: [0, 1.2, 0], fov: 50 },              // mulai wide
  { t: 1.2, dur: 1.3, pos: [0.4, 1.4, 2.2], tgt: [0, 1.25, 0] },         // push in, sine, jarak di-ease log
  { t: 4.0, dur: 1.5, pos: [0, 2.4, 9], settle: 0.03 },                  // pull-out + settle 3%
], { drift: 0.02 });                                                     // drift 2%/dtk saat hold
const c = cam(t);                         // { pos, tgt, fov }
const fov = c.fov * punch(t, 6.5, 0.10, 0.3, nextShot);                  // punch 10% dalam 0,3 dtk
```

Uji sendiri dengan `node engine/camease.js`. Kurva log-nya harus sama dengan sine (0, 0,146, 0,5, 0,854, 1), dan
posisi harus kontinu saat key baru dimulai di tengah drift.

### Aturan kamera

- [ ] Zoom yang menunjukkan sesuatu = gerak kamera 3D 0,8–1,6 dtk, sine, besarnya 30–60% (boleh sampai 4x untuk
      transisi antar subjek).
- [ ] Minimal 1 dari 4 zoom adalah pull-out.
- [ ] Punch pendek ≤ 10%, 0,25–0,35 dtk, sine. Crop 2D di post maksimal 10%, karena crop menurunkan resolusi dan
      tidak punya parallax.
- [ ] Settle 3% hanya di ~1 dari 6 gerakan, biasanya di akhir pull-out besar.
- [ ] Hard cut ≤ 2 per menit. Selebihnya pakai terbang kamera lewat benda atau ruangan (Aturan 27).
- [ ] Ada benda latar depan yang lewat dekat lensa di gerakan besar (parallax).
- [ ] Saat hold, drift 1–2%/dtk.

## 2. Cahaya dan warna: "misterius" bukan berarti gelap

| Ukuran (0–255) | Referensi | Mona Lisa v4 | Target film detektif kita |
|---|---|---|---|
| Kecerahan rata-rata | 95–134 | **47** | 70–100 |
| Hitam (persentil 2) | 13–37 (hitamnya terangkat, navy) | **5** (hitam pekat) | 12–25 |
| Highlight (persentil 98) | 215–238 | **161** (tidak ada yang terang) | ≥ 210 |
| Kontras (std luma) | 46–63 | 40 | 48–60 |
| Detail (piksel tepi) | 5,4–13,6% | 4,2% | ≥ 6% |

10. **Adegan malam referensi tetap terbaca:** langit biru navy, bulan terang, jendela kuning hangat, karakter
    selalu terkena cahaya (lihat baris 2 `REFERENSI_ZOOM_3D.jpg` dan bawah `PERBANDINGAN_KUALITAS.jpg`). Tegangnya
    datang dari warna biru dingin dan kontras hangat-dingin, bukan dari layar hitam.
11. **Hitam tidak pernah benar-benar hitam.** Persentil 2 di 13–37 berarti bayangan masih berwarna (navy, ungu,
    coklat tua). Di HP dengan kecerahan rendah, hitam pekat = layar kosong, lalu penonton swipe.
12. **Selalu ada sesuatu yang terang di frame** (p98 ≥ 215): lampu, jendela, bulan, kertas, wajah karakter.
    Mata penonton pergi ke titik terang itu. Video kita tidak punya titik terang (p98 161), jadi mata tidak tahu
    harus melihat ke mana.
13. **Cara memperbaiki di `post_film.py`:** naikkan lantai hitam (lift sekitar +0,05), naikkan gamma ke ~0,9
    (bukan 1,06), dan pertahankan vignette tapi lebih lembut (0,35, bukan 0,55). Di set: tambah practical light
    (lampu meja, jendela, layar) di setiap frame, dan rim light di Pion.
14. **Saturasi kita tinggi di bayangan** (143). Itu warna noise yang kotor. Turunkan saturasi khusus di area
    gelap, pertahankan di area terang.
15. **Satu warna identitas per latar** (pink, biru, emas, hijau rumput). Latar kita didominasi coklat-hitam yang
    mirip satu sama lain.

## 3. Grafik dan dunia

16. **Dunianya padat.** Detail tepi 5,4–13,6% vs kita 4,2%. Setiap frame referensi berisi properti (kertas,
    poster, papan angka, tanaman, kabel, lampu) dan tokoh lain di latar belakang.
17. **Tokoh figuran selalu ada dan bereaksi** (tertawa, menunjuk, kaget). Di Mona Lisa kita, Pion hampir selalu
    sendirian di ruangan kosong.
18. **Karakter terlihat utuh atau setengah badan dengan lingkungan di sekitarnya.** Close-up hanya untuk reaksi.
    Di frame kita, wajah Pion sering terpotong atau benda menutupi frame (Aturan 26).
19. **Garis tepi karakter tebal dan rata**, warna flat, ekspresi besar. Ini terbaca jelas di layar HP kecil.
20. **Benda yang dibaca menghadap kamera dan cukup besar untuk dibaca** (papan angka "100-1", "MILK RUN").
    Tulisan kecil seperti log komputer kita sulit dibaca dalam 1 detik.

## 4. Caption

21. **Ganti instan, tanpa animasi pop atau scale** (dicek frame per frame: kata baru muncul penuh di frame
    pertama).
22. **Putih, font tebal membulat, outline gelap tipis + bayangan lembut**, kecil (tinggi huruf ~3% tinggi frame), di
    tengah sekitar 68–72% tinggi frame.
23. **Huruf kecil seperti diucapkan, tanda baca tetap ada** ("finger.", "see,"), 1–2 kata per caption.
24. **Caption tidak pernah menutupi wajah.** Kalau wajah turun ke area caption, kamera yang bergeser, bukan
    caption-nya.

## 5. Teknis render dan ekspor

25. **Motion blur asli:** render 60 fps, lalu ekspor 30 fps dengan mencampur pasangan frame:
    `ffmpeg -i in60.mp4 -vf "tmix=frames=2:weights='1 1',fps=30" ...`. Gerakan cepat jadi blur alami, frame
    diam tidak berubah.
26. **Grain tipis saja.** Grain kita (σ 0,018) membuat file membengkak 5x dan menurunkan kepadatan detail.
    Turunkan ke σ ≤ 0,008, atau hanya di bagian gelap.
27. **Loudness -14 LUFS, true peak -1 dBTP** (`loudnorm=I=-14:TP=-1:LRA=7`). Kita -11,8 LUFS.
28. **Video habis 0,1–0,25 dtk setelah kata terakhir.** Kita 1,12 dtk.
29. **Ekspor 1080x1920**, H.264 high, crf 20–22 dengan maxrate ~8M. Referensi yang diunduh 720p hanya karena
    kompresi unduhan, bukan aslinya.

## 6. Pembawaan (cara cerita dibawakan)

30. **Narator bercerita, bukan membaca berita:** tempo 3,7 kata/dtk, tidak ada jeda > 0,35 dtk, nada naik di
    kata belok ("but", "until", "wait"). Detailnya di `PANDUAN_VIRAL.md`.
31. **Dialog tokoh diucapkan dengan suara berbeda** dari narator (atau minimal intonasi berbeda), dan tokoh itu
    terlihat bicara di layar saat kalimatnya terdengar.
32. **Ekspresi karakter berganti di setiap kalimat** sesuai isi: tenang saat yang lain tertawa, sinis, kaget.
    Wajah datar lebih dari 2 detik = beat yang hilang.
33. **Gerak karakter dianimasikan setiap frame** (frame yang diam hanya 0–3%), tidak pernah membeku menunggu VO.
34. **SFX di setiap kata kerja fisik** dan musik yang jalan terus (lihat `PANDUAN_VIRAL.md` bagian D).

## 7. Hasil QC Mona Lisa v4 (patokan untuk konten berikutnya)

```
-- picture
  !!  mean brightness (luma)     47.11   reference 65-134
  !!  black level (p2)            5.27   reference 10-37
  !!  highlights (p98)          161.01   reference 205-238
  !!  contrast (luma std)        40.48   reference 46-63
  !!  detail (edge %)             4.21%  reference 5.4-13.6%
-- camera
  !!  hard cuts per minute       15.62   reference 0-7
  OK  camera moving              86.32%
  OK  long zoom duration          1.40s
  OK  long zoom size             40.02%
  !!  pull-outs among zooms      13.16%  reference 15-50%
-- sound
  !!  integrated loudness       -11.80   reference -15.1 to -14.0 LUFS
  OK  first word starts           0.20s
  !!  words per second            3.04   reference 3.3-3.9
  !!  longest pause               0.50s  reference 0-0.35s
  !!  silence after last word     1.12s  reference 0.05-0.30s
```

Gerak kamera 3D kita sudah benar (durasi dan besar zoom masuk rentang). Yang paling jauh dari referensi adalah
gambar yang terlalu gelap tanpa titik terang, hard cut, dan tempo VO.
