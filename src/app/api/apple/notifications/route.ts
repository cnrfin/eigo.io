import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseAppleProductId, type AppleNotificationPayload, type AppleTransactionInfo } from '@/lib/apple-iap'
import { PLAN_MINUTES } from '@/lib/stripe'

/**
 * POST /api/apple/notifications
 *
 * Apple App Store Server Notifications — supports both V1 and V2 formats.
 *
 * V2: { signedPayload: "..." } (JWS-wrapped)
 * V1: { notification_type: "...", unified_receipt: { latest_receipt_info: [...] }, ... }
 *
 * Configure in App Store Connect:
 *   App → App Information → App Store Server Notifications
 *   URL: https://eigo.io/api/apple/notifications
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Detect V2 vs V1 format
  if (body.signedPayload && typeof body.signedPayload === 'string') {
    return handleV2(supabase, body.signedPayload as string)
  } else if (body.notification_type) {
    return handleV1(supabase, body)
  }

  console.error('[Apple Notifications] Unknown payload format:', JSON.stringify(body).slice(0, 500))
  return NextResponse.json({ error: 'Unknown payload format' }, { status: 400 })
}

// ==================== V2 Handler ====================

async function handleV2(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  signedPayload: string,
) {
  const notification = decodeJWS<AppleNotificationPayload>(signedPayload)
  if (!notification) {
    console.error('[Apple Notifications] V2: Failed to decode notification')
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const transaction = decodeJWS<AppleTransactionInfo>(notification.data.signedTransactionInfo)
  if (!transaction) {
    console.error('[Apple Notifications] V2: Failed to decode transaction info')
    return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 })
  }

  if (notification.data.bundleId !== 'io.eigo.app') {
    console.error(`[Apple Notifications] V2: Invalid bundle ID: ${notification.data.bundleId}`)
    return NextResponse.json({ error: 'Invalid bundle' }, { status: 400 })
  }

  const originalTxId = transaction.originalTransactionId
  console.log(`[Apple Notifications] V2: ${notification.notificationType}${notification.subtype ? `/${notification.subtype}` : ''} for ${originalTxId}`)

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
      case 'DID_CHANGE_RENEWAL_STATUS':
        if (notification.subtype === 'AUTO_RENEW_DISABLED') {
          await handleAutoRenewDisabled(supabase, transaction)
        } else if (notification.subtype === 'AUTO_RENEW_ENABLED') {
          await handleAutoRenewEnabled(supabase, transaction)
        }
        break
      case 'SUBSCRIBED':
        await handleSubscribed(supabase, transaction)
        break
      default:
        console.log(`[Apple Notifications] V2: Unhandled type: ${notification.notificationType}`)
    }
  } catch (err) {
    console.error(`[Apple Notifications] V2: Error handling ${notification.notificationType}:`, err)
  }

  return NextResponse.json({ received: true })
}

// ==================== V1 Handler ====================

/**
 * V1 notification format from Apple.
 * See: https://developer.apple.com/documentation/appstoreservernotifications/responsebodyv1
 */
