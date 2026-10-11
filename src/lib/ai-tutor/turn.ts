import OpenAI from 'openai'

/**
 * Slide control for AI lessons, owned by our app rather than the voice model.
 *
 * After each turn the classroom sends the conversation SINCE THE SLIDE APPEARED.
 * A small fast model marks which checklist items have been covered (the classroom
 * keeps a running list per slide) and whether the AI tutor or student wants to
 * move. The slide only moves on when every item on it has been covered and the
 * student has taken part: a wish to move on before that gets a "not yet" with the
 * items still missing, which the classroom passes to the AI tutor.
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

export type SlideMove = {
  move: 'stay' | 'next' | 'back' | 'return'
  slide: number | null
  /** checklist items (1-based) covered so far on this slide, including earlier turns */
  covered: number[]
  total: number
  /** set when someone wanted to move on but items are still missing */
  missing: string[]
}

export async function decideSlideMove(o: {
  slideNo: number
  total: number
  furthest: number // furthest slide taught (1-based)
  reviewing: boolean
  checklist: string[]
  coveredBefore: number[]
  cue: boolean // the AI tutor just said it's moving on
  outline: string
  slideLines: { from: 'student' | 'tutor'; text: string }[] // only since this slide appeared
}): Promise<SlideMove> {
  const n = o.checklist.length
  const before = new Set(o.coveredBefore.filter((k) => k >= 1 && k <= n))
  const convo = o.slideLines.map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n')
  const system = `You follow a live one-to-one English lesson between an AI tutor and a student, slide by slide. You see ONLY the conversation since the current slide appeared.
Return JSON: {"covered": number[], "wants_next": boolean, "back": number | null, "return": boolean}
- "covered": numbers of checklist items that have been FULLY done in this conversation: the tutor taught or asked about that item AND the student responded to it (said the word, answered, practised). Mentioning an item, or the tutor only reading or introducing it, does NOT count. Be strict.
- "wants_next": the tutor said they're moving on to the next slide or part, or the student asked to move on.
- "back": the student asked to see an earlier slide again (for example "the vocabulary") and the tutor agreed: that slide's number from the outline (1 to ${o.furthest}), else null.
- "return": ${o.reviewing ? 'they are looking back at an earlier slide and the tutor says they will carry on with the lesson.' : 'always false.'}`
  const user = `Slide on screen: ${o.slideNo} of ${o.total}${o.reviewing ? ` (looking back; the lesson was on slide ${o.furthest})` : ''}.
Checklist for this slide:
${o.checklist.map((t, i) => `${i + 1}. ${t}`).join('\n') || '(nothing to cover)'}
Already covered earlier on this slide: ${[...before].join(', ') || 'none'}
Outline:
${o.outline}
Conversation since this slide appeared:
${convo || '(nothing yet)'}`

  let r: { covered?: unknown; wants_next?: unknown; back?: unknown; return?: unknown } = {}
  try {
    const c = await openai().chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 300,
      },
      { timeout: 6000, maxRetries: 0 },
    )
    r = JSON.parse(c.choices[0]?.message?.content ?? '{}')
  } catch {
    /* treat as "no change" below */
  }
  const covered = new Set(before)
  if (Array.isArray(r.covered)) for (const k of r.covered) if (typeof k === 'number' && k >= 1 && k <= n) covered.add(Math.round(k))
  const coveredList = [...covered].sort((a, b) => a - b)
  const studentTookPart = o.slideLines.some((l) => l.from === 'student' && l.text.trim().split(/\s+/).length >= 2)
  const done = covered.size >= n && (n === 0 || studentTookPart)
  const base = { slide: null, covered: coveredList, total: n, missing: [] as string[] }

  if (o.reviewing && r.return === true) return { ...base, move: 'return' }
  const back = typeof r.back === 'number' ? Math.round(r.back) : null
  if (back && back >= 1 && back <= o.furthest && back !== o.slideNo) return { ...base, move: 'back', slide: back }

  const wantsNext = o.cue || r.wants_next === true
  if (o.reviewing) return { ...base, move: wantsNext ? 'return' : 'stay' }
  if (!wantsNext || o.slideNo >= o.total) return { ...base, move: 'stay' }
  if (done) return { ...base, move: 'next' }
  const missing = o.checklist.filter((_, i) => !covered.has(i + 1))
  return { ...base, move: 'stay', missing: missing.length ? missing : ['let the student answer or practise before moving on'] }
}
