import { hasJapanese, inOrder, share, words } from '@/lib/ai-tutor/voice-match'

/**
 * The free 5-minute welcome call (ai-panel-implementation-plan.md, phase 3d; design: mockups/welcome-call.html).
 * It runs on its own rails: the classroom moves it from step to step on the call clock and tells the AI tutor
 * each step in a note. Pure functions, shared by the browser, the server and the tests.
 *
 *   about     getting to know them (about 1:15 at least); the helper picks out the facts (each backed by their own
 *             words), and tells the tutor what's still missing or too vague, so it asks follow-ups
 *   card      the About-you card, as a conversation: "yes" or これで保存 saves it; anything else corrects a line
 *             and the card stays up while they talk; it always ends saved, or clearly not saved
 * Steps change, and notes go to the tutor, only between turns (never while either of them is talking).
 *   suggest   one role-play chosen for them, opened by saying the phrase on the card (tap or 25 s: opens anyway)
 *   roleplay  the scene at 初級 (ended by the AI tutor, or by the classroom when time runs short)
 *   done      mission complete, welcome version: feedback, then "any questions?"; it moves on once they've answered
 *   tips      what they can say in lessons, tried out: "Open the course" shows a preview of a course's first slide,
 *             "Let's do a role-play" the role-play list (a preview: nothing can be started in this call), and
 *             "Can we just chat?" moves on to free talk
 *   free      chat until the goodbye; at 0:00 the welcome end screen replaces the classroom
 */

export type WelcomeStep = 'about' | 'card' | 'suggest' | 'roleplay' | 'done' | 'tips' | 'free'

/** seconds (on the call clock unless it says otherwise) */
export const WELCOME_AT = {
  /** the About-you card not before this (getting to know them takes a while)… */
  cardMin: 75,
  /** …and by now, with whatever facts there are (none: straight to the role-play) */
  cardBy: 110,
  /** the card waits this long after the last thing said or changed on it (then it goes, not saved) */
  cardIdle: 20,
  /** and never stays longer than this */
  cardMax: 75,
  /** after saving (or not), the card shows how it ended this long */
  savedHold: 2.2,
  /** a step waiting for a gap between turns goes ahead anyway after this long */
  quietMax: 8,
  /** the suggestion opens by itself after this long */
  autoOpen: 25,
  /** the AI tutor is asked to end the scene… */
  wrapScene: 215,
  /** …and the classroom ends it */
  endScene: 240,
  /** steps before the role-play that are this late skip to the tips */
  late: 205,
  /** mission complete → tips: once they've answered "any questions?" and the tutor has replied (at least tipsMin,
   *  then tipsQuiet of quiet), or after tipsMax */
  tipsMin: 10,
  tipsQuiet: 2.5,
  tipsMax: 60,
  /** with this little time left, the tips come at once */
  tipsLeft: 45,
  /** the tips step ends when they say "Can we just chat?", or with this little time left */
  tipsEndLeft: 35,
  goodbyeLeft: 22,
} as const

export type FactKey = 'job' | 'why' | 'goal' | 'likes'
export const FACT_KEYS: FactKey[] = ['job', 'why', 'goal', 'likes']
/** what the About-you card shows (and what goes in About me, in English, for the AI tutor) */
export const FACT_LABELS: Record<FactKey, { ja: string; en: string }> = {
  job: { ja: 'お仕事', en: 'Work' },
  why: { ja: '英語を学ぶ理由', en: 'Why English' },
  goal: { ja: '目標', en: 'Goal' },
  likes: { ja: '好きなこと', en: 'Likes' },
}
export type Facts = Partial<Record<FactKey, string>>
export const factCount = (f: Facts) => FACT_KEYS.filter((k) => !!f[k]).length
/** the facts and which of them are too vague to be useful yet ("to meet new people": where? why?) */
export type FactsRead = { facts: Facts; thin: FactKey[] }
/** what the tutor should still ask about: missing facts and vague ones */
export function stillToAsk(r: FactsRead): { missing: FactKey[]; thin: FactKey[] } {
  return { missing: FACT_KEYS.filter((k) => !r.facts[k]), thin: r.thin.filter((k) => !!r.facts[k]) }
}
/** enough for the About-you card: all four, none vague */
export const factsReady = (r: FactsRead) => factCount(r.facts) === FACT_KEYS.length && !r.thin.some((k) => r.facts[k])

