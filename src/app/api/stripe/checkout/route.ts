import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, getStripePriceId, PLAN_MINUTES } from '@/lib/stripe'
import type { PlanName, BillingInterval } from '@/lib/stripe'
import { getPriceTier } from '@/lib/subscription'

// POST /api/stripe/checkout
// Body: { plan: 'light' | 'standard', interval: 'monthly' | 'yearly' }
// Creates a Stripe Checkout session and returns the URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, interval } = body as {
      plan: PlanName
      interval: BillingInterval
    }

    if (!plan || !interval) {
      return NextResponse.json(
        { error: 'plan and interval are required' },
        { status: 400 },
      )
    }

    if (!['light', 'standard'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

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

    // Fetch profile for trial window check
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_completed_at')
      .eq('id', user.id)
      .single()

    // Determine price tier based on trial completion
    const tier = getPriceTier(profile?.trial_completed_at ?? null)
    const priceId = getStripePriceId(plan, interval, tier)

    // Check if user already has a Stripe customer ID
    const supabaseAdmin = (await import('@/lib/supabase-admin')).getSupabaseAdmin()
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .single()

    // Don't allow checkout if they already have an active subscription
    if (existingSub && ['active', 'trialing'].includes(existingSub.status)) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Manage it from Settings.' },
        { status: 409 },
      )
    }

    const stripe = getStripe()

    // Reuse existing Stripe customer or create a new one
    let customerId = existingSub?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    // Create Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eigo.io'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      currency: 'jpy',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?subscribed=true`,
      cancel_url: `${baseUrl}/plans`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        interval,
        tier,
        minutes_per_month: String(PLAN_MINUTES[plan]),
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
          interval,
          tier,
          minutes_per_month: String(PLAN_MINUTES[plan]),
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
