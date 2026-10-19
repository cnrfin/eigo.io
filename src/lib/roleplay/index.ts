import { scenes as travel } from './scenes/travel'
import { scenes as help } from './scenes/help'
import { scenes as service } from './scenes/service'
import { scenes as friends } from './scenes/friends'
import { scenes as business } from './scenes/business'
import { LEVEL_NAMES, otherRole, roleOf, type LevelIndex, type RoleId, type Scene } from './types'

// the scene files are server-side (and in the role-play API); the browser imports './types' only
export * from './types'

/**
 * Every role-play, in the order the pickers list them: by category, then as each category's folder lists them.
 * Add a scene: its JSON goes in scenes/<category>/ and is listed in that folder's index.ts (docs/roleplay-authoring.md).
 */
export const SCENES: Scene[] = [...travel, ...help, ...service, ...friends, ...business]

export const sceneById = (id: string | null | undefined): Scene | null => SCENES.find((s) => s.id === id) ?? null

/**
 * The instruction that starts a role-play on the AI tutor's side: the scene, the character it plays, how it
 * plays it at this level, and the student's tasks (so it gives them the chance to do each one). Sent as up to
 * three notes (each note carries at most 1800 characters): the scene and tasks, the prop, then how to run it.
 */
export function roleplayInstructionParts(
  scene: Scene,
  studentRole: RoleId,
  level: LevelIndex,
  /** sent before it opens (the welcome talk): it starts when the student says "Let's do a role-play" */
  ready = false,
): string[] {
  const mine = roleOf(scene, studentRole)
  const yours = roleOf(scene, otherRole(studentRole))
  const L = mine.levels[level]
  const tasks = L.tasks.map((t, i) => `${i + 1}. ${t.title.en}`).join('\n')
  const twist = L.twist ? `\nTwist: after the student has done "${L.tasks.find((t) => t.id === L.twist!.after)?.title.en ?? L.twist.after}", ${L.twist.tutor}` : ''
  const head = `${
    ready
      ? `ROLE-PLAY READY (${LEVEL_NAMES[level].en} level): this is the role-play for them. It opens on their screen when they say "Let's do a role-play": as soon as they've said it, start it as below (not before, and no other scene).`
      : `ROLE-PLAY STARTS NOW (${LEVEL_NAMES[level].en} level). The student sees the scene and their task list on screen.`
  }
Scene: ${scene.title.en}. ${scene.setting}
The student plays: ${mine.name.en} (${mine.persona}).
You play: ${yours.name.en} (${yours.persona}). ${L.tutor}
The student's tasks, in order:
${tasks}${twist}`
  const prop = scene.prop
    ? `(ROLE-PLAY, continued) The student can see this ${scene.prop.label.en.toLowerCase()} on their screen (you know it too):\n${scene.prop.title}\n${scene.prop.sections
        .map((s) => `${s.heading}: ${s.items.map((i) => (i.value ? `${i.name} ${i.value}` : i.name)).join(', ')}`)
        .join('\n')}${scene.prop.foot ? `\n${scene.prop.foot}` : ''}`
    : ''
  const rules = `(ROLE-PLAY, how to run it) How to start: first, out of character, set the scene in one or two short, simple sentences: where you are and who you each are (for example "We're at a language exchange in Tokyo. You're a participant, and I'm Mia, from New Zealand."), and say their tasks are on the screen. Then ask if they're ready, and wait. When they say yes (or anything like it), start the scene in character with your first line.
Rules: stay in character from then on. Steer the conversation so the student gets the chance to do each task, one at a time, but let them say it themselves (never say their line for them). When a task is for them to ASK something (the price, which gate, the time…), never give that information before they ask: if they don't ask, prompt them gently in character ("Do you have any questions?"). If they make a mistake, give the natural version briefly ("A more natural way is: …") and carry on in character. Don't end the scene while tasks are left: when every task is done you'll get a note, and then end it naturally, say "That's the end of the role-play!" and stop there (a note to wrap up because time is short counts too). You'll then get a short note with how they did, and only then give your feedback; never tell them they did every task unless that note says so.`
  const fit = (t: string) => (t.length > 1800 ? t.slice(0, 1799) + '…' : t)
  return [head, prop, rules].filter(Boolean).map(fit)
}

/** The whole start instruction as one text (tests, and anything that doesn't need it in parts). */
export const roleplayInstruction = (scene: Scene, studentRole: RoleId, level: LevelIndex): string => roleplayInstructionParts(scene, studentRole, level).join('\n')
