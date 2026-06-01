import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

/**
 * Admin test authoring.
 *
 * GET  /api/admin/tests
 *   List all forms (any publish state) with track/exam labels.
 *
 * POST /api/admin/tests
 *   Bulk-import a full form tree in one request. Body:
 *   {
 *     "trackId" | "trackSlug": string,
 *     "form": {
 *       "slug", "title", "title_ja?", "mode?", "time_limit_seconds?", "published?",
 *       "sections": [{
 *         "skill", "part_label?", "title?", "instructions?", "time_limit_seconds?",
 *         "groups": [{
 *           "stimulus_type?", "passage_text?", "prompt?", "audio_asset_id?", "image_asset_id?",
 *           "questions": [{
 *             "question_type", "scoring_method?", "prompt?", "payload?", "rubric_id?", "max_score?",
 *             "options?": [{ "label?", "content?", "is_correct?" }]
 *           }]
 *         }]
 *       }]
 *     }
 *   }
 *   order_index is derived from array position. On any failure the whole form is
 *   rolled back (deleted — children cascade).
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()

  const { data: forms, error } = await supabase
    .from('test_forms')
    .select(`
      id, slug, title, title_ja, mode, time_limit_seconds, published, created_at,
      track:exam_tracks ( id, slug, name, level_label, exam:exams ( slug, name ) )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to list forms:', error)
    return NextResponse.json({ error: 'Could not load forms' }, { status: 500 })
  }
  return NextResponse.json({ forms: forms ?? [] })
}

interface ImportOption { label?: string; content?: string; is_correct?: boolean }
interface ImportQuestion {
  question_type: string
  scoring_method?: string
  prompt?: string
  payload?: Record<string, unknown>
  rubric_id?: string | null
  max_score?: number
  options?: ImportOption[]
}
interface ImportGroup {
  stimulus_type?: string
  passage_text?: string
  prompt?: string
  audio_asset_id?: string | null
  image_asset_id?: string | null
  questions?: ImportQuestion[]
}
interface ImportSection {
  skill: string
  part_label?: string
  title?: string
  instructions?: string
  time_limit_seconds?: number | null
  groups?: ImportGroup[]
}
interface ImportForm {
  slug: string
  title: string
  title_ja?: string
  mode?: string
  time_limit_seconds?: number | null
  published?: boolean
  sections?: ImportSection[]
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()

  let body: { trackId?: string; trackSlug?: string; form?: ImportForm }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { trackId, trackSlug, form } = body
  if ((!trackId && !trackSlug) || !form?.slug || !form?.title) {
    return NextResponse.json({ error: 'trackId/trackSlug and form.slug + form.title are required' }, { status: 400 })
  }

  // Resolve track.
  let trackQuery = supabase.from('exam_tracks').select('id')
  trackQuery = trackId ? trackQuery.eq('id', trackId) : trackQuery.eq('slug', trackSlug!)
  const { data: track, error: trackError } = await trackQuery.single()
  if (trackError || !track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  // Insert the form root.
  const { data: insertedForm, error: formError } = await supabase
    .from('test_forms')
    .insert({
      track_id: track.id,
      slug: form.slug,
      title: form.title,
      title_ja: form.title_ja ?? '',
      mode: form.mode ?? 'full_mock',
      time_limit_seconds: form.time_limit_seconds ?? null,
      published: form.published ?? false,
    })
    .select('id')
    .single()

  if (formError || !insertedForm) {
    const conflict = formError?.code === '23505'
    return NextResponse.json(
      { error: conflict ? 'A form with that slug already exists' : 'Could not create form' },
      { status: conflict ? 409 : 500 }
    )
  }
  const formId = insertedForm.id

  // Build the tree. Roll back the whole form on any error.
  try {
    let counts = { sections: 0, groups: 0, questions: 0, options: 0 }

    for (const [sIdx, section] of (form.sections ?? []).entries()) {
      const { data: insSection, error: sErr } = await supabase
        .from('sections')
        .insert({
          form_id: formId,
          skill: section.skill,
          part_label: section.part_label ?? '',
          title: section.title ?? '',
          instructions: section.instructions ?? '',
          time_limit_seconds: section.time_limit_seconds ?? null,
          order_index: sIdx,
        })
        .select('id')
        .single()
      if (sErr || !insSection) throw new Error(`section ${sIdx}: ${sErr?.message}`)
      counts.sections++

      for (const [gIdx, group] of (section.groups ?? []).entries()) {
        const { data: insGroup, error: gErr } = await supabase
          .from('question_groups')
          .insert({
            section_id: insSection.id,
            order_index: gIdx,
            stimulus_type: group.stimulus_type ?? 'none',
            passage_text: group.passage_text ?? '',
            prompt: group.prompt ?? '',
            audio_asset_id: group.audio_asset_id ?? null,
            image_asset_id: group.image_asset_id ?? null,
          })
          .select('id')
          .single()
        if (gErr || !insGroup) throw new Error(`group ${sIdx}.${gIdx}: ${gErr?.message}`)
        counts.groups++

        const questionRows = (group.questions ?? []).map((q, qIdx) => ({
          group_id: insGroup.id,
          order_index: qIdx,
          question_type: q.question_type,
          scoring_method: q.scoring_method ?? 'auto_choice',
          prompt: q.prompt ?? '',
          payload: q.payload ?? {},
          rubric_id: q.rubric_id ?? null,
          max_score: q.max_score ?? 1,
        }))
        if (questionRows.length === 0) continue

        const { data: insQuestions, error: qErr } = await supabase
          .from('questions')
          .insert(questionRows)
          .select('id, order_index')
        if (qErr || !insQuestions) throw new Error(`questions ${sIdx}.${gIdx}: ${qErr?.message}`)
        counts.questions += insQuestions.length

        // Map order_index -> id so options attach to the right question regardless of return order.
        const idByOrder = new Map(insQuestions.map(q => [q.order_index, q.id]))
        const optionRows: Array<{ question_id: string; order_index: number; label: string; content: string; is_correct: boolean }> = []
        ;(group.questions ?? []).forEach((q, qIdx) => {
          const questionId = idByOrder.get(qIdx)
          if (!questionId) return
          ;(q.options ?? []).forEach((o, oIdx) => {
            optionRows.push({
              question_id: questionId,
              order_index: oIdx,
              label: o.label ?? '',
              content: o.content ?? '',
              is_correct: !!o.is_correct,
            })
          })
        })
        if (optionRows.length > 0) {
          const { error: oErr } = await supabase.from('question_options').insert(optionRows)
          if (oErr) throw new Error(`options ${sIdx}.${gIdx}: ${oErr.message}`)
          counts.options += optionRows.length
        }
      }
    }

    return NextResponse.json({ formId, counts }, { status: 201 })
  } catch (err) {
    console.error('Import failed, rolling back form:', err)
    await supabase.from('test_forms').delete().eq('id', formId)
    return NextResponse.json({ error: 'Import failed — no partial form was saved' }, { status: 500 })
  }
}
