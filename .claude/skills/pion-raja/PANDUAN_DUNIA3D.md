# Mode 4: dunia 3D animasi (three.js) + teks Remotion

Untuk layar putih yang butuh **dunia 3D yang bergerak**: kamera zoom out, benda berubah bentuk, benda jatuh, Pion
membesar atau terbang. Latar istana (Mode 3, Blender Cycles) indah, tapi butuh beberapa menit per frame. Mode ini
meniru teknik istana di three.js, sekitar 17 detik per frame di mesin 4 core. Contoh lengkap: `examples/proj7`
(video Sphere Las Vegas).

Skill yang dipakai: `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-textures`,
`threejs-asset-pipeline`, `remotion-best-practices`, ditambah skill ini. Untuk SFX: `elevenlabs-sound-effects`.

## Alur kerja

1. **Pelajari video.** Cari layar putih (median kecerahan > 235 per frame), transkrip VO per kata
   (ElevenLabs Scribe `scribe_v3`), tulis waktu lokal tiap kata per layar putih.
2. **Storyboard dari sketsa user.** Satu shot per gambar. Tulis waktu mulai, posisi kamera, ukuran Pion, apa
   yang bergerak, dan teks apa yang muncul. Pakai satuan dunia yang masuk akal (proj7: kaki/feet).
3. **Frame Pion (engine).** `react_render.js --png --bg black --size 1080x1920`, `frame full`, dengan cue `light`
   yang **sama arahnya dengan matahari scene**. Contoh golden hour dari kiri:
   `light dir -.78 .42 .46 key 1.15 .82 .55 amb .21 .27 .42 rim .6 .72 1.0 exp 1.0`.
   Gesture dan ekspresi seperti biasa (cue bisa diuji dulu dengan `--preview`).
4. **Dunia three.js** (`examples/proj7/scene/scene.js` sebagai template, `render_scene.js` sebagai driver Playwright):
   - Pion adalah **billboard** dari frame engine. Bayangannya jatuh ke dunia (layer 1, hanya untuk shadow camera).
     Pion sendiri digambar di layer terpisah (`pionRT`) yang digabung **setelah AgX, sebelum grade**.
   - Driver menulis `pts.json`: posisi layar titik-titik 3D penting per frame (puncak, kaki, tepi, pusat benda).
5. **Teks Remotion** (`castle3d/remotion`, komposisi `SceneOverlay`): `dim` (garis ukur yang menempel ke titik 3D +
   angka menghitung), `counter`, `pop` (lencana dengan efek gempa), `caption` (`pos: top|bottom`), `cuts`
   (zoom-blur), `intro` (video lain, misalnya shot istana dari Mode 3). Contoh props ada di `examples/proj7/overlay.py`.
6. **SFX**: ElevenLabs SFX v3 (`eleven_text_to_sound_v3`), satu request per suara (request paralel bisa gagal 401),
   tiap suara sekitar 100 kredit. Timeline di `build_sfx.py`. Suara efek otomatis mengecil saat Pion bicara
   (sidechain di `assemble.py`).
7. **Rakit**: footage 30 fps menjadi 60 fps, scene ditempel di layar putih, zoom-blur di tiap potongan.
8. **Review**: contact sheet tiap 0,4 detik, ditambah frame rapat di momen penting. Perbaiki dulu baru kirim.

## Standar kualitas (meniru latar istana)

| Istana (Blender) | Tiruan di three.js |
|---|---|
| Cycles GI (cahaya memantul) | `GTAOPass` + HDRI kota CC0 (`@pmndrs/assets/hdri/city.exr.js`) + HemisphereLight |
| Garis tinta Freestyle | `ShaderPass` deteksi tepi dari depth + normal milik GTAO, garis memudar di kejauhan |
| AgX "Punchy" | `AgXToneMapping` + pass grade (saturasi ×1,16, kontras ×1,07) |
| Material prosedural + bump | tekstur canvas prosedural + `bumpMap` (jendela, bata, paving) |
| Kabut volumetrik | `FogExp2` hangat + `Sky` fisik (matahari golden hour) |
| Cahaya per mood | satu arah matahari yang dipakai bersama oleh scene **dan** cue `light` Pion |
| Glow lampu | `UnrealBloomPass` dengan threshold tinggi (hanya emissive) |
| Vignette | di pass grade |

**Gaya bentuk:** kartun. Pakai `RoundedBoxGeometry`, proporsi agak gembung atau meruncing, warna cerah
(krem, koral, tosca, kuning, lavender, mint, peach), jendela bulat besar, atap kubah atau kerucut warna-warni,
pohon kanopi bola, mobil warna permen. Kalau user minta realistis: `scene_real.js`.

## Jebakan yang sudah pernah terjadi

- Proyeksi titik untuk overlay **setelah** `camera.updateMatrixWorld()`. Kalau sebelum, garis ukur meleset.
- `ShaderPass` menyalin uniform. Pasang ulang tekstur render target setelah pass dibuat
  (`pass.uniforms.tX.value = rt.texture`).
- Sprite transparan (debu, asap) jangan masuk scene utama: GTAO dan tinta membuatnya jadi kotak hitam.
  Taruh di scene layer Pion.
- Plane bayangan Pion (colorWrite false) tetap ikut terlihat oleh pass normal GTAO. Taruh di `layers.set(1)` dan
  aktifkan layer 1 hanya di `sun.shadow.camera.layers`.
- Morph bulat menjadi datar: arah UV yang salah membalik winding, sehingga permukaan jadi hitam. Petakan
  `x = (u - 0.5) * lebar`.
- Rantai script yang menunggu kata `DONE` di log: hapus log lama dulu, kalau tidak pipeline jalan terlalu cepat.
- Render engine Pion ulang kalau arah cahaya scene berubah. Cahaya Pion harus searah matahari.
- Kamera di dekat tanah melihat ke cakrawala: kabut terlalu tebal membuat gambar pucat. Turunkan density.

## Waktu render (4 core, tanpa GPU)

Engine Pion 1080x1920 blur 6: sekitar 15 menit per 8 detik. Scene three.js dengan AO + tinta + bloom: sekitar
17 detik per frame (3 proses paralel). Overlay Remotion: beberapa menit. Video 2 x 8 detik: total sekitar 2 jam.

## Catatan proj8 (format animasi fakta, akun ElevenLabs free)

- Akun free: hanya voice premade untuk TTS, output `mp3_44100_128` (192 ditolak, termasuk untuk SFX).
- Ambient terlalu kuat = bayangan hilang. Cek frame uji: tiang/Pion harus punya bayangan jelas searah matahari.
- Dua plane tanah bertumpuk harus berjarak jauh (≥ 1 m) atau z-fighting menghapus tekstur di sebagian frame.
- `render_scene.js --frames a,b,c` untuk render uji frame kunci. `SceneOverlay` pop: `size`, `dx`, `dy`, langsung opak.
- Contoh lengkap: `examples/proj8` (Mona Lisa 77 x 53 cm, Paris kartun).
