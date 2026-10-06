'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { WordInfo } from '@/lib/classroom/client'
import type { ClassroomT } from '@/lib/classroom/i18n'

/**
 * The word lookup popup: the word, its type, the translation, a short
 * meaning, an example, and (for the student) "+ Save" to their phrases.
 * Sits under the word (or above it near the bottom of the screen).
 */

export type PopupState = {
  term: string
  rect: DOMRect
  status: 'loading' | 'ok' | 'error'
  info?: WordInfo
}

const bold = (s: string) =>
  s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))

export default function WordPopup({
  t,
  popup,
  saved,
  canSave,
  onToggleSave,
  onClose,
}: {
  t: ClassroomT
  popup: PopupState | null
  saved: boolean
  canSave: boolean
  onToggleSave: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number; ax: number; up: boolean } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!popup || !el) return
    const rc = popup.rect
    const w = el.offsetWidth || 300
    const h = el.offsetHeight || 120
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, rc.left + rc.width / 2 - w / 2))
    let y = rc.bottom + 10
    let up = false
    if (y + h > window.innerHeight - 8) {
      y = rc.top - 10 - h
      up = true
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measuring the popup before paint
    setPos({ x, y: Math.max(8, y), ax: rc.left + rc.width / 2 - x, up })
  }, [popup])

  useEffect(() => {
    if (!popup) return
    const down = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.lkPop')) onClose()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', esc)
    }
  }, [popup, onClose])

  if (!popup) return null
  const info = popup.info
  return (
    <div
      ref={ref}
      className={`lkPop${pos?.up ? ' up' : ''}`}
      role="dialog"
      aria-label={popup.term}
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? 0, ['--ax' as string]: `${pos?.ax ?? 150}px` }}
    >
      {popup.status === 'loading' && (
        <div className="lk-load">
          <span className="spin" />
          {t('lookingUp', { term: popup.term })}
        </div>
      )}
      {popup.status === 'error' && <div className="lk-err">{t('lookupFailed')}</div>}
      {popup.status === 'ok' && info && (
        <>
          <div className="lk-h">
            <b>{info.term}</b>
            {info.pos && <i>{info.pos}</i>}
          </div>
          {info.ja && <div className="lk-ja">{info.ja}</div>}
          {info.meaning && <div className="lk-mean">{info.meaning}</div>}
          {info.example && <div className="lk-ex">{bold(info.example)}</div>}
          {canSave && (
            <button className={`lk-save${saved ? ' saved' : ''}`} onClick={onToggleSave}>
              {saved ? t('savedWord') : t('saveWord')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
