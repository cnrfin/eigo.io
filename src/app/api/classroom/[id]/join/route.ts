import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { serializeWindow } from '@/lib/classroom/booking-window'
import { json, loadClassroom, personName, publicSession, uiLangFor, wherebyParts } from '@/lib/classroom/server'
import type { Course } from '@/lib/slides/types'

const ADMIN_EMAIL = 'cnrfin93@gmail.com'

/**
 * GET /api/classroom/[id]/join
 * Everything the classroom needs to start: role, Whereby room (+ host key for
 * the teacher), booking window, live session, names, languages, lesson title
 * and the chat so far. 403 { reason, window, uiLang } when it's too early,
 * over, cancelled or not this user's lesson.
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
  const [{ data: student }, { data: teacher }, courseRes] = await Promise.all([
    db.from('profiles').select('display_name, email, preferred_language, native_language').eq('id', booking.user_id).maybeSingle(),
    db.from('profiles').select('display_name, email').eq('email', ADMIN_EMAIL).maybeSingle(),
    booking.slide_course_id
      ? db.from('slide_courses').select('title, title_ja, course').eq('id', booking.slide_course_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const studentName = personName(student?.display_name, student?.email, 'Student')
  const teacherName = personName(teacher?.display_name, teacher?.email, 'Connor')

  // Lesson title (phase 2 loads the slides themselves)
  let lesson: { courseTitle: string; lessonTitle: string; number: number } | null = null
  const course = (courseRes.data?.course ?? null) as Course | null
  if (course && booking.slide_lesson_id) {
    let n = 0
    for (const u of course.units)
      for (const l of u.lessons) {
        n++
        if (l.id === booking.slide_lesson_id) lesson = { courseTitle: course.title, lessonTitle: l.title, number: n }
      }
  }

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
    lesson,
    chat: Array.isArray(booking.chat_log) ? booking.chat_log : [],
    serverNow: new Date().toISOString(),
  })
}
