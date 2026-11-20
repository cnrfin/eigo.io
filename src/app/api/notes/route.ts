import { NextRequest, NextResponse } from 'next/server'
import { adminClient, fetchNotes, userFromRequest } from '@/lib/lesson-notes'

/**
 * GET /api/notes — the student's lesson notes (saved by the teacher from a course page).
 * ?count=unread returns only { unread } for the sidebar dot.
 */
export async function GET(request: NextRequest) {
  const user = await userFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = adminClient()

  if (new URL(request.url).searchParams.get('count') === 'unread') {
    const { count, error } = await db
      .from('lesson_notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('body', '')
      .is('seen_at', null)
    if (error) return NextResponse.json({ error: 'Could not load notes' }, { status: 500 })
    return NextResponse.json({ unread: count ?? 0 })
  }

  try {
    const notes = await fetchNotes(db, user.id)
    return NextResponse.json({ notes })
  } catch (e) {
    console.error('notes fetch failed:', e)
    return NextResponse.json({ error: 'Could not load notes' }, { status: 500 })
  }
}

/** PATCH /api/notes { id } — mark one of the student's own notes as read. */
export async function PATCH(request: NextRequest) {
  const user = await userFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminClient()
    .from('lesson_notes')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('seen_at', null)
  if (error) return NextResponse.json({ error: 'Could not update' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
