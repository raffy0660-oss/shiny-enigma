# proj6: bubble ring (banjir + bawah air)

Video sumber 1078x1920 30 fps, dua layar putih: 4,60-10,50 dan 25,00-35,34 (+2,6 detik ekor untuk ring + pose).

1. Audio per layar putih: `ffmpeg -ss 4.6 -t 5.9 -i vo.wav w1.wav`, `ffmpeg -ss 25 -i vo.wav -af apad=pad_dur=2.6 w2.wav`.
2. Scene istana + air: `castle_video.py --cues white1.txt --audio w1.wav --res 1080x1920 --samples 32` (sama untuk white2).
   Plate `hangat` dirender sekali lalu disalin ke folder work kedua adegan.
3. SFX: `gen.py` (ElevenLabs SFX v3; akun free cepat habis kuota) + `build_sfx.py` (sisanya procedural).
4. Rakit: `assemble.py w1.mp4 w2.mp4 sfx_only.wav hasil.mp4` (footage 60 fps, zoom-blur di tiap potongan, mix audio).
