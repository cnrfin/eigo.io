/**
 * Voice catalogue for Say After Me's runtime TTS.
 *
 * These voice IDs are the SAME ones used by the build-time
 * `audio-timer/scripts/generate-audio.mjs` script that prebakes the
 * standard deck audio. Keeping them aligned means a phrase the user
 * generates here sounds identical to a phrase from the prebuilt deck
 * — same speaker, same accent — so saving a generated phrase to
 * "My Decks" doesn't introduce a jarring voice change between deck
 * sources.
 *
 * If you ever want to add more voices to the runtime catalogue
 * without touching the prebuilt decks, add them HERE and update
 * `DeckGender` on the audio-timer side. Don't drop one of the eight
 * below — they're already shipping in production audio files.
 */

export type VoiceKey =
  | 'US-Female'
  | 'US-Male'
  | 'UK-Female'
  | 'UK-Male'
  | 'JA-Female'
  | 'JA-Male'
  | 'KO-Female'
  | 'KO-Male'

export type TargetLang = 'en' | 'ja' | 'ko'

/**
 * Voice key → ElevenLabs voice id. Mirrors the VOICES map in
 * `audio-timer/scripts/generate-audio.mjs`. Update both files in
 * lockstep.
 */
export const VOICE_IDS: Record<VoiceKey, string> = {
  'US-Female': 'uYXf8XasLslADfZ2MB4u',
  'US-Male':   'UgBBYS2sOqTuMpoF3BR0',
  'UK-Female': 'lcMyyd2HUfFzxdCaC4Ta',
  'UK-Male':   'fNYuJl2dBlX9V7NxmjnV',
  'JA-Female': 'MXKtCrra8fvlDUbfKUT1',
  'JA-Male':   'GKDaBI8TKSBJVhsCLD6n',
  'KO-Female': '8jHHF8rMqMlg8if2mOUe',
  'KO-Male':   'CxErO97xpQgQXYmapDKX',
}

/**
 * The TTS-supported target languages. The runtime only generates
 * speech in these three — they're the only languages with both a
 * voice catalogue and (on the client side) a phrase-language
 * setting that could ever land on /generate.
 */
export const VALID_TARGET_LANGS: TargetLang[] = ['en', 'ja', 'ko']

/**
 * Infer the target language from a voice key. Used to validate
 * that the client sent a voice that matches what they're asking us
 * to translate INTO (a US-Female voice can't speak Japanese, and
 * vice versa).
 */
export function targetLangFromVoice(voice: VoiceKey): TargetLang {
  if (voice.startsWith('JA-')) return 'ja'
  if (voice.startsWith('KO-')) return 'ko'
  return 'en' // US-* and UK-*
}

export function isValidVoice(value: unknown): value is VoiceKey {
  return typeof value === 'string' && value in VOICE_IDS
}

export function isValidTargetLang(value: unknown): value is TargetLang {
  return typeof value === 'string' && VALID_TARGET_LANGS.includes(value as TargetLang)
}
