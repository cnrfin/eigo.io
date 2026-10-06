import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Course } from '@/lib/slides/types'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * GET /api/classroom/[id]/library   (teacher only)
 * Published courses with their units and lessons (no slides), and this
 * student's progress in each, for the Library dialog.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  if (ctx.access.role !== 'teacher') return json(403, { error: 'Teacher only' })

  const db = getSupabaseAdmin()
  const [{ data: rows }, { data: progress }] = await Promise.all([
    db.from('slide_courses').select('id, title, level, course').eq('published', true).order('title'),
    db
      .from('slide_course_progress')
      .select('course_id, lesson_id, slide_id, completed_lesson_ids')
      .eq('user_id', ctx.booking.user_id),
  ])

  const courses = (rows ?? []).map((r) => {
    const c = r.course as Course
    return {
      id: r.id as string,
      title: r.title as string,
      level: (r.level as string) || '',
      units: c.units.map((u) => ({
        title: u.title,
        lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, slides: l.slides.length })),
      })),
    }
  })

  return json(200, {
    courses,
    progress: Object.fromEntries(
      (progress ?? []).map((p) => [
        p.course_id,
        { lessonId: p.lesson_id, slideId: p.slide_id, completed: p.completed_lesson_ids ?? [] },
      ]),
    ),
  })
}
