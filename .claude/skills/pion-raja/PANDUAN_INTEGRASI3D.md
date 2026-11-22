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
