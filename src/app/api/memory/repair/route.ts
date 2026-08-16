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

  let body: { said?: unknown; native?: unknown; question?: unknown; context?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const said = typeof body.said === 'string' ? body.said.trim() : ''
  const native = typeof body.native === 'string' ? body.native.trim() : ''
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const context = typeof body.context === 'string' ? body.context.trim() : ''
  if (!said && !native) {
    return NextResponse.json({ error: 'Provide `said` or `native`' }, { status: 400 })
  }

  const system =
    'You are a warm, supportive English tutor helping a Japanese learner speak during a friendly conversation about a personal memory (a photo). ' +
    'Your job is to fix GENUINE mistakes only — never to rewrite a sentence that is already fine. ' +
    'Return ONLY a JSON object with this exact shape: ' +
    '{ "ok": boolean, "corrected": string, "correctedJa": string, "note": string, "gap": [{ "term": string, "gloss": string, "pos": string }] }. ' +
    'Rules: ' +
    '1) If the learner\'s English is already grammatically correct and natural, set "ok" to true and return their sentence UNCHANGED as "corrected" (you may fix only capitalization or punctuation). Do NOT paraphrase, reword, shorten, or "improve" a correct sentence. ' +
    '2) Preserve the learner\'s meaning and wording — keep their pronouns and specifics (for example, do not change "him" to "we", and do not drop words they said). ' +
    '3) Set "ok" to false ONLY when there is a real grammar error, a wrong word, or it is genuinely unnatural or unclear. Then "corrected" is the SMALLEST fix that keeps their meaning and as much of their original wording as possible. ' +
    '"correctedJa" = a natural Japanese translation of "corrected". ' +
    '"note" = a very short, friendly one-line explanation IN JAPANESE of what changed and why (the grammar point), so the learner understands the fix; use an empty string when "ok" is true. ' +
    '"gap" = up to 3 useful words or phrases taken FROM "corrected" that are worth learning (skip trivial words like a/the/is); "gloss" is the Japanese meaning, "pos" is one of noun/verb/adj/adv/phrase; use [] if none. ' +
    'No markdown, no code fences, no text outside the JSON object.'

  const parts: string[] = []
  if (native) parts.push(`The learner wants to say this (in Japanese). Give the natural English:\n"${native}"`)
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
      ok?: unknown; corrected?: unknown; correctedJa?: unknown; note?: unknown
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

    return NextResponse.json({
      ok: !!parsed.ok && !native,
      corrected,
      correctedJa: native ? native : String(parsed.correctedJa ?? '').trim(),
      note: (!!parsed.ok && !native) ? '' : String(parsed.note ?? '').trim(),
      gap,
    })
  } catch (err) {
    console.error('memory/repair error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Repair failed', detail }, { status: 500 })
  }
}
