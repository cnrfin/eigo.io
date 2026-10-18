/**
 * Ticking a role-play's tasks (phase 3b). After each pause during a role-play, a small model reads the scene's
 * conversation and says which of the student's remaining tasks they have now done. Guardrails, in code:
 *  - only tasks that are on the student's list and not ticked yet
 *  - each tick must come with the STUDENT's own words, found in what the student actually said (the tutor's lines
 *    never tick anything: the student has to say it)
 * Pure apart from the model call (lib/ai-tutor/turn.ts decideTicks), so it's easy to test.
 */
import { normText } from '@/lib/ai-tutor/actions'
import { otherRole, roleOf, tasksFor, type LevelIndex, type RoleId, type Scene } from './types'

export type Tick = { id: string; said: string }
type Line = { from: 'student' | 'tutor'; text: string }

/** the tasks still to do, in order (the twist's task appears once the twist has happened) */
export function openTasks(scene: Scene, role: RoleId, level: LevelIndex, twisted: boolean, done: string[]) {
  return tasksFor(roleOf(scene, role).levels[level], twisted).filter((t) => !done.includes(t.id))
}

export function ticksPrompt(scene: Scene, role: RoleId, level: LevelIndex, open: { id: string; title: { en: string }; hints: string[] }[], lines: Line[]) {
  const mine = roleOf(scene, role)
  const yours = roleOf(scene, otherRole(role))
  const system = `You follow a role-play in an English lesson for a Japanese learner. The student plays ${mine.name.en}; the AI tutor plays ${yours.name.en}.
Decide which of the student's tasks below the STUDENT has now done, in their own words. A task counts when the student clearly does it, even with small grammar mistakes or simple words. It does not count if only the tutor said it, if the student only repeated the tutor, or if they said it in Japanese.
Return JSON: {"done": [{"id": string, "said": string}]}  ("said" = the student's words that did it, copied exactly, at most 15 words). Return {"done": []} if none.`
  const user = `Scene: ${scene.title.en}. ${scene.setting}
Student's tasks not done yet:
${open.map((t) => `- id "${t.id}": ${t.title.en} (for example: "${t.hints[2]}")`).join('\n')}
Conversation (most recent last):
${lines.map((l) => `${l.from === 'student' ? 'Student' : 'Tutor'}: ${l.text.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n')}`
  return { system, user }
}

/** Keep only ticks for open tasks, backed by words the student really said. */
export function validateTicks(raw: unknown, openIds: string[], lines: Line[]): Tick[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { done?: unknown }).done) ? ((raw as { done: unknown[] }).done as unknown[]) : []
  const student = normText(lines.filter((l) => l.from === 'student').map((l) => l.text).join(' \n '))
  const out: Tick[] = []
  for (const x of list) {
    if (!x || typeof x !== 'object') continue
    const id = String((x as { id?: unknown }).id ?? '')
    const said = String((x as { said?: unknown }).said ?? '').trim().slice(0, 160)
    const q = normText(said)
    if (!openIds.includes(id) || out.some((t) => t.id === id) || q.length < 2 || !student.includes(q)) continue
    out.push({ id, said })
  }
  return out
}
