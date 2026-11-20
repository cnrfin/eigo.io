'use client'

import { useEffect, useRef, useState } from 'react'

export type DownloadOption = {
  label: string
  /** Small grey line under the label. */
  sub?: string
  onSelect: () => void | Promise<void>
}

/**
 * A small button that opens a fade-in menu of download formats.
 * Shared by Phrases ("Export as…") and Notes ("Download").
 */
export default function DownloadMenu({
  label,
  options,
  disabled = false,
  busy = false,
  placement = 'below',
  surface = 'var(--panel)',
}: {
  label: string
  options: DownloadOption[]
  disabled?: boolean
  /** Shows the button as working (e.g. while a PDF is generated). */
  busy?: boolean
  /** Open the menu above the button (use near the bottom of a panel). */
  placement?: 'below' | 'above'
  /** Button and menu fill; pass var(--surface) when sitting on a card. */
  surface?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100"
        style={{ background: surface, color: 'var(--text)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={busy ? 'animate-pulse' : undefined}>
          <path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className={`modal-card absolute right-0 z-50 p-1.5 rounded-2xl ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ minWidth: 190, background: surface, border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
        >
          {options.map((o) => (
            <button
              key={o.label}
              role="menuitem"
              onClick={() => { setOpen(false); void o.onSelect() }}
              className="sidebar-item w-full text-left px-3 py-2 text-sm rounded-xl"
              style={{ color: 'var(--text)' }}
            >
              {o.label}
              {o.sub && <span className="block text-xs" style={{ color: 'var(--text-subtle)' }}>{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Save a string or blob as a file in the browser. */
export function saveFile(content: string | Blob, filename: string, mime = 'text/plain;charset=utf-8') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
