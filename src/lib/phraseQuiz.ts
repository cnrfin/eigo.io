/**
 * Turns saved phrases into review questions, using only what a phrase already has
 * (its English, Japanese and example sentence). Three kinds:
 *
 *   meaning  the English, pick its Japanese from three
 *   build    the Japanese, put the English back together from word tiles
 *   context  the example sentence with the phrase missing, build it in from tiles
 *
 * Every kind has rules so a question never comes out odd. A phrase that can't make
 * any question safely is left out of reviews (it still shows in the list).
 *
 * Kept in step with eigo-ios lib/phraseQuiz.ts: the app and the web ask the same
 * questions.
 */

/** What a question needs from a saved phrase (flattened from vocabulary_cards + vocabulary_phrases). */
export type QuizCard = {
  id: string
  phrase_en: string
  phrase_ja: string
  example_en?: string | null
  explanation_en?: string | null
  explanation_ja?: string | null
  source?: string | null
  state?: 'new' | 'learning' | 'review' | 'relearning' | null
  stability?: number | null
  next_review_at: string
  created_at?: string | null
}
type VocabCard = QuizCard

export type MeaningQ = { kind: 'meaning'; prompt: string; options: string[]; answer: number }
export type TileQ = {
  kind: 'build' | 'context'
  /** build: the Japanese to put into English */
  prompt?: string
  /** context: the sentence around the gap */
  before?: string[]
  after?: string[]
  /** build: the sentence's end mark (. ? !), shown fixed after the tiles, not as a tile */
  end?: string
  /** the right words in order, and the same words shuffled for the bank */
  target: string[]
  bank: string[]
}
export type PhraseQ = MeaningQ | TileQ

const MIN_TILES = 3 // build it: at least a few words
const MAX_TILES = 10 // more than this doesn't fit the bank
const MIN_CONTEXT_TILES = 2
const MAX_SENTENCE_WORDS = 22

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean)
/** curly quotes and the like, so "don’t" in the phrase matches "don't" in the example */
const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
const comparable = (s: string) => norm(s).toLowerCase().replace(/[.!?。！？]+$/, '').replace(/\s+/g, ' ').trim()

