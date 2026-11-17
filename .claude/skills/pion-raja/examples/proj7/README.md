# proj7: Las Vegas Sphere (dunia 3D three.js + overlay Remotion)

Video sumber 1080x1920 30 fps, dua layar putih: 7,10-15,00 dan 21,933-29,90.

1. Pion engine (PNG transparan, 1080x1920, `frame full`, cahaya siang): `react_render.js --cues cues/eng_w1.txt --png --bg black`.
   Fitur baru: `gest kantong` (tangan di saku, pose The Notebook), `booktitle deathnote` (buku soktahu jadi Death Note).
2. Dunia luar istana, versi REALISTIS (`scene/scene.js`; versi kartun lama di `scene/scene_toon.js`): three.js r186, material PBR,
   langit fisik (Sky), HDRI kota CC0 dari `@pmndrs/assets` untuk cahaya + pantulan, ACES, bloom untuk LED. Kota: plaza, jalan aspal
   bermarka, mobil, lampu jalan, palem, hotel/gedung kaca, piramida kaca, menara rangka besi, menara jarum observasi, bianglala.
   Pion digambar setelah tone mapping (warnanya tetap), bayangannya tetap jatuh di dunia 3D.
   `npm install three@0.186.0 @pmndrs/assets@1.7.0`, lalu:
   `cd scene && npm install three@0.186.0 && node render_scene.js w1 ../out/w1` (juga menulis `pts.json`: titik 3D di layar).
   Shot: Pion dekat + Sphere sebagian, zoom out, Pion membesar, kastil The Notebook; Sphere meleleh jadi layar datar
   480 x 333 ft (~160.000 sq ft), 3 lapangan football jatuh bergantian dengan gempa + debu, Pion terbang ke atas.
3. Interior istana (awal putih 2): `castle_video.py --cues cues/w2_interior.txt`.
4. Overlay: komposisi Remotion `SceneOverlay` (garis ukur yang menempel ke titik 3D, angka menghitung, pop 1-2-3, caption,
   zoom-blur di potongan): `python3 overlay.py w1`.
5. SFX: `sfx/gen.py` (ElevenLabs SFX v3) + `sfx/build_sfx.py`; rakit: `python3 assemble.py final/w1.mp4 final/w2.mp4 sfx/sfx_only.wav hasil.mp4`.
