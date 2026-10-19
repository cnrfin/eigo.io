import OpenAI from 'openai'
import { lastExchange, validateCard, validateDraft, type Card, type CardLine } from './cards'

/**
 * The helper for cards in AI lessons (ai-panel-implementation-plan.md, 3.1). After the AI tutor's turn,
 * when that turn looks like a correction or the English for something the student said in Japanese
 * (cards.ts mayHaveCard, checked in the browser), a small text model fills in the card. validateCard
 * then makes sure the English really is what the AI tutor said. Never throws: null = no card.
 *
 * prepareCard runs earlier, right after each student turn: it guesses the card the AI tutor may need next
 * (the natural version of a mistake, or the English for something said in Japanese), so the complete card
 * can appear the moment the AI tutor says that sentence (cards.ts fitDraft).
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
const MODEL = process.env.AI_TUTOR_ASSIST_MODEL || process.env.AI_TUTOR_TURN_MODEL || 'gpt-6-luna'

const SYSTEM = `You watch a live one-to-one English lesson between an AI tutor and a Japanese adult learner. Look only at the tutor's LAST turn and the student's turn just before it.
Return JSON: {"card": null} or one card:
- {"card": {"kind": "correction", "was": "...", "now": "...", "ja": "...", "why": "..."}} when the tutor's last turn corrected something the student said by giving a better or more natural English sentence or phrase.
  "was": the student's words as they said them (short). "now": the better version, copied word for word from what the tutor said. "ja": a natural Japanese translation of "now". "why": one short reason in Japanese (max 30 characters), e.g. 「過去のことなので went」.
- {"card": {"kind": "say", "heard": "...", "normal": "...", "polite": "...", "casual": "..."}} when the student said something in Japanese (or asked how to say something) and the tutor's last turn gave the English for it.
  "heard": the Japanese they said (short). "normal": the English the tutor gave, copied word for word. "polite" and "casual": a more polite and a more casual natural version, or "" if there isn't a useful one.
Return {"card": null} for everything else: praise, pronunciation tips, explanations without a new sentence, the tutor's own questions, or when you're unsure. English in "now" and "normal" must be complete, natural sentences or phrases a learner can save.`

const PREPARE = `A Japanese adult learner is in a live one-to-one English lesson with an AI tutor. Look at the student's LAST line and prepare the card the tutor may need next.
Return JSON: {"card": null} or one card:
- {"card": {"kind": "correction", "was": "...", "now": "...", "ja": "...", "why": "..."}} when the line has a clear mistake a tutor would correct (grammar, word choice, unnatural phrasing).
  "was": the student's words as they said them (short). "now": the natural version of their whole sentence, as a tutor would say it. "ja": a natural Japanese translation of "now". "why": one short reason in Japanese (max 30 characters), e.g. 「過去のことなので went」.
- {"card": {"kind": "say", "heard": "...", "normal": "...", "polite": "...", "casual": "..."}} when they said something in Japanese, or asked how to say something in English.
  "heard": the Japanese (short). "normal": natural English for it. "polite" and "casual": a more polite and a more casual natural version, or "" if there isn't a useful one.
Return {"card": null} when the line is fine, or the slip is too small to correct in conversation (fillers, restarts, a missing article in casual speech).`

/** One quick helper call (the lowest reasoning the model accepts, a short answer). Returns the JSON's "card". */
async function ask(system: string, user: string): Promise<unknown> {
  const base = {
    model: MODEL,
    messages: [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ],
    response_format: { type: 'json_object' as const },
    max_completion_tokens: 700,
  }
  let c: unknown
  for (const effort of ['minimal', 'low', null] as const) {
    try {
      c = await openai().chat.completions.create((effort ? { ...base, reasoning_effort: effort } : base) as never, { timeout: 6000, maxRetries: 0 })
      break
    } catch (e) {
      // a model that doesn't take this setting: try the next one; anything else is a real failure
      if (!/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) throw e
    }
  }
  const raw = (c as { choices?: { message?: { content?: string | null } }[] } | undefined)?.choices?.[0]?.message?.content ?? ''
  if (!raw.trim()) return undefined
  return (JSON.parse(raw) as { card?: unknown }).card
}

const convoOf = (lines: CardLine[], n: number) =>
  lines
    .slice(-n)
    .map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 500)}`)
    .join('\n')

/** Right after a student turn: the card the AI tutor may need next (null = none). */
export async function prepareCard(lines: CardLine[]): Promise<Card | null> {
  const last = lines[lines.length - 1]
  if (!last || last.from !== 'student') return null
  try {
    return validateDraft(await ask(PREPARE, `Conversation (most recent last):\n${convoOf(lines, 4)}`), last.text)
  } catch (e) {
    console.error('ai-assist prepare failed', e instanceof Error ? e.message : e)
    return null
  }
}

/** After the AI tutor's turn: the card for what it said (null = none). */
export async function decideCard(lines: CardLine[]): Promise<Card | null> {
  const ex = lastExchange(lines)
  if (!ex.student || !ex.tutor) return null
  try {
    return validateCard(await ask(SYSTEM, `Conversation (most recent last):\n${convoOf(lines, 6)}`), ex)
  } catch (e) {
    console.error('ai-assist failed', e instanceof Error ? e.message : e)
    return null
  }
}
