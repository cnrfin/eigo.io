'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDashboardNav } from '@/context/DashboardNavContext'
import SquircleBox from '@/components/ui/SquircleBox'
import CourseMascot, { type Dir } from '@/components/courses/CourseMascot'
import CourseStation from '@/components/courses/CourseStation'

type Lesson = {
  id: string
  slug: string
  title: string
  title_ja: string
  free: boolean
  estimated_minutes: number
  progress: { status: string; screen_index: number } | null
  score?: number | null
}
type Level = { id: string; title: string; title_ja: string; lessons: Lesson[] }
type Course = {
  id: string; slug: string; title: string; title_ja: string
  description: string; description_ja: string; published: boolean
  levels: Level[]
}

// Track geometry
const ROW_H = 150        // px per node row (generous spacing, Brilliant-style)
const AMPLITUDE = 54     // px horizontal wobble of the serpentine
const NODE_CENTER = 0.40 // node column center as a fraction of track width
const TOP_FADE = 64      // px; sticky titles pin just below this
const NODE = 92          // station hit-area / marker box px

// Per-course serpentine: hash the slug into a stable phase / frequency /
// second-harmonic mix so each course's trail meanders differently. Output is
// normalized to ±1 (the caller scales by AMPLITUDE), so no course ever
// wobbles wider than the original sine did.
function trackWave(slug: string): (idx: number) => number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  const rand = (n: number) => ((h >>> (n * 5)) % 1000) / 1000
  const phase = rand(0) * Math.PI * 2
  const freq = 0.72 + rand(1) * 0.42        // base meander: 0.72..1.14 rad/node
  const freq2 = 1.7 + rand(2) * 0.9         // faster second harmonic
  const phase2 = rand(3) * Math.PI * 2
  const mix = 0.25 + rand(4) * 0.2          // how much harmonic to blend in
  const amp = 0.85 + rand(5) * 0.15         // 0.85..1.0 of full amplitude
  return (idx: number) =>
    ((Math.sin(idx * freq + phase) + mix * Math.sin(idx * freq2 + phase2)) / (1 + mix)) * amp
}

// Tube-line gradient per level (cycled): [start, end] hues that shift slightly
// along the line, poster-style. Level 1 = brand teal. The station marker uses
// the start colour. All read on both the dark and light track bg.
const LEVEL_COLORS: [string, string][] = [
  ['#00c2b8', '#3ad6a0'], // teal → green
  ['#e85d8a', '#f0913f'], // pink → orange
  ['#4a82e0', '#8a6df0'], // blue → purple
  ['#34a853', '#9ccb3b'], // green → lime
  ['#f0992e', '#ef6a6a'], // amber → red
  ['#9a6df0', '#5b8def'], // purple → blue
]

