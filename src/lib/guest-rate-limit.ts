import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Rate limiting for the landing funnel's anonymous (non-logged-in) users.
 *
 * The funnel mints an anonymous Supabase user per guest; hCaptcha throttles the
 * sign-in itself, but not the calls that follow. The pronunciation grader in
 * particular spends money (Azure assessment + occasional LLM coaching) on every
 * request. These helpers put a fixed-window cap in front of those endpoints,
 * keyed on BOTH the user id (stops one guest hammering) and the client IP
 * (stops a script rotating cheap anon users from one address).
 *
 * Backed by the guest_rate_limit_hit RPC (see supabase/add-guest-rate-limit.sql).
 * IMPORTANT: that migration must be applied in Supabase for limits to take
 * effect. Until it is, underRateLimit() fails OPEN (returns allowed) so nothing
 * breaks — the limits simply aren't enforced yet.
 */

/** Best-effort client IP from the proxy headers. Falls back to 'unknown', which
 *  buckets all header-less callers together (fine — it only over-restricts). */
export function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** One atomic hit against the fixed-window counter. Returns true when the caller
 *  is still under the limit. Fails OPEN on any error (missing migration, DB
 *  hiccup) so a monitoring/infra problem never blocks real users. */
export async function underRateLimit(
  subject: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('guest_rate_limit_hit', {
      p_subject: subject,
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('[guest-rate-limit] rpc failed, allowing:', error.message)
      return true
    }
    return data !== false
  } catch (e) {
    console.error('[guest-rate-limit] error, allowing:', e)
    return true
  }
}

/** A `[limit, windowSeconds]` pair. */
export type RateRule = [limit: number, windowSeconds: number]

/**
 * Enforce per-user and per-IP caps for an action. Returns a ready-to-return 429
 * NextResponse when either cap is exceeded, or null when the request may proceed.
 * Both counters are always incremented (so hammering one dimension can't dodge
 * the other).
 */
export async function guestRateLimit(
  request: NextRequest,
  userId: string,
  action: string,
  rules: { perUser: RateRule; perIp: RateRule },
): Promise<NextResponse | null> {
  const [userLimit, userWindow] = rules.perUser
  const [ipLimit, ipWindow] = rules.perIp
  const ip = clientIp(request)

  const [userOk, ipOk] = await Promise.all([
    underRateLimit(`user:${userId}`, action, userLimit, userWindow),
    underRateLimit(`ip:${ip}`, action, ipLimit, ipWindow),
  ])

  if (!userOk || !ipOk) {
    return NextResponse.json(
      { error: 'Too many attempts. Please slow down and try again in a little while.', code: 'rate_limited' },
      { status: 429 },
    )
  }
  return null
}
