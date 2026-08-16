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

// The conversation runs on the cheap/fast conversational model. Other routes keep
// OPENAI_GENERATION_MODEL; converse has its own override so we can tune it in isolation.
const MODEL = process.env.OPENAI_CONVERSE_MODEL || 'gpt-5.6-luna'

// Adaptive length: the dryness signal ends most chats naturally. This is only a
// hard backstop so a runaway conversation can never go forever.
const HARD_CAP = 20

// Strip machine-writing tells (em/en dashes, semicolons, punctuation-colons) from
// Teri's spoken English so her lines read like a real person's text. Leaves times
// like 3:30 alone and never touches the Japanese fields.
function humanize(t: string): string {
  return t
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s*;\s*/g, ', ')
    .replace(/(\D)\s*:\s+/g, '$1, ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+/, '')
    .trim()
}

// ── engagement signal (deterministic dryness detection) ──────────────────────
// Decide, in code, whether the learner (a) just asked Teri something, or (b) has gone
// quiet (two flat turns), and hand the model one crisp directive.
const countWords = (s: string) => (String(s || '').match(/[a-z0-9']+/gi) || []).length
const hasQuestion = (s: string) => /\?/.test(String(s || ''))
const DISENGAGED = /(i (don'?t|do not) know|not sure|it'?s fine|it was fine|nothing much|nothing really|no idea|dunno|i guess|maybe$)/i
const isFlat = (a: string) => !hasQuestion(a) && (countWords(a) <= 4 || DISENGAGED.test(String(a || '')))

function engagementDirective(history: { q: string; a: string }[]): string {
  if (!history.length) return ''
  const latest = history[history.length - 1].a
  if (hasQuestion(latest)) {
    return 'NOTE: The learner just asked you a question. Answer it warmly in character, then ask a question that stays on this same thread. Do not switch back to the photo this turn.'
  }
  const last2 = history.slice(-2)
  if (last2.length === 2 && last2.every((h) => isFlat(h.a))) {
    return 'NOTE: The learner has gone quiet (two short turns, no question, no new detail). If the conversation has drifted from the photo, return to it now with one fresh question about the photo. If you are already on the photo, wrap up warmly: set done to true, send ONE short closing message, and use an empty replies array.'
  }
  return ''
}

// Lean, subtractive system prompt. Teri writes one or two real text messages rather
// than a forced "reaction + question", which reads far more naturally.
function buildSystem(learner: string, level: string, words: { term: string }[]): string {
  return (
    'You are Teri, a warm, curious teacup having a friendly, text-style chat with a Japanese person learning English about a photo they shared. ' +
    (learner ? 'You remember this about them: ' + learner + ' ' : '') +
    'Reply the way you would in a real text chat, as ONE or at most TWO short messages. Most of the time ONE message is enough: just your next question, which can carry a couple of words of natural acknowledgement inside it. Only send a separate first message when you genuinely have a quick, real reaction to add (agreement, a feeling, light surprise or curiosity), never a description of the photo or a restatement of what they said, and never a forced comment. Your LAST message is always your question. ' +
    'Build your question on what they just said, and draw fresh angles from the photo (who, what, where, when, why, how), preferring angles you have not asked about yet. If they ask you something, answer it first, then stay on that thread. Follow their lead. ' +
    (words.length ? 'They are learning these photo words: ' + words.map((w) => w.term).join(', ') + '. Use one in a reply only when it fits naturally. ' : '') +
    'Write English like real text messages: no emojis, no dashes, colons or semicolons, and only word pairings a native speaker would really say (a smell is not "warm"). Keep everything at CEFR level ' + level + '. ' +
    'Also give three short, distinct replies the learner might say. ' +
    'Return only JSON: { "done": boolean, "bubbles": [ { "en": string, "ja": string } ], "replies": [ { "en": string, "ja": string, "gap": [ { "term": string, "gloss": string, "pos": string } ] } ] }. "bubbles" is one or two messages and the LAST one is your question. The ja fields are natural Japanese translations. Each reply gap has up to 2 useful words worth learning (skip trivial words like a/the/is), or [].'
  )
}

/**
 * POST /api/memory/converse
 *
 * Drives the Teri conversation. Adaptive length + deterministic dryness signal.
 * Teri replies as one or two short text messages (last = the question) plus three
 * scaffold replies, or a single warm closing message when done.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { context?: unknown; level?: unknown; history?: unknown; words?: unknown; learner?: unknown }
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
  const learner = typeof body.learner === 'string' ? body.learner.trim().slice(0, 2000) : ''

  const mustWrap = turn >= HARD_CAP
  const system = buildSystem(learner, level, words)

  const convo = history.length
    ? history.map((h) => `Teri: ${h.q}\nLearner: ${h.a}`).join('\n')
    : '(the conversation has not started yet, send your first message about the photo)'

  const directive = mustWrap
    ? 'NOTE: This chat has gone on long enough. Wrap up now: set done to true, send ONE short warm closing message, and use an empty replies array. Do not ask another question.'
    : engagementDirective(history)

  const user =
    `Memory: ${context}\n` +
    `Learner level: ${level}\n` +
    (words.length ? `Words the learner is learning: ${words.map((w) => w.term).join(', ')}\n` : '') +
    `Questions asked so far: ${turn}\n\n` +
    `Conversation so far:\n${convo}\n\n` +
    (directive ? directive + '\n\n' : '') +
    'Give the next turn as JSON.'

  try {
    const base = {
      model: MODEL,
      messages: [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ],
      response_format: { type: 'json_object' as const },
      max_completion_tokens: 700,
    }
    let completion
    try {
      completion = await openai().chat.completions.create({ ...base, reasoning_effort: 'low' } as never)
    } catch (e) {
      if (/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) {
        completion = await openai().chat.completions.create(base)
      } else throw e
    }

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      done?: unknown
      bubbles?: { en?: unknown; ja?: unknown }[]
      replies?: { en?: unknown; ja?: unknown; gap?: { term?: unknown; gloss?: unknown; pos?: unknown }[] }[]
    }

    const done = !!parsed.done || mustWrap

    let bubbles = Array.isArray(parsed.bubbles)
      ? parsed.bubbles
          .map((b) => ({ en: humanize(String(b.en ?? '').trim()), ja: String(b.ja ?? '').trim() }))
          .filter((b) => b.en)
          .slice(0, 2)
      : []
    if (!bubbles.length) return NextResponse.json({ error: 'No message produced' }, { status: 502 })
    // On a wrap-up, keep a single warm closing message (the last bubble).
    if (done) bubbles = bubbles.slice(-1)

    const replies = done || !Array.isArray(parsed.replies)
      ? []
      : parsed.replies.slice(0, 3).map((r) => ({
          en: humanize(String(r.en ?? '').trim()),
          ja: String(r.ja ?? '').trim(),
          gap: Array.isArray(r.gap)
            ? r.gap.slice(0, 2).map((g) => ({ term: String(g.term ?? '').trim(), gloss: String(g.gloss ?? '').trim(), pos: String(g.pos ?? '').trim() || 'word' })).filter((g) => g.term)
            : [],
        })).filter((r) => r.en)

    // Also expose reaction/question derived from bubbles so an older app build that
    // still reads those fields keeps working during the rollout.
    const reaction = bubbles.length > 1 ? bubbles[0] : null
    const question = bubbles[bubbles.length - 1]
    return NextResponse.json({ done, bubbles, reaction, question, replies })
  } catch (err) {
    console.error('memory/converse error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Conversation failed', detail }, { status: 500 })
  }
}
