import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getUserPermissions } from '@/lib/user-permissions'
import { isAdminEmail } from '@/lib/admin-redirect'
import { normalizeSettings } from '@/lib/ai-tutor/settings'

/**
 * GET /api/ai-tutor/settings   → { enabled, settings }
 * PUT /api/ai-tutor/settings   { settings } → { settings }
 * The student's "マイAIチューター" settings. Always validated server-side
 * (normalizeSettings) before saving; they reach the tutor only through the
 * server-built session brief.
 */
async function auth(request: NextRequest) {
  const h = request.headers.get('Authorization') ?? ''
  if (!h.startsWith('Bearer ')) return null
  const v = await verifySupabaseToken(h.slice(7))
  return v.ok ? v.user : null
}

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  const perms = await getUserPermissions(db, user.id)
  const enabled = perms.ai_enabled || isAdminEmail(user.email)
  if (!enabled) return NextResponse.json({ enabled: false, settings: null })
  const { data } = await db.from('ai_tutor_profiles').select('settings').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ enabled: true, settings: normalizeSettings(data?.settings) })
}

export async function PUT(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { settings?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const settings = normalizeSettings(body.settings)
  const { error } = await getSupabaseAdmin()
    .from('ai_tutor_profiles')
    .upsert({ user_id: user.id, settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ settings })
}
