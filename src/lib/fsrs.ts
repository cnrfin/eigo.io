/**
 * Phrase scheduling with FSRS (via ts-fsrs), replacing the simplified SM-2 in
 * lib/srs. Same scheduler and settings as the app (eigo-ios lib/phraseSrs), so a
 * phrase reviewed on either one is scheduled the same way.
 *
 * Cards keep their state in the FSRS columns of `vocabulary_cards` (state,
 * stability, difficulty, scheduled_days, reps, lapses, last_reviewed,
 * next_review_at). The old SM-2 columns (interval_days, comfort_level,
 * review_count) are kept in step for anything that still reads them.
 *
 * The web review is self-rated (Again / Hard / Good / Easy), unlike the app,
 * which grades from the answer (Good or Again). Sessions are daily, so FSRS's
 * same-day learning steps are off: Again brings a phrase back tomorrow.
 */
import { type Card, type Grade, Rating, State, createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs'
import { formatNextReview, type ReviewRating } from '@/lib/srs'

export type FsrsFields = {
  state: 'new' | 'learning' | 'review' | 'relearning' | null
  stability: number | null
  difficulty: number | null
  scheduled_days: number | null
  reps: number | null
  lapses: number | null
  last_reviewed: string | null
  next_review_at: string
  review_count: number | null
}

/** the columns to select for scheduling */
export const FSRS_COLUMNS = 'state, stability, difficulty, scheduled_days, reps, lapses, last_reviewed, next_review_at, review_count'

const scheduler = fsrs(generatorParameters({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: false,
}))

// the same without fuzz, for the button labels, so they don't change between renders
const previewScheduler = fsrs(generatorParameters({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: false,
  enable_short_term: false,
}))

const TO_STATE: Record<string, State> = { new: State.New, learning: State.Learning, review: State.Review, relearning: State.Relearning }
const FROM_STATE: Record<number, NonNullable<FsrsFields['state']>> = { [State.New]: 'new', [State.Learning]: 'learning', [State.Review]: 'review', [State.Relearning]: 'relearning' }
const GRADE: Record<ReviewRating, Grade> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy }

/** stability (days) at which a phrase counts as mastered, matching comfort_level */
export const MASTERED_DAYS = 30

/** 0–1 progress towards mastered, for the ring on each phrase. New phrases are 0. */
export function memoryStrength(f: Partial<FsrsFields>): number {
  if (!f.stability || !f.state || f.state === 'new') return 0
  return Math.max(0.04, Math.min(1, f.stability / MASTERED_DAYS))
}

export function comfortFor(days: number): 'learning' | 'reviewing' | 'mastered' {
  return days < 7 ? 'learning' : days < MASTERED_DAYS ? 'reviewing' : 'mastered'
}

function toCard(f: Partial<FsrsFields>, now: Date): Card {
  const state = f.state ? TO_STATE[f.state] : State.New
  if (state === State.New || !f.stability || !f.difficulty || !f.next_review_at) return createEmptyCard(now)
  return {
    due: new Date(f.next_review_at),
    stability: f.stability,
    difficulty: f.difficulty,
    elapsed_days: 0,
    scheduled_days: f.scheduled_days ?? 0,
    reps: f.reps ?? 0,
    lapses: f.lapses ?? 0,
    learning_steps: 0,
    state,
    last_review: f.last_reviewed ? new Date(f.last_reviewed) : undefined,
  } as Card
}

export type ReviewOutcome = {
  /** the columns to write to vocabulary_cards */
  fields: Omit<FsrsFields, 'review_count'> & {
    review_count: number
    interval_days: number
    comfort_level: 'learning' | 'reviewing' | 'mastered'
  }
  /** the row to add to vocab_review_history (without user_id and card_id) */
  history: {
    grade: number
    previous_state: string
    new_state: string
    previous_stability: number | null
    new_stability: number
    previous_difficulty: number | null
    new_difficulty: number
    retrievability: number | null
  }
}

/** Work out the next schedule for one rating. Pure: nothing is written. */
export function schedule(f: Partial<FsrsFields>, rating: ReviewRating, now = new Date()): ReviewOutcome {
  const card = toCard(f, now)
  const { card: next } = scheduler.next(card, now, GRADE[rating])
  const days = next.scheduled_days
  const seen = card.state !== State.New
  const r = seen ? scheduler.retrievability(card, now) : null
  const state = FROM_STATE[next.state] ?? 'review'
  return {
    fields: {
      state,
      stability: next.stability,
      difficulty: next.difficulty,
      scheduled_days: days,
      reps: next.reps,
      lapses: next.lapses,
      last_reviewed: now.toISOString(),
      next_review_at: next.due.toISOString(),
      review_count: (f.review_count ?? 0) + 1,
      interval_days: days,
      comfort_level: comfortFor(days),
    },
    history: {
      grade: GRADE[rating],
      previous_state: f.state ?? 'new',
      new_state: state,
      previous_stability: seen ? f.stability ?? null : null,
      new_stability: next.stability,
      previous_difficulty: seen ? f.difficulty ?? null : null,
      new_difficulty: next.difficulty,
      retrievability: typeof r === 'number' ? r : null,
    },
  }
}

/** The four rating buttons, each with when the phrase would come back. */
export function previewIntervals(f: Partial<FsrsFields>, now = new Date()) {
  return ([
    { rating: 1, label_en: 'Again', label_ja: 'もう一度' },
    { rating: 2, label_en: 'Hard', label_ja: '難しい' },
    { rating: 3, label_en: 'Good', label_ja: '良い' },
    { rating: 4, label_en: 'Easy', label_ja: '簡単' },
  ] as const).map((r) => {
    const due = previewScheduler.next(toCard(f, now), now, GRADE[r.rating]).card.due.toISOString()
    return { ...r, preview_en: formatNextReview(due, 'en'), preview_ja: formatNextReview(due, 'ja') }
  })
}
