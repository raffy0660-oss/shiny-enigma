# "The Photograph": rencana produksi

Shorts detektif Pion Raja, full animasi. 9:16, 1080x1920, 60 fps, **73,4 dtk** (panjang VO).
- **VO:** `vo.mp3` (ElevenLabs, dari user). Timing per kata ada di `vo_stt.json` (faster-whisper small.en).
- **Aturan gaya:** `.claude/skills/pion-raja/PANDUAN_SINEMATIK.md` (§1–8).
- **Model:** cue `style2d` (bentuk rata, cahaya hanya di pakaian).
- **Set kantor:** `.claude/skills/pion-raja/examples/proj10_office/` (dengan mood cahaya).
- **Kerja lokal:** `~/pion/proj10/` (scene/, eng/, cues/, final/).

## Karakter
| Siapa | Engine | Catatan |
|---|---|---|
| Pion (narator "I") | `style2d` + `detective 99` | kostum detektif |
| Pion 5 tahun lalu | `style2d` (mahkota + jubah asli) | hanya di pantulan kaca jam / siluet. Mahkota = petunjuk twist |
| Daniel Cross | `piece pawn` + `outfit daniel` | korban, tergeletak, tidak sadis, tanpa darah |
| Polisi | `piece rook` + `outfit police` | TKP hari Jumat |

## Set
1. **Kantor** (sudah ada). Mood `normal`, `tension`, `conflict`, dan `reveal` bisa di-blend.
2. **Apartemen terbengkalai** (dibuat). Muncul dalam 3 versi:
   - A) dunia di dalam foto: pudar sepia-biru, Daniel tergeletak, jam rusak 11:42
   - B) saat digeledah: kosong, debu, god ray dari celah papan jendela
   - C) TKP Jumat: malam, sirene merah-biru, garis polisi
3. **Eksterior gedung apartemen + jalan senja** (dibuat): neon "APARTMENTS" berkedip, hujan tipis, kabel.

## Timeline (dtk, dari VO)
| # | Waktu | Narasi | Set / shot | Mood | Kamera | Teks / SFX |
|---|---|---|---|---|---|---|
| 1 | 0.00–3.78 | I solved a murder three days before the victim was even killed. | Kantor: Pion di balik meja di bawah lampu, lalu ke papan kasus | lampu menyala dengan kedip di 0.1, lalu `normal` (spotlight hook) | push-in pelan, lalu terbang ke kartu foto mayat di papan, push ke "the photo" | stempel CASE SOLVED di "solved". SFX: klik saklar, dengung lampu, hujan |
| 2 | 4.56–10.24 | It all started when I received an anonymous photograph… abandoned apartment. | Kantor: amplop meluncur di celah pintu, Pion membuka. **Kamera menembus foto** ke apartemen A | `normal`, lalu sepia di dunia foto | terbang ke pintu, tembus foto | amplop "NO SENDER". SFX: amplop, whoosh |
| 3 | 10.72–15.02 | Beside his body was a broken clock, frozen at exactly 11:42. | Apartemen A: Daniel tergeletak, jam retak | foto-dunia, jam memancar cahaya | menukik ke jam | **11:42**. SFX: detak berhenti, retak kaca |
| 4 | 15.56–20.60 | On the back… five words. "Find him before Friday." | Kantor: foto dibalik, tulisan tangan | lampu berkedip sekali di "Friday" | whip balik foto | tulisan muncul huruf per huruf. SFX: kertas, guntur pelan |
| 5 | 21.18–27.88 | I tracked down the apartment… Daniel Cross… disappeared five years earlier. | Eksterior senja, lalu pintu apartemen | dingin senja | terbang di atas jalan ke gedung | kartu berkas DANIEL CROSS – MISSING 5 YEARS |
| 6 | 27.88–34.00 | I searched the entire apartment but found nothing. No body, no blood, not even a single fingerprint. | Apartemen B: Pion dengan kaca pembesar, god ray, debu | `tension` (biru naik, lampu senter) | 3 lompatan cepat, satu per stempel | stempel NO BODY / NO BLOOD / 0 FINGERPRINTS |
| 7 | 34.46–39.34 | Then Friday arrived. Police discovered a dead body inside that exact apartment. | Kalender robek jadi FRIDAY, lalu apartemen C: polisi, garis polisi | **`conflict`** (cahaya patah tepat di "Then Friday") | kalender whip, wide TKP | FRIDAY. SFX: sirene, petir |
| 8 | 39.70–45.00 | It was Daniel Cross. And beside him was the same broken clock, stopped at 11:42. | Apartemen C: foto diangkat dan menumpuk pas dengan TKP | `conflict` | push pelan ke jam | 11:42. SFX: dentuman bass |
| 9 | 45.62–51.52 | I went back to the photograph… a reflection in the clock's glass. | Kantor: hanya lampu meja, kaca pembesar | `tension` | masuk lewat kaca pembesar, tembus kaca jam | SFX: detak jam makin keras |
| 10 | 51.96–54.10 | Someone was standing behind the camera. | Pantulan: siluet memegang kamera | gelap | push sangat lambat | SFX: shutter + flash |
| 11 | 54.56–55.30 | It was me. | Siluet bermahkota = Pion Raja asli | **`reveal`** (cahaya bawah) | snap zoom ke muka Pion | SFX: hit + hening |
| 12 | 55.74–64.04 | I checked the photograph's metadata… five years old… the night Daniel disappeared. | Kantor: muka Pion disinari laptop | `reveal` | push pelan | panel metadata: 3 DAYS AGO → 5 YEARS AGO, glitch merah |
| 13 | 64.62–72.90 | Then I discovered the sender's identity… my own email… before I even became a detective. | Kantor: layar email | `reveal` → makin gelap | mundur pelan; jam dinding 11:41 → **11:42** di frame terakhir | From: email Pion (fiktif). Langsung hitam |

## Kamera dan cahaya (dari panduan)
- **Kamera:** gerak besar tiap ~1,65 dtk, durasi 0,6 dtk, ease sinus, drift push-in +2%/dtk, hampir tanpa cut biasa. Transisi tembus objek: foto, kaca pembesar, kaca jam, layar.
- **Mood:** mood patah tepat di kata belokan ("Then Friday", "It was me"). Selain itu di-blend pelan supaya tensi naik.
- **Model:** muka paling terang di frame; tint ikut warna mood.

## Status
- [x] VO + transkrip
- [x] Kantor + mood cahaya
- [x] Model 2D + baju Daniel/polisi
- [ ] Tes 5 dtk (adegan 1) ← sekarang
- [ ] Apartemen (A/B/C), eksterior
- [ ] Render semua adegan, overlay Remotion, SFX ElevenLabs, rakit