/** One role-play chosen for them: the phrase to open it is "Let's do the <name> role-play". */
export type WelcomePick = { sceneId: string; name: string; reasonJa: string; reasonEn: string }
export const FALLBACK_PICK: WelcomePick = { sceneId: 'cafe-abroad', name: 'café', reasonJa: '', reasonEn: '' }

export const voicePhrase = (name: string) => (name ? `Let's do the ${name} role-play` : "Let's do the role-play")

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const squash = (s: string) => s.replace(/[\s、。！？!?.,・「」]/g, '')

/** the helper's quote really is something the student said */
export function quoteIsTheirs(quote: string, studentText: string): boolean {
  const q = quote.trim()
  if (!q) return false
  if (hasJapanese(q)) return q.length >= 2 && squash(studentText).includes(squash(q))
  const n = words(q).length
  return n > 0 && share(fold(studentText), fold(q)) >= (n <= 2 ? 1 : 0.8)
}

const cleanValue = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, max) : '')

/**
 * The helper's answer, checked: each fact only with the student's own words behind it, in short English;
 * the role-play one from the list, its name words from its English title.
 */
export function validateWelcome(raw: unknown, studentText: string, scenes: { id: string; titleEn: string }[]): FactsRead & { pick: WelcomePick | null } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as {
    facts?: Record<string, { value?: unknown; quote?: unknown; vague?: unknown } | undefined>
    scene?: Record<string, unknown>
  }
  const facts: Facts = {}
  const thin: FactKey[] = []
  for (const k of FACT_KEYS) {
    const f = r.facts?.[k]
    const value = cleanValue(f?.value, 70)
    const quote = cleanValue(f?.quote, 200)
    if (value.length < 2 || hasJapanese(value) || words(value).length > 10) continue
    if (!quoteIsTheirs(quote, studentText)) continue
    // the same thing twice ("to meet new people" as the reason and the goal) only counts once
    if (FACT_KEYS.some((o) => facts[o] && sameFact(facts[o]!, value))) continue
    facts[k] = value
    if (f?.vague === true) thin.push(k)
  }
  let pick: WelcomePick | null = null
  const s = r.scene
  const sc = s && typeof s.id === 'string' ? scenes.find((x) => x.id === s.id) : undefined
  if (sc) {
    const title = new Set(fold(sc.titleEn).split(/[^a-z]+/).filter(Boolean))
    const nameWords = fold(cleanValue(s!.name, 30)).split(/\s+/).filter(Boolean)
    const nameOk = nameWords.length >= 1 && nameWords.length <= 3 && nameWords.every((w) => title.has(w.replace(/[^a-z]/g, '')))
    const reasonJa = cleanValue(s!.reason_ja, 44)
    const reasonEn = cleanValue(s!.reason_en, 100)
    pick = {
      sceneId: sc.id,
      // keep the title's spelling ("café")
      name: nameOk ? cleanValue(s!.name, 30).toLowerCase() : '',
      reasonJa: hasJapanese(reasonJa) ? reasonJa : '',
      reasonEn: reasonEn && !hasJapanese(reasonEn) ? reasonEn : '',
    }
  }
  return { facts, thin, pick }
}

const STOP = new Set(['to', 'a', 'an', 'the', 'and', 'or', 'with', 'in', 'at', 'for', 'of', 'my', 'i', 'more', 'some'])
const factWords = (v: string) => fold(v).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w))
/** two facts that say the same thing */
export function sameFact(a: string, b: string): boolean {
  const x = factWords(a)
  const y = new Set(factWords(b))
  if (!x.length || !y.size) return false
  const shared = x.filter((w) => y.has(w)).length
  return shared / Math.min(x.length, y.size) >= 0.75
}

