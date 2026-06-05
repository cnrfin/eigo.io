import { NextRequest, NextResponse } from 'next/server'
import { getUserSubscription, getMinuteBalance } from '@/lib/subscription'
import { verifySupabaseToken } from '@/lib/supabase-jwt'

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
    const [subscription, balance] = await Promise.all([
      getUserSubscription(user.id),
      getMinuteBalance(user.id),
    ])
    if (!subscription) {
      return NextResponse.json({ subscription: null, balance: null })
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
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 },
    )
  }
}
