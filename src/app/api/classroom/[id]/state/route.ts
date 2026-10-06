import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { findLesson, loadCourse } from '@/lib/classroom/courses'
import { ensureSession, json, loadClassroom } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/state   (teacher only)
 *   { courseId, lessonId, slideId }   a course lesson is open on this slide
 *   { courseId: null }                 course closed (free talk)
 *
 * Saves what's open so a refresh or a dropped connection comes back to the
 * same slide, and records the student's place in the course
 * (slide_course_progress) so the next lesson picks up where this one stopped.
 * Reaching a lesson's last slide marks that lesson completed.
 * The client debounces calls; the live view is synced over Realtime.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  if (ctx.access.role !== 'teacher') return json(403, { error: 'Teacher only' })

  let body: { courseId?: string | null; lessonId?: string | null; slideId?: string | null }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }

  const db = getSupabaseAdmin()
  const now = new Date().toISOString()
  await ensureSession(ctx.booking.id)

  if (!body.courseId) {
    await db
      .from('classroom_sessions')
      .update({ course_id: null, lesson_id: null, state: {}, updated_at: now })
      .eq('booking_id', ctx.booking.id)
    return json(200, { ok: true })
  }

  const c = await loadCourse(body.courseId)
  const found = c ? findLesson(c.course, body.lessonId) : null
  if (!c || !found) return json(404, { error: 'Lesson not found' })
  const slides = found.lesson.slides
  const slideId = slides.some((s) => s.id === body.slideId) ? body.slideId! : slides[0]?.id ?? null

  await db
    .from('classroom_sessions')
    .update({
      course_id: body.courseId,
      lesson_id: found.lesson.id,
      used_course: true,
      state: { slideId },
      updated_at: now,
    })
    .eq('booking_id', ctx.booking.id)

  // The student's place in the course
  const { data: prog } = await db
    .from('slide_course_progress')
    .select('completed_lesson_ids')
    .eq('user_id', ctx.booking.user_id)
    .eq('course_id', body.courseId)
    .maybeSingle()
  const completed = new Set<string>(prog?.completed_lesson_ids ?? [])
  if (slideId && slides.length && slides[slides.length - 1].id === slideId) completed.add(found.lesson.id)
  await db.from('slide_course_progress').upsert(
    {
      user_id: ctx.booking.user_id,
      course_id: body.courseId,
      lesson_id: found.lesson.id,
      slide_id: slideId,
      completed_lesson_ids: [...completed],
      updated_at: now,
    },
    { onConflict: 'user_id,course_id' },
  )

  return json(200, { ok: true, slideId })
}
