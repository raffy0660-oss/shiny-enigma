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
  - **cross-dissolve / double exposure** untuk lompatan waktu atau tempat ("Meanwhile,", kerumunan yang berbaur)
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

---

## 7. Bagaimana cahaya jatuh ke model (karakter) dan kondisi model saat disinari

Papan: `REFERENSI_MODEL.jpg`. Isinya 12 close-up kepala dalam berbagai kondisi cahaya, swatch warna muka
yang diukur (sisi terang vs sisi gelap), dan 6 close-up badan. Angka di bawah berasal dari:
- 10 kepala close-up yang diukur per piksel
- deteksi kepala otomatis (18 kepala valid)

### 7a. Muka: hampir tidak pernah gelap

- **Muka adalah benda paling terang di frame**: luma muka rata-rata **1,7x luma frame**.
  Inilah yang membuat karakter seperti "disorot" walaupun set-nya gelap.
- Dalam cahaya normal, hook, maupun adegan positif, **muka hampir rata (flat)**. Beda terang antara sisi
  terang dan sisi gelap muka cuma **0,00–0,04 luma**. Shading di muka bukan penggelapan, melainkan
  **pergeseran hue tipis**: tengah krem lalu ke tepi persik/kuning (hook `#fef2e7` → `#feecce`,
  kantor `#fcf3e4` → `#fee8ca`).
- **Muka ikut warna cahaya, bukan ikut gelapnya.** Korelasi kehangatan muka dengan kehangatan adegan = **0,84**.
  Contoh warna muka:
  - di bawah glow tiket emas: `#fee5ad`
  - saat tint emosi sial: `#f2ea98`
  - cahaya ungu dari atas: `#f8e0da`
  - malam: `#e4caf8` (lavender)
- **Shading kuat hanya untuk momen dramatis**:
  - villain dengan cahaya dari bawah: kontras 0,41, sisi gelap `#33335d` navy
  - malam dengan berkas cahaya jendela: kontras 0,38, gelap `#746da2` lavender
  - matahari keras atau god ray: kontras 0,70, sisi gelap `#414c6b`
  
  **Sisi gelap selalu biru, ungu, atau navy, tidak pernah hitam atau abu netral.**
