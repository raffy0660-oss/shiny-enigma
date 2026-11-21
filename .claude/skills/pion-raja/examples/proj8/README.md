# proj8: demo Mona Lisa (format baru: animasi storytelling fakta, tanpa footage)

5,4 detik, 1080x1920 60 fps. Close-up Mona Lisa (terlihat besar) -> kamera mundur cepat -> ternyata kecil di sebelah Pion,
di Cour Napoléon kartun (piramida kaca, istana Louvre berkubah, blok Haussmann, Menara Eiffel + Sacré-Cœur di kabut,
pohon, lampu Paris, turis). Satuan meter. Fakta: 77 x 53 cm (cat minyak di panel poplar, Louvre).

1. Suara Pion: ElevenLabs TTS `eleven_multilingual_v2`, voice premade (akun free TIDAK bisa voice library, dan
   format `mp3_44100_192` ditolak: pakai `mp3_44100_128`). Endpoint `/with-timestamps` memberi waktu per huruf -> waktu per kata.
   VO diberi jeda 0,25 dtk di depan (`vo/vo_pad.wav`).
2. Engine: `react_render.js --audio vo/vo_pad.wav --cues cues/eng_mona.txt --out eng/mona --png --bg black --blur 6`
   (`frame 2.4,8.2`: bingkai lebar supaya tangan yang menunjuk tidak terpotong tepi billboard).
3. Dunia: `cd scene && npm install && node render_scene.js mona ../out/mona --jobs 3` (~3 dtk/frame).
   Uji frame kunci dulu: `--frames 0,80,110,240,323` (pts.json digabung, tidak ditimpa).
4. Teks: `python3 overlay.py still 128,250` lalu `python3 overlay.py` (caption, pop "!", dua garis ukur 77 / 53 CM).
5. SFX: `sfx/gen.py` (6 suara, satu request per suara) + `sfx/build_sfx.py sfx_only.wav --dur 5.4`.
6. Mux VO + SFX (sidechain) lalu `loudnorm=I=-14:TP=-1`.

Jebakan baru: plane tanah luar terlalu dekat dengan plane plaza (5 cm) -> z-fighting, tekstur plaza hilang di sebagian
posisi kamera. Taruh plane luar 1,5 m di bawah dan near kamera 0,1. Ambient (HDRI + hemisphere) terlalu kuat menghapus
bayangan matahari: matahari 4,6, hemisphere 0,2, environment 0,28.

## v2: Pion terasa di dalam dunia (bukan kartu 2D)

- Cue `light ... soft 1`: shading engine halus (sisi yang membelakangi matahari benar-benar gelap), kilau matahari di
  tepi tubuh sisi matahari, garis luar 45% lebih tipis. Tanpa `soft` engine tetap cel seperti biasa.
- Matahari backlight golden hour dari kiri-belakang (`SUN_DIR -0.62 .42 -0.66`, cue Pion arah sama): bayangan jatuh ke
  arah kamera sehingga terlihat. Matahari dari samping dengan kamera rendah membuat bayangan cuma garis tipis.
- Bayangan Pion dari kartu terpisah yang menghadap matahari (`pionSh`), bukan kartu yang menghadap kamera.
- HDRI kota punya matahari sendiri dan menghapus bayangan: dipakai hanya untuk pantulan logam/kaca
  (`environmentIntensity 0.04`), bayangan diisi HemisphereLight biru langit.
- Lukisan membelakangi matahari, jadi diberi lampu lukisan kuningan + SpotLight.
- Awan kartun 3D (gugus bola), Sky `cloudCoverage 0`, mie rendah (tanpa silau), bloom threshold 6 (hanya lampu).
- Kabut linear `Fog(0xd8dde6, 12, 1500)`: jernih di sekitar Pion, tipis di istana, pekat di kota jauh. Turis 36 saja.
