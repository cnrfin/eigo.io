import { getSupabaseAdmin } from './supabase-admin'
import { getUserSubscription, type Subscription } from './subscription'
import { splitAiCharge, type ChargePart, type MinuteSnapshot, type Pool } from './minutes-core'

/**
 * Minute balances and charges (server). The rules live in minutes-core.ts; this reads and writes the ledger.
 *
 * minute_usage rows: action 'booked' (a charge) or 'cancelled_refund' (stored positive, subtracted), with
 * pool 'plan' | 'ai' | 'topup'. Plan and AI rows count in the billing period (period_start); top-up rows
 * count against their top-up (topup_id), whatever the period.
 */

/** Top-ups last 3 months. */
export const TOPUP_VALID_MONTHS = 3
export const TOPUP_MINUTES = 60

type Row = { minutes_used: number; action: string; pool: Pool | null; topup_id: string | null; period_start: string }
const net = (rows: Row[]) => rows.reduce((a, r) => a + (r.action === 'booked' ? r.minutes_used : r.action === 'cancelled_refund' ? -r.minutes_used : 0), 0)

export type Balance = {
  sub: Subscription | null
  /** the subscription can be used (not cancelled) */
  active: boolean
  plan: { total: number; used: number; left: number }
  ai: { total: number; used: number; left: number }
  topups: { id: string; minutes: number; used: number; left: number; expiresAt: string }[]
  snapshot: MinuteSnapshot
}

export async function getBalance(userId: string, now = new Date()): Promise<Balance> {
  const db = getSupabaseAdmin()
  const sub = await getUserSubscription(userId)
  const active = !!sub && sub.status !== 'cancelled'
  const [{ data: periodRows }, { data: topupRows }] = await Promise.all([
    active
      ? db.from('minute_usage').select('minutes_used, action, pool, topup_id, period_start').eq('user_id', userId).eq('period_start', sub!.current_period_start).in('pool', ['plan', 'ai'])
      : Promise.resolve({ data: [] as Row[] }),
    db.from('minute_topups').select('id, minutes, expires_at').eq('user_id', userId).gt('expires_at', now.toISOString()).order('expires_at', { ascending: true }),
  ])
  const rows = (periodRows ?? []) as Row[]
  const planTotal = active ? sub!.minutes_per_month : 0
  const aiTotal = active ? (sub!.ai_minutes_per_month ?? 0) : 0
  const planUsed = Math.max(0, net(rows.filter((r) => (r.pool ?? 'plan') === 'plan')))
  const aiUsed = Math.max(0, net(rows.filter((r) => r.pool === 'ai')))

  const tops = (topupRows ?? []) as { id: string; minutes: number; expires_at: string }[]
  let used: Row[] = []
  if (tops.length) {
    const { data } = await db.from('minute_usage').select('minutes_used, action, pool, topup_id, period_start').in('topup_id', tops.map((t) => t.id))
    used = (data ?? []) as Row[]
  }
  const topups = tops.map((t) => {
    const u = Math.max(0, net(used.filter((r) => r.topup_id === t.id)))
    return { id: t.id, minutes: t.minutes, used: u, left: Math.max(0, t.minutes - u), expiresAt: t.expires_at }
  })

  const plan = { total: planTotal, used: planUsed, left: Math.max(0, planTotal - planUsed) }
  const ai = { total: aiTotal, used: aiUsed, left: Math.max(0, aiTotal - aiUsed) }
  return {
    sub,
    active,
    plan,
    ai,
    topups,
    snapshot: { planLeft: plan.left, aiLeft: ai.left, topups: topups.filter((t) => t.left > 0).map((t) => ({ id: t.id, left: t.left, expiresAt: t.expiresAt })) },
  }
}

async function insertParts(userId: string, bookingId: string, parts: ChargePart[], periodStart: string, action: 'booked' | 'cancelled_refund') {
  if (!parts.length) return
  const { error } = await getSupabaseAdmin()
    .from('minute_usage')
    .insert(parts.map((p) => ({ user_id: userId, booking_id: bookingId, minutes_used: p.minutes, period_start: periodStart, action, pool: p.pool, topup_id: p.topupId ?? null })))
  if (error) {
    console.error('Failed to record minute usage:', error)
    throw error
  }
}

/**
 * Charge an AI lesson (call after the booking row exists). Returns how it was paid, or null if the balance
 * no longer covers it. `balance` can be passed in when the caller already has a fresh one.
 */
export async function chargeAiLesson(userId: string, bookingId: string, lessonMinutes: number, balance?: Balance): Promise<ChargePart[] | null> {
  const b = balance ?? (await getBalance(userId))
  const parts = splitAiCharge(b.snapshot, lessonMinutes)
  if (!parts) return null
  await insertParts(userId, bookingId, parts, b.sub?.current_period_start ?? new Date().toISOString(), 'booked')
  return parts
}

/**
 * Refund everything a booking was charged, back to where it came from (same pool, same billing period, same
 * top-up). A refund to an expired top-up is dropped. Returns the minutes refunded.
 */
export async function refundBooking(userId: string, bookingId: string, now = new Date()): Promise<number> {
  const db = getSupabaseAdmin()
  const { data } = await db.from('minute_usage').select('minutes_used, action, pool, topup_id, period_start').eq('booking_id', bookingId)
  const rows = (data ?? []) as Row[]
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = `${r.pool ?? 'plan'}|${r.topup_id ?? ''}|${r.period_start}`
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  const topupIds = [...new Set(rows.map((r) => r.topup_id).filter(Boolean))] as string[]
  const live = new Set<string>()
  if (topupIds.length) {
    const { data: t } = await db.from('minute_topups').select('id, expires_at').in('id', topupIds)
    for (const x of t ?? []) if (new Date(x.expires_at as string) > now) live.add(x.id as string)
  }
  let refunded = 0
  for (const [k, g] of groups) {
    const [pool, topupId, periodStart] = k.split('|') as [Pool, string, string]
    const minutes = net(g)
    if (minutes <= 0) continue
    if (pool === 'topup' && !live.has(topupId)) continue
    await insertParts(userId, bookingId, [{ pool, minutes, topupId: topupId || undefined }], periodStart, 'cancelled_refund')
    refunded += minutes
  }
  return refunded
}

/** Add AI minutes as a top-up (Stripe purchase or admin grant). Idempotent on the Checkout session id. */
export async function addTopup(userId: string, minutes: number, opts: { source: 'stripe' | 'admin'; sessionId?: string; note?: string; now?: Date }) {
  const now = opts.now ?? new Date()
  const expires = new Date(now)
  expires.setUTCMonth(expires.getUTCMonth() + TOPUP_VALID_MONTHS)
  const { error } = await getSupabaseAdmin()
    .from('minute_topups')
    .insert({ user_id: userId, minutes, source: opts.source, stripe_checkout_session_id: opts.sessionId ?? null, note: opts.note ?? null, purchased_at: now.toISOString(), expires_at: expires.toISOString() })
  if (error && error.code !== '23505') throw error // 23505: this Checkout session was already recorded
}
