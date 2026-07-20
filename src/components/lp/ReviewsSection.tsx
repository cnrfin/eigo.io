'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { REVIEWS, colorForName, type Review } from '@/lib/reviews'
import Reveal from './Reveal'

/* User reviews — background fades from the vocab teal tint back to neutral. An
   infinite carousel of every review that always settles a card in the centre,
   with a fixed 5-dot window indicator whose active pill stays centred and flows.

   Snapping is driven entirely in JS (no CSS scroll-snap) so dragging tracks the
   cursor and, on release, the nearest card glides to the centre exactly like a
   normal scroll. The loop repositions only once motion has settled (never
   mid-scroll), so fast scrolls stay smooth, and the card list is memoised so it
   never re-renders while the dots update. */

const COPIES = 5
const DOT_STEP = 24

const CITIES = ['Fukuoka', 'Kobe', 'Yamanashi', 'Osaka', 'Nagoya', 'Yokohama', 'Sapporo', 'Sendai', 'Hiroshima', 'Kyoto', 'Chiba', 'Kanazawa', 'Niigata', 'Shizuoka', 'Kumamoto', 'Nara', 'Okayama', 'Nagano']
const FIXED: Record<string, string> = {
  ayaka: 'Fukushima, Japan', emi: 'Fukuoka, Japan', yuto: 'Tokyo, Japan',
  miki: 'Chiba, Japan', tatsuo: 'Kyoto, Japan', ruiko: 'Osaka, Japan',
}
function locationFor(name: string): string {
  const n = name.toLowerCase().trim()
  if (n.includes('maho') || n.includes('coco')) return 'Tokyo, Japan'
  if (FIXED[n]) return FIXED[n]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const abs = Math.abs(h)
  if (abs % 2 === 0) return 'Tokyo, Japan'
  return `${CITIES[abs % CITIES.length]}, Japan`
}

