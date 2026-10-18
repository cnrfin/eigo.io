/**
 * Phrases to save after a role-play (the mission-complete screen): up to three model sentences from the scene, the
 * ones most worth keeping for next time. Taken from the scene itself (each task's full-sentence hint), so they're
 * always right for the level and need no AI: first the tasks the student didn't get to, then the ones where what
 * they said was furthest from the model sentence. Pure, so it's easy to test.
 */
import { share } from '@/lib/ai-tutor/voice-match'
import { roleOf, tasksFor, type LevelIndex, type RoleId, type Scene } from './types'

export type Phrase = { term: string; ja: string }

export function phrasesToSave(scene: Scene, role: RoleId, level: LevelIndex, twisted: boolean, done: Record<string, string>, max = 3): Phrase[] {
  const tasks = tasksFor(roleOf(scene, role).levels[level], twisted)
  const scored = tasks
    .map((t, i) => {
      const model = t.hints[2]?.trim() ?? ''
      const said = done[t.id]
      // 0 = missed; otherwise how much of the model sentence they said (lower = more worth saving)
      const score = said ? (share(said, model) + share(model, said)) / 2 : -1
      return { t, i, model, score }
    })
    // a model sentence they already said (nearly) word for word isn't worth saving
    .filter((x) => x.model && x.score < 0.85)
    .sort((a, b) => a.score - b.score || a.i - b.i)
  return scored.slice(0, max).map((x) => ({ term: x.model, ja: x.t.title.ja }))
}
