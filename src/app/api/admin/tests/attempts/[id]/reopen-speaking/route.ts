import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { finalizeAttempt } from '@/lib/test-finalize'

export const maxDuration = 60

/**
 * POST /api/admin/tests/attempts/[id]/reopen-speaking   (admin only)
 *
 * Re-opens an already-submitted/scored attempt for the SPEAKING section only,
 * so a student who skipped their recordings can come back and add them without
 * re-taking or re-grading the rest of the test.
 *
 * Two things happen:
 *   1. Re-finalize now. This recomputes the CEFR result from the stored
 *      per-question scores and rewrites attempt_skill_scores, which clears any
 *      stale speaking row (e.g. a Pre-A1 written by an older grading run) — so
 *      the student's score recovers immediately, before they record anything.
 *      No answers are re-graded (writing/objective scores are untouched).
 *   2. Flip the attempt to 'awaiting_speaking'. The take page then shows only
 *      the speaking section, and submitting grades just that section
 *      (onlyMissing) and re-fuses.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: attemptId } = await params

  const supabase = getAdminSupabase()

  const { data: attempt } = await supabase
    .from('test_attempts').select('id, status').eq('id', attemptId).single()
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.status === 'in_progress') {
    return NextResponse.json({ error: 'Attempt is still in progress' }, { status: 409 })
  }

  // 1. Recompute the score from stored answers (clears any stale skill row).
  const result = await finalizeAttempt(supabase, attemptId)
  if (!result) return NextResponse.json({ error: 'Could not finalize the attempt' }, { status: 500 })

  // 2. Re-open for a speaking-only finish.
  const { error: upErr } = await supabase
    .from('test_attempts').update({ status: 'awaiting_speaking' }).eq('id', attemptId)
  if (upErr) return NextResponse.json({ error: 'Could not re-open the attempt' }, { status: 500 })

  return NextResponse.json({ status: 'awaiting_speaking', result })
}
