import type { CSSProperties } from 'react'

/**
 * The app-wide pill-tab/filter style (courses categories, phrase filters,
 * settings pickers). One rule, theme-aware:
 *   light + active → solid accent with white text (pop against pale surfaces)
 *   dark + active  → tinted: accent text on accent-bg with an accent border
 *                    (solid accent glares on dark panels)
 *   inactive       → inset surface, hairline edge, muted text
 */
export function pillTabStyle(active: boolean, theme: 'light' | 'dark'): CSSProperties {
  if (!active) {
    return {
      background: 'var(--card-inset)',
      color: 'var(--text-muted)',
      border: '1px solid var(--edge)',
    }
  }
  return theme === 'dark'
    ? { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }
    : { background: 'var(--accent)', color: 'var(--selected-text, #fff)', border: '1px solid var(--accent)' }
}
