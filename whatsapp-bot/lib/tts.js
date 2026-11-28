// Suara AI dari ElevenLabs (text-to-speech). Butuh ELEVENLABS_API_KEY di file .env
const API = 'https://api.elevenlabs.io/v1/text-to-speech'

/**
 * @param {string} text
 * @returns {Promise<Buffer>} audio mp3
 */
export async function speak(text) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY belum diisi di file .env')

  const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'
  const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'

  const res = await fetch(`${API}/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs error ${res.status}: ${detail.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}
