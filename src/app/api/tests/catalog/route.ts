import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'

/**
 * GET /api/tests/catalog
 *   The student-facing list of available (published) tests, with track + exam
 *   labels. Catalogue metadata only — no questions or answers.
 *   Admins ALSO receive unpublished forms (flagged via `published: false`) so
 *   new exams can be tested in production before students can see them.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const admin = isAdminTestUser(user)

  let query = supabase
    .from('test_forms')
    .select(`
      id, slug, title, title_ja, mode, time_limit_seconds, published,
      set_slug, set_title, set_title_ja, set_order,
      sections ( skill ),
      track:exam_tracks ( id, slug, name, name_ja, level_label, order_index,
        exam:exams ( slug, name, name_ja, order_index ) )
    `)
  if (!admin) query = query.eq('published', true)
  const { data: forms, error } = await query

  if (error) {
    console.error('Failed to load catalog:', error)
    return NextResponse.json({ error: 'Could not load tests' }, { status: 500 })
  }

  return NextResponse.json({ forms: forms ?? [] })
}
