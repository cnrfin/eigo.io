import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Shared bearer-token authentication for the practice-test API routes.
 *
 * Mirrors the pattern used elsewhere in the app: verify the caller's JWT with
 * the anon client, then return a SERVICE-ROLE client for all DB access. The
 * service-role client deliberately bypasses RLS — the answer-bearing test
 * tables are service-role-only, so every read/write of test content must go
 * through routes that use this helper and strip answers before responding.
 */
export type AuthResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

export async function authenticate(request: NextRequest): Promise<AuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  return { ok: true, user, supabase }
}
