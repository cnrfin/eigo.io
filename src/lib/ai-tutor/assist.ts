import OpenAI from 'openai'
import { lastExchange, validateCard, type Card, type CardLine } from './cards'

/**
 * The helper for cards in AI lessons (ai-panel-implementation-plan.md, 3.1). After the AI tutor's turn,
 * when that turn looks like a correction or the English for something the student said in Japanese
 * (cards.ts mayHaveCard, checked in the browser), a small text model fills in the card. validateCard
 * then makes sure the English really is what the AI tutor said. Never throws: null = no card.
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
const MODEL = process.env.AI_TUTOR_ASSIST_MODEL || process.env.AI_TUTOR_TURN_MODEL || 'gpt-5.4-nano'

const SYSTEM = `You watch a live one-to-one English lesson between an AI tutor and a Japanese adult learner. Look only at the tutor's LAST turn and the student's turn just before it.
Return JSON: {"card": null} or one card:
- {"card": {"kind": "correction", "was": "...", "now": "...", "ja": "...", "why": "..."}} when the tutor's last turn corrected something the student said by giving a better or more natural English sentence or phrase.
  "was": the student's words as they said them (short). "now": the better version, copied word for word from what the tutor said. "ja": a natural Japanese translation of "now". "why": one short reason in Japanese (max 30 characters), e.g. 「過去のことなので went」.
- {"card": {"kind": "say", "heard": "...", "normal": "...", "polite": "...", "casual": "..."}} when the student said something in Japanese (or asked how to say something) and the tutor's last turn gave the English for it.
  "heard": the Japanese they said (short). "normal": the English the tutor gave, copied word for word. "polite" and "casual": a more polite and a more casual natural version, or "" if there isn't a useful one.
Return {"card": null} for everything else: praise, pronunciation tips, explanations without a new sentence, the tutor's own questions, or when you're unsure. English in "now" and "normal" must be complete, natural sentences or phrases a learner can save.`

export async function decideCard(lines: CardLine[]): Promise<Card | null> {
  const ex = lastExchange(lines)
  if (!ex.student || !ex.tutor) return null
  const convo = lines
    .slice(-6)
    .map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 500)}`)
    .join('\n')
  try {
    const base = {
      model: MODEL,
      messages: [
        { role: 'system' as const, content: SYSTEM },
        { role: 'user' as const, content: `Conversation (most recent last):\n${convo}` },
      ],
      response_format: { type: 'json_object' as const },
      max_completion_tokens: 1200,
    }
    let c
    try {
      c = await openai().chat.completions.create({ ...base, reasoning_effort: 'low' } as never, { timeout: 8000, maxRetries: 0 })
    } catch (e) {
      if (!/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) throw e
      c = await openai().chat.completions.create(base, { timeout: 8000, maxRetries: 0 })
    }
    const raw = c.choices[0]?.message?.content ?? ''
    if (!raw.trim()) return null
    const r = JSON.parse(raw) as { card?: unknown }
    return validateCard(r.card, ex)
  } catch (e) {
    console.error('ai-assist failed', e instanceof Error ? e.message : e)
    return null
  }
}
