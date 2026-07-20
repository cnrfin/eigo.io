import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/courses/stats  (public, no auth)
 *
 * Live content stats for the v2 landing's 3-column block:
 *   lessons      — lessons across all published courses
 *   mockExams    — published mock test forms (TOEIC / IELTS / EIKEN / …)
 *   studyMinutes — lessons × 10min  +  Σ(mock-exam time limits)
 * Read via the service-role client so anonymous visitors can render it.
 */
export const revalidate = 3600

const MINUTES_PER_LESSON = 10

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Lessons in published courses only.
    const { data: pubCourses } = await supabase.from('courses').select('id').eq('published', true)
    const courseIds = (pubCourses ?? []).map(c => c.id)
    const { data: levels } = courseIds.length
      ? await supabase.from('course_levels').select('id').in('course_id', courseIds)
      : { data: [] }
    const levelIds = (levels ?? []).map(l => l.id)
    const { count: lessons } = levelIds.length
      ? await supabase.from('lessons').select('*', { count: 'exact', head: true }).in('level_id', levelIds)
      : { count: 0 }

    // Published mock exams + their total time.
    const { data: forms } = await supabase.from('test_forms').select('time_limit_seconds').eq('published', true)
    const mockExams = forms?.length ?? 0
    const mockMinutes = Math.round((forms ?? []).reduce((a, f) => a + (f.time_limit_seconds ?? 0), 0) / 60)

    const lessonCount = lessons ?? 0
    const studyMinutes = lessonCount * MINUTES_PER_LESSON + mockMinutes

    return NextResponse.json({ lessons: lessonCount, mockExams, studyMinutes })
  } catch (e) {
    console.error('Failed to load course stats:', e)
    return NextResponse.json({ error: 'Could not load stats' }, { status: 500 })
  }
}
