/**
 * The action judge (AI classroom): the catch-all for changing what's on the student's screen.
 *
 * Clear spoken commands are caught instantly in the browser (lib/classroom/course-commands.ts,
 * lib/roleplay/intent.ts and the cues in AiRoom). Real speech is messier: "open it up", "I'd rather just chat",
 * "やっぱりフリートークで"… After each pause, a small model reads the latest exchange and the screen and returns at
 * most one action. Guardrails, all enforced here in code (not left to the model):
 *
 *  1. Possible now: only actions that make sense for the current screen (allowedActions), and only courses and
 *     role-plays that exist (by id from the lists we send).
 *  2. Proof: the model must quote the exact words that asked for it; the quote must be found in the lines it was
 *     shown (checkEvidence). A tutor's question or offer alone never counts.
 *  3. Recent: it only sees the conversation since the screen last changed, so an old request is never acted on twice.
 *  4. Unsure = nothing. Errors, timeouts and anything unexpected = nothing.
 * The classroom adds the rest: no action if the screen changed meanwhile, none near the goodbye, at most one every
 * few seconds, and each goes through the same functions as the buttons (so the AI tutor gets its usual note).
 *
 * Pure apart from decideScreenAction (the model call), so the guardrails are easy to test.
 */

export type ScreenView = 'free' | 'course' | 'picker' | 'roleplay'
export type Screen = {
  view: ScreenView
  /** the whiteboard is over the slides / free talk */
  board: boolean
  /** a course lesson (view 'course') */
  course?: { title: string; lesson: number; slideNo: number; total: number; furthest: number; reviewing: boolean }
  /** the role-play list's tab (view 'picker') */
  pickerMode?: 'rp' | 'course'
  /** the scene being played (view 'roleplay') */
  roleplay?: string
  /** a goodbye near the end: nothing changes any more */
  wrappingUp?: boolean
}
export type Named = { id: string; title: string }

export type ScreenAction =
  | { kind: 'none' }
  | { kind: 'next' }
  | { kind: 'back'; slide: number }
  | { kind: 'return' }
  | { kind: 'open_course'; courseId: string | null; lesson: number | null }
  | { kind: 'close_course' }
  | { kind: 'open_roleplays' }
  | { kind: 'start_roleplay'; sceneId: string }
  | { kind: 'close_panel' }
  | { kind: 'board_on' }
  | { kind: 'board_off' }
export type ActionKind = ScreenAction['kind']
export type Decision = { action: ScreenAction; quote: string }

const NONE: Decision = { action: { kind: 'none' }, quote: '' }

/** Guardrail 1: what can happen from this screen at all. */
export function allowedActions(s: Screen): ActionKind[] {
  if (s.wrappingUp) return ['none']
  const a: ActionKind[] = ['none']
  if (s.board) a.push('board_off')
  else a.push('board_on')
  // slide moves (next / back / return) stay with the slide check (lib/ai-tutor/turn.ts), tuned for them
  if (s.view === 'course' && s.course) a.push('close_course', 'open_course') // open_course here = a different course or lesson
  if (s.view === 'free') a.push('open_course', 'open_roleplays', 'start_roleplay')
  if (s.view === 'picker') a.push('open_course', 'start_roleplay', 'close_panel')
  if (s.view === 'roleplay') a.push('close_panel')
  return a
}

/** text for comparing quotes: lower case, no punctuation, single spaces */
export const normText = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[’'`"“”「」『』]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/**
 * Guardrail 2: the quote must be words that were actually said in the lines shown, and if only the tutor said it,
 * it must be a statement ("I'll close the course now"), not a question or offer ("Shall I close it?").
 */
export function checkEvidence(quote: string, lines: { from: 'student' | 'tutor'; text: string }[]): boolean {
  const q = normText(quote)
  if (q.length < 2) return false
  for (const l of lines) {
    // find the sentence(s) holding the quote
    const sentences = l.text.split(/(?<=[.!?。？！])\s*/)
    for (let i = 0; i < sentences.length; i++) {
      // the quote may run over two sentences ("Yes. Let's do that one.")
      const one = normText(sentences[i])
      const two = normText(sentences[i] + ' ' + (sentences[i + 1] ?? ''))
      if (one.includes(q)) return l.from === 'student' || !/\?\s*$/.test(sentences[i].trim())
      if (two.includes(q)) return l.from === 'student' || !/\?\s*$/.test((sentences[i + 1] ?? sentences[i]).trim())
    }
  }
  return false
}

/** Guardrails 1 and 2 on whatever the model returned. Anything off → none. */
export function validateDecision(
  raw: unknown,
  screen: Screen,
  lists: { courses: Named[]; scenes: Named[] },
  lines: { from: 'student' | 'tutor'; text: string }[],
): Decision {
  if (!raw || typeof raw !== 'object') return NONE
  const r = raw as Record<string, unknown>
  const kind = String(r.action ?? 'none') as ActionKind
  const quote = typeof r.quote === 'string' ? r.quote.slice(0, 200) : ''
  if (kind === 'none' || !allowedActions(screen).includes(kind)) return NONE
  if (!checkEvidence(quote, lines)) return NONE
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null)
  const c = screen.course
  switch (kind) {
    case 'back': {
      const n = num(r.slide)
      return c && n && n >= 1 && n <= c.furthest && n !== c.slideNo ? { action: { kind, slide: n }, quote } : NONE
    }
    case 'open_course': {
      const id = typeof r.id === 'string' && r.id ? r.id : null
      if (id && !lists.courses.some((x) => x.id === id)) return NONE
      const lesson = num(r.lesson)
      // with a course open, only a different course or a lesson number makes sense
      if (screen.view === 'course' && !id && !lesson) return NONE
      return { action: { kind, courseId: id, lesson: lesson && lesson >= 1 && lesson <= 99 ? lesson : null }, quote }
    }
    case 'start_roleplay': {
      const id = typeof r.id === 'string' ? r.id : ''
      return lists.scenes.some((x) => x.id === id) ? { action: { kind, sceneId: id }, quote } : NONE
    }
    default:
      return { action: { kind } as ScreenAction, quote }
  }
}

