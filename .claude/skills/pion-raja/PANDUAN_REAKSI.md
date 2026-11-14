# Mode Reaksi: Pion Raja ngomong pakai voice over kamu

Pion besar di layar, background **green screen** (atau transparan). Setiap suku kata di voice over
bikin badannya **goyang jelly** (memipih/memanjang, goyang kiri-kanan, kepala ikut membal, jubah berkibar),
dan **mulutnya buka-tutup** sesuai keras-pelannya suara. Ekspresi, gesture, dan arah kepala diatur lewat file cue.

## Alurnya
1. Kamu kirim **file voice over** (mp3/m4a/wav/mp4, apa saja).
2. Ceritakan **isi VO-nya** + reaksi yang kamu mau (misal "detik 3 sarkas", "pas bilang 'gila' dia kaget").
   Saya tidak bisa mendengar audio, jadi teks/waktunya dari kamu. Kalau tidak dikasih, dia tetap ngomong
   dan goyang jelly, cuma ekspresinya datar.
3. Saya buatkan file cue, render, dan kirim **`.._green.mp4`** (audio VO sudah di dalamnya, untuk patokan sinkron).
4. Di **CapCut**: taruh video kamu / layar hitam / blur sebagai latar → **Overlay** → tambahkan `_green.mp4`
   → **Hapus latar → Chroma key** → pilih warna hijau → **Intensitas** sekitar 20–40, naikkan **Bayangan** sedikit
   kalau ada garis hijau di pinggir. Audio overlay-nya bisa di-mute kalau VO aslinya sudah ada di timeline.

## Framing (`frame`)
| preset | isi layar |
|---|---|
| `small` | seluruh pion, kira-kira 38% tinggi layar |
| `mid` (default) | seluruh pion, kira-kira setengah tinggi layar |
| `big` | seluruh pion, kira-kira 65% tinggi layar |
| `full` | seluruh pion memenuhi layar |
| `close` | kepala + kerah besar |
| `face` | close-up ekstrem, kepala selebar layar |
| `bottom` | pion di setengah bawah, setengah atas kosong untuk video |

Custom: `frame 2.4,9.5,0.8` = tinggi bidikan, tinggi yang terlihat (makin besar = pion makin kecil), geser samping (+ = pion ke kiri).

## Terbang masuk / keluar
- `0.3 fly 3.0 jauh`: sebelum detik 0.3 layar kosong (untuk transisi dari video kamu), lalu pion terbang
  **pelan dari kejauhan menuju kamera** selama 3 detik. Tangannya terbentang, jubahnya berkibar, ada jejak kilau emas
  di belakangnya, lalu mendarat dengan "boing" jelly dan mulai menjelaskan.
  Arah datang: `jauh` (lurus dari kejauhan), `kiri`, `kanan`, `atas`, `bawah`.
- `9.0 flyout 1.4 atas`: terbang pergi (arah sama pilihannya).
- Selama menjelaskan dia **melayang** pelan naik-turun. Matikan dengan `hover off`.

## Ekspresi
`datar` `imut` `senang` `kaget` `penasaran` `curiga` `pusing` **`sinis`** (sarkas: mata setengah tertutup,
satu alis naik, senyum miring) **`ngakak`**. Saat ngomong, bentuk mulutnya ikut ekspresi
(`curiga`/`datar`/`sinis` mulutnya miring nyengir, `senang`/`ngakak` mulut lebar).

Ekspresi tambahan (diadaptasi dari desain Pion 2D lama):
`nangis` (air mata mengalir) · `tersedu` (T_T, sungai air mata) · `girang` (mata berbinar, ketawa lebar) ·
`bahagia` (^ ^ + blush) · `cium` (bibir "3" + hati) · `lega` (mata terpejam, "hah~") · `gemas` (>_< pipi merah) ·
`syok` (melotot, pupil kecil) · `kesal` (mata "=", urat 💢) · `ngiler` (melongo + iler) · `merajuk` (manyun) ·
`memelas` (mata anak anjing) · `bosan` · `cemas` (keringat, mulut bergelombang) · `bangga` (sombong) ·
`ngamuk` (teriak + 💢) · `santai` (mata not ♪, nyengir) · **`soktahu`** (🤓 kacamata kotak otomatis + gigi kelinci,
otomatis pose `nerd`: telunjuk kanan ke atas + tangan kiri memegang buku terbuka "THE BOOK OF LARP" seperti sedang dibaca, kecuali di waktu itu
sudah ada gesture lain).

