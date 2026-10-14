import { NextRequest, NextResponse } from 'next/server'
import { getUserSubscription, getMinuteBalance } from '@/lib/subscription'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getUserPermissions } from '@/lib/user-permissions'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getBalance } from '@/lib/minutes'

// GET /api/subscription
// Returns user's subscription details + remaining minutes
export async function GET(request: NextRequest) {
  try {
    // Authenticate user (local JWT verification — no auth-server roundtrip)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const verified = await verifySupabaseToken(authHeader.replace('Bearer ', ''))
    if (!verified.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = verified.user

    // Independent lookups — run them in parallel
    const [subscription, balance, perms] = await Promise.all([
      getUserSubscription(user.id),
      getMinuteBalance(user.id),
      getUserPermissions(getSupabaseAdmin(), user.id),
    ])
    // Opt-in features the dashboard needs to know about (pilot classroom,
    // test bookings). Additive field: older clients ignore it.
    // AI tutor: pilot students, or the AI plan (AI tutor lessons only)
    const aiPlan = !!subscription && subscription.plan === 'ai' && subscription.status !== 'cancelled'
    const features = {
      classroomEnabled: perms.classroom_enabled,
      bookingTestMode: perms.booking_test_mode,
      aiEnabled: perms.ai_enabled || aiPlan,
      aiOnly: aiPlan,
    }
    // AI pilot: AI minutes (AI plan + top-ups) and what an AI lesson can draw on. Additive field.
    let aiMinutes = null
    if (features.aiEnabled) {
      const b = await getBalance(user.id)
      aiMinutes = { total: b.ai.total, left: b.ai.left, topupLeft: b.snapshot.topups.reduce((a, t) => a + t.left, 0), snapshot: b.snapshot }
    }
    if (!subscription) {
      return NextResponse.json({ subscription: null, balance: null, features, aiMinutes })
    }

    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        billingInterval: subscription.billing_interval,
        priceTier: subscription.price_tier,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
        paymentSource: subscription.payment_source || 'stripe',
      },
      balance,
      features,
      aiMinutes,
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 },
    )
  }
}
