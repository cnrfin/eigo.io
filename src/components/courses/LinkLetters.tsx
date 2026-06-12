'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Link-Letters — "the consonant becomes the start of the next word."
 *
 * Each phrase renders as clean text. EVERY consonant of every non-final word
 * is quietly draggable (real movers and decoys look identical — nothing marks
 * the answer). Picking one up opens the gap after its word; dropping it there
 * docks it as a chip fused onto the next word's head, the original letter
 * ghosts out, and a small arc shows the jump. One chip per gap; tap a chip to
 * send it home. Mistakes are expressible: docking the wrong consonant, or
 * docking into a gap that doesn't link (next word starts with a consonant),
 * grades as wrong on Check.
 *
 * Data (seeded): words[], chunks[][] (a digraph like "ck" is one chunk),
 * sources [[w,c]] (all draggable consonant chunks), links
 * [{from:[w,c], to:[w+1,0]}] (answer key — `to` is always the next word's
 * head). Selections share that shape so grading stays exact-set equality.
 */
type Cell = [number, number]
type Link = { from: Cell; to: Cell }
type Item = {
  words: string[]; chunks: string[][]; sources: Cell[]; links: Link[]
  joined?: string; joined_ja?: string; note?: string; note_ja?: string; audioUrl?: string | null
}

const cellKey = (c: Cell) => `${c[0]}-${c[1]}`
const linkKey = (l: Link) => `${cellKey(l.from)}>${cellKey(l.to)}`
const isSource = (item: Item, c: Cell) => item.sources.some((x) => x[0] === c[0] && x[1] === c[1])

export const linkLettersCorrect = (item: Item, made: Link[]) => {
  const a = [...made.map(linkKey)].sort(), b = [...item.links.map(linkKey)].sort()
  return a.length === b.length && a.every((v, i) => v === b[i])
}

// one-time per session: wiggle every draggable consonant so the affordance is
// discoverable without marking the answer (decoys wiggle too)
let hintShown = false

