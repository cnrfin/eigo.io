'use client'

import { useEffect, useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { readPendingTrial, clearPendingTrial, type PendingTrial } from '@/lib/lp-funnel'

/* Mounted in the dashboard layout. After a guest picks a trial slot on the
   landing and signs up, they land here as a permanent user; this finalizes the
   stashed booking via /api/calendar/book and shows a confirmation modal once. */
export default function TrialBookingFinalizer() {
  const { user, session, loading } = useAuth()
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const ranRef = useRef(false)
  const [booked, setBooked] = useState<PendingTrial | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (loading || ranRef.current) return
    // Only a permanent, signed-in user can book (needs a real email).
    if (!user || user.is_anonymous || !session?.access_token) return
    const pending = readPendingTrial()
    if (!pending) return
    ranRef.current = true
    clearPendingTrial() // clear up front so a failure can't loop-book

    fetch('/api/calendar/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ date: pending.date, time: pending.time, duration: pending.duration, timezone: pending.timezone }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'failed')
        setBooked(pending)
      })
      .catch(() => setFailed(true))
  }, [loading, user, session?.access_token])

  if (!booked && !failed) return null

  const close = () => { setBooked(null); setFailed(false) }
  const when = booked
    ? new Date(`${booked.date}T${booked.time}:00`).toLocaleString(ja ? 'ja-JP' : 'en-GB', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 modal-backdrop" style={{ background: 'var(--overlay)' }} onClick={close}>
      <Squircle asChild cornerRadius={22} cornerSmoothing={0.8}>
        <div className="modal-card w-full max-w-sm p-7 text-center" style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }} onClick={(e) => e.stopPropagation()}>
          {booked ? (
            <>
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{ja ? '体験レッスンを予約しました' : 'Your trial is booked'}</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{when}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{ja ? '確認メールをお送りしました。' : 'A confirmation email is on its way.'}</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{ja ? '予約を完了できませんでした' : "Couldn't finish the booking"}</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{ja ? 'その時間はもう埋まっているかもしれません。予約ページから選び直してください。' : 'That time may have just filled up. Please pick another from the booking page.'}</p>
            </>
          )}
          <button onClick={close} className="w-full font-semibold mt-5 transition-transform hover:scale-[1.01] active:scale-[0.98]" style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '11px 14px', fontSize: 15 }}>
            {ja ? 'OK' : 'OK'}
          </button>
        </div>
      </Squircle>
    </div>
  )
}
