/**
 * ElevenLabs text-to-speech for Say After Me.
 *
 * Mirrors the configuration of `audio-timer/scripts/generate-audio.mjs`
 * (the build-time deck audio generator) so a phrase the user
 * generates here sounds identical to a phrase from the prebuilt
 * decks: same model, same voice settings, same voice IDs.
 *
 * Returns the raw mp3 bytes. The route handler is responsible for
 * relaying them to the client; we don't persist anything server-side
 * (the app saves to its own filesystem when the user taps "Save to
 * deck").
 */

import { VOICE_IDS, type VoiceKey } from './voices'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech'
const ELEVENLABS_MODEL_ID = 'eleven_v3'

/**
 * Network timeout for the TTS call. ElevenLabs typically responds
 * in 1-3s for short phrases; 20s is generous and protects against
 * hung sockets without giving up on a slow-but-working request.
 */
const TTS_TIMEOUT_MS = 20_000

/**
 * Generate speech audio for `text` using the requested `voice`.
 *
 * @param text   The text to synthesise. For best results pass the
 *               translation output (in the target language), not the
 *               user's source phrase.
 * @param voice  One of the eight catalogue voices.
 * @returns      An mp3 Buffer.
 *
 * Throws on missing API key, non-2xx response, or network failure.
 * The route handler treats any throw here as "refund the user's
 * counter" since TTS is the most expensive step.
 */
export async function generateSpeech(
  text: string,
  voice: VoiceKey,
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('elevenlabs_misconfigured')
  }

  const voiceId = VOICE_IDS[voice]
  const url = `${ELEVENLABS_API_BASE}/${voiceId}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        // Asking for an explicit Accept header keeps the response a
        // simple binary mp3 instead of the default which can vary.
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        // Same settings as the prebuilt-deck script. Stability 0.5 +
        // similarity 0.75 produces natural, expressive output without
        // wandering away from the voice's character on longer phrases.
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: controller.signal,
    })
  } catch (err) {
    console.error('[sayafterme/tts] fetch failed:', err)
    throw new Error('elevenlabs_unavailable')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    // Read the error body for logs but don't expose it to the client
    // — it can include API key fragments and internal state.
    const errBody = await response.text().catch(() => '<unreadable>')
    console.error(
      '[sayafterme/tts] non-OK from ElevenLabs:',
      response.status,
      errBody,
    )
    throw new Error('elevenlabs_failed')
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
