import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Persist a student's latest result for one exam onto their profile
 * (profiles.exam_scores, keyed by exam-track slug — see
 * supabase/add-exam-scores-to-profiles.sql).
 *
 * Never throws: profile bookkeeping must not break grading or results pages
 * (e.g. under RLS a tutor's client may not be able to update the row, or the
 * column may not exist yet). Skips the write when the stored value already
 * matches, so calling this from read paths (the set-results API) is cheap.
 */
export async function saveExamScore(
  supabase: SupabaseClient,
  userId: string,
  examKey: string,
  score: Record<string, unknown>,
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles').select('exam_scores').eq('id', userId).single()
    if (error) return
    const current = (data?.exam_scores ?? {}) as Record<string, Record<string, unknown>>

    const { updated_at: _ignored, ...existing } = current[examKey] ?? {}
    if (JSON.stringify(existing) === JSON.stringify(score)) return // unchanged

    const merged = { ...current, [examKey]: { ...score, updated_at: new Date().toISOString() } }
    await supabase.from('profiles').update({ exam_scores: merged }).eq('id', userId)
  } catch (err) {
    console.error(`Could not save ${examKey} score to profile:`, err)
  }
}
