import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Course, Lesson } from '@/lib/slides/types'

/** Server-side access to published slide courses (table slide_courses, bucket slide-courses). */

export const COURSE_BUCKET = 'slide-courses'

export function assetBaseFor(courseId: string) {
  return getSupabaseAdmin().storage.from(COURSE_BUCKET).getPublicUrl(`${courseId}/`).data.publicUrl
}

export async function loadCourse(courseId: string): Promise<{ course: Course; version: number } | null> {
  const { data } = await getSupabaseAdmin()
    .from('slide_courses')
    .select('course, version, published')
    .eq('id', courseId)
    .maybeSingle()
  if (!data || !data.published) return null
  return { course: data.course as Course, version: data.version as number }
}

/** Lesson by id, with its 1-based number across the whole course. */
export function findLesson(course: Course, lessonId: string | null | undefined): { lesson: Lesson; number: number } | null {
  if (!lessonId) return null
  let n = 0
  for (const u of course.units)
    for (const l of u.lessons) {
      n++
      if (l.id === lessonId) return { lesson: l, number: n }
    }
  return null
}
