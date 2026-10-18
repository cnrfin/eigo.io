'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './course-sheet.css'
import { CATEGORY_NAMES, LEVEL_NAMES, nextLevel, type Category, type LevelIndex, type SceneSummary } from '@/lib/roleplay/types'

/**
 * Booking course picker (design: mockups/booking-course-mockups.html, D2).
 * A sheet with a full-width banner for the course being looked at (its scene
 * pictures, level, title, chips, description, progress), a search box and
 * one row of course cards per series. Tapping a card shows it in the banner;
 * 「このコースを選ぶ」 chooses it. Mount it only while open.
 *
 * AI lessons also offer role-plays (phase 3c, design: mockups/roleplay-picker.html, "Dashboard: the picker"):
 * a コース / ロールプレイ toggle at the top; the chosen scene on top (its tasks, the three level dots, and the levels
 * they may pick: any up to the one they're due), every role-play listed below by category, with a search.
 */
export type RoleplayChoice = { sceneId: string; level: LevelIndex }

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
  /** preview video; when set it plays instead of the scene pictures */
  reel?: string | null
  lessonCount: number
  doneCount: number
  /** 1-based lesson numbers the student can still book, in order */
  queue: number[]
  /** 1-based number of the first lesson not completed (where an AI lesson started now carries on); null when done */
  next?: number | null
}

type Lang = 'ja' | 'en'
const TX = {
  ja: {
    search: '検索', choose: 'このコースを選ぶ', of: (d: number, n: number) => `${d} / ${n} レッスン`, none: '見つかりませんでした', results: '検索結果', close: '閉じる', prev: '前へ', next: '次へ',
    courses: 'コース', roleplays: 'ロールプレイ', chooseRp: 'このロールプレイを選ぶ', rpKick: 'ロールプレイ',
    rpFirst: 'はじめて · 初級から', rpAll: '全レベルクリア', rpNext: (lv: string) => `次は${lv}`, rpNew: 'はじめて', rpClear: 'クリア', level: 'レベル',
  },
  en: {
    search: 'Search', choose: 'Choose this course', of: (d: number, n: number) => `${d} / ${n} lessons`, none: 'No results', results: 'Results', close: 'Close', prev: 'Previous', next: 'Next',
    courses: 'Courses', roleplays: 'Role-plays', chooseRp: 'Choose this role-play', rpKick: 'Role-play',
    rpFirst: 'First time · from Beginner', rpAll: 'All levels cleared', rpNext: (lv: string) => `Next: ${lv}`, rpNew: 'New', rpClear: 'Cleared', level: 'Level',
  },
}

/** filled = level cleared, ring = the level they'll play next */
const Dots = ({ cleared }: { cleared: number }) => (
  <span className="cs-dots" aria-hidden>
    {[0, 1, 2].map((i) => (
      <i key={i} className={i < cleared ? 'on' : i === cleared && cleared < 3 ? 'next' : ''} />
    ))}
  </span>
)

const Chevron = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
)

/** The course's preview video (muted, looping). Plays while `playing`; otherwise shows its first frame. */
function VideoReel({ src, poster, playing }: { src: string; poster?: string; playing: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) void v.play().catch(() => undefined)
    else v.pause()
  }, [playing])
  return (
    <div className={`cs-reel${playing ? ' cs-live' : ''}`}>
      <video ref={ref} className="cs-vid" src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden />
    </div>
  )
}

/** Scene pictures: only the current one (and the one fading out) are in the DOM. */
function Reel({ scenes, playing, video }: { scenes: string[]; playing: boolean; video?: string | null }) {
  if (video) return <VideoReel src={video} poster={scenes[0]} playing={playing} />
  return <SceneReel scenes={scenes} playing={playing} />
}

