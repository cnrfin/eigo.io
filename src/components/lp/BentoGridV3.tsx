'use client'

import { Fragment, memo, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { computeGeom, layoutFor, rectOf } from './bentoLayout'
import { pickRandomReviews, colorForName, type Review } from '@/lib/reviews'

/* Interactive 5×2 bento grid (DOM) for the v3 hero.

   Two layers per card:
   · CONTENT — a faithful copy of the v2 ExpandingBento card (same .lp-bc-* /
     .lp-rv-* classes, same copy, same `.on` reveal where "もっと見る" swaps for
     the body + CTA). It hover-expands and fades out fast when the morph begins.
     The inner content is a memoized child (CardContent) so it is NOT reconciled
     on every scroll frame — only the lightweight wrapper styles update.
   · MORPH SHELL — a flat square that starts at the card's resting colour,
     recolours to teal and squishes into a flag particle.

   v3 differs from v2 ONLY in: fixed layout, the custom trial card, the IELTS
   photo background, and no TOEIC card. */

const TEAL = '#00c2b8'
const RADIUS = 16
const COMPRESS = 0.5
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x) }
function mixHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], t)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

// Fixed feature placement (TOEIC dropped; t2 + r1 are reviews). Copy mirrors the
// v2 FEATURE_COPY (ja/en). `photo` swaps the solid surface for an image.
type Loc = { ja: string; en: string }
const FEATURE: Record<string, { color: string; title: Loc; cta: Loc; body: Loc; photo?: string; overlay?: string }> = {
  tl: { color: 'var(--v3-pron)', overlay: '/pronCard.png',
    title: { ja: '発音チェック', en: 'Pronunciation Check' },
    cta: { ja: '試してみる', en: 'Try it' },
    body: { ja: 'LとRの発音を、リスニングとスピーキングで練習できる短いレッスン。AIによる無料の発音採点つき。', en: 'A quick lesson on L & R sounds with listening and speaking practise, plus free AI pronunciation grading.' } },
  r2: { color: 'var(--v3-level)', overlay: '/levelCard.png',
    title: { ja: 'レベル診断', en: 'Level Check' },
    cta: { ja: '診断する', en: 'Check level' },
    body: { ja: 'A1からC2まで、今の英語力を診断。弱点と次に伸ばすところがはっきりします。', en: 'Find your level from A1 to C2. See your weak spots and what to work on next.' } },
  wide: { color: 'var(--v3-ielts)', photo: '/test-lp.jpg',
    title: { ja: 'IELTS対策', en: 'IELTS Course' },
    cta: { ja: '学んでみる', en: 'Start learning' },
    body: { ja: 'IELTSのバンド別に弱点を攻略。海外進学や移住に必要なスコアへ。', en: 'Tackle weak points band by band. Reach the score you need to study or move abroad.' } },
}
const REVIEW_FOR: Record<string, number> = { t2: 0, r1: 1 }
// Card → funnel key (same destinations as v2's CARD_CONFIG). Reviews don't route.
const ROUTE: Record<string, string> = { tl: 'pron', r2: 'cefr', wide: 'ielts', center: 'trial' }

/* Card inner content — memoized so a scroll-frame re-render of the grid (which
   only changes the wrapper transform/opacity) does NOT re-reconcile this subtree.
   Props change only on hover (`expanded`) or resize (`bs`). */
