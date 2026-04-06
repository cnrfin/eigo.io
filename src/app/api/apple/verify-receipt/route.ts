import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyTransaction, parseAppleProductId } from '@/lib/apple-iap'
import { getPriceTier } from '@/lib/subscription'

/**
 * POST /api/apple/verify-receipt
 *
 * Called by the iOS app after a successful StoreKit 2 purchase.
 * Validates the transaction with Apple's App Store Server API,
 * then creates/updates the subscription in Supabase (mirroring
 * the Stripe webhook's handleCheckoutCompleted flow).
 */
export async function POST(request: NextRequest) {
  // ── Auth ──
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ──
  const body = await request.json()
  const { transactionId, originalTransactionId, productId, environment } = body

  if (!transactionId || !productId) {
    return NextResponse.json({ error: 'Missing transactionId or productId' }, { status: 400 })
  }

  // ── Map product ID to plan details ──
  const productInfo = parseAppleProductId(productId)
  if (!productInfo) {
    return NextResponse.json({ error: `Unknown product ID: ${productId}` }, { status: 400 })
  }

  // ── Verify with Apple ──
  const transaction = await verifyTransaction(
    transactionId,
    environment === 'Sandbox' ? 'Sandbox' : 'Production',
  )

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction verification failed' }, { status: 400 })
  }

  // Double-check product ID matches
  if (transaction.productId !== productId) {
    return NextResponse.json({ error: 'Product ID mismatch' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // ── Check for existing subscription with this Apple transaction (idempotency) ──
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('apple_original_transaction_id', transaction.originalTransactionId)
    .single()

  if (existing) {
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  // ── Determine price tier ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_completed_at')
    .eq('id', user.id)
    .single()

  const tier = getPriceTier(profile?.trial_completed_at || null)

  // ── Calculate subscription period ──
  const purchaseDate = new Date(transaction.purchaseDate).toISOString()
  const expiresDate = transaction.expiresDate
    ? new Date(transaction.expiresDate).toISOString()
    : calculatePeriodEnd(purchaseDate, productInfo.interval)

  // ── Upsert subscription ──
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: null, // No Stripe for Apple IAP purchases
        stripe_subscription_id: null,
        apple_original_transaction_id: transaction.originalTransactionId,
        apple_product_id: productId,
        payment_source: 'apple',
        plan: productInfo.plan,
        billing_interval: productInfo.interval,
        price_tier: tier,
        status: 'active',
        minutes_per_month: productInfo.minutesPerMonth,
        current_period_start: purchaseDate,
        current_period_end: expiresDate,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (upsertError) {
    console.error('[Apple IAP] Failed to upsert subscription:', upsertError)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }

  console.log(`[Apple IAP] Subscription created for user ${user.id}: ${productInfo.plan}/${productInfo.interval}`)
  return NextResponse.json({ success: true })
}

/**
 * Fallback period calculation if expiresDate not available.
 */
function calculatePeriodEnd(startDate: string, interval: string): string {
  const d = new Date(startDate)
  if (interval === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString()
}
