'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './course-sheet.css'

/**
 * Booking course picker (design: mockups/booking-course-mockups.html, D2).
 * A sheet with a full-width banner for the course being looked at (its scene
 * pictures, level, title, chips, description, progress), a search box and
 * one row of course cards per series. Tapping a card shows it in the banner;
 * 「このコースを選ぶ」 chooses it. Mount it only while open.
 */

export type CatalogEntry = {
  id: string
  title: string
  titleJa: string
  description: string
  descriptionJa: string
  level: string
  series: string
  sortOrder: number
  chips: { ja: string[]; en: string[] }
  scenes: string[]
  lessonCount: number
  doneCount: number
  /** 1-based lesson numbers the student can still book, in order */
  queue: number[]
}

type Lang = 'ja' | 'en'
const TX = {
  ja: { search: '検索', choose: 'このコースを選ぶ', of: (d: number, n: number) => `${d} / ${n} レッスン`, none: '見つかりませんでした', results: '検索結果', close: '閉じる', prev: '前へ', next: '次へ' },
  en: { search: 'Search', choose: 'Choose this course', of: (d: number, n: number) => `${d} / ${n} lessons`, none: 'No results', results: 'Results', close: 'Close', prev: 'Previous', next: 'Next' },
}

const Chevron = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
)

/** Scene pictures: only the current one (and the one fading out) are in the DOM. */
function Reel({ scenes, playing }: { scenes: string[]; playing: boolean }) {
  const [{ i, prev }, setS] = useState<{ i: number; prev: number | null }>({ i: 0, prev: null })
  useEffect(() => {
    if (!playing || scenes.length < 2) return
    const t = window.setInterval(() => setS((s) => ({ prev: s.i, i: (s.i + 1) % scenes.length })), 3200)
    return () => window.clearInterval(t)
  }, [playing, scenes.length])
  return (
    <div className={`cs-reel${playing ? ' cs-live' : ''}`}>
      {prev !== null && prev !== i && scenes[prev] && <img key={`p${prev}`} src={scenes[prev]} alt="" />}
      {scenes[i] && <img key={`c${i}`} className="cs-in" src={scenes[i]} alt="" />}
    </div>
  )
}

function Progress({ c, lang }: { c: CatalogEntry; lang: Lang }) {
  const n = c.lessonCount || 1
  return (
    <div className="cs-p">
      <div className="cs-prog">
        <i style={{ width: `${(c.doneCount / n) * 100}%` }} />
      </div>
      <span>{TX[lang].of(c.doneCount, c.lessonCount)}</span>
    </div>
  )
}

function Card({ c, lang, on, onPick }: { c: CatalogEntry; lang: Lang; on: boolean; onPick: () => void }) {
  const [hover, setHover] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  return (
    <button
      type="button"
      className={`cs-card${on ? ' cs-on' : ''}`}
      aria-pressed={on}
      onClick={onPick}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        timer.current = window.setTimeout(() => setHover(true), 350)
      }}
      onPointerLeave={() => {
        window.clearTimeout(timer.current)
        setHover(false)
      }}
    >
      <div style={{ position: 'relative' }}>
        {c.level && <span className="cs-lvl">{c.level}</span>}
        <Reel scenes={c.scenes} playing={hover} />
      </div>
      <div className="cs-cb">
        <b>{lang === 'ja' ? c.titleJa : c.title}</b>
        <Progress c={c} lang={lang} />
      </div>
    </button>
  )
}

export default function CourseSheet({
  courses,
  initialId,
  lang,
  onChoose,
  onClose,
}: {
  courses: CatalogEntry[]
  initialId: string | null
  lang: Lang
  onChoose: (id: string) => void
  onClose: () => void
}) {
  const tx = TX[lang]
  const [shown, setShown] = useState(
    () => (initialId && courses.find((c) => c.id === initialId)?.id) || courses.find((c) => c.doneCount > 0 && c.queue.length)?.id || courses[0]?.id,
  )
  const [q, setQ] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const c = courses.find((x) => x.id === shown) ?? courses[0]

  // Esc clears the search, then closes; the page behind doesn't scroll
  const qRef = useRef(q)
  useEffect(() => {
    qRef.current = q
  }, [q])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (qRef.current) setQ('')
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const series = useMemo(() => {
    const m = new Map<string, CatalogEntry[]>()
    for (const x of courses) m.set(x.series, [...(m.get(x.series) ?? []), x])
    return [...m.entries()]
  }, [courses])

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return null
    return courses.filter((x) =>
      [x.title, x.titleJa, x.level, x.series, ...x.chips.ja, ...x.chips.en].join(' ').toLowerCase().includes(s),
    )
  }, [q, courses])

  const pick = (id: string) => {
    setShown(id)
    body.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const card = (x: CatalogEntry) => <Card key={x.id} c={x} lang={lang} on={x.id === shown} onPick={() => pick(x.id)} />

  if (!c) return null
  const chips = lang === 'ja' ? c.chips.ja : c.chips.en
  const desc = (lang === 'ja' ? c.descriptionJa : c.description) || c.description

  return createPortal(
    <div className="cs-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cs-sheet" role="dialog" aria-modal="true" aria-label={lang === 'ja' ? 'コースを選ぶ' : 'Choose a course'}>
        <button type="button" className="cs-close" aria-label={tx.close} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="cs-body" ref={body}>
          <div className="cs-hero">
            <Reel key={c.id} scenes={c.scenes} playing />
            <div className="cs-info" key={`i${c.id}`}>
              {c.level && <span className="cs-kick">{c.level}</span>}
              <h2>{lang === 'ja' ? c.titleJa : c.title}</h2>
              {lang === 'ja' && c.title !== c.titleJa && <div className="cs-en">{c.title}</div>}
              {chips.length > 0 && (
                <div className="cs-chips">
                  {chips.map((x) => (
                    <span key={x} className="cs-chip">
                      {x}
                    </span>
                  ))}
                </div>
              )}
              {desc && <p className="cs-desc">{desc}</p>}
              <Progress c={c} lang={lang} />
            </div>
          </div>

          <label className="cs-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input value={q} placeholder={tx.search} aria-label={tx.search} onChange={(e) => setQ(e.target.value)} />
          </label>

          {hits ? (
            <section className="cs-sec">
              <div className="cs-sech">
                <h3>{tx.results}</h3>
              </div>
              {hits.length ? <div className="cs-grid">{hits.map(card)}</div> : <p className="cs-empty">{tx.none}</p>}
            </section>
          ) : (
            series.map(([name, list]) => <Row key={name} name={name} tx={tx}>{list.map(card)}</Row>)
          )}
        </div>
        <div className="cs-foot">
          <button type="button" className="cs-cta" onClick={() => onChoose(c.id)}>
            {tx.choose}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Row({ name, tx, children }: { name: string; tx: (typeof TX)[Lang]; children: React.ReactNode }) {
  const strip = useRef<HTMLDivElement>(null)
  const scroll = (d: number) => strip.current?.scrollBy({ left: d * 240, behavior: 'smooth' })
  return (
    <section className="cs-sec">
      <div className="cs-sech">
        <h3>{name}</h3>
        <span className="cs-nav">
          <button type="button" aria-label={tx.prev} onClick={() => scroll(-1)}>
            <Chevron dir="l" />
          </button>
          <button type="button" aria-label={tx.next} onClick={() => scroll(1)}>
            <Chevron dir="r" />
          </button>
        </span>
      </div>
      <div className="cs-strip" ref={strip}>
        {children}
      </div>
    </section>
  )
}
