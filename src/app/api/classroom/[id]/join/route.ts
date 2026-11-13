import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { serializeWindow } from '@/lib/classroom/booking-window'
import { json, loadClassroom, personName, publicSession, uiLangFor, wherebyParts } from '@/lib/classroom/server'

const ADMIN_EMAIL = 'cnrfin93@gmail.com'

/**
 * GET /api/classroom/[id]/join
 * Everything the classroom needs to start: role, Whereby room (+ host key for
 * the teacher), booking window, live session, names, languages, the whiteboard
 * and the chat so far.
 * 403 { reason, window, uiLang } when it's too early, over, cancelled or not
 * this user's lesson.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking, access, session, user } = ctx
  const role = access.role

  const { roomUrl, roomKey } = wherebyParts(booking)
  if (!roomUrl) return json(409, { reason: 'no_room', uiLang: await uiLangFor(user.id, ctx.isAdmin) })

  const db = getSupabaseAdmin()
  const [{ data: student }, { data: teacher }, { data: inkRows }] = await Promise.all([
    db.from('profiles').select('display_name, email, preferred_language, native_language').eq('id', booking.user_id).maybeSingle(),
    db.from('profiles').select('display_name, email').eq('email', ADMIN_EMAIL).maybeSingle(),
    db.from('classroom_ink').select('surface, items').eq('booking_id', booking.id),
  ])
  const studentName = personName(student?.display_name, student?.email, 'Student')
  const teacherName = personName(teacher?.display_name, teacher?.email, 'Connor')

  return json(200, {
    bookingId: booking.id,
    role,
    roomUrl,
    roomKey: role === 'teacher' ? roomKey : null,
    window: serializeWindow(access.window),
    durationMinutes: booking.duration_minutes,
    session: publicSession(session),
    me: { name: role === 'teacher' ? teacherName : studentName },
    other: { name: role === 'teacher' ? studentName : teacherName },
    uiLang: role === 'teacher' ? 'en' : student?.preferred_language === 'en' ? 'en' : 'ja',
    nativeLang: student?.native_language || 'ja',
    whiteboard: !!(session?.state as { whiteboard?: boolean } | null)?.whiteboard,
    studentDraw: (session?.state as { studentDraw?: boolean } | null)?.studentDraw !== false,
    ink: Object.fromEntries((inkRows ?? []).map((r) => [r.surface, r.items])),
    chat: Array.isArray(booking.chat_log) ? booking.chat_log : [],
    serverNow: new Date().toISOString(),
  })
}
