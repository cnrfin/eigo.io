import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Per-user feature permissions (admin-managed, see supabase/add-user-permissions.sql).
 *
 * These layer ON TOP of the normal subscription/free gating: a feature is only
 * usable when the subscription/free rules allow it AND the admin hasn't turned
 * it off for this user. They let a custom (e.g. discounted) plan omit features.
 *
 * DEFAULT-ALLOW: a user with no row gets everything. A feature is restricted
 * only when an explicit row sets it false, so existing users are unaffected and
 * a missing/failed lookup never accidentally locks anyone out.
 *
 * EXCEPTIONS (OPT-IN, false unless a row sets them):
 *  - booking_test_mode: test accounts can book any duration at any time with
 *    no subscription or minutes (supabase/add-booking-test-mode.sql).
 *  - classroom_enabled is OPT-IN (pilot of the in-house classroom,
 * supabase/add-classroom.sql). No row, or a failed lookup, means false, so
 * everyone stays on the plain Whereby link until the admin switches them over.
 */
export type UserPermissions = {
  courses_enabled: boolean
  tests_enabled: boolean
  recordings_enabled: boolean
  transcription_enabled: boolean
  classroom_enabled: boolean
  booking_test_mode: boolean
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  courses_enabled: true,
  tests_enabled: true,
  recordings_enabled: true,
  transcription_enabled: true,
  classroom_enabled: false,
  booking_test_mode: false,
}

/** Effective permissions for a user (defaults merged with any stored overrides). */
export async function getUserPermissions(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserPermissions> {
  const { data } = await supabase
    .from('user_permissions')
    .select('courses_enabled, tests_enabled, recordings_enabled, transcription_enabled, classroom_enabled, booking_test_mode')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return { ...DEFAULT_PERMISSIONS }
  return {
    courses_enabled: data.courses_enabled ?? true,
    tests_enabled: data.tests_enabled ?? true,
    recordings_enabled: data.recordings_enabled ?? true,
    transcription_enabled: data.transcription_enabled ?? true,
    classroom_enabled: data.classroom_enabled ?? false,
    booking_test_mode: data.booking_test_mode ?? false,
  }
}

/** Convenience: is one feature enabled for this user? (default-allow, except the opt-in flags) */
export async function isFeatureEnabled(
  supabase: SupabaseClient,
  userId: string,
  feature: keyof UserPermissions,
): Promise<boolean> {
  const perms = await getUserPermissions(supabase, userId)
  return perms[feature]
}
