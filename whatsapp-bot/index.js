// Bot WhatsApp "Stiker Bersuara" — jalan di Termux pakai Baileys.
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadContentFromMessage,
  getContentType,
  useMultiFileAuthState,
} from 'baileys'
import pino from 'pino'
import { createInterface } from 'node:readline/promises'
import { extractVoiceNote, makeSticker, toVoiceNote } from './lib/media.js'
import { speak } from './lib/tts.js'

try {
  process.loadEnvFile() // baca file .env
} catch {}

const PREFIX = process.env.PREFIX || '.'
const PACK = process.env.STICKER_PACK || 'Stiker Bersuara'
const AUTHOR = process.env.STICKER_AUTHOR || 'Bot Irav'
const logger = pino({ level: 'silent' })

const MENU = `*🤖 BOT STIKER BERSUARA*

*${PREFIX}s* — kirim/balas foto atau video dengan caption ini
  ➜ jadi stiker. Kalau video ada suaranya, suaranya ikut dikirim 🔊

*${PREFIX}ss teks* — kirim/balas foto atau video
  ➜ jadi stiker + suara AI yang mengucapkan teksmu 🗣️

*${PREFIX}suara teks*
  ➜ voice note suara AI

*${PREFIX}menu* — tampilkan menu ini`

async function askPhoneNumber() {
  if (process.env.PHONE_NUMBER) return process.env.PHONE_NUMBER
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const n = await rl.question('Masukkan nomor WhatsApp untuk bot (contoh 6281234567890): ')
  rl.close()
  return n
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ auth: state, logger, browser: Browsers.ubuntu('Chrome') })
  sock.ev.on('creds.update', saveCreds)

  let pairingRequested = false
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // Bot jalan di HP yang sama, jadi pakai kode pairing (bukan scan QR).
    if (qr && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true
      const phone = (await askPhoneNumber()).replace(/\D/g, '')
      const code = await sock.requestPairingCode(phone)
      console.log(`\n🔑 KODE PAIRING: ${code.match(/.{1,4}/g).join('-')}`)
      console.log('Buka WhatsApp ➜ Perangkat tertaut ➜ Tautkan perangkat ➜ "Tautkan dengan nomor telepon saja", lalu masukkan kode di atas.\n')
    }
    if (connection === 'open') console.log('✅ Bot tersambung! Kirim ".menu" ke bot untuk mencoba.')
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Bot logout. Hapus folder "auth" lalu jalankan ulang untuk pairing lagi.')
        process.exit(1)
      }
      console.log('🔄 Koneksi terputus, menyambung ulang...')
      setTimeout(start, 3000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      handle(sock, msg).catch(async (e) => {
        console.error(e)
        await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Gagal: ${e.message}` }, { quoted: msg })
      })
    }
  })
}

// Buka "bungkus" pesan sekali lihat / pesan sementara.
function unwrap(m) {
  while (m) {
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message
    if (!inner) return m
    m = inner
  }
  return m
}

function getText(m) {
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ''
  )
}

// Cari foto/video di pesan itu sendiri atau di pesan yang dibalas.
function findMedia(m) {
  const quoted = unwrap(m?.[getContentType(m)]?.contextInfo?.quotedMessage)
  for (const src of [m, quoted]) {
    if (!src) continue
    if (src.imageMessage) return { kind: 'image', node: src.imageMessage }
    if (src.videoMessage) return { kind: 'video', node: src.videoMessage }
    if (src.stickerMessage) return { kind: 'sticker', node: src.stickerMessage }
  }
  return null
}

async function download(media) {
  const stream = await downloadContentFromMessage(media.node, media.kind)
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

async function handle(sock, msg) {
  const m = unwrap(msg.message)
  if (!m) return
  const text = getText(m).trim()
  if (!text.startsWith(PREFIX)) return

  const [cmd, ...rest] = text.slice(PREFIX.length).split(/\s+/)
  const arg = rest.join(' ').trim()
  const jid = msg.key.remoteJid
  const reply = (content, opts = {}) => sock.sendMessage(jid, content, { quoted: msg, ...opts })
  const sendVoice = (audio, quoted) =>
    sock.sendMessage(jid, { audio, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted })

  switch (cmd.toLowerCase()) {
    case 'menu':
    case 'help':
      return reply({ text: MENU })

    case 's':
    case 'stiker':
    case 'sticker':
    case 'ss':
    case 'stikersuara': {
      const withAiVoice = cmd.toLowerCase().startsWith('ss') || cmd.toLowerCase() === 'stikersuara'
      if (withAiVoice && !arg) return reply({ text: `Tulis teksnya, contoh: *${PREFIX}ss halo semuanya!*` })

      const media = findMedia(m)
      if (!media || media.kind === 'sticker')
        return reply({ text: `Kirim atau balas *foto/video* dengan caption *${PREFIX}${cmd}*` })
      if (media.kind === 'video' && (media.node.seconds || 0) > 30)
        return reply({ text: 'Videonya kepanjangan, maksimal 30 detik ya.' })

      await sock.sendPresenceUpdate('composing', jid)
      const file = await download(media)
      const animated = media.kind === 'video'

      // Siapkan stiker dan suaranya bersamaan.
      const [sticker, voice] = await Promise.all([
        makeSticker(file, { animated, pack: PACK, author: AUTHOR }),
        withAiVoice ? speak(arg).then(toVoiceNote) : animated ? extractVoiceNote(file, 10) : null,
      ])

      const sent = await reply({ sticker })
      if (voice) await sendVoice(voice, sent)
      return
    }

    case 'suara':
    case 'tts': {
      if (!arg) return reply({ text: `Contoh: *${PREFIX}suara halo, apa kabar?*` })
      await sock.sendPresenceUpdate('recording', jid)
      return sendVoice(await toVoiceNote(await speak(arg)), msg)
    }
  }
}

start()
