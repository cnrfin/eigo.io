/**
 * Matching what the student said (the live transcript) against text on screen. Pure functions, used
 * in the browser (cards, later the panel exercises) and on the server (checking the helper's cards
 * against what the AI tutor actually said).
 *
 * Forgiving on purpose: small spelling differences in the transcript ("colour"/"color", one letter
 * off in a longer word) still count, and extra words or fillers in between are skipped. Japanese
 * is ignored. This is word recognition only, not pronunciation scoring.
 */

/** lower-case English words, apostrophes and hyphens kept, everything else dropped */
export const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\- ]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean)

function lev(a: string, b: string): number {
  const m = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let p = m[0]
    m[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = m[j]
      m[j] = Math.min(m[j] + 1, m[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1))
      p = t
    }
  }
  return m[b.length]
}

/** the same word, allowing one letter's difference in words of 4+ letters */
export const near = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && lev(a, b) <= 1)

/** for each word of the target: was it said, in order (words in between are skipped)? */
export function inOrder(said: string, target: string): boolean[] {
  const s = words(said)
  const out: boolean[] = []
  let j = 0
  for (const w of words(target)) {
    let k = -1
    for (let i = j; i < s.length; i++)
      if (near(s[i], w)) {
        k = i
        break
      }
    if (k >= 0) {
      out.push(true)
      j = k + 1
    } else out.push(false)
  }
  return out
}

/** share of the target's words that were said, in order (0..1) */
export function share(said: string, target: string): number {
  const h = inOrder(said, target)
  return h.length ? h.filter(Boolean).length / h.length : 0
}

/** the student said the whole phrase (one word may be missed in phrases of 6+ words) */
export function saidIt(said: string, target: string): boolean {
  const h = inOrder(said, target)
  const n = h.length
  if (!n) return false
  const hit = h.filter(Boolean).length
  return hit >= n - (n >= 6 ? 1 : 0)
}

export const hasJapanese = (s: string) => /[぀-ヿ㐀-䶿一-鿿]/.test(s)

/** the same sentence, ignoring case and punctuation */
export const sameWords = (a: string, b: string) => words(a).join(' ') === words(b).join(' ')
