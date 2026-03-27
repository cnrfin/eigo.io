import { getSupabaseAdmin } from './supabase-admin'
import type { PriceTier } from './stripe'

// ---------- Trial window ----------

const TRIAL_WINDOW_HOURS = 48

/**
 * Determine which price tier a user qualifies for based on trial completion time.
 * Returns 'trial' if within 48h of completing their trial lesson, 'full' otherwise.
 */
export function getPriceTier(trialCompletedAt: string | null): PriceTier {
  if (!trialCompletedAt) return 'full'
  const hoursSince =
    (Date.now() - new Date(trialCompletedAt).getTime()) / (1000 * 60 * 60)
  return hoursSince <= TRIAL_WINDOW_HOURS ? 'trial' : 'full'
}

/**
 * Returns the number of hours remaining in the trial discount window, or 0 if expired.
 */
export function trialHoursRemaining(trialCompletedAt: string | null): number {
  if (!trialCompletedAt) return 0
  const hoursSince =
    (Date.now() - new Date(trialCompletedAt).getTime()) / (1000 * 60 * 60)
  return Math.max(0, TRIAL_WINDOW_HOURS - hoursSince)
}

// ---------- Subscription queries ----------

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  plan: 'light' | 'standard'
  billing_interval: 'monthly' | 'yearly'
  price_tier: PriceTier
  status: string
  minutes_per_month: number
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

/**
 * Get a user's active subscription (or null if none).
 */
export async function getUserSubscription(
  userId: string,
): Promise<Subscription | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as Subscription
}

// ---------- Minute balance ----------

export interface MinuteBalance {
  minutesPerMonth: number
  minutesUsed: number
  minutesRemaining: number
  periodStart: string
  periodEnd: string
}

/**
 * Calculate a user's remaining minutes for their current billing period.
 */
export async function getMinuteBalance(
  userId: string,
): Promise<MinuteBalance | null> {
  const sub = await getUserSubscription(userId)
  if (!sub || sub.status === 'cancelled') return null

  const supabase = getSupabaseAdmin()

  // Sum all minute_usage for the current period
  const { data: usageRows, error } = await supabase
    .from('minute_usage')
    .select('minutes_used, action')
    .eq('user_id', userId)
    .eq('period_start', sub.current_period_start)

  if (error) {
    console.error('Failed to fetch minute usage:', error)
    return null
  }

  let minutesUsed = 0
  for (const row of usageRows || []) {
    if (row.action === 'booked') {
      minutesUsed += row.minutes_used
    } else if (row.action === 'cancelled_refund') {
      minutesUsed -= row.minutes_used // refunds are stored as positive, so subtract
    }
  }

  return {
    minutesPerMonth: sub.minutes_per_month,
    minutesUsed: Math.max(0, minutesUsed),
    minutesRemaining: Math.max(0, sub.minutes_per_month - minutesUsed),
    periodStart: sub.current_period_start,
    periodEnd: sub.current_period_end,
  }
}

/**
 * Check if a user has enough minutes to book a lesson of the given duration.
 */
export async function hasEnoughMinutes(
  userId: string,
  durationMinutes: number,
): Promise<{ allowed: boolean; remaining: number; needed: number }> {
  const balance = await getMinuteBalance(userId)
  if (!balance) {
    return { allowed: false, remaining: 0, needed: durationMinutes }
  }
  return {
    allowed: balance.minutesRemaining >= durationMinutes,
    remaining: balance.minutesRemaining,
    needed: durationMinutes,
  }
}

/**
 * Record minutes used for a booking.
 */
export async function recordMinuteUsage(
  userId: string,
  bookingId: string,
  minutesUsed: number,
  periodStart: string,
  action: 'booked' | 'cancelled_refund' | 'no_show' = 'booked',
) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('minute_usage').insert({
    user_id: userId,
    booking_id: bookingId,
    minutes_used: minutesUsed,
    period_start: periodStart,
    action,
  })
  if (error) {
    console.error('Failed to record minute usage:', error)
    throw error
  }
}
