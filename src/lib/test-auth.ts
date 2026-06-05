import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifySupabaseToken, type JwtUser } from '@/lib/supabase-jwt'

/**
 * Shared bearer-token authentication for the practice-test API routes.
 *
 * Verifies the caller's JWT (locally when SUPABASE_JWT_SECRET is set — see
 * supabase-jwt.ts — with a network fallback), then returns a SERVICE-ROLE
 * client for all DB access. The service-role client deliberately bypasses
 * RLS — the answer-bearing test tables are service-role-only, so every
 * read/write of test content must go through routes that use this helper and
 * strip answers before responding.
 */
export type AuthResult =
  | { ok: true; user: JwtUser; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

export async function authenticate(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const verified = await verifySupabaseToken(authHeader.replace('Bearer ', ''))
  if (!verified.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  return { ok: true, user: verified.user, supabase }
}
