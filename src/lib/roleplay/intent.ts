/**
 * Reading the AI panel commands out of what's said (free talk only). Pure, so it's easy to test.
 *
 * The student doesn't need the AI tutor to do it for them: "show me the role-plays", "let's do the café one",
 * "close it" act at once. The AI tutor's own sentences work too ("Let's look at some role-plays", "Let's start
 * the izakaya one", "I'll close the role-plays"), but only as statements: questions never change the screen.
 */

export type PanelItem = { id: string; en: string; ja: string }
export type PanelIntent =
  | { kind: 'open'; mode: 'rp' | 'course' }
  | { kind: 'close' }
  | { kind: 'pick'; id: string }
  | { kind: 'start'; id: string | null }
  | { kind: 'mode'; mode: 'rp' | 'course' }

const RP = /\brole[- ]?plays?\b|ロールプレイ/i
const COURSE = /\bcourses?\b|コース/i
// "show / open / see / look at / try / do / choose … role-play(s)"
const OPEN_VERB = /\b(?:open|show|see|look at|check out|bring up|pull up|choose|pick|try|do|practi[cs]e|here are|have a look at|take a look at)\b/i
const OPEN_JA = /ロールプレイ.{0,6}(?:見|開|やり|したい|して|選)|コース.{0,6}(?:見|開|選)/
const CLOSE_STUDENT = /\b(?:close|hide|put away|stop|end|exit|finish|quit)\b(?:\s+\w+){0,3}?\s*(?:the\s+)?(?:role[- ]?plays?|panel|list|this|it|that)\b|閉じ|やめ(?:る|ます|たい)|終わり|終了/i
const CLOSE_TUTOR = /\b(?:I'll|I will|let me|let's|let us)\s+(?:close|put away|hide)\b[^.?!]*\b(?:role[- ]?plays?|panel|list)\b/i
const START = /\b(?:let'?s (?:do|try|start|go with|go for|play)|(?:I'd|I would|I want to|I wanna) (?:like to )?(?:do|try|play)|can we (?:do|try)|start|go with|go for)\b|はじめ|始め|(?:に|で)します|やりたい|やります/i
const ORDINALS: [RegExp, number][] = [
  [/\b(?:first|1st)\b|1つ目|一つ目|ひとつめ/i, 0],
  [/\b(?:second|2nd)\b|2つ目|二つ目|ふたつめ/i, 1],
  [/\b(?:third|3rd)\b|3つ目|三つ目|みっつめ/i, 2],
  [/\b(?:fourth|4th)\b|4つ目|四つ目|よっつめ/i, 3],
]
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const STOP = new Set(['ordering', 'with', 'your', 'yourself', 'from', 'about', 'that', 'this', 'there', 'their', 'what', 'have', 'some'])
const keyWords = (en: string) => fold(en).split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w))

const jaWords = (ja: string) => ja.match(/[\u4e00-\u9fff\u30a0-\u30ff]{2,}/g) ?? []

/** The item a sentence names (the best match): words from its English or Japanese title, or "the second one". */
export function findItem(text: string, items: PanelItem[]): PanelItem | null {
  const f = fold(text)
  let best: PanelItem | null = null
  let score = 0
  for (const x of items) {
    const n = keyWords(x.en).filter((w) => new RegExp(`\\b${w}`).test(f)).length + jaWords(x.ja).filter((w) => text.includes(w)).length
    if (n > score) {
      best = x
      score = n
    }
  }
  if (best) return best
  for (const [re, i] of ORDINALS) if (re.test(text) && items[i]) return items[i]
  return null
}

/**
 * What a sentence asks the panel to do, or null.
 * panel: what's on screen now (null = nothing); items: the role-plays (and, in course mode, the courses) to match names against.
 */
export function panelIntent(
  text: string,
  who: 'student' | 'tutor',
  panel: 'picker' | 'roleplay' | null,
  items: { rp: PanelItem[]; course: PanelItem[] },
  mode: 'rp' | 'course' = 'rp',
): PanelIntent | null {
  const s = text.trim()
  if (!s) return null
  const question = /\?\s*$/.test(s)
  // the AI tutor: statements only ("Shall we look at some role-plays?" changes nothing)
  if (who === 'tutor' && question) return null

  if (panel) {
    if (who === 'student' ? CLOSE_STUDENT.test(s) : CLOSE_TUTOR.test(s)) return { kind: 'close' }
  }
  if (panel === 'roleplay') return null

  const list = mode === 'course' && panel === 'picker' ? items.course : items.rp
  const named = RP.test(s) || panel === 'picker' || who === 'student' ? findItem(s, list) : null
  if (named && START.test(s)) return { kind: 'start', id: named.id }

  if (panel === 'picker') {
    if (mode === 'course' && RP.test(s) && !COURSE.test(s)) return { kind: 'mode', mode: 'rp' }
    if (mode === 'rp' && COURSE.test(s) && !RP.test(s)) return { kind: 'mode', mode: 'course' }
    if (named) return { kind: 'pick', id: named.id }
    // "let's start" / "はじめましょう" with nothing named: the one that's selected
    if (START.test(s)) return { kind: 'start', id: null }
    return null
  }

  // nothing on screen yet: "show me the role-plays" / "Let's look at some role-plays" / "コースを見せて"
  if (RP.test(s) && (OPEN_VERB.test(s) || OPEN_JA.test(s))) return { kind: 'open', mode: 'rp' }
  if (who === 'student' && COURSE.test(s) && OPEN_JA.test(s)) return { kind: 'open', mode: 'course' }
  return null
}
