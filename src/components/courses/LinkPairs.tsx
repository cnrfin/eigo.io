'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

type Any = any

/**
 * Link-Draw (drag-to-connect): the learner physically links the words. Press a
 * word and drag to the next one to forge a link — a curved tie springs between
 * them and, once correct, the joined pronunciation appears underneath. Drag an
 * existing tie's words again to undo it. The data model is unchanged from the
 * tap version (gap k joins word k and k+1; `links` are the correct gaps), so the
 * player grades it the same way. On `revealed`, correct ties show in accent,
 * missed links dashed, wrong ties in danger, and each item reveals its joined
 * form and a one-line rule.
 */
type Item = { words: string[]; links: number[]; joined?: string; joined_ja?: string; note?: string; note_ja?: string; audioUrl?: string | null }
type Pt = { x: number; y: number }

function ItemRow({
  item, locale, selected, onToggle, revealed,
}: {
  item: Item; locale: 'ja' | 'en'
  selected: number[]; onToggle: (gap: number) => void; revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const wordEls = useRef<(HTMLSpanElement | null)[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [pts, setPts] = useState<Pt[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState<{ from: number; xy: Pt; over: number | null } | null>(null)

  // Measure each word's bottom-centre relative to the row, for drawing ties.
  const measure = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const box = wrap.getBoundingClientRect()
    const next = item.words.map((_, i) => {
      const el = wordEls.current[i]
      if (!el) return { x: 0, y: 0 }
      const r = el.getBoundingClientRect()
      return { x: r.left - box.left + r.width / 2, y: r.bottom - box.top }
    })
    setPts(next)
    setSize({ w: box.width, h: box.height })
  }, [item.words])

  useLayoutEffect(() => { measure() }, [measure, revealed])
  useEffect(() => {
    measure()
    const wrap = wrapRef.current
    if (!wrap || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(wrap)
    const onFonts = () => measure()
    ;(document as Any).fonts?.ready?.then(onFonts)
    return () => ro.disconnect()
  }, [measure])

  const play = () => {
    if (!item.audioUrl) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = item.audioUrl; a.currentTime = 0
    a.onended = () => setPlaying(false)
    void a.play().catch(() => {})
    setPlaying(true)
  }

  // ── drag-to-connect ──
  const ptInWrap = (e: React.PointerEvent | PointerEvent): Pt => {
    const box = wrapRef.current!.getBoundingClientRect()
    return { x: (e as PointerEvent).clientX - box.left, y: (e as PointerEvent).clientY - box.top }
  }
  const wordIdxAt = (clientX: number, clientY: number): number | null => {
    const el = document.elementFromPoint(clientX, clientY)?.closest('[data-word]') as HTMLElement | null
    if (!el || !wrapRef.current?.contains(el)) return null
    const i = Number(el.dataset.word)
    return Number.isFinite(i) ? i : null
  }
  const onDown = (i: number) => (e: React.PointerEvent) => {
    if (revealed) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({ from: i, xy: ptInWrap(e), over: null })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const over = wordIdxAt(e.clientX, e.clientY)
    setDrag({ ...drag, xy: ptInWrap(e), over: over != null && Math.abs(over - drag.from) === 1 ? over : null })
  }
  const onUp = (e: React.PointerEvent) => {
    if (!drag) return
    const over = wordIdxAt(e.clientX, e.clientY)
    if (over != null && Math.abs(over - drag.from) === 1) onToggle(Math.min(over, drag.from))
    setDrag(null)
  }

  // Build a tie path (quadratic dip) between two anchor points.
  const tie = (a: Pt, b: Pt) => {
    const dip = Math.min(26, 12 + Math.abs(b.x - a.x) * 0.12)
    const my = Math.max(a.y, b.y) + dip
    return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${my} ${b.x} ${b.y}`
  }

  const joined = locale === 'ja' ? (item.joined_ja ?? item.joined) : item.joined
  const note = locale === 'ja' ? (item.note_ja ?? item.note) : item.note
  const compact = item.words.length > 3 // sentences render smaller so arcs stay on one line

  return (
    <div className="flex items-start gap-3">
      <button onClick={play} aria-label={t('再生', 'Play')}
        className="shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
        style={{ background: playing ? 'var(--accent)' : 'var(--card-inset)', color: playing ? '#fff' : 'var(--text-secondary)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
      </button>

      <div className="flex-1 min-w-0">
        <div ref={wrapRef} className={`relative inline-flex flex-wrap items-end pb-10 select-none ${compact ? 'gap-x-3 sm:gap-x-4' : 'gap-x-5 sm:gap-x-7'}`}
          onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)} style={{ touchAction: 'none' }}>
          {/* ties overlay */}
          <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h} style={{ overflow: 'visible' }}>
            {pts.length === item.words.length && item.words.slice(0, -1).map((_, k) => {
              const on = selected.includes(k)
              const isAns = item.links.includes(k)
              if (!on && !(revealed && isAns)) return null
              let stroke = 'var(--accent)', dash = '0'
              if (revealed) {
                if (isAns && on) stroke = 'var(--accent)'
                else if (isAns && !on) { stroke = 'var(--accent)'; dash = '4 4' }
                else { stroke = 'var(--danger)' }
              }
              return <path key={k} d={tie(pts[k], pts[k + 1])} fill="none" stroke={stroke} strokeWidth={2.5} strokeDasharray={dash} strokeLinecap="round" />
            })}
            {/* live rubber-band while dragging */}
            {drag && pts[drag.from] && (
              <path d={tie(pts[drag.from], drag.over != null ? pts[drag.over] : drag.xy)} fill="none"
                stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} strokeDasharray="1 6" />
            )}
          </svg>

          {item.words.map((w, i) => {
            const linkedHere = (i > 0 && selected.includes(i - 1)) || selected.includes(i)
            const isDragEnd = drag?.over === i || drag?.from === i
            const ansHere = revealed && ((i > 0 && item.links.includes(i - 1)) || item.links.includes(i))
            const hot = linkedHere || isDragEnd || ansHere
            return (
              <span key={i} data-word={i} ref={(el) => { wordEls.current[i] = el }} onPointerDown={onDown(i)}
                className={`relative leading-tight transition-colors duration-150 ${compact ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'}`}
                style={{ color: hot ? 'var(--accent)' : 'var(--text)', fontWeight: hot ? 700 : 600, cursor: revealed ? 'default' : 'grab', touchAction: 'none' }}>
                {w}
              </span>
            )
          })}
        </div>

        {revealed && (joined || note) && (
          <div className="mt-1">
            {joined && <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>{joined}</p>}
            {note && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LinkPairs({
  items, locale, selections, onToggle, revealed,
}: {
  items: Item[]
  locale: 'ja' | 'en'
  selections: Record<number, number[]>
  onToggle: (itemIndex: number, gapIndex: number) => void
  revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  return (
    <div className="space-y-7">
      {items.map((it, i) => (
        <ItemRow key={i} item={it} locale={locale}
          selected={selections[i] ?? []} onToggle={(g) => onToggle(i, g)} revealed={revealed} />
      ))}
      <p className="text-sm pt-1 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 7a5 5 0 0 0 0 10M15 7a5 5 0 0 1 0 10" /></svg>
        {t('語を押して、つながる次の語までドラッグしよう。', 'Press a word and drag to the next word it links to.')}
      </p>
    </div>
  )
}
