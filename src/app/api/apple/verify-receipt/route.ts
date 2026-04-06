import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyTransaction, parseAppleProductId, decodeJWS } from '@/lib/apple-iap'
import { getPriceTier } from '@/lib/subscription'

/**
 * POST /api/apple/verify-receipt
 *
 * Called by the iOS app after a successful StoreKit 2 purchase.
 * Attempts to validate the transaction with Apple's App Store Server API.
 * Falls back to decoding the signed JWS payload from the app if the
 * Server API is unavailable (e.g. sandbox, auth issues).
 * Then creates/updates the subscription in Supabase.
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
  const { transactionId, originalTransactionId, productId, environment, signedPayload } = body

  if (!transactionId || !productId) {
    return NextResponse.json({ error: 'Missing transactionId or productId' }, { status: 400 })
  }

  // ── Map product ID to plan details ──
  const productInfo = parseAppleProductId(productId)
  if (!productInfo) {
    return NextResponse.json({ error: `Unknown product ID: ${productId}` }, { status: 400 })
  }

  // ── Verify transaction ──
  // Try Apple Server API first, fall back to decoding the signed JWS from the app
  let verifiedProductId = productId
  let verifiedOriginalTxId = originalTransactionId || transactionId
  let purchaseTimestamp: number | null = null
  let expiresTimestamp: number | null = null

  // Attempt 1: Apple App Store Server API v2
  const transaction = await verifyTransaction(
    transactionId,
    environment === 'Sandbox' ? 'Sandbox' : 'Production',
  ).catch((err) => {
    console.warn('[Apple IAP] Server API verification failed, falling back to JWS decode:', err?.message)
    return null
  })

  if (transaction) {
    // Verified with Apple — use their data
    verifiedProductId = transaction.productId
    verifiedOriginalTxId = transaction.originalTransactionId
    purchaseTimestamp = transaction.purchaseDate
    expiresTimestamp = transaction.expiresDate || null
  } else if (signedPayload) {
    // Attempt 2: Decode the signed JWS payload from the app
    const decoded = decodeJWS(signedPayload)
    if (decoded && decoded.bundleId === 'io.eigo.app') {
      verifiedProductId = decoded.productId
      verifiedOriginalTxId = decoded.originalTransactionId
      purchaseTimestamp = decoded.purchaseDate
      expiresTimestamp = decoded.expiresDate || null
      console.log('[Apple IAP] Verified via JWS decode')
    }
  }

  // Validate product ID matches what the app sent
  if (verifiedProductId !== productId) {
    return NextResponse.json({ error: 'Product ID mismatch' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // ── Check for existing subscription with this Apple transaction (idempotency) ──
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('apple_original_transaction_id', verifiedOriginalTxId)
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
  const purchaseDate = purchaseTimestamp
    ? new Date(purchaseTimestamp).toISOString()
    : new Date().toISOString()
  const expiresDate = expiresTimestamp
    ? new Date(expiresTimestamp).toISOString()
    : calculatePeriodEnd(purchaseDate, productInfo.interval)

  // ── Upsert subscription ──
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: null, // No Stripe for Apple IAP purchases
        stripe_subscription_id: null,
        apple_original_transaction_id: verifiedOriginalTxId,
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
