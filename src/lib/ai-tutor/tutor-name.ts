import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeSettings, type TutorSettings } from './settings'

/**
 * Every student's AI tutor has a name from the start: a short one, easy for Japanese learners to say (no L/R or
 * "th"), picked at random. Male or unisex only: the default voice (Vesper) is male. They can change it in their AI
 * tutor settings.
 */
export const TUTOR_NAMES = ['Tom', 'Ben', 'Sam', 'Max', 'Dan', 'Jay', 'Ken', 'Joe', 'Kai', 'Noah'] as const

export const randomTutorName = () => TUTOR_NAMES[Math.floor(Math.random() * TUTOR_NAMES.length)]

/** The student's settings, with a name given (and saved) the first time there isn't one. */
export async function withTutorName(db: SupabaseClient, userId: string, raw: unknown): Promise<TutorSettings> {
  const settings = normalizeSettings(raw)
  if (settings.tutorName.trim()) return settings
  const named = normalizeSettings({ ...settings, tutorName: randomTutorName() })
  // (only if it still has none: two tabs at once keep the first name given)
  const { data: cur } = await db.from('ai_tutor_profiles').select('settings').eq('user_id', userId).maybeSingle()
  const now = normalizeSettings(cur?.settings)
  if (now.tutorName.trim()) return now
  await db.from('ai_tutor_profiles').upsert({ user_id: userId, settings: { ...now, tutorName: named.tutorName }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return { ...now, tutorName: named.tutorName }
}