function SceneReel({ scenes, playing }: { scenes: string[]; playing: boolean }) {
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
        <Reel scenes={c.scenes} playing={hover} video={c.reel} />
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
  roleplays,
  initialRoleplay,
  onChooseRoleplay,
}: {
  courses: CatalogEntry[]
  initialId: string | null
  lang: Lang
  onChoose: (id: string) => void
  onClose: () => void
  /** AI lessons: the role-plays (with the student's progress); the toggle shows when these are given */
  roleplays?: SceneSummary[] | null
  initialRoleplay?: RoleplayChoice | null
  onChooseRoleplay?: (c: RoleplayChoice) => void
}) {
  const tx = TX[lang]
  const rpOn = !!roleplays?.length && !!onChooseRoleplay
  const [mode, setMode] = useState<'course' | 'rp'>(() => (rpOn && (initialRoleplay || !courses.length) ? 'rp' : 'course'))
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

  const toggle = rpOn && (
    <div className="cs-seg" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'course'} className={mode === 'course' ? 'on' : ''} onClick={() => setMode('course')} disabled={!courses.length}>
        {tx.courses}
      </button>
      <button type="button" role="tab" aria-selected={mode === 'rp'} className={mode === 'rp' ? 'on' : ''} onClick={() => setMode('rp')}>
        {tx.roleplays}
      </button>
    </div>
  )
  // one sheet for courses and role-plays: switching swaps only what's inside (it used to reopen the whole sheet)
  const showRp = rpOn && mode === 'rp'
  if (!showRp && !c) return null
  const chips = c ? (lang === 'ja' ? c.chips.ja : c.chips.en) : []
  const desc = c ? (lang === 'ja' ? c.descriptionJa : c.description) || c.description : ''

  return createPortal(
    <div className="cs-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cs-sheet" role="dialog" aria-modal="true" aria-label={showRp ? tx.roleplays : lang === 'ja' ? 'コースを選ぶ' : 'Choose a course'}>
        {toggle}
        <CloseBtn label={tx.close} onClose={onClose} />
        {showRp ? (
          <RoleplayPicker tx={tx} lang={lang} scenes={roleplays!} initial={initialRoleplay ?? null} onChoose={onChooseRoleplay!} />
        ) : c ? (
          <>
        <div className="cs-body cs-swap" key="course" ref={body}>
          <div className="cs-hero">
            <Reel key={c.id} scenes={c.scenes} playing video={c.reel} />
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
          </>
        ) : null}
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

function CloseBtn({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <button type="button" className="cs-close" aria-label={label} onClick={onClose}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  )
}

/** The role-play side of the sheet. */
function RoleplayPicker({
  tx,
  lang,
  scenes,
  initial,
  onChoose,
}: {
  tx: (typeof TX)[Lang]
  lang: Lang
  scenes: SceneSummary[]
  initial: RoleplayChoice | null
  onChoose: (c: RoleplayChoice) => void
}) {
  const [shown, setShown] = useState(() => (initial && scenes.find((x) => x.id === initial.sceneId)?.id) || scenes[0]?.id)
  const [level, setLevel] = useState<LevelIndex | null>(() => (initial ? initial.level : null))
  const [q, setQ] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const sc = scenes.find((x) => x.id === shown) ?? scenes[0]
  const lv = level ?? nextLevel(sc?.cleared ?? 0)
  const lvName = (n: number) => LEVEL_NAMES[n as LevelIndex][lang]
  const line = (x: SceneSummary) => (x.cleared === 0 ? tx.rpNew : x.cleared >= 3 ? tx.rpClear : tx.rpNext(lvName(x.cleared)))

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s
      ? scenes.filter((x) => [x.title.ja, x.title.en, x.summary.ja, x.summary.en, CATEGORY_NAMES[x.category].ja, CATEGORY_NAMES[x.category].en].join(' ').toLowerCase().includes(s))
      : scenes
    const m = new Map<Category, SceneSummary[]>()
    for (const x of list) m.set(x.category, [...(m.get(x.category) ?? []), x])
    return [...m.entries()]
  }, [q, scenes])

  // stable, so the rows (memoised) don't all redraw when one is picked
  const pick = useCallback((id: string) => {
    setShown(id)
    setLevel(null)
    body.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  if (!sc) return null
  return (
    <>
        <div className="cs-body cs-swap" key="rp" ref={body}>
          <div className="cs-hero">
            <div className="cs-reel" key={sc.id}>
              {sc.image ? <img className="cs-in" src={sc.image} alt="" /> : <span className="cs-rph" />}
            </div>
            <div className="cs-info" key={`i${sc.id}`}>
              <span className="cs-kick">
                {tx.rpKick} · {lvName(lv)}
              </span>
              <h2>{sc.title[lang]}</h2>
              {lang === 'ja' && <div className="cs-en">{sc.title.en}</div>}
              {lv === sc.next && sc.tasks.length > 0 && (
                <div className="cs-chips">
                  {sc.tasks.map((t) => (
                    <span key={t.en} className="cs-chip">
                      {t[lang]}
                    </span>
                  ))}
                </div>
              )}
              <p className="cs-desc">{sc.summary[lang]}</p>
              <div className="cs-lvrow">
                <Dots cleared={sc.cleared} />
                <span>{sc.cleared === 0 ? tx.rpFirst : sc.cleared >= 3 ? tx.rpAll : tx.rpNext(lvName(sc.next))}</span>
              </div>
              {sc.cleared > 0 && (
                <div className="cs-lvpick" role="radiogroup" aria-label={tx.level}>
                  {([0, 1, 2] as LevelIndex[]).map((i) => (
                    <button key={i} type="button" role="radio" aria-checked={i === lv} className={i === lv ? 'on' : ''} disabled={i > sc.next} onClick={() => setLevel(i)}>
                      {lvName(i)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <label className="cs-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input value={q} placeholder={tx.search} aria-label={tx.search} onChange={(e) => setQ(e.target.value)} />
          </label>

          {groups.length ? (
            groups.map(([cat, list]) => (
              <section key={cat} className="cs-sec cs-rsec">
                <div className="cs-sech">
                  <h3>{CATEGORY_NAMES[cat][lang]}</h3>
                </div>
                <div className="cs-rlist">
                  {list.map((x) => (
                    <RpRow key={x.id} x={x} lang={lang} on={x.id === sc.id} label={line(x)} onPick={pick} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="cs-empty">{tx.none}</p>
          )}
        </div>
        <div className="cs-foot">
          <button type="button" className="cs-cta" onClick={() => onChoose({ sceneId: sc.id, level: lv })}>
            {tx.chooseRp}
          </button>
        </div>
    </>
  )
}

/** One row of the role-play list. Memoised: picking a scene redraws only the old and the new selection. */
const RpRow = memo(function RpRow({ x, lang, on, label, onPick }: { x: SceneSummary; lang: Lang; on: boolean; label: string; onPick: (id: string) => void }) {
  return (
    <button type="button" className={`cs-rrow${on ? ' cs-on' : ''}`} aria-pressed={on} onClick={() => onPick(x.id)}>
      {x.image ? <img src={x.image} alt="" loading="lazy" decoding="async" /> : <span className="cs-rph" />}
      <span className="cs-rt">
        <b>{x.title[lang]}</b>
        <span>{x.summary[lang]}</span>
      </span>
      <span className={`cs-rl${x.cleared === 0 ? ' new' : ''}`}>
        <Dots cleared={x.cleared} />
        <span>{label}</span>
      </span>
    </button>
  )
})
