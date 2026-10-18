import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { SCENES, sceneById } from './index'
import { nextLevel, type LevelIndex, type RoleId, type SceneSummary } from './types'

export type { SceneSummary }

/** levels cleared per scene, for this student (missing = 0) */
export async function loadProgress(userId: string): Promise<Record<string, number>> {
  const { data } = await getSupabaseAdmin().from('roleplay_progress').select('scene_id, cleared').eq('user_id', userId)
  return Object.fromEntries((data ?? []).map((r) => [r.scene_id as string, Number(r.cleared) || 0]))
}

export async function sceneSummaries(userId: string): Promise<SceneSummary[]> {
  const done = await loadProgress(userId)
  return SCENES.map((s) => {
    const cleared = done[s.id] ?? 0
    const next = nextLevel(cleared)
    const mine = s.roles.find((r) => r.id === s.studentRole) ?? s.roles[0]
    const other = s.roles.find((r) => r.id !== s.studentRole) ?? s.roles[1]
    return {
      id: s.id,
      category: s.category,
      title: s.title,
      summary: s.summary,
      image: s.image,
      role: mine.name,
      otherRole: other.name,
      tasks: mine.levels[next].tasks.map((t) => t.title),
      hasProp: !!s.prop,
      cleared,
      next,
    }
  })
}

/**
 * A mission completed: in the student's main role, at the level they were due to play, it moves them on
 * (初級 → 中級 → 上級). Replays of easier levels and swapped-role missions count as plays only.
 */
export async function recordMission(userId: string, sceneId: string, role: RoleId, level: LevelIndex): Promise<{ cleared: number }> {
  const scene = sceneById(sceneId)
  if (!scene) return { cleared: 0 }
  const db = getSupabaseAdmin()
  const { data: row } = await db.from('roleplay_progress').select('cleared, plays').eq('user_id', userId).eq('scene_id', sceneId).maybeSingle()
  const before = Number(row?.cleared) || 0
  const advances = role === scene.studentRole && level === nextLevel(before) && before < 3
  const cleared = advances ? before + 1 : before
  await db.from('roleplay_progress').upsert(
    { user_id: userId, scene_id: sceneId, cleared, plays: (Number(row?.plays) || 0) + 1, last_played_at: new Date().toISOString() },
    { onConflict: 'user_id,scene_id' },
  )
  return { cleared }
}
