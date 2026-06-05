import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'

/**
 * POST /api/tests/attempts
 *   Start a new attempt for a published test form.
 *   Body: { formId?: string, formSlug?: string }
 *   Returns: { attempt }
 *
 * GET /api/tests/attempts
 *   List the caller's own attempts (most recent first), with form/track labels.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  let body: { formId?: string; formSlug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { formId, formSlug } = body
  if (!formId && !formSlug) {
    return NextResponse.json({ error: 'formId or formSlug is required' }, { status: 400 })
  }

  // Verify the form exists and is published.
  let formQuery = supabase
    .from('test_forms')
    .select('id, track_id, title, mode, time_limit_seconds, published')
  formQuery = formId ? formQuery.eq('id', formId) : formQuery.eq('slug', formSlug!)

  const { data: form, error: formError } = await formQuery.single()
  if (formError || !form) {
    return NextResponse.json({ error: 'Test form not found' }, { status: 404 })
  }
  if (!form.published) {
    return NextResponse.json({ error: 'Test form is not available' }, { status: 403 })
  }

  // One attempt per form (like a real exam). If the user already has one,
  // return it instead of creating a duplicate — enforced here so it holds even
  // if the client is bypassed.
  const { data: existing } = await supabase
    .from('test_attempts')
    .select('id, form_id, status, started_at, created_at')
    .eq('user_id', user.id)
    .eq('form_id', form.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ attempt: existing, existing: true })
  }

  // NOTE: subscription/quota gating can be enforced here before insert.

  const { data: attempt, error: insertError } = await supabase
    .from('test_attempts')
    .insert({ user_id: user.id, form_id: form.id, status: 'in_progress' })
    .select('id, form_id, status, started_at, created_at')
    .single()

  if (insertError || !attempt) {
    console.error('Failed to create attempt:', insertError)
    return NextResponse.json({ error: 'Could not start the test' }, { status: 500 })
  }

  return NextResponse.json({ attempt, existing: false }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const { data: attempts, error } = await supabase
    .from('test_attempts')
    .select(`
      id, status, started_at, submitted_at, scored_at, time_spent_seconds,
      raw_score, overall_score, created_at,
      form:test_forms (
        id, slug, title, title_ja, mode,
        track:exam_tracks ( id, slug, name, level_label, scoring_model,
          exam:exams ( slug, name ) )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to list attempts:', error)
    return NextResponse.json({ error: 'Could not load attempts' }, { status: 500 })
  }

  return NextResponse.json({ attempts: attempts ?? [] })
}
