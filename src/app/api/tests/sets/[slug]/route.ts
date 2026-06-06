import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { computeEikenResult, roundToHalf, type Skill } from '@/lib/test-grading'
import { saveExamScore } from '@/lib/profile-scores'
import { hasTestAccess, isFreeExam } from '@/lib/test-entitlement'

/**
 * GET /api/tests/sets/[slug]
 *   One mock SET (the per-skill sections of a full mock, taken in separate
 *   sittings) for the current user: each section's form + the user's attempt
 *   status + per-skill scores, and — once EVERY section is scored — the
 *   official combined result:
 *     - EIKEN: CSE per skill/stage totals + pass/fail (real cut-scores)
 *     - IELTS: overall band = mean of the four section bands, rounded to half
 *     - scaled (TOEIC-style): total of section scaled scores
 *   Until the set is complete, `combined` is null and `remaining` lists what's
 *   left, so sections give instant feedback but the headline claim waits for
 *   complete evidence.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { slug } = await params

  // Admins also see sets whose forms are still unpublished (draft preview).
  const admin = isAdminTestUser(user)
  let formsQuery = supabase
    .from('test_forms')
    .select('id, slug, title, title_ja, mode, time_limit_seconds, published, set_slug, set_title, set_title_ja, set_order, track_id, track:exam_tracks ( id, slug, name, name_ja, scoring_model, exam:exams ( slug ) )')
    .eq('set_slug', slug)
    .order('set_order', { ascending: true })
  if (!admin) formsQuery = formsQuery.eq('published', true)
  const { data: forms, error } = await formsQuery

  if (error || !forms || forms.length === 0) {
    return NextResponse.json({ error: 'Set not found' }, { status: 404 })
  }

  const formIds = forms.map(f => f.id)
  const trackId = forms[0].track_id
  const track = forms[0].track as { scoring_model?: string } | null
  const scoringModel = track?.scoring_model ?? 'raw'

  const { data: attempts } = await supabase
    .from('test_attempts')
    .select('id, form_id, status, submitted_at, scored_at, overall_score, review_mode')
    .eq('user_id', user.id)
    .in('form_id', formIds)
    .order('started_at', { ascending: true })
  const attemptByForm = new Map((attempts ?? []).map(a => [a.form_id, a]))

  // Each section form's skill(s) — for "Start Listening"-style buttons/chips.
  const { data: secRows } = await supabase
    .from('sections').select('id, form_id, skill, order_index').in('form_id', formIds).order('order_index')
  const skillsByForm = new Map<string, string[]>()
  const sectionForm = new Map<string, string>()
  for (const s of secRows ?? []) {
    const arr = skillsByForm.get(s.form_id) ?? []
    if (!arr.includes(s.skill)) arr.push(s.skill)
    skillsByForm.set(s.form_id, arr)
    sectionForm.set(s.id, s.form_id)
  }

  // Question totals per form + answered counts for in-progress attempts, so the
  // UI can show how far through a section the student is (sections can be
  // resumed across sittings).
  const sectionIds = (secRows ?? []).map(s => s.id)
  const { data: grpRows } = sectionIds.length
    ? await supabase.from('question_groups').select('id, section_id').in('section_id', sectionIds)
    : { data: [] as Array<{ id: string; section_id: string }> }
  const groupForm = new Map((grpRows ?? []).map(g => [g.id, sectionForm.get(g.section_id) ?? '']))
  const groupIds = (grpRows ?? []).map(g => g.id)
  const { data: qRows } = groupIds.length
    ? await supabase.from('questions').select('id, group_id').in('group_id', groupIds)
    : { data: [] as Array<{ id: string; group_id: string }> }
  const totalByForm = new Map<string, number>()
  for (const q of qRows ?? []) {
    const fid = groupForm.get(q.group_id)
    if (fid) totalByForm.set(fid, (totalByForm.get(fid) ?? 0) + 1)
  }

  const inProgressIds = (attempts ?? []).filter(a => a.status === 'in_progress').map(a => a.id)
  const answeredByAttempt = new Map<string, number>()
  if (inProgressIds.length) {
    const { data: respRows } = await supabase
      .from('responses')
      .select('attempt_id, selected_option_ids, text_response, audio_asset_id')
      .in('attempt_id', inProgressIds)
    for (const r of respRows ?? []) {
      const answered =
        (Array.isArray(r.selected_option_ids) && r.selected_option_ids.length > 0) ||
        (typeof r.text_response === 'string' && r.text_response.trim().length > 0 && r.text_response.trim() !== '{}') ||
        !!r.audio_asset_id
      if (answered) answeredByAttempt.set(r.attempt_id, (answeredByAttempt.get(r.attempt_id) ?? 0) + 1)
    }
  }

  const scoredAttemptIds = (attempts ?? []).filter(a => a.status === 'scored').map(a => a.id)
  const { data: skillRows } = scoredAttemptIds.length
    ? await supabase
        .from('attempt_skill_scores')
        .select('attempt_id, skill, raw_score, scaled_score, max_score')
        .in('attempt_id', scoredAttemptIds)
    : { data: [] as Array<{ attempt_id: string; skill: string; raw_score: number; scaled_score: number | null; max_score: number }> }

  const sections = forms.map(f => {
    const a = attemptByForm.get(f.id)
    const total = totalByForm.get(f.id) ?? 0
    return {
      form: { id: f.id, slug: f.slug, title: f.title, title_ja: f.title_ja, mode: f.mode, time_limit_seconds: f.time_limit_seconds, set_order: f.set_order, published: f.published, form_skills: skillsByForm.get(f.id) ?? [] },
      attempt: a ? { id: a.id, status: a.status, review_mode: a.review_mode, scored_at: a.scored_at } : null,
      // How far through the section the student is (for the progress ring).
      progress: {
        total,
        answered: a
          ? a.status === 'in_progress' ? answeredByAttempt.get(a.id) ?? 0 : total
          : 0,
      },
      skills: a
        ? (skillRows ?? []).filter(r => r.attempt_id === a.id).map(r => ({
            skill: r.skill, raw: Number(r.raw_score), scaled: r.scaled_score === null ? null : Number(r.scaled_score), max: Number(r.max_score),
          }))
        : [],
    }
  })

  const complete = sections.every(s => s.attempt?.status === 'scored')
  const remaining = sections.filter(s => s.attempt?.status !== 'scored').map(s => s.form.slug)

  // ── Combined official result (only with complete evidence) ──
  let combined: Record<string, unknown> | null = null
  if (complete && forms.length === 1) {
    // Single-sitting mock (Versant, CEFR check): the attempt's own finalized
    // overall score IS the combined result — no cross-section math needed.
    const a = attemptByForm.get(forms[0].id)
    combined = (a?.overall_score as Record<string, unknown> | null) ?? null
  } else if (complete) {
    // Merge per-skill raw/max + scaled across the set's attempts.
    const perSkill = new Map<Skill, { raw: number; max: number }>()
    const scaledBySkill = new Map<string, number>()
    for (const s of sections) {
      for (const sk of s.skills) {
        const agg = perSkill.get(sk.skill as Skill) ?? { raw: 0, max: 0 }
        agg.raw += sk.raw
        agg.max += sk.max
        perSkill.set(sk.skill as Skill, agg)
        if (sk.scaled !== null) scaledBySkill.set(sk.skill, sk.scaled)
      }
    }

    const { data: scales } = await supabase
      .from('score_scales').select('skill, scale').eq('track_id', trackId).is('skill', null)
    const overallScale = (scales?.[0]?.scale ?? null) as { model?: string } | null

    if (overallScale?.model === 'eiken_cse') {
      const eiken = computeEikenResult(overallScale as Record<string, unknown>, perSkill)
      combined = {
        model: 'eiken_cse', official_score_available: true,
        cse_total: eiken.cse_total, passed: eiken.passed, stages: eiken.stages, per_skill: eiken.per_skill,
      }
    } else if (scoringModel === 'band') {
      const bands = [...scaledBySkill.entries()].map(([skill, band]) => ({ skill, band }))
      const vals = bands.map(b => b.band)
      combined = {
        model: 'ielts_band', official_score_available: true,
        overall_band: vals.length > 0 ? roundToHalf(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
        per_skill: bands,
      }
    } else if (scoringModel === 'scaled') {
      const vals = [...scaledBySkill.values()]
      combined = {
        model: 'scaled', official_score_available: true,
        scaled_total: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null,
        per_skill: [...scaledBySkill.entries()].map(([skill, scaled]) => ({ skill, scaled })),
      }
    } else {
      const raw = [...perSkill.values()].reduce((s, a) => s + a.raw, 0)
      const max = [...perSkill.values()].reduce((s, a) => s + a.max, 0)
      combined = {
        model: 'raw', official_score_available: false,
        raw: Math.round(raw * 100) / 100, max, percent: max > 0 ? Math.round((raw / max) * 1000) / 10 : 0,
      }
    }
  }

  // Persist the combined result to the student's profile (latest complete
  // mock per exam wins). saveExamScore skips the write when unchanged, so
  // repeated page views cost one cheap read. Single-form sets (Versant, CEFR)
  // are already written at finalize time.
  const examKey = (forms[0].track as { slug?: string } | null)?.slug
  if (complete && combined && forms.length > 1 && examKey) {
    if (combined.model === 'ielts_band' && combined.overall_band != null) {
      await saveExamScore(supabase, user.id, examKey, {
        overall_band: combined.overall_band, per_skill: combined.per_skill ?? null, set_slug: slug,
      })
    } else if (combined.model === 'scaled' && combined.scaled_total != null) {
      await saveExamScore(supabase, user.id, examKey, {
        total: combined.scaled_total, per_skill: combined.per_skill ?? null, set_slug: slug,
      })
    } else if (combined.model === 'eiken_cse' && combined.cse_total != null) {
      await saveExamScore(supabase, user.id, examKey, {
        cse_total: combined.cse_total, passed: combined.passed ?? null, set_slug: slug,
      })
    }
  }

  // Paywall flags for the UI (enforcement lives in POST /api/tests/attempts).
  // Retakes always need a plan — even on free exams (CEFR).
  const examSlug = (forms[0].track as unknown as { exam?: { slug?: string } | null } | null)?.exam?.slug
  const entitled = await hasTestAccess(supabase, user)
  const locked = !isFreeExam(examSlug) && !entitled

  return NextResponse.json({
    set: {
      slug,
      title: forms[0].set_title || forms[0].title,
      title_ja: forms[0].set_title_ja || forms[0].title_ja,
      track: forms[0].track,
    },
    sections,
    complete,
    remaining,
    combined,
    locked,
    canRetake: entitled,
  })
}
