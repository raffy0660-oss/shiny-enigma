# Panduan: karakter 2D yang benar-benar ADA di dalam dunia 3D (wajib untuk video berikutnya)

Papan contoh: `REFERENSI_INTEGRASI.jpg` (kiri atas: video 1, kartu ditempel; sisanya: `charlayer.js`).
Kode: `examples/proj10_photograph/scene/charlayer.js`, sudah terpasang di ketiga set (kantor, apartemen, eksterior).

## Apa yang diminta user
1. Karakter **benar-benar masuk ke video**, bukan ditempel: tertutup objek di depannya, kena cahaya set, ikut fisika.
2. **Bayangan yang jelas.** Di video 1 "bayangannya hampir gak ada".
3. **Tidak ada bingkai kotak / potongan lurus** di badan karakter.
4. **Tetap terlihat 2D seperti 15 video referensi.** Di referensi, karakter adalah gambar datar di dunia 3D, dengan bayangan jelas di tanah,
   cahaya set di badannya, dan tertutup benda di depannya. **Jangan diganti model 3D** (user menolak).
5. Pakaian lebih cartoonish (siluet tebal, blok warna, kotak-kotak besar).

## ATURAN UTAMA: gambar karakter dari SUDUT KAMERA adegan (papan `REFERENSI_SUDUT.jpg`)
Masukan user: di shot kamera tinggi, Pion "kayak gak nginjak tanah". Engine menggambarnya **tampak depan setinggi mata**,
sementara lantai di adegan terlihat dari atas dan menurun ke belakang, jadi dia seperti berdiri tegak di depan lensa.
Bayangan dan oklusi saja tidak cukup: **sudut gambar karakter harus sama dengan sudut kamera**.
1. Kunci dulu kamera adegan (plan), lalu hitung sudut per frame:
   `node tools/make_view.js plans/<adegan>.js <F0> <F1> pion view_<adegan>.json [facing°] [maxOrbit°]`
   - tilt = elevasi kamera dari tengah badan karakter;
   - orbit = arah kamera mengitari karakter, dibatasi ±55° supaya tetap tampak depan-¾ (gaya 2D).
2. Render engine dengan sudut itu: `react_render.js ... --start <F0/60> --dur <(F1-F0)/60> --view view_<adegan>.json`
   (`style2d` + `--view` memakai lensa panjang 18° dengan tilt/orbit).
3. Di plan, karakter itu diberi `faceCam: true`: kartu menghadap lensa penuh, dan titik alas tepat di titik kontak lantai.
4. Lantai, karpet, trotoar, dan kursi yang diduduki ditandai `mesh.userData.ground = true`. Permukaan pijakan tidak pernah menutupi karakter
   (bibir alas yang tergambar dari atas tidak terpotong lurus), sementara objek lain (meja, kusen, tiang, garis polisi) tetap menutupi.
5. Setiap karakter butuh render engine sendiri dengan `view` dari posisinya. Kamera yang berubah = sudut yang berubah per frame (sudah ditangani `view.json`).
6. Cek dengan contact sheet: alas harus tampak elips "dari atas" setara kemiringan lantai di sekitarnya, dan bayangan menyambung dari kaki.

## Kenapa video 1 terlihat "ditempel"
Pion dirender engine sebagai PNG transparan, lalu digambar sebagai kartu di render target terpisah **tanpa depth test** dan dikomposit di atas dunia:
- selalu di depan semua objek; meja memakai *clipping plane* → **potongan lurus** yang terlihat melayang dari kamera rendah;
- tidak menjatuhkan bayangan (hanya blob kecil), tidak menerima bayangan set, cahaya hanya berupa tint warna;
- tanpa interaksi fisika.