// Smooth dashed connector through the node centres. Catmull-Rom → cubic bezier,
// so the line curves naturally between the serpentine nodes instead of zig-zag
// straight segments. Points at (0,0) are unmeasured nodes and are dropped.
// Linear interpolate between two #rrggbb hex colours (t in 0..1).
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t)
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t)
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t)
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`
}

// `k` is the curve tension (standard Catmull-Rom is 1/6 ≈ 0.167; higher = curvier).
function connectorPath(pts: { x: number; y: number }[], k = 1 / 6): string {
  const p = pts.filter(q => q && (q.x !== 0 || q.y !== 0))
  if (p.length < 2) return ''
  const f = (n: number) => n.toFixed(1)
  const d = [`M ${f(p[0].x)} ${f(p[0].y)}`]
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) * k, c1y = p1.y + (p2.y - p0.y) * k
    const c2x = p2.x - (p3.x - p1.x) * k, c2y = p2.y - (p3.y - p1.y) * k
    d.push(`C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)}`)
  }
  return d.join(' ')
}

/**
 * Course map (Phase A) — a scrollable serpentine track of lesson nodes grouped
 * by level. Sticky level titles pin just below the top fade and are pushed up
 * by the next level. Top/bottom fades dissolve nodes at the track edges. A
 * placeholder mascot sits on the active node (Phase B swaps in the Rive teri).
 */
export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>()
  // ?preview=upsell | upsell-booked — force-show the teacher/plans upsell with
  // sample data (no flags are stamped), so admins can see it despite being
  // always-entitled. Real users never hit this unless they type the param.
  const previewParam = useSearchParams().get('preview')
  const { session } = useAuth()
  const { locale } = useLanguage()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  const [course, setCourse] = useState<Course | null>(null)
  const [entitled, setEntitled] = useState(false)
  // attempts exhausted: the track greys like a paywall, but lessons the user
  // already opened (and the free L&R) stay live
  const pronMode = slug === 'pronunciation'
  // each course gets its own trail shape (stable per slug, ±AMPLITUDE bounded)
  const wave = useMemo(() => trackWave(slug), [slug])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accent, setAccent] = useState<'en-GB' | 'en-US'>('en-GB')
  // Pronunciation gating: attempts standing (lib/pron-gate model) + the
  // course-track upsell modal ("Need a teacher?" / "See plans")
  const [pron, setPron] = useState<{ used: number; max: number; remaining: number; avgScore: number | null; trialBooked: boolean; upsellDismissed: boolean } | null>(null)
  const [showUpsell, setShowUpsell] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeNodeRef = useRef<HTMLDivElement>(null)
  // mascot walk
  const nodeEls = useRef<(HTMLDivElement | null)[]>([])
  const levelTitleEls = useRef<(HTMLDivElement | null)[]>([])
  const posRef = useRef<{ x: number; y: number }[]>([])
  const [mascot, setMascot] = useState<{ x: number; y: number } | null>(null)
  const [moving, setMoving] = useState(false)
  const [direction, setDirection] = useState<Dir>(1)
  const [notice, setNotice] = useState(false)
  const [trackSegs, setTrackSegs] = useState<{ c1: string; c2: string; y1: number; y2: number; d: string; locked: boolean; fadeFrom?: string; fadeTop?: number }[]>([]) // tube lines per level
  const [trackH, setTrackH] = useState(0)         // full scroll height for the SVG
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null) // node whose card is shown
  const [cardVisible, setCardVisible] = useState(true) // selected node currently in view?
  const mascotIdxRef = useRef(0)  // node Teri currently stands on
  const walkSeqRef = useRef(0)    // cancels an in-flight walk when a new one starts
  const mascotReadyRef = useRef(false)   // rig loaded → inputs exist
  const pendingWalkRef = useRef<number | null>(null) // walk queued until rig ready

  // Show the card only while its node is within the visible band of the track
  // (above the top fade, above the card's own footprint at the bottom).
  const updateCardVisible = useCallback((sel: number | null) => {
    const cont = scrollRef.current
    if (!cont || sel == null || !posRef.current[sel]) return
    const yInView = posRef.current[sel].y - cont.scrollTop
    setCardVisible(yInView > TOP_FADE - 24 && yInView < cont.clientHeight - 140)
  }, [])

  // Scroll-driven fade for the level title cards: full opacity in the top half
  // of the track, fading toward 0 as they sit lower, so a title fades in as it
  // rises to the centre. Written imperatively (no re-render) on each scroll.
  const updateTitleOpacity = useCallback(() => {
    const cont = scrollRef.current
    if (!cont) return
    const cr = cont.getBoundingClientRect()
    const h = cont.clientHeight
    const mid = h * 0.5
    for (const el of levelTitleEls.current) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      const centerY = r.top - cr.top + r.height / 2
      el.style.opacity = String(centerY <= mid ? 1 : Math.max(0, 1 - (centerY - mid) / (h - mid)))
    }
  }, [])

  // Walk Teri from her current node to `target`, one straight node-to-node hop
  // at a time (down if the target is later, up if earlier), then select it.
  // Deliberately simple — one direction/position update per hop. Curved
  // (sub-stepped) interpolation was tried twice but its extra mid-walk updates
  // made the WebGL2 walk-cycle paint glitchy, so straight lines it is.
  const walkTo = useCallback((target: number) => {
    const pos = posRef.current
    if (!pos.length || target < 0 || target >= pos.length) return
    setSelectedIdx(target)
    updateCardVisible(target)
    setNotice(false) // clear the arrival notice the instant a new walk starts
    const seq = ++walkSeqRef.current
    const dirFor = (a: { x: number; y: number }, b: { x: number; y: number }): Dir =>
      Math.abs(b.y - a.y) >= Math.abs(b.x - a.x) ? (b.y > a.y ? 1 : 3) : (b.x > a.x ? 0 : 2)
    const greet = () => setNotice(true) // true on arrival; stays until the next walk
    const step = (from: number) => {
      if (seq !== walkSeqRef.current) return
      if (from === target) { setMoving(false); mascotIdxRef.current = target; greet(); return }
      const next = from < target ? from + 1 : from - 1
      setDirection(dirFor(pos[from], pos[next]))
      setMoving(true)
      setMascot(pos[next])
      mascotIdxRef.current = next
      setTimeout(() => step(next), 650)
    }
    if (mascotIdxRef.current === target) { greet(); return }
    step(mascotIdxRef.current)
  }, [updateCardVisible])

  // Start (or queue) a walk that only runs once the Rive rig has loaded —
  // otherwise isMoving/direction are still null and the walk is silently lost.
  const requestWalk = useCallback((target: number) => {
    if (mascotReadyRef.current) walkTo(target)
    else pendingWalkRef.current = target
  }, [walkTo])

  const onMascotReady = useCallback(() => {
    mascotReadyRef.current = true
    if (pendingWalkRef.current != null) {
      const tg = pendingWalkRef.current
      pendingWalkRef.current = null
      walkTo(tg)
    }
  }, [walkTo])

  // Measure node centres (in scroll-content coords) + rebuild the connector path
  // and track height. Returns the scroll container, or null if not mounted yet.
  const measurePositions = useCallback(() => {
    const cont = scrollRef.current
    if (!cont) return null
    const cr = cont.getBoundingClientRect()
    posRef.current = nodeEls.current.map(el => {
      if (!el) return { x: 0, y: 0 }
      const r = el.getBoundingClientRect()
      return { x: r.left - cr.left + cont.scrollLeft + r.width / 2, y: r.top - cr.top + cont.scrollTop + r.height / 2 }
    })
    // One tube line per level (its own colour). Each level's path starts at the
    // previous level's last station so the line is continuous through the
    // interchange, taking on the new level's colour from that point.
    if (course) {
      const segs: { c1: string; c2: string; y1: number; y2: number; d: string; locked: boolean; fadeFrom?: string; fadeTop?: number }[] = []
      let start = 0
      course.levels.forEach((lvl, li) => {
        const len = lvl.lessons.length
        const pts = posRef.current.slice(start, start + len)
        const linePts = start > 0 ? [posRef.current[start - 1], ...pts] : pts
        // Gradient spans the level's OWN nodes (not the prepended prev-level node),
        // so the line colour at each node matches the index-based node dot colour.
        // Above the first node the gradient clamps to c1 (SVG pad spread).
        const ys = pts.map(p => p.y)
        const [c1, c2] = LEVEL_COLORS[li % LEVEL_COLORS.length]
        // Levels past the first are paywalled: drain their colour for locked-out
        // (non-entitled) users so only Level 1 reads as live. The FIRST locked
        // level eases in from the previous level's end colour to the grey, so the
        // line dissolves into the locked zone instead of cutting to grey abruptly.
        const lockedOut = pronMode ? (!entitled && pron != null && pron.remaining <= 0) : !entitled
        const locked = lockedOut && li > 0
        const fadeFrom = locked && !(lockedOut && (li - 1) > 0)
          ? LEVEL_COLORS[(li - 1) % LEVEL_COLORS.length][1]
          : undefined
        // Fade starts at the top of this line (the interchange node) and reaches
        // grey within a short span, so the colour dissolves quickly into the lock.
        const fadeTop = fadeFrom !== undefined ? linePts[0].y : undefined
        segs.push({ c1, c2, y1: Math.min(...ys), y2: Math.max(...ys), d: connectorPath(linePts), locked, fadeFrom, fadeTop })
        start += len
      })
      setTrackSegs(segs)
    }
    setTrackH(cont.scrollHeight)
    return cont
  }, [course, entitled, pronMode, pron])

  // Remeasure on container resize and snap the mascot back onto its current node
  // (node x positions are a fraction of width, so they shift when width changes).
  useEffect(() => {
    const cont = scrollRef.current
    if (!cont) return
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return } // skip the synchronous initial fire
      measurePositions()
      const cur = posRef.current[mascotIdxRef.current]
      if (cur) setMascot(cur)
      updateTitleOpacity()
    })
    ro.observe(cont)
    return () => ro.disconnect()
  }, [measurePositions, course, updateTitleOpacity])

  useEffect(() => {
    if (!session?.access_token) return
    fetch('/api/courses', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then(d => {
        const c = (d.courses ?? []).find((x: Course) => x.slug === slug)
        if (!c) throw new Error('not found')
        setCourse(c)
        setEntitled(d.entitled)
        if (slug === 'pronunciation' && !d.entitled) {
          fetch('/api/courses/pron-status', { headers: { Authorization: `Bearer ${session.access_token}` } })
            .then(r => r.json())
            .then(s => {
              if (!s || s.error) return
              setPron(s)
              if (s.remaining <= 0 && typeof s.avgScore === 'number' && s.avgScore < 80 && !s.upsellDismissed) {
                setTimeout(() => setShowUpsell(true), 900)
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => setError(t('コースを読み込めませんでした', 'Could not load this course')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, slug])

  useEffect(() => {
    if (previewParam !== 'upsell' && previewParam !== 'upsell-booked') return
    // override any fetched data: the param decides the variant exactly
    setPron(p => ({
      used: p?.used ?? 3, max: p?.max ?? 3, remaining: 0,
      avgScore: p?.avgScore ?? 72,
      trialBooked: previewParam === 'upsell-booked',
      upsellDismissed: false,
    }))
    setShowUpsell(true)
  }, [previewParam])

  // Grading accent (for the pill + caption on the pronunciation course)
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    ;(async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase.from('profiles').select('pronunciation_accent').eq('id', uid).single()
        if (data?.pronunciation_accent === 'en-US' || data?.pronunciation_accent === 'en-GB') setAccent(data.pronunciation_accent)
      } catch { /* ignore */ }
    })()
  }, [session?.user?.id])

  const { setCrumbs } = useDashboardNav()
  useEffect(() => {
    setCrumbs([
      { label: t('コース', 'Courses'), onClick: () => router.push('/dashboard/courses') },
      { label: course ? (locale === 'ja' ? course.title_ja : course.title) : t('コース', 'Course') },
    ])
    return () => setCrumbs([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, locale, setCrumbs])

  // Centre the active node, measure node positions, then walk the mascot from
  // the last completed node to the active one (or just greet if at the start).
  useEffect(() => {
    if (!course) return
    const flatL = course.levels.flatMap(l => l.lessons)
    const activeIdx = flatL.findIndex(x => x.progress?.status !== 'completed')
    const id = setTimeout(() => {
      const cont = measurePositions()
      if (!cont) return
      // Scroll the TRACK (never the window) so the ACTIVE LEVEL's title pins at
      // the top, flush with the info card — matching the reference.
      if (activeIdx >= 0) {
        const lvl = currentLevelIdx(course, nextLesson)
        const tEl = levelTitleEls.current[lvl]
        const top = tEl ? tEl.offsetTop - TOP_FADE : Math.max(0, posRef.current[activeIdx].y - 150)
        cont.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
      }
      // When every lesson is done, Teri rests at the top of the track by default
      // (the first node) rather than the final one. Otherwise she starts on the
      // last completed node and walks down to the active lesson.
      if (activeIdx < 0) {
        mascotIdxRef.current = 0
        setMascot(posRef.current[0])
        requestWalk(0)
      } else {
        let startIdx = activeIdx
        for (let i = activeIdx - 1; i >= 0; i--) { if (flatL[i].progress?.status === 'completed') { startIdx = i; break } }
        mascotIdxRef.current = startIdx
        setMascot(posRef.current[startIdx])
        requestWalk(activeIdx)
      }
      updateTitleOpacity()
    }, 90)
    return () => clearTimeout(id)
  }, [course, requestWalk, measurePositions, updateTitleOpacity])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-8 animate-pulse" aria-hidden>
        <div className="h-8 w-72 max-w-full rounded mb-8" style={{ background: 'var(--inset)' }} />
        <div className="h-40 rounded-2xl" style={{ background: 'var(--inset)' }} />
      </div>
    )
  }
  if (error || !course) {
    return <div className="max-w-6xl mx-auto px-4 pt-12"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
  }

  const flat = course.levels.flatMap(l => l.lessons)
  const nextLesson = flat.find(x => x.progress?.status !== 'completed')
  const doneCount = flat.filter(x => x.progress?.status === 'completed').length

  // Locked-out view: other courses paywall everything non-free; pronunciation
  // only locks once the free attempts are spent, and never locks lessons the
  // user already started or completed (they stay replayable).
  const pronExhausted = pronMode && !entitled && pron != null && pron.remaining <= 0
  const lockedOutUI = pronMode ? pronExhausted : !entitled
  const isLessonLocked = (lesson: Lesson) => pronMode
    ? pronExhausted && !lesson.free && !lesson.progress
    : !lesson.free && !entitled

  const openLesson = (lesson: Lesson) => {
    if (isLessonLocked(lesson)) { router.push('/plans'); return }
    router.push(`/dashboard/courses/lessons/${lesson.id}`)
  }

  // running global index for continuous numbering + serpentine offset
  let g = -1

  return (
    <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="relative z-40 flex items-start justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>
          {locale === 'ja' ? course.title_ja : course.title}
        </h1>
        {course.slug === 'pronunciation' && (
          <button onClick={() => router.push('/dashboard/settings')}
            title={t('設定で変更', 'Change in settings')}
            className="shrink-0 mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
            style={{ background: 'var(--card-inset)', color: 'var(--text-secondary)', border: '1px solid var(--edge)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {accent === 'en-US' ? 'US 🇺🇸' : 'UK 🇬🇧'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* ── Left: about + progress (static). Hidden at the 1-col breakpoint so
            the track gets the full width and its bottom Start card stays on-screen. ── */}
        <SquircleBox cornerRadius={16} className="hidden md:block p-6 md:sticky md:top-12"
          style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {locale === 'ja' ? course.description_ja : course.description}
          </p>
          {course.slug === 'pronunciation' && (
            <button onClick={() => router.push('/dashboard/settings')}
              className="text-xs mt-3 text-left transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}>
              {accent === 'en-US'
                ? t('採点はアメリカ英語です。設定でイギリス英語に変更できます。', 'Graded in American English. Switch to British in Settings.')
                : t('採点はイギリス英語です。設定でアメリカ英語に変更できます。', 'Graded in British English. Switch to American in Settings.')}
            </button>
          )}
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            {t(`${flat.length}レッスン · 完了 ${doneCount}`, `${flat.length} lessons · ${doneCount} completed`)}
          </p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--card-inset)' }}>
            <div className="h-full rounded-full transition-all" style={{ background: 'var(--accent)', width: `${flat.length ? Math.round((doneCount / flat.length) * 100) : 0}%` }} />
          </div>
          {!entitled && (
            <p className="text-xs mt-4 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {pronMode
                ? (pron == null || pron.remaining > 0
                    ? t(`無料レッスン残り${pron?.remaining ?? 3}回`, `${pron?.remaining ?? 3} free lesson${(pron?.remaining ?? 3) === 1 ? '' : 's'} left`)
                    : t('無料レッスンは終了。続きはプランで解放できます。', 'Free lessons used up. A plan unlocks the rest.'))
                : t('レベル1は無料。すべてのレベルはプランか模試パスで。', 'Level 1 is free. Unlock every level with a plan or the Exam Pass.')}
            </p>
          )}
        </SquircleBox>

        {/* ── Right: scrollable serpentine track ──
            Pulled up by the fade height so the title (pinned at top:TOP_FADE)
            lands flush with the info-card top, and the fade zone sits ABOVE it.
            Only at md+ — at the 1-col breakpoint there's no left card to align
            with, so the negative margin would drag the track over the page title.
            (-mt-[64px] must match TOP_FADE; px so the rem bump doesn't change it.) */}
        {/* overflow-hidden: the bottom card animates y:150 (slides down) when it
            hides; without clipping, that translated card grows the document and
            makes the whole dashboard scrollable. Clipping keeps it to the track. */}
        <div className="relative md:-mt-[64px] overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={e => { setShowTop(e.currentTarget.scrollTop > 300); updateCardVisible(selectedIdx); updateTitleOpacity() }}
            className="no-scrollbar relative overflow-y-auto overscroll-contain h-[calc(100vh-140px)] min-h-[480px] pr-1"
          >
            {/* Tube lines through the station centres — one coloured line per
                level. First child + no z-index so it paints behind the
                (positioned) stations/titles. Scrolls with the content. */}
            {trackSegs.length > 0 && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width="100%"
                height={trackH}
                style={{ overflow: 'visible' }}
                aria-hidden
              >
                <defs>
                  {trackSegs.map((s, i) => (
                    s.fadeFrom
                      ? (
                        <linearGradient key={i} id={`tubeline-${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={s.fadeTop} x2="0" y2={(s.fadeTop ?? 0) + 70}>
                          <stop offset="0" stopColor={s.fadeFrom} />
                          <stop offset="1" stopColor="var(--track-line)" />
                        </linearGradient>
                      )
                      : (
                        <linearGradient key={i} id={`tubeline-${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={s.y1} x2="0" y2={s.y2}>
                          <stop offset="0" stopColor={s.c1} />
                          <stop offset="1" stopColor={s.c2} />
                        </linearGradient>
                      )
                  ))}
                </defs>
                {trackSegs.map((s, i) => (
                  <path key={i} d={s.d} fill="none" stroke={s.locked && !s.fadeFrom ? 'var(--track-line)' : `url(#tubeline-${i})`}
                    strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            )}
            {course.levels.map((level, li) => (
              // gap below each level so the pinned title releases after the last
              // node and scrolls up through empty space before the next title
              <div key={level.id} style={{ marginBottom: 72 }}>
                {/* sticky title — pins at the transparent edge of the top fade
                    (crisp while pinned); sits BELOW the fade (z-10) so that when
                    it releases and scrolls up it dissolves in the same zone as
                    the nodes. Its own drop-fade band hides nodes passing under. */}
                <div ref={el => { levelTitleEls.current[li] = el }} className="sticky z-10 pb-8" style={{ top: TOP_FADE, background: 'linear-gradient(var(--dash-bg) 62%, transparent)' }}>
                  <div className="relative w-full px-5 py-3 rounded-2xl text-center"
                    style={{ background: 'var(--panel)', border: `1px solid ${li === currentLevelIdx(course, nextLesson) ? 'var(--accent)' : 'var(--edge)'}`, boxShadow: 'var(--card-shadow)' }}>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--accent)' }}>
                      {t(`レベル ${li + 1}`, `Level ${li + 1}`)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                      {locale === 'ja' ? level.title_ja : level.title}
                    </span>
                    {/* Level 1 is free for everyone; later levels are paywalled, so a
                        locked-out viewer sees a Free tag here and a padlock there. */}
                    {lockedOutUI && !pronMode && li === 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                        {t('無料', 'Free')}
                      </span>
                    )}
                    {lockedOutUI && li > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} aria-label={t('ロック中', 'Locked')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>

                {/* nodes (pt gives the first node + mascot room below the title) */}
                <div className="relative" style={{ paddingTop: 120, paddingBottom: 24 }}>
                  {level.lessons.map((lesson, lessonIdx) => {
                    g += 1
                    const idx = g
                    const offset = Math.round(wave(idx) * AMPLITUDE)
                    const done = lesson.progress?.status === 'completed'
                    const isNext = nextLesson?.id === lesson.id
                    const locked = isLessonLocked(lesson)
                    // node.riv state input: 0 locked, 1 available, 2 active, 3 completed.
                    // `locked` beats `isNext` so the first paywalled lesson reads as
                    // locked (greyed), not as the bright active node.
                    const nodeState = done ? 3 : locked ? 0 : isNext ? 2 : 1
                    // Match the marker to the gradient line at this point: interpolate
                    // the level's [start,end] by the lesson's position in the level.
                    const [lc1, lc2] = LEVEL_COLORS[li % LEVEL_COLORS.length]
                    const len = level.lessons.length
                    const nodeColor = lerpColor(lc1, lc2, len > 1 ? lessonIdx / (len - 1) : 0)
                    // The last station of a level is the interchange to the next line —
                    // give it a half-and-half fill (this level on top, next below).
                    const isJunction = lessonIdx === len - 1 && li < course.levels.length - 1
                    // The interchange half-fill takes the next level's colour, but if
                    // that next level is paywalled (locked-out user) it's greyed too.
                    const nextColor = isJunction ? (lockedOutUI ? 'var(--track-line)' : LEVEL_COLORS[(li + 1) % LEVEL_COLORS.length][0]) : undefined
                    return (
                      <div key={lesson.id} className="relative" style={{ height: ROW_H }}>
                        {/* node */}
                        <div
                          ref={el => {
                            nodeEls.current[idx] = el
                            if (isNext) activeNodeRef.current = el
                          }}
                          className="absolute"
                          style={{ left: `calc(${NODE_CENTER * 100}% + ${offset}px)`, top: '50%', transform: 'translate(-50%,-50%)' }}
                        >
                          <button
                            onClick={() => walkTo(idx)}
                            aria-label={locale === 'ja' ? lesson.title_ja : lesson.title}
                            className="relative flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-[1.08] active:scale-95"
                            style={{ width: NODE, height: NODE }}
                          >
                            <CourseStation size={NODE} state={nodeState} color={nodeColor} color2={nextColor} isReview={lesson.slug.endsWith('-review')} />
                          </button>
                        </div>

                        {/* label to the right of the node */}
                        <button
                          onClick={() => walkTo(idx)}
                          className="absolute text-left max-w-[46%] transition-opacity hover:opacity-75"
                          style={{ left: `calc(${NODE_CENTER * 100}% + ${offset}px + ${NODE / 2 + 16}px)`, top: '50%', transform: 'translateY(-50%)' }}
                        >
                          <p className="text-sm font-semibold leading-snug" style={{ color: isNext || done ? 'var(--text)' : 'var(--text-muted)' }}>
                            {locale === 'ja' ? lesson.title_ja : lesson.title}
                            {pronMode && lesson.free && !entitled && (
                              <span className="ml-1.5 align-middle text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                                {t('無料', 'Free')}
                              </span>
                            )}
                          </p>
                          {done && lesson.score != null && (
                            <span className="block text-xs font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>
                              {lesson.score}/100
                            </span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div style={{ height: 80 }} />

            {/* Teri — walks node-to-node within the scrolling track. Plain CSS
                transform (not framer-motion, not imperative sub-steps): driving
                the transform any other way made the WebGL2 walk-cycle paint
                flaky. One state-driven hop per node, straight line, stays stable. */}
            {mascot && (
              <div
                className="absolute z-[5] pointer-events-none"
                style={{
                  top: 0, left: 0, marginLeft: -78, marginTop: -142,
                  transform: `translate(${mascot.x}px, ${mascot.y}px)`,
                  transition: moving ? 'transform 0.65s ease-in-out' : 'none',
                }}
              >
                <CourseMascot size={155} src={course.slug.startsWith('ielts') ? '/rive/earl.riv' : '/rive/teri.riv'} moving={moving} direction={direction} notice={notice} onReady={onMascotReady} />
              </div>
            )}
          </div>

          {/* top fade sits ABOVE titles + nodes (z-30) and reaches transparent
              exactly at the pin line (TOP_FADE), so a pinned title is crisp but
              anything scrolling up past it — node OR releasing title — dissolves
              in this same zone */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30" style={{ height: TOP_FADE, background: 'linear-gradient(var(--dash-bg), transparent)' }} />
          {/* tall bottom fade so titles/nodes dissolve well before they reach
              the selected-lesson card sitting over the foot of the track */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30" style={{ height: 260, background: 'linear-gradient(transparent, var(--dash-bg) 70%)' }} />

          {/* scroll to top */}
          {showTop && (
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label={t('上に戻る', 'Back to top')}
              className="absolute bottom-4 left-4 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
              style={{ background: 'var(--panel)', border: '1px solid var(--edge)', boxShadow: 'var(--card-shadow)', color: 'var(--text-muted)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
          )}

          {/* Selected-lesson card over the bottom of the track — Start opens the
              lesson; tapping a node only walks Teri there and updates this card */}
          {selectedIdx !== null && flat[selectedIdx] && (() => {
            const lesson = flat[selectedIdx]
            const lockedSel = isLessonLocked(lesson)
            const status = lesson.progress?.status
            const label = lockedSel ? t('プランを見る', 'See Plans')
              : status === 'completed' ? t('もう一度', 'Review')
              : status === 'in_progress' ? t('続ける', 'Resume')
              : t('始める', 'Start')
            return (
              <motion.div
                className="absolute inset-x-3 bottom-10 md:bottom-4 z-40"
                animate={{ y: cardVisible ? 0 : 150, opacity: cardVisible ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                style={{ pointerEvents: cardVisible ? 'auto' : 'none' }}
              >
                <SquircleBox cornerRadius={28} className="px-4 pt-8 pb-4"
                  style={{ background: 'var(--panel)', border: '2px solid var(--hairline)', boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
                  <p className="text-center font-bold mb-5 px-2" style={{ color: 'var(--text)' }}>
                    {lockedSel
                      ? t('続きのレベルを解放しよう', 'Unlock more levels')
                      : (locale === 'ja' ? lesson.title_ja : lesson.title)}
                  </p>
                  <button onClick={() => openLesson(lesson)}
                    className="w-full py-3 rounded-full font-semibold transition-transform duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    {label}
                  </button>
                </SquircleBox>
              </motion.div>
            )
          })()}
        </div>
      </div>

      {/* ── "Need a teacher?" upsell: shows once, on the track, when the free
          attempts are spent and the average score says a human would help ── */}
      {showUpsell && pron && (() => {
        const dismiss = () => {
          setShowUpsell(false)
          if (previewParam) return // preview: close without stamping the flag
          setPron(p => (p ? { ...p, upsellDismissed: true } : p))
          if (session?.access_token) {
            fetch('/api/courses/pron-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ upsell_dismissed: true }),
            }).catch(() => {})
          }
        }
        const go = () => { dismiss(); router.push(pron.trialBooked ? '/plans' : '/dashboard?tab=booking') }
        return (
          <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={dismiss}>
            <div className="modal-card w-full max-w-sm rounded-3xl p-7 text-center" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/profile.png" alt="" className="w-16 h-16 rounded-full mx-auto mb-4 object-cover" style={{ border: '2px solid var(--accent)' }} />
              <p className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
                {t('先生と一緒にやってみませんか？', 'Need a teacher?')}
              </p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                {pron.trialBooked
                  ? t(`ここまでの平均スコアは${pron.avgScore}点。コナー先生のレッスンを増やして、スコアを一緒に伸ばしましょう！`, `Your average so far is ${pron.avgScore}. Book more lessons with Connor for assistance to improve your score!`)
                  : t(`ここまでの平均スコアは${pron.avgScore}点。発音は、本物の先生と練習するのが一番の近道。コナー先生の無料体験レッスンを試してみましょう。`, `Your average so far is ${pron.avgScore}. Pronunciation improves fastest with a real teacher. Try a free trial lesson with Connor.`)}
              </p>
              <button onClick={go}
                className="w-full py-3 rounded-full font-semibold transition-transform duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {pron.trialBooked ? t('プランを見る', 'See plans') : t('体験レッスンを予約', 'Book trial lesson')}
              </button>
              <button onClick={dismiss} className="block w-full mt-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('今はしない', 'Not now')}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// Which level contains the active (next) lesson — used to accent its title.
function currentLevelIdx(course: Course, nextLesson: Lesson | undefined): number {
  if (!nextLesson) return -1
  return course.levels.findIndex(l => l.lessons.some(le => le.id === nextLesson.id))
}
