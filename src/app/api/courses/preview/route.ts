import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/courses/preview  (public, no auth)
 *
 * Lightweight read for the v2 landing "course preview" section. Returns the
 * three showcased courses (TOEIC / IELTS / Pronunciation) with their first
 * level's lesson titles (en + ja) and the mascot rig that teaches them. Only
 * published, non-sensitive title data is exposed — read via the service-role
 * client so unauthenticated visitors can render the preview. Cached at the
 * edge for an hour since course titles change rarely.
 */
export const revalidate = 3600

// Showcase order + the mascot rig per course. teri teaches TOEIC (and is the
// app's default teacher), earl teaches IELTS, pron101 fronts the pronunciation
// course. Swap any `mascot` here to re-cast a course's teacher.
const SHOWCASE: { key: string; slug: string; mascot: string }[] = [
  { key: 'pron', slug: 'pronunciation', mascot: '/rive/pron101.riv' },
  { key: 'ielts', slug: 'ielts-prep', mascot: '/rive/earl.riv' },
  { key: 'toeic', slug: 'toeic-prep', mascot: '/rive/teri.riv' },
]

const LESSON_LIMIT = 5

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const slugs = SHOWCASE.map(s => s.slug)

    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, slug, exam_slug, title, title_ja')
      .in('slug', slugs)
      .eq('published', true)
    if (error) throw error
    if (!courses?.length) return NextResponse.json({ courses: [] })

    const courseIds = courses.map(c => c.id)
    const { data: levels } = await supabase
      .from('course_levels')
      .select('id, course_id, order_index, title, title_ja')
      .in('course_id', courseIds)
      .order('order_index')

    // First level per course.
    const firstLevelByCourse = new Map<string, NonNullable<typeof levels>[number]>()
    for (const lv of levels ?? []) {
      if (!firstLevelByCourse.has(lv.course_id)) firstLevelByCourse.set(lv.course_id, lv)
    }
    const levelIds = [...firstLevelByCourse.values()].map(l => l.id)

    const { data: lessons } = levelIds.length
      ? await supabase
          .from('lessons')
          .select('level_id, order_index, title, title_ja')
          .in('level_id', levelIds)
          .order('order_index')
      : { data: [] }

    // Shape in showcase order, dropping any course that isn't published/seeded.
    const shaped = SHOWCASE.flatMap(s => {
      const course = courses.find(c => c.slug === s.slug)
      if (!course) return []
      const level = firstLevelByCourse.get(course.id)
      const lessonList = (lessons ?? [])
        .filter(l => l.level_id === level?.id)
        .slice(0, LESSON_LIMIT)
        .map(l => ({ title: l.title, title_ja: l.title_ja }))
      return [{
        key: s.key,
        slug: course.slug,
        examSlug: course.exam_slug,
        title: course.title,
        title_ja: course.title_ja,
        mascot: s.mascot,
        level: level ? { title: level.title, title_ja: level.title_ja } : null,
        lessons: lessonList,
      }]
    })

    return NextResponse.json({ courses: shaped })
  } catch (e) {
    console.error('Failed to load course preview:', e)
    return NextResponse.json({ error: 'Could not load course preview' }, { status: 500 })
  }
}