/** About me (ai_tutor_profiles.settings.aboutMe, max 600): the confirmed facts added to what's there, never replacing it */
export function aboutMeText(facts: Facts): string {
  return FACT_KEYS.filter((k) => facts[k])
    .map((k) => `${FACT_LABELS[k].en}: ${facts[k]!.replace(/[.\s]+$/, '')}.`)
    .join(' ')
}
export function mergeAboutMe(existing: string, facts: Facts, max = 600): string {
  const add = aboutMeText(facts)
  const old = existing.trim()
  if (!add || old.includes(add)) return old
  if (!old) return add.slice(0, max)
  const room = max - old.length - 1
  if (room < 12) return old
  return `${old}\n${add.length > room ? add.slice(0, room - 1).trimEnd() + '…' : add}`
}

/* ---------------- what the student says to the cards ---------------- */

const CORRECTION = /\b(?:actually|not (?:a |an |really )?|no,|nope|wrong|instead|but i|i don'?t|i'?m not|i work as|i'?m a|i work (?:at|in|for))\b|違|ちが|じゃなく|ではなく|ではありません|じゃないです/i
const LEAD = '^[\\s、。.!,…-]*'
const YES = new RegExp(`${LEAD}(?:yes|yeah|yep|yup|ok(?:ay)?|sure|right|correct|perfect|exactly|great|good|fine|that'?s (?:right|correct|fine|good|perfect|it)|(?:it )?looks? (?:good|right|fine|great|perfect)|sounds (?:good|right)|save it|all good|はい|ええ|うん|そうです|合ってます|あってます|合っています|大丈夫|オッケー|お願いします|保存)(?![a-z])`, 'i')

/**
 * The About-you card is a conversation: "yes" saves it; a correction, or anything else they tell the tutor about
 * themselves, means the helper reads it again (and the line changes). Fillers ("um", "mm") are nothing.
 */
export function cardReply(said: string): 'fix' | 'yes' | null {
  const s = said.trim()
  if (!s) return null
  if (CORRECTION.test(s)) return 'fix'
  if (YES.test(s)) return 'yes'
  const n = words(s).filter((w) => !/^(?:u+h*|u+m+|m+|h+m+|e+r+|a+h+|oh|ok|well|so|like)$/.test(w)).length
  return n >= 3 || (hasJapanese(s) && s.length >= 4) ? 'fix' : null
}

const START = /\b(?:let'?s (?:do|try|start|play|go)|(?:can|could|shall) we (?:do|try|start)|i'?d like to (?:do|try)|i want to (?:do|try)|start (?:it|the role[- ]?play))\b|はじめ|始め|やりたい|やります|やってみ/i
const GO_YES = new RegExp(`${LEAD}(?:ok(?:ay)?|yes|yeah|sure|ready|alright|all right|great|はい|ええ|うん|お願いします|オッケー)(?![a-z])`, 'i')

/** the suggestion card: which of the phrase's words they've said, and whether that opens the role-play */
export function heardPhrase(said: string, phrase: string): { lit: boolean[]; go: boolean } {
  const lit = inOrder(fold(said), fold(phrase))
  const s = said.trim()
  const question = /\?\s*$|\b(?:what|how|which)\b/i.test(s)
  const go = !!s && !question && (lit.filter(Boolean).length / Math.max(1, lit.length) >= 0.6 || START.test(s) || GO_YES.test(s) || /role[- ]?play|ロールプレイ/i.test(s))
  return { lit, go }
}

/** the AI tutor starting the suggested scene ("Great, let's start the role-play."), statements only */
export const TUTOR_STARTS = /\b(?:let'?s|let us|we'?ll|I'?ll)\s+(?:start|begin|do|get started with|jump into)\b[^.?!]*\b(?:role[- ]?play|scene)\b|\blet'?s (?:get started|begin)\b/i

/* ---------------- the director ---------------- */

export type WelcomeSnap = {
  step: WelcomeStep
  /** call clock: seconds since it started, seconds left */
  elapsed: number
  left: number
  /** seconds in this step */
  stepAge: number
  facts: Facts
  /** facts too vague to be useful yet */
  thin: FactKey[]
  /** the About-you card was answered (saved or closed), and how long ago */
  cardDone: boolean
  cardDoneAge: number
  /** seconds since the last thing said or changed while the card is up */
  cardIdle: number
  /** the "bring the scene to an end" note was sent */
  wrapSent: boolean
  /** mission complete: the student has answered the tutor's "any questions?" and the tutor has replied */
  answered: boolean
  /** how long the tutor has been quiet (s) */
  tutorQuiet: number
  /** the tips: they've said "Can we just chat?" (free talk next) */
  chatChosen?: boolean
}
export type WelcomeMove = { to: WelcomeStep } | { do: 'wrap' | 'endScene' | 'open' | 'skipCard' } | null

/** moves that tell the tutor something or change the screen wait for a gap between turns (not ending a scene) */
export const waitsForGap = (m: NonNullable<WelcomeMove>) => !('do' in m && m.do === 'endScene')

/** Where the call goes next (null = stay). The classroom calls it every second. */
export function welcomeNext(s: WelcomeSnap): WelcomeMove {
  const A = WELCOME_AT
  const n = factCount(s.facts)
  switch (s.step) {
    case 'about':
      if (s.elapsed >= A.late) return { to: 'tips' }
      if (s.elapsed >= A.cardMin && factsReady({ facts: s.facts, thin: s.thin })) return { to: 'card' }
      if (s.elapsed >= A.cardBy) return { to: n ? 'card' : 'suggest' }
      return null
    case 'card':
      if (s.elapsed >= A.late) return { to: 'tips' }
      if (s.cardDone) return s.cardDoneAge >= A.savedHold ? { to: 'suggest' } : null
      // no answer for a while (or far too long): it ends, clearly not saved
      if (s.cardIdle >= A.cardIdle || s.stepAge >= A.cardMax) return { do: 'skipCard' }
      return null
    case 'suggest':
      if (s.elapsed >= A.late) return { to: 'tips' }
      return s.stepAge >= A.autoOpen ? { do: 'open' } : null
    case 'roleplay':
      if (s.elapsed >= A.endScene) return { do: 'endScene' }
      if (s.elapsed >= A.wrapScene && !s.wrapSent) return { do: 'wrap' }
      return null
    case 'done':
      if (s.left <= A.tipsLeft || s.stepAge >= A.tipsMax || (s.stepAge >= A.tipsMin && s.answered && s.tutorQuiet >= A.tipsQuiet)) return { to: 'tips' }
      return null
    case 'tips':
      return s.chatChosen || s.left <= A.tipsEndLeft ? { to: 'free' } : null
    case 'free':
      return null
  }
}

/** Joining (or rejoining after a refresh) part-way through: where to start. */
export const welcomeStartStep = (elapsed: number): WelcomeStep => (elapsed < 80 ? 'about' : elapsed < 180 ? 'suggest' : 'free')

/* ---------------- the tips, tried out ---------------- */

export type Tip = 'course' | 'rp' | 'chat'
/** the three things to say, in the order the tutor invites them */
export const TIP_ORDER: Tip[] = ['course', 'rp', 'chat']
export const TIP_PHRASES: Record<Tip, string> = { course: 'Open the course', rp: "Let's do a role-play", chat: 'Can we just chat?' }

/** which of the three they just said (questions about them, "what's a course?", don't count) */
export function tipSaid(said: string): Tip | null {
  const s = said.trim()
  if (!s || /\?\s*$/.test(s) && !/\b(?:can|could) we (?:just )?(?:chat|talk)\b/i.test(s)) return null
  if (/\b(?:what|how|why)\b/i.test(s)) return null
  if (/\bjust (?:chat|talk)\b|\bfree ?talk\b|\bchat (?:instead|freely)\b|フリートーク|雑談|話(?:そう|したい)/i.test(s)) return 'chat'
  if (/\brole[- ]?plays?\b|ロールプレイ/i.test(s)) return 'rp'
  if (/\b(?:open|start|do|try|see|show)\b[^.!?]{0,20}\b(?:courses?|lessons?)\b|\bcourses?\b|コース/i.test(s)) return 'course'
  return null
}
/** the next one to invite them to try (null: all done) */
export const nextTip = (tried: Tip[]): Tip | null => TIP_ORDER.find((x) => !tried.includes(x)) ?? null
