import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { getStripe } from '@/lib/stripe'
import { getActiveSale, getCustomPrice, listCustomPrices, newOfferToken, toOffer, type OfferRow } from '@/lib/custom-plans-server'

/**
 * Admin: custom plans for one student.
 *
 * GET    /api/admin/custom-plans?userId=…
 *   The custom prices in Stripe, the running sale (if any), the student's
 *   payment links, and whether they already have an active subscription.
 * POST   /api/admin/custom-plans   { userId, priceId, minutes, applySale }
 *   Create a payment link (an open offer) for the student.
 * DELETE /api/admin/custom-plans?offerId=…
 *   Turn off an unpaid link.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const supabase = getAdminSupabase()
  const stripe = getStripe()
  try {
    const [prices, sale, offersRes, subRes] = await Promise.all([
      listCustomPrices(stripe),
      getActiveSale(stripe),
      supabase.from('custom_plan_offers').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('plan, status, payment_source').eq('user_id', userId).maybeSingle(),
    ])
    if (offersRes.error) throw offersRes.error
    const sub = subRes.data
    const active = sub && ['active', 'trialing', 'past_due'].includes(sub.status) ? sub : null
    return NextResponse.json({
      prices,
      sale: sale ? { percentOff: sale.percentOff, endsAt: sale.endsAt, name: sale.name, forever: sale.forever } : null,
      offers: (offersRes.data as OfferRow[]).map(toOffer),
      activeSubscription: active ? { plan: active.plan, status: active.status, paymentSource: active.payment_source || 'stripe' } : null,
    })
  } catch (err) {
    console.error('Custom plans GET error:', err)
    return NextResponse.json({ error: 'Could not load custom plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: { userId?: string; priceId?: string; minutes?: number; applySale?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { userId, priceId, applySale } = body
  const minutes = Math.round(Number(body.minutes))
  if (!userId || !priceId || !Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: 'userId, priceId and a positive number of minutes are required' }, { status: 400 })
  }

  const stripe = getStripe()
  const price = await getCustomPrice(stripe, priceId)
  if (!price) return NextResponse.json({ error: 'That price isn’t an active custom price in Stripe' }, { status: 400 })
  const sale = applySale ? await getActiveSale(stripe) : null
  if (applySale && !sale) return NextResponse.json({ error: 'There’s no sale running right now' }, { status: 400 })

  const supabase = getAdminSupabase()
  // One open link per student: creating a new one turns off the old.
  await supabase.from('custom_plan_offers').update({ status: 'cancelled' }).eq('user_id', userId).eq('status', 'open')

  const { data, error } = await supabase
    .from('custom_plan_offers')
    .insert({
      token: newOfferToken(),
      user_id: userId,
      stripe_price_id: price.id,
      price_jpy: price.priceJpy,
      interval_unit: price.intervalUnit,
      interval_count: price.intervalCount,
      minutes_per_period: minutes,
      apply_sale: !!sale,
    })
    .select('*')
    .single()
  if (error || !data) {
    console.error('Custom plans POST error:', error)
    return NextResponse.json({ error: 'Could not create the link' }, { status: 500 })
  }
  return NextResponse.json({ offer: toOffer(data as OfferRow) })
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const offerId = new URL(request.url).searchParams.get('offerId')
  if (!offerId) return NextResponse.json({ error: 'offerId is required' }, { status: 400 })

  const { data, error } = await getAdminSupabase()
    .from('custom_plan_offers')
    .update({ status: 'cancelled' })
    .eq('id', offerId)
    .eq('status', 'open')
    .select('*')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not turn off the link' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'That link is already paid or turned off' }, { status: 409 })
  return NextResponse.json({ offer: toOffer(data as OfferRow) })
}