function ItemRow({
  item, locale, made, onChange, revealed,
}: {
  item: Item; locale: 'ja' | 'en'; made: Link[]; onChange: (links: Link[]) => void; revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const gapRefs = useRef<Map<number, HTMLElement>>(new Map())
  const chunkRefs = useRef<Map<string, HTMLElement>>(new Map())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  // drag = the chunk in hand; over = hovering its (single) valid gap
  const [drag, setDrag] = useState<{ from: Cell; x: number; y: number; over: boolean } | null>(null)
  const [hint, setHint] = useState(false)
  const [arcs, setArcs] = useState<{ d: string; missed: boolean; ok: boolean }[]>([])

  useEffect(() => {
    if (hintShown) return
    hintShown = true
    const on = setTimeout(() => setHint(true), 600)
    const off = setTimeout(() => setHint(false), 2200)
    return () => { clearTimeout(on); clearTimeout(off) }
  }, [])

  // chip docked in gap g (the gap before word g+1), if any
  const chipIn = (g: number): Link | undefined => made.find((l) => l.to[0] === g + 1)
  const ghosted = (c: Cell) => made.some((l) => cellKey(l.from) === cellKey(c)) || (drag !== null && cellKey(drag.from) === cellKey(c))
  const gapOf = (from: Cell) => from[0] // a consonant can only jump the gap right after its own word

  // ── arcs: drawn AFTER layout settles, only for made links (+ missed on reveal).
  // setArcs runs inside requestAnimationFrame on purpose: the arcs are measured
  // from the just-painted layout (a measure-after-paint, not a render loop).
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const raf = requestAnimationFrame(() => {
      const box = row.getBoundingClientRect()
      const out: { d: string; missed: boolean; ok: boolean }[] = []
      const draw = (l: Link, missed: boolean) => {
        // the liaison curve sits UNDER the join itself: docked chip ‿ the vowel
        // it lands on (the ghosted origin letter already shows where it came
        // from). A missed link has no chip, so it starts at the origin instead.
        const a = (missed ? chunkRefs.current.get(cellKey(l.from)) : gapRefs.current.get(l.to[0] - 1))?.getBoundingClientRect()
        const b = chunkRefs.current.get(`${l.to[0]}-0`)?.getBoundingClientRect()
        if (!a || !b) return
        const x1 = a.left - box.left + a.width / 2, y1 = a.bottom - box.top + 2
        const x2 = b.left - box.left + b.width / 2, y2 = b.bottom - box.top + 2
        if (Math.abs(y1 - y2) > a.height) return // wrapped onto another line — skip the arc, the chip tells the story
        const dip = Math.min(22, 10 + Math.abs(x2 - x1) * 0.18)
        const ok = !revealed || item.links.some((x) => linkKey(x) === linkKey(l))
        out.push({ d: `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.max(y1, y2) + dip} ${x2} ${y2}`, missed, ok })
      }
      for (const l of made) draw(l, false)
      if (revealed) for (const l of item.links) if (!made.some((m) => linkKey(m) === linkKey(l))) draw(l, true)
      setArcs(out)
    })
    return () => cancelAnimationFrame(raf)
  }, [made, revealed, item.links])

  const play = () => {
    if (!item.audioUrl) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = item.audioUrl; a.currentTime = 0
    a.onended = () => setPlaying(false)
    void a.play().catch(() => {})
    setPlaying(true)
  }

  // ── drag mechanics: pointer events; the only valid dock is the gap after
  //    the source's word, with a generous hitbox (gap ∪ the next word)
  const inDock = (g: number, x: number, y: number) => {
    const pad = 14
    for (const el of [gapRefs.current.get(g), chunkRefs.current.get(`${g + 1}-0`)?.parentElement]) {
      const r = el?.getBoundingClientRect()
      if (r && x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) return true
    }
    return false
  }
  const onDown = (cell: Cell) => (e: React.PointerEvent) => {
    if (revealed) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({ from: cell, x: e.clientX, y: e.clientY, over: false })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    setDrag({ ...drag, x: e.clientX, y: e.clientY, over: inDock(gapOf(drag.from), e.clientX, e.clientY) })
  }
  const onUp = () => {
    if (!drag) return
    if (drag.over) {
      const to: Cell = [gapOf(drag.from) + 1, 0]
      // one chip per gap (a new drop replaces it) and one gap per consonant
      onChange([...made.filter((l) => l.to[0] !== to[0] && cellKey(l.from) !== cellKey(drag.from)), { from: drag.from, to }])
    }
    setDrag(null)
  }
  const undo = (l: Link) => { if (!revealed) onChange(made.filter((m) => linkKey(m) !== linkKey(l))) }

  const joined = locale === 'ja' ? (item.joined_ja ?? item.joined) : item.joined
  const note = locale === 'ja' ? (item.note_ja ?? item.note) : item.note

  const chipColor = (l: Link) => {
    if (!revealed) return { bg: 'var(--accent-bg)', fg: 'var(--accent)', border: '1.5px solid var(--accent)' }
    const right = item.links.some((x) => linkKey(x) === linkKey(l))
    return right
      ? { bg: 'var(--accent)', fg: '#fff', border: '1.5px solid transparent' }
      : { bg: 'var(--danger)', fg: '#fff', border: '1.5px solid transparent' }
  }

  return (
    <div className="flex items-start gap-3">
      <button onClick={play} aria-label={t('再生', 'Play')}
        className="shrink-0 mt-1.5 w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
        style={{ background: playing ? 'var(--accent)' : 'var(--card-inset)', color: playing ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--edge)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
      </button>

      <div className="flex-1 min-w-0">
        <div ref={rowRef} className="relative flex flex-wrap items-baseline gap-y-3 pb-7 select-none"
          onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)} style={{ touchAction: 'none' }}>

          {/* arcs live under the text, drawn only for links the user made (and, on reveal, missed ones) */}
          <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
            {arcs.map((a, i) => (
              <path key={i} d={a.d} fill="none" strokeWidth={2}
                stroke={a.missed ? 'var(--accent)' : a.ok ? 'var(--accent)' : 'var(--danger)'}
                strokeDasharray={a.missed || !a.ok ? '4 4' : '0'} strokeLinecap="round" opacity={a.missed ? 0.8 : 0.55} />
            ))}
          </svg>

          {item.words.map((w, wi) => {
            const gap = wi - 1 // the gap BEFORE this word
            const chip = wi > 0 ? chipIn(gap) : undefined
            const slotOpen = drag !== null && gapOf(drag.from) === gap
            return (
              // gap + word grouped so a chip never wraps away from its word
              <span key={wi} className="inline-flex items-baseline whitespace-nowrap">
                {wi > 0 && (
                  <span ref={(el) => { if (el) gapRefs.current.set(gap, el) }}
                    className="inline-flex items-baseline justify-center transition-all duration-150"
                    style={{ minWidth: chip ? 0 : slotOpen ? 34 : 14, margin: '0 2px' }}>
                    {chip ? (
                      <button onClick={() => undo(chip)} disabled={revealed}
                        className="inline-flex items-center justify-center px-1.5 rounded-lg text-2xl sm:text-3xl font-bold leading-tight transition-transform duration-150 active:scale-90"
                        style={{ background: chipColor(chip).bg, color: chipColor(chip).fg, border: chipColor(chip).border, transform: 'translateY(-1px)' }}
                        aria-label={t('タップで戻す', 'Tap to undo')}>
                        {item.chunks[chip.from[0]][chip.from[1]]}
                      </button>
                    ) : slotOpen ? (
                      <span className="inline-block rounded-lg transition-all duration-150"
                        style={{ width: 28, height: '1.4em', alignSelf: 'center', border: `2px dashed ${drag?.over ? 'var(--accent)' : 'var(--edge)'}`, background: drag?.over ? 'var(--accent-bg)' : 'transparent' }} />
                    ) : null}
                  </span>
                )}
                <span className="inline-flex items-baseline">
                  {item.chunks[wi].map((ch, ci) => {
                    const cell: Cell = [wi, ci]
                    const draggable = isSource(item, cell) && !revealed
                    const gone = ghosted(cell)
                    return (
                      <span key={ci}
                        ref={(el) => { if (el) chunkRefs.current.set(cellKey(cell), el) }}
                        onPointerDown={draggable && !gone ? onDown(cell) : undefined}
                        className={`text-2xl sm:text-3xl font-semibold leading-tight transition-all duration-150 ${draggable && !gone ? 'cursor-grab' : ''}`}
                        style={{
                          color: 'var(--text)',
                          opacity: gone ? 0.12 : 1,
                          ...(hint && draggable ? { animation: 'linkletters-lift 0.8s ease-in-out 2' } : {}),
                        }}>
                        {ch}
                      </span>
                    )
                  })}
                </span>
              </span>
            )
          })}

          {/* the chunk in hand, following the pointer */}
          {drag && (
            <span className="fixed z-50 pointer-events-none px-2 py-0.5 rounded-lg text-3xl font-bold"
              style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, -120%)', background: 'var(--card)', color: 'var(--accent)', border: '1.5px solid var(--accent)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
              {item.chunks[drag.from[0]][drag.from[1]]}
            </span>
          )}
        </div>

        {revealed && (joined || note) && (
          <div className="-mt-3">
            {joined && <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>{joined}</p>}
            {note && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note}</p>}
          </div>
        )}
      </div>

    </div>
  )
}

export default function LinkLetters({
  items, locale, selections, onChange, revealed,
}: {
  items: Item[]
  locale: 'ja' | 'en'
  selections: Record<number, Link[]>
  onChange: (itemIndex: number, links: Link[]) => void
  revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const anyMade = items.some((_, i) => (selections[i]?.length ?? 0) > 0)
  return (
    <div className="space-y-6">
      {items.map((it, i) => (
        <ItemRow key={i} item={it} locale={locale} made={selections[i] ?? []} onChange={(l) => onChange(i, l)} revealed={revealed} />
      ))}
      {!revealed && !anyMade && (
        <p className="text-sm pt-1" style={{ color: 'var(--text-muted)' }}>
          {t('子音をつかんで、次の語の前のすき間に置こう。置いたものはタップで戻せます。', 'Pick up a consonant and drop it into the gap before the next word. Tap a placed one to undo.')}
        </p>
      )}
    </div>
  )
}
