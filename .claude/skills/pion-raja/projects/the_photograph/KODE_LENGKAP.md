# Kode lengkap "The Photograph" (73,4 dtk, 1080x1920, 60 fps)

Semua kode yang dipakai membuat video ini. Tidak ada AI gambar/video: semuanya dirender lokal dengan
three.js (dunia 3D), engine Pion (karakter 2D + lip-sync), Remotion (teks/caption), ffmpeg (rakit + audio), ElevenLabs (SFX + musik).

## Isi
```
.claude/skills/pion-raja/projects/the_photograph/
  setup.sh                 menyiapkan ~/pion/... dari repo (engine, Remotion, three.js, font, SFX)
  PLAN.md                  13 adegan + timing VO        HANDOFF.md  status, keputusan, cara kerja
  vo.mp3, vo_stt.json      voice-over + timing per kata (faster-whisper)
  assets/                  sfx/*.mp3 (ElevenLabs), fonts/ (Caveat, Montserrat)
  src/
    scene/                 DUNIA 3D (three.js r186)
      office.js              kantor detektif (lampu gantung, papan kasus, pintu SUCCIFY, kalender robek, laptop layar hidup)
      apartment.js           apartemen versi A (dunia foto) / B (digeledah) / C (TKP)
      exterior.js            jalan senja hujan
      charlayer.js           karakter 2D DI DALAM dunia: oklusi, cahaya set, bayangan, debu, lompat
      index.html             halaman render (post: AgX, GTAO, tinta, bokeh, bloom, grade)
      render_seq.js          merender satu plan -> frame PNG (Playwright headless)
      render_office.js       smoke test / still
      tex/                   tekstur (foto, tulisan tangan, poster)
    plans/                 KAMERA + AKSI per adegan (key kamera, posisi karakter, mood cahaya, event)
      lib.js, s12_office.js, s23_apt.js, s4_office.js, s5_ext.js, s6_aptB.js, s7_office.js,
      s78_aptC.js, s9_office.js, s10_aptA.js, s1113_office.js, photo_still.js
    cues/                  CUE ENGINE per karakter (ekspresi, gesture, waktu): s12_pion.txt, s2_daniel.txt, ...
    build_film.py          menyambung render adegan jadi satu urutan frame (crossfade, foto di atas TKP, LUT)
    overlay_film.py        Remotion: caption (polos untuk narasi) + teks data ("11:42", "NO BODY", ...)
    sfx_gen.py             membuat SFX + loop musik lewat ElevenLabs SFX v3
    mix_film.py            mix: VO -13 LUFS, musik -22, SFX -18, whoosh otomatis, riser, limiter; + sfx_only.wav
    assemble.sh            rakit akhir: build -> overlay -> mix -> MP4
    tools/                 make_view.js (sudut kamera -> sudut gambar karakter), make_photo.py, make_reflection.py,
                           sheet.sh (contact sheet), export_chat.py, run_*.sh (antrean render yang dipakai)
.claude/skills/pion-raja/
  engine/                  ENGINE PION: react_render.js (render karakter dari cue + lip-sync VO), react.js, render.js (style2d)
  castle3d/remotion/src/   SceneOverlay.tsx (item word / cap), komposisi Remotion
  BRIEF_KONTEN.md          semua aturan dari user        PANDUAN_INTEGRASI3D.md  karakter 2D di dunia 3D
  examples/proj10_photograph/  template untuk video berikutnya
```

## Urutan membuat video
```bash
bash .claude/skills/pion-raja/projects/the_photograph/setup.sh                         # 1. siapkan ~/pion (sekali per container)
cd ~/pion/pion_raja && bash ~/pion/bin/run_eng.sh             # 2. render karakter (engine) per adegan dari cues/ + VO
cd ~/pion/proj10/scene && node render_seq.js ../plans/s12_office.js ../out/s12 --from 0 --to 510 --jobs 3 --skip   # 3. dunia 3D
#    (antrean yang dipakai: tools/run_scenes_a/b/c.sh, run_full_q*.sh; pecah rentang frame, jalankan dengan nohup)
bash ~/pion/bin/sheet.sh ../out/s12 sheet.jpg 6 220 0 100 200  # 4. cek contact sheet
cd ~/pion/proj10 && python3 sfx_gen.py                         # 5. SFX + musik (sekali; hasil sudah ada di assets/sfx)
bash assemble.sh                                              # 6. build_film -> overlay_film -> mix_film -> MP4 + sfx_only.wav
```
Kebutuhan: Node 20+, Python 3 (numpy, pillow), ffmpeg, Chromium + Playwright (sudah ada di container cloud).
