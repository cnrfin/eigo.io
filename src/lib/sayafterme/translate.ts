/**
 * OpenAI-backed phrase translation for Say After Me.
 *
 * The user types a phrase in their native language and tells us
 * what language they're learning. We hand both off to OpenAI and
 * ask for a structured JSON response with two fields:
 *   - translation: target-language string used as TTS input
 *   - romanization: Latin-script transliteration shown in the
 *     PlaybackOverlay's press-and-hold reveal (Hepburn for JA,
 *     Revised Romanization for KO, empty for EN)
 *
 * Why JSON rather than two separate API calls:
 *   The same model run produces both with no extra cost or
 *   latency, and the model already had to internally tokenise/
 *   read the kanji or hangul to translate — asking for the
 *   romanization at the same time piggy-backs on that work.
 *
 * Why JSON rather than parse a single string with delimiters:
 *   Reliability. With `response_format: { type: 'json_object' }`
 *   OpenAI guarantees parseable JSON; ad-hoc delimiters in plain
 *   text occasionally break under register / register-shift edge
 *   cases (the model "explains" instead of obeying).
 *
 * Model choice: gpt-5.4-mini matches what `lesson-ai.ts` uses for
 * lesson cleanup — same family, fast, cheap, very strong on
 * conversational EN/JA/KO.
 */

import OpenAI from 'openai'
import type { TargetLang } from './voices'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

/**
 * Maps internal target lang codes to the names we put in the
 * prompt. The model handles ISO codes fine but a human-readable
 * name + register hint produces noticeably more natural output.
 *
 * Why the JA/KO descriptors are this verbose:
 *   English doesn't carry the same explicit register markers as
 *   JA/KO, so the model has to infer formality from softer signals
 *   (contractions, verb choice, slang). Earlier prompts said
 *   "polite by default unless clearly informal" and the model
 *   over-defaulted to polite — even for phrases like "What are
 *   you into?" which is plainly casual to an English ear. The
 *   expanded descriptors anchor the call with concrete trigger
 *   examples on both sides so the register flip is more reliable.
 */
const TARGET_LANG_DESCRIPTORS: Record<TargetLang, string> = {
  en: 'natural conversational English',
  ja:
    'natural conversational Japanese. MATCH the register of the source phrase:\n' +
    "  • Plain / casual form (だ・だよ・〜てる・〜の？・no です／ます) when the source uses contractions, slang, dropped subjects, or short colloquial verbs — e.g. \"what's up\", \"gonna\", \"wanna\", \"hang out\", \"into\", \"let's\", \"yeah\", \"hey\".\n" +
    '  • Polite form (です／ます) when the source uses polite phrasings, indirect requests, or formal vocabulary — e.g. "could you", "would you mind", "excuse me", "may I", "I would like".\n' +
    '  • When the source is genuinely neutral, default to polite form (です／ます) — safer for learners meeting new people.',
  ko:
    'natural conversational Korean. MATCH the register of the source phrase:\n' +
    "  • Plain / casual form (반말 — drop the 요 ending, use 야・어・지) when the source uses contractions, slang, dropped subjects, or short colloquial verbs — e.g. \"what's up\", \"gonna\", \"wanna\", \"hang out\", \"into\", \"let's\", \"yeah\", \"hey\".\n" +
    '  • Polite-informal (해요체) for neutral or polite phrasings — e.g. "could you", "would you mind", "excuse me".\n' +
    '  • When the source is genuinely neutral, default to 해요체 — safer for learners meeting new people.',
}

/**
 * Per-target rules for the romanization field. The PlaybackOverlay's
 * press-and-hold reveal uses this string verbatim, so consistency
 * with the prebuilt-deck romaji style matters.
 */
const ROMANIZATION_RULES: Record<TargetLang, string> = {
  en: 'EMPTY STRING — English does not need romanisation.',
  ja: 'standard Hepburn romanisation in lowercase. Use long-vowel macrons (ā ī ū ē ō) where appropriate. Separate words with spaces; do NOT include punctuation marks like ？ or 。 — just the syllables.',
  ko: 'Revised Romanization of Korean (RR), lowercase, words separated by spaces, no punctuation.',
}

/**
 * Allowed emotion tags. ElevenLabs v3 supports many more, but we
 * restrict the model's choices to this curated set so audio for
 * generated phrases sits in the same prosodic neighbourhood as the
 * prebuilt-deck audio (see `audio-timer/scripts/phrase-emotions.json`
 * for the comparable hand-curated set on the build-time side).
 *
 * Order matches rough conversational frequency. The model is told
 * to pick the closest fit; if nothing matches we fall back to no
 * tag (which renders as a neutral/default reading).
 */
const ALLOWED_EMOTIONS = [
  'neutral',
  'warm',
  'casual',
  'curious',
  'friendly',
  'polite',
  'excited',
  'happy',
  'thoughtful',
  'hopeful',
  'shy',
  'apologetic',
  'surprised',
] as const

type Emotion = (typeof ALLOWED_EMOTIONS)[number]

export interface TranslationResult {
  /** The translation as a single line of target-language text. */
  translation: string
  /** Latin-script transliteration of the translation. Empty for EN. */
  romanization: string
  /**
   * Emotion tag suggested for ElevenLabs prosody. The route
   * prepends this as `[emotion] ` to the TTS input — see
   * `tts.ts`. May be `null` when the model returns something
   * outside ALLOWED_EMOTIONS, in which case TTS uses the bare
   * translation (neutral default reading).
   */
  emotion: Emotion | null
}

