import { AI_LENGTHS, AI_MAX_LENGTH, AI_MIN_LENGTH, AI_MINUTE_RATIO } from './ai-tutor/settings'

/**
 * Minute pools and how an AI lesson is paid for (pure: shared by the server and the browser).
 *
 *   plan  – teacher-lesson minutes (Lite 120 / Standard 240 a month; yearly plans get the year's up front)
 *   ai    – AI minutes from the AI plan (AI_PLAN_MINUTES a month; yearly gets 12× up front)
 *   topup – AI minutes bought one-off (valid 3 months)
 *
 * An AI lesson uses AI minutes 1:1 — the plan's first, then top-ups (soonest-expiring first). Whatever is
 * still needed comes from plan minutes at 60% (a 15-minute AI lesson uses 9 plan minutes). Teacher lessons
 * only ever use plan minutes.
 */

export type Pool = 'plan' | 'ai' | 'topup'

/** AI minutes a month on the AI plan (AI tutor lessons use them 1:1): ten 30-minute lessons. */
export const AI_PLAN_MINUTES = 300
/** One top-up: AI minutes, valid this many months (the price is set on the Stripe product: ¥980). */
export const TOPUP_MINUTES = 90
export const TOPUP_VALID_MONTHS = 3

/** What a student can spend right now. `null` = no limit (admins, test accounts). */
export type MinuteSnapshot = {
  planLeft: number
  aiLeft: number
  /** usable top-ups, soonest-expiring first */
  topups: { id: string; left: number; expiresAt: string }[]
}

export type ChargePart = { pool: Pool; minutes: number; topupId?: string }

const planCost = (lessonMinutes: number) => Math.ceil(lessonMinutes * AI_MINUTE_RATIO - 1e-9)

/** Total AI minutes (AI plan + top-ups). */
export const aiMinutesLeft = (s: MinuteSnapshot) => s.aiLeft + s.topups.reduce((a, t) => a + t.left, 0)

/** How an AI lesson of `lessonMinutes` would be paid for, or null if they can't afford it. */
export function splitAiCharge(s: MinuteSnapshot, lessonMinutes: number): ChargePart[] | null {
  const parts: ChargePart[] = []
  let need = lessonMinutes
  const fromAi = Math.min(s.aiLeft, need)
  if (fromAi > 0) parts.push({ pool: 'ai', minutes: fromAi })
  need -= fromAi
  for (const t of s.topups) {
    if (need <= 0) break
    const take = Math.min(t.left, need)
    if (take > 0) parts.push({ pool: 'topup', minutes: take, topupId: t.id })
    need -= take
  }
  if (need > 0) {
    const p = planCost(need)
    if (p > s.planLeft) return null
    parts.push({ pool: 'plan', minutes: p })
  }
  return parts
}

/** The snapshot after a charge (to price several bookings in a row). */
export function afterCharge(s: MinuteSnapshot, parts: ChargePart[]): MinuteSnapshot {
  const next = { planLeft: s.planLeft, aiLeft: s.aiLeft, topups: s.topups.map((t) => ({ ...t })) }
  for (const p of parts) {
    if (p.pool === 'plan') next.planLeft -= p.minutes
    else if (p.pool === 'ai') next.aiLeft -= p.minutes
    else {
      const t = next.topups.find((x) => x.id === p.topupId)
      if (t) t.left -= p.minutes
    }
  }
  return next
}

/** Totals per pool for `count` AI lessons of `lessonMinutes` in a row (null if they can't afford them all). */
export function priceAiLessons(s: MinuteSnapshot, lessonMinutes: number, count: number): Record<Pool, number> | null {
  const total = { plan: 0, ai: 0, topup: 0 }
  let cur = s
  for (let i = 0; i < count; i++) {
    const parts = splitAiCharge(cur, lessonMinutes)
    if (!parts) return null
    for (const p of parts) total[p.pool] += p.minutes
    cur = afterCharge(cur, parts)
  }
  return total
}

/** The longest AI lesson (up to 30) they can afford; 0 if none. null snapshot = no limit. */
export function maxAiLength(s: MinuteSnapshot | null): number {
  if (!s) return AI_MAX_LENGTH
  for (let l = AI_MAX_LENGTH; l >= 1; l--) if (splitAiCharge(s, l)) return l
  return 0
}

/**
 * The AI lesson lengths to offer: 15 and 30 when affordable, plus the longest affordable length when it's at
 * least 5 minutes longer than those (minutes expire, so the rest shouldn't go to waste). Below 5: none.
 */
export function aiLengthsFor(s: MinuteSnapshot | null): number[] {
  const max = maxAiLength(s)
  if (max < AI_MIN_LENGTH) return []
  const opts: number[] = AI_LENGTHS.filter((l) => l <= max)
  if (max - (opts[opts.length - 1] ?? 0) >= 5) opts.push(max)
  return opts
}
