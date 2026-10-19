import { hasJapanese, near, sameWords, share, words } from './voice-match'

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

// ---------- instant cards, straight from the AI tutor's words ----------
// The brief asks for "A more natural way is: <sentence>" and "In English you can say: <sentence>". As soon as
// that sentence is complete in the transcript, the card can appear (while the AI tutor is still saying it);
// the helper then fills in the reason, the Japanese and other versions a moment later (mergeCard).
const CUE =
  /(?:\b(a\s+)?(?:more\s+)?natural\s+way(?:\s+to\s+say\s+(?:it|that|this))?\s+(?:is|would\s+be)(?:\s+to\s+say)?|\b(in\s+english,?\s+(?:you|we)\s+(?:can|could)\s+say)|\b(?:you\s+could\s+say|you\s+can\s+say|we\s+(?:usually\s+)?say|try\s+saying))\s*[:,]?\s*/i

/** The sentence after the cue, once it's complete (ends in . ! ?); null while it's still being said. */
export function cueSentence(tutor: string): { sentence: string; say: boolean } | null {
  const m = CUE.exec(tutor)
  if (!m) return null
  const raw = tutor.slice(m.index + m[0].length)
  const rest = raw.replace(/^["“'「]+/, '')
  const end = rest.search(/[.!?](?=\s|["”'」]|$)/)
  if (end < 0) return null
  // a quoted phrase that the sentence then explains ('you can say "Open the course" - to start a lesson…') is
  // talk about a phrase, not a sentence to save
  if (/^["“「]/.test(raw)) {
    const close = rest.search(/["”」]/)
    if (close >= 0 && close < end && words(rest.slice(close + 1, end)).length > 0) return null
  }
  const sentence = rest.slice(0, end + 1).replace(/["”'」]+$/, '').trim()
  const n = words(sentence).length
  if (n < 2 || n > 22) return null
  return { sentence, say: !!m[2] }
}

/** The last sentence (or the whole thing, if short) of what the student said, for the struck-through line. */
const lastSentence = (s: string) => {
  const parts = s.trim().split(/(?<=[.!?。？！])\s+/).filter(Boolean)
  return (parts.length > 1 && words(s).length > 14 ? parts[parts.length - 1] : s).trim().slice(0, 160)
}

const FILLER = new Set(['mm', 'mmm', 'hmm', 'hm', 'uh', 'um', 'umm', 'er', 'erm', 'ah', 'oh', 'okay', 'ok', 'yeah', 'yes', 'yep', 'no', 'right', 'sure', 'thanks', 'thank', 'you', 'too', 'so', 'well', 'and', 'nice', 'cool', 'great'])
/** only a thinking sound or a one-word reply ("mm", "uh", "okay", "thank you"): never a mistake to correct */
export const isFiller = (s: string) => words(s).filter((w) => !FILLER.has(w)).length < 2 && words(s).length <= 3
/** hesitation sounds: skipped inside a sentence (an extra "so" or "and" there is a real word, so a correction) */
const HESITATION = new Set(['uh', 'um', 'umm', 'er', 'erm', 'mm', 'mmm', 'hmm', 'hm', 'ah', 'eh'])

/**
 * The student's words a correction is about. Usually their last turn, but not always: in role-play feedback the
 * AI tutor corrects an earlier line ("We accept cash or card. How would you like to pay?"), and the last thing the
 * student said may be "Mm". So: the student sentence (recent turns) closest to the corrected sentence; fillers never.
 */
export function mistakeFor(lines: CardLine[], tutor: string): string {
  const c = cueSentence(tutor)
  const sentences = lines
    .filter((l) => l.from === 'student')
    .flatMap((l) => l.text.split(/(?<=[.!?。？！])\s+/))
    .map((x) => x.trim())
    .filter((x) => x && !isFiller(x))
  if (!sentences.length) return ''
  if (!c) return sentences[sentences.length - 1]
  let best = ''
  let score = 0
  for (const x of sentences) {
    // how much of the corrected sentence they had (later sentences win ties)
    const v = share(x, c.sentence) + share(c.sentence, x)
    if (v >= score) {
      best = x
      score = v
    }
  }
  return score >= 0.6 ? best : sentences[sentences.length - 1]
}

/** the letters only ("aroma therapist" and "aromatherapist" are the same: a transcript split, not a mistake) */
export const letters = (s: string) => words(s).join('')

/** a different form of the same word ("customer" / "customers", "like" / "liked"): a real correction */
const inflected = (a: string, b: string) => {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  return l !== s && l.startsWith(s) && /^(?:s|es|d|ed|ing|er|est|ly)$/.test(l.slice(s.length))
}

/**
 * They already said the corrected sentence: every word of it, in order, as the same word, with nothing but "uh", "um"…
 * in between. Matched from the end (the sentence is usually the last thing they said, after "Hi Tom, …"). A word the
 * transcript spelt a little differently ("colour" / "color") counts; a different ending ("customer" / "customers")
 * or an extra word ("I am go" / "I go") is a real correction.
 */
export function alreadySaid(student: string, sentence: string): boolean {
  if (sameWords(student, sentence) || letters(student) === letters(sentence)) return true
  const said = words(student)
  const want = words(sentence)
  const same = (a: string, b: string) => a === b || (near(a, b) && !inflected(a, b))
  // each word of the sentence, last to first: the latest of their words before the previous match
  const matched: number[] = []
  let k = said.length
  for (let w = want.length - 1; w >= 0; w--) {
    k--
    while (k >= 0 && !same(said[k], want[w])) k--
    if (k < 0) return false
    matched.push(k)
  }
  // between the first and last match: only the sentence's own words and hesitation sounds
  const first = matched[matched.length - 1]
  const last = matched[0]
  for (let i = first; i <= last; i++) if (!matched.includes(i) && !HESITATION.has(said[i])) return false
  return true
}

/** A card made in the browser from the AI tutor's words alone (no reason or Japanese yet). */
export function cueCard(student: string, tutor: string): Card | null {
  const c = cueSentence(tutor)
  if (!c || !student) return null
  if (isFiller(student) && !hasJapanese(student)) return null // "mm" is never the mistake
  const ja = hasJapanese(student)
  if (c.say || ja) return { kind: 'say', heard: ja ? lastSentence(student).slice(0, 120) : '', options: [{ style: 'normal', text: c.sentence }] }
  if (alreadySaid(student, c.sentence)) return null
  return { kind: 'correction', was: lastSentence(student), now: c.sentence, ja: '', why: '' }
}

// ---------- prepared cards ----------
// After each student turn the helper prepares the card the AI tutor may need next (lib/ai-tutor/assist.ts
// prepareCard): the natural version of a mistake, or the English for something said in Japanese. When the AI
// tutor then says that sentence, the complete card can appear at once (fitDraft).

/** Accept a prepared card only if it fits what the student said. */
export function validateDraft(raw: unknown, student: string): Card | null {
  if (!raw || typeof raw !== 'object' || !student) return null
  const r = raw as Record<string, unknown>
  if (r.kind === 'correction') {
    const now = clip(r.now, 200)
    const was = clip(r.was, 200)
    if (!okLength(now) || !was || sameWords(now, was) || share(student, was) < 0.5) return null
    return { kind: 'correction', was, now, ja: clip(r.ja, 120), why: clip(r.why, 80) }
  }
  if (r.kind === 'say') {
    if (!(hasJapanese(student) || ASK_HINT.test(student))) return null
    const options = (['normal', 'polite', 'casual'] as const).map((style) => ({ style, text: clip(r[style], 200) })).filter((o) => okLength(o.text))
    const uniq = options.filter((o, i) => !options.slice(0, i).some((p) => sameWords(p.text, o.text)))
    if (!uniq.length) return null
    return { kind: 'say', heard: clip(r.heard, 120) || (hasJapanese(student) ? clip(student, 120) : ''), options: uniq }
  }
  return null
}

const alike = (a: string, b: string) => share(a, b) >= 0.8 && share(b, a) >= 0.8

/**
 * The complete card, if the prepared (or helper's) card is about the sentence the AI tutor actually said;
 * otherwise null. The English always stays exactly as the AI tutor said it.
 */
export function fitDraft(local: Card, draft: Card | null): Card | null {
  if (!draft || draft.kind !== local.kind) return null
  if (local.kind === 'correction' && draft.kind === 'correction') {
    if (!alike(local.now, draft.now)) return null
    return { kind: 'correction', was: draft.was || local.was, now: local.now, ja: draft.ja, why: draft.why }
  }
  if (local.kind === 'say' && draft.kind === 'say') {
    const spoken = local.options[0].text
    const match = draft.options.find((o) => alike(o.text, spoken))
    if (!match) return null
    return { kind: 'say', heard: local.heard || draft.heard, options: [{ style: match.style, text: spoken }, ...draft.options.filter((o) => o !== match)] }
  }
  return null
}

/** The card on screen, with details that arrived late added (only when they're about the same sentence). */
export function mergeCard(local: Card, helper: Card | null): Card {
  const fit = fitDraft(local, helper)
  if (!fit) return local
  // keep what the student is already looking at; only add what was missing
  if (local.kind === 'correction' && fit.kind === 'correction') return { ...local, ja: local.ja || fit.ja, why: local.why || fit.why }
  if (local.kind === 'say' && fit.kind === 'say') return { ...local, heard: local.heard || fit.heard, options: [local.options[0], ...fit.options.slice(1)] }
  return local
}
