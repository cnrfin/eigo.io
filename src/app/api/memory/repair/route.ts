import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authenticate } from '@/lib/test-auth'
import { languageName } from '@/lib/languageName'

export const runtime = 'nodejs'
export const maxDuration = 30

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const MODEL = process.env.OPENAI_GENERATION_MODEL || 'gpt-5.4-mini'

// Fixed error taxonomy for the learner model. Keep this list small and stable so the
// counts aggregate meaningfully over time. Any out-of-list value collapses to 'other'.
const ERROR_CATEGORIES = new Set([
  'past_tense', 'present_perfect', 'verb_form', 'subject_verb_agreement',
  'plural_singular', 'articles', 'prepositions', 'word_choice', 'word_order', 'pronoun', 'other',
])

/**
 * POST /api/memory/repair
 *
 * Powers the "answer in my own words" flow of the Memory conversation.
 *   - { said }   → gently correct the learner's English attempt ("did you mean …?")
 *   - { native } → translate what they want to say (in their language) into
 *                  natural spoken English (the "No, that's not it" path)
 * Optional { question } (what the mascot asked) and { context } (the memory)
 * sharpen the result.
 *
 * Response: { ok, corrected, correctedJa, gap: [{ term, gloss, pos }] }
 *   ok = true only when the learner's English was already natural (no real fix).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { said?: unknown; native?: unknown; question?: unknown; context?: unknown; strictness?: unknown; language?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const said = typeof body.said === 'string' ? body.said.trim() : ''
  const native = typeof body.native === 'string' ? body.native.trim() : ''
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const context = typeof body.context === 'string' ? body.context.trim() : ''
  // Persona (defaults reproduce the original prompt when absent).
  const strictness = body.strictness === 'strict' || body.strictness === 'kind' ? body.strictness : 'moderate'
  const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim().slice(0, 20) : 'ja'
  const langName = languageName(language)
  if (!said && !native) {
    return NextResponse.json({ error: 'Provide `said` or `native`' }, { status: 400 })
  }

  const strictnessClause = strictness === 'strict'
    ? 'STRICTNESS is strict: beyond rule 4, also flag phrasing that is grammatically off or unnatural even if a native could still understand it (for example a wrong tense, "I go there yesterday" -> "I went there yesterday"). Still obey rules 1 to 3, never flag punctuation, capitalization, spoken ellipsis, or correct informal speech. '
    : 'STRICTNESS is relaxed: only flag mistakes that would genuinely make the learner hard to understand, or that a native speaker would simply never say, let smaller unnatural-but-clear phrasing pass. '

  const system =
    'You are a warm, supportive English tutor helping a learner (their first language is ' + langName + ') speak during a friendly conversation about a personal memory (a photo). ' +
    'Your job is to fix GENUINE mistakes only — never to rewrite a sentence that is already fine. ' +
    'Return ONLY a JSON object with this exact shape: ' +
    '{ "ok": boolean, "corrected": string, "correctedJa": string, "note": string, "category": string, "gap": [{ "term": string, "gloss": string, "pos": string }] }. ' +
    'Rules: ' +
    '1) If the learner\'s English is already correct and natural for SPOKEN conversation, set "ok" to true and return it UNCHANGED as "corrected". Do NOT paraphrase, reword, shorten, expand, or "improve" a sentence that is already fine. If the ONLY change you would make is punctuation, capitalization, apostrophe style, or splitting a natural run-on, set "ok" to true and leave the sentence exactly as they said it, those are not errors in speech. ' +
    '2) SPOKEN ELLIPSIS IS CORRECT, NOT AN ERROR. Dropping the subject or verb is exactly how native speakers answer a question, so judge the learner\'s words as an ANSWER to the question, not as a standalone sentence. These are all perfect and MUST stay unchanged with "ok" true: Q "Who are you having brunch with?" -> "With my mum" (never expand to "I am with my mum"); Q "Where are you going?" -> "To the shops"; also "Last Sunday", "Because it was fun", "Yeah, a little". Answering with a pro-verb (did, do, does, will, have) instead of repeating the main verb is also natural: Q "Did you eat somewhere after?" -> "We did, after hiking down the mountain" (do NOT change "did" to "ate"); Q "Do you like it?" -> "I do". Keep the auxiliary the learner used. Only touch a fragment if it uses wrong grammar or is genuinely unclear, never just because it is short or omits words a native would also omit. ' +
    '3) Preserve the learner\'s meaning and wording — keep their pronouns and specifics (for example, do not change "him" to "we", and do not drop words they said). ' +
    '4) Set "ok" to false ONLY when there is a REAL grammar error or a wrong word that a native speaker would not say, never for something merely short, informal, or a style choice. Then "corrected" is the SMALLEST fix. Do NOT add optional words that only refine nuance or emphasis (do not add "usually", "really", "just", or extra adverbs); for example "in general" already means "usually", so leave it. Keep the learner\'s phrasing and their punctuation style. ' +
    strictnessClause +
    '"correctedJa" = a natural ' + langName + ' translation of "corrected". ' +
    '"note" = a very short, friendly one-line explanation in ' + langName + ' of what changed and why (the grammar point), so the learner understands the fix; use an empty string when "ok" is true. ' +
    '"category" = when "ok" is false, the SINGLE grammar area of the main mistake, chosen from EXACTLY this list: past_tense, present_perfect, verb_form, subject_verb_agreement, plural_singular, articles, prepositions, word_choice, word_order, pronoun, other. Use "other" only when none of the specific ones fit. When "ok" is true, use an empty string. ' +
    '"gap" = up to 3 useful words or phrases taken FROM "corrected" that are worth learning (skip trivial words like a/the/is); "gloss" is the ' + langName + ' meaning, "pos" is one of noun/verb/adj/adv/phrase; use [] if none. ' +
    'No markdown, no code fences, no text outside the JSON object.'

  const parts: string[] = []
  if (native) parts.push(`The learner wants to say this (in ${langName}). Give the natural English:\n"${native}"`)
  else parts.push(`The learner said this in English. Correct it only if needed:\n"${said}"`)
  if (question) parts.push(`They are answering the question: "${question}"`)
  if (context) parts.push(`Memory context: ${context}`)

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: parts.join('\n\n') },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_completion_tokens: 400,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      ok?: unknown; corrected?: unknown; correctedJa?: unknown; note?: unknown; category?: unknown
      gap?: { term?: unknown; gloss?: unknown; pos?: unknown }[]
    }

    const corrected = String(parsed.corrected ?? '').trim()
    if (!corrected) return NextResponse.json({ error: 'No correction produced' }, { status: 502 })

    const gap = Array.isArray(parsed.gap)
      ? parsed.gap
          .slice(0, 3)
          .map((g) => ({ term: String(g.term ?? '').trim(), gloss: String(g.gloss ?? '').trim(), pos: String(g.pos ?? '').trim() || 'word' }))
          .filter((g) => g.term)
      : []

    const okFlag = !!parsed.ok && !native
    let category = ''
    if (!okFlag && !native) {
      const rawCat = String(parsed.category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
      category = ERROR_CATEGORIES.has(rawCat) ? rawCat : 'other'
    }

    return NextResponse.json({
      ok: okFlag,
      corrected,
      correctedJa: native ? native : String(parsed.correctedJa ?? '').trim(),
      note: okFlag ? '' : String(parsed.note ?? '').trim(),
      category,
      gap,
    })
  } catch (err) {
    console.error('memory/repair error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Repair failed', detail }, { status: 500 })
  }
}
