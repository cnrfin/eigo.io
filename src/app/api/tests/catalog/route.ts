import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'

/**
 * GET /api/tests/catalog
 *   The student-facing list of available (published) tests, with track + exam
 *   labels. Catalogue metadata only — no questions or answers.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const { data: forms, error } = await supabase
    .from('test_forms')
    .select(`
      id, slug, title, title_ja, mode, time_limit_seconds,
      set_slug, set_title, set_title_ja, set_order,
      sections ( skill ),
      track:exam_tracks ( id, slug, name, name_ja, level_label, order_index,
        exam:exams ( slug, name, name_ja, order_index ) )
    `)
    .eq('published', true)

  if (error) {
    console.error('Failed to load catalog:', error)
    return NextResponse.json({ error: 'Could not load tests' }, { status: 500 })
  }

  return NextResponse.json({ forms: forms ?? [] })
}
