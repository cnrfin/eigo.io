/**
 * Apple IAP helpers — maps App Store product IDs to plan details
 * and handles App Store Server API v2 verification.
 */

import type { PlanName, BillingInterval } from '@/lib/stripe'
import { PLAN_MINUTES } from '@/lib/stripe'

// ---------- Product ID → Plan mapping ----------

type AppleProductInfo = {
  plan: PlanName
  interval: BillingInterval
  minutesPerMonth: number
}

const APPLE_PRODUCT_MAP: Record<string, AppleProductInfo> = {
  'io.eigo.app.light.monthly': { plan: 'light', interval: 'monthly', minutesPerMonth: PLAN_MINUTES.light },
  'io.eigo.app.light.yearly': { plan: 'light', interval: 'yearly', minutesPerMonth: PLAN_MINUTES.light },
  'io.eigo.app.standard.monthly': { plan: 'standard', interval: 'monthly', minutesPerMonth: PLAN_MINUTES.standard },
  'io.eigo.app.standard.yearly': { plan: 'standard', interval: 'yearly', minutesPerMonth: PLAN_MINUTES.standard },
}

export function parseAppleProductId(productId: string): AppleProductInfo | null {
  return APPLE_PRODUCT_MAP[productId] || null
}

// ---------- App Store Server API v2 ----------

const APPLE_PRODUCTION_URL = 'https://api.storekit.itunes.apple.com'
const APPLE_SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com'

/**
 * Verify a StoreKit 2 transaction with Apple's App Store Server API v2.
 * Returns the decoded transaction info or null if invalid.
 */
export async function verifyTransaction(
  transactionId: string,
  environment: 'Production' | 'Sandbox' = 'Production',
): Promise<AppleTransactionInfo | null> {
  const baseUrl = environment === 'Sandbox' ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL
  const token = await getAppStoreServerToken()

  try {
    const res = await fetch(`${baseUrl}/inApps/v1/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      console.error(`[Apple IAP] Transaction verification failed: ${res.status} ${res.statusText}`)
      return null
    }

    const data = await res.json()
    // The response contains a signedTransactionInfo JWS — decode the payload
    const decoded = decodeJWS(data.signedTransactionInfo)

    if (!decoded) return null

    // Validate bundle ID
    if (decoded.bundleId !== 'io.eigo.app') {
      console.error(`[Apple IAP] Invalid bundle ID: ${decoded.bundleId}`)
      return null
    }

    return decoded
  } catch (err) {
    console.error('[Apple IAP] Verification error:', err)
    return null
  }
}

/**
 * Decode a JWS (JSON Web Signature) token from Apple.
 * In production, you should verify the signature against Apple's certificates.
 * For now, we decode the payload (base64url-encoded JSON).
 */
export function decodeJWS(jws: string): AppleTransactionInfo | null {
  try {
    const parts = jws.split('.')
    if (parts.length !== 3) return null
    // Payload is the second part, base64url encoded
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(payload) as AppleTransactionInfo
  } catch {
    return null
  }
}

/**
 * Generate an App Store Server API JWT.
 * Requires these env vars:
 *   - APPLE_KEY_ID: Key ID from App Store Connect
 *   - APPLE_ISSUER_ID: Issuer ID from App Store Connect
 *   - APPLE_PRIVATE_KEY: Contents of the .p8 private key file
 */
async function getAppStoreServerToken(): Promise<string> {
  const keyId = process.env.APPLE_KEY_ID
  const issuerId = process.env.APPLE_ISSUER_ID
  const privateKey = process.env.APPLE_PRIVATE_KEY

  if (!keyId || !issuerId || !privateKey) {
    throw new Error('Missing Apple App Store Server API credentials (APPLE_KEY_ID, APPLE_ISSUER_ID, APPLE_PRIVATE_KEY)')
  }

  // Build JWT header + payload
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 3600, // 1 hour
    aud: 'appstoreconnect-v1',
    bid: 'io.eigo.app',
  }

  // Sign with ES256 using Node crypto
  const { createSign, createPrivateKey } = await import('crypto')

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${headerB64}.${payloadB64}`

  // The private key from env var may have escaped newlines or be base64-only
  let formattedKey = privateKey.replace(/\\n/g, '\n')

  // If the key doesn't have PEM headers, wrap it
  if (!formattedKey.includes('-----BEGIN')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey.trim()}\n-----END PRIVATE KEY-----`
  }

  // Parse the key explicitly as PKCS8 EC key
  const keyObject = createPrivateKey({
    key: formattedKey,
    format: 'pem',
  })

  const sign = createSign('SHA256')
  sign.update(signingInput)
  const derSignature = sign.sign(keyObject)

  // Node's sign() returns DER-encoded ECDSA signature, but JWT needs raw r||s format
  // DER: 0x30 [len] 0x02 [rlen] [r] 0x02 [slen] [s]
  const derToBuf = (der: Buffer): Buffer => {
    let offset = 2 // skip 0x30 + length
    if (der[1] & 0x80) offset += (der[1] & 0x7f) // long form length

    // Read r
    offset++ // skip 0x02
    let rLen = der[offset++]
    const r = der.subarray(offset, offset + rLen)
    offset += rLen

    // Read s
    offset++ // skip 0x02
    let sLen = der[offset++]
    const s = der.subarray(offset, offset + sLen)

    // Pad/trim to 32 bytes each (P-256)
    const rPad = Buffer.alloc(32)
    r.copy(rPad, Math.max(0, 32 - r.length), Math.max(0, r.length - 32))
    const sPad = Buffer.alloc(32)
    s.copy(sPad, Math.max(0, 32 - s.length), Math.max(0, s.length - 32))

    return Buffer.concat([rPad, sPad])
  }

  const rawSignature = derToBuf(derSignature)
  const signature = rawSignature.toString('base64url')

  return `${signingInput}.${signature}`
}

// ---------- Types ----------

export type AppleTransactionInfo = {
  transactionId: string
  originalTransactionId: string
  bundleId: string
  productId: string
  purchaseDate: number
  originalPurchaseDate: number
  expiresDate?: number
  type: 'Auto-Renewable Subscription' | 'Non-Consumable' | 'Consumable' | 'Non-Renewing Subscription'
  environment: 'Production' | 'Sandbox'
  storefrontCountryCode?: string
}

export type AppleNotificationPayload = {
  notificationType: string
  subtype?: string
  data: {
    signedTransactionInfo: string
    signedRenewalInfo?: string
    environment: 'Production' | 'Sandbox'
    bundleId: string
  }
  version: string
  signedDate: number
}
