import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/test-subscription
 * Admin-only helper for testing the subscription flow.
 * In development, no auth required. In production, this route should be removed.
 *
 * Actions:
 *   { action: 'simulate-trial', email: string }
 *   { action: 'reset-trial', email: string }
 *   { action: 'reset-subscription', email: string }
 *   { action: 'get-state', email: string }
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await request.json()
    const { action, email, userId: rawUserId } = body as { action: string; email?: string; userId?: string }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Resolve userId from email if needed
    let userId = rawUserId
    if (!userId && email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
      if (!profile) {
        return NextResponse.json({ error: `No profile found for email: ${email}` }, { status: 404 })
      }
      userId = profile.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'email or userId is required' }, { status: 400 })
    }

    switch (action) {
      case 'simulate-trial': {
        const { error } = await supabase
          .from('profiles')
          .update({ trial_completed_at: new Date().toISOString() })
          .eq('id', userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true, message: 'trial_completed_at set to now — 48h discount window started' })
      }

      case 'reset-trial': {
        const { error } = await supabase
          .from('profiles')
          .update({ trial_completed_at: null, trial_booking_id: null })
          .eq('id', userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true, message: 'Trial state cleared' })
      }

      case 'reset-subscription': {
        // Delete minute_usage first (FK dependency)
        await supabase.from('minute_usage').delete().eq('user_id', userId)
        // Delete subscription
        await supabase.from('subscriptions').delete().eq('user_id', userId)
        return NextResponse.json({ ok: true, message: 'Subscription and usage data deleted' })
      }

      case 'get-state': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_completed_at, trial_booking_id, first_name, last_name, email')
          .eq('id', userId)
          .single()

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()

        const { data: usage } = await supabase
          .from('minute_usage')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        return NextResponse.json({
          profile: profile || null,
          subscription: subscription || null,
          recentUsage: usage || [],
        })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('Test subscription error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
