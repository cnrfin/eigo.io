import type { Block, Course, Lesson, Slide, Unit } from '@slides'

export type Selection =
  | { view: 'settings' }
  | { view: 'slides'; lessonId: string; slideId: string | null; blockId: string | null }

export interface LessonRef {
  unit: Unit
  unitIndex: number
  lesson: Lesson
  lessonIndex: number
}

export function findLesson(course: Course, lessonId: string): LessonRef | null {
  for (let ui = 0; ui < course.units.length; ui++) {
    const unit = course.units[ui]
    const li = unit.lessons.findIndex((l) => l.id === lessonId)
    if (li >= 0) return { unit, unitIndex: ui, lesson: unit.lessons[li], lessonIndex: li }
  }
  return null
}

export function findSlide(lesson: Lesson, slideId: string | null): Slide | null {
  return slideId ? lesson.slides.find((s) => s.id === slideId) ?? null : null
}

export function firstLessonId(course: Course): string | null {
  for (const u of course.units) if (u.lessons[0]) return u.lessons[0].id
  return null
}

/** Mutating helpers for use inside editor.update(draft => …). */
export function draftLesson(draft: Course, lessonId: string): Lesson | null {
  return findLesson(draft, lessonId)?.lesson ?? null
}

export function draftSlide(draft: Course, lessonId: string, slideId: string): Slide | null {
  const l = draftLesson(draft, lessonId)
  return l ? findSlide(l, slideId) : null
}

export function draftBlock(draft: Course, lessonId: string, slideId: string, blockId: string): Block | null {
  return draftSlide(draft, lessonId, slideId)?.blocks.find((b) => b.id === blockId) ?? null
}

export function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length || from === to) return
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
