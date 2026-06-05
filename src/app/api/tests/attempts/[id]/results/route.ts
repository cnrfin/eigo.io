import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'
import { TEST_ASSETS_BUCKET } from '@/lib/test-grading'

/**
 * GET /api/tests/attempts/[id]/results
 *   Review mode for a finished attempt (owner only). Unlike the in-test content
 *   route, this REVEALS the answer key — correct options, accepted gap-fill
 *   answers, and listening transcripts — because the test is over. Returns the
 *   full tree with the student's response and per-question grade/feedback, plus
 *   per-skill and overall scores.
 *
 *   Only available once the attempt is submitted/scored; an in-progress attempt
 *   returns 409 so answers can't be read mid-test.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { id: attemptId } = await params

  const { data: attempt, error: attemptError } = await supabase
    .from('test_attempts')
    .select('id, user_id, form_id, status, review_mode, time_spent_seconds, raw_score, overall_score, submitted_at, scored_at')
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.user_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (attempt.status === 'in_progress') {
    return NextResponse.json({ error: 'Results are available after you submit the test' }, { status: 409 })
  }

  const { data: form } = await supabase
    .from('test_forms')
    .select(`
      id, slug, title, title_ja, mode,
      track:exam_tracks ( id, slug, name, level_label, scoring_model, exam:exams ( slug, name ) )
    `)
    .eq('id', attempt.form_id)
    .single()

  const { data: skillScores } = await supabase
    .from('attempt_skill_scores')
    .select('skill, raw_score, scaled_score, max_score')
    .eq('attempt_id', attemptId)

  // Content tree.
  const { data: sections } = await supabase
    .from('sections')
    .select('id, skill, part_label, title, instructions, order_index')
    .eq('form_id', attempt.form_id)
    .order('order_index', { ascending: true })
  const sectionIds = (sections ?? []).map(s => s.id)

  const { data: groups } = sectionIds.length
    ? await supabase
        .from('question_groups')
        .select('id, section_id, order_index, stimulus_type, passage_text, prompt, audio_asset_id, image_asset_id')
        .in('section_id', sectionIds)
        .order('order_index', { ascending: true })
    : { data: [] as Array<Record<string, unknown>> }
  const groupRows = (groups ?? []) as Array<{
    id: string; section_id: string; order_index: number; stimulus_type: string
    passage_text: string; prompt: string; audio_asset_id: string | null; image_asset_id: string | null
  }>
  const groupIds = groupRows.map(g => g.id)

  const { data: questions } = groupIds.length
    ? await supabase
        .from('questions')
        .select('id, group_id, order_index, question_type, scoring_method, prompt, payload, max_score')
        .in('group_id', groupIds)
        .order('order_index', { ascending: true })
    : { data: [] as Array<Record<string, unknown>> }
  const questionRows = (questions ?? []) as Array<{
    id: string; group_id: string; order_index: number; question_type: string
    scoring_method: string; prompt: string; payload: Record<string, unknown> | null; max_score: number | string
  }>
  const questionIds = questionRows.map(q => q.id)

  // REVEAL: include is_correct here (review mode).
  const { data: options } = questionIds.length
    ? await supabase
        .from('question_options')
        .select('id, question_id, order_index, label, content, is_correct')
        .in('question_id', questionIds)
    : { data: [] as Array<{ id: string; question_id: string; order_index: number; label: string; content: string; is_correct: boolean }> }
  const optionsByQuestion = new Map<string, typeof options>()
  for (const o of options ?? []) {
    const arr = optionsByQuestion.get(o.question_id) ?? []
    arr.push(o)
    optionsByQuestion.set(o.question_id, arr)
  }

  // REVEAL: include transcript (the listening answer key) in review mode.
  const assetIds = Array.from(
    new Set(groupRows.flatMap(g => [g.audio_asset_id, g.image_asset_id]).filter(Boolean) as string[])
  )
  const { data: assets } = assetIds.length
    ? await supabase.from('assets').select('id, type, storage_path, duration_seconds, alt_text, transcript').in('id', assetIds)
    : { data: [] as Array<{ id: string; type: string; storage_path: string; duration_seconds: number | null; alt_text: string; transcript: string }> }
  const assetMap = new Map<string, { id: string; type: string; url: string | null; duration_seconds: number | null; alt_text: string; transcript: string }>()
  for (const a of assets ?? []) {
    const { data: signed } = await supabase.storage.from(TEST_ASSETS_BUCKET).createSignedUrl(a.storage_path, 60 * 60)
    assetMap.set(a.id, { id: a.id, type: a.type, url: signed?.signedUrl ?? null, duration_seconds: a.duration_seconds, alt_text: a.alt_text, transcript: a.transcript })
  }

  const { data: responses } = await supabase
    .from('responses')
    .select('question_id, selected_option_ids, text_response, audio_asset_id, transcript, is_correct, score, max_score, graded_by, ai_feedback')
    .eq('attempt_id', attemptId)
  const responseMap = new Map((responses ?? []).map(r => [r.question_id, r]))

  // Sign the student's own recordings (speaking responses) so they're playable in review.
  const respAudioIds = Array.from(new Set((responses ?? []).map(r => r.audio_asset_id).filter(Boolean) as string[]))
  const respAudioUrl = new Map<string, string | null>()
  if (respAudioIds.length) {
    const { data: respAssets } = await supabase.from('assets').select('id, storage_path').in('id', respAudioIds)
    for (const a of respAssets ?? []) {
      const { data: signed } = await supabase.storage.from(TEST_ASSETS_BUCKET).createSignedUrl(a.storage_path, 60 * 60)
      respAudioUrl.set(a.id, signed?.signedUrl ?? null)
    }
  }

  const questionsByGroup = new Map<string, typeof questionRows>()
  for (const q of questionRows) {
    const arr = questionsByGroup.get(q.group_id) ?? []
    arr.push(q)
    questionsByGroup.set(q.group_id, arr)
  }
  const groupsBySection = new Map<string, typeof groupRows>()
  for (const g of groupRows) {
    const arr = groupsBySection.get(g.section_id) ?? []
    arr.push(g)
    groupsBySection.set(g.section_id, arr)
  }

  const tree = (sections ?? []).map(section => ({
    id: section.id,
    skill: section.skill,
    part_label: section.part_label,
    title: section.title,
    instructions: section.instructions,
    order_index: section.order_index,
    groups: (groupsBySection.get(section.id) ?? []).map(g => ({
      id: g.id,
      order_index: g.order_index,
      stimulus_type: g.stimulus_type,
      passage_text: g.passage_text,
      prompt: g.prompt,
      audio: g.audio_asset_id ? assetMap.get(g.audio_asset_id) ?? null : null,
      image: g.image_asset_id ? assetMap.get(g.image_asset_id) ?? null : null,
      questions: (questionsByGroup.get(g.id) ?? []).map(q => {
        const saved = responseMap.get(q.id)
        const opts = (optionsByQuestion.get(q.id) ?? [])
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
        return {
          id: q.id,
          order_index: q.order_index,
          question_type: q.question_type,
          prompt: q.prompt,
          payload: q.payload ?? {},           // revealed (includes accepted answers)
          max_score: Number(q.max_score) || 0,
          options: opts.map(o => ({ id: o.id, label: o.label, content: o.content, order_index: o.order_index, is_correct: o.is_correct })),
          correct_option_ids: opts.filter(o => o.is_correct).map(o => o.id),
          response: saved
            ? {
                selected_option_ids: saved.selected_option_ids ?? [],
                text_response: saved.text_response ?? '',
                audio_asset_id: saved.audio_asset_id ?? null,
                audio_url: saved.audio_asset_id ? respAudioUrl.get(saved.audio_asset_id) ?? null : null,
                transcript: saved.transcript ?? '',
                is_correct: saved.is_correct,
                score: saved.score,
                max_score: saved.max_score,
                graded_by: saved.graded_by,
                ai_feedback: saved.ai_feedback,
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
      time_spent_seconds: attempt.time_spent_seconds,
      raw_score: attempt.raw_score,
      overall_score: attempt.overall_score,
      submitted_at: attempt.submitted_at,
      scored_at: attempt.scored_at,
    },
    form,
    skill_scores: skillScores ?? [],
    sections: tree,
  })
}
