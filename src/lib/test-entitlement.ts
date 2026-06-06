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
 *     tests as a perk, and 'test' (Exam Pass, ¥2,000/month) is tests only.
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
  if (isAdminTestUser(user)) return true
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  return !!sub && sub.status !== 'cancelled'
}
