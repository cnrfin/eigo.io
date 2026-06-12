import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pronunciation course gating: non-subscribers get PRON_FREE_ATTEMPTS graded
 * attempts anywhere in the course. One attempt = one COMPLETED non-free
 * lesson; the free L&R lesson never consumes an attempt and any lesson the
 * user already has progress in stays accessible (so finished lessons remain
 * replayable after the gate closes).
 */
export const PRON_FREE_ATTEMPTS = 3

export type PronProgressRow = {
  lesson_id: string
  status: string
  best_score: number | null
  lesson: { free: boolean }
}

export async function pronProgress(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status, best_score, lesson:lessons!inner( free, level:course_levels!inner( course:courses!inner( slug ) ) )')
    .eq('user_id', userId)
    .eq('lesson.level.course.slug', 'pronunciation')
  if (error) throw error
  const rows = (data ?? []) as unknown as PronProgressRow[]
  const completed = rows.filter(r => r.status === 'completed')
  const used = completed.filter(r => !r.lesson.free).length
  const scores = completed.map(r => r.best_score).filter((n): n is number => typeof n === 'number')
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  return { rows, completed, used, avgScore }
}

/** May this non-subscriber open this (non-free) pronunciation lesson? */
export async function pronLessonAllowed(supabase: SupabaseClient, userId: string, lessonId: string) {
  const { rows, used } = await pronProgress(supabase, userId)
  if (rows.some(r => r.lesson_id === lessonId)) return true // started or completed: always re-openable
  return used < PRON_FREE_ATTEMPTS
}
