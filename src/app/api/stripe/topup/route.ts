import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getUserSubscription } from '@/lib/subscription'
import { aiAccess } from '@/lib/ai-tutor/access'
import { TOPUP_MINUTES } from '@/lib/minutes'

/**
 * POST /api/stripe/topup → { url }
 * One-off Stripe Checkout for +TOPUP_MINUTES AI minutes (¥980, valid 3 months). Subscribers with AI access only.
 * The webhook (checkout.session.completed, metadata.kind = 'topup') adds the minutes.
 */
export async function POST(request: NextRequest) {
  try {
    const h = request.headers.get('Authorization') ?? ''
    const v = h.startsWith('Bearer ') ? await verifySupabaseToken(h.slice(7)) : null
    if (!v?.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = v.user

    if (!(await aiAccess(user)).ok) return NextResponse.json({ error: 'Not available for this account' }, { status: 403 })
    const sub = await getUserSubscription(user.id)
    if (!sub || sub.status === 'cancelled') return NextResponse.json({ error: 'A plan is needed to add AI minutes', code: 'NO_SUBSCRIPTION' }, { status: 403 })

    const priceId = process.env.STRIPE_PRICE_TOPUP_60
    if (!priceId) return NextResponse.json({ error: 'Top-ups are not set up yet' }, { status: 500 })

    const stripe = getStripe()
    // Reuse the Stripe customer when they pay by Stripe; otherwise (e.g. Apple) create one and keep it
    let customerId = sub.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { supabase_user_id: user.id } })
      customerId = customer.id
      await getSupabaseAdmin().from('subscriptions').update({ stripe_customer_id: customerId }).eq('user_id', user.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eigo.io'
    const meta = { kind: 'topup', minutes: String(TOPUP_MINUTES), supabase_user_id: user.id }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      currency: 'jpy',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/topup?done=1`,
      cancel_url: `${baseUrl}/dashboard/topup`,
      metadata: meta,
      payment_intent_data: { metadata: meta },
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Top-up checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