const CardContent = memo(function CardContent({ id, bs, review, mobile = false }: { id: string; bs: number; review?: Review; mobile?: boolean }) {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  // Custom trial card (the one v3-specific card).
  if (id === 'center') {
    // Mobile: a clean full-width banner (no profile photo / greeting bubble,
    // which look cramped in the short card) — just the title and Book now.
    if (mobile) {
      return (
        <div className="lp-bc-surface" style={{ width: '100%', height: '100%', background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box', padding: `${16 * bs}px ${18 * bs}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 * bs }}>
          <div className="jp" style={{ fontSize: 15 * bs, fontWeight: ja ? 600 : 500, lineHeight: 1.2 }}>{ja ? '無料体験レッスン' : 'Free trial lesson'}</div>
          <div className="jp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid color-mix(in srgb, var(--text) 12%, transparent)', paddingTop: 11 * bs, fontSize: 14 * bs, fontWeight: 600 }}>
            <span>{ja ? '予約する' : 'Book now'}</span>
            <svg className="lp-trial-arrow" width={16 * bs} height={16 * bs} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="8 7 17 7 17 16" /></svg>
          </div>
        </div>
      )
    }
    return (
      <div className="lp-bc-surface" style={{ width: '100%', height: '100%', background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box', padding: 16 * bs, display: 'flex', flexDirection: 'column', gap: 10 * bs }}>
        <div className="jp" style={{ fontSize: 15 * bs, fontWeight: ja ? 600 : 500, letterSpacing: '-.01em' }}>{ja ? '無料体験レッスン' : 'Free trial lesson'}</div>
        <div style={{ position: 'relative', width: '100%', flex: '1 1 auto', minHeight: 0, borderRadius: 12 * bs, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/profile-lp.jpg" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <span style={{ position: 'absolute', left: 10 * bs, bottom: 8 * bs, color: 'var(--v3-on-photo)', fontSize: 13 * bs, fontWeight: 600, textShadow: '0 1px 5px rgba(0,0,0,.45)' }}>Connor</span>
        </div>
        <div style={{ alignSelf: 'flex-start', background: 'var(--v3-bubble)', color: 'var(--v3-bubble-ink)', fontSize: 12 * bs, fontWeight: 400, padding: `${6 * bs}px ${13 * bs}px`, borderRadius: 999 }}>Nice to meet you!</div>
        <div className="jp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid color-mix(in srgb, var(--text) 14%, transparent)', paddingBottom: 7 * bs, fontSize: 14 * bs, fontWeight: 600 }}>
          <span>{ja ? '予約する' : 'Book now'}</span>
          <svg className="lp-trial-arrow" width={17 * bs} height={17 * bs} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="8 7 17 7 17 16" /></svg>
        </div>
      </div>
    )
  }
  // Review card (exact v2 markup; white fill).
  if (review) {
    return (
      <div className="lp-bc-surface" style={{ width: '100%', height: '100%', background: 'var(--card)', color: 'var(--text)', borderRadius: RADIUS }}>
        <div className="lp-rv-top">
          {review.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="lp-rv-av-img" src={review.image} alt="" aria-hidden="true" />
            : <span className="lp-rv-av" style={{ background: colorForName(review.name) }}>{review.name[0]}</span>}
          <div className="lp-rv-name jp" style={{ fontWeight: ja ? 600 : 500 }}>{review.name}</div>
        </div>
        <div className="lp-rv-quote jp">「{review.text}」</div>
        <div className="lp-rv-foot">
          <div className="lp-rv-label jp">{ja ? '生徒の声' : 'Student voices'}</div>
          <div className="lp-rv-stars">★★★★★</div>
        </div>
      </div>
    )
  }
  // Feature card (exact v2 markup; bold solid colour + white text, or IELTS photo).
  const f = FEATURE[id]
  const surfaceStyle: React.CSSProperties = f.photo ? { color: 'var(--v3-on-photo)' } : { background: f.color, color: 'var(--v3-on-photo)' }
  return (
    <div className="lp-bc-surface" style={{ width: '100%', height: '100%', ...surfaceStyle }}>
      {f.photo && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.photo} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.62))' }} />
      </>}
      {f.overlay && // image over the solid background, under the text
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.overlay} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, display: 'block' }} />}
      <div className="lp-bc-cursor" aria-hidden="true"><span className="lp-bc-cursor-ring" /></div>
      <div className="lp-bc-head">
        <div className="lp-bc-title jp" style={{ fontWeight: ja ? 600 : 500 }}>{ja ? f.title.ja : f.title.en}</div>
        <div className="lp-bc-more jp">{ja ? 'もっと見る' : 'See more'}</div>
      </div>
      <div className="lp-bc-body jp">{ja ? f.body.ja : f.body.en}</div>
      <div className="lp-bc-cta jp" style={{ fontWeight: 600 }}>{ja ? f.cta.ja : f.cta.en}</div>
      <div className="lp-bc-free">{ja ? '無料' : 'Free'}</div>
    </div>
  )
})

