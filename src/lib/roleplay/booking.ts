import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sceneById } from './index'
import { loadProgress } from './progress'
import { canPlay, type LevelIndex } from './types'

/**
 * A role-play chosen for an AI lesson (phase 3c: the dashboard picker, book ahead or start now).
 * Checked here, never trusted from the browser: the scene must exist and the level must be one the student may
 * play (up to the one they're due: 初級 first, then 中級, then 上級).
 */
export type RoleplayPick = { sceneId: string; level: LevelIndex }

/** undefined = no role-play asked for; 'bad' = asked for one that isn't allowed */
export async function checkRoleplayPick(userId: string, raw: unknown): Promise<RoleplayPick | undefined | 'bad'> {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object') return 'bad'
  const r = raw as { sceneId?: unknown; level?: unknown }
  const scene = typeof r.sceneId === 'string' ? sceneById(r.sceneId) : null
  if (!scene) return 'bad'
  const cleared = (await loadProgress(userId))[scene.id] ?? 0
  const level = (r.level === 1 || r.level === 2 ? r.level : 0) as LevelIndex
  return canPlay(cleared, level) ? { sceneId: scene.id, level } : 'bad'
}

/** The booking's role-play columns (they may not exist before supabase/add-roleplay-booking.sql: then none). */
export const roleplayColumns = (p: RoleplayPick | undefined) => (p ? { roleplay_scene_id: p.sceneId, roleplay_level: p.level } : {})

/** The role-play booked for a lesson, if any (tolerant of the columns not existing yet). */
export async function bookedRoleplay(bookingId: string): Promise<RoleplayPick | null> {
  const { data, error } = await getSupabaseAdmin().from('bookings').select('roleplay_scene_id, roleplay_level').eq('id', bookingId).maybeSingle()
  if (error || !data?.roleplay_scene_id || !sceneById(data.roleplay_scene_id as string)) return null
  const l = Number(data.roleplay_level)
  return { sceneId: data.roleplay_scene_id as string, level: (l === 1 || l === 2 ? l : 0) as LevelIndex }
}
