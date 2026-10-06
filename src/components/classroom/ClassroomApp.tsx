'use client'

import { useCallback, useEffect, useState } from 'react'
import { WherebyProvider } from '@whereby.com/browser-sdk/react'
import { useAuth } from '@/context/AuthContext'
import { fetchJoin, type JoinDenied, type JoinInfo } from '@/lib/classroom/client'
import { makeT, type ClassroomLang } from '@/lib/classroom/i18n'
import { ClassroomIcons, Ico } from './Icons'
import Classroom from './Classroom'
import './classroom.css'

/**
 * Entry point for /classroom/[bookingId]: checks sign-in and access, shows the
 * right "not yet / ended / not found" screen, then starts the classroom.
 */

/** Low-power devices get solid panels instead of frosted glass (same rule as the mockup). */
function isLowPower() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (
    (!!nav.deviceMemory && nav.deviceMemory <= 4) ||
    (!!nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
    window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches
  )
}

export function Shell({ lang, children }: { lang: ClassroomLang; children: React.ReactNode }) {
  const [lite] = useState(isLowPower)
  return (
    <div className={`cr${lite ? ' fx-lite' : ''}${lang === 'ja' ? ' jp' : ''}`} lang={lang}>
      <ClassroomIcons />
      {children}
    </div>
  )
}

const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

function Gate({ denied, onRetry }: { denied: JoinDenied; onRetry: () => void }) {
  const lang: ClassroomLang = denied.uiLang ?? 'ja'
  const t = makeT(lang)
  const opensAt = denied.window ? new Date(denied.window.studentOpensAt).getTime() : 0
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (denied.reason !== 'too_early') return
    const id = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (opensAt && n >= opensAt) onRetry()
    }, 1000)
    return () => clearInterval(id)
  }, [denied.reason, opensAt, onRetry])

  const copy: Record<JoinDenied['reason'], [string, string]> = {
    too_early: [t('tooEarlyTitle'), t('tooEarlyBody')],
    ended: [t('endedTitle'), t('endedBody')],
    not_found: [t('notFoundTitle'), t('notFoundBody')],
    cancelled: [t('cancelledTitle'), t('cancelledBody')],
    no_room: [t('noRoomTitle'), t('noRoomBody')],
    signed_out: [t('notFoundTitle'), t('notFoundBody')],
    error: [t('errorTitle'), t('errorBody')],
  }
  const [title, body] = copy[denied.reason] ?? copy.error
  return (
    <Shell lang={lang}>
      <div className="leftScreen on">
        <div className="card">
          <div className="eico">
            <Ico name={denied.reason === 'too_early' ? 'book' : denied.reason === 'ended' ? 'check' : 'leave'} />
          </div>
          <h2>{title}</h2>
          <p>{body}</p>
          {denied.reason === 'too_early' && opensAt > now && (
            <p style={{ marginTop: 10, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {t('opensIn', { time: mmss((opensAt - now) / 1000) })}
            </p>
          )}
          <div className="ebtns">
            {denied.reason === 'error' && (
              <button className="ebtn cta" onClick={onRetry}>
                {t('reload')}
              </button>
            )}
            <a className="ebtn ghost" href="/dashboard">
              {t('backDashboard')}
            </a>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default function ClassroomApp({ bookingId }: { bookingId: string }) {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<{ info?: JoinInfo; denied?: JoinDenied } | null>(null)

  const load = useCallback(async () => {
    const r = await fetchJoin(bookingId)
    setState(r.ok ? { info: r.info } : { denied: r.denied })
  }, [bookingId])

  useEffect(() => {
    if (loading) return
    if (!userId) {
      window.location.href = '/'
      return
    }
    let live = true
    fetchJoin(bookingId).then((r) => {
      if (live) setState(r.ok ? { info: r.info } : { denied: r.denied })
    })
    return () => {
      live = false
    }
  }, [loading, userId, bookingId])

  useEffect(() => {
    if (state?.denied?.reason === 'signed_out') window.location.href = '/'
  }, [state])

  if (!state) {
    return (
      <Shell lang="en">
        <div className="leftScreen on">
          <div className="card">
            <span className="cr-spinner" aria-label="Loading" />
          </div>
        </div>
      </Shell>
    )
  }
  if (state.denied) return <Gate denied={state.denied} onRetry={load} />

  return (
    <Shell lang={state.info!.uiLang}>
      <WherebyProvider>
        <Classroom info={state.info!} />
      </WherebyProvider>
    </Shell>
  )
}
