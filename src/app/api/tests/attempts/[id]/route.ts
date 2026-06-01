import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'
import {
  sanitizeQuestion,
  TEST_ASSETS_BUCKET,
  type QuestionRow,
  type OptionRow,
} from '@/lib/test-grading'

/**
 * GET /api/tests/attempts/[id]
 *   Return the attempt's full test content with ALL answer data stripped
 *   (no question_options.is_correct, no answer keys in payload, no asset
 *   transcripts), plus the caller's saved answers. Once the attempt is scored,
 *   grades and feedback are included for review.
 *
 * PATCH /api/tests/attempts/[id]
 *   Save draft answers / progress while the attempt is in progress. Never grades.
 *   Body: {
 *     responses?: { questionId, selectedOptionIds?, textResponse?, audioAssetId? }[],
 *     progress?: object,
 *     timeSpentSeconds?: number
 *   }
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
    .select('id, user_id, form_id, status, progress, time_spent_seconds, raw_score, overall_score')
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }
  if (attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const scored = attempt.status === 'scored'

  // Form + track metadata.
  const { data: form } = await supabase
    .from('test_forms')
    .select(`
      id, slug, title, title_ja, mode, time_limit_seconds,
      track:exam_tracks ( id, slug, name, level_label, scoring_model,
        exam:exams ( slug, name ) )
    `)
    .eq('id', attempt.form_id)
    .single()

  // Pull the content tree level by level (service role; sanitized in code).
  const { data: sections } = await supabase
    .from('sections')
    .select('id, skill, part_label, title, instructions, time_limit_seconds, order_index')
    .eq('form_id', attempt.form_id)
    .order('order_index', { ascending: true })

  const sectionIds = (sections ?? []).map(s => s.id)
  const { data: groups } = sectionIds.length
    ? await supabase
        .from('question_groups')
        .select('id, section_id, order_index, stimulus_type, passage_text, prompt, audio_asset_id, image_asset_id')
        .in('section_id', sectionIds)
        .order('order_index', { ascending: true })
    : { data: [] as NonNullable<unknown>[] }

  const groupRows = (groups ?? []) as Array<{
    id: string; section_id: string; order_index: number; stimulus_type: string
    passage_text: string; prompt: string; audio_asset_id: string | null; image_asset_id: string | null
  }>
  const groupIds = groupRows.map(g => g.id)

  const { data: questions } = groupIds.length
    ? await supabase
        .from('questions')
        .select('id, group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score')
        .in('group_id', groupIds)
        .order('order_index', { ascending: true })
    : { data: [] as QuestionRow[] }

  const questionRows = (questions ?? []) as QuestionRow[]
  const questionIds = questionRows.map(q => q.id)

  const { data: options } = questionIds.length
    ? await supabase
        .from('question_options')
        .select('id, question_id, order_index, label, content, is_correct')
        .in('question_id', questionIds)
    : { data: [] as OptionRow[] }
  const optionRows = (options ?? []) as OptionRow[]

  // Assets: select only client-safe columns (never transcript). Sign audio URLs.
  const assetIds = Array.from(
    new Set(groupRows.flatMap(g => [g.audio_asset_id, g.image_asset_id]).filter(Boolean) as string[])
  )
  const { data: assets } = assetIds.length
    ? await supabase.from('assets').select('id, type, storage_path, duration_seconds, alt_text').in('id', assetIds)
    : { data: [] as Array<{ id: string; type: string; storage_path: string; duration_seconds: number | null; alt_text: string }> }

  const assetMap = new Map<string, { id: string; type: string; url: string | null; duration_seconds: number | null; alt_text: string }>()
  for (const a of assets ?? []) {
    let url: string | null = null
    const { data: signed } = await supabase.storage
      .from(TEST_ASSETS_BUCKET)
      .createSignedUrl(a.storage_path, 60 * 60)
    url = signed?.signedUrl ?? null
    assetMap.set(a.id, { id: a.id, type: a.type, url, duration_seconds: a.duration_seconds, alt_text: a.alt_text })
  }

  // Saved answers (+ grades when scored).
  const { data: responses } = await supabase
    .from('responses')
    .select('question_id, selected_option_ids, text_response, audio_asset_id, transcript, is_correct, score, max_score, graded_by, ai_feedback')
    .eq('attempt_id', attemptId)
  const responseMap = new Map((responses ?? []).map(r => [r.question_id, r]))

  // Assemble sanitized tree.
  const optionsByQuestion = new Map<string, OptionRow[]>()
  for (const o of optionRows) {
    const arr = optionsByQuestion.get(o.question_id) ?? []
    arr.push(o)
    optionsByQuestion.set(o.question_id, arr)
  }

  const questionsByGroup = new Map<string, QuestionRow[]>()
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
    time_limit_seconds: section.time_limit_seconds,
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
        const safe = sanitizeQuestion(q, optionsByQuestion.get(q.id) ?? [])
        const saved = responseMap.get(q.id)
        return {
          ...safe,
          response: saved
            ? {
                selected_option_ids: saved.selected_option_ids ?? [],
                text_response: saved.text_response ?? '',
                audio_asset_id: saved.audio_asset_id ?? null,
                // Grades only after scoring.
                ...(scored
                  ? {
                      is_correct: saved.is_correct,
                      score: saved.score,
                      max_score: saved.max_score,
                      graded_by: saved.graded_by,
                      ai_feedback: saved.ai_feedback,
                    }
                  : {}),
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
      progress: attempt.progress,
      time_spent_seconds: attempt.time_spent_seconds,
      ...(scored ? { raw_score: attempt.raw_score, overall_score: attempt.overall_score } : {}),
    },
    form,
    sections: tree,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { id: attemptId } = await params

  let body: {
    responses?: { questionId: string; selectedOptionIds?: string[]; textResponse?: string; audioAssetId?: string | null }[]
    progress?: Record<string, unknown>
    timeSpentSeconds?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { data: attempt, error } = await supabase
    .from('test_attempts')
    .select('id, user_id, status')
    .eq('id', attemptId)
    .single()

  if (error || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.user_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'Attempt is already submitted' }, { status: 409 })
  }

  // Upsert draft answers (no grading here).
  if (Array.isArray(body.responses) && body.responses.length > 0) {
    const rows = body.responses.map(r => ({
      attempt_id: attemptId,
      question_id: r.questionId,
      selected_option_ids: r.selectedOptionIds ?? [],
      text_response: r.textResponse ?? '',
      audio_asset_id: r.audioAssetId ?? null,
    }))
    const { error: upsertError } = await supabase
      .from('responses')
      .upsert(rows, { onConflict: 'attempt_id,question_id' })
    if (upsertError) {
      console.error('Failed to save responses:', upsertError)
      return NextResponse.json({ error: 'Could not save answers' }, { status: 500 })
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.progress !== undefined) update.progress = body.progress
  if (typeof body.timeSpentSeconds === 'number') update.time_spent_seconds = body.timeSpentSeconds

  if (Object.keys(update).length > 1) {
    await supabase.from('test_attempts').update(update).eq('id', attemptId)
  }

  return NextResponse.json({ ok: true })
}
