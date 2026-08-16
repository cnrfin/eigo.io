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

// Soft cap on how many questions the mascot asks before wrapping up.
const MAX_TURNS = 5

/**
 * POST /api/memory/converse
 *
 * Drives the mascot (Teri) conversation about a personal memory. Given the
 * memory context, the conversation so far, and the learner's level, it returns
 * the NEXT adaptive question plus three predicted replies (scaffolds) with gap
 * words — or a warm closing line when the arc is complete.
 *
 * Request:  { context?: string, level?: string, history?: { q: string, a: string }[] }
 * Response: {
 *   done: boolean,
 *   question: { en: string, ja: string },
 *   replies: { en: string, ja: string, gap: { term, gloss, pos }[] }[]
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { context?: unknown; level?: unknown; history?: unknown; words?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const context = typeof body.context === 'string' && body.context.trim() ? body.context.trim() : 'a personal photo the learner shared'
  const level = typeof body.level === 'string' && body.level.trim() ? body.level.trim() : 'A2'
  const history = Array.isArray(body.history)
    ? body.history
        .map((h) => ({ q: String((h as { q?: unknown })?.q ?? '').trim(), a: String((h as { a?: unknown })?.a ?? '').trim() }))
        .filter((h) => h.q || h.a)
    : []
  const turn = history.length
  const words = Array.isArray(body.words)
    ? body.words
        .map((w) => ({ term: String((w as { term?: unknown })?.term ?? '').trim(), gloss: String((w as { gloss?: unknown })?.gloss ?? '').trim() }))
        .filter((w) => w.term)
        .slice(0, 20)
    : []

  const system =
    'You are Teri, a warm, curious teacup mascot having a friendly spoken conversation with a Japanese person learning English, about a personal memory (a photo they shared). ' +
    'Ask ONE short, natural question at a time, and ADAPT it to what they just told you — refer back to their earlier answers when it feels natural. ' +
    'Prefer to build each question directly on what they just said. When you DO need to change the subject (for example, turning back to the photo itself), bridge it with a short, natural discourse marker like "By the way,", "Anyway,", or "Oh, and" so the shift never feels abrupt or rude to a native speaker. ' +
    'Never ask something that does not fit their answer (e.g. do not ask how they "met" a family member). Never repeat a question already asked. ' +
    'CRITICAL — if the learner ASKS YOU a question (for example "Do you know her name?", "What about you?", "Have you been there?"), you MUST answer it directly and in character FIRST. You are Teri, a curious little teacup: give a short, warm, genuine answer — it is completely fine to be playful, to guess, or to happily admit you do not know. NEVER ignore the learner\'s question or just carry on with your own next question — that feels rude and like you are not listening. Let the learner lead when they steer the conversation, and follow THEIR direction even if it moves away from the photo; only gently guide things back to the memory if the conversation runs dry. ' +
    `Keep the whole chat to about ${MAX_TURNS} questions with a gentle arc: who → what happened → one specific detail → how it felt → a warm wrap-up. ` +
    'Before the question, give a SHORT, warm reaction (2-5 words) — react to the photo on the first turn (e.g. "Looks delicious!", "Looks like fun!"), or to what they just said after that (e.g. "That sounds lovely!"). When the learner has ASKED you something, use "reaction" to actually ANSWER them (a short sentence is fine here, not just a few words), then let "question" continue the thread naturally. Keep reactions varied and genuine, never repetitive. ' +
    'Also provide THREE predicted replies the learner could plausibly give — natural SPOKEN English, each distinct and opening a different direction, short (a few words to one sentence). ' +
    (words.length ? 'The learner is currently learning these words/phrases from their photo: ' + words.map((w) => w.term).join(', ') + '. Where it fits the question NATURALLY, weave one or two of them into SOME of the predicted replies so the learner can practise them — but keep variety (not every reply needs one) and NEVER force a word that does not fit the question or sounds unnatural. ' : '') +
    `Match everything to the learner's CEFR level (${level}): simpler words and shorter sentences at A1/A2. ` +
    'Return ONLY a JSON object of this exact shape: ' +
    '{ "done": boolean, "reaction": { "en": string, "ja": string }, "question": { "en": string, "ja": string }, "replies": [ { "en": string, "ja": string, "gap": [ { "term": string, "gloss": string, "pos": string } ] } ] }. ' +
    '"reaction.ja" and "question.ja" are natural Japanese translations. Each reply\'s "ja" is a natural Japanese translation of that reply. ' +
    '"gap" = up to 2 useful words/phrases FROM that reply worth learning (skip trivial words like a/the/is); "gloss" is Japanese, "pos" is one of noun/verb/adj/adv/phrase; use [] if none. ' +
    'Set "done" to true ONLY when it is time to wrap up: then "question" is a short, warm closing line (a statement is fine) and "replies" is an empty array. ' +
    'No markdown, no code fences, no text outside the JSON object.'

  const convo = history.length
    ? history.map((h) => `Teri: ${h.q}\nLearner: ${h.a}`).join('\n')
    : '(the conversation has not started yet — ask your first question about the memory)'

  const user =
    `Memory: ${context}\n` +
    `Learner level: ${level}\n` +
    (words.length ? `Words the learner is learning: ${words.map((w) => w.term).join(', ')}\n` : '') +
    `Questions asked so far: ${turn} (aim for about ${MAX_TURNS} total)\n\n` +
    `Conversation so far:\n${convo}\n\n` +
    'Give the next turn as JSON.'

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_completion_tokens: 700,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      done?: unknown
      reaction?: { en?: unknown; ja?: unknown }
      question?: { en?: unknown; ja?: unknown }
      replies?: { en?: unknown; ja?: unknown; gap?: { term?: unknown; gloss?: unknown; pos?: unknown }[] }[]
    }

    const question = {
      en: String(parsed.question?.en ?? '').trim(),
      ja: String(parsed.question?.ja ?? '').trim(),
    }
    if (!question.en) return NextResponse.json({ error: 'No question produced' }, { status: 502 })

    const reactionEn = String(parsed.reaction?.en ?? '').trim()
    const reaction = reactionEn ? { en: reactionEn, ja: String(parsed.reaction?.ja ?? '').trim() } : null

    const done = !!parsed.done
    const replies = done || !Array.isArray(parsed.replies)
      ? []
      : parsed.replies.slice(0, 3).map((r) => ({
          en: String(r.en ?? '').trim(),
          ja: String(r.ja ?? '').trim(),
          gap: Array.isArray(r.gap)
            ? r.gap.slice(0, 2).map((g) => ({ term: String(g.term ?? '').trim(), gloss: String(g.gloss ?? '').trim(), pos: String(g.pos ?? '').trim() || 'word' })).filter((g) => g.term)
            : [],
        })).filter((r) => r.en)

    return NextResponse.json({ done, reaction, question, replies })
  } catch (err) {
    console.error('memory/converse error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Conversation failed', detail }, { status: 500 })
  }
}
