# Panduan Sinematik (dari 15 video referensi user)

Sumber: zip "Referensi Detektif" dari user (Nov 2026). Isinya 14 Shorts animasi bergaya stick-figure
(karakter 2D flat ber-outline di dunia 3D) dan 1 Shorts footage asli ("Bro melubangi tembok dengan sendok").
Durasi 49–78 dtk, 9:16.

**Metode.** Setiap frame dianalisis (30 fps asli, 60 fps untuk video sendok), total sekitar 28.000 frame:
- terang rata-rata, terang tengah vs tepi (vignette/spotlight), kontras, saturasi, hangat/dingin (R−B)
- titik paling terang
- gerak kamera per frame (ORB + affine: zoom, pan, roll)
- skor ganti adegan dari ffmpeg
- narasi ditranskrip per kata (faster-whisper) dan dicocokkan dengan perubahan cahaya dan kamera

Angka di bawah adalah median dari 14 video animasi. Video sendok hanya dipakai untuk aturan hook dan caption.

Papan contoh:
- `REFERENSI_CAHAYA.jpg`: 16 frame bernomor yang dirujuk sebagai [#n] di bawah.
- `REFERENSI_KAMERA.jpg`: urutan 1 gerakan "terbang" kamera, frame per frame.

---

## 1. Struktur cerita (menentukan kapan cahaya dan kamera berubah)

| Bagian | Waktu | Ciri narasi | Visual |
|---|---|---|---|
| **Hook** | 0–3 dtk | Satu kalimat aksi aneh, kalimat lampau konkret: "He sold his happiest memory to a stranger", "They buried a man alive with a bell tied to his finger" | Kamera langsung menunjukkan aksinya secara harfiah. 2–3 gerakan kamera dalam 3 dtk pertama |
| **Aturan dunia** | 3–15 dtk | "You see, ..." menjelaskan konteks | Terang, warna cerah, kamera keliling set |
| **Eskalasi** | 15–40 dtk | Detail angka, dialog lucu pendek ("Wait, what?") | Ritme cepat, objek lucu jadi fokus |
| **Belokan / konflik** | ~60–75% durasi | **"But..." / "Until one night..." / "the night before..."** | **Cahaya turun: siang jadi malam biru** (lihat §3) |
| **Reveal** | setelahnya | "Wait, X?" / "Well, ..." | Push-in ke karakter, satu lampu dramatis |
| **Payoff** | 5–10 dtk terakhir | "You see, ..." twist ironis, video berhenti tepat di punchline (tanpa outro) | **Cahaya naik**: flash bloom putih lalu hangat [#12, #13] |

- Narasi **cepat dan rapat**: median **225 kata/menit**, total jeda kurang dari 6 dtk per video.
- Selalu ada **musik latar + SFX** di bawah suara. Bagian tanpa ucapan hanya sekitar 6 dB di bawah suara.

## 2. Pencahayaan dasar (berlaku di semua bagian)

1. **Karakter selalu jadi titik paling terang dan paling kontras di frame.** Set di sekelilingnya meredup ke tepi.
   Vignette dibuat dari cahaya set itu sendiri, bukan cuma efek post.
2. **"Hero key" yang tidak jelas asalnya.** Muka karakter disinari lampu hangat lembut dari depan-samping atas,
   walaupun lampu di set (pendant, jendela) ada di tempat lain [#1]. Jangan memaksa cahaya harus logis.
   Muka harus selalu terbaca.
3. **Lampu praktis di dalam frame** untuk motivasi dan bloom: lampu gantung kap hijau/kuning, lampu meja, jendela, layar.
   Selalu ada 1–2 sumber yang terlihat dan berpendar (bloom) [#1, #4, #8].
4. **Split hangat vs dingin.** Subjek hangat (oranye/kuning), bayangan dan ambient biru/teal/ungu.
   Bayangan **tidak pernah hitam**: selalu biru atau ungu tua.
5. **Objek penting = sumber cahaya.** Benda kunci cerita (tiket menang, tombol, kartu) memancarkan glow
   dan kilau (sparkle) yang **ikut menyinari muka karakter dari bawah** [#2, #3].
6. **God ray / berkas cahaya bervolume** dari jendela atau celah, plus debu melayang, jatuh ke dinding atau karakter [#4].
7. **Depth of field kuat.** Latar bokeh, dan sering ada objek foreground yang blur di depan lensa [#3].
8. **Rim light / backlight** memisahkan karakter dari latar, terutama di adegan luar [#15].
9. **Bayangan kontak lembut (AO)** di bawah kaki dan benda. Bayangan matahari tegas untuk adegan siang.
10. **Grading:** saturasi tinggi tapi tidak neon. Kontras sedang (std luma ~0,20). Vignette ringan selalu ada.

## 3. Cahaya per bagian cerita (terukur)

| Momen | Yang terjadi (terukur) | Cara membuatnya |
|---|---|---|
| **Hook** | Tengah frame 1,2–1,7x lebih terang dari rata-rata frame. Rasio tepi/tengah **0,6** (bagian lain 0,8). Saturasi lebih tinggi (0,55–0,65 vs 0,45) | **Spotlight pada karakter**: pool cahaya hangat di karakter, tepi gelap, set redup. Inilah "cahaya yang menyorot karakter saat hook" |
| **Belokan ("But" / "Until one night")** | Luma turun 0,15–0,47 dalam 1 dtk, **tepat di kata "But"/"Until"/"night"**. Titik tergelap video hampir selalu di sini | **Ganti ke malam**: ambient biru tua (#1b2a6b–#2a3c8f), satu lampu hangat kecil saja (lampu meja, jendela rumah, layar) [#7→#8, #9→#10, #16]. Bisa juga potong langsung ke eksterior malam bersalju atau berbintang |
| **Ancaman / villain** | Muka disinari dari bawah, mata menyala, sisanya gelap [#5] | Lampu bawah warna dingin atau meja menyala. Sisanya hampir hitam-biru |
| **Emosi negatif sesaat** | Seluruh karakter di-tint (hijau = jijik/sial) [#6] | Color tint karakter 0,3–0,5 dtk, lalu kembali |
| **Payoff / resolusi** | Luma naik +0,3 sampai +0,46 dalam 1 dtk ("A week later", "until sunrise") | **Transisi flash**: kamera masuk ke sumber cahaya, layar jadi putih bloom (overexposure), lalu dissolve ke adegan hangat terang (pagi atau golden hour) [#11→#12→#13] |
| **Penutup** | Langit sore pink-oranye, matahari rendah, hangat | Golden hour atau sunset untuk shot terakhir |

## 4. Kamera (terukur, 14 video animasi)

**Kamera tidak pernah diam dan hampir tidak pernah cut biasa.** Pergantian subjek dilakukan dengan
**satu gerakan terbang kontinu** melewati set (lihat `REFERENSI_KAMERA.jpg`). Kamera push-in ke karakter,
lewat di sampingnya (karakter tersapu keluar frame jadi "wipe" foreground dengan motion blur), lalu
menukik dan melambat tepat di atas objek berikutnya.

| Parameter | Nilai (median, persentil 25–75) |
|---|---|
| Gerakan kamera besar | **setiap 1,65 dtk** (1,24–2,5) |
| Durasi satu gerakan | **0,6 dtk** (0,33–1,04) |
| Profil kecepatan | **ease-in-out simetris (sinus)**: puncak di tengah, tidak pernah berhenti total (drift sisa ~15% dari puncak) |
| Zoom per gerakan | 1,05x median. Push-in sampai 1,3–2,1x, pull-out 0,55–0,84x. Push dan pull hampir seimbang |
| Saat "diam" di antara gerakan | **drift push-in pelan +2,2%/dtk** (0 sampai +5%) plus pan sekitar 2%/dtk. Tidak pernah benar-benar statis |
| Lama "diam" | 1,2 dtk (0,7–2,1) |
| Hook (0–5 dtk) | rata-rata **3 gerakan** dalam 5 dtk pertama |
| Hard cut | sedikit (1–21 per video). Dipakai untuk ganti lokasi besar atau lompatan waktu |

Aturan pemakaian:
- **Kamera tiba di objek saat kata bendanya diucapkan.** Gerakan dimulai sekitar 0,0–0,2 dtk sebelum kata
  penting berikutnya. Contoh: "happiest **memory**", kamera menukik ke tiket memori; "**fired**", kamera wide
  karyawan di kursi; "**oil** into the **sea**", tuangan minyak lalu laut.
- Variasi arah: push-in, pull-out, pan, tilt, crane naik/turun, top-down (mata dewa) untuk denah atau
  situasi, low angle untuk karakter kuat atau berbahaya.
- **Transisi khusus:**
  - masuk ke objek dan keluar di lokasi lain (keypad telepon jadi call center) [#14]
  - whip pan dengan motion blur
  - flash cahaya putih (payoff)
  - zoom-through jendela atau lubang
- Motion blur kuat di tengah gerakan cepat. Foreground lewat dekat lensa.
- Low angle + wide untuk adegan aksi. Close-up besar (muka memenuhi 60–80% lebar) untuk reaksi.

## 5. Teks dan caption

- **Satu kata per kemunculan** (kadang 2), sinkron per kata dengan narasi.
- Posisi tengah horizontal, sekitar **70% tinggi frame** (di bawah muka karakter).
- Huruf tebal sans putih dengan outline hitam dan bayangan, tinggi sekitar 3,5% frame.
- Teks dalam dunia (papan, label, layar) dipakai untuk angka dan nama. Contoh: "P-618", "$1,000,000", "OPENING TOMORROW".

## 6. Penerapan di proyek Pion

- **Dunia 3D three.js (mode 4, proj9/proj10):**
  - Lampu: hero key hangat di karakter (bisa SpotLight yang mengikuti karakter), lampu praktis emisif
    dengan bloom, ambient biru.
  - God ray: cone transparan aditif plus partikel debu.
  - DOF: BokehPass.
  - Vignette: tetap di grade pass.
- **Kamera:**
  - Gerakan antar-subjek selalu `ease: "inOut"` sinus 0,4–0,8 dtk, setiap 1,2–2,5 dtk.
  - Di antaranya drift push-in 2%/dtk.
  - Jangan cut keras kecuali ganti lokasi besar.
  - Lewatkan foreground atau karakter dekat lensa saat transisi.
- **Beat cahaya mengikuti narasi:**
  - Hook: spotlight + tepi gelap + saturasi tinggi.
  - Kata "But"/"Until"/"night": ganti ke preset malam biru + 1 lampu hangat.
  - Reveal: under-light atau rim.
  - Payoff: flash putih lalu golden.
- Engine Pion (billboard) mengikuti preset `light` pada cue yang sama, supaya warna Pion cocok dengan set.
- **Ini panduan gaya, bukan aset.** Jangan menyalin karakter, set, atau desain dari video referensi. Pakai polanya saja.
