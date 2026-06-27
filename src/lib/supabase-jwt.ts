import { createClient } from '@supabase/supabase-js'
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader, errors as joseErrors } from 'jose'

/**
 * Local (no-network) verification of Supabase access tokens.
 *
 * Every API route used to call `supabase.auth.getUser(token)` — a full HTTP
 * roundtrip to the Supabase Auth server — before doing any work. Access
 * tokens are just JWTs, so we verify them in-process instead:
 *
 *   - New "JWT Signing Keys" projects (asymmetric ES256/RS256): verified
 *     against the project's public JWKS endpoint. jose fetches the keys once
 *     per server instance and caches them in memory, so verification is a
 *     local signature check. No configuration needed.
 *   - Legacy HS256 projects: verified with SUPABASE_JWT_SECRET if set.
 *
 * Fallback behaviour (so nothing ever breaks): if the keys can't be fetched,
 * the algorithm is unexpected, or HS256 is used without a configured secret,
 * we fall back to the old network check. Invalid/expired tokens always return
 * { ok: false } (-> 401 upstream).
 */
export type JwtUser = { id: string; email: string | null; isAnonymous: boolean }
export type JwtResult = { ok: true; user: JwtUser } | { ok: false }

const enc = new TextEncoder()

// Public keys for the project's JWT signing keys. Module-level so the cached
// keys survive across requests within a warm server instance.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    )
  }
  return jwks
}

// `sub` + role 'authenticated' distinguishes a user access token from the
// anon/service-role API keys (which are also JWTs).
function toResult(payload: { sub?: string; role?: unknown; email?: unknown; is_anonymous?: unknown }): JwtResult {
  if (typeof payload.sub === 'string' && payload.sub && payload.role === 'authenticated') {
    return { ok: true, user: { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null, isAnonymous: payload.is_anonymous === true } }
  }
  return { ok: false }
}

// Old behaviour: ask the Supabase Auth server.
async function networkCheck(token: string): Promise<JwtResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false }
  return { ok: true, user: { id: user.id, email: user.email ?? null, isAnonymous: user.is_anonymous === true } }
}

export async function verifySupabaseToken(token: string): Promise<JwtResult> {
  let alg: string | undefined
  try {
    alg = decodeProtectedHeader(token).alg
  } catch {
    return { ok: false } // not a JWT at all
  }

  // Legacy symmetric tokens — only verifiable locally with the shared secret.
  if (alg === 'HS256') {
    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) return networkCheck(token)
    try {
      const { payload } = await jwtVerify(token, enc.encode(secret), { algorithms: ['HS256'] })
      return toResult(payload)
    } catch {
      return { ok: false } // invalid signature or expired
    }
  }

  // New signing keys — verify against the cached public JWKS.
  try {
    const { payload } = await jwtVerify(token, getJwks(), { algorithms: ['ES256', 'RS256'] })
    return toResult(payload)
  } catch (err) {
    if (
      err instanceof joseErrors.JWTExpired ||
      err instanceof joseErrors.JWTClaimValidationFailed ||
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWSInvalid
    ) {
      return { ok: false } // genuinely bad token
    }
    // JWKS unreachable / no matching key (e.g. mid key-rotation) — fall back
    // to the auth server rather than rejecting a possibly-valid session.
    return networkCheck(token)
  }
}
