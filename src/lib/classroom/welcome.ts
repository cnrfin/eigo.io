import { hasJapanese, inOrder, saidIt, share, words } from '@/lib/ai-tutor/voice-match'

/**
 * The free 5-minute welcome talk (ai-panel-implementation-plan.md, phase 3d). The AI TUTOR LEADS it: the whole
 * plan is in its instructions (lib/ai-tutor/brief.ts welcomeCall), and the classroom follows what it says, the way
 * slides follow "let's move on to the next slide". Notes into the live session are kept to the few the tutor can't
 * do without (each one, arriving mid-sentence, made it start over), and they go only between turns.
 *
 *   about     hello and three easy questions (where they're from and what they do, interests, why English); a
 *             helper quietly picks out the facts for the end screen (no card during the call)
 *   suggest   the role-play is chosen for them in the background (the helper, from their job first) and the tutor
 *             gets one note with it; it suggests it and teaches the phrase, always "Let's do a role-play". The card
 *             appears when it says the phrase; the scene opens when the student says it and stops (or a tap)
 *   roleplay  the scene at 初級 (the tutor sets it up first); near 3:15 it's asked to wrap up, at 3:45 it ends
 *   done      mission complete: feedback, "any questions?"
 *   command   one voice command, tried out: "Open the course" shows a preview of a course's first slide
 *   qa        an open Q&A about eigo until the goodbye; at 0:00 the welcome end screen (About me saved there)
 */

export type WelcomeStep = 'about' | 'suggest' | 'roleplay' | 'done' | 'command' | 'qa'

/** seconds (on the call clock unless it says otherwise) */
export const WELCOME_AT = {
  /** the role-play note goes once the three facts are in, but not before this… */
  pickMin: 50,
  /** …and by now with whatever there is (the fallback scene if nothing) */
  pickBy: 100,
  /** the card shows by itself this long after the note, if the tutor hasn't taught the phrase yet */
  cardAfter: 30,
  /** the student said the phrase: it opens once they've been quiet this long */
  phraseQuiet: 1,
  /** the suggestion opens by itself after this long */
  autoOpen: 30,
  /** the AI tutor is asked to wrap the scene up… */
  wrapScene: 195,
  /** …and the classroom ends it */
  endScene: 225,
  /** mission complete → the voice command, if the tutor hasn't moved on itself: after this long, or with this left */
  commandAfter: 45,
  commandLeft: 70,
  /** the voice command → the Q&A: this long after they said it, at the latest after commandMax, or with this left */
  qaAfter: 20,
  commandMax: 50,
  qaLeft: 40,
  /** a move waiting for a gap between turns goes ahead anyway after this long */
  quietMax: 8,
} as const

