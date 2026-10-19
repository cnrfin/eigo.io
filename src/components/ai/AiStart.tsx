'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'
import { AI_LENGTHS } from '@/lib/ai-tutor/settings'
import { aiMinutesLeft, splitAiCharge } from '@/lib/minutes-core'
import { newMood } from '@/lib/ai-tutor/avatar-mood'
import type { AiStartState } from '@/lib/ai-tutor/start'
import AiAvatar from './AiAvatar'
import CourseSheet, { type CatalogEntry, type RoleplayChoice } from '@/components/booking/CourseSheet'
import { aiRoleplays } from '@/lib/classroom/client'
import { LEVEL_NAMES, type SceneSummary } from '@/lib/roleplay/types'
import './ai-start.css'

/**
 * "Start now" AI lessons (pilot): the start card used in the dashboard's "Talk to AI tutor" modal and at the
 * top of the booking form when the AI tutor is chosen (design: mockups/ai-start-now.html). Starting creates an
 * instant AI booking (/api/ai-tutor/start) and opens the classroom straight away.
 */

type Locale = 'ja' | 'en'
export type AiProfile = { name: string; color: string | null; blush: boolean; /** loaded or remembered (not the default yet) */ ready?: boolean }

/*
 * Warm cache, so the dashboard button, the avatar's colours and the modal (with the course to continue) show
 * at once instead of loading in:
 *  - the profile and "has AI access" are kept in localStorage per user (right on the next visit too)
 *  - the start state and course list are prefetched when the dashboard loads and kept in memory
 * Every read still revalidates in the background.
 */
const mem: { uid?: string; state?: AiStartState; catalog?: CatalogEntry[]; inflight?: Promise<void> } = {}
const store = {
  get<T>(key: string): T | null {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      return v ? (JSON.parse(v) as T) : null
    } catch {
      return null
    }
  },
  set(key: string, v: unknown) {
    try {
      window.localStorage.setItem(key, JSON.stringify(v))
    } catch {
      /* private mode etc. */
    }
  },
}
const profileKey = (uid: string) => `eigo:aiProfile:${uid}`
const accessKey = (uid: string) => `eigo:aiAccess:${uid}`

/** Last known "this student has the AI tutor" (shown until /api/subscription answers). */
export const cachedAiAccess = (uid: string | undefined) => (uid ? store.get<boolean>(accessKey(uid)) === true : false)
/** Whether this device has a remembered answer at all (first visit: no). */
export const hasCachedAiAccess = (uid: string | undefined) => (uid ? store.get<boolean>(accessKey(uid)) !== null : false)
export const rememberAiAccess = (uid: string | undefined, on: boolean) => uid && store.set(accessKey(uid), on)
/** Keep the cached profile in step when the student changes their AI tutor settings. */
export const rememberAiProfile = (uid: string | undefined, p: AiProfile) => uid && store.set(profileKey(uid), p)

/** /dashboard?welcome=1: admins and test accounts try the welcome call (the server ignores it for anyone else) */
const welcomeTest = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('welcome') === '1'
const startUrl = () => (welcomeTest() ? '/api/ai-tutor/start?welcome=1' : '/api/ai-tutor/start')

/** Fetch the start state and the course list ahead of time (dashboard load, hovering the button). */
export function prefetchAiStart(token: string | undefined, uid: string | undefined): Promise<void> {
  if (!token) return Promise.resolve()
  if (mem.uid !== uid) Object.assign(mem, { uid, state: undefined, catalog: undefined, inflight: undefined })
  if (mem.inflight) return mem.inflight
  const h = { headers: { Authorization: `Bearer ${token}` } }
  mem.inflight = Promise.all([
    fetch(startUrl(), h).then((r) => (r.ok ? r.json() : null)).then((d) => d && (mem.state = d as AiStartState)),
    fetch('/api/slide-courses/catalog', h).then((r) => (r.ok ? r.json() : null)).then((d) => Array.isArray(d?.courses) && (mem.catalog = d.courses)),
  ])
    .catch(() => {})
    .then(() => {
      mem.inflight = undefined
    })
  return mem.inflight
}

