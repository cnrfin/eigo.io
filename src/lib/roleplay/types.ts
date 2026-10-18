/**
 * Role-plays (ai-panel-implementation-plan.md, phase 3; design: mockups/ai-roleplay-mission.html and
 * mockups/roleplay-picker.html). One JSON file per scene in src/lib/roleplay/scenes/<category>/ (how to write one: docs/roleplay-authoring.md).
 *
 * Every scene has two roles. The student plays `studentRole` first; after the mission they can swap.
 * Each role has three levels (初級 / 中級 / 上級): the student's tasks, how the AI tutor plays its character,
 * and sometimes a twist at 上級. The level comes from the student's progress dots: the first time is
 * always 初級, then 中級, then 上級 (lib/roleplay/progress.ts).
 */

export type Ja = { ja: string; en: string }
export type Category = 'travel' | 'help' | 'service' | 'friends' | 'business'
export type RoleId = 'a' | 'b'
export type LevelIndex = 0 | 1 | 2

export type Task = {
  id: string
  /** what to do: 「飲み物を注文する」 / "Order a drink" */
  title: Ja
  /** hints, one step further each time: what to do in Japanese → a sentence starter → the full sentence */
  hints: [string, string, string]
}

export type Level = {
  tasks: Task[]
  /** how the AI tutor plays its character at this level (speed, sentence length, what it asks) */
  tutor: string
  /** some scenes, at 上級: something unexpected happens after a task, which adds one more task */
  twist?: { after: string; tutor: string; task: Task }
}

export type Role = {
  id: RoleId
  /** the role's name on screen: 「お客さん」 / "Customer" */
  name: Ja
  /** who this character is, for the AI tutor when it plays them */
  persona: string
  levels: [Level, Level, Level]
}

/** Something from the scene the student can look at (menu, timetable, map…): a titled list in sections. */
export type Prop = {
  /** button label: 「メニュー」 → 「メニューを見る」 / 「メニューを閉じる」 */
  label: Ja
  title: string
  sections: { heading: string; items: { name: string; value?: string; key?: string }[] }[]
  foot?: string
}

export type Scene = {
  id: string
  category: Category
  title: Ja
  /** one line for the picker */
  summary: Ja
  /** the setting, for the AI tutor */
  setting: string
  image: string
  studentRole: RoleId
  roles: [Role, Role]
  prop?: Prop
}

export const CATEGORY_NAMES: Record<Category, Ja> = {
  travel: { ja: '海外旅行', en: 'Travel' },
  help: { ja: '日本で助ける', en: 'Helping in Japan' },
  service: { ja: '接客', en: 'Serving guests' },
  friends: { ja: '友だち', en: 'Friends' },
  business: { ja: 'ビジネス', en: 'Business' },
}
export const LEVEL_NAMES: Record<LevelIndex, Ja> = {
  0: { ja: '初級', en: 'Beginner' },
  1: { ja: '中級', en: 'Intermediate' },
  2: { ja: '上級', en: 'Advanced' },
}

/** One row of the role-play list (the pickers); the full scene is loaded when it starts. */
export type SceneSummary = {
  id: string
  category: Category
  title: Ja
  summary: Ja
  image: string
  /** the role the student plays first, and the other one (after swapping) */
  role: Ja
  otherRole: Ja
  /** what they'll do at the next level (task titles), for the picker */
  tasks: Ja[]
  hasProp: boolean
  /** levels completed in their main role (0–3) and the level they'll play next */
  cleared: number
  next: LevelIndex
}

// ---------- helpers (no scene data here, so the browser can use them) ----------
export const roleOf = (scene: Scene, id: RoleId): Role => scene.roles.find((r) => r.id === id) ?? scene.roles[0]
export const otherRole = (id: RoleId): RoleId => (id === 'a' ? 'b' : 'a')

/** The level a student plays next: the first time 初級, then 中級, then 上級 (and 上級 again after that). */
export const nextLevel = (cleared: number): LevelIndex => Math.max(0, Math.min(2, cleared)) as LevelIndex
/** Levels the student may pick: anything up to the next one. */
export const canPlay = (cleared: number, level: LevelIndex) => level <= nextLevel(cleared)

/** The tasks on screen; the twist's task appears (before the last task) once it has happened. */
export function tasksFor(level: Level, twisted: boolean): Task[] {
  if (!level.twist || !twisted) return level.tasks
  const t = [...level.tasks]
  t.splice(t.length - 1, 0, level.twist.task)
  return t
}
