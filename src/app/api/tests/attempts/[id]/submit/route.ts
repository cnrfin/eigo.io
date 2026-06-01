import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'
import { finalizeAttempt } from '@/lib/test-finalize'
import {
  gradeAuto,
  gradeWithRubricAveraged,
  type QuestionRow,
  type OptionRow,
  type ResponseRow,
  type RubricRow,
  type Skill,
} from '@/lib/test-grading'

/**
 * POST /api/tests/attempts/[id]/submit
 *   Finalize and grade an attempt SERVER-SIDE.
 *     - objective questions  -> deterministic grading (gradeAuto)
 *     - writing / speaking    -> AI rubric grading (gradeWithRubric)
 *     - human-only questions  -> left pending; attempt status becomes 'submitted'
 *   Writes per-question grades, per-skill scores, and an overall score, then
 *   returns the results summary.
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
  } = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional for submit.
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('test_attempts')
    .select('id, user_id, form_id, status')
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

  // ---- Load the answer key + the student's responses ----
  // (Score aggregation/scaling is handled by finalizeAttempt after grading.)
  const { data: sections } = await supabase
    .from('sections')
    .select('id, skill')
    .eq('form_id', attempt.form_id)
  const sectionSkill = new Map<string, Skill>((sections ?? []).map(s => [s.id, s.skill as Skill]))
  const sectionIds = (sections ?? []).map(s => s.id)

  const { data: groups } = sectionIds.length
    ? await supabase.from('question_groups').select('id, section_id, prompt').in('section_id', sectionIds)
    : { data: [] as Array<{ id: string; section_id: string; prompt: string }> }
  const groupRows = (groups ?? []) as Array<{ id: string; section_id: string; prompt: string }>
  const groupSection = new Map(groupRows.map(g => [g.id, g.section_id]))
  const groupPrompt = new Map(groupRows.map(g => [g.id, g.prompt]))
  const groupIds = groupRows.map(g => g.id)

  const { data: questions } = groupIds.length
    ? await supabase
        .from('questions')
        .select('id, group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score')
        .in('group_id', groupIds)
    : { data: [] as QuestionRow[] }
  const questionRows = (questions ?? []) as QuestionRow[]
  const questionIds = questionRows.map(q => q.id)

  if (questionRows.length === 0) {
    return NextResponse.json({ error: 'This form has no questions to grade' }, { status: 400 })
  }

  const { data: options } = await supabase
    .from('question_options')
    .select('id, question_id, order_index, label, content, is_correct')
    .in('question_id', questionIds)
  const optionsByQuestion = new Map<string, OptionRow[]>()
  for (const o of (options ?? []) as OptionRow[]) {
    const arr = optionsByQuestion.get(o.question_id) ?? []
    arr.push(o)
    optionsByQuestion.set(o.question_id, arr)
  }

  const rubricIds = Array.from(new Set(questionRows.map(q => q.rubric_id).filter(Boolean) as string[]))
  const { data: rubrics } = rubricIds.length
    ? await supabase.from('rubrics').select('id, skill, name, criteria, max_score').in('id', rubricIds)
    : { data: [] as RubricRow[] }
  const rubricMap = new Map((rubrics ?? []).map(r => [r.id, r as RubricRow]))

  const { data: savedResponses } = await supabase
    .from('responses')
    .select('question_id, selected_option_ids, text_response, transcript')
    .eq('attempt_id', attemptId)
  const responseMap = new Map<string, ResponseRow>(
    (savedResponses ?? []).map(r => [r.question_id, r as ResponseRow])
  )

  // ---- Grade every question ----
  type Graded = {
    question_id: string
    skill: Skill
    is_correct: boolean | null
    score: number | null
    max_score: number
    weight: number              // per-question weight (e.g. IELTS Writing Task 2 = 2)
    graded_by: 'auto' | 'ai' | null
    ai_feedback: Record<string, unknown>
  }

  const graded: Graded[] = await Promise.all(
    questionRows.map(async (q): Promise<Graded> => {
      const sectionId = groupSection.get(q.group_id)
      const skill = (sectionId ? sectionSkill.get(sectionId) : undefined) ?? 'reading'
      const response = responseMap.get(q.id)
      const max = Number(q.max_score) || 1
      const weight = Number((q.payload as { weight?: number } | null)?.weight) || 1

      if (q.scoring_method === 'auto_choice' || q.scoring_method === 'auto_text') {
        const r = gradeAuto(q, optionsByQuestion.get(q.id) ?? [], response)
        return { question_id: q.id, skill, is_correct: r.is_correct, score: r.score, max_score: r.max_score, weight, graded_by: 'auto', ai_feedback: {} }
      }

      if (q.scoring_method === 'ai_rubric' || q.scoring_method === 'ai_plus_human') {
        const studentText =
          q.question_type === 'speaking_response'
            ? (response?.transcript || response?.text_response || '')
            : (response?.text_response || '')
        try {
          const r = await gradeWithRubricAveraged({
            skill,
            questionType: q.question_type,
            taskPrompt: q.prompt || groupPrompt.get(q.group_id) || '',
            studentText,
            rubric: q.rubric_id ? rubricMap.get(q.rubric_id) ?? null : null,
          })
          return {
            question_id: q.id,
            skill,
            is_correct: null,
            score: r.score,
            max_score: r.max_score,
            weight,
            graded_by: 'ai',
            // ai_plus_human keeps the AI score but flags it for tutor review.
            ai_feedback: { ...r.feedback, needs_human_review: q.scoring_method === 'ai_plus_human' },
          }
        } catch (err) {
          console.error(`AI grading failed for question ${q.id}:`, err)
          return { question_id: q.id, skill, is_correct: null, score: null, max_score: max, weight, graded_by: null, ai_feedback: { error: 'grading_failed' } }
        }
      }

      // 'human' — leave pending for a tutor.
      return { question_id: q.id, skill, is_correct: null, score: null, max_score: max, weight, graded_by: null, ai_feedback: {} }
    })
  )

  // ---- Persist per-question grades ----
  await supabase
    .from('responses')
    .upsert(
      graded.map(g => ({
        attempt_id: attemptId,
        question_id: g.question_id,
        is_correct: g.is_correct,
        score: g.score,
        max_score: g.max_score,
        graded_by: g.graded_by,
        ai_feedback: g.ai_feedback,
      })),
      { onConflict: 'attempt_id,question_id' }
    )

  // ---- Aggregate per skill + overall (shared with tutor grading) ----
  const result = await finalizeAttempt(supabase, attemptId)
  if (!result) {
    return NextResponse.json({ error: 'Grading completed but saving the result failed' }, { status: 500 })
  }

  return NextResponse.json(result)
}