/** The student's AI tutor name, colour and cheeks (AI tutor settings). */
export function useAiProfile(enabled: boolean): AiProfile {
  const { session, user } = useAuth()
  const token = session?.access_token
  const uid = user?.id
  // fresh from the server once loaded; until then the last known profile for this student
  const [p, setP] = useState<AiProfile | null>(null)
  const cached = useMemo(() => (uid ? store.get<AiProfile>(profileKey(uid)) : null), [uid])
  useEffect(() => {
    if (!enabled || !token) return
    let alive = true
    fetch('/api/ai-tutor/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.settings
        if (!alive || !s) return
        const next = { name: typeof s.tutorName === 'string' ? s.tutorName.trim() : '', color: typeof s.orbColor === 'string' ? s.orbColor : null, blush: s.blush !== false }
        setP(next)
        rememberAiProfile(uid, next)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [enabled, token, uid])
  return p ? { ...p, ready: true } : cached ? { ...cached, ready: true } : { name: '', color: null, blush: true, ready: false }
}

/** What the student can start right now (lengths, why not, lesson in progress, course to continue). */
export function useAiStartState(enabled: boolean) {
  const { session, user } = useAuth()
  const token = session?.access_token
  const [state, setState] = useState<AiStartState | null>(() => (mem.uid === user?.id ? (mem.state ?? null) : null))
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled || !token) return
    let alive = true
    fetch(startUrl(), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        mem.state = d as AiStartState
        if (alive) setState(d as AiStartState)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [enabled, token, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { state, reload }
}

const tx = (ja: boolean) => ({
  title: (name: string) => (ja ? `${name || 'AIチューター'}と今すぐ話す` : `Talk to ${name || 'your AI tutor'} now`),
  sub: ja ? '予約なしで、すぐに始められます。' : 'No booking needed: start right away.',
  resume: (r: NonNullable<AiStartState['resume']>) => (ja ? `続きから：${r.titleJa} · レッスン${r.lessonNumber}` : `Continues: ${r.title} · Lesson ${r.lessonNumber}`),
  freeTalk: ja ? 'フリートーク（コースはレッスン中に開けます）' : 'Free talk (you can open a course during the lesson)',
  min: (d: number) => (ja ? `${d}分` : `${d} min`),
  start: ja ? '今すぐ始める' : 'Start now',
  trial: ja ? '5分の無料体験' : 'Free 5-minute call',
  trialSub: ja ? 'AIチューターがeigoをご案内します。' : 'Your AI tutor shows you around eigo.',
  starting: ja ? '準備しています…' : 'Getting ready…',
  back: ja ? 'レッスンに戻る' : 'Back to your lesson',
  live: ja ? 'AIレッスンの途中です。' : 'You have an AI lesson in progress.',
  cost: (c: number, after: number) => (ja ? `プランから${c}分 · 残り${after}分` : `Uses ${c} plan min · ${after} left after`),
  aiCost: (c: number, after: number) => (ja ? `AI ${c}分 · 残り${after}分` : `Uses ${c} AI min · ${after} left after`),
  mixCost: (a: number, p: number) => (ja ? `AI ${a}分 + プラン${p}分` : `${a} AI min + ${p} plan min`),
  rest: ja ? '今月の残りの分数をすべて使います' : "Uses the rest of this month's minutes",
  teacher: (at: string) => {
    const t = new Date(at).toLocaleTimeString(ja ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    return ja ? `${t}から講師とのレッスンがあります。終わってからご利用ください。` : `You have a lesson with your teacher at ${t}. You can start one after it.`
  },
  minutes: ja ? '今月の分数を使い切りました。' : "You've used this month's minutes.",
  noSub: ja ? 'プランに登録すると、AIレッスンを始められます。' : 'Choose a plan to start AI lessons.',
  plans: ja ? 'プランを見る' : 'View plans',
  topup: ja ? 'AI分数を追加' : 'Add AI minutes',
  failed: ja ? '始められませんでした。もう一度お試しください。' : "Couldn't start. Please try again.",
  schedule: ja ? '日時を決めて予約する' : 'Schedule one instead',
  settings: ja ? 'AIチューターの設定' : 'AI tutor settings',
  close: ja ? '閉じる' : 'Close',
  welcomeTalk: ja ? '5分のウェルカムトーク' : '5-minute welcome talk',
  pickCourse: ja ? 'コースを選ぶか、空欄のままでフリートーク' : 'Select a course or leave blank for free talk',
  pickAny: ja ? 'コース・ロールプレイを選ぶ' : 'Choose a course or role-play',
  pickAnySub: ja ? '空欄のままならフリートーク' : 'Leave blank for free talk',
  rp: ja ? 'ロールプレイ' : 'Role-play',
  changeRp: ja ? 'ロールプレイを変更' : 'Change role-play',
  removeRp: ja ? 'ロールプレイを外す' : 'Remove role-play',
  lessonN: (n: number) => (ja ? `レッスン${n}` : `Lesson ${n}`),
  changeCourse: ja ? 'コースを変更' : 'Change course',
  removeCourse: ja ? 'コースを外す' : 'Remove course',
})

/** the course picker is open on top of the modal (its Escape closes the picker, not the modal) */
const courseSheetOpen = { current: false }

/**
 * The start card. With `onDuration` it shows its own 15/30/rest pills (dashboard modal); without, it starts
 * the length chosen elsewhere (the booking form's duration buttons).
 */
export function AiStartCard({
  locale,
  profile,
  state,
  duration: chosen,
  onDuration,
  onSchedule,
  compact,
  pickCourse,
}: {
  locale: Locale
  profile: AiProfile
  state: AiStartState | null
  duration: number
  onDuration?: (d: number) => void
  onSchedule?: () => void
  compact?: boolean
  /** dashboard modal: the course block can be changed or cleared (free talk) */
  pickCourse?: boolean
}) {
  const ja = locale === 'ja'
  const t = tx(ja)
  const { theme } = useTheme()
  const th = theme === 'dark' ? 'dark' : 'light'
  const router = useRouter()
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const mood = useRef(newMood())
  const smile = () => {
    mood.current.face = 'happy'
    mood.current.until = performance.now() + 1400
  }

  // course: undefined = carry on where they left off (state.resume), null = free talk, or a chosen course id
  const [choice, setChoice] = useState<string | null | undefined>(undefined)
  const [catalog, setCatalog] = useState<CatalogEntry[]>(() => mem.catalog ?? [])
  const [sheet, setSheet] = useState(false)
  // role-plays (phase 3c): chosen instead of a course; the lesson opens straight into it
  const [rpList, setRpList] = useState<SceneSummary[] | null>(null)
  const [rpPick, setRpPick] = useState<RoleplayChoice | null>(null)
  useEffect(() => {
    if (!pickCourse || !session?.access_token) return
    let alive = true
    void aiRoleplays().then((l) => {
      if (alive) setRpList(l)
    })
    return () => {
      alive = false
    }
  }, [pickCourse, session?.access_token])
  const roleplay = rpPick ? (rpList ?? []).find((x) => x.id === rpPick.sceneId) ?? null : null
  useEffect(() => {
    if (!pickCourse || !session?.access_token) return
    let alive = true
    fetch('/api/slide-courses/catalog', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.courses)) return
        mem.catalog = d.courses
        if (alive) setCatalog(d.courses)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [pickCourse, session?.access_token])
  useEffect(() => {
    courseSheetOpen.current = sheet
  }, [sheet])
  const picked: { id: string; title: string; lesson: number; scene?: string } | null =
    choice === undefined
      ? state?.resume
        ? { id: state.resume.courseId, title: ja ? state.resume.titleJa : state.resume.title, lesson: state.resume.lessonNumber, scene: catalog.find((c) => c.id === state.resume!.courseId)?.scenes[0] }
        : null
      : choice === null
        ? null
        : (() => {
            const c = catalog.find((x) => x.id === choice)
            return c ? { id: c.id, title: ja ? c.titleJa : c.title, lesson: c.next ?? c.lessonCount, scene: c.scenes[0] } : null
          })()

  const options = state?.options ?? [...AI_LENGTHS]
  // the free welcome call is always 5 minutes
  const duration = state?.trial ? state.options[0] : chosen
  const canStart = !!state && !busy && (!!state.liveId || (!state.blocked && options.includes(duration)))
  const start = async () => {
    if (!canStart || !session) return
    setBusy(true)
    setError(false)
    try {
      const r = await fetch('/api/ai-tutor/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(pickCourse && roleplay && rpPick && !state?.trial
            ? { duration, courseId: null, roleplay: rpPick }
            : pickCourse && choice !== undefined
              ? { duration, courseId: choice }
              : { duration }),
          ...(welcomeTest() ? { welcome: true } : {}),
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.bookingId) throw new Error(d.error || 'failed')
      router.push(`/classroom/${d.bookingId}`)
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  // how this length would be paid for: AI minutes first, then plan minutes at 60%
  const parts = state?.minutes && !state.trial ? splitAiCharge(state.minutes, duration) : null
  const fromAi = (parts ?? []).filter((p) => p.pool !== 'plan').reduce((a, p) => a + p.minutes, 0)
  const fromPlan = (parts ?? []).filter((p) => p.pool === 'plan').reduce((a, p) => a + p.minutes, 0)
  const costLine = !state?.minutes || !parts
    ? null
    : fromAi && fromPlan
      ? t.mixCost(fromAi, fromPlan)
      : fromAi
        ? t.aiCost(fromAi, Math.max(0, aiMinutesLeft(state.minutes) - fromAi))
        : t.cost(fromPlan, Math.max(0, state.minutes.planLeft - fromPlan))
  const note = !state
    ? null
    : state.liveId
      ? t.live
      : state.blocked === 'teacher_lesson' && state.teacherAt
        ? t.teacher(state.teacherAt)
        : state.blocked === 'minutes'
          ? t.minutes
          : state.blocked === 'no_subscription'
            ? t.noSub
            : costLine
  const warn = !!state && (!!state.blocked || !!state.liveId)
  const usesRest = !!state && !state.trial && !state.blocked && !state.liveId && !!state.minutes && !(AI_LENGTHS as readonly number[]).includes(duration)

  return (
    <div className={`ais${compact ? ' ais-compact' : ''}`}>
      <div className="ais-head">
        <div className="ais-av">
          <AiAvatar color={profile.color} blush={profile.blush} mood={mood} />
        </div>
        <div className="min-w-0">
          <div className="ais-title">{t.title(profile.name)}</div>
          <div className="ais-sub">{state?.trial ? t.trialSub : t.sub}</div>
        </div>
      </div>
      {pickCourse && !state && <div className="ais-course animate-pulse" style={{ background: 'var(--inset)', borderRadius: 13 }} aria-hidden />}
      {pickCourse && state && !state.liveId && !state.blocked ? (
        state.trial ? (
          <div className="cs-picked ais-course ais-fixed">
            <span className="cs-pmain">
              <span className="cs-plus ais-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z" />
                </svg>
              </span>
              <span className="ais-line">
                <b>{t.welcomeTalk}</b>
              </span>
            </span>
          </div>
        ) : roleplay && rpPick ? (
          <div className="cs-picked ais-course">
            <button type="button" className="cs-pmain" onClick={() => setSheet(true)} aria-label={t.changeRp}>
              {roleplay.image ? <img src={roleplay.image} alt="" /> : <span className="cs-ph" />}
              <span className="ais-line">
                <span className="cs-rpk">{t.rp}</span>
                <b>{roleplay.title[locale]}</b>
                <span> · {LEVEL_NAMES[rpPick.level][locale]}</span>
              </span>
            </button>
            <button type="button" className="cs-x" onClick={() => setRpPick(null)} aria-label={t.removeRp}>
              ✕
            </button>
          </div>
        ) : picked ? (
          <div className="cs-picked ais-course">
            <button type="button" className="cs-pmain" onClick={() => setSheet(true)} aria-label={t.changeCourse}>
              {picked.scene ? <img src={picked.scene} alt="" /> : <span className="cs-ph" />}
              <span className="ais-line">
                <b>{picked.title}</b>
                <span> · {t.lessonN(picked.lesson)}</span>
              </span>
            </button>
            <button type="button" className="cs-x" onClick={() => setChoice(null)} aria-label={t.removeCourse}>
              ✕
            </button>
          </div>
        ) : (
          <button type="button" className="cs-add ais-course" onClick={() => setSheet(true)} disabled={!catalog.length && !rpList?.length}>
            <span className="cs-plus">＋</span>
            {rpList?.length ? (
              <span className="ais-two">
                <b>{t.pickAny}</b>
                <span>{t.pickAnySub}</span>
              </span>
            ) : (
              <span className="ais-line">{t.pickCourse}</span>
            )}
          </button>
        )
      ) : (
        state && !state.liveId && !state.blocked && !state.trial && <div className="ais-resume">{state.resume ? t.resume(state.resume) : t.freeTalk}</div>
      )}
      {sheet && (catalog.length > 0 || !!rpList?.length) && (
        <CourseSheet
          courses={catalog}
          initialId={picked?.id ?? null}
          lang={locale}
          onChoose={(id) => {
            setChoice(id)
            setRpPick(null)
            setSheet(false)
          }}
          onClose={() => setSheet(false)}
          roleplays={rpList}
          initialRoleplay={roleplay ? rpPick : null}
          onChooseRoleplay={(c) => {
            setRpPick(c)
            setChoice(null)
            setSheet(false)
          }}
        />
      )}
      <div className="ais-row">
        {onDuration && !state?.liveId && !state?.trial && (
          <div className="ais-pills">
            {options.map((d) => (
              <button key={d} type="button" className="ais-pill" style={pillTabStyle(duration === d, th)} onClick={() => onDuration(d)} disabled={!!state?.blocked}>
                {t.min(d)}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="ais-cta" disabled={!canStart} onMouseEnter={smile} onFocus={smile} onClick={() => void start()}>
          {busy ? t.starting : state?.liveId ? t.back : state?.trial ? t.trial : compact ? `${t.start} · ${t.min(duration)}` : t.start}
        </button>
      </div>
      {note && <div className={`ais-note${warn ? ' warn' : ''}`}>{note}</div>}
      {usesRest && <div className="ais-note">{t.rest}</div>}
      {state?.blocked === 'minutes' && (
        <a className="ais-link" href="/dashboard/topup">
          {t.topup} →
        </a>
      )}
      {state?.blocked === 'no_subscription' && (
        <a className="ais-link" href="/plans">
          {t.plans} →
        </a>
      )}
      {error && <div className="ais-note warn">{t.failed}</div>}
      {onSchedule && (
        <button type="button" className="ais-link" onClick={onSchedule}>
          {t.schedule} →
        </button>
      )}
    </div>
  )
}

/** The dashboard's "Talk to AI tutor" modal: the start card with AI tutor settings and close in the top right. */
export function AiStartModal({ locale, profile, onClose, onSchedule }: { locale: Locale; profile: AiProfile; onClose: () => void; onSchedule?: () => void }) {
  const ja = locale === 'ja'
  const t = tx(ja)
  const router = useRouter()
  const { state } = useAiStartState(true)
  const [picked, setPicked] = useState<number | null>(null)
  const duration = picked != null && state?.options.includes(picked) ? picked : (state?.options[0] ?? 15)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !courseSheetOpen.current && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="ais-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ais-modal" role="dialog" aria-modal="true" aria-label={t.title(profile.name)}>
        <div className="ais-tr">
          <button type="button" className="ais-ib" aria-label={t.settings} title={t.settings} onClick={() => router.push('/dashboard/settings#ai-tutor')}>
            <svg width="17" height="17" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
              <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
            </svg>
          </button>
          <button type="button" className="ais-ib" aria-label={t.close} onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <AiStartCard locale={locale} profile={profile} state={state} duration={duration} onDuration={setPicked} onSchedule={onSchedule} pickCourse />
      </div>
    </div>,
    document.body,
  )
}
