import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess } from '@/lib/test-entitlement'
import { PRON_FREE_ATTEMPTS, pronProgress } from '@/lib/pron-gate'

/**
 * GET /api/courses/pron-status
 *   The caller's standing in the Pronunciation course gate:
 *   { entitled, used, max, remaining, avgScore, trialBooked,
 *     upsellDismissed, announceSeen }
 *
 *   Gating model: non-subscribers get PRON_FREE_ATTEMPTS graded attempts
 *   anywhere in the course (one attempt = one COMPLETED non-free lesson);
 *   the free L&R lesson never consumes an attempt. avgScore averages
 *   best_score across ALL completed pronunciation lessons (free included).
 *
 * POST /api/courses/pron-status
 *   Body: { upsell_dismissed?: true, announce_seen?: true }
 *   Stamps the matching profiles nudge flag (sticky; never cleared).
 */

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const entitled = await hasTestAccess(supabase, user) // admins pass inside (unless simulating free)

  let completed: Awaited<ReturnType<typeof pronProgress>>['completed']
  let used: number, avgScore: number | null
  try {
    ;({ completed, used, avgScore } = await pronProgress(supabase, user.id))
  } catch (e) {
    console.error('pron-status progress query failed:', e)
    return NextResponse.json({ error: 'Could not load status' }, { status: 500 })
  }

  // trial_booking_id is THE trial marker (stamped by /api/calendar/book for
  // the 15-min trial) — a user can have other bookings without it.
  const { data: profile } = await supabase
    .from('profiles')
    .select('pron_upsell_dismissed_at, pron_announce_seen_at, trial_booking_id')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    entitled,
    used,
    max: PRON_FREE_ATTEMPTS,
    remaining: Math.max(0, PRON_FREE_ATTEMPTS - used),
    avgScore,
    completedCount: completed.length,
    trialBooked: !!profile?.trial_booking_id,
    upsellDismissed: !!profile?.pron_upsell_dismissed_at,
    announceSeen: !!profile?.pron_announce_seen_at,
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  let body: { upsell_dismissed?: boolean; announce_seen?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const update: Record<string, string> = {}
  if (body.upsell_dismissed) update.pron_upsell_dismissed_at = new Date().toISOString()
  if (body.announce_seen) update.pron_announce_seen_at = new Date().toISOString()
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) {
    console.error('pron-status flag update failed:', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
