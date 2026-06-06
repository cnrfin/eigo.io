import type { SupabaseClient } from '@supabase/supabase-js'
import { finalizeAttempt, type FinalizeResult } from '@/lib/test-finalize'
import {
  gradeAuto,
  gradeWithRubricAveraged,
  TEST_ASSETS_BUCKET,
  type QuestionRow,
  type OptionRow,
  type ResponseRow,
  type RubricRow,
  type Skill,
} from '@/lib/test-grading'
import { transcodeToMp3, gradeSpeakingFromAudio } from '@/lib/test-speaking'

/**
 * Grade an attempt from its persisted responses and finalize the scores.
 *
 * Shared by the submit route and the admin re-grade endpoint, so grading is
 * identical whether it runs at submit time or when re-run later (e.g. after
 * changing the audio model, a rubric, or a scale). Reads the saved answers and
 * recordings — it never needs the student to re-do anything.
 *   - objective         -> deterministic (gradeAuto)
 *   - writing            -> AI rubric grading from the text
 *   - speaking           -> AI grading from the AUDIO (pronunciation/fluency)
 *   - human-only         -> left pending for a tutor
 */
export async function gradeAndFinalize(
  supabase: SupabaseClient,
  attemptId: string,
  opts: { skipAi?: boolean } = {}
): Promise<FinalizeResult | null> {
  const { data: attempt } = await supabase
    .from('test_attempts').select('id, form_id').eq('id', attemptId).single()
  if (!attempt) return null

  const { data: sections } = await supabase
    .from('sections').select('id, skill').eq('form_id', attempt.form_id)
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
  if (questionRows.length === 0) return finalizeAttempt(supabase, attemptId)
  const questionIds = questionRows.map(q => q.id)

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
    .select('question_id, selected_option_ids, text_response, transcript, audio_asset_id, graded_by')
    .eq('attempt_id', attemptId)
  type Saved = ResponseRow & { audio_asset_id?: string | null; graded_by?: string | null }
  const responseMap = new Map<string, Saved>(
    (savedResponses ?? []).map(r => [r.question_id, r as Saved])
  )

  const audioAssetIds = Array.from(new Set((savedResponses ?? []).map(r => r.audio_asset_id).filter(Boolean) as string[]))
  const audioPath = new Map<string, string>()
  if (audioAssetIds.length) {
    const { data: audioAssets } = await supabase.from('assets').select('id, storage_path').in('id', audioAssetIds)
    for (const a of audioAssets ?? []) audioPath.set(a.id, a.storage_path)
  }

  async function gradeSpeaking(q: QuestionRow, skill: Skill, taskPrompt: string) {
    const r = responseMap.get(q.id)
    const path = r?.audio_asset_id ? audioPath.get(r.audio_asset_id) : undefined
    if (!path) return null
    const { data: blob, error } = await supabase.storage.from(TEST_ASSETS_BUCKET).download(path)
    if (error || !blob) throw new Error('could not download recording')
    const mp3 = await transcodeToMp3(Buffer.from(await blob.arrayBuffer()))
    const payload = (q.payload ?? {}) as { reference?: string }
    return gradeSpeakingFromAudio({
      mp3Base64: mp3.toString('base64'),
      taskPrompt,
      rubric: q.rubric_id ? rubricMap.get(q.rubric_id) ?? null : null,
      skill,
      maxScore: Number(q.max_score) || 1,
      reference: payload.reference,
    })
  }

  type Graded = {
    question_id: string
    is_correct: boolean | null
    score: number | null
    max_score: number
    graded_by: 'auto' | 'ai' | null
    ai_feedback: Record<string, unknown>
  }

  const graded: Graded[] = await Promise.all(
    questionRows.map(async (q): Promise<Graded> => {
      const sectionId = groupSection.get(q.group_id)
      const skill = (sectionId ? sectionSkill.get(sectionId) : undefined) ?? 'reading'
      const response = responseMap.get(q.id)
      const max = Number(q.max_score) || 1

      // Never overwrite a tutor's manual score on re-grade.
      if (response?.graded_by === 'tutor') return null as unknown as Graded

      if (q.scoring_method === 'auto_choice' || q.scoring_method === 'auto_text') {
        const r = gradeAuto(q, optionsByQuestion.get(q.id) ?? [], response)
        return { question_id: q.id, is_correct: r.is_correct, score: r.score, max_score: r.max_score, graded_by: 'auto', ai_feedback: {} }
      }

      if (q.scoring_method === 'ai_rubric' || q.scoring_method === 'ai_plus_human') {
        // Human-review submissions skip AI: leave these pending for the tutor queue.
        if (opts.skipAi) {
          return { question_id: q.id, is_correct: null, score: null, max_score: max, graded_by: null, ai_feedback: { awaiting_human_review: true } }
        }
        const needsHuman = q.scoring_method === 'ai_plus_human'
        const taskPrompt = q.prompt || groupPrompt.get(q.group_id) || ''
        // payload.reference gives the GRADER context the candidate sees as an
        // image (e.g. what a picture-writing photo shows). Appended only to
        // the text-grading prompt — never rendered to the student. (Speaking
        // passes payload.reference to its grader separately.)
        const refContext = (q.payload as { reference?: string } | null)?.reference
        const textTaskPrompt = taskPrompt
          + (refContext ? `\n\n[REFERENCE for the grader — the candidate sees this as an image/context, judge their answer against it]:\n${refContext}` : '')
        try {
          if (q.question_type === 'speaking_response') {
            const r = await gradeSpeaking(q, skill, taskPrompt)
            if (!r) {
              return { question_id: q.id, is_correct: null, score: 0, max_score: max, graded_by: 'ai', ai_feedback: { note: 'no_recording', needs_human_review: needsHuman } }
            }
            return { question_id: q.id, is_correct: null, score: r.score, max_score: r.max_score, graded_by: 'ai', ai_feedback: { ...r.feedback, needs_human_review: needsHuman } }
          }
          const r = await gradeWithRubricAveraged({
            skill,
            questionType: q.question_type,
            taskPrompt: textTaskPrompt,
            studentText: response?.text_response || '',
            rubric: q.rubric_id ? rubricMap.get(q.rubric_id) ?? null : null,
            maxScore: Number(q.max_score) || 1,
          })
          return { question_id: q.id, is_correct: null, score: r.score, max_score: r.max_score, graded_by: 'ai', ai_feedback: { ...r.feedback, needs_human_review: needsHuman } }
        } catch (err) {
          console.error(`AI grading failed for question ${q.id}:`, err)
          return { question_id: q.id, is_correct: null, score: null, max_score: max, graded_by: null, ai_feedback: { error: 'grading_failed' } }
        }
      }

      // 'human' — leave pending for a tutor.
      return { question_id: q.id, is_correct: null, score: null, max_score: max, graded_by: null, ai_feedback: {} }
    })
  )

  const rows = graded.filter(Boolean).map(g => ({
    attempt_id: attemptId,
    question_id: g.question_id,
    is_correct: g.is_correct,
    score: g.score,
    max_score: g.max_score,
    graded_by: g.graded_by,
    ai_feedback: g.ai_feedback,
  }))
  if (rows.length) await supabase.from('responses').upsert(rows, { onConflict: 'attempt_id,question_id' })

  return finalizeAttempt(supabase, attemptId)
}
