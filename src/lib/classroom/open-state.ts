import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClassroomContext } from './server'

/**
 * What's open in a classroom: ONE answer, used by everything that needs it (the join, the AI tutor's brief on
 * every (re)connect), so the student's screen and the AI tutor can never disagree.
 *
 *  - once the lesson has started, the live session decides: a course + lesson, or nothing (= free talk, also after
 *    the course was closed). It never falls back to what was booked.
 *  - before it starts, what was booked (resuming where the student left off in that lesson). That is saved to the
 *    session straight away, so from the first moment the session knows the course is open, even if nobody moves
 *    a slide (before: closing it, or a reconnect, found "nothing open" and the AI tutor got the booked lesson).
 */
export type OpenLessonRef = { courseId: string; lessonId: string; slideId: string | null }

export async function resolveOpen(
  db: SupabaseClient,
  booking: ClassroomContext['booking'],
  session: ClassroomContext['session'],
): Promise<OpenLessonRef | null> {
  if (session?.course_id && session.lesson_id) {
    return { courseId: session.course_id, lessonId: session.lesson_id, slideId: (session.state as { slideId?: string | null } | null)?.slideId ?? null }
  }
  // started, or the course was closed (state.closed): free talk. Never the booked lesson again.
  if (session?.started_at || (session?.state as { closed?: boolean } | null)?.closed || !booking.slide_course_id || !booking.slide_lesson_id) return null

  const { data: prog } = await db
    .from('slide_course_progress')
    .select('lesson_id, slide_id, completed_lesson_ids')
    .eq('user_id', booking.user_id)
    .eq('course_id', booking.slide_course_id)
    .maybeSingle()
  const resume =
    prog?.lesson_id === booking.slide_lesson_id && !((prog.completed_lesson_ids as string[] | null) ?? []).includes(booking.slide_lesson_id)
      ? (prog.slide_id as string | null)
      : null
  const open = { courseId: booking.slide_course_id, lessonId: booking.slide_lesson_id, slideId: resume }

  // remember it in the session (only if nothing is recorded yet: never overwrite a live change)
  await db.from('classroom_sessions').upsert({ booking_id: booking.id }, { onConflict: 'booking_id', ignoreDuplicates: true })
  const { data: cur } = await db.from('classroom_sessions').select('state, course_id, started_at').eq('booking_id', booking.id).maybeSingle()
  if (cur && !cur.course_id && !cur.started_at) {
    const prev = (cur.state as Record<string, unknown> | null) ?? {}
    await db
      .from('classroom_sessions')
      .update({ course_id: open.courseId, lesson_id: open.lessonId, state: { ...prev, slideId: open.slideId }, updated_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .is('course_id', null)
  }
  return open
}
