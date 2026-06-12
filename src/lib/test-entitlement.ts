import type { SupabaseClient } from '@supabase/supabase-js'
import type { JwtUser } from '@/lib/supabase-jwt'
import { isAdminTestUser } from '@/lib/test-auth'

/**
 * Test paywall (Exam Pass / 模試パス).
 *
 * Exams whose slug is in FREE_EXAMS are free for everyone (CEFR is the lead
 * magnet — it fills in profiles.cefr_level and shows off the test engine).
 * Everything else requires entitlement:
 *   - admins (draft preview accounts), or
 *   - ANY non-cancelled subscription: lesson plans (light/standard) include
 *     tests as a perk, and 'test' (Exam Pass, ¥2,980/month) is tests only.
 *
 * Mirrors the lesson-booking check in /api/calendar/book: a subscription row
 * exists and status !== 'cancelled' (past_due keeps access during the Stripe
 * retry window, same as lessons).
 */
export const FREE_EXAMS = new Set(['cefr'])

export function isFreeExam(examSlug: string | null | undefined): boolean {
  return !!examSlug && FREE_EXAMS.has(examSlug)
}

/** Whether this user can take paid (non-free) tests. */
export async function hasTestAccess(
  supabase: SupabaseClient,
  user: JwtUser,
): Promise<boolean> {
  if (isAdminTestUser(user)) {
    // Admin testing override (admin page → Testing tab): simulate a free,
    // non-subscribed user so gating/upsell flows can be tested first-hand.
    // Draft visibility is handled separately and stays on.
    const { data: prof } = await supabase
      .from('profiles')
      .select('admin_simulate_free')
      .eq('id', user.id)
      .maybeSingle()
    return !prof?.admin_simulate_free
  }
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  return !!sub && sub.status !== 'cancelled'
}

/**
 * Draft (unpublished) course visibility for non-admin TEST accounts.
 * course_tester grants visibility only — never entitlement — so testers walk
 * the real free-user gating on courses that are not public yet.
 */
export async function isCourseTester(
  supabase: SupabaseClient,
  user: JwtUser,
): Promise<boolean> {
  if (isAdminTestUser(user)) return true
  const { data } = await supabase
    .from('profiles')
    .select('course_tester')
    .eq('id', user.id)
    .maybeSingle()
  return !!data?.course_tester
}
