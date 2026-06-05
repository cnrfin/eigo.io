import type { SupabaseClient } from '@supabase/supabase-js'
import { saveExamScore } from '@/lib/profile-scores'
import {
  applyScale,
  computeCefrResult,
  computeEikenResult,
  computeIeltsResult,
  computeVersantResult,
  type CefrItem,
  type Skill,
} from '@/lib/test-grading'

/**
 * Recompute an attempt's per-skill and overall scores from the responses
 * already persisted in the database, and update the attempt's status.
 *
 * This is the single source of truth for score aggregation, shared by:
 *   - the submit route (after AI/auto grading writes per-question scores), and
 *   - the tutor grading route (after a human sets scores on pending responses).
 *
 * Official-scale scores (IELTS band / TOEIC scaled / EIKEN CSE) are only
 * produced for full-length mock forms; skill-practice forms report raw % only.
 * If any response is still ungraded (score IS NULL — i.e. awaiting a human),
 * the attempt stays 'submitted'; otherwise it becomes 'scored'.
 */
export interface FinalizeResult {
  status: 'submitted' | 'scored'
  overall_score: Record<string, unknown>
}

export async function finalizeAttempt(
  supabase: SupabaseClient,
  attemptId: string
): Promise<FinalizeResult | null> {
  const { data: attempt } = await supabase
    .from('test_attempts')
    .select('id, user_id, form_id, submitted_at')
    .eq('id', attemptId)
    .single()
  if (!attempt) return null

  const { data: form } = await supabase
    .from('test_forms')
    .select('id, track_id, mode, track:exam_tracks ( scoring_model )')
    .eq('id', attempt.form_id)
    .single()

  const isFullMock = form?.mode === 'full_mock'
  const scoringModel = (form?.track as { scoring_model?: string } | null)?.scoring_model ?? 'raw'

  const { data: sections } = await supabase
    .from('sections')
    .select('id, skill')
    .eq('form_id', attempt.form_id)
  const sectionSkill = new Map<string, Skill>((sections ?? []).map(s => [s.id, s.skill as Skill]))
  const sectionIds = (sections ?? []).map(s => s.id)

  const { data: groups } = sectionIds.length
    ? await supabase.from('question_groups').select('id, section_id').in('section_id', sectionIds)
    : { data: [] as Array<{ id: string; section_id: string }> }
  const groupSection = new Map((groups ?? []).map(g => [g.id, g.section_id]))
  const groupIds = (groups ?? []).map(g => g.id)

  const { data: questions } = groupIds.length
    ? await supabase
        .from('questions')
        .select('id, group_id, scoring_method, payload, max_score')
        .in('group_id', groupIds)
    : { data: [] as Array<{ id: string; group_id: string; scoring_method: string; payload: Record<string, unknown> | null; max_score: number | string }> }
  const questionRows = questions ?? []

  const { data: responses } = await supabase
    .from('responses')
    .select('question_id, score, graded_by, ai_feedback')
    .eq('attempt_id', attemptId)
  const responseMap = new Map((responses ?? []).map(r => [r.question_id, r]))

  type Item = { skill: Skill; score: number | null; max_score: number; weight: number; pending: boolean }
  const items: Item[] = questionRows.map(q => {
    const sectionId = groupSection.get(q.group_id)
    const skill = (sectionId ? sectionSkill.get(sectionId) : undefined) ?? 'reading'
    const max = Number(q.max_score) || 1
    const weight = Number((q.payload as { weight?: number } | null)?.weight) || 1
    const r = responseMap.get(q.id)
    const score = r && r.score !== null && r.score !== undefined ? Number(r.score) : null
    return { skill, score, max_score: max, weight, pending: score === null }
  })

  const perSkill = new Map<Skill, { raw: number; max: number }>()
  for (const it of items) {
    const agg = perSkill.get(it.skill) ?? { raw: 0, max: 0 }
    agg.raw += it.score ?? 0
    agg.max += it.max_score
    perSkill.set(it.skill, agg)
  }

  const rawTotal = items.reduce((s, it) => s + (it.score ?? 0), 0)
  const maxTotal = items.reduce((s, it) => s + it.max_score, 0)
  const pendingHuman = items.some(it => it.pending)

  // Load scales.
  const { data: scales } = form?.track_id
    ? await supabase.from('score_scales').select('skill, scale').eq('track_id', form.track_id)
    : { data: [] as Array<{ skill: Skill | null; scale: Record<string, unknown> }> }
  const skillScale = new Map<string, Record<string, unknown>>()
  let overallScale: Record<string, unknown> | null = null
  for (const s of scales ?? []) {
    if (s.skill) skillScale.set(s.skill, s.scale)
    else overallScale = s.scale
  }
  const eikenConfig =
    overallScale && (overallScale as { model?: string }).model === 'eiken_cse' ? overallScale : null
  const versantConfig =
    overallScale && (overallScale as { model?: string }).model === 'versant_gse' ? overallScale : null
  const cefrConfig =
    overallScale && (overallScale as { model?: string }).model === 'cefr_level' ? overallScale : null

  // Versant: the audio grader rates each spoken response's delivery (manner_score
  // 0-5) alongside its content score; Manner of Speaking is their average.
  const mannerScores = (responses ?? [])
    .map(r => (r.ai_feedback as { manner_score?: number | null } | null)?.manner_score)
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(Number(v)))
    .map(Number)
  const manner01 = mannerScores.length > 0
    ? mannerScores.reduce((a, b) => a + b, 0) / mannerScores.length / 5
    : null

  const rawAgg = {
    raw: Math.round(rawTotal * 100) / 100,
    max: maxTotal,
    percent: maxTotal > 0 ? Math.round((rawTotal / maxTotal) * 1000) / 10 : 0,
    pending_human_review: pendingHuman,
  }

  let skillScoreRows: Array<{
    attempt_id: string; user_id: string; skill: string
    raw_score: number; scaled_score: number | null; max_score: number
  }>
  let overallScore: Record<string, unknown>

  if (!isFullMock) {
    skillScoreRows = [...perSkill.entries()].map(([skill, agg]) => ({
      attempt_id: attemptId, user_id: attempt.user_id, skill,
      raw_score: Math.round(agg.raw * 100) / 100, scaled_score: null, max_score: agg.max,
    }))
    overallScore = {
      official_score_available: false,
      reason: 'skill_practice_not_full_length',
      ...rawAgg,
      per_skill: skillScoreRows.map(r => ({ skill: r.skill, raw: r.raw_score, max: r.max_score })),
    }
  } else if (eikenConfig) {
    const eiken = computeEikenResult(eikenConfig, perSkill)
    skillScoreRows = eiken.per_skill.map(p => ({
      attempt_id: attemptId, user_id: attempt.user_id, skill: p.skill,
      raw_score: p.raw, scaled_score: p.cse, max_score: p.max,
    }))
    overallScore = {
      model: 'eiken_cse', official_score_available: true,
      cse_total: eiken.cse_total, passed: eiken.passed, stages: eiken.stages,
      per_skill: eiken.per_skill, ...rawAgg,
    }
  } else if (cefrConfig) {
    const cefrItems: CefrItem[] = questionRows.map(q => {
      const sectionId = groupSection.get(q.group_id)
      const skill = (sectionId ? sectionSkill.get(sectionId) : undefined) ?? 'reading'
      const r = responseMap.get(q.id)
      return {
        level: String((q.payload as { cefr?: string } | null)?.cefr ?? '') || null,
        skill,
        objective: q.scoring_method === 'auto_choice' || q.scoring_method === 'auto_text',
        score: r && r.score !== null && r.score !== undefined ? Number(r.score) : null,
        max: Number(q.max_score) || 1,
      }
    })
    const cefr = computeCefrResult(cefrConfig, cefrItems)
    skillScoreRows = cefr.per_skill.map(p => ({
      attempt_id: attemptId, user_id: attempt.user_id, skill: p.skill,
      raw_score: p.raw, scaled_score: p.numeric, max_score: p.max,
    }))
    overallScore = {
      model: 'cefr_level', official_score_available: true, estimate: true,
      level: cefr.overall, strength: cefr.strength, cefr_j: cefr.cefr_j,
      numeric: cefr.numeric, receptive_numeric: cefr.receptive_numeric,
      writing_band: cefr.writing_band, speaking_band: cefr.speaking_band,
      level_fractions: cefr.level_fractions, per_skill: cefr.per_skill, ...rawAgg,
    }
  } else if (versantConfig) {
    const versant = computeVersantResult(versantConfig, perSkill, manner01)
    skillScoreRows = versant.per_skill.map(p => ({
      attempt_id: attemptId, user_id: attempt.user_id, skill: p.skill,
      raw_score: p.raw, scaled_score: p.gse, max_score: p.max,
    }))
    overallScore = {
      model: 'versant_gse', official_score_available: true,
      overall: versant.overall, cefr: versant.cefr,
      listening: versant.listening, speaking: versant.speaking,
      manner_of_speaking: versant.manner_of_speaking,
      per_skill: versant.per_skill, ...rawAgg,
    }
  } else if (scoringModel === 'band') {
    const ielts = computeIeltsResult({
      reading: perSkill.has('reading')
        ? { ...perSkill.get('reading')!, scale: skillScale.get('reading') ?? null } : undefined,
      listening: perSkill.has('listening')
        ? { ...perSkill.get('listening')!, scale: skillScale.get('listening') ?? null } : undefined,
      writing: { items: items.filter(it => it.skill === 'writing').map(it => ({ band: it.score ?? 0, weight: it.weight })) },
      speaking: { items: items.filter(it => it.skill === 'speaking').map(it => ({ band: it.score ?? 0, weight: it.weight })) },
    })
    skillScoreRows = ielts.per_skill.map(p => {
      const agg = perSkill.get(p.skill)
      return {
        attempt_id: attemptId, user_id: attempt.user_id, skill: p.skill,
        raw_score: p.raw ?? (agg ? Math.round(agg.raw * 100) / 100 : 0),
        scaled_score: p.band, max_score: p.max ?? (agg?.max ?? 0),
      }
    })
    overallScore = {
      model: 'ielts_band', official_score_available: true,
      overall_band: ielts.overall_band, per_skill: ielts.per_skill, ...rawAgg,
    }
  } else {
    skillScoreRows = [...perSkill.entries()].map(([skill, agg]) => {
      const scaled = applyScale(skillScale.get(skill) ?? null, agg.raw, agg.max)
      return {
        attempt_id: attemptId, user_id: attempt.user_id, skill,
        raw_score: Math.round(agg.raw * 100) / 100,
        scaled_score: scaled.band ?? scaled.scaled, max_score: agg.max,
      }
    })
    const scaledValues = skillScoreRows.map(r => r.scaled_score).filter((s): s is number => s != null)
    const scaledTotal = scoringModel === 'scaled' && scaledValues.length > 0
      ? scaledValues.reduce((a, b) => a + b, 0) : null
    const overallScaled = applyScale(overallScale, rawTotal, maxTotal)
    overallScore = {
      official_score_available: true,
      scaled_total: scaledTotal,
      scaled: overallScaled.scaled, band: overallScaled.band, passed: overallScaled.passed,
      per_skill: skillScoreRows.map(r => ({ skill: r.skill, raw: r.raw_score, max: r.max_score, scaled: r.scaled_score })),
      ...rawAgg,
    }
  }

  if (skillScoreRows.length > 0) {
    await supabase.from('attempt_skill_scores').upsert(skillScoreRows, { onConflict: 'attempt_id,skill' })
  }

  const status: 'submitted' | 'scored' = pendingHuman ? 'submitted' : 'scored'
  const now = new Date().toISOString()
  await supabase
    .from('test_attempts')
    .update({
      status,
      submitted_at: attempt.submitted_at ?? now,
      scored_at: pendingHuman ? null : now,
      raw_score: Math.round(rawTotal * 100) / 100,
      overall_score: overallScore,
      updated_at: now,
    })
    .eq('id', attemptId)

  // Single-form exams: attach the result to the student's profile (latest
  // scored attempt wins). Multi-section sets (IELTS, TOEIC) are written by the
  // set-results API once every section is scored. Never blocks finalization.
  if (status === 'scored') {
    const o = overallScore as { model?: string; level?: unknown; cefr_j?: unknown; overall?: unknown; cefr?: unknown; listening?: unknown; speaking?: unknown }
    if (o.model === 'cefr_level' && o.level) {
      try {
        await supabase
          .from('profiles')
          .update({ cefr_level: String(o.level), cefr_level_updated_at: now })
          .eq('id', attempt.user_id)
      } catch (err) {
        console.error('Could not save CEFR level to profile:', err)
      }
      await saveExamScore(supabase, attempt.user_id, 'cefr', {
        level: o.level, cefr_j: o.cefr_j ?? null,
      })
    } else if (o.model === 'versant_gse' && o.overall != null) {
      await saveExamScore(supabase, attempt.user_id, 'versant', {
        gse: o.overall, cefr: o.cefr ?? null, listening: o.listening ?? null, speaking: o.speaking ?? null,
      })
    }
  }

  return { status, overall_score: overallScore }
}