async function handleV1(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: Record<string, unknown>,
) {
  const notificationType = body.notification_type as string
  const environment = body.environment as string
  const unifiedReceipt = body.unified_receipt as Record<string, unknown> | undefined
  const latestReceiptInfo = (unifiedReceipt?.latest_receipt_info as Record<string, unknown>[]) || []

  // Get the most recent transaction from the receipt
  const latest = latestReceiptInfo[0]
  if (!latest) {
    // Some V1 notifications like CANCEL don't always include receipt info
    // Try auto_renew_product_id from the body directly
    const autoRenewProductId = body.auto_renew_product_id as string | undefined
    const originalTxId = body.original_transaction_id as string | undefined

    console.log(`[Apple Notifications] V1: ${notificationType} (env: ${environment}, origTx: ${originalTxId || 'unknown'})`)

    if (originalTxId) {
      switch (notificationType) {
        case 'CANCEL':
          await handleAutoRenewDisabledByOrigTx(supabase, originalTxId)
          break
        case 'DID_CHANGE_RENEWAL_STATUS': {
          const autoRenewStatus = body.auto_renew_status as string | undefined
          if (autoRenewStatus === 'false' || autoRenewStatus === '0') {
            await handleAutoRenewDisabledByOrigTx(supabase, originalTxId)
          } else {
            await handleAutoRenewEnabledByOrigTx(supabase, originalTxId)
          }
          break
        }
        default:
          console.log(`[Apple Notifications] V1: Unhandled type without receipt: ${notificationType}`)
      }
    } else {
      console.warn(`[Apple Notifications] V1: ${notificationType} — no receipt info and no original_transaction_id`)
    }

    return NextResponse.json({ received: true })
  }

  const originalTxId = (latest.original_transaction_id || latest.originalTransactionId) as string
  const productId = (latest.product_id || latest.productId) as string
  // V1 dates are in milliseconds (string) or ISO string
  const expiresDateMs = latest.expires_date_ms || latest.expires_date
  const purchaseDateMs = latest.purchase_date_ms || latest.purchase_date
  const expiresDate = expiresDateMs ? Number(expiresDateMs) : undefined
  const purchaseDate = purchaseDateMs ? Number(purchaseDateMs) : Date.now()

  console.log(`[Apple Notifications] V1: ${notificationType} for ${originalTxId} (product: ${productId}, env: ${environment})`)

  // Build a transaction-like object for our shared handlers
  const transaction: AppleTransactionInfo = {
    transactionId: (latest.transaction_id || latest.transactionId) as string,
    originalTransactionId: originalTxId,
    bundleId: (body.bid || body.bundle_id || 'io.eigo.app') as string,
    productId,
    purchaseDate,
    originalPurchaseDate: purchaseDate,
    expiresDate,
    type: 'Auto-Renewable Subscription',
    environment: (environment === 'Sandbox' || environment === 'SANDBOX') ? 'Sandbox' : 'Production',
  }

  try {
    switch (notificationType) {
      // Renewal
      case 'DID_RENEW':
      case 'RENEWAL':
        await handleRenew(supabase, transaction)
        break

      // Initial purchase (backup)
      case 'INITIAL_BUY':
        await handleSubscribed(supabase, transaction)
        break

      // Cancellation / auto-renew changes
      case 'CANCEL':
        await handleAutoRenewDisabled(supabase, transaction)
        break

      case 'DID_CHANGE_RENEWAL_STATUS': {
        const autoRenewStatus = body.auto_renew_status as string | undefined
        if (autoRenewStatus === 'false' || autoRenewStatus === '0') {
          await handleAutoRenewDisabled(supabase, transaction)
        } else {
          await handleAutoRenewEnabled(supabase, transaction)
        }
        break
      }

      // Expiry
      case 'DID_FAIL_TO_RENEW':
        await handleFailedRenew(supabase, transaction)
        break

      // Refund
      case 'REFUND':
        await handleRefundOrRevoke(supabase, transaction)
        break

      // Interactive renewal (user resubscribes after lapse)
      case 'INTERACTIVE_RENEWAL':
        await handleRenew(supabase, transaction)
        break

      case 'DID_CHANGE_RENEWAL_PREF':
        // User changed plan — could handle plan switches here
        console.log(`[Apple Notifications] V1: Plan change for ${originalTxId} to ${productId}`)
        break

      default:
        console.log(`[Apple Notifications] V1: Unhandled type: ${notificationType}`)
    }
  } catch (err) {
    console.error(`[Apple Notifications] V1: Error handling ${notificationType}:`, err)
  }

  return NextResponse.json({ received: true })
}

// ==================== Shared Handlers ====================

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
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  }
  if (expiresDate) update.current_period_end = expiresDate

  const { error } = await supabase
    .from('subscriptions')
    .update(update)
    .eq('apple_original_transaction_id', transaction.originalTransactionId)

  if (error) console.error('[Apple] Failed to handle renewal:', error)
  else console.log(`[Apple] Renewed subscription for tx ${transaction.originalTransactionId}`)
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
  else console.log(`[Apple] Expired subscription for tx ${transaction.originalTransactionId}`)
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
  else console.log(`[Apple] Auto-renew disabled for tx ${transaction.originalTransactionId}`)
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

// Helpers for V1 notifications that don't include full receipt info
async function handleAutoRenewDisabledByOrigTx(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  originalTransactionId: string,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', originalTransactionId)

  if (error) console.error('[Apple] Failed to handle auto-renew disabled (V1 minimal):', error)
  else console.log(`[Apple] Auto-renew disabled (V1 minimal) for tx ${originalTransactionId}`)
}

async function handleAutoRenewEnabledByOrigTx(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  originalTransactionId: string,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('apple_original_transaction_id', originalTransactionId)

  if (error) console.error('[Apple] Failed to handle auto-renew enabled (V1 minimal):', error)
}

async function handleSubscribed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transaction: AppleTransactionInfo,
) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('apple_original_transaction_id', transaction.originalTransactionId)
    .single()

  if (existing) return

  const productInfo = parseAppleProductId(transaction.productId)
  if (!productInfo) {
    console.error(`[Apple] Unknown product ID in SUBSCRIBED: ${transaction.productId}`)
    return
  }

  console.warn('[Apple] SUBSCRIBED notification without matching record — user must verify via app')
}

// ==================== JWS Decoding ====================

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
