# 🔊 Bot Stiker Bersuara (WhatsApp)

Bot WhatsApp yang bisa mengubah foto/video jadi **stiker + suara**. Jalan langsung di HP Android lewat **Termux**.

| Perintah | Fungsi |
|---|---|
| `.s` | Kirim/balas foto atau video dengan caption `.s` ➜ jadi stiker. Kalau videonya ada suara, 10 detik pertama suaranya ikut dikirim sebagai voice note 🔊 |
| `.ss teks` | Foto/video ➜ stiker + **suara AI** yang mengucapkan teksmu 🗣️ |
| `.suara teks` | Voice note suara AI saja |
| `.menu` | Daftar perintah |

> **Catatan:** WhatsApp sedang menyiapkan fitur resmi "stiker bersuara", tapi per November 2026 fitur itu baru ada di versi beta dan belum dibuka untuk pengguna. Bot lain juga belum bisa mengirim format barunya. Karena itu bot ini mengirim **stiker lalu voice note yang membalas stiker itu**. Hasilnya, suaranya tetap "menempel" ke stiker. Kalau fiturnya sudah resmi, bot bisa diperbarui.

---

## 1. Siapkan Termux

Pasang **Termux dari F-Droid** atau GitHub (jangan dari Play Store, versinya sudah lama). Lalu ketik:

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs-lts ffmpeg git
```

## 2. Ambil kode bot

```bash
git clone -b ccr-cf793fc6-7tltpw https://github.com/raffy0660-oss/shiny-enigma.git
cd shiny-enigma/whatsapp-bot
npm install
```

## 3. Isi pengaturan

```bash
cp .env.example .env
nano .env
```

- `PHONE_NUMBER`: nomor WA untuk bot, contohnya `6281234567890`.
- `ELEVENLABS_API_KEY`: API key dari [elevenlabs.io](https://elevenlabs.io) (Profile ➜ API Keys). Paket gratis sudah cukup untuk mencoba. Tanpa key ini, `.s` tetap jalan, tapi `.ss` dan `.suara` tidak.

Simpan di nano: `Ctrl+O`, `Enter`, lalu keluar dengan `Ctrl+X`.

## 4. Jalankan dan tautkan

```bash
termux-wake-lock   # supaya Termux tidak dimatikan Android
npm start
```

Bot akan menampilkan **KODE PAIRING**, contohnya `ABCD-EFGH`. Karena bot jalan di HP yang sama, kita tidak bisa scan QR. Pakai kode ini:

1. Buka WhatsApp, lalu ⋮ ➜ **Perangkat tertaut** ➜ **Tautkan perangkat**
2. Pilih **"Tautkan dengan nomor telepon saja"**
3. Masukkan kodenya

Kalau sudah muncul `✅ Bot tersambung!`, coba kirim `.menu` dari nomor lain.

Lain kali cukup `cd shiny-enigma/whatsapp-bot && npm start`, tidak perlu pairing lagi.

---

## Masalah umum

- **`ffmpeg belum terpasang`**: jalankan `pkg install ffmpeg`.
- **Bot logout / mau ganti nomor**: hapus data login dengan `rm -rf auth`, lalu `npm start` lagi.
- **`ElevenLabs error 401`**: API key salah atau belum diisi di `.env`.
- **Ganti suara AI**: pilih suara di Voice Library ElevenLabs, salin *Voice ID*-nya ke `ELEVENLABS_VOICE_ID`.
- **Video ditolak**: maksimal 30 detik. Stiker animasi diambil dari 8 detik pertama.

⚠️ Baileys bukan API resmi WhatsApp, jadi ada risiko nomor diblokir. **Sebaiknya pakai nomor cadangan**, jangan nomor utama.
