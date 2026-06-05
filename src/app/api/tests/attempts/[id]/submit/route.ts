import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'
import { gradeAndFinalize } from '@/lib/test-grade-attempt'
import { sendAdminTestGradingNotification } from '@/lib/email'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 120

/**
 * POST /api/tests/attempts/[id]/submit
 *   Save any final answers, then grade + finalize the attempt server-side via the
 *   shared grader (objective = deterministic, writing = AI text, speaking = AI
 *   audio, human-only = left pending). Returns the results summary.
 *
 *   Body (optional): { responses?: { questionId, selectedOptionIds?, textResponse?, audioAssetId? }[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { id: attemptId } = await params

  let body: {
    responses?: { questionId: string; selectedOptionIds?: string[]; textResponse?: string; audioAssetId?: string | null }[]
    reviewMode?: 'ai' | 'human'
  } = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional for submit.
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('test_attempts')
    .select('id, user_id, status')
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.user_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'Attempt already submitted' }, { status: 409 })
  }

  // Persist any final answers passed with the submit.
  if (Array.isArray(body.responses) && body.responses.length > 0) {
    const rows = body.responses.map(r => ({
      attempt_id: attemptId,
      question_id: r.questionId,
      selected_option_ids: r.selectedOptionIds ?? [],
      text_response: r.textResponse ?? '',
      audio_asset_id: r.audioAssetId ?? null,
    }))
    await supabase.from('responses').upsert(rows, { onConflict: 'attempt_id,question_id' })
  }

  // Human review: grade the objective parts now, leave writing/speaking pending
  // for the tutor queue (status stays 'submitted').
  if (body.reviewMode === 'human') {
    await supabase.from('test_attempts').update({ review_mode: 'human', submitted_at: new Date().toISOString() }).eq('id', attemptId)
    const result = await gradeAndFinalize(supabase, attemptId, { skipAi: true })
    if (!result) return NextResponse.json({ error: 'Saving the result failed' }, { status: 500 })

    // Tell the tutor there's grading waiting (awaited: serverless may not run
    // work after the response is sent; failure never blocks the submission).
    try {
      const [{ data: prof }, { data: att }] = await Promise.all([
        supabase.from('profiles').select('display_name, email, contact_email').eq('id', user.id).single(),
        supabase.from('test_attempts').select('form:test_forms ( title )').eq('id', attemptId).single(),
      ])
      await sendAdminTestGradingNotification({
        studentName: prof?.display_name || prof?.email || user.email || 'Student',
        studentEmail: prof?.contact_email || prof?.email || user.email || '—',
        formTitle: (att?.form as { title?: string } | null)?.title || 'Practice test',
        attemptId,
      })
    } catch (err) {
      console.error('Admin grading notification failed:', err)
    }

    return NextResponse.json({ ...result, review_mode: 'human' })
  }

  // AI review: respond immediately, then grade in the background. waitUntil()
  // keeps the serverless function alive after the response is sent — without it
  // Vercel kills the task and the student waits for the cron's stale sweep.
  // grading_started_at acts as a claim so the cron won't race this inline pass;
  // if this task crashes, the cron re-grades once the claim goes stale.
  if (body.reviewMode === 'ai') {
    const now = new Date().toISOString()
    await supabase.from('test_attempts')
      .update({ status: 'submitted', review_mode: 'ai', submitted_at: now, grading_started_at: now })
      .eq('id', attemptId)
    waitUntil(gradeAndFinalize(supabase, attemptId).catch(err => console.error('Background grading failed:', err)))
    return NextResponse.json({ status: 'submitted', review_mode: 'ai', processing: true })
  }

  // No AI questions (pure auto-graded): grade synchronously and return.
  const result = await gradeAndFinalize(supabase, attemptId)
  if (!result) {
    return NextResponse.json({ error: 'Grading completed but saving the result failed' }, { status: 500 })
  }
  return NextResponse.json(result)
}