/**
 * Translate `phrase` (in any source language) into `targetLang` and
 * return both the translation and a romanisation in one round trip.
 *
 * @param phrase     The user's input string. We trust the client to
 *                   have trimmed it but defensively re-trim here.
 * @param targetLang One of the TTS-supported target languages.
 * @returns          A TranslationResult. Throws on OpenAI errors so
 *                   the route can refund the user's counter.
 */
export async function translatePhrase(
  phrase: string,
  targetLang: TargetLang,
): Promise<TranslationResult> {
  const trimmed = phrase.trim()
  if (!trimmed) {
    throw new Error('translate_empty_input')
  }

  const targetDescriptor = TARGET_LANG_DESCRIPTORS[targetLang]
  const romanizationRule = ROMANIZATION_RULES[targetLang]
  const emotionList = ALLOWED_EMOTIONS.join(' | ')

  // The prompt MUST contain the word "JSON" somewhere when using
  // response_format: json_object — OpenAI rejects the request
  // otherwise.
  const systemPrompt = `You are a professional translator. Output a JSON object with three string fields:

- "translation": ${targetDescriptor}.
- "romanization": ${romanizationRule}
- "emotion": one of [${emotionList}]. Pick the tag that best matches the SOURCE phrase's emotional register — used downstream as an ElevenLabs v3 prosody cue. If unsure, return "neutral".

Translation rules:
- Preserve the source phrase's intent (question, command, statement, exclamation) and overall tone.
- Use language a native speaker would actually say in casual conversation — not textbook-formal, not slangy.
- Do not add information that wasn't in the source. Do not omit information that was.
- The translation field must be exactly one line: no surrounding quotes, no parenthetical glosses, no commentary.

Return ONLY the JSON object. No code fences, no commentary outside the JSON.`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: trimmed },
    ],
    // Force structured JSON output. OpenAI guarantees the response
    // parses; we still validate the shape defensively below.
    response_format: { type: 'json_object' },
    // Translation is a deterministic-ish task — low temperature avoids
    // creative paraphrases that diverge from the source meaning.
    temperature: 0.3,
    // Hard ceiling. Conversational phrases are short; a 300-token cap
    // covers the JSON envelope plus translation and romanisation
    // even for long inputs without leaving runaway slack.
    //
    // GPT-5 family uses `max_completion_tokens` (the older `max_tokens`
    // is rejected). Matches the convention used in lesson-ai.ts.
    max_completion_tokens: 300,
  })

  const raw = completion.choices[0]?.message?.content ?? ''
  const parsed = parseTranslationJson(raw)

  const translation = sanitiseTranslation(parsed.translation)
  if (!translation) {
    throw new Error('translate_empty_output')
  }

  // Romanisation is allowed to be empty (EN target) and we don't
  // sanitise as aggressively — it's never read by TTS, only shown
  // in the press-and-hold reveal, so a stray quote-mark or label is
  // a minor visual issue rather than spoken content.
  const romanization = (parsed.romanization ?? '').trim()

  // Validate emotion against the allowed-list. Anything else (a
  // hallucinated tag, an empty string, missing field) becomes null
  // so the route knows to send the bare translation to TTS — a
  // neutral reading is always safer than passing through an
  // unknown directive that ElevenLabs might mishandle.
  const rawEmotion = (parsed.emotion ?? '').trim().toLowerCase()
  const emotion: Emotion | null =
    (ALLOWED_EMOTIONS as readonly string[]).includes(rawEmotion) &&
    rawEmotion !== 'neutral'
      ? (rawEmotion as Emotion)
      : null

  return { translation, romanization, emotion }
}

/**
 * Parse and validate the JSON response. With `response_format`
 * forcing JSON we expect this to always succeed, but a malformed
 * envelope still gets a clean throw rather than a confusing
 * downstream error.
 */
function parseTranslationJson(raw: string): {
  translation: string
  romanization: string
  emotion: string
} {
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch {
    throw new Error('translate_bad_json')
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('translate_bad_json')
  }
  const o = obj as Record<string, unknown>
  if (typeof o.translation !== 'string') {
    throw new Error('translate_missing_translation')
  }
  return {
    translation: o.translation,
    romanization: typeof o.romanization === 'string' ? o.romanization : '',
    // Emotion gets validated against ALLOWED_EMOTIONS by the caller —
    // here we just pass through whatever string came back (or '').
    emotion: typeof o.emotion === 'string' ? o.emotion : '',
  }
}

/**
 * Belt-and-braces post-processor for the model output.
 *
 * The system prompt asks for a bare translation, but models
 * occasionally still wrap output in quotes or insert a leading
 * "Translation: " label. Stripping these here keeps the surface
 * clean even when the prompt is not perfectly obeyed — and
 * critically, prevents that junk from being read aloud by TTS.
 */
function sanitiseTranslation(raw: string): string {
  let s = raw.trim()

  // Strip a leading "Translation:" or similar label.
  s = s.replace(/^(translation|訳|번역)\s*[:：]\s*/i, '')

  // Strip an enclosing pair of matching quotes (straight, curly,
  // CJK corner brackets) without touching mid-string punctuation.
  s = s.replace(/^["'“”‘’「」『』](.*)["'“”‘’「」『』]$/s, '$1')

  // Collapse any internal newlines — TTS shouldn't see line breaks.
  s = s.replace(/\s*\n+\s*/g, ' ')

  return s.trim()
}
