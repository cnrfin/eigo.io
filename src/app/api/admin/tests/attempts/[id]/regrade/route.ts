import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { gradeAndFinalize } from '@/lib/test-grade-attempt'

export const maxDuration = 120

/**
 * POST /api/admin/tests/attempts/[id]/regrade   (admin only)
 *   Re-run grading on an attempt's already-saved answers and recordings, then
 *   re-finalize the scores. Use after changing the audio model, a rubric, or a
 *   scale — no re-recording needed. Tutor-set scores are preserved.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: attemptId } = await params

  const result = await gradeAndFinalize(getAdminSupabase(), attemptId)
  if (!result) return NextResponse.json({ error: 'Attempt not found or could not be graded' }, { status: 404 })
  return NextResponse.json(result)
}
