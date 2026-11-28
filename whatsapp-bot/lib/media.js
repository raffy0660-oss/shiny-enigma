// Mengubah foto/video jadi stiker WhatsApp (.webp) dan memotong suara jadi voice note.
// Semua konversi pakai ffmpeg (di Termux: pkg install ffmpeg).
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import webpmux from 'node-webpmux'

const MAX_ANIMATED_BYTES = 1000 * 1024 // stiker animasi WhatsApp sebaiknya < 1 MB

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('error', (e) =>
      reject(e.code === 'ENOENT' ? new Error('ffmpeg belum terpasang. Jalankan: pkg install ffmpeg') : e)
    )
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `ffmpeg keluar dengan kode ${code}`))))
  })
}

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'wabot-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

// Pas-kan gambar ke kotak 512x512 dengan latar transparan.
const FIT_512 =
  'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,' +
  'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'

/**
 * @param {Buffer} input  isi file foto / video / gif
 * @param {{animated: boolean, pack: string, author: string}} opts
 * @returns {Promise<Buffer>} stiker .webp
 */
export async function makeSticker(input, { animated, pack, author }) {
  const webp = await withTempDir(async (dir) => {
    const src = join(dir, 'in')
    const out = join(dir, 'out.webp')
    await writeFile(src, input)

    if (!animated) {
      await ffmpeg(['-i', src, '-vf', FIT_512, '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '80', out])
      return readFile(out)
    }

    // Animasi: maksimal 8 detik. Kalau terlalu besar, turunkan kualitas & fps.
    for (const [fps, q, secs] of [[15, 60, 8], [12, 40, 7], [10, 25, 6], [8, 15, 5]]) {
      await ffmpeg([
        '-i', src, '-t', String(secs), '-an',
        '-vf', `fps=${fps},${FIT_512}`,
        '-c:v', 'libwebp', '-loop', '0', '-q:v', String(q), '-compression_level', '6',
        out,
      ])
      const buf = await readFile(out)
      if (buf.length <= MAX_ANIMATED_BYTES) return buf
    }
    throw new Error('Video terlalu berat untuk dijadikan stiker. Coba video yang lebih pendek.')
  })
  return addStickerInfo(webp, pack, author)
}

// Menyisipkan nama paket & pembuat stiker (metadata EXIF yang dibaca WhatsApp).
async function addStickerInfo(webp, pack, author) {
  const img = new webpmux.Image()
  await img.load(webp)
  const json = JSON.stringify({
    'sticker-pack-id': `wabot-${Date.now()}`,
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    emojis: ['🔊'],
  })
  const head = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ])
  const body = Buffer.from(json, 'utf8')
  const exif = Buffer.concat([head, body])
  exif.writeUIntLE(body.length, 14, 4)
  img.exif = exif
  return img.save(null)
}

/**
 * Ambil suara dari video (maks `seconds` detik) dan ubah jadi voice note (ogg/opus).
 * @returns {Promise<Buffer|null>} null kalau video tidak punya suara
 */
export async function extractVoiceNote(input, seconds = 10) {
  return withTempDir(async (dir) => {
    const src = join(dir, 'in')
    const out = join(dir, 'out.ogg')
    await writeFile(src, input)
    try {
      await ffmpeg(['-i', src, '-t', String(seconds), '-map', '0:a:0', '-vn', ...OPUS, out])
    } catch {
      return null // tidak ada trek audio
    }
    const buf = await readFile(out)
    return buf.length > 1024 ? buf : null
  })
}

/** Ubah audio apa saja (mis. mp3 dari ElevenLabs) jadi voice note ogg/opus. */
export async function toVoiceNote(input) {
  return withTempDir(async (dir) => {
    const src = join(dir, 'in')
    const out = join(dir, 'out.ogg')
    await writeFile(src, input)
    await ffmpeg(['-i', src, '-vn', ...OPUS, out])
    return readFile(out)
  })
}

const OPUS = ['-c:a', 'libopus', '-b:a', '64k', '-ac', '1', '-ar', '48000', '-application', 'voip']
