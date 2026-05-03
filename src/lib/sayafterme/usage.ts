/**
 * Thin wrappers around the `sayafterme_usage` RPCs defined in
 * `supabase/add-sayafterme-usage.sql`.
 *
 * The RPCs handle all the atomicity. Callers just need:
 *   - `tryIncrement(rcUserId)` — call BEFORE doing the work. Returns
 *     the new count on success, or `null` when the cap was hit.
 *   - `refund(rcUserId)` — call AFTER any post-increment failure so
 *     the user isn't charged for work we couldn't deliver.
 *
 * Always pair them: every successful tryIncrement should reach
 * either a successful response OR a refund. Don't return early
 * between increment and refund without one of those happening.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Pro tier monthly cap. Must match the audio-timer client's
 * `TIER_LIMITS.pro.aiGenerationsPerMonth` in lib/entitlements.ts.
 *
 * If we ever offer top-up packs or higher tiers, swap this for a
 * per-user lookup. For now, every Pro user gets the same cap.
 */
export const PRO_MONTHLY_LIMIT = 100

/**
 * Atomically increments the current-month counter for `rcUserId`,
 * subject to PRO_MONTHLY_LIMIT.
 *
 * @returns The new count on success, or `null` if the cap is hit
 *          (i.e. the request should be rejected with 429).
 */
export async function tryIncrement(rcUserId: string): Promise<number | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('sayafterme_try_increment', {
    p_rc_user_id: rcUserId,
    p_limit: PRO_MONTHLY_LIMIT,
  })

  if (error) {
    // Surface DB errors so the route returns 500 instead of pretending
    // the user is over-cap when actually nothing got incremented.
    console.error('[sayafterme/usage] tryIncrement failed:', error)
    throw new Error('usage_increment_failed')
  }

  // The RPC returns NULL (→ `data === null`) when the WHERE clause on
  // ON CONFLICT prevented the update. That's our "over the cap" signal.
  return data ?? null
}

/**
 * Decrements the current-month counter by 1, never below 0.
 * No-op if the user has no row for this month — see the RPC for why
 * (it shouldn't happen, but is guarded against).
 */
export async function refund(rcUserId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.rpc('sayafterme_refund', {
    p_rc_user_id: rcUserId,
  })

  if (error) {
    // Refund failures don't fail the user-facing request — at this
    // point we're already on an error path. Log loudly and move on:
    // the alternative is double-failing the user.
    console.error('[sayafterme/usage] refund failed:', error)
  }
}

/**
 * Read-only: returns the user's current-month count without
 * modifying it. Used by GET /api/sayafterme/usage so the app can
 * render a "X / 100 this month" pill.
 *
 * Returns 0 when no row exists yet (user hasn't generated this
 * month) — that's semantically equivalent and saves the client
 * from having to handle a 404.
 */
export async function readCurrentCount(rcUserId: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const period = new Date().toISOString().slice(0, 7) // 'YYYY-MM' UTC

  const { data, error } = await supabase
    .from('sayafterme_usage')
    .select('count')
    .eq('rc_user_id', rcUserId)
    .eq('period_month', period)
    .maybeSingle()

  if (error) {
    console.error('[sayafterme/usage] readCurrentCount failed:', error)
    throw new Error('usage_read_failed')
  }

  return data?.count ?? 0
}