const DESCRIBE: Record<ActionKind, string> = {
  none: '"none": nothing should change (the default).',
  next: '"next": go to the next slide (the student asks to move on, or the tutor says it is moving on now).',
  back: '"back": show an earlier slide again; "slide" = its number.',
  return: '"return": go back to where the lesson was, after looking back at an earlier slide.',
  open_course: '"open_course": open a course lesson; "id" = a course id from COURSES, or null for the one they were doing; "lesson" = a lesson number if one is named, else null.',
  close_course: '"close_course": close the course (back to free talk, no slides).',
  open_roleplays: '"open_roleplays": show the list of role-plays.',
  start_roleplay: '"start_roleplay": start a role-play; "id" = a scene id from ROLE-PLAYS.',
  close_panel: '"close_panel": close the role-play screen (the list or the role-play being played) and go back to free talk.',
  board_on: '"board_on": open the whiteboard.',
  board_off: '"board_off": close the whiteboard.',
}

function describeScreen(s: Screen): string {
  const base =
    s.view === 'course' && s.course
      ? `A course lesson: "${s.course.title}", lesson ${s.course.lesson}, slide ${s.course.slideNo} of ${s.course.total}${s.course.reviewing ? ` (looking back; the lesson was on slide ${s.course.furthest})` : ''}.`
      : s.view === 'picker'
        ? `Free talk, with the list of ${s.pickerMode === 'course' ? 'courses' : 'role-plays'} on screen.`
        : s.view === 'roleplay'
          ? `A role-play is being played${s.roleplay ? ` ("${s.roleplay}")` : ''}.`
          : 'Free talk: no slides, nothing else on screen.'
  return base + (s.board ? ' The whiteboard is open over it.' : '')
}

export function actionPrompt(screen: Screen, lists: { courses: Named[]; scenes: Named[] }, lines: { from: 'student' | 'tutor'; text: string }[]) {
  const allowed = allowedActions(screen)
  const system = `You watch a live one-to-one English lesson between an AI tutor and a Japanese student, and decide whether the student's screen should change now. Most of the time it should not.
Return JSON: {"action": string, "id": string | null, "lesson": number | null, "slide": number | null, "quote": string}
Actions you may choose now:
${allowed.map((k) => '- ' + DESCRIBE[k]).join('\n')}
Rules:
- Choose an action only if, in the conversation below, the STUDENT clearly asks for it (in English or Japanese, any wording), or the student accepts the tutor's offer of it ("yes please"), or the TUTOR clearly says it is doing it now (a statement like "I'll open the course now").
- A question or offer by the tutor that the student hasn't accepted is NOT enough. Talking ABOUT a course or a role-play is not asking to open it. "Next time", goodbyes, "close to…" are not actions.
- "quote": copy, word for word, the words in the conversation that ask for it (or the student's acceptance). Copy exactly; don't paraphrase.
- If you're not sure, choose "none".`
  const user = `SCREEN NOW: ${describeScreen(screen)}
${lists.courses.length ? `COURSES:\n${lists.courses.map((c) => `- id "${c.id}": ${c.title}`).join('\n')}\n` : ''}${lists.scenes.length && allowed.includes('start_roleplay') ? `ROLE-PLAYS:\n${lists.scenes.map((c) => `- id "${c.id}": ${c.title}`).join('\n')}\n` : ''}CONVERSATION since the screen last changed (most recent last):
${lines.map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n')}`
  return { system, user }
}
