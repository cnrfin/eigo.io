import { createHash } from 'node:crypto'
import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Classroom AI: word / phrase lookups on slides and translation of the
 * teacher's chat messages. gpt-5.4-nano with JSON output, cached in
 * ai_lookup_cache so the same lookup is only ever paid for once.
 */

let _openai: OpenAI | null = null
function openai() {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const MODEL = 'gpt-5.4-nano'
const LANG_NAMES: Record<string, string> = { ja: 'Japanese', en: 'English', ko: 'Korean', zh: 'Chinese (Simplified)' }
const langName = (l: string) => LANG_NAMES[l] ?? 'Japanese'

const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

async function cached<T>(kind: 'word' | 'chat', lang: string, keySrc: string, make: () => Promise<T>): Promise<T> {
  const db = getSupabaseAdmin()
  const key = hash(keySrc)
  const { data } = await db.from('ai_lookup_cache').select('result').eq('kind', kind).eq('lang', lang).eq('key', key).maybeSingle()
  if (data?.result) return data.result as T
  const result = await make()
  await db.from('ai_lookup_cache').upsert({ kind, lang, key, result }, { onConflict: 'kind,lang,key' })
  return result
}

async function json(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
  const completion = await openai().chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_completion_tokens: maxTokens,
    },
    // the student is waiting on a popup: don't hang
    { timeout: 15_000, maxRetries: 1 },
  )
  const raw = completion.choices[0]?.message?.content ?? '{}'
  try {
    return JSON.parse(raw)
  } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : {}
  }
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export type WordLookup = {
  term: string // dictionary form, e.g. "put the kettle on", "heavy"
  pos: string // noun, verb, adjective, phrase…
  ja: string // translation in the learner's language
  meaning: string // short simple English definition
  example: string // a short example sentence, the term in **bold**
}

/** Look up a word or short phrase (up to 6 words) as used in this sentence. */
export async function lookupWord(termRaw: string, sentenceRaw: string, lang: string): Promise<WordLookup> {
  const term = norm(termRaw).slice(0, 80)
  const sentence = norm(sentenceRaw).slice(0, 400)
  return cached('word', lang, `${term.toLowerCase()}|${sentence.toLowerCase()}`, async () => {
    const r = await json(
      `You help adult ${langName(lang)} learners of English (CEFR A2–B2) understand words in a lesson.
The user gives a WORD or PHRASE they tapped and the SENTENCE it appears in. Explain it AS USED IN THAT SENTENCE.
Return JSON: {"term": string, "pos": string, "ja": string, "meaning": string, "example": string}
- term: the dictionary form in English (e.g. "flatmates" → "flatmate", "putting the kettle on" → "put the kettle on"). Keep set phrases whole.
- pos: one of noun, verb, adjective, adverb, preposition, conjunction, pronoun, determiner, interjection, phrasal verb, phrase, idiom. Add "(informal)" or "(British)" when that matters.
- ja: a short, natural ${langName(lang)} translation for this meaning (a few words, no romanisation, no explanation).
- meaning: a short, simple English definition (max 12 words) for this meaning.
- example: one NEW short, natural example sentence (max 12 words) using the term, with the term wrapped in **double asterisks**. British English.
Return ONLY the JSON object.`,
      `WORD OR PHRASE: ${term}\nSENTENCE: ${sentence}`,
      600,
    )
    return {
      term: str(r.term, 80) || term,
      pos: str(r.pos, 40),
      ja: str(r.ja, 120),
      meaning: str(r.meaning, 160),
      example: str(r.example, 200),
    }
  })
}

/** Translate one of the teacher's chat messages into the student's language. */
export async function translateMessage(textRaw: string, lang: string): Promise<string> {
  const text = textRaw.trim().slice(0, 2000)
  const out = await cached('chat', lang, text, async () => {
    const r = await json(
      `Translate a teacher's chat message in an English lesson into natural ${langName(lang)} for the student.
Keep the tone (friendly, casual or polite as written). Keep names, emoji and any English words the teacher is clearly teaching (in quotes or bold) as they are, with the translation after in brackets.
Return JSON: {"translation": string}. Return ONLY the JSON object.`,
      text,
      1200,
    )
    return { translation: str(r.translation, 3000) }
  })
  return out.translation
}