## Solusinya: `charlayer.js` (2D tetap 2D, tapi di dalam dunia)
| Efek | Cara |
|---|---|
| Oklusi penuh | Pass depth-only seluruh set (volume transparan seperti kerucut cahaya, god ray, debu, hujan dikecualikan), lalu kartu karakter di-depth-test terhadapnya. Tanpa clipping plane, tanpa potongan kotak |
| Alas tidak tertanam | Bibir alas gambar 2D ada sedikit di bawah titik kontak: kartu digeser ke arah lensa sepanjang sinar pandang (`push`, default 0,2 m). Proyeksi identik |
| Cahaya set di karakter | Kartu = `MeshLambertMaterial` di layer 3 (semua lampu ikut layer 3): emissive datar (gambar tetap terbaca, `E`) + diffuse dari lampu set (`D`), **dua sisi** ("paper cut-out": lampu dari belakang tetap menyinari). Menerima bayangan set (belang tirai, god ray, bayangan topi) |
| Bayangan karakter | Proxy tak terlihat, siluet sama (alpha test), tegak **menghadap lampu dominan**, sedikit di belakang kartu (tidak membayangi dirinya sendiri), masuk shadow map lampu dinamis tiap frame. `map`/`alphaTest` dipasang di **material proxy** (pass bayangan r186 mengambilnya dari sana) |
| Lampu statis | Shadow map di-bake tanpa proxy (`CHR.bake([...])`, render depth 1x1). Hanya satu lampu dinamis per adegan yang di-update tiap frame (murah) |
| Kontak | Blob lembut di bawah karakter yang mengecil dan memudar saat melompat |
| Fisika | Lompatan parabola dengan gravitasi (`y = g/2·h·(T−h)`), jongkok sebelum lompat, squash saat mendarat (`squash`, alas tetap di tanah), kepulan debu (`puffs`); benda jatuh balistik (halaman kalender: robek, terbang berputar, mendarat, meluncur dengan gesekan) |
| Komposit | Kartu dirender linear ke `pionRT` di dalam composer (setelah shadow map diperbarui, sebelum `pionComp`), jadi warna 2D tidak terkena AgX |

Pemakaian (lihat `office.js` / `apartment.js` / `exterior.js`):
```js
import { createChars } from "./charlayer.js";
const CHR = createChars(scene, camera, renderer, { n: 3, E: 0.6, D: 0.18, light: keyLight, hide: [cone, dust, rain] });
composer.insertPass(CHR.pass(pionRT), composer.passes.indexOf(pionComp)); CHR.guard(gtao); CHR.guard(bokeh);
staticLights.forEach(l => l.shadow.autoUpdate = false);   // global renderer.shadowMap.autoUpdate = true
// per frame:
if (setChanged) CHR.bake(staticLights);
await CHR.place([{ url, base, ppu, w, h, anchor, height, tint, lift, squash }], { light: keyLight, puffs });
```

## Checklist supaya bayangannya BENAR-BENAR kelihatan (pelajaran video 1)
1. **Lampu bayangan = lampu yang dominan di posisi karakter.** Kantor: lampu gantung. Eksterior: lampu jalan di sebelahnya
   (matahari senja dari belakang kamera terhalang gedung seberang, jadi bayangannya hilang). Apartemen B: matahari lewat celah papan.
2. **Taruh karakter di jalur cahaya itu** (di pool lampu, di dalam god ray), lalu **atur kamera** supaya bayangannya jatuh di area yang terlihat
   (lantai di depan atau samping, dinding di belakangnya). Lampu di belakang karakter = bayangan mengarah ke kamera = paling dramatis (seperti referensi).
3. Kontras: lampu dinamis harus jelas lebih terang dari ambient/hemisphere di titik itu. Kalau perlu, turunkan hemi atau naikkan key di adegan tersebut.
4. Cek dengan render frame dari atas/samping sekali (debug), lalu dari kamera adegan.
5. Karakter tergeletak (`face: true`, mis. korban) tidak memakai proxy; cukup blob kontak + `push` 0,7.
6. Lampu titik sebagai lampu dinamis = 6 render shadow per frame. Prioritaskan spot/directional.

## Pakaian lebih cartoonish (engine `style2d`)
Tambah/ubah di `engine/render.js` (`outfitKit`/`outfitParts`) dan tekstur kostum detektif:
- siluet dibesar-besarkan: topi deerstalker lebih besar dan membulat, kerah cape tebal, kancing/gesper besar;
- blok warna cerah dan rata dengan satu bayangan inti lembut; motif kotak-kotak **besar** (2–4 kotak per sisi), bukan anyaman kain detail;
- jahitan dan lipatan sedikit tapi tebal dan tegas; outline tetap hitam konstan.
Cek di cast sheet (`CastSheet.tsx`) dan kirim ke user untuk persetujuan sebelum dipakai di video.

## Yang ditolak user
- Model 3D penuh (mesh toon) untuk Pion: terlihat bukan 2D. Jangan dipakai kecuali user memintanya lagi.

## v2 (Nov 2026, MASTER TASK user): grounding, push, facing, rim/glow, contact shadow, preset
Kode: `charlayer.js` + `charpresets.js` (baru) + `tools/make_view.js`. Uji: `plans/test_integ.js` (24 shot), papan `REFERENSI_INTEGRASI_V2.jpg` (atas: lama, bawah: v2).

