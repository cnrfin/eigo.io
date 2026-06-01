import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { finalizeAttempt } from '@/lib/test-finalize'
import { TEST_ASSETS_BUCKET } from '@/lib/test-grading'

/**
 * Tutor (admin) human-grading for Writing/Speaking.
 *
 * GET  /api/admin/tests/grading
 *   The grading worklist: responses still awaiting a human ('human' scoring
 *   method, ungraded) or AI-graded responses flagged for review ('ai_plus_human').
 *   Each item carries the question prompt, rubric, the student's text/transcript,
 *   a signed audio URL, and any provisional AI score.
 *
 * POST /api/admin/tests/grading
 *   Apply tutor scores. Body: { grades: [{ responseId, score, comment? }] }
 *   Sets the score, marks it graded_by 'tutor', clears the review flag, then
 *   re-finalizes each affected attempt so per-skill/overall scores update.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()

  // Pending = ungraded (awaiting human) OR flagged for review.
  const [pendingRes, flaggedRes] = await Promise.all([
    supabase
      .from('responses')
      .select('id, attempt_id, question_id, text_response, transcript, audio_asset_id, score, max_score, graded_by, ai_feedback')
      .is('graded_by', null),
    supabase
      .from('responses')
      .select('id, attempt_id, question_id, text_response, transcript, audio_asset_id, score, max_score, graded_by, ai_feedback')
      .filter('ai_feedback->>needs_human_review', 'eq', 'true'),
  ])

  const byId = new Map<string, NonNullable<typeof pendingRes.data>[number]>()
  for (const r of [...(pendingRes.data ?? []), ...(flaggedRes.data ?? [])]) byId.set(r.id, r)
  const responses = [...byId.values()]

  if (responses.length === 0) return NextResponse.json({ items: [] })

  // Batch-load context: questions, groups->sections (skill), forms+attempts+students, rubrics, audio.
  const questionIds = [...new Set(responses.map(r => r.question_id))]
  const attemptIds = [...new Set(responses.map(r => r.attempt_id))]

  const { data: questions } = await supabase
    .from('questions')
    .select('id, group_id, prompt, question_type, scoring_method, max_score, rubric_id')
    .in('id', questionIds)
  const qMap = new Map((questions ?? []).map(q => [q.id, q]))

  const groupIds = [...new Set((questions ?? []).map(q => q.group_id))]
  const { data: groups } = groupIds.length
    ? await supabase.from('question_groups').select('id, section_id, prompt').in('id', groupIds)
    : { data: [] as Array<{ id: string; section_id: string; prompt: string }> }
  const gMap = new Map((groups ?? []).map(g => [g.id, g]))
  const sectionIds = [...new Set((groups ?? []).map(g => g.section_id))]
  const { data: sections } = sectionIds.length
    ? await supabase.from('sections').select('id, skill').in('id', sectionIds)
    : { data: [] as Array<{ id: string; skill: string }> }
  const sMap = new Map((sections ?? []).map(s => [s.id, s.skill]))

  const rubricIds = [...new Set((questions ?? []).map(q => q.rubric_id).filter(Boolean) as string[])]
  const { data: rubrics } = rubricIds.length
    ? await supabase.from('rubrics').select('id, name, criteria, max_score').in('id', rubricIds)
    : { data: [] as Array<{ id: string; name: string; criteria: unknown; max_score: number | null }> }
  const rMap = new Map((rubrics ?? []).map(r => [r.id, r]))

  const { data: attempts } = await supabase
    .from('test_attempts')
    .select('id, user_id, form_id, status, submitted_at')
    .in('id', attemptIds)
  const aMap = new Map((attempts ?? []).map(a => [a.id, a]))

  const formIds = [...new Set((attempts ?? []).map(a => a.form_id))]
  const { data: forms } = formIds.length
    ? await supabase.from('test_forms').select('id, title, track:exam_tracks ( name, level_label )').in('id', formIds)
    : { data: [] as Array<{ id: string; title: string; track: unknown }> }
  const fMap = new Map((forms ?? []).map(f => [f.id, f]))

  const userIds = [...new Set((attempts ?? []).map(a => a.user_id))]
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] as Array<{ id: string; display_name: string | null; email: string | null }> }
  const pMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Signed URLs for speaking audio.
  const audioIds = responses.map(r => r.audio_asset_id).filter(Boolean) as string[]
  const audioUrl = new Map<string, string | null>()
  if (audioIds.length) {
    const { data: aud } = await supabase.from('assets').select('id, storage_path').in('id', audioIds)
    for (const a of aud ?? []) {
      const { data: signed } = await supabase.storage.from(TEST_ASSETS_BUCKET).createSignedUrl(a.storage_path, 60 * 60)
      audioUrl.set(a.id, signed?.signedUrl ?? null)
    }
  }

  const items = responses.map(r => {
    const q = qMap.get(r.question_id)
    const attempt = aMap.get(r.attempt_id)
    const student = attempt ? pMap.get(attempt.user_id) : undefined
    const form = attempt ? fMap.get(attempt.form_id) : undefined
    const rubric = q?.rubric_id ? rMap.get(q.rubric_id) : undefined
    const skill = q ? sMap.get(gMap.get(q.group_id)?.section_id ?? '') : undefined
    return {
      response_id: r.id,
      attempt_id: r.attempt_id,
      student: student ? { id: student.id, name: student.display_name || student.email } : null,
      form: form ? { id: form.id, title: form.title, track: form.track } : null,
      question: q
        ? {
            id: q.id,
            prompt: q.prompt || gMap.get(q.group_id)?.prompt || '',
            type: q.question_type,
            skill,
            scoring_method: q.scoring_method,
            max_score: Number(q.max_score) || 0,
            rubric: rubric ? { name: rubric.name, criteria: rubric.criteria, max_score: rubric.max_score } : null,
          }
        : null,
      submission: { text_response: r.text_response, transcript: r.transcript, audio_url: r.audio_asset_id ? audioUrl.get(r.audio_asset_id) ?? null : null },
      provisional: { score: r.score, max_score: r.max_score, graded_by: r.graded_by, ai_feedback: r.ai_feedback },
    }
  })

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()

  let body: { grades?: { responseId: string; score: number; comment?: string }[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!Array.isArray(body.grades) || body.grades.length === 0) {
    return NextResponse.json({ error: 'grades array is required' }, { status: 400 })
  }

  const responseIds = body.grades.map(g => g.responseId)
  const { data: existing } = await supabase
    .from('responses')
    .select('id, attempt_id, max_score, ai_feedback')
    .in('id', responseIds)
  const existingMap = new Map((existing ?? []).map(r => [r.id, r]))

  const affectedAttempts = new Set<string>()
  for (const grade of body.grades) {
    const row = existingMap.get(grade.responseId)
    if (!row) continue
    const max = Number(row.max_score) || undefined
    const score = max != null ? Math.min(max, Math.max(0, Number(grade.score))) : Math.max(0, Number(grade.score))
    const prevFeedback = (row.ai_feedback as Record<string, unknown> | null) ?? {}

    const { error } = await supabase
      .from('responses')
      .update({
        score,
        is_correct: null,
        graded_by: 'tutor',
        grader_user_id: admin.id,
        ai_feedback: { ...prevFeedback, needs_human_review: false, tutor_comment: grade.comment ?? '', graded_by_tutor: true },
        updated_at: new Date().toISOString(),
      })
      .eq('id', grade.responseId)
    if (error) {
      console.error(`Failed to grade response ${grade.responseId}:`, error)
      continue
    }
    affectedAttempts.add(row.attempt_id)
  }

  // Recompute each affected attempt with the shared finalizer.
  const results: Array<{ attempt_id: string; status: string }> = []
  for (const attemptId of affectedAttempts) {
    const r = await finalizeAttempt(supabase, attemptId)
    if (r) results.push({ attempt_id: attemptId, status: r.status })
  }

  return NextResponse.json({ graded: affectedAttempts.size > 0, attempts: results })
}
