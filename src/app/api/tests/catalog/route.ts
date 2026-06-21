import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess, isFreeExam } from '@/lib/test-entitlement'
import { getUserPermissions } from '@/lib/user-permissions'

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
  // Per-user feature permission: if an admin has switched off test access for
  // this user, hide the catalogue entirely (the attempt route also blocks
  // direct starts). Admins themselves always see tests.
  if (!admin && !(await getUserPermissions(supabase, user.id)).tests_enabled) {
    return NextResponse.json({ forms: [], testAccess: false })
  }

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
  const [{ data: forms, error }, entitled] = await Promise.all([
    query,
    hasTestAccess(supabase, user),
  ])

  if (error) {
    console.error('Failed to load catalog:', error)
    return NextResponse.json({ error: 'Could not load tests' }, { status: 500 })
  }

  // Paywall: flag paid exams as locked for users without a subscription so
  // the UI can show lock badges + the upgrade CTA. (Enforced server-side in
  // POST /api/tests/attempts — this flag is presentation only.)
  const withLock = (forms ?? []).map(f => {
    const track = f.track as unknown as { exam?: { slug?: string } | null } | null
    return { ...f, locked: !entitled && !isFreeExam(track?.exam?.slug) }
  })

  return NextResponse.json({ forms: withLock, testAccess: entitled })
}
