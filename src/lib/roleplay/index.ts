import cafeAbroad from './scenes/cafe-abroad.json'
import izakayaGuests from './scenes/izakaya-guests.json'
import workIntro from './scenes/work-intro.json'
import { LEVEL_NAMES, otherRole, roleOf, type LevelIndex, type RoleId, type Scene } from './types'

// the scene files are server-side (and in the role-play API); the browser imports './types' only
export * from './types'

/** Every role-play, in the order the picker lists them. Add a scene: write its JSON in scenes/ and list it here. */
export const SCENES: Scene[] = [cafeAbroad, izakayaGuests, workIntro] as Scene[]

export const sceneById = (id: string | null | undefined): Scene | null => SCENES.find((s) => s.id === id) ?? null

/**
 * The instruction that starts a role-play on the AI tutor's side: the scene, the character it plays, how it
 * plays it at this level, and the student's tasks (so it gives them the chance to do each one).
 */
export function roleplayInstruction(scene: Scene, studentRole: RoleId, level: LevelIndex): string {
  const mine = roleOf(scene, studentRole)
  const yours = roleOf(scene, otherRole(studentRole))
  const L = mine.levels[level]
  const tasks = L.tasks.map((t, i) => `${i + 1}. ${t.title.en}`).join('\n')
  const twist = L.twist ? `\nTwist: after the student has done "${L.tasks.find((t) => t.id === L.twist!.after)?.title.en ?? L.twist.after}", ${L.twist.tutor}` : ''
  const prop = scene.prop
    ? `\nThe student can see this ${scene.prop.label.en.toLowerCase()} on their screen (you know it too):\n${scene.prop.title}\n${scene.prop.sections
        .map((s) => `${s.heading}: ${s.items.map((i) => (i.value ? `${i.name} ${i.value}` : i.name)).join(', ')}`)
        .join('\n')}${scene.prop.foot ? `\n${scene.prop.foot}` : ''}`
    : ''
  return `ROLE-PLAY STARTS NOW (${LEVEL_NAMES[level].en} level). The student sees the scene and their task list on screen.
Scene: ${scene.title.en}. ${scene.setting}
The student plays: ${mine.name.en} (${mine.persona}).
You play: ${yours.name.en} (${yours.persona}). ${L.tutor}
The student's tasks, in order:
${tasks}${twist}${prop}
Rules: stay in character and speak first to start the scene. Steer the conversation so the student gets the chance to do each task, one at a time, but let them say it themselves (never say their line for them). If they make a mistake, you may give the natural version briefly ("A more natural way is: …") and carry on in character. When every task is done, end the scene naturally, then say "That's the end of the role-play!" and stop there: you'll get a short note with how they did, and only then give your feedback.`
}
