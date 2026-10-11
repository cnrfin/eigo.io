import OpenAI from 'openai'

/**
 * Slide control for AI lessons, owned by our app rather than the voice model.
 * GPT-Live hands tool calls to a backend model, which was slow (10–20 s) and often
 * didn't happen at all. Instead, after each turn the classroom asks this small, fast
 * model whether the conversation means the slide should change, and changes it itself.
 * (Clear spoken cues like "let's move on to the next slide" are caught in the browser
 * straight away, without waiting for this.)
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
const MODEL = process.env.AI_TUTOR_TURN_MODEL || 'gpt-5.4-nano'

export type SlideMove = { move: 'stay' | 'next' | 'back' | 'return'; slide: number | null }

export async function decideSlideMove(o: {
  slideNo: number
  total: number
  furthest: number // furthest slide taught (1-based)
  reviewing: boolean
  checklist: string[]
  outline: string
  recent: { from: 'student' | 'tutor'; text: string }[]
}): Promise<SlideMove> {
  const convo = o.recent.map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n')
  const system = `You control the slides in a live one-to-one English lesson between an AI tutor and a student, by reading the latest conversation. Decide if the slide on the student's screen should change NOW.
Return JSON: {"move": "stay" | "next" | "back" | "return", "slide": number | null}
- "next": the tutor has just said they're moving on to the next slide or next part, or the student asked to move on and the tutor agreed, or the tutor is clearly waiting after finishing everything on the slide. ${o.slideNo >= o.total ? 'This is the last slide, so never "next".' : ''}
- "back": the student asked to look at an earlier slide again (for example "the vocabulary") and the tutor agreed. "slide" = that slide's number from the outline, from 1 to ${o.furthest}.
- "return": they are looking back at an earlier slide and the tutor says they'll carry on with the lesson.${o.reviewing ? '' : ' (Not looking back now, so never "return".)'}
- "stay": anything else, including when the tutor is still in the middle of the slide or says "before we move on". When unsure, "stay".`
  const user = `Slide on screen: ${o.slideNo} of ${o.total}${o.reviewing ? ` (looking back; the lesson was on slide ${o.furthest})` : ''}.
Checklist for this slide:
${o.checklist.map((t, i) => `${i + 1}. ${t}`).join('\n') || '(none)'}
Outline:
${o.outline}
Latest conversation (most recent last):
${convo}`
  try {
    const c = await openai().chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 200,
      },
      { timeout: 6000, maxRetries: 0 },
    )
    const r = JSON.parse(c.choices[0]?.message?.content ?? '{}') as { move?: string; slide?: unknown }
    const move = (['stay', 'next', 'back', 'return'] as const).find((m) => m === r.move) ?? 'stay'
    const slide = typeof r.slide === 'number' && Number.isFinite(r.slide) ? Math.round(r.slide) : null
    if (move === 'next' && o.slideNo >= o.total) return { move: 'stay', slide: null }
    if (move === 'back' && (!slide || slide < 1 || slide > o.furthest || slide === o.slideNo)) return { move: 'stay', slide: null }
    if (move === 'return' && !o.reviewing) return { move: 'stay', slide: null }
    return { move, slide: move === 'back' ? slide : null }
  } catch {
    return { move: 'stay', slide: null }
  }
}