- **Bayangan jatuh ke muka** dari properti di adegan cahaya keras (lidah topi polisi membayangi dahi [model #4]).
  Di adegan malam, berkas cahaya jendela menyapu diagonal di muka [model #6].
- **Tanpa kilau specular** di muka. Muka matte. Kalau ada titik putih, itu sparkle efek, bukan pantulan.
- Mata dan alis tetap gambar 2D hitam yang tidak terpengaruh cahaya. Pipi kadang blush pink.

### 7b. Badan dan baju: shading 3D lembut

- Badan kapsul punya **gradasi halus 2 nada**: sisi terang lebih terang dan jenuh, sisi jauh lebih gelap
  dengan hue bergeser ke ambient (kuning ke oranye kecokelatan, ungu ke ungu tua kebiruan).
  **Tidak ada pita cel yang keras.** Rata-rata hanya 1–2 puncak nada per permukaan.
- Ada sedikit **penggelapan di tepi silhuet** (seperti AO/fresnel gelap) yang memberi volume.
- Lengan dan kaki berupa garis hitam tipis, tanpa shading.
- Badan **menerima bayangan** benda lain dan **menjatuhkan bayangan kontak lembut** ke lantai.
  Di matahari keras, bayangan karakter tegas di lantai.

### 7c. Outline

- Garis tinta gelap tebal, kira-kira **0,5% lebar frame**, tebal konstan. **Tidak ikut terang**:
  tetap gelap (luma ~0,25 setelah blur), hanya sedikit ikut warna adegan.

### 7d. Kondisi model per jenis cahaya (resep)

| Cahaya | Muka | Badan | Catatan |
|---|---|---|---|
| Normal / hook | Hampir putih, tint hangat krem, rata | Gradasi lembut, sisi jauh ke hue ambient | Muka paling terang di frame |
| Objek bercahaya di bawah (tiket, layar) | Seluruh muka tint warna objek (emas), sedikit lebih terang di dagu | Bagian bawah kena warna objek | Ditambah sparkle di objek |
| Tint emosi | Seluruh karakter (muka + baju) diwarnai satu warna (hijau = jijik/sial) | Sama | 0,3–0,5 dtk, lalu kembali |
| Siang luar | Putih bersih, nyaris tanpa shading | Gradasi tipis, bayangan tegas di tanah | Rim tipis dari langit |
| God ray / matahari keras | Sisi terang putih penuh, sisi gelap navy. Bayangan topi di dahi | Kontras tinggi | Satu-satunya kondisi muka kontras tinggi di siang hari |
| Malam + 1 lampu / jendela | Lavender terang di sisi lampu, ungu-navy di sisi lain. Berkas cahaya diagonal | Hampir tenggelam, gelap ungu | Hanya muka yang terbaca |
| Villain | Disinari dari bawah, abu-ungu, mata menyala emisif | Hampir hitam-biru | Senyum lebar terbaca karena kontras |

### 7e. Penerapan ke Pion dan bidak (engine)

Engine sekarang: ramp toon bertingkat, kilau putih di kepala, mahkota emas specular. Untuk seri bergaya
referensi ini (`light`/preset baru):
1. **Mode "matte referensi"**: ramp halus 2 nada (bukan pita tajam), **kilau kepala dimatikan** atau sangat tipis.
   Specular hanya untuk logam (mahkota, lencana).
2. **Area wajah tetap terang**: fill lembut dari arah kamera supaya muka Pion selalu paling terang di frame.
   Shading kepala cukup berupa pergeseran hue ke tepi.
3. **Tint warna cahaya** ke seluruh karakter mengikuti key adegan: emas di dekat objek bercahaya,
   lavender di malam hari, satu warna saat tint emosi.
4. **Sisi gelap bergeser ke warna ambient** (biru/ungu), bukan merah tua kehitaman.
5. **Mode dramatis** lewat cue:
   - cahaya bawah untuk tersangka atau momen curiga
   - berkas jendela diagonal untuk malam
   - kontras tinggi + bayangan topi deerstalker di dahi untuk matahari keras
6. Outline tetap gelap konstan. Bayangan kontak lembut selalu ada. Bayangan tegas hanya di matahari keras.

---

## 8. Environment: bangunan, awan, langit, tanah, air, props

Papan: `REFERENSI_ENVIRONMENT.jpg` (16 potongan material + 4 detail 1:1).

### 8a. Kenapa environment-nya terlihat mahal

1. **Outline tinta di bangunan dan props**: tepi silhuet dan tepi utama (atap, bingkai, papan nama, peti, lonceng)
   diberi garis gelap cokelat-hitam tipis, kira-kira 0,3–0,4% lebar frame, sedikit lebih tipis dari outline karakter.
   Itulah yang membuat dunia 3D-nya terasa "digambar" dan menyatu dengan karakter 2D.
   Pengecualian: vegetasi (pohon, rumput) dan awan **tanpa outline**.
2. **Tekstur dilukis, bukan foto**: bata, papan kayu, sirap atap, salju di atap diberi warna rata dengan variasi
   lembut dan **detail garis yang digambar** (sambungan papan, celah bata). Tidak ada noise foto, tidak ada normal map realistis.
3. **Kepadatan detail tinggi**:
   - setiap set penuh props bercerita (rak penuh barang, poster, mesin)
   - papan nama dengan teks lucu yang terbaca ("SNIP'S BARBER SHOP", "MILK RUN DAIRY", "OPENING TOMORROW")
   - bendera segitiga (bunting), lampu tali, kabel listrik dengan burung
   - kerumunan karakter latar dan kendaraan
   
   Tidak ada bidang kosong.
4. **Bentuk sederhana dan tebal (chunky)**: arsitektur disederhanakan, proporsi sedikit dilebih-lebihkan,
   tepi dibevel/membulat. Tetap mengikuti era dan tempat aslinya (kota western, penjara modern, desa bersalju).
5. **Satu warna khas per lokasi**: sel pink, ngarai merah-oranye, layar kapal oranye, pabrik kuning-teal.
   Sisanya palet harmonis yang lebih kalem.
6. **Material matte**. Kilau hanya di kaca, logam, dan air.
7. **Kedalaman**: kabut atmosfer, objek jauh lebih terang dan kebiruan, dan DOF memburamkan latar.
   Foreground (pagar, rel, papan) sering dekat lensa.

### 8b. Langit dan awan (warna terukur)

| Elemen | Resep |
|---|---|
| Langit siang | Gradien dari atas biru tua jenuh `#2459bd`–`#3f88f8` ke horizon lebih terang `#3b78d9`–`#5ca1ff` |
| Langit sore / penutup | Atas biru-violet `#707df0` ke horizon persik-pink `#ffb9ac` |
| Malam | Biru tua `#1b2a6b`–`#2a3c8f`, bintang, sering salju turun |
| **Awan kumulus** | Gumpalan bola-bola 3D bertumpuk, siluet tegas tapi shading lembut: puncak `#eaeaf0`, bawah `#c3cfea` (biru-lavender, **bukan abu**). Dasar agak rata. Bergerak pelan |
| Awan dari atas (aerial) | Gumpalan kecil putih di atas petak sawah, menjatuhkan bayangan lembut ke tanah |
| Langit lukis | Untuk shot langit besar: tekstur awan tipis bergaya lukisan (skybox) |

### 8c. Tanah, vegetasi, air

- **Tanah dan jalan**: warna rata hangat dengan jejak roda, kaki, dan alur yang dilukis.
  Dari atas: **petak-petak sawah** warna-warni ditambah sungai biru berkelok.
- **Rumput**: bidang hijau jenuh dengan helai 3D di depan kamera. **Pohon**: tajuk 3D lebat dengan
  gradasi hijau terang-gelap, tanpa outline. Bukit bulat lembut.
- **Air laut**: biru-cyan jenuh dengan bercak buih putih bergaya kartun (bentuk tegas, bukan partikel realistis).
  **Kolam**: cyan terang dengan garis kaustik putih bergelombang.
- **Salju**: putih hangat dengan bayangan lavender, tumpukan bulat di atap.

### 8d. Interior

- Dinding dengan pola sederhana (ubin, bata dicat, panel kayu), lantai papan atau kotak-kotak, langit-langit terlihat.
- Lampu praktis wajib (lampu gantung, neon, jendela). Lihat §2.
- Interior siang: palet kalem (teal-abu). Interior malam: biru tua dengan pool hangat.

### 8e. Penerapan ke dunia three.js kita (proj9/proj10)

Pipeline kita sudah punya garis tinta screen-space (depth + normal), GTAO, bloom, dan grade. Yang perlu ditambahkan:
1. **Tekstur kanvas bergaris**: material bata, papan, dan atap memakai tekstur canvas dengan warna rata
   + garis sambungan gelap yang digambar (bukan noise).
2. **Ketebalan dan warna ink**: cokelat-hitam (`#2a1d1a`), 0,3–0,4% lebar frame. Matikan ink untuk vegetasi dan awan
   (lewat layer atau material flag).
3. **Awan kumulus**: gabungan bola yang di-merge, shader gradien vertikal `#eaeaf0` ke `#c3cfea`, fresnel lembut di tepi, drift pelan.
4. **Skybox gradien** per suasana (siang, sore, malam) plus kabut warna horizon.
5. **Checklist kepadatan per set**: minimal 3 papan teks lucu, 1 elemen gantung (bunting, lampu tali, kabel),
   karakter latar, props bercerita di setiap permukaan, dan 1 warna khas lokasi.
6. **Air**: shader cyan + garis kaustik/buih putih bertepi tegas (tanpa refleksi realistis).
