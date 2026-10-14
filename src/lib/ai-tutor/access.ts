import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getUserPermissions } from '@/lib/user-permissions'
import { isAdminEmail } from '@/lib/admin-redirect'
import { getUserSubscription } from '@/lib/subscription'

/**
 * Who can use the AI tutor: admins, pilot students (user_permissions.ai_enabled) and anyone on an active AI
 * plan. `unlimited` = not charged minutes (admins, test accounts). `aiOnly` = AI plan: no teacher lessons.
 */
export async function aiAccess(user: { id: string; email?: string | null }): Promise<{ ok: boolean; unlimited: boolean; aiOnly: boolean; pilot: boolean }> {
  const admin = isAdminEmail(user.email)
  const [perms, sub] = await Promise.all([getUserPermissions(getSupabaseAdmin(), user.id), getUserSubscription(user.id)])
  const aiPlan = !!sub && sub.plan === 'ai' && sub.status !== 'cancelled'
  return { ok: admin || perms.ai_enabled || aiPlan, unlimited: admin || perms.booking_test_mode, aiOnly: aiPlan, pilot: admin || perms.ai_enabled }
}
