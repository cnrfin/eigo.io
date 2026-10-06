import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Course } from '@/lib/slides/types'
import { assetBaseFor } from './courses'

/**
 * The course catalog for the booking course picker.
 *
 * Only the light parts of each published course are sent to the browser
 * (titles, level, description, chips, scene pictures, lesson ids), never the
 * slides. The full course JSON is a few hundred KB, so the summary is worked
 * out once per published version and kept in memory.
 */

export type CatalogCourse = {
  id: string
  title: string
  titleJa: string
  description: string
  descriptionJa: string
  level: string
  series: string
  sortOrder: number
  chips: { ja: string[]; en: string[] }
  /** absolute image URLs, one per lesson that has a picture, in lesson order */
  scenes: string[]
  lessonIds: string[]
}

type Cached = { version: number; course: CatalogCourse }
const cache = new Map<string, Cached>()

const clean = (xs: unknown) => (Array.isArray(xs) ? xs.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [])

/** The first picture of every lesson (an image block, or a video's poster). */
function lessonScenes(course: Course): string[] {
  const out: string[] = []
  for (const u of course.units)
    for (const l of u.lessons) {
      let found = ''
      for (const s of l.slides) {
        for (const b of s.blocks as { type: string; src?: string; poster?: string }[]) {
          if (b.type === 'image' && b.src) found = b.src
          else if (b.type === 'media' && b.poster) found = b.poster
          if (found) break
        }
        if (found) break
      }
      if (found) out.push(found)
    }
  return out
}

export function summarize(course: Course, assetBase: string): CatalogCourse {
  const abs = (p: string) => (/^(https?:|data:)/.test(p) ? p : assetBase + p.replace(/^\/+/, ''))
  const scenes = lessonScenes(course)
  if (course.coverImage) scenes.unshift(course.coverImage)
  return {
    id: course.id,
    title: course.title,
    titleJa: course.titleJa || course.title,
    description: course.description || '',
    descriptionJa: course.descriptionJa || '',
    level: course.level || '',
    series: course.series?.trim() || course.category || 'eigo',
    sortOrder: typeof course.sortOrder === 'number' ? course.sortOrder : 999,
    chips: { ja: clean(course.chips?.ja), en: clean(course.chips?.en) },
    scenes: [...new Set(scenes)].slice(0, 16).map(abs),
    lessonIds: course.units.flatMap((u) => u.lessons.map((l) => l.id)),
  }
}

/** Every published course, sorted by series then order. */
export async function loadCatalog(): Promise<CatalogCourse[]> {
  const db = getSupabaseAdmin()
  const { data: rows } = await db.from('slide_courses').select('id, version').eq('published', true)
  const list = rows ?? []
  const stale = list.filter((r) => cache.get(r.id)?.version !== r.version).map((r) => r.id as string)
  if (stale.length) {
    const { data: full } = await db.from('slide_courses').select('id, version, course').in('id', stale)
    for (const r of full ?? [])
      cache.set(r.id, { version: r.version, course: summarize(r.course as Course, assetBaseFor(r.id)) })
  }
  return list
    .map((r) => cache.get(r.id)?.course)
    .filter((c): c is CatalogCourse => !!c)
    .sort((a, b) => a.series.localeCompare(b.series) || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
}

/** Today's date in Japan (bookings are stored in JST). */
export function todayJst(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10)
}

/**
 * The lessons a student can still book in a course, in order: not completed,
 * and not already on one of their upcoming bookings. The booking form numbers
 * the chosen times with this list, and /api/calendar/book takes the first
 * entry for each new booking, so several bookings get consecutive lessons.
 */
export async function lessonQueue(userId: string, courseId: string, lessonIds: string[]) {
  const db = getSupabaseAdmin()
  const [{ data: prog }, { data: booked }] = await Promise.all([
    db
      .from('slide_course_progress')
      .select('completed_lesson_ids')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle(),
    db
      .from('bookings')
      .select('slide_lesson_id')
      .eq('user_id', userId)
      .eq('slide_course_id', courseId)
      .eq('status', 'confirmed')
      .gte('date', todayJst()),
  ])
  const done = new Set<string>((prog?.completed_lesson_ids as string[] | null) ?? [])
  const taken = new Set((booked ?? []).map((b) => b.slide_lesson_id as string | null).filter(Boolean))
  const doneCount = lessonIds.filter((id) => done.has(id)).length
  const queue = lessonIds.filter((id) => !done.has(id) && !taken.has(id))
  return { doneCount, queue }
}

/** Lesson for a new booking: the first one in the queue, or the last lesson once the course is used up. */
export async function nextLessonFor(userId: string, courseId: string): Promise<{ lessonId: string } | null> {
  const course = (await loadCatalog()).find((c) => c.id === courseId)
  if (!course || !course.lessonIds.length) return null
  const { queue } = await lessonQueue(userId, courseId, course.lessonIds)
  return { lessonId: queue[0] ?? course.lessonIds[course.lessonIds.length - 1] }
}
