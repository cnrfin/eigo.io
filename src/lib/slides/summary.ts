import type { Block, Course, CourseSummary } from './types'

export function summarizeCourse(c: Course): CourseSummary {
  let lessons = 0
  let slides = 0
  for (const u of c.units) {
    lessons += u.lessons.length
    for (const l of u.lessons) slides += l.slides.length
  }
  return { id: c.id, slug: c.slug, title: c.title, level: c.level, units: c.units.length, lessons, slides, updatedAt: c.updatedAt }
}

/** Every relative image path a course references (for publishing/export). */
export function collectAssets(c: Course): string[] {
  const out = new Set<string>()
  const add = (src: string) => {
    if (src && !/^(https?:|data:|blob:|\/)/.test(src)) out.add(src)
  }
  add(c.coverImage)
  for (const ch of c.characters ?? []) add(ch.avatar)
  for (const u of c.units)
    for (const l of u.lessons)
      for (const s of l.slides)
        for (const b of s.blocks as Block[]) {
          if (b.type === 'image') add(b.src)
          if (b.type === 'media') {
            add(b.src)
            if (b.poster) add(b.poster)
          }
          if (b.type === 'match') for (const p of b.pairs) add(p.image)
        }
  return [...out]
}

export interface CourseIssue {
  level: 'error' | 'warning'
  where: string
  message: string
}

/** Checks run before publishing. Errors block publishing; warnings don't. */
export function validateCourse(c: Course): CourseIssue[] {
  const issues: CourseIssue[] = []
  if (!c.title.trim()) issues.push({ level: 'error', where: 'Course', message: 'Course needs a title.' })
  if (!/^[a-z0-9-]+$/.test(c.slug)) issues.push({ level: 'error', where: 'Course', message: 'Slug may only contain a–z, 0–9 and hyphens.' })
  if (!c.level) issues.push({ level: 'warning', where: 'Course', message: 'No CEFR level set.' })
  if (!c.coverImage) issues.push({ level: 'warning', where: 'Course', message: 'No cover image.' })
  if (c.units.length === 0) issues.push({ level: 'error', where: 'Course', message: 'Course has no units.' })
  c.units.forEach((u, ui) => {
    const uw = `Unit ${ui + 1}`
    if (u.lessons.length === 0) issues.push({ level: 'error', where: uw, message: 'Unit has no lessons.' })
    u.lessons.forEach((l, li) => {
      const lw = `${uw} › Lesson ${li + 1}`
      if (l.slides.length === 0) issues.push({ level: 'error', where: lw, message: 'Lesson has no slides.' })
      l.slides.forEach((s, si) => {
        const sw = `${lw} › Slide ${si + 1}`
        for (const b of s.blocks) {
          if (b.type === 'image' && !b.src) issues.push({ level: 'warning', where: sw, message: 'Empty image block.' })
          if (b.type === 'media' && !b.src) issues.push({ level: 'warning', where: sw, message: b.kind === 'audio' ? 'Audio clip not added yet.' : 'Video not added yet.' })
          if (b.type === 'image' && b.src && !b.alt.trim()) issues.push({ level: 'warning', where: sw, message: 'Image is missing alt text.' })
          if (b.type === 'truefalse' && b.items.length === 0) issues.push({ level: 'error', where: sw, message: 'True/false block has no statements.' })
          if (b.type === 'match' && b.pairs.length < 2) issues.push({ level: 'error', where: sw, message: 'Matching needs at least two pairs.' })
          if (b.type === 'match' && b.pairs.some((p) => !p.image)) issues.push({ level: 'warning', where: sw, message: 'Matching picture not added yet.' })
        }
      })
    })
  })
  return issues
}
