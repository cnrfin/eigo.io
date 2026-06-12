import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

/**
 * Admin testing utilities (admin page → Testing tab). All actions operate on
 * the CALLING ADMIN's own account only — this is a self-service sandbox, not
 * a user-management tool.
 *
 * GET  → { simulate_free }
 * POST → { simulate_free: boolean }            toggle the free-user simulation
 *      | { action: 'clear_lesson_progress' }   wipe course progress + best scores
 *      | { action: 'clear_test_attempts' }     wipe mock-test attempts (cascades
 *                                              responses/scores)
 *      | { action: 'reset_nudges' }            re-arm the pron upsell + announce
 *                                              modals (clears their seen flags)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const supabase = getAdminSupabase()
  const { data } = await supabase.from('profiles').select('admin_simulate_free').eq('id', admin.id).maybeSingle()
  return NextResponse.json({ simulate_free: !!data?.admin_simulate_free })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const supabase = getAdminSupabase()

  let body: { simulate_free?: boolean; action?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (typeof body.simulate_free === 'boolean') {
    const { error } = await supabase.from('profiles').update({ admin_simulate_free: body.simulate_free }).eq('id', admin.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, simulate_free: body.simulate_free })
  }

  switch (body.action) {
    case 'clear_lesson_progress': {
      const { error, count } = await supabase.from('lesson_progress').delete({ count: 'exact' }).eq('user_id', admin.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, cleared: count ?? 0 })
    }
    case 'clear_test_attempts': {
      const { error, count } = await supabase.from('test_attempts').delete({ count: 'exact' }).eq('user_id', admin.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, cleared: count ?? 0 })
    }
    case 'reset_nudges': {
      const { error } = await supabase.from('profiles')
        .update({ pron_upsell_dismissed_at: null, pron_announce_seen_at: null })
        .eq('id', admin.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
