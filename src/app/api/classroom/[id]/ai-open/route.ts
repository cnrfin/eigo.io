import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { findLesson, loadCourse } from '@/lib/classroom/courses'
import { ensureSession, json, loadClassroom } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/ai-open   { courseId, lessonId }  → { open: { courseId, lessonId, slideId }, title }
 *
 * AI lessons: opens a course lesson when the AI tutor says it will (or calls open_lesson). Works out which
 * lesson and slide to open (courseId "" = the student's current course; lessonId "" = where they left off in
 * that course, "#N" = lesson N), saves it
 * as what's open in the classroom, and returns it so the page can show it.
 * The page then renews the GPT-Live session, which reads the new lesson plan.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })

  let body: { courseId?: string; lessonId?: string }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const db = getSupabaseAdmin()
  let courseId = String(body.courseId ?? '').trim()
  if (!courseId) {
    // the student's current course: this lesson's, else their latest booking with a course, else the course
    // they last made progress in
    const { data: last } = await db
      .from('bookings')
      .select('slide_course_id')
      .eq('user_id', booking.user_id)
      .not('slide_course_id', 'is', null)
      .neq('status', 'cancelled')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    const { data: prog } = last?.slide_course_id ? { data: null } : await db.from('slide_course_progress').select('course_id').eq('user_id', booking.user_id).limit(1).maybeSingle()
    courseId = (booking.slide_course_id ?? last?.slide_course_id ?? prog?.course_id ?? '') as string
    if (!courseId) return json(404, { error: 'The student has no course yet.' })
  }
  const c = await loadCourse(courseId)
  if (!c) return json(404, { error: 'No published course with that id.' })
  const lessons = c.course.units.flatMap((u) => u.lessons)
  if (!lessons.length) return json(404, { error: 'That course has no lessons yet.' })

  const { data: prog } = await db
    .from('slide_course_progress')
    .select('lesson_id, slide_id, completed_lesson_ids')
    .eq('user_id', booking.user_id)
    .eq('course_id', courseId)
    .maybeSingle()

  let lessonId = String(body.lessonId ?? '').trim()
  const nth = /^#(\d{1,3})$/.exec(lessonId)
  if (nth) lessonId = lessons[Math.min(lessons.length, Math.max(1, Number(nth[1]))) - 1].id
  if (!lessonId) {
    // continue where they left off: the saved lesson, else the first one not completed
    const done = new Set<string>((prog?.completed_lesson_ids as string[] | null) ?? [])
    lessonId = (prog?.lesson_id as string | null) ?? lessons.find((l) => !done.has(l.id))?.id ?? lessons[0].id
  }
  const found = findLesson(c.course, lessonId)
  if (!found) return json(404, { error: 'No lesson with that id in this course.' })
  const slides = found.lesson.slides
  const savedSlide = prog?.lesson_id === found.lesson.id ? (prog?.slide_id as string | null) : null
  // a lesson finished last time starts again from the top
  const slideId = savedSlide && slides.some((s) => s.id === savedSlide) && slides[slides.length - 1]?.id !== savedSlide ? savedSlide : (slides[0]?.id ?? null)

  await ensureSession(booking.id)
  const { data: cur } = await db.from('classroom_sessions').select('state').eq('booking_id', booking.id).maybeSingle()
  const prev = (cur?.state as Record<string, unknown> | null) ?? {}
  await db
    .from('classroom_sessions')
    .update({ course_id: courseId, lesson_id: found.lesson.id, used_course: true, state: { ...prev, slideId, whiteboard: false }, updated_at: new Date().toISOString() })
    .eq('booking_id', booking.id)

  const n = slides.findIndex((s) => s.id === slideId) + 1
  return json(200, {
    open: { courseId, lessonId: found.lesson.id, slideId },
    title: `${c.course.title}, lesson ${found.number}: ${found.lesson.title}${n > 1 ? ` (from slide ${n} of ${slides.length})` : ''}`,
  })
}