**Kenapa dulu terlihat "ditempel"** (akar masalah):
1. Engine menggambar karakter tampak depan setinggi mata, sementara kamera adegan melihat dari atas/samping (sudah diatasi `--view`).
2. `push` lama memindahkan kartu ke arah lensa **dan mengecilkannya** sesuai jarak kamera. Gambarnya sama, tapi posisi 3D-nya bukan lagi titik kontak:
   oklusi dan penerimaan bayangan dihitung di tempat yang salah.
3. Satu titik anchor dipakai sekaligus untuk tanah, pivot, dan posisi gambar. Lift, roll, dan putaran bisa menggeser titik kontak.
4. Blob kontak gelap dan bulat, tidak ikut arah badan (tergeletak), dan mengecil saat melompat.
5. Cahaya set hanya berupa diffuse rata. Tidak ada pemisah tepi (rim) dari latar gelap.
6. Kamera rendah: sudut gambar dihitung dari tengah badan, jadi alas tergambar dari bawah (melayang).

**Sistem v2:**
| Bagian | Cara kerja |
|---|---|
| Ground anchor | `anchor` (lama, sudah termasuk lift) atau `groundAnchor` + `lift`. Permukaan tanah: `ground` / `groundY` / `groundMode: "raycast"` (sinar ke bawah ke mesh `userData.ground`: lantai, karpet, trotoar, dudukan kursi; **tidak pernah otomatis ke lantai terendah**), `groundOffset`. Piksel alas gambar selalu tepat di anchor; rotasi/roll berporos di situ |
| Ukuran | Hanya dari gambar (`height`, `ppu`, `w`, `h`, `squash`). **Tidak pernah dari jarak kamera** |
| `push` | Bias **depth saja** di vertex shader: gambar, posisi, dan ukuran tidak berubah, hanya kedalaman untuk oklusi. `pushMode: "legacy"` = cara lama. Apartemen tetap `push 0.7` untuk kartu `face` lama (kini depth-only); korban baru memakai `facing: "floor"` (push 0) |
| Facing | `yaw` (tegak, berputar di sumbu Y), `full`/`faceCam` (menghadap lensa penuh, untuk render `--view`), `fixed` (`yaw` dunia), `floor` (tergeletak: gambar tampak depan rebah di lantai, kepala ke arah `yaw`; view [0,0]) |
| Kamera rendah | `make_view.js`: tilt dibatasi ≥ 0° untuk karakter di lantai, jadi alas tidak pernah tergambar dari bawah |
| Rim + glow | Di shader kartu: tepi di sisi lampu (dari alpha gambar, arah lampu diproyeksikan ke layar) diberi cahaya warna lampu, **di dalam** garis tinta (tinta tetap gelap), lebih kuat jika lampu di belakang karakter. `glow` = gradasi lembut di sisi terang. Tanpa bloom. Lampu arah rim boleh beda dari lampu bayangan (`rimLight`) |
| Bayangan kontak | Inti rapat + falloff panjang (bukan cakram gelap). Di titik kontak sebenarnya: kompak di bawah kaki, lebih lebar/lembut/pudar saat lift, memanjang sesuai badan saat `contact: "body"`, lebih kecil di kursi (`seat`). `shadow:[...]` lama tetap dihormati |
| Bayangan cast | Proxy siluet menghadap lampu dinamis (seperti v1). Dimatikan untuk `floor`/`body` |
| Preset karakter | `charpresets.js`: `detective`, `police`, `civilian`, `victim`, `seated`. Plan cukup `{ eng, anchor, height, preset }`. Kunci di plan selalu menang |
| Preset cahaya | `LIGHT_PRESETS` (warna/kekuatan rim) per set + mood: kantor normal = lampu hangat, tension/conflict = malam biru, reveal = TKP; apartemen A bohlam, B matahari, C senter polisi; eksterior senja |
| Set | GTAO 1.0 → 0.75 (sudut tidak berlumpur), vignette turun ±0,08–0,1 per mood. Gelap sinematik tetap |

Checklist uji (wajib render frame nyata, bukan hanya cek sintaks): orbit, dekat/jauh (ukuran harus sama), kamera rendah/tinggi, lift,
duduk, tergeletak, hangat/dingin, rim mati/nyala, oklusi. Lihat `test_integ.js`.
