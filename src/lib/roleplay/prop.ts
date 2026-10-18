/**
 * Lighting up a prop's rows (the menu, timetable…) when they're mentioned in the role-play. Pure, so it's easy to test.
 *
 * Each item's `key` is matched as a whole phrase, on word boundaries, against what's been said: "10:15", "check-in",
 * "Wi-Fi", "T-shirt" and "side entrance" all work as written, and "side entrance" doesn't light up on "Riverside".
 * A key can list spellings with "|": "colour|color". A key written with a hyphen or space also matches run together
 * ("Wi-Fi" matches "wifi"). No key: the first word of the name (3+ letters).
 */
import { normText } from '@/lib/ai-tutor/actions'

export type PropItem = { name: string; key?: string }

export function propKeys(item: PropItem): string[] {
  if (item.key) return item.key.split('|').map(normText).filter((k) => k.length >= 2)
  const first = normText(item.name).split(' ')[0] ?? ''
  return first.length > 2 ? [first] : []
}

/** heard: everything said in the scene so far, already through normText */
export function propHit(heard: string, item: PropItem): boolean {
  const h = ` ${heard} `
  return propKeys(item).some((k) => h.includes(` ${k} `) || (k.includes(' ') && h.includes(` ${k.replace(/ /g, '')} `)))
}
