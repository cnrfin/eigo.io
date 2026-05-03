/**
 * POST /api/sayafterme/generate
 *
 * The single endpoint that powers the "Create" screen in the Say
 * After Me iOS app. The full request lifecycle:
 *
 *   1. Read the RC user id from the X-RC-User-Id header. (No Bearer
 *      token — the audio-timer app has no Supabase session.)
 *   2. Validate the body (phrase, sourceLang, targetLang, voice).
 *   3. Verify the user has the `pro` entitlement via RevenueCat's
 *      REST API. Fail closed on any uncertainty.
 *   4. Atomically increment the user's monthly counter. If we're
 *      already at PRO_MONTHLY_LIMIT, return 429.
 *   5. Translate the phrase via OpenAI.
 *   6. Generate audio via ElevenLabs.
 *   7. Return { translation, audio_base64, usage }.
 *
 * On any failure between step 4 and step 7, refund the counter so
 * the user doesn't pay for work we didn't deliver.
 *
 * Response on success (200):
 *   {
 *     translation: string,
 *     audio_base64: string,
 *     audio_mime: 'audio/mpeg',
 *     usage: { count: number, limit: number }
 *   }
 *
 * Errors are JSON `{ error, message, ...context }` with semantic
 * status codes (400 / 401 / 403 / 429 / 500).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyProEntitlement } from '@/lib/sayafterme/revenuecat'
import { tryIncrement, refund, PRO_MONTHLY_LIMIT } from '@/lib/sayafterme/usage'
import { translatePhrase } from '@/lib/sayafterme/translate'
import { generateSpeech } from '@/lib/sayafterme/tts'
import {
  isValidVoice,
  isValidTargetLang,
  targetLangFromVoice,
  type VoiceKey,
  type TargetLang,
} from '@/lib/sayafterme/voices'

interface GenerateRequestBody {
  phrase?: unknown
  sourceLang?: unknown
  targetLang?: unknown
  voice?: unknown
}

interface ParsedRequest {
  phrase: string
  sourceLang: string
  targetLang: TargetLang
  voice: VoiceKey
}

/** Hard ceiling on phrase length. Longer phrases push TTS cost up
 *  fast and aren't really the use case (this is a phrase trainer,
 *  not a paragraph reader). Matches the input maxLength on the
 *  client TextInput — see MAX_PHRASE_CHARS in
 *  audio-timer/app/(tabs)/decks/generate.tsx. Bump both in lockstep. */
const MAX_PHRASE_CHARS = 150