/** the three things the tutor finds out: where they're from and what they do, their interests, why English */
export type FactKey = 'job' | 'likes' | 'why'
export const FACT_KEYS: FactKey[] = ['job', 'likes', 'why']
/** what the About-you card shows (and what goes in About me, in English, for the AI tutor) */
export const FACT_LABELS: Record<FactKey, { ja: string; en: string }> = {
  job: { ja: '出身・お仕事', en: 'From & work' },
  likes: { ja: '好きなこと', en: 'Interests' },
  why: { ja: '英語を学ぶ理由', en: 'Why English' },
}
export type Facts = Partial<Record<FactKey, string>>
export const factCount = (f: Facts) => FACT_KEYS.filter((k) => !!f[k]).length
/** the facts and which of them are too vague to be useful yet ("to meet new people": where? why?) */
export type FactsRead = { facts: Facts; thin: FactKey[] }
/** what the tutor should still ask about: missing facts and vague ones */
export function stillToAsk(r: FactsRead): { missing: FactKey[]; thin: FactKey[] } {
  return { missing: FACT_KEYS.filter((k) => !r.facts[k]), thin: r.thin.filter((k) => !!r.facts[k]) }
}
/** enough for the About-you card: all three, none vague */
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
// (a rough stem, so "meeting" and "meet" are the same word)
const stem = (w: string) => (w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, '') : w)
const factWords = (v: string) => fold(v).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map(stem)
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
/** the "Label: …." lines this saves (and older ones), so saving again replaces them rather than repeating them */
const SAVED_LINE = /\b(?:From & work|Work|Interests|Likes|Why English|Goal): [^.]*\./g
export function mergeAboutMe(existing: string, facts: Facts, max = 600): string {
  const add = aboutMeText(facts)
  // what they wrote themselves stays; our earlier lines for the same things are replaced
  const old = add ? existing.replace(SAVED_LINE, '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim() : existing.trim()
  if (!add || old.includes(add)) return old
  if (!old) return add.slice(0, max)
  const room = max - old.length - 1
  if (room < 12) return old
  return `${old}\n${add.length > room ? add.slice(0, room - 1).trimEnd() + '…' : add}`
}


/* ---------------- what the tutor says: the classroom follows it ---------------- */

/** the one phrase that opens the role-play chosen for them (always this, whatever the scene) */
export const ROLEPLAY_PHRASE = "Let's do a role-play"
/** the tutor teaching it ("…Please say: Let's do a role-play.") or the student saying it: "role play", "roleplay" too */
export const SAYS_ROLEPLAY = /\b(?:let'?s|let us|can we|could we|i'?d like to|i want to|i wanna)\s+(?:do|try|start|have)\s+(?:a|the|our|that|this)\s+(?:[a-z-]+\s+){0,4}?role[\s-]?play\b|ロールプレイ(?:を)?(?:やり|し|はじめ|始め)/i

/** the phrase the tutor asks them to say to open the role-play (…say: "Let's do the massage salon role-play.") */
export function suggestedPhrase(sentence: string): string | null {
  // in quotes, or straight after "say": the transcript doesn't always have the quotes
  const m = /["“「]([^"”」]*\brole[- ]?play\b[^"”」]*)["”」]/i.exec(sentence) ?? /\bsay(?:ing)?\s*:?\s*(let'?s do the [^.!?"”]{1,40}?\brole[- ]?play)\b/i.exec(sentence)
  if (!m) return null
  const p = m[1].replace(/[.!?。！]+$/, '').trim()
  return /\blet'?s\b|\bcan we\b|\bi'?d like\b/i.test(p) && words(p).length <= 10 ? p : null
}

/** the tutor moves on to the voice command ("Now let's try a voice command. Say: Open the course.") */
export const TUTOR_COMMAND = /\bvoice command|\bby voice\b|\bjust (?:say|ask)\b|\b(?:try|please) say(?:ing)?\s*:?\s*["“]?open the course/i
/** the tutor opens the Q&A ("Do you have any questions about eigo?") */
export const TUTOR_QA = /\bany (?:other )?questions? about (?:eigo|the (?:platform|lessons?|classroom|app|site)|how)\b|\bquestions? about eigo\b/i

/** "Open the course" (or near it), said by the student; questions don't count */
export function commandSaid(said: string): boolean {
  const s = said.trim()
  if (!s || /\?\s*$/.test(s) || /\b(?:what|how|why)\b/i.test(s)) return false
  return saidIt(s, 'open the course') || /\b(?:open|start|show)\b[^.!?]{0,15}\bcourses?\b|コースを開/i.test(s)
}

/**
 * The role-play phrase: which of its words they've said, and whether they've said all of it (one word may be
 * missed in a longer phrase; "role play" and "roleplay" count as "role-play"). Only the whole phrase opens it.
 */
export function heardPhrase(said: string, phrase: string): { lit: boolean[]; whole: boolean } {
  const norm = (x: string) => fold(x).replace(/\brole[\s-]?play\b/g, 'roleplay')
  const lit = inOrder(norm(said), norm(phrase))
  const n = lit.length
  const hit = lit.filter(Boolean).length
  return { lit, whole: n > 0 && hit >= n - (n >= 6 ? 1 : 0) && /\broleplay\b/.test(norm(said)) }
}

/* ---------------- the director: only the time limits and fallbacks ---------------- */

export type WelcomeSnap = {
  step: WelcomeStep
  /** call clock: seconds since it started, seconds left */
  elapsed: number
  left: number
  /** seconds in this step */
  stepAge: number
  /** the role-play chosen for them is ready; the note with it has gone (seconds ago, null = not yet) */
  pickReady: boolean
  pickAge: number | null
  /** the three facts are in */
  factsIn: boolean
  wrapSent: boolean
  /** the voice command: how long ago they said it (null = not yet) */
  commandAge: number | null
}
export type WelcomeMove = { to: WelcomeStep; prompt?: boolean } | { do: 'sendPick' | 'open' | 'wrap' | 'endScene' } | null

/** moves that tell the tutor something or change the screen wait for a gap between turns (not ending a scene) */
export const waitsForGap = (m: NonNullable<WelcomeMove>) => !('do' in m && m.do === 'endScene')

/** Where the call goes next when the tutor hasn't moved it on itself (null = stay). Called every second. */
export function welcomeNext(s: WelcomeSnap): WelcomeMove {
  const A = WELCOME_AT
  switch (s.step) {
    case 'about':
      if (s.pickAge === null) return (s.pickReady && s.factsIn && s.elapsed >= A.pickMin) || s.elapsed >= A.pickBy ? { do: 'sendPick' } : null
      return s.pickAge >= A.cardAfter ? { to: 'suggest' } : null
    case 'suggest':
      return s.stepAge >= A.autoOpen ? { do: 'open' } : null
    case 'roleplay':
      if (s.elapsed >= A.endScene) return { do: 'endScene' }
      if (s.elapsed >= A.wrapScene && !s.wrapSent) return { do: 'wrap' }
      return null
    case 'done':
      return s.stepAge >= A.commandAfter || s.left <= A.commandLeft ? { to: 'command', prompt: true } : null
    case 'command':
      return (s.commandAge !== null && s.commandAge >= A.qaAfter) || s.stepAge >= A.commandMax || s.left <= A.qaLeft ? { to: 'qa' } : null
    case 'qa':
      return null
  }
}

/** Joining (or rejoining after a refresh) part-way through: where to start. */
export const welcomeStartStep = (elapsed: number): WelcomeStep => (elapsed < 150 ? 'about' : elapsed < 240 ? 'command' : 'qa')
