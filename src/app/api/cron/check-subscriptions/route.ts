import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/cron/check-subscriptions
 *
 * Safety net cron job — runs daily to catch subscriptions that should have
 * expired but weren't updated (e.g. if an Apple/Stripe webhook was missed).
 *
 * Checks for:
 * 1. Active subscriptions past their current_period_end with cancel_at_period_end=true → mark cancelled
 * 2. Active subscriptions past their current_period_end (no renewal webhook received) → mark past_due
 *    (gives a grace window before fully cancelling, in case webhook is just delayed)
 * 3. Past_due subscriptions more than 7 days overdue → mark cancelled
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const isAuthorized =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let expired = 0
  let pastDue = 0
  let cancelled = 0

  try {
    // 1. Cancel subscriptions that are past period end AND user chose to cancel
    const { data: cancelPending, error: e1 } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .lt('current_period_end', now)
      .select('id, user_id')

    if (e1) console.error('[Cron] Error cancelling pending subscriptions:', e1)
    expired = cancelPending?.length || 0

    // 2. Mark overdue active subscriptions as past_due (webhook may be delayed)
    // Only if period ended more than 1 hour ago (to avoid race with webhooks)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: overdue, error: e2 } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: now,
      })
      .eq('status', 'active')
      .eq('cancel_at_period_end', false)
      .lt('current_period_end', oneHourAgo)
      .select('id, user_id')

    if (e2) console.error('[Cron] Error marking overdue subscriptions:', e2)
    pastDue = overdue?.length || 0

    // 3. Cancel past_due subscriptions that have been overdue for 7+ days
    const { data: stale, error: e3 } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: false,
        updated_at: now,
      })
      .eq('status', 'past_due')
      .lt('current_period_end', sevenDaysAgo)
      .select('id, user_id')

    if (e3) console.error('[Cron] Error cancelling stale subscriptions:', e3)
    cancelled = stale?.length || 0

    console.log(`[Cron] check-subscriptions: ${expired} expired, ${pastDue} past_due, ${cancelled} cancelled`)

    return NextResponse.json({
      success: true,
      expired,
      pastDue,
      cancelled,
    })
  } catch (err) {
    console.error('[Cron] check-subscriptions error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
