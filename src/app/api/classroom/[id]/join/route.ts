import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { serializeWindow } from '@/lib/classroom/booking-window'
import { findLesson, loadCourse } from '@/lib/classroom/courses'
import { resolveOpen } from '@/lib/classroom/open-state'
import { json, loadClassroom, personName, publicSession, uiLangFor, wherebyParts } from '@/lib/classroom/server'

const ADMIN_EMAIL = 'cnrfin93@gmail.com'

/** The name, colour and cheeks the student gave their AI tutor (or the defaults), and whether this is their free welcome call. */
async function aiTutor(userId: string, bookingId: string) {
  const db = getSupabaseAdmin()
  const [{ data }, { data: prof }] = await Promise.all([
    db.from('ai_tutor_profiles').select('settings').eq('user_id', userId).maybeSingle(),
    db.from('profiles').select('ai_trial_booking_id').eq('id', userId).maybeSingle(),
  ])
  const st = data?.settings as { tutorName?: string; orbColor?: string; blush?: boolean } | null
  return {
    name: st?.tutorName?.trim() || 'AI tutor',
    color: typeof st?.orbColor === 'string' ? st.orbColor : null,
    blush: st?.blush !== false,
    welcome: prof?.ai_trial_booking_id === bookingId,
  }
}

/**
 * GET /api/classroom/[id]/join
 * Everything the classroom needs to start: role, Whereby room (+ host key for
 * the teacher), booking window, live session, names, languages, the course /
 * lesson / slide currently open (or null = free talk) and the chat so far.
 * 403 { reason, window, uiLang } when it's too early, over, cancelled or not
 * this user's lesson.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking, access, session, user } = ctx
  const role = access.role

  const ai = booking.lesson_kind === 'ai'
  const { roomUrl, roomKey } = wherebyParts(booking)
  if (!roomUrl && !ai) return json(409, { reason: 'no_room', uiLang: await uiLangFor(user.id, ctx.isAdmin) })

  const db = getSupabaseAdmin()
  const [{ data: student }, { data: teacher }, { data: inkRows }, { data: actRows }] = await Promise.all([
    db.from('profiles').select('display_name, email, preferred_language, native_language').eq('id', booking.user_id).maybeSingle(),
    db.from('profiles').select('display_name, email').eq('email', ADMIN_EMAIL).maybeSingle(),
    db.from('classroom_ink').select('surface, items').eq('booking_id', booking.id),
    db.from('classroom_activity').select('block_id, state').eq('booking_id', booking.id),
  ])
  const studentName = personName(student?.display_name, student?.email, 'Student')
  const teacherName = personName(teacher?.display_name, teacher?.email, 'Connor')

  // What's open: the live session wins (the teacher may have changed it); otherwise
  // what was booked, starting where the student left off in that lesson.
  let open = await resolveOpen(db, booking, session)

  let lesson: { courseTitle: string; lessonTitle: string; number: number } | null = null
  if (open) {
    const c = await loadCourse(open.courseId)
    const l = c ? findLesson(c.course, open.lessonId) : null
    if (c && l) lesson = { courseTitle: c.course.title, lessonTitle: l.lesson.title, number: l.number }
    else open = null // unpublished or deleted: fall back to free talk
  }

  const tutorInfo = ai ? await aiTutor(booking.user_id, booking.id) : null
  return json(200, {
    bookingId: booking.id,
    role,
    roomUrl,
    roomKey: role === 'teacher' ? roomKey : null,
    window: serializeWindow(access.window),
    durationMinutes: booking.duration_minutes,
    session: publicSession(session),
    me: { name: role === 'teacher' ? teacherName : studentName },
    other: { name: role === 'teacher' ? studentName : tutorInfo ? tutorInfo.name : teacherName },
    ai,
    aiColor: tutorInfo?.color ?? null,
    aiBlush: tutorInfo?.blush ?? true,
    aiWelcome: tutorInfo?.welcome ?? false,
    uiLang: role === 'teacher' ? 'en' : student?.preferred_language === 'en' ? 'en' : 'ja',
    nativeLang: student?.native_language || 'ja',
    open,
    lesson,
    whiteboard: !!(session?.state as { whiteboard?: boolean } | null)?.whiteboard,
    studentDraw: (session?.state as { studentDraw?: boolean } | null)?.studentDraw !== false,
    ink: Object.fromEntries((inkRows ?? []).map((r) => [r.surface, r.items])),
    activity: Object.fromEntries((actRows ?? []).map((r) => [r.block_id, r.state])),
    chat: Array.isArray(booking.chat_log) ? booking.chat_log : [],
    serverNow: new Date().toISOString(),
  })
}
