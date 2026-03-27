import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSubscription } from '@/lib/subscription'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/subscription/usage
// Returns detailed minute usage breakdown for the current billing period
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(user.id)
    if (!subscription) {
      return NextResponse.json({ usage: [] })
    }

    // Fetch all usage records for the current period, joined with booking info
    const supabaseAdmin = getSupabaseAdmin()
    const { data: usage, error } = await supabaseAdmin
      .from('minute_usage')
      .select('id, minutes_used, action, created_at, booking_id')
      .eq('user_id', user.id)
      .eq('period_start', subscription.current_period_start)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch usage:', error)
      return NextResponse.json({ usage: [] })
    }

    return NextResponse.json({ usage })
  } catch (error) {
    console.error('Usage fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 },
    )
  }
}