const stepOf = (el: HTMLElement) => (el.children.length < 2 ? 360 : (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft)
const centeredIndex = (el: HTMLElement) => {
  const first = el.children[0] as HTMLElement
  return Math.round((el.scrollLeft + el.clientWidth / 2 - (first.offsetLeft + first.offsetWidth / 2)) / stepOf(el))
}
const centerFor = (el: HTMLElement, idx: number) => {
  const card = el.children[idx] as HTMLElement
  return card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
}

// Memoised so updating `logical` (the dots) never re-renders the 135 cards.
const CardList = memo(function CardList({ items }: { items: typeof REVIEWS }) {
  return (
    <>
      {items.map((r, i) => (
        <div key={i} style={{ flex: 'none', width: 340, maxWidth: '82vw', height: 316, background: 'var(--v3-soft)', borderRadius: 22, padding: '30px 30px 26px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', userSelect: 'none' }}>
          <div aria-hidden="true" style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 700, color: 'var(--text-subtle)', lineHeight: 0.7, height: 26 }}>&ldquo;</div>
          <p className="jp" style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.6, color: 'var(--text)', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>{r.text}</p>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            {r.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={r.image} alt="" aria-hidden="true" draggable={false} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
              : <span style={{ width: 52, height: 52, borderRadius: '50%', background: colorForName(r.name), color: 'var(--v3-on-photo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, flex: 'none' }}>{r.name[0]}</span>}
            <div style={{ textAlign: 'right' }}>
              <div className="jp" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{r.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{locationFor(r.name)}</div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
})

export default function ReviewsSection() {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const N = REVIEWS.length
  // Card order: reviews WITH a profile photo first, then the rest — shuffled on
  // mount so it varies per visit. The initial value is deterministic (photos
  // first, source order) so the server and first client render match, then we
  // shuffle in an effect. Positions are identical, so the carousel stays centred.
  const [ordered, setOrdered] = useState<Review[]>(() => [
    ...REVIEWS.filter(r => r.image),
    ...REVIEWS.filter(r => !r.image),
  ])
  useEffect(() => {
    const s = [...REVIEWS]
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[s[i], s[j]] = [s[j], s[i]] }
    setOrdered([...s.filter(r => r.image), ...s.filter(r => !r.image)])
  }, [])
  const items = useMemo(() => Array.from({ length: COPIES }, () => ordered).flat(), [ordered])

  const scroller = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const dragging = useRef(false)
  const drag = useRef<{ x: number; left: number } | null>(null)
  const prevAct = useRef(0)
  const animRaf = useRef(0)
  const animating = useRef(false)
  const [logical, setLogical] = useState(0)

  // Own rAF glide to an exact scrollLeft. Because we control the target and set a
  // flag while it runs, a re-triggered settle can't redirect it, so it always
  // lands precisely on centre.
  const glideTo = (left: number) => {
    const el = scroller.current
    if (!el) return
    cancelAnimationFrame(animRaf.current)
    const start = el.scrollLeft
    const dist = left - start
    if (Math.abs(dist) < 1) { el.scrollLeft = left; return }
    const dur = Math.min(520, Math.max(200, Math.abs(dist) * 0.7))
    const t0 = performance.now()
    animating.current = true
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - t, 3) // easeOutCubic
      el.scrollLeft = start + dist * e
      if (t < 1) animRaf.current = requestAnimationFrame(tick)
      else animating.current = false
    }
    animRaf.current = requestAnimationFrame(tick)
  }

  // Bring the nearest card to the exact centre, looping it back to the middle
  // copy first (instant, seamless) so we never run out of cards.
  const settle = () => {
    const el = scroller.current
    if (!el || dragging.current || animating.current) return
    let idx = centeredIndex(el)
    const target = 2 * N + (((idx % N) + N) % N) // middle copy (index 2 of 5)
    if (target !== idx) { el.scrollLeft += (target - idx) * stepOf(el); idx = target }
    glideTo(centerFor(el, idx))
  }

  // start centred on the middle copy
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const id = requestAnimationFrame(() => { el.scrollLeft = centerFor(el, 2 * N) })
    return () => cancelAnimationFrame(id)
  }, [N])

  // one scroll listener: flow the dots, then centre/loop once motion stops
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    let timer = 0
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0
        const act = ((centeredIndex(el) % N) + N) % N
        let d = act - prevAct.current
        if (d > N / 2) d -= N
        else if (d < -N / 2) d += N
        if (d !== 0) { prevAct.current = act; setLogical(l => l + d) }
      })
      clearTimeout(timer)
      timer = window.setTimeout(settle, 150)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); cancelAnimationFrame(animRaf.current); clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N])

  const move = (dir: number) => {
    const el = scroller.current
    if (!el) return
    glideTo(centerFor(el, centeredIndex(el) + dir))
  }

  useEffect(() => {
    const id = setInterval(() => { if (!paused.current) move(1) }, 4500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = scroller.current
    if (!el) return
    cancelAnimationFrame(animRaf.current)
    animating.current = false
    dragging.current = true
    drag.current = { x: e.clientX, left: el.scrollLeft }
    paused.current = true
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !scroller.current) return
    scroller.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
  }
  const onUp = () => {
    const el = scroller.current
    if (drag.current) {
      drag.current = null
      dragging.current = false
      settle() // glide the nearest card to the centre, same as a normal scroll
    }
    if (el) el.style.cursor = 'grab'
    setTimeout(() => { paused.current = false }, 1200)
  }

  const window_: number[] = []
  for (let i = logical - 3; i <= logical + 3; i++) window_.push(i)

  return (
    <section id="reviews" style={{ background: 'linear-gradient(180deg, var(--v3-wash) 0%, var(--bg) 30%, var(--bg) 100%)', padding: 'clamp(130px,19vh,230px) 0 clamp(120px,17vh,210px)', overflow: 'hidden' }}>
      <Reveal as="h2" className={ja ? 'jp' : undefined} style={{ margin: '0 0 clamp(44px,6vh,76px)', textAlign: 'center', fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.3 : 1.12, color: 'var(--text)', padding: '0 24px' }}>
        {ja ? '生徒の声' : 'What students say'}
      </Reveal>

      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          ref={scroller}
          className="v3-noscrollbar"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onMouseEnter={() => { paused.current = true }}
          onMouseLeave={() => { if (!drag.current) paused.current = false }}
          style={{
            // position:relative makes this the offset parent, so each card's
            // offsetLeft is measured from here — required for the centring math
            position: 'relative',
            display: 'flex', gap: 20, overflowX: 'auto', cursor: 'grab', paddingBlock: 6,
            WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)',
            maskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)',
          }}
        >
          <CardList items={items} />
        </div>
      </div>

      <div style={{ position: 'relative', width: DOT_STEP * 5, height: 14, margin: 'clamp(32px,4.5vh,56px) auto 0', overflow: 'hidden' }}>
        {window_.map(i => {
          const d = Math.abs(i - logical)
          const size = d === 0 ? 10 : d === 1 ? 7 : d === 2 ? 5 : 4
          const clickable = d > 0 && d <= 2
          return (
            <span key={i} onClick={() => clickable && move(i - logical)}
              style={{
                position: 'absolute', top: '50%', left: '50%', width: size, height: size, borderRadius: 999,
                background: d === 0 ? 'var(--text)' : 'var(--text-subtle)',
                opacity: d === 0 ? 1 : d === 1 ? 0.55 : d === 2 ? 0.3 : 0,
                transform: `translate(calc(-50% + ${(i - logical) * DOT_STEP}px), -50%)`,
                pointerEvents: d <= 2 ? 'auto' : 'none', cursor: clickable ? 'pointer' : 'default',
                transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), width 0.4s ease, height 0.4s ease, opacity 0.4s ease, background 0.4s ease',
              }} />
          )
        })}
      </div>
    </section>
  )
}
