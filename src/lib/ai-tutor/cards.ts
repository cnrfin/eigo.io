import { hasJapanese, sameWords, share, words } from './voice-match'

/**
 * Cards in AI lessons (ai-panel-implementation-plan.md): a correction, or "How do I say…?". They slide up
 * over whatever is on screen, and the phrase is saved to the student's word list.
 *
 * The voice model never writes them. After the AI tutor's turn, a small helper model (lib/ai-tutor/assist.ts)
 * reads the last exchange and fills one in; validateCard() then only accepts it if the AI tutor really
 * said that English out loud, so a card never contradicts the voice. Pure functions (browser and server).
 */

export type Card =
  | {
      kind: 'correction'
      /** what the student said */
      was: string
      /** the natural version, as the AI tutor said it */
      now: string
      /** its Japanese meaning (saved with the phrase) */
      ja: string
      /** one short reason, in Japanese */
      why: string
    }
  | {
      kind: 'say'
      /** what the student said in Japanese (or asked about) */
      heard: string
      /** the English the AI tutor gave first, then a more polite and/or a more casual version when there is one */
      options: { style: SayStyle; text: string }[]
    }
export type SayStyle = 'normal' | 'polite' | 'casual'

export type CardLine = { from: 'student' | 'tutor'; text: string }

/** The AI tutor's last turn and the student's turn before it. */
export function lastExchange(lines: CardLine[]): { student: string; tutor: string } {
  let i = lines.length - 1
  const tutor: string[] = []
  while (i >= 0 && lines[i].from === 'tutor') tutor.unshift(lines[i--].text)
  const student: string[] = []
  while (i >= 0 && lines[i].from === 'student') student.unshift(lines[i--].text)
  return { student: student.join(' ').trim(), tutor: tutor.join(' ').trim() }
}

// what the AI tutor says when it corrects (its brief asks for "A more natural way is: …") or gives the English
const CORRECTION_HINT =
  /\b(?:more natural|natural way|you could say|you can say|we (?:usually |often |would |'d )?say|better to say|it'?s better|instead of|in English,? (?:you|we) (?:can |could |would )?say|try saying|the correct|should be|we don't say|you'd say|sounds more natural|a better way)\b/i
const ASK_HINT = /\bhow (?:do|would|can|should) (?:you|i|we) say\b|\bwhat'?s .{1,30} in english\b|英語で(?:何|なん)/i

/** Worth asking the helper about? (Keeps the helper to the turns that can have a card.) */
export function mayHaveCard(student: string, tutor: string): boolean {
  if (!tutor || !student) return false
  return CORRECTION_HINT.test(tutor) || ASK_HINT.test(student) || hasJapanese(student)
}

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').replace(/^["“'「]+|["”'」]+$/g, '').trim().slice(0, max) : '')
const okLength = (s: string) => {
  const n = words(s).length
  return n >= 2 && n <= 22
}

/** Accept the helper's card only if it matches what was really said; otherwise null. */
export function validateCard(raw: unknown, ex: { student: string; tutor: string }): Card | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.kind === 'correction') {
    const now = clip(r.now, 200)
    const was = clip(r.was, 200)
    if (!okLength(now) || !was || sameWords(now, was)) return null
    // the AI tutor said the new version, and the student said (roughly) the old one
    if (share(ex.tutor, now) < 0.8 || share(ex.student, was) < 0.5) return null
    return { kind: 'correction', was, now, ja: clip(r.ja, 120), why: clip(r.why, 80) }
  }
  if (r.kind === 'say') {
    const heard = clip(r.heard, 120)
    const all = (['normal', 'polite', 'casual'] as const).map((style) => ({ style, text: clip(r[style], 200) })).filter((o) => okLength(o.text))
    // the one the AI tutor said comes first (and must be there)
    const said = all.find((o) => share(ex.tutor, o.text) >= 0.8)
    if (!said || !(hasJapanese(ex.student) || ASK_HINT.test(ex.student))) return null
    const options = [said, ...all.filter((o) => o !== said && !sameWords(o.text, said.text))]
    return { kind: 'say', heard: heard || (hasJapanese(ex.student) ? clip(ex.student, 120) : ''), options }
  }
  return null
}

/** Stable id for a saved phrase: 'tutor:<hash of its words>' (the same phrase twice is one word-list entry). */
export function tutorItemId(term: string): string {
  let h = 5381
  for (const c of words(term).join(' ')) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0
  return `tutor:${h.toString(36)}`
}