## Gesture
`shrug` (angkat bahu) · `facepalm` · `point` (nunjuk, bisa ke titik layar) · `clap` · `cross` (tangan bersilang)
· `lookout` (tangan di dahi, celingukan) · `up` / `cheer` (tangan ke atas) · `wave` · `dance` · `present`
· `knock` · `press` · `nerd` (telunjuk ke atas + baca buku terbuka)

## Contoh file cue
```
frame mid
0.0   senang
0.3   fly 3.0 jauh          # layar kosong dulu, lalu terbang dari jauh ke depan kamera
3.3   penasaran
3.6   look -10 0 5          # melirik ke kiri layar, kepala miring
4.2   sinis
4.3   gest shrug 0.9        # angkat bahu selama 0.9 detik
5.6   look 0                # kepala kembali lurus
5.8   kaget
5.8   startle               # lompat kaget
6.4   ngakak
6.4   gest clap 0.8
7.2   gest point 0.9 kiri 200 300   # nunjuk ke titik (200,300) di layar 1080x1920
8.6   flyout 1.4 atas       # terbang pergi
```
Waktu bisa ditulis `75.5` atau `1:15.5`. `look <toleh°> [angguk°] [miring°]`, toleh + = ke kanan layar.

## Perintah render (untuk saya)
```bash
node react_render.js --audio vo.m4a --cues cues.txt --out hasil/reaksi1
```
- `--frame small` ganti framing · `--bg black` latar hitam · `--bg green,black` sekali render dua versi · `--jelly 1.5` jelly lebih kuat / `0.6` lebih halus
- `--alpha` tambah `.mov` transparan ProRes 4444 (besar, ~30 MB/detik) · `--png` simpan PNG transparan
- `--start 12 --dur 8` pakai sebagian audio saja · `--preview 1,2.5,4` cek cepat beberapa momen jadi satu gambar

## Kamera otomatis (zoom tiap beberapa kata)
`0.0 autozoom` mengaktifkan rencana kamera (`engine/camplan.js`):
- Setiap **3 kata** (`word`), kamera zoom halus (0,55 detik, tanpa momentum/getar) ke level berikutnya:
  **1,18x → 1,34x → 1,5x**, lalu bergantian 1,38x/1,5x. Level itu **ditahan** sampai titik zoom berikutnya.
- Kata dengan **`!`** (misal `word SALAH!`) langsung ke **1,5x** dan ditahan.
- Tiap **atmosfer** (mood cahaya dari ekspresi, `engine/moods.json`) punya sudut sendiri: kamera **bergeser ke pojok
  dan sedikit miring**. Sudut itu ditahan sampai mood berganti.
- Saat **mood berganti**: zoom out ke normal (0,7 detik), lalu zoom lagi dengan sudut berikutnya.
- `0.0 autozoom 2` tiap 2 kata · `0.0 autozoom 4 0.6` tiap 4 kata, lebih halus · `5.2 autozoom off` berhenti.
- Selama kamera bergerak ada **getaran halus** (hilang saat kamera diam). `--shake 0` di perintah render mematikan,
  `--shake 0.5` lebih halus. Motion blur engine (`--blur`) ikut memburamkan gerak kamera.
- `word` hanya penanda waktu kata (tidak ditampilkan). Tanpa `word`, ritmenya dari suku kata di audio.
- Video yang sudah jadi: `python3 microzoom.py --in hasil.mp4 --out hasil_zoom.mp4 --cues cues.txt` (zoom tanpa sudut).
- Video istana 3D: `castle3d/castle_video.py` memakai rencana kamera yang sama lewat Remotion.

## Gerakan otomatis (`acting`)
Pion bergerak sendiri mengikuti suara (default nyala):
- goyang berat badan pelan dan condong ke depan saat bicara;
- memantul kecil dan mengangguk di suku kata yang ditekan;
- **lompat kecil** di kata dengan `!`;
- "take" (memiringkan kepala sambil memantul) setiap ganti ekspresi;
- melirik kiri-kanan saat diam.

`acting 0` mematikan, `acting 0.5` lebih halus, `acting 1.5` lebih heboh.

## Cahaya per waktu
`3.2 light dir .. key .. amb .. rim .. exp 1` mengganti cahaya Pion mulai detik 3,2 (crossfade 0,4 detik).
`light ...` tanpa waktu tetap berlaku untuk seluruh video. Tambahkan `pos x y z` untuk lampu titik yang diam di ruangan
(satuan model Pion, kepala sekitar y=3): saat Pion bergerak, cahaya di badannya ikut berubah.
