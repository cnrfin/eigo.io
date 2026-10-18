/**
 * Recognising a course by name in what the AI tutor says ("I'll open Haruka in the UK, part one now").
 * Spoken names never match the written title exactly: "part one" for "Part 1", no colon, curly quotes…
 * so both sides are normalised first. Pure, so it's easy to test.
 */

const NUMS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
  first: '1', second: '2', third: '3',
}

/** lower case, no accents or punctuation, number words as digits, single spaces */
export function normName(s: string): string {
  return ` ${s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => NUMS[w] ?? w)
    .join(' ')} `
}

export type CourseName = { id: string; names: string[] }

/** does the normalised sentence contain the name? Japanese has no spaces, so a Japanese name may run into the next word */
const has = (s: string, name: string) => s.includes(name) || (/[^\x00-\x7f]/.test(name) && s.includes(name.trim()))

/**
 * The course a sentence names, or undefined. The full title wins ("Haruka in the UK, part two" → Part 2); a title's
 * main part alone ("Haruka in the UK") picks the first course with it, which is the one listed first for the student.
 */
export function courseNamed(text: string, courses: CourseName[]): CourseName | undefined {
  const s = normName(text)
  const full = courses.find((c) => c.names.some((n) => normName(n).trim().length > 4 && has(s, normName(n))))
  if (full) return full
  return courses.find((c) =>
    c.names.some((n) => {
      const main = normName(n.split(/[:：(（—–-]/)[0] ?? '')
      return main.trim().length > 4 && has(s, main)
    }),
  )
}
