import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseAppleProductId, type AppleNotificationPayload, type AppleTransactionInfo } from '@/lib/apple-iap'
import { PLAN_MINUTES } from '@/lib/stripe'

/**
 * POST /api/apple/notifications
 *
 * Apple App Store Server Notifications v2.
 * Receives real-time subscription lifecycle events (renewal, cancellation, etc.)
 * and syncs state to Supabase.
 *
 * Configure in App Store Connect:
 *   App → App Information → App Store Server Notifications
 *   URL: https://eigo.io/api/apple/notifications
 *   Version: V2
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()

  let body: { signedPayload?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.signedPayload) {
    return NextResponse.json({ error: 'Missing signedPayload' }, { status: 400 })
  }

  // Decode the notification payload (JWS)
  const notification = decodeNotification(body.signedPayload)
  if (!notification) {
    console.error('[Apple Notifications] Failed to decode notification')
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Decode the transaction info from the notification
  const transaction = decodeJWS<AppleTransactionInfo>(notification.data.signedTransactionInfo)
  if (!transaction) {
    console.error('[Apple Notifications] Failed to decode transaction info')
    return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 })
  }

  // Validate bundle ID
  if (notification.data.bundleId !== 'io.eigo.app') {
    console.error(`[Apple Notifications] Invalid bundle ID: ${notification.data.bundleId}`)
    return NextResponse.json({ error: 'Invalid bundle' }, { status: 400 })
  }

  const originalTxId = transaction.originalTransactionId
  console.log(`[Apple Notifications] ${notification.notificationType}${notification.subtype ? `/${notification.subtype}` : ''} for ${originalTxId}`)

  try {
    switch (notification.notificationType) {
      case 'DID_RENEW':
        await handleRenew(supabase, transaction)
        break

      case 'EXPIRED':
        await handleExpired(supabase, transaction)
        break

      case 'DID_FAIL_TO_RENEW':
        await handleFailedRenew(supabase, transaction)
        break

      case 'REVOKE':
      case 'REFUND':
        await handleRefundOrRevoke(supabase, transaction)
        break

      case 'DID_CHANGE_RENEWAL_INFO':
        if (notification.subtype === 'AUTO_RENEW_DISABLED') {
          await handleAutoRenewDisabled(supabase, transaction)
        } else if (notification.subtype === 'AUTO_RENEW_ENABLED') {
          await handleAutoRenewEnabled(supabase, transaction)
        }
        break

      case 'SUBSCRIBED':
        // Backup — in case verify-receipt was missed
        await handleSubscribed(supabase, transaction)
        break

      case 'DID_CHANGE_RENEWAL_STATUS':
        // Handled by DID_CHANGE_RENEWAL_INFO above
        break

      default:
        console.log(`[Apple Notifications] Unhandled type: ${notification.notificationType}`)
    }
  } catch (err) {
    console.error(`[Apple Notifications] Error handling ${notification.notificationType}:`, err)
    // Return 200 anyway so Apple doesn't retry endlessly
  }

  return NextResponse.json({ received: true })
}

// ---------- Notification handlers ----------

async function handleRenew(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const expiresDate = transaction.expiresDate
    ? new Date(transaction.expiresDate).toISOString()
    : null
  const purchaseDate = new Date(transaction.purchaseDate).toISOString()

  const update: Record<string, unknown> = {
    status: 'active',
    current_period_start: purchaseDate,
    updated_at: new Date().toISOString(),
  }
  if (expiresDate) update.current_period_end = expiresDate

  const { error } = await supabase
    .from('subscriptions')
    .update(update)
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle renewal:', error)
}

async function handleExpired(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle expiry:', error)
}

async function handleFailedRenew(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle failed renewal:', error)
}

async function handleRefundOrRevoke(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle refund/revoke:', error)
}

async function handleAutoRenewDisabled(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle auto-renew disabled:', error)
}

async function handleAutoRenewEnabled(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle auto-renew enabled:', error)
}

async function handleSubscribed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  // Check if we already have this subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('apple_original_transaction_id', transaction.originalTransactionId)
    .single()

  if (existing) return // Already processed

  const productInfo = parseAppleProductId(transaction.productId)
  if (!productInfo) {
    console.error(`[Apple] Unknown product ID in SUBSCRIBED: ${transaction.productId}`)
    return
  }

  // We don't know the user_id from just the notification, so log and skip.
  // The verify-receipt endpoint (called from the app) is the primary path.
  console.warn('[Apple] SUBSCRIBED notification without matching record — user must verify via app')
}

// ---------- JWS decoding ----------

function decodeNotification(signedPayload: string): AppleNotificationPayload | null {
  return decodeJWS<AppleNotificationPayload>(signedPayload)
}

function decodeJWS<T>(jws: string): T | null {
  try {
    const parts = jws.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(payload) as T
  } catch {
    return null
  }
}
