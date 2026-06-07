import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Persist a student's latest result for one exam onto their profile
 * (profiles.exam_scores, keyed by exam-track slug — see
 * supabase/add-exam-scores-to-profiles.sql).
 *
 * Each entry holds the LATEST result (current ability is the headline), plus:
 *   - results: how many distinct results have been recorded (Mock 1 + Mock 2,
 *     or a retake = 2). The UI only shows a personal best once results > 1.
 *   - best: the highest headline number seen so far (total / overall_band /
 *     cse_total / gse — whichever this exam uses). Non-numeric scores (CEFR
 *     levels) simply never set `best`.
 *
 * Never throws: profile bookkeeping must not break grading or results pages
 * (e.g. under RLS a tutor's client may not be able to update the row, or the
 * column may not exist yet). Skips the write when the stored value already
 * matches, so calling this from read paths (the set-results API) is cheap.
 */

/** The single number that headlines this exam's score, if it has one. */
function headlineNumber(score: Record<string, unknown>): number | null {
  for (const k of ['total', 'overall_band', 'cse_total', 'gse']) {
    const v = score[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

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

    const { updated_at: _ignored, results: _r, best: _b, ...existing } = current[examKey] ?? {}
    if (JSON.stringify(existing) === JSON.stringify(score)) return // unchanged

    // Personal-best + result-count bookkeeping (latest stays the headline)
    const prev = current[examKey]
    const prevResults = typeof prev?.results === 'number' ? prev.results : prev ? 1 : 0
    const nums = [headlineNumber(score), typeof prev?.best === 'number' ? prev.best : null,
      prev ? headlineNumber(prev) : null].filter((n): n is number => n !== null)
    const best = nums.length ? Math.max(...nums) : undefined

    const merged = {
      ...current,
      [examKey]: {
        ...score,
        results: prevResults + 1,
        ...(best !== undefined ? { best } : {}),
        updated_at: new Date().toISOString(),
      },
    }
    await supabase.from('profiles').update({ exam_scores: merged }).eq('id', userId)
  } catch (err) {
    console.error(`Could not save ${examKey} score to profile:`, err)
  }
}
