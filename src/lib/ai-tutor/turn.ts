import OpenAI from 'openai'
import { actionPrompt, validateDecision, type Decision, type Named, type Screen } from './actions'
import { openTasks, ticksPrompt, validateTicks, type Tick } from '@/lib/roleplay/ticks'
import type { LevelIndex, RoleId, Scene } from '@/lib/roleplay/types'

/**
 * Slide control for AI lessons, owned by our app rather than the voice model.
 *
 * The AI tutor moves on by saying "…the next slide" (caught instantly in the browser).
 * This check is the safety net: after a pause, it reads the conversation since the
 * slide appeared and says whether the slide should change: the tutor or student
 * wants to move on (including "I can't see it"), go back, or return. It never blocks
 * anything: if it fails or is unsure, nothing happens, and the student also has
 * Next/Back buttons.
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
const MODEL = process.env.AI_TUTOR_TURN_MODEL || 'gpt-6-luna'

export type SlideMove = { move: 'stay' | 'next' | 'back' | 'return'; slide: number | null }

export async function decideSlideMove(o: {
  slideNo: number
  total: number
  furthest: number // furthest slide taught (1-based)
  reviewing: boolean
  outline: string
  slideLines: { from: 'student' | 'tutor'; text: string }[] // only since this slide appeared
}): Promise<SlideMove> {
  const stay: SlideMove = { move: 'stay', slide: null }
  const convo = o.slideLines.map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n')
  const system = `You follow a live one-to-one English lesson between an AI tutor and a student. Slides change only when you say so. You see the conversation since the current slide appeared.
Return JSON: {"move": "stay" | "next" | "back" | "return", "slide": number | null}
- "next": the tutor says they're moving on to the next slide or part; OR the student says they're done with this slide, asks to move on, or says they can't see the next slide (the tutor already moved on in words).${o.slideNo >= o.total ? ' This is the last slide: never "next".' : ''}
- "back": the student asked to see an earlier slide again (for example "the vocabulary") and the tutor agreed; "slide" = its number from the outline, 1 to ${o.furthest}.
- "return": ${o.reviewing ? 'they are looking back at an earlier slide and the tutor or student wants to carry on with the lesson.' : 'never (not looking back now).'}
- "stay": otherwise, including when the tutor is still working through this slide, and always when either of them is saying goodbye or ending the lesson ("see you next time", "thanks for today"): "next time" is not "the next slide".`
  const user = `Slide on screen: ${o.slideNo} of ${o.total}${o.reviewing ? ` (looking back; the lesson was on slide ${o.furthest})` : ''}.
Outline:
${o.outline}
Conversation since this slide appeared (most recent last):
${convo}`
  try {
    const base = {
      model: MODEL,
      messages: [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ],
      response_format: { type: 'json_object' as const },
      // a reasoning model can use part of this before answering: leave room
      max_completion_tokens: 1200,
    }
    let c
    try {
      c = await openai().chat.completions.create({ ...base, reasoning_effort: 'low' } as never, { timeout: 7000, maxRetries: 0 })
    } catch (e) {
      if (!/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) throw e
      c = await openai().chat.completions.create(base, { timeout: 7000, maxRetries: 0 })
    }
    const raw = c.choices[0]?.message?.content ?? ''
    if (!raw.trim()) {
      console.error('ai-turn: empty answer', c.choices[0]?.finish_reason)
      return stay
    }
    const r = JSON.parse(raw) as { move?: string; slide?: unknown }
    const move = (['stay', 'next', 'back', 'return'] as const).find((m) => m === r.move) ?? 'stay'
    const slide = typeof r.slide === 'number' && Number.isFinite(r.slide) ? Math.round(r.slide) : null
    if (move === 'next') return o.slideNo >= o.total ? stay : o.reviewing ? { move: 'return', slide: null } : { move, slide: null }
    if (move === 'back') return slide && slide >= 1 && slide <= o.furthest && slide !== o.slideNo ? { move, slide } : stay
    if (move === 'return') return o.reviewing ? { move, slide: null } : stay
    return stay
  } catch (e) {
    console.error('ai-turn failed', e instanceof Error ? e.message : e)
    return stay
  }
}

/**
 * The action judge (lib/ai-tutor/actions.ts): should the screen change (course, role-plays, whiteboard)?
 * Returns a validated decision; anything unsure, invalid or failed is "none".
 */
export async function decideScreenAction(
  screen: Screen,
  lists: { courses: Named[]; scenes: Named[] },
  lines: { from: 'student' | 'tutor'; text: string }[],
): Promise<Decision> {
  const none: Decision = { action: { kind: 'none' }, quote: '' }
  if (!lines.length || screen.wrappingUp) return none
  const { system, user } = actionPrompt(screen, lists, lines)
  try {
    const base = {
      model: MODEL,
      messages: [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ],
      response_format: { type: 'json_object' as const },
      max_completion_tokens: 1200,
    }
    let c
    try {
      c = await openai().chat.completions.create({ ...base, reasoning_effort: 'low' } as never, { timeout: 7000, maxRetries: 0 })
    } catch (e) {
      if (!/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) throw e
      c = await openai().chat.completions.create(base, { timeout: 7000, maxRetries: 0 })
    }
    const raw = c.choices[0]?.message?.content ?? ''
    if (!raw.trim()) return none
    return validateDecision(JSON.parse(raw), screen, lists, lines)
  } catch (e) {
    console.error('ai-action failed', e instanceof Error ? e.message : e)
    return none
  }
}

/** Role-plays (phase 3b): which of the student's remaining tasks are now done (lib/roleplay/ticks.ts). */
export async function decideTicks(
  scene: Scene,
  role: RoleId,
  level: LevelIndex,
  twisted: boolean,
  done: string[],
  lines: { from: 'student' | 'tutor'; text: string }[],
): Promise<Tick[]> {
  const open = openTasks(scene, role, level, twisted, done)
  if (!open.length || !lines.some((l) => l.from === 'student')) return []
  const { system, user } = ticksPrompt(scene, role, level, open, lines)
  const t0 = Date.now()
  try {
    const base = {
      model: MODEL,
      messages: [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ],
      response_format: { type: 'json_object' as const },
      max_completion_tokens: 1200,
    }
    // the least thinking the model takes: a tick is only "did they say this task?", and it's on the student's screen
    let c
    for (const effort of ['minimal', 'low', null] as const) {
      try {
        c = await openai().chat.completions.create((effort ? { ...base, reasoning_effort: effort } : base) as never, { timeout: 10000, maxRetries: 0 })
        break
      } catch (e) {
        // a model that doesn't take this setting: try the next one; anything else is a real failure
        if (!/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) throw e
      }
    }
    if (!c) return []
    const raw = c.choices[0]?.message?.content ?? ''
    if (!raw.trim()) return []
    const ticks = validateTicks(JSON.parse(raw), open.map((t) => t.id), lines)
    // (in the Vercel logs: how long each check took and what it ticked, to look into missed ticks)
    console.info('ai-ticks', JSON.stringify({ scene: scene.id, ms: Date.now() - t0, open: open.map((t) => t.id), ticked: ticks.map((t) => t.id), raw: raw.slice(0, 300) }))
    return ticks
  } catch (e) {
    console.error('ai-ticks failed', e instanceof Error ? e.message : e)
    return []
  }
}