export default function BentoGridV3({ interactive, progress, onOpen, settled = true, flagBoost = 1 }: { interactive: boolean; progress: number; onOpen?: (key: string) => void; settled?: boolean; flagBoost?: number }) {
  const { theme } = useTheme()
  // Morph-shell resting colours (hex, for the JS colour interpolation to teal).
  // The white review/trial cards follow the theme's card colour so the shell
  // crossfade matches the real card fill; brand colours are the same in both.
  const cardHex = theme === 'dark' ? '#16161d' : '#ffffff'
  const PAL: Record<string, string> = { tl: '#00a89f', t2: cardHex, wide: '#39413f', center: cardHex, r1: cardHex, r2: '#e85d8a' }
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ w: number; h: number; top: number } | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [raised, setRaised] = useState<string | null>(null) // kept up through the collapse
  const [reviews] = useState(() => pickRandomReviews(2)) // t2 + r1, randomised per mount

  // Re-measure whenever `settled` changes. On mobile the grid rides a scroll-up
  // reveal transform, so we re-read its rect once it has settled at its resting
  // (morph) position — otherwise `top` would be stale and the flag misaligns.
  useEffect(() => {
    const measure = () => { const el = ref.current; if (el) { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height, top: r.top }) } }
    const raf = requestAnimationFrame(measure)
    const t = window.setTimeout(measure, 220) // catch the resting position after any reveal transition
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [settled])

  const eff = interactive ? active : null
  const morph = smooth(clamp((progress - 0.02) / 0.12))     // flight + squish (early)
  const colorT = smooth(clamp((progress - 0.02) / 0.08))    // recolour to teal (faster)
  const morphing = progress > 0.015
  const fade = 1 - smooth(clamp((progress - 0.15) / 0.1))   // shell gone before flag forms
  const contentFade = 1 - smooth(clamp((progress - 0.02) / 0.05)) // content gone almost at once

  if (!size) return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
  const layout = layoutFor(size.w)        // responsive: 5×2 desktop / 2×5 mobile
  const geom = computeGeom(size.w, size.h, layout)
  const fscale = flagBoost * Math.min((size.w * 0.32) / 660, (size.h * 0.52) / 396)
  const dot = Math.max(3, fscale * 12 * 0.85)
  // Flag forms at ≈44% of the viewport (below the title); convert that screen Y
  // into this slot's local coords so the cards morph straight into it.
  const vh = typeof window !== 'undefined' ? window.innerHeight : size.h
  const flagCx = size.w / 2, flagCy = vh * 0.44 - size.top
  // Content scale (v2 --bs). On the tall mobile 2×5 stack the cells are much
  // smaller, so allow a lower floor — otherwise the fixed-size content overflows
  // its cell and the cards look "smashed" (text overlapping).
  const bsFloor = layout.cols <= 2 ? 0.46 : 0.85
  const bs = Math.min(1.25, Math.max(bsFloor, geom.cell / 152))

  // Target rect when interactive (base, expanded, or shrunk centre).
  const targetRect = (id: string) => {
    const cfg = layout.cards[id]
    if (eff === id && cfg.exp) return rectOf(cfg.exp, geom)
    if (id === 'center' && eff && layout.shrinkTriggers.includes(eff)) return rectOf(layout.centerShrink, geom)
    return rectOf(cfg, geom)
  }

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--gx', `${e.clientX - r.left}px`)
    el.style.setProperty('--gy', `${e.clientY - r.top}px`)
    el.style.setProperty('--ring-d', (e.clientY - r.top) / r.height > 0.72 ? '46px' : '26px')
  }

  const isMobileLayout = layout.cols <= 2
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: interactive ? 'auto' : 'none', zIndex: 2 }}>
      {Object.keys(layout.cards).map((id, idx) => {
        const cfg = layout.cards[id]
        const base = rectOf(cfg, geom) // morph shell is rendered at base size

        // ---- morph shell (flat square that squishes into the flag) ----
        const bx = base.x + base.w / 2, by = base.y + base.h / 2
        // Compress each card's offset around the GRID centroid (size/2), then
        // place that cluster on the flag centre — so the cards land where the
        // flag forms (≈44%), not halfway down toward their resting spot.
        const cx = lerp(bx, flagCx + (bx - size.w / 2) * COMPRESS, morph)
        const cy = lerp(by, flagCy + (by - size.h / 2) * COMPRESS, morph)
        const sx = lerp(1, dot / base.w, morph)
        const sy = lerp(1, dot / base.h, morph)
        const stx = cx - base.w / 2, sty = cy - base.h / 2

        // ---- content layer (the real card; v2 hover reveal, fades on morph) ----
        const t = morphing ? base : targetRect(id)
        const up = raised === id || eff === id

        return (
          <Fragment key={id}>
            {/* morph shell */}
            <div
              style={{
                position: 'absolute', left: 0, top: 0, width: base.w, height: base.h,
                transform: `translate(${stx}px, ${sty}px) scale(${sx}, ${sy})`, transformOrigin: 'center',
                background: mixHex(PAL[id], TEAL, colorT), borderRadius: RADIUS, opacity: morphing ? fade : 0,
                zIndex: up ? 100 : 2, pointerEvents: 'none', willChange: 'transform',
                transition: `transform ${morphing ? '0.06s linear' : '0.45s cubic-bezier(0.22,1,0.36,1)'}, background-color 0.1s linear, opacity 0.1s linear`,
              }}
            />
            {/* content layer */}
            <div
              // `.on` follows the ACTIVE hover only (removed immediately on
              // mouse-leave → body fades back to "see more" before the card
              // finishes collapsing, exactly like v2). The raised z-index is
              // tracked separately so the card still stays on top while it shrinks.
              className={`lp-bcard${eff === id ? ' on' : ''}`}
              onMouseEnter={() => { if (interactive && cfg.exp && !isMobileLayout) { setActive(id); setRaised(id) } }}
              onMouseLeave={() => { if (interactive && !isMobileLayout && active === id) setActive(null) }}
              onMouseMove={cfg.exp && !isMobileLayout ? onMove : undefined}
              onClick={() => {
                if (!interactive || morphing || !onOpen) return
                // Mobile: first tap expands the card to reveal its description;
                // a second tap (now expanded) follows the route. Tapping another
                // card expands that one and collapses this. Desktop routes on click.
                if (isMobileLayout && cfg.exp && active !== id) { setActive(id); setRaised(id); return }
                if (ROUTE[id]) onOpen(ROUTE[id])
              }}
              onTransitionEnd={e => { if (e.propertyName === 'width' && active !== id && raised === id) setRaised(null) }}
              style={{
                position: 'absolute', left: 0, top: 0, width: t.w, height: t.h,
                transform: `translate(${t.x}px, ${t.y}px)`, borderRadius: RADIUS, overflow: 'hidden', boxSizing: 'border-box',
                opacity: morphing ? contentFade : 1, zIndex: up ? 120 : 10,
                pointerEvents: interactive && !morphing ? 'auto' : 'none', cursor: ROUTE[id] ? 'pointer' : 'default',
                transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1), width 0.45s cubic-bezier(0.22,1,0.36,1), height 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.12s linear',
                ['--bs' as string]: bs,
              } as React.CSSProperties}
            >
              {/* inner = v2 bento entrance (rise from 26px, 70ms stagger) — kept
                  separate from the morph/hover transform on the wrapper */}
              <div className="lp-bento-rise" style={{ width: '100%', height: '100%', animationDelay: `${0.55 + idx * 0.07}s` }}>
                <CardContent id={id} bs={bs} review={id in REVIEW_FOR ? reviews[REVIEW_FOR[id]] : undefined} mobile={isMobileLayout} />
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
