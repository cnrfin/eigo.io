import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authenticate } from '@/lib/test-auth'

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

/**
 * POST /api/memory/suggest
 *
 * Gap-word banking. Given ONE sentence from a chat bubble, pull out the most
 * useful things a Japanese learner could bank and study — real words, natural
 * phrases, and reusable grammatical structures ("Have you ever…", "That sounds…").
 *
 * Body:  { sentence: string, context?: string, level?: string }
 * Reply: { items: [{ kind, term, gloss, pos, note, example, exampleGloss }] }
 *   kind = 'word' | 'phrase' | 'grammar'
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { sentence?: unknown; context?: unknown; level?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const sentence = typeof body.sentence === 'string' ? body.sentence.trim() : ''
  const context = typeof body.context === 'string' ? body.context.trim() : ''
  const level = typeof body.level === 'string' ? body.level.trim() : 'A2'
  if (!sentence) {
    return NextResponse.json({ error: 'Provide `sentence`' }, { status: 400 })
  }

  const system =
    'You are an expert English tutor for a Japanese learner. From ONE English sentence you extract the most useful things worth SAVING and studying — not a mechanical word list. ' +
    'Return ONLY a JSON object: { "items": [{ "kind": "word"|"phrase"|"grammar", "term": string, "gloss": string, "pos": string, "note": string, "example": string, "exampleGloss": string }] }. ' +
    'Pick 2 to 4 of the HIGHEST-VALUE items that actually appear in (or are directly expressed by) the sentence. Rank by usefulness — a learner should think "yes, I want that". ' +
    'Item kinds: ' +
    '"word" = a single meaningful vocabulary word (skip trivial function words like a/the/is/of). ' +
    '"phrase" = a natural multi-word chunk or collocation the learner can reuse ("by myself", "after dinner", "a little bit"). ' +
    '"grammar" = a reusable structure or pattern, given as a template with an ellipsis where the learner slots their own words ("Have you ever…?", "That sounds…", "I used to…", "be + past participle"). Prefer grammar items when the sentence shows a useful pattern. ' +
    'CRITICAL rules: ' +
    '1) VERBS ARE ALWAYS THE INFINITIVE (base) form. If the sentence has "built", the term is "build"; "was taken" -> "take"; "went" -> "go". Never bank an inflected verb. ' +
    '2) "term" is the clean thing to study (a phrase template for grammar, base word for words). "gloss" is its natural Japanese meaning. ' +
    '3) "pos" is one of: noun, verb, adj, adv, phrase. Use "phrase" for phrase and grammar kinds. ' +
    '4) "note" = a very short Japanese hint about how to use it (for grammar, what the pattern does; for an irregular verb, e.g. "build -> built"). Keep it short; use "" if obvious. ' +
    '5) "example" = one short, natural English example sentence USING the term (for grammar, an example that fills the template). "exampleGloss" = its Japanese translation. ' +
    '6) No duplicates. Match the difficulty to the learner\'s level. If nothing is truly worth saving, return { "items": [] }. ' +
    'No markdown, no code fences, no text outside the JSON object.'

  const parts: string[] = [`Sentence:\n"${sentence}"`, `Learner level (CEFR): ${level}`]
  if (context) parts.push(`Conversation is about this memory: ${context}`)

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: parts.join('\n\n') },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_completion_tokens: 500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      items?: { kind?: unknown; term?: unknown; gloss?: unknown; pos?: unknown; note?: unknown; example?: unknown; exampleGloss?: unknown }[]
    }

    const allowedKinds = new Set(['word', 'phrase', 'grammar'])
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((it) => {
            const kind = String(it.kind ?? '').trim().toLowerCase()
            const pos = String(it.pos ?? '').trim().toLowerCase()
            return {
              kind: allowedKinds.has(kind) ? (kind as 'word' | 'phrase' | 'grammar') : 'word',
              term: String(it.term ?? '').trim(),
              gloss: String(it.gloss ?? '').trim(),
              pos: pos || 'word',
              note: String(it.note ?? '').trim(),
              example: String(it.example ?? '').trim(),
              exampleGloss: String(it.exampleGloss ?? '').trim(),
            }
          })
          .filter((it) => it.term)
          .slice(0, 4)
      : []

    return NextResponse.json({ items })
  } catch (err) {
    console.error('memory/suggest error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Suggest failed', detail }, { status: 500 })
  }
}