/** "(do something)", "~", "…", "A/B" and similar are templates, not a phrase you can build */
export function hasPlaceholder(s: string) {
  return /[(（[\]~〜…]|\.\.\.|\/|\bsb\b|\bsth\b/i.test(s)
}

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const out = a.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** shuffled tiles that never start out already in the right order */
function bankFor(target: string[], rnd: () => number): string[] | null {
  if (new Set(target).size < 2) return null // all the same word: nothing to order
  for (let i = 0; i < 12; i++) {
    const b = shuffle(target, rnd)
    if (b.some((w, k) => w !== target[k])) return b
  }
  return target.slice(1).concat(target[0])
}

export function canBuild(c: VocabCard) {
  const n = words(c.phrase_en).length
  return !!c.phrase_ja?.trim() && !hasPlaceholder(c.phrase_en) && n >= MIN_TILES && n <= MAX_TILES
}

/**
 * Does the example contain the phrase exactly (whole words, any case, curly or
 * straight apostrophes) and say more than the phrase? The edit screen uses this to
 * say when an example can't be used for "Complete the sentence".
 */
export function exampleHasPhrase(phrase: string, example: string) {
  const ph = phrase.trim().replace(/[.!?]+$/, ''), ex = example.trim()
  if (!ph || !ex || comparable(ex) === comparable(ph)) return false
  const esc = norm(ph).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return new RegExp(`(^|[^A-Za-z'])(${esc})(?![A-Za-z'])`, 'i').test(norm(ex))
}

/** where the phrase sits in its example, or null if it can't be cut out cleanly */
export function contextSplit(c: VocabCard): { before: string[]; target: string[]; after: string[] } | null {
  const ex = c.example_en?.trim()
  const ph = c.phrase_en.trim().replace(/[.!?]+$/, '')
  if (!ex || hasPlaceholder(ph) || hasPlaceholder(ex)) return null
  const n = words(ph).length
  if (n < MIN_CONTEXT_TILES || n > MAX_TILES) return null
  if (words(ex).length > MAX_SENTENCE_WORDS) return null
  // the example is just the phrase again (common for whole sentences): nothing to fill in
  if (comparable(ex) === comparable(ph)) return null
  if (ph.length > ex.length * 0.67) return null
  // whole words only, any case, curly or straight apostrophes (same string length, so
  // indices carry over to the original)
  const esc = norm(ph).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const m = new RegExp(`(^|[^A-Za-z'])(${esc})(?![A-Za-z'])`, 'i').exec(norm(ex))
  if (!m) return null
  const start = m.index + m[1].length
  const end = start + m[2].length
  const before = words(ex.slice(0, start))
  const after = words(ex.slice(end))
  if (!before.length && !after.length) return null
  return { before, target: words(ex.slice(start, end)), after }
}

const isSentence = (en: string) => /[.!?]$/.test(en.trim()) || words(en).length >= 5
/** three meanings: the right one and two from the student's other phrases that can't be confused with it */
function meaningOptions(c: VocabCard, all: VocabCard[], rnd: () => number): MeaningQ | null {
  const ja = c.phrase_ja?.trim()
  if (!ja) return null
  const mine = comparable(ja)
  const sentence = isSentence(c.phrase_en)
  const pool = all.filter((o) => {
    if (o.id === c.id) return false
    // tutor practice lines read oddly as answers ("うーん、ロールプレイが見えません。")
    if (o.source === 'tutor') return false
    const oj = o.phrase_ja?.trim()
    if (!oj) return false
    const theirs = comparable(oj)
    if (theirs === mine || theirs.includes(mine) || mine.includes(theirs)) return false
    return comparable(o.phrase_en) !== comparable(c.phrase_en)
  })
  // the same kind (a sentence with sentences, a chunk with chunks), then closest in
  // length, so the right one doesn't stand out
  const score = (o: VocabCard) => (isSentence(o.phrase_en) === sentence ? 0 : 1000) + Math.abs(o.phrase_ja.length - ja.length)
  const ranked = shuffle(pool, rnd).sort((a, b) => score(a) - score(b))
  const picks: string[] = []
  for (const o of ranked) {
    const oj = o.phrase_ja.trim()
    if (!picks.some((p) => comparable(p) === comparable(oj))) picks.push(oj)
    if (picks.length === 2) break
  }
  if (picks.length < 2) return null
  const options = shuffle([ja, ...picks], rnd)
  return { kind: 'meaning', prompt: c.phrase_en.trim(), options, answer: options.indexOf(ja) }
}

/** the kinds a phrase can be asked as, easiest first */
export function kindsFor(c: VocabCard, all: VocabCard[]): PhraseQ['kind'][] {
  const k: PhraseQ['kind'][] = []
  if (meaningOptions(c, all, Math.random)) k.push('meaning')
  if (canBuild(c)) k.push('build')
  if (contextSplit(c)) k.push('context')
  return k
}

/** Lesson-made phrases only: tutor practice lines aren't reviewed. */
export function isReviewable(c: VocabCard, all: VocabCard[]) {
  return c.source !== 'tutor' && kindsFor(c, all).length > 0
}

/**
 * One question for a phrase. New phrases start with recognising the meaning; once a
 * phrase has some strength, it's used: put together in a sentence or from the Japanese.
 */
export function questionFor(c: VocabCard, all: VocabCard[], rnd: () => number = Math.random): PhraseQ | null {
  const kinds = kindsFor(c, all)
  if (!kinds.length) return null
  const fresh = !c.state || c.state === 'new' || (c.stability ?? 0) < 3
  const order: PhraseQ['kind'][] = fresh ? ['meaning', 'build', 'context'] : shuffle(['context', 'build', 'meaning'], rnd)
  const kind = order.find((k) => kinds.includes(k) && (fresh || k !== 'meaning')) ?? kinds[0]
  if (kind === 'meaning') return meaningOptions(c, all, rnd)
  if (kind === 'build') {
    // the end mark sits fixed after the tiles: on a tile it would give away which word
    // goes last, and without it the sentence looks unfinished
    const en = c.phrase_en.trim()
    const end = (en.match(/[.!?]+$/)?.[0] ?? '') || undefined
    const target = words(en.replace(/[.!?。！？]+$/, ''))
    const bank = bankFor(target, rnd)
    return bank ? { kind: 'build', prompt: c.phrase_ja.trim(), target, bank, end } : meaningOptions(c, all, rnd)
  }
  const split = contextSplit(c)!
  const bank = bankFor(split.target, rnd)
  return bank ? { kind: 'context', before: split.before, after: split.after, target: split.target, bank } : meaningOptions(c, all, rnd)
}

/** Today's batch: overdue first (oldest due first), then new phrases, up to `size`. */
export function todaysQueue(cards: VocabCard[], size = 12, now = new Date()) {
  const due = cards.filter((c) => new Date(c.next_review_at) <= now && isReviewable(c, cards))
  const seen = due.filter((c) => c.state && c.state !== 'new').sort((a, b) => +new Date(a.next_review_at) - +new Date(b.next_review_at))
  const fresh = due.filter((c) => !c.state || c.state === 'new').sort((a, b) => +new Date(a.created_at ?? 0) - +new Date(b.created_at ?? 0))
  const all = [...seen, ...fresh]
  return { batch: all.slice(0, size), waiting: Math.max(0, all.length - size) }
}

/** tiles are right when the words match in order (identical words are interchangeable) */
export function tilesRight(target: string[], placed: string[]) {
  return placed.length === target.length && placed.every((w, i) => w === target[i])
}
