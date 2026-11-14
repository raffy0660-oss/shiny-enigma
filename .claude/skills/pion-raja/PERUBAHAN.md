# Pion Raja: catatan perubahan

## Animasi & karakter
- **6 gesture baru dengan animasi tangan.** `clap`, `lookout`, `dance`, `facepalm`, `knock`, dan `cross` sudah ada
  di `timeline.js` tapi `gestureState()` tidak menanganinya, jadi tangan tidak pernah muncul. Sekarang:
  - clap: kira-kira 4 tepukan per detik, plus efek garis benturan kecil di titik tangan bertemu
  - lookout: tangan jadi "visor" di dahi, tangan lain di pinggang, kepala menoleh kiri-kanan
  - dance: kedua tangan naik-turun bergantian
  - facepalm: tangan menutup wajah, kepala sedikit menunduk
  - knock: tangan mengetuk ke depan, badan ikut maju-mundur
  - cross: tangan bersilang di dada
- **Gesture pendek sekarang tampil.** Ramp masuk/keluar dulu tetap 0.16 dtk, jadi gesture < 0.32 dtk
  (cross 10.0, facepalm 10.9, up 15.02) tidak pernah terlihat. Sekarang ramp = min(0.16, durasi/3).
- **Ganti ekspresi tanpa ghosting.** Crossfade diganti dengan "squash-pop": fitur wajah memipih,
  berganti di tengah, lalu memantul balik sedikit. Tidak ada lagi dua wajah bertumpuk transparan.
- **Kedip otomatis** (deterministik, interval 2–4.4 dtk, kadang kedip ganda) untuk ekspresi bermata terbuka
  (datar, senang, kaget, penasaran). Tidak berkedip saat ekspresi sedang berganti atau saat teleport.
- **Kilau putih di kepala** dipindah ke layer tekstur sendiri, jadi tidak ikut terdistorsi saat kedip/ganti ekspresi.
- **Bahu lengan ditutup** dengan bola sendi di dalam badan. Ujung tube yang terbuka dulu membuat outline bergerigi.
- **Mahkota emas berkilau.** Shader toon specular + fresnel sudah ada tapi `uSpec` tidak pernah diset.
  Posisi mata kamera (`uEye`) juga dibetulkan ke `[0, HC, 0]` (dulu `[0,10,20]`).
- **Motif ermine** diganti dari bercak acak menjadi "ekor ermine" klasik (tetesan + 3 titik) yang ter-tile rapi.
- Font kartu komentar, stempel FAKE, dan BONK sekarang punya fallback (`Inter, Arial Black, sans-serif`).

## Pipeline
- `drive.js`: render **paralel** (`JOBS=n`, default setengah jumlah core, maks 6), rentang frame `a-b`,
  resume dengan `SKIP=1`, dan fallback `require('playwright')`. Hasil per-chunk identik byte-per-byte
  dengan render berurutan, karena fisika disimulasi ulang dari awal shot.
- `objtrack.py`, `comp.py`, `verify.py`: path video bisa diatur lewat env `VIDEO=...` (default tetap path lama).
- **Baru: `preview.js`**: preview karakter tanpa video/tracking data. Membuat plan sintetis lalu me-render
  momen timeline jadi satu contact sheet.

```bash
node preview.js out.png 2.0,2.7,6.6,8.5 --pitch 20 --size 620
```

```bash
JOBS=4 node drive.js frames all
```

`before_after.png`: perbandingan sebelum/sesudah.
