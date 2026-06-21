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
 */
export type UserPermissions = {
  courses_enabled: boolean
  tests_enabled: boolean
  recordings_enabled: boolean
  transcription_enabled: boolean
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  courses_enabled: true,
  tests_enabled: true,
  recordings_enabled: true,
  transcription_enabled: true,
}

/** Effective permissions for a user (defaults merged with any stored overrides). */
export async function getUserPermissions(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserPermissions> {
  const { data } = await supabase
    .from('user_permissions')
    .select('courses_enabled, tests_enabled, recordings_enabled, transcription_enabled')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return { ...DEFAULT_PERMISSIONS }
  return {
    courses_enabled: data.courses_enabled ?? true,
    tests_enabled: data.tests_enabled ?? true,
    recordings_enabled: data.recordings_enabled ?? true,
    transcription_enabled: data.transcription_enabled ?? true,
  }
}

/** Convenience: is one feature enabled for this user? (default-allow) */
export async function isFeatureEnabled(
  supabase: SupabaseClient,
  userId: string,
  feature: keyof UserPermissions,
): Promise<boolean> {
  const perms = await getUserPermissions(supabase, userId)
  return perms[feature]
}
