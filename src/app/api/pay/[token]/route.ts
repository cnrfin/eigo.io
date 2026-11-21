import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getActiveSale, type OfferRow } from '@/lib/custom-plans-server'
import { salePrice } from '@/lib/custom-plans'

/**
 * A custom-plan payment link (eigo.io/pay/<token>).
 *
 * GET  → the plan, for the pay page. Works signed out (no name shown) so the
 *        student sees what it is before signing in. Signed in, `forYou` says
 *        whether the link belongs to this account.
 * POST → (signed in as the link's student) a Stripe Checkout session URL. A
 *        new session is made each time, so the link itself never expires.
 */

async function userFrom(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  return user ?? null
}

async function loadOffer(token: string) {
  const { data } = await getSupabaseAdmin().from('custom_plan_offers').select('*').eq('token', token).maybeSingle()
  return (data as OfferRow | null) ?? null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const offer = await loadOffer(token)
  if (!offer) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const user = await userFrom(request)
  const forYou = user ? user.id === offer.user_id : null

  // The sale only counts while its coupon can still be redeemed.
  const sale = offer.apply_sale && offer.status === 'open' ? await getActiveSale(getStripe()) : null

  let name: string | null = null
  if (forYou) {
    const { data: profile } = await getSupabaseAdmin().from('profiles').select('display_name').eq('id', offer.user_id).maybeSingle()
    name = profile?.display_name ?? null
  }

  return NextResponse.json({
    status: offer.status,
    forYou,
    name,
    priceJpy: offer.price_jpy,
    payJpy: sale ? salePrice(offer.price_jpy, sale.percentOff) : offer.price_jpy,
    salePercent: sale?.percentOff ?? null,
    saleName: sale?.name ?? null,
    saleForever: sale?.forever ?? false,
    intervalUnit: offer.interval_unit,
    intervalCount: offer.interval_count,
    minutes: offer.minutes_per_period,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await userFrom(request)
  if (!user) return NextResponse.json({ error: 'signed_out' }, { status: 401 })

  const offer = await loadOffer(token)
  if (!offer) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (offer.user_id !== user.id) return NextResponse.json({ error: 'wrong_account' }, { status: 403 })
  if (offer.status !== 'open') return NextResponse.json({ error: offer.status }, { status: 409 })

  const admin = getSupabaseAdmin()
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', user.id)
    .maybeSingle()
  // A second subscription would overwrite the first one's row while Stripe kept charging both.
  if (existingSub && ['active', 'trialing', 'past_due'].includes(existingSub.status)) {
    return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
  }

  const stripe = getStripe()
  const sale = offer.apply_sale ? await getActiveSale(stripe) : null

  try {
    let customerId = existingSub?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })
      customerId = customer.id
    }

    const meta = {
      supabase_user_id: user.id,
      plan: 'custom',
      interval: 'custom',
      tier: 'full',
      minutes_per_month: String(offer.minutes_per_period),
      custom_offer_id: offer.id,
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eigo.io'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      currency: 'jpy',
      line_items: [{ price: offer.stripe_price_id, quantity: 1 }],
      ...(sale ? { discounts: [{ coupon: sale.couponId }] } : {}),
      success_url: `${baseUrl}/dashboard?subscribed=true`,
      cancel_url: `${baseUrl}/pay/${offer.token}`,
      metadata: meta,
      subscription_data: { metadata: meta },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Custom plan checkout error:', err)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
  }
}
