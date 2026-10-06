'use client'

import { useCallback, useState } from 'react'

/**
 * Per-device classroom preferences (this browser only), kept in localStorage.
 * Nothing here is shared with the other person or needed by the server.
 */
export type FxMode = 'auto' | 'full' | 'lite'
export type Prefs = {
  mirror: boolean // flip my own video (only how I see myself)
  cursors: boolean // show the other person's cursor (and send mine)
  denoise: boolean // noise reduction on my mic
  hd: boolean
  lowData: boolean
  background: string // '' = none, else a Whereby camera-effect preset id
  fx: FxMode // frosted glass: auto (by device), full, reduced
}

export const DEFAULT_PREFS: Prefs = {
  mirror: true,
  cursors: true,
  denoise: false,
  hd: true,
  lowData: false,
  background: '',
  fx: 'auto',
}

const KEY = 'eigo-classroom-prefs'

export function readPrefs(): Prefs {
  try {
    const v = localStorage.getItem(KEY)
    return v ? { ...DEFAULT_PREFS, ...(JSON.parse(v) as Partial<Prefs>) } : { ...DEFAULT_PREFS }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable: the choice still applies for this visit */
      }
      return next
    })
  }, [])
  return [prefs, update]
}

/** Low-power devices get solid panels instead of frosted glass in 'auto'. */
export function isLowPower() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (
    (!!nav.deviceMemory && nav.deviceMemory <= 4) ||
    (!!nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
    !!window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches
  )
}
