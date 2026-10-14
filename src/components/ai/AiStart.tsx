'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'
import { AI_LENGTHS, aiMinutesFor } from '@/lib/ai-tutor/settings'
import { newMood } from '@/lib/ai-tutor/avatar-mood'
import type { AiStartState } from '@/lib/ai-tutor/start'
import AiAvatar from './AiAvatar'
import './ai-start.css'

/**
 * "Start now" AI lessons (pilot): the start card used in the dashboard's "Talk to AI tutor" modal and at the
 * top of the booking form when the AI tutor is chosen (design: mockups/ai-start-now.html). Starting creates an
 * instant AI booking (/api/ai-tutor/start) and opens the classroom straight away.
 */

type Locale = 'ja' | 'en'
export type AiProfile = { name: string; color: string | null; blush: boolean }

/** The student's AI tutor name, colour and cheeks (AI tutor settings). */
export function useAiProfile(enabled: boolean): AiProfile {
  const { session } = useAuth()
  const token = session?.access_token
  const [p, setP] = useState<AiProfile>({ name: '', color: null, blush: true })
  useEffect(() => {
    if (!enabled || !token) return
    let alive = true
    fetch('/api/ai-tutor/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.settings
        if (!alive || !s) return
        setP({ name: typeof s.tutorName === 'string' ? s.tutorName.trim() : '', color: typeof s.orbColor === 'string' ? s.orbColor : null, blush: s.blush !== false })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [enabled, token])
  return p
}

/** What the student can start right now (lengths, why not, lesson in progress, course to continue). */
export function useAiStartState(enabled: boolean) {
  const { session } = useAuth()
  const token = session?.access_token
  const [state, setState] = useState<AiStartState | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled || !token) return
    let alive = true
    fetch('/api/ai-tutor/start', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setState(d as AiStartState))
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
  starting: ja ? '準備しています…' : 'Getting ready…',
  back: ja ? 'レッスンに戻る' : 'Back to your lesson',
  live: ja ? 'AIレッスンの途中です。' : 'You have an AI lesson in progress.',
  cost: (c: number, after: number) => (ja ? `プランから${c}分 · 残り${after}分` : `Uses ${c} plan min · ${after} left after`),
  rest: ja ? '今月の残りの分数をすべて使います' : "Uses the rest of this month's minutes",
  teacher: (at: string) => {
    const t = new Date(at).toLocaleTimeString(ja ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    return ja ? `${t}から講師とのレッスンがあります。終わってからご利用ください。` : `You have a lesson with your teacher at ${t}. You can start one after it.`
  },
  minutes: ja ? '今月の分数を使い切りました。' : "You've used this month's minutes.",
  noSub: ja ? 'プランに登録すると、AIレッスンを始められます。' : 'Choose a plan to start AI lessons.',
  plans: ja ? 'プランを見る' : 'View plans',
  failed: ja ? '始められませんでした。もう一度お試しください。' : "Couldn't start. Please try again.",
  schedule: ja ? '日時を決めて予約する' : 'Schedule one instead',
  settings: ja ? 'AIチューターの設定' : 'AI tutor settings',
  close: ja ? '閉じる' : 'Close',
})

/**
 * The start card. With `onDuration` it shows its own 15/30/rest pills (dashboard modal); without, it starts
 * the length chosen elsewhere (the booking form's duration buttons).
 */
export function AiStartCard({
  locale,
  profile,
  state,
  duration,
  onDuration,
  onSchedule,
  compact,
}: {
  locale: Locale
  profile: AiProfile
  state: AiStartState | null
  duration: number
  onDuration?: (d: number) => void
  onSchedule?: () => void
  compact?: boolean
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

  const options = state?.options ?? [...AI_LENGTHS]
  const canStart = !!state && !busy && (!!state.liveId || (!state.blocked && options.includes(duration)))
  const start = async () => {
    if (!canStart || !session) return
    setBusy(true)
    setError(false)
    try {
      const r = await fetch('/api/ai-tutor/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.bookingId) throw new Error(d.error || 'failed')
      router.push(`/classroom/${d.bookingId}`)
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  const charge = aiMinutesFor(duration)
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
            : state.remaining == null
              ? null
              : t.cost(charge, Math.max(0, state.remaining - charge))
  const warn = !!state && (!!state.blocked || !!state.liveId)
  const usesRest = !!state && !state.blocked && !state.liveId && state.remaining != null && !(AI_LENGTHS as readonly number[]).includes(duration)

  return (
    <div className={`ais${compact ? ' ais-compact' : ''}`}>
      <div className="ais-head">
        <div className="ais-av">
          <AiAvatar color={profile.color} blush={profile.blush} mood={mood} />
        </div>
        <div className="min-w-0">
          <div className="ais-title">{t.title(profile.name)}</div>
          <div className="ais-sub">{t.sub}</div>
        </div>
      </div>
      {state && !state.liveId && !state.blocked && <div className="ais-resume">{state.resume ? t.resume(state.resume) : t.freeTalk}</div>}
      <div className="ais-row">
        {onDuration && !state?.liveId && (
          <div className="ais-pills">
            {options.map((d) => (
              <button key={d} type="button" className="ais-pill" style={pillTabStyle(duration === d, th)} onClick={() => onDuration(d)} disabled={!!state?.blocked}>
                {t.min(d)}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="ais-cta" disabled={!canStart} onMouseEnter={smile} onFocus={smile} onClick={() => void start()}>
          {busy ? t.starting : state?.liveId ? t.back : compact ? `${t.start} · ${t.min(duration)}` : t.start}
        </button>
      </div>
      {note && <div className={`ais-note${warn ? ' warn' : ''}`}>{note}</div>}
      {usesRest && <div className="ais-note">{t.rest}</div>}
      {(state?.blocked === 'minutes' || state?.blocked === 'no_subscription') && (
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
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
        <AiStartCard locale={locale} profile={profile} state={state} duration={duration} onDuration={setPicked} onSchedule={onSchedule} />
      </div>
    </div>,
    document.body,
  )
}
