import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { TEST_ASSETS_BUCKET } from '@/lib/test-grading'
import { finalizeAttempt } from '@/lib/test-finalize'

/**
 * Admin answer editor — lets the tutor view and fix a student's responses.
 *
 * GET  /api/admin/tests/attempts/[id]/edit
 *   Returns every question (with options + correct answers) and the student's
 *   current response for each, so the tutor can see and correct selections.
 *
 * POST /api/admin/tests/attempts/[id]/edit
 *   Saves updated selected_option_ids, re-grades auto_choice questions, and
 *   re-finalizes the attempt's overall score.
 *   Body: { updates: [{ questionId, selectedOptionIds }] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()
  const { id: attemptId } = await params

  const { data: attempt } = await supabase
    .from('test_attempts')
    .select('id, user_id, form_id, status, overall_score, submitted_at')
    .eq('id', attemptId)
    .single()
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

  // Student info
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', attempt.user_id)
    .single()

  // Form info
  const { data: form } = await supabase
    .from('test_forms')
    .select('id, title, track:exam_tracks ( name, level_label )')
    .eq('id', attempt.form_id)
    .single()

  // Sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, skill, part_label, title, order_index')
    .eq('form_id', attempt.form_id)
    .order('order_index', { ascending: true })
  const sectionIds = (sections ?? []).map(s => s.id)

  // Groups
  const { data: groups } = sectionIds.length
    ? await supabase
        .from('question_groups')
        .select('id, section_id, order_index, passage_text, prompt, audio_asset_id')
        .in('section_id', sectionIds)
        .order('order_index', { ascending: true })
    : { data: [] as Array<{ id: string; section_id: string; order_index: number; passage_text: string | null; prompt: string; audio_asset_id: string | null }> }
  const groupIds = (groups ?? []).map(g => g.id)

  // Questions
  const { data: questions } = groupIds.length
    ? await supabase
        .from('questions')
        .select('id, group_id, order_index, question_type, scoring_method, prompt, payload, max_score')
        .in('group_id', groupIds)
        .order('order_index', { ascending: true })
    : { data: [] as Array<{ id: string; group_id: string; order_index: number; question_type: string; scoring_method: string; prompt: string; payload: unknown; max_score: number }> }

  // Options (with is_correct — admin can see correct answers)
  const questionIds = (questions ?? []).map(q => q.id)
  const { data: options } = questionIds.length
    ? await supabase
        .from('question_options')
        .select('id, question_id, order_index, label, content, is_correct')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true })
    : { data: [] as Array<{ id: string; question_id: string; order_index: number; label: string; content: string; is_correct: boolean }> }

  // Student responses
  const { data: responses } = await supabase
    .from('responses')
    .select('id, question_id, selected_option_ids, text_response, audio_asset_id, is_correct, score, max_score, graded_by, ai_feedback')
    .eq('attempt_id', attemptId)
  const responseMap = new Map((responses ?? []).map(r => [r.question_id, r]))

  // Signed audio URLs for stimulus clips
  const audioIds = (groups ?? []).map(g => g.audio_asset_id).filter(Boolean) as string[]
  const audioUrlMap = new Map<string, string>()
  if (audioIds.length) {
    const { data: assets } = await supabase.from('assets').select('id, storage_path').in('id', audioIds)
    for (const a of assets ?? []) {
      const { data: signed } = await supabase.storage.from(TEST_ASSETS_BUCKET).createSignedUrl(a.storage_path, 60 * 60)
      if (signed?.signedUrl) audioUrlMap.set(a.id, signed.signedUrl)
    }
  }

  // Build option lookup
  const optsByQ = new Map<string, typeof options>()
  for (const o of options ?? []) {
    const arr = optsByQ.get(o.question_id) ?? []
    arr.push(o)
    optsByQ.set(o.question_id, arr)
  }

  // Build question lookup by group
  const qByGroup = new Map<string, NonNullable<typeof questions>>()
  for (const q of questions ?? []) {
    const arr = qByGroup.get(q.group_id) ?? []
    arr.push(q)
    qByGroup.set(q.group_id, arr)
  }

  // Build group lookup by section
  const gBySection = new Map<string, NonNullable<typeof groups>>()
  for (const g of groups ?? []) {
    const arr = gBySection.get(g.section_id) ?? []
    arr.push(g)
    gBySection.set(g.section_id, arr)
  }

  const tree = (sections ?? []).map(section => ({
    id: section.id,
    skill: section.skill,
    part_label: section.part_label,
    title: section.title,
    groups: (gBySection.get(section.id) ?? []).map(g => ({
      id: g.id,
      passage_text: g.passage_text,
      prompt: g.prompt,
      audio_url: g.audio_asset_id ? audioUrlMap.get(g.audio_asset_id) ?? null : null,
      questions: (qByGroup.get(g.id) ?? []).map(q => {
        const resp = responseMap.get(q.id)
        return {
          id: q.id,
          prompt: q.prompt,
          question_type: q.question_type,
          scoring_method: q.scoring_method,
          max_score: q.max_score,
          options: (optsByQ.get(q.id) ?? []).map(o => ({
            id: o.id,
            label: o.label,
            content: o.content,
            is_correct: o.is_correct,
          })),
          response: resp
            ? {
                id: resp.id,
                selected_option_ids: resp.selected_option_ids ?? [],
                text_response: resp.text_response ?? '',
                is_correct: resp.is_correct,
                score: resp.score,
                max_score: resp.max_score,
                graded_by: resp.graded_by,
                ai_feedback: resp.ai_feedback as Record<string, unknown> | null,
              }
            : null,
        }
      }),
    })),
  }))

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      submitted_at: attempt.submitted_at,
    },
    student: { name: profile?.display_name || profile?.email || 'Student' },
    form: { title: form?.title, track: form?.track },
    sections: tree,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()
  const { id: attemptId } = await params

  let body: {
    updates?: { questionId: string; selectedOptionIds: string[] }[]
    scoreUpdates?: { questionId: string; score: number; feedback?: string }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const hasUpdates = Array.isArray(body.updates) && body.updates.length > 0
  const hasScoreUpdates = Array.isArray(body.scoreUpdates) && body.scoreUpdates.length > 0
  if (!hasUpdates && !hasScoreUpdates) {
    return NextResponse.json({ error: 'updates or scoreUpdates array is required' }, { status: 400 })
  }

  // Verify attempt exists
  const { data: attempt } = await supabase
    .from('test_attempts')
    .select('id, form_id')
    .eq('id', attemptId)
    .single()
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

  const now = new Date().toISOString()
  let totalUpdated = 0

  // ── Auto-choice answer updates ──
  if (hasUpdates) {
    const questionIds = body.updates!.map(u => u.questionId)
    const { data: questions } = await supabase
      .from('questions')
      .select('id, scoring_method, max_score, payload')
      .in('id', questionIds)
    const qMap = new Map((questions ?? []).map(q => [q.id, q]))

    const { data: options } = await supabase
      .from('question_options')
      .select('id, question_id, is_correct')
      .in('question_id', questionIds)
    const correctByQ = new Map<string, string[]>()
    for (const o of options ?? []) {
      if (o.is_correct) {
        const arr = correctByQ.get(o.question_id) ?? []
        arr.push(o.id)
        correctByQ.set(o.question_id, arr)
      }
    }

    for (const upd of body.updates!) {
      const q = qMap.get(upd.questionId)
      if (!q) continue
      const selected = upd.selectedOptionIds ?? []
      const correct = correctByQ.get(upd.questionId) ?? []
      let isCorrect: boolean | null = null
      let score = 0
      if (q.scoring_method === 'auto_choice' && selected.length > 0) {
        const sortedSel = [...selected].sort()
        const sortedCorr = [...correct].sort()
        isCorrect = sortedSel.length === sortedCorr.length && sortedSel.every((v, i) => v === sortedCorr[i])
        score = isCorrect ? (Number(q.max_score) || 1) : 0
      } else if (q.scoring_method === 'auto_choice' && selected.length === 0) {
        isCorrect = false
        score = 0
      }
      await supabase.from('responses').upsert({
        attempt_id: attemptId, question_id: upd.questionId,
        selected_option_ids: selected, is_correct: isCorrect, score,
        max_score: Number(q.max_score) || 1,
        graded_by: isCorrect !== null ? 'auto' : null, updated_at: now,
      }, { onConflict: 'attempt_id,question_id' })
      totalUpdated++
    }
  }

  // ── Score + feedback updates (writing / speaking) ──
  if (hasScoreUpdates) {
    for (const upd of body.scoreUpdates!) {
      // Load existing response to merge ai_feedback
      const { data: existing } = await supabase
        .from('responses')
        .select('ai_feedback')
        .eq('attempt_id', attemptId)
        .eq('question_id', upd.questionId)
        .single()
      const prevFeedback = (existing?.ai_feedback as Record<string, unknown> | null) ?? {}
      const feedbackUpdate: Record<string, unknown> = { ...prevFeedback, graded_by_tutor: true }
      if (upd.feedback !== undefined) feedbackUpdate.tutor_comment = upd.feedback
      await supabase.from('responses').update({
        score: upd.score,
        graded_by: 'tutor',
        ai_feedback: feedbackUpdate,
        updated_at: now,
      }).eq('attempt_id', attemptId).eq('question_id', upd.questionId)
      totalUpdated++
    }
  }

  // Re-finalize the attempt (recompute overall score)
  const result = await finalizeAttempt(supabase, attemptId)

  return NextResponse.json({
    ok: true,
    updated: totalUpdated,
    result: result ?? null,
  })
}
