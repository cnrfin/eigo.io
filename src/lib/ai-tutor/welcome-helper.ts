import OpenAI from 'openai'
import { SCENES } from '@/lib/roleplay'
import { validateWelcome, type FactsRead, type WelcomePick } from '@/lib/classroom/welcome'

/**
 * The welcome call's helper (lib/classroom/welcome.ts): from what the student has said so far, the facts for
 * the About-you card and the one role-play that suits them. A small text model reads the conversation;
 * validateWelcome then keeps only facts backed by the student's own words. Never throws: on failure, nothing.
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

const SYSTEM = `You read the start of a friendly welcome call between an AI English tutor and a Japanese adult learner. Pick out what the STUDENT has said about themselves (for their profile; the tutor doesn't see this).
Return JSON: {"facts": {"job": {"value": "...", "quote": "...", "vague": false}, "likes": {...}, "why": {...}}}
- Only what the student said themselves, never the tutor's guesses or questions. Leave a key out if they haven't said it. If they corrected something, use the corrected version.
- job = where they're from and what they do (work or studies); likes = what they're interested in or enjoy; why = why they're studying English (including anything they'd like to be able to do in English).
- "value": a short note in English, no subject, max 8 words, e.g. "From Osaka, a nurse at a hospital", "Cafés, Korean dramas", "Helping patients from abroad".
- "quote": the student's own words it comes from, copied exactly as they said them (a few words, in the language they used).
- "vague": true only when it says almost nothing ("for work", "I like many things"); otherwise false.
- Each key is a different fact: never give the same thing for two keys.`

export async function welcomeFacts(lines: { from: 'student' | 'tutor'; text: string }[]): Promise<FactsRead & { pick: WelcomePick | null }> {
  const none = { facts: {}, thin: [], pick: null }
  const studentText = lines
    .filter((l) => l.from === 'student')
    .map((l) => l.text)
    .join(' ')
  if (!studentText.trim()) return none
  const convo = lines.map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n')
  const base = {
    model: MODEL,
    messages: [
      { role: 'system' as const, content: SYSTEM },
      { role: 'user' as const, content: `Conversation so far (most recent last):\n${convo}` },
    ],
    response_format: { type: 'json_object' as const },
    max_completion_tokens: 900,
  }
  try {
    let c: unknown
    for (const effort of ['minimal', 'low', null] as const) {
      try {
        c = await openai().chat.completions.create((effort ? { ...base, reasoning_effort: effort } : base) as never, { timeout: 8000, maxRetries: 0 })
        break
      } catch (e) {
        if (!/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) throw e
      }
    }
    const raw = (c as { choices?: { message?: { content?: string | null } }[] } | undefined)?.choices?.[0]?.message?.content ?? ''
    if (!raw.trim()) return none
    return validateWelcome(
      JSON.parse(raw),
      studentText,
      SCENES.map((s) => ({ id: s.id, titleEn: s.title.en })),
    )
  } catch (e) {
    console.error('ai-welcome failed', e instanceof Error ? e.message : e)
    return none
  }
}
