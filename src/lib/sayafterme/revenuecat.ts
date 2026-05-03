/**
 * RevenueCat REST API helper for Say After Me's server-side
 * entitlement check.
 *
 * Why this exists:
 *   The Say After Me iOS app is anonymous — there is no Supabase user
 *   tied to a generation request. Identity comes from the RevenueCat
 *   App User ID, which the client sends in the `X-RC-User-Id` header.
 *   Before we burn an OpenAI + ElevenLabs call (and a slot of the
 *   user's monthly cap), we need to confirm that the user actually
 *   has the `pro` entitlement active. We can't trust the client to
 *   tell us — they could spoof the header — so we ask RevenueCat
 *   directly via its REST API.
 *
 * Contract:
 *   - `verifyProEntitlement(rcUserId)` returns `{ active: true }` only
 *     if RevenueCat reports a non-expired `pro` entitlement.
 *   - All other cases (no such user, entitlement missing, expired,
 *     network failure, RC outage) return `{ active: false }` with a
 *     `reason` for logging. We FAIL CLOSED — when in doubt, no Pro.
 *
 * Why fail-closed:
 *   The downstream cost (ElevenLabs TTS) is real money, and the cap
 *   itself is a Pro-only benefit. Letting a user through on a flaky
 *   RC response would be a free-Pro exploit. The trade-off is that
 *   if RC is briefly down, legitimate Pro users get a temporary
 *   "couldn't verify your subscription" — annoying but rare and
 *   reversible. Worth the safety.
 */

const RC_API_BASE = 'https://api.revenuecat.com/v1'

/**
 * Entitlement ID configured in the RevenueCat dashboard. Must match
 * the entitlement that the audio-timer app's `lib/purchases.ts`
 * checks against (currently 'pro' — see ENTITLEMENTS.pro there).
 */
const PRO_ENTITLEMENT_ID = 'pro'

/**
 * Network timeout for the RC call. Short enough that a stalled RC
 * doesn't pin the whole /generate request, long enough to absorb
 * normal latency.
 */
const RC_TIMEOUT_MS = 5000

export type EntitlementCheckResult =
  | { active: true; expiresAt: string | null }
  | { active: false; reason: EntitlementDenyReason }

export type EntitlementDenyReason =
  | 'no_such_user'        // 404 — RC has never seen this app user id
  | 'entitlement_missing' // user exists but no `pro` entitlement
  | 'entitlement_expired' // had pro but expires_date is in the past
  | 'rc_unavailable'      // network / 5xx / timeout — fail closed
  | 'rc_misconfigured'    // 401 — REVENUECAT_SECRET_KEY is wrong/missing

/**
 * The relevant subset of RevenueCat's /subscribers response. RC
 * returns much more than this; we only parse what the gate needs.
 */
interface RCSubscriberResponse {
  subscriber: {
    entitlements?: Record<
      string,
      {
        // ISO 8601, or null for non-expiring (lifetime) entitlements.
        expires_date: string | null
        product_identifier?: string
        purchase_date?: string
      }
    >
  }
}

/**
 * Server-side entitlement gate. Call this BEFORE incrementing the
 * usage counter or hitting any paid downstream API.
 *
 * @param rcUserId  The RevenueCat App User ID from the request header.
 * @returns         An EntitlementCheckResult; `active: true` means the
 *                  request may proceed.
 */
export async function verifyProEntitlement(
  rcUserId: string,
): Promise<EntitlementCheckResult> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY
  if (!secretKey) {
    // Server is mis-configured; treat as deny so we don't accidentally
    // hand out Pro for free in a half-deployed state.
    console.error('[sayafterme/rc] REVENUECAT_SECRET_KEY not set')
    return { active: false, reason: 'rc_misconfigured' }
  }

  // Encode the user id into the path. RC ids can contain characters
  // that need URL-encoding (the SDK uses anonymous ids like
  // `$RCAnonymousID:abc...` for non-logged-in users — the `$` and `:`
  // both need escaping).
  const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(rcUserId)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RC_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
  } catch (err) {
    // AbortError or network failure. Fail closed.
    console.error('[sayafterme/rc] fetch failed:', err)
    return { active: false, reason: 'rc_unavailable' }
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 401) {
    console.error('[sayafterme/rc] 401 from RevenueCat — secret key invalid')
    return { active: false, reason: 'rc_misconfigured' }
  }

  // RC returns 404 for unknown app user ids. The client might just be a
  // brand-new anonymous user that has never made a purchase — that's
  // not a server error, just a "no Pro" answer.
  if (response.status === 404) {
    return { active: false, reason: 'no_such_user' }
  }

  if (!response.ok) {
    console.error(
      '[sayafterme/rc] non-OK from RevenueCat:',
      response.status,
      response.statusText,
    )
    return { active: false, reason: 'rc_unavailable' }
  }

  let body: RCSubscriberResponse
  try {
    body = (await response.json()) as RCSubscriberResponse
  } catch (err) {
    console.error('[sayafterme/rc] JSON parse failed:', err)
    return { active: false, reason: 'rc_unavailable' }
  }

  const ent = body.subscriber?.entitlements?.[PRO_ENTITLEMENT_ID]
  if (!ent) {
    return { active: false, reason: 'entitlement_missing' }
  }

  // expires_date is null for lifetime entitlements, ISO 8601 otherwise.
  // Active when null (never expires) or strictly in the future.
  if (ent.expires_date === null) {
    return { active: true, expiresAt: null }
  }

  const expiresMs = Date.parse(ent.expires_date)
  if (Number.isNaN(expiresMs)) {
    console.error(
      '[sayafterme/rc] invalid expires_date from RevenueCat:',
      ent.expires_date,
    )
    return { active: false, reason: 'rc_unavailable' }
  }

  if (expiresMs <= Date.now()) {
    return { active: false, reason: 'entitlement_expired' }
  }

  return { active: true, expiresAt: ent.expires_date }
}
