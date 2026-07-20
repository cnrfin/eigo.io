import type { CSSProperties } from 'react'

/**
 * The app-wide pill-tab/filter style (courses categories, phrase filters,
 * settings pickers). One rule, theme-aware:
 *   light + active → solid accent with white text (pop against pale surfaces)
 *   dark + active  → tinted: accent text on accent-bg with an accent border
 *                    (solid accent glares on dark panels)
 *   inactive       → transparent, hairline edge, muted text (the edge alone
 *                    carries the shape, so tabs recede against any surface
 *                    they sit on, in both themes)
 */
export function pillTabStyle(active: boolean, theme: 'light' | 'dark'): CSSProperties {
  if (!active) {
    return {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: '1px solid var(--edge)',
    }
  }
  return theme === 'dark'
    ? { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }
    : { background: 'var(--accent)', color: 'var(--selected-text, #fff)', border: '1px solid var(--accent)' }
}
