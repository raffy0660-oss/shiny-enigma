# Panduan: memasukkan karakter benar-benar ke dalam dunia 3D (untuk konten berikutnya)

Catatan dari user (Nov 2026, episode "The Photograph"): kalender di meja seharusnya berada **di depan** Pion, tapi tertutup karakternya.
User ingin karakter **benar-benar masuk ke dalam video**: tertutup objek di depannya, kena cahaya dan bayangan set, dan ikut efek fisika.

## Kenapa terjadi
Pipeline sekarang (mode 4, proj10): Pion dirender engine sebagai PNG transparan, lalu ditempel ke dunia three.js sebagai **kartu**
yang digambar di render target terpisah **tanpa depth test**, lalu dikomposit di atas dunia. Akibatnya:
- karakter selalu di atas semua objek, kecuali yang dipotong *clipping plane* (meja) atau digambar ulang di lapisan depan (garis polisi);
- karakter tidak menjatuhkan bayangan asli dan tidak menerima bayangan set (hanya tint warna);
- tidak ada interaksi fisika (benda tidak bisa mengenai, menumpuk, atau terpental dari karakter).

## Solusi cepat yang sudah dipakai (tanpa render ulang semua)
**Pass oklusi depth** di `office.js`: props yang bisa berada di antara kamera dan karakter diberi `layers.enable(2)`.
Sebelum kartu digambar, scene dirender sekali dengan `camera.layers.set(2)` dan material *depth-only* (`colorWrite: false`)
ke render target kartu, lalu kartu digambar dengan `depthTest: true`. Hasilnya, objek di depan menutupi karakter dengan benar.
Biayanya kecil (satu render geometri tanpa shading). Pasang pola ini di **semua set sejak awal**: apartemen dan eksterior juga.

## Rekomendasi untuk konten berikutnya (dirancang dari awal, bukan revisi)
1. **Kartu ber-depth di dalam scene utama.** Taruh kartu karakter langsung di scene utama dengan `depthTest/depthWrite` dan `alphaTest`,
   ditambah `customDepthMaterial` (`MeshDepthMaterial` dengan `alphaMap` dan `alphaTest`) supaya kartu **menjatuhkan bayangan asli** ke lantai/meja.
   Komposit tetap setelah AgX supaya warna 2D tidak berubah (render kartu dengan `toneMapped: false` di pass yang sama, atau pakai
   render target ber-depth yang memakai depth buffer dunia). Ink dan GTAO dikecualikan dari kartu.
2. **Karakter 3D asli di dunia yang sama (paling kuat).** Engine Pion sudah WebGL2. Model (badan, kepala, outfit, lengan) bisa
   diekspor/porting menjadi mesh three.js dengan shader `style2d` (gradasi lukis, outline tinta), lalu dirender dalam scene yang sama.
   Hasilnya: oklusi, bayangan jatuh, cahaya set di model, motion blur kamera, dan DOF semuanya otomatis benar.
   Ekspresi wajah = tekstur/decal yang digambar engine per frame (kanvas) di bola kepala.
3. **Fisika.** Tambahkan `rapier3d-compat` atau `cannon-es` (deterministik, langkah tetap 1/60) dengan **collider kapsul** untuk tiap karakter
   (mengikuti `anchor` per frame sebagai *kinematic body*). Props (kertas, amplop, foto, halaman kalender) menjadi *dynamic body*.
   Simulasi dijalankan sekali di Node untuk seluruh adegan, posisinya disimpan per frame (`sim.json`), lalu dibaca saat render per frame,
   supaya render paralel tetap deterministik.
4. **Interaksi tangan.** Track posisi tangan dari engine (`items`/`_track.json`) dipakai sebagai titik tempel prop 3D
   (foto di tangan, kaca pembesar), sehingga prop 3D ada di depan badan, di belakang ibu jari, dan bayangannya benar.
5. **Checklist per adegan.** Sebelum render, cek setiap shot: apakah ada objek di antara kamera dan karakter? Kalau ada, objek itu harus masuk
   layer oklusi (atau scene utama bila memakai opsi 1/2). Cek juga bayangan kontak di bawah karakter.

## Biaya
- Opsi pass oklusi: hampir gratis, bisa dipakai sekarang.
- Opsi 1: perubahan kecil di `placePion`/`placeCards` + bayangan alpha. Butuh render ulang adegan yang memakainya.
- Opsi 2 + 3: pekerjaan besar sekali di awal (porting model + rig, collider), lalu semua episode berikutnya mendapat oklusi, bayangan, dan fisika asli.
