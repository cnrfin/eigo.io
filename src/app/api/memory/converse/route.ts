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

const WRAP = 'set done to true, send ONE short warm closing message, and use an empty replies array. Do not ask another question.'

// Explicit end-of-conversation cues from the learner (goodbyes, "I have to go"). High
// precision: the go-phrases exclude "go to <place>" so routine talk does not trip it.
const FAREWELL = /(^|[\s,.!?])(bye|goodbye|good bye|see (you|ya)( next time| again| later| soon| around)?|talk( to you)? later|catch you later|until next time|take care|i have to go(?!\s+to\b)|i need to go(?!\s+to\b)|i should (get going|go)(?!\s+to\b)|i'?m gonna (go|head off)|i'?ll (get going|be off)|gotta go(?!\s+to\b)|i have got to go|i must go(?!\s+to\b)|i'?m leaving( now)?|let'?s (end|stop|finish|wrap)( (it|this|up|the (chat|conversation)))?|end (the |this )?(chat|conversation)|i( am|'?m) done(?!\s+with\b)( for (now|today))?)([\s,.!?]|$)/i
const isFarewell = (s: string) => FAREWELL.test(String(s || ''))
const trailingFlat = (history: { q: string; a: string }[]): number => {
  let n = 0
  for (let i = history.length - 1; i >= 0; i--) { if (isFlat(history[i].a)) n++; else break }
  return n
}

function engagementDirective(history: { q: string; a: string }[]): string {
  if (!history.length) return ''
  const latest = history[history.length - 1].a
  // A goodbye or "I have to go" is a hard stop: never answer it with another question.
  if (isFarewell(latest)) {
    return 'NOTE: The learner is saying goodbye or signalling they want to stop. Do not ask another question. Warmly acknowledge it and say a friendly goodbye: ' + WRAP
  }
  if (hasQuestion(latest)) {
    return 'NOTE: The learner just asked you a question. Send your warm answer as a short FIRST message, then your question as a SECOND message (two bubbles). Stay on this thread, do not switch back to the photo this turn.'
  }
  // Several low-energy replies in a row: they are winding down, do not keep pulling.
  if (trailingFlat(history) >= 3) {
    return 'NOTE: The learner has given several short, low-energy replies in a row, they are clearly winding down. Do not push for more, wrap up warmly: ' + WRAP
  }
  const last2 = history.slice(-2)
  if (last2.length === 2 && last2.every((h) => isFlat(h.a))) {
    return 'NOTE: The learner has gone quiet (two short turns, no question, no new detail). If the conversation has drifted from the photo, return to it now with one fresh question about the photo. If you are already on the photo, wrap up warmly: ' + WRAP
  }
  return ''
}

// ── topic-drift guard (deterministic) ──────────────────────────────────────
// Teri tends to imitate her own transcript and drill one detail (coffee, the cat and
// its birds) turn after turn. If her recent questions keep circling the same content
// word, nudge her to open a genuinely new angle while staying on theme.
const STOP = new Set(('a an and are at be been do does did the this that these those you your yours i me my we our us it its they them their he she his her him is was were of off out on in to for with from by about as into over after before near here there just really very so too some any many much more most one two three what when where why how who which whose will would can could should shall may might must not no yes like eat eating ate drink drinking go going goes went get got have has had think tell told say said know knew feel felt make made take took come came see saw look looked want wanted enjoy enjoyed').split(/\s+/))
const topicWords = (s: string): string[] =>
  Array.from(new Set((String(s || '').toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !STOP.has(w))))

function driftDirective(history: { q: string; a: string }[]): string {
  if (history.length < 3) return ''
  const recent = history.slice(-3).map((h) => new Set(topicWords(h.q)))
  const counts: Record<string, number> = {}
  recent.forEach((set) => set.forEach((w) => { counts[w] = (counts[w] || 0) + 1 }))
  const stuck = Object.keys(counts).filter((w) => counts[w] >= 2).slice(0, 3)
  if (!stuck.length) return ''
  return 'NOTE: Your recent questions keep circling ' + stuck.join(', ') + '. Do not ask about ' + (stuck.length > 1 ? 'those' : 'that') + ' again. Open a genuinely new angle, a different part of the photo or a related topic you have not touched, on theme but fresh.'
}

// Lean, subtractive system prompt. Teri writes one or two real text messages rather
// than a forced "reaction + question", which reads far more naturally.
function buildSystem(learner: string, level: string, words: { term: string }[], focus: string): string {
  return (
    'You are Teri, a warm, curious teacup having a friendly, text-style chat with a Japanese person learning English about a photo they shared. ' +
    (learner ? 'You remember this about them: ' + learner + ' ' : '') +
    'Reply the way you would in a real text chat, as ONE or TWO short messages. Usually ONE is enough: your next question, with a couple of words of acknowledgement folded in. Send TWO messages (a short first message, then your question) at the moments a real person naturally would: when you are answering a question the learner asked you (answer first, then ask yours), or when they just shared something notable or emotional that deserves a genuine reaction of its own. Never add a second message just to comment on the photo or restate what they said, and never force it. Your LAST message is always your question. ' +
    'Build your question on what they just said, but do not keep drilling the same narrow detail. After a question or two about one specific thing, move to a different aspect, and ask what a real friend would genuinely be curious about when shown this exact photo, given what it shows and what they have told you so far. Let the subject of the photo decide what is natural to ask, not any fixed list, so a question would never feel out of place for this kind of picture. Keep finding fresh, relevant ground so it never becomes an interrogation. If they ask you something, answer it first, then stay on that thread. Follow their lead: when they open a rich new thread of their own (places they went, things they did, an opinion or comparison), follow THAT with real curiosity and ask more about it (what they liked, which they preferred, why), do not cut back to the photo while they are actively giving you new things to explore. Be warm and friendly, and let your punctuation match the moment: an exclamation mark only for the genuinely exciting, happy or surprising things (not every friendly line, most turns need none), and a gentle trailing tone (like "that is too bad...") when they share something sad or hard. Match their mood and keep it natural, never over the top. ' +
    (focus ? 'One gentle background thing: when it fits naturally, lean toward a question that gives them a chance to use ' + focus + ', for example by asking about something that naturally calls for it. Treat this as a light nudge only, never force it, never ask about it twice in a row, and do not correct any more strictly than usual. ' : '') +
    (words.length ? 'They are learning these photo words: ' + words.map((w) => w.term).join(', ') + '. Use one in a reply only when it fits naturally. ' : '') +
    'Write English like real text messages: no dashes, colons or semicolons, and only word pairings and collocations a native speaker would really say (a smell is not "warm"). Use relevant face and punctuation emojis sparingly where it is necessary to suit the tone of the message but avoid using them in every message and in serious conversation topics. Keep everything at CEFR level ' + level + '. ' +
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

  let body: { context?: unknown; level?: unknown; history?: unknown; words?: unknown; learner?: unknown; focus?: unknown }
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
  const focus = typeof body.focus === 'string' ? body.focus.trim().slice(0, 40) : ''

  const mustWrap = turn >= HARD_CAP
  const system = buildSystem(learner, level, words, focus)

  const convo = history.length
    ? history.map((h) => `Teri: ${h.q}\nLearner: ${h.a}`).join('\n')
    : '(the conversation has not started yet, send your first message about the photo)'

  let directive = mustWrap
    ? 'NOTE: This chat has gone on long enough. Wrap up now: set done to true, send ONE short warm closing message, and use an empty replies array. Do not ask another question.'
    : engagementDirective(history)
  if (!mustWrap && !directive) directive = driftDirective(history)

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