export async function POST(request: NextRequest) {
  // ── 1. RC user id ─────────────────────────────────────────
  const rcUserId = request.headers.get('X-RC-User-Id')?.trim()
  if (!rcUserId) {
    return jsonError(401, 'missing_rc_user_id', 'X-RC-User-Id header is required.')
  }

  // ── 2. Body validation ────────────────────────────────────
  let parsed: ParsedRequest
  try {
    const raw = (await request.json()) as GenerateRequestBody
    parsed = parseBody(raw)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid_body'
    return jsonError(400, 'invalid_input', message)
  }

  // ── 3. Entitlement gate ──────────────────────────────────
  const ent = await verifyProEntitlement(rcUserId)
  if (!ent.active) {
    // Map RC reasons to client-facing buckets. The app uses these to
    // decide whether to show the paywall (not_pro) vs a "try again"
    // toast (rc_unavailable / rc_misconfigured).
    if (ent.reason === 'rc_unavailable' || ent.reason === 'rc_misconfigured') {
      return jsonError(
        503,
        'verification_unavailable',
        'Could not verify your subscription right now. Please try again.',
        { reason: ent.reason },
      )
    }
    return jsonError(
      403,
      'not_pro',
      'A Pro subscription is required to generate phrases.',
      { reason: ent.reason },
    )
  }

  // ── 4. Atomic increment ──────────────────────────────────
  // From here on, any failure path must call refund() before
  // returning so the user isn't charged for an unfinished generation.
  let newCount: number | null
  try {
    newCount = await tryIncrement(rcUserId)
  } catch (err) {
    return jsonError(
      500,
      'server_error',
      'Could not record this generation. Please try again.',
    )
  }

  if (newCount === null) {
    // Already at the cap — no row was updated, no refund needed.
    return jsonError(
      429,
      'over_limit',
      `You've used all ${PRO_MONTHLY_LIMIT} generations for this month. The cap resets at the start of next month.`,
      { count: PRO_MONTHLY_LIMIT, limit: PRO_MONTHLY_LIMIT },
    )
  }

  // ── 5. Translate ─────────────────────────────────────────
  // Returns the target-language translation, a romanisation
  // (Hepburn for JA, Revised Romanization for KO, empty for EN),
  // and an optional ElevenLabs v3 emotion tag inferred from the
  // source phrase. One OpenAI call covers all three — see
  // lib/sayafterme/translate.ts.
  let translation: string
  let romanization: string
  let emotion: string | null
  try {
    const result = await translatePhrase(parsed.phrase, parsed.targetLang)
    translation = result.translation
    romanization = result.romanization
    emotion = result.emotion
  } catch (err) {
    console.error('[sayafterme/generate] translate failed:', err)
    await refund(rcUserId)
    return jsonError(
      502,
      'translate_failed',
      'Translation failed. Your generation has been refunded.',
    )
  }

  // ── 6. TTS ───────────────────────────────────────────────
  // ElevenLabs v3 reads `[tag] text` as a prosody directive — the
  // bracket+word is consumed, not spoken. We only inject when we
  // got a non-null emotion from translate; null means "use the
  // model's default reading" which is what ElevenLabs already does
  // when nothing is prepended.
  //
  // The tag is NOT included in the response — the chat row + saved
  // phrase show only the bare translation. Romanisation is also
  // computed against the bare translation, not the bracketed
  // version, so press-and-hold reveal stays clean.
  const ttsInput = emotion ? `[${emotion}] ${translation}` : translation
  let audio: Buffer
  try {
    audio = await generateSpeech(ttsInput, parsed.voice)
  } catch (err) {
    console.error('[sayafterme/generate] tts failed:', err)
    await refund(rcUserId)
    return jsonError(
      502,
      'tts_failed',
      'Audio generation failed. Your generation has been refunded.',
    )
  }

  // ── 7. Success ───────────────────────────────────────────
  // Base64 the audio inline. ~33% size overhead which is negligible
  // for short-phrase mp3s (~30-50 KB → ~40-67 KB). Avoids multipart
  // handling on the React Native side and keeps the client code
  // straightforward (single JSON parse, base64 → file).
  return NextResponse.json({
    translation,
    romanization,
    audio_base64: audio.toString('base64'),
    audio_mime: 'audio/mpeg',
    usage: { count: newCount, limit: PRO_MONTHLY_LIMIT },
  })
}

// ── helpers ────────────────────────────────────────────────

/**
 * Validate and narrow the request body. Throws a typed error
 * message that surfaces directly to the client as a 400.
 */
function parseBody(raw: GenerateRequestBody): ParsedRequest {
  const phrase = typeof raw.phrase === 'string' ? raw.phrase.trim() : ''
  if (!phrase) {
    throw new Error('phrase is required')
  }
  if (phrase.length > MAX_PHRASE_CHARS) {
    throw new Error(`phrase must be ${MAX_PHRASE_CHARS} characters or fewer`)
  }

  const sourceLang =
    typeof raw.sourceLang === 'string' ? raw.sourceLang.trim() : ''
  if (!sourceLang) {
    throw new Error('sourceLang is required')
  }

  if (!isValidTargetLang(raw.targetLang)) {
    throw new Error('targetLang must be one of: en, ja, ko')
  }
  if (!isValidVoice(raw.voice)) {
    throw new Error('voice is not a valid catalogue voice')
  }

  // Cross-check: a JA voice can only speak Japanese, etc. Stops a
  // misconfigured client from generating English audio with a
  // Korean voice ID and being surprised at the result.
  const inferred = targetLangFromVoice(raw.voice)
  if (inferred !== raw.targetLang) {
    throw new Error(
      `voice (${raw.voice}) does not match targetLang (${raw.targetLang})`,
    )
  }

  return {
    phrase,
    sourceLang,
    targetLang: raw.targetLang,
    voice: raw.voice,
  }
}

function jsonError(
  status: number,
  error: string,
  message: string,
  context: Record<string, unknown> = {},
) {
  return NextResponse.json({ error, message, ...context }, { status })
}
