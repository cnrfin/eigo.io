'use client'

import { useEffect, useMemo, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import { useLanguage } from '@/context/LanguageContext'
import type { PendingTrial } from '@/lib/lp-funnel'

/* Compact 15-min trial slot picker for the v2 landing. It only CAPTURES a slot
   (using the public /api/calendar/available endpoint) — the booking is finalized
   after sign-up, since it needs the student's real email. On confirm it hands
   the chosen slot up; the parent stashes it and opens the sign-up gate. */

const DAYS_AHEAD = 14
const TRIAL_DURATION = 15

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TrialBookingModal({ onClose, onPicked }: { onClose: () => void; onPicked: (slot: PendingTrial) => void }) {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const shortTz = useMemo(() => {
    try {
      return new Date().toLocaleTimeString('en-US', { timeZone: timezone, timeZoneName: 'short' }).split(' ').pop() || timezone
    } catch {
      return timezone
    }
  }, [timezone])

  const days = useMemo(() => {
    const out: Date[] = []
    const base = new Date()
    for (let i = 0; i < DAYS_AHEAD; i++) out.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
    return out
  }, [])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState<string | null>(null)

  // lock the page behind the modal so scrolling stays inside it. The v3 landing
  // scrolls the <html> element, so we pin the body in place (position:fixed keeps
  // the scroll position and reliably stops both the window and html from moving).
  useEffect(() => {
    const y = window.scrollY
    const body = document.body
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, y)
    }
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setLoading(true)
    setSlots([])
    setTime(null)
    fetch(`/api/calendar/available?date=${selectedDate}&duration=${TRIAL_DURATION}&tz=${encodeURIComponent(timezone)}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [selectedDate, timezone])

  const dayLabel = (d: Date) =>
    d.toLocaleDateString(ja ? 'ja-JP' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-backdrop" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <Squircle asChild cornerRadius={22} cornerSmoothing={0.8}>
        <div data-lenis-prevent className="modal-card w-full max-w-lg p-6 sm:p-7" style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{ja ? '無料体験を予約' : 'Book your free trial'}</h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>{ja ? 'ご希望の日時を選んでください。' : 'Pick a day and time.'}</p>
            </div>
            <button onClick={onClose} aria-label={ja ? '閉じる' : 'Close'} className="shrink-0 -mr-1 -mt-1 p-1 transition-opacity hover:opacity-60" style={{ color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          </div>

          {/* Day strip */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {days.map((d) => {
              const key = ymd(d)
              const active = key === selectedDate
              return (
                <Squircle key={key} asChild cornerRadius={10} cornerSmoothing={0.8}>
                  <button
                    onClick={() => setSelectedDate(key)}
                    className="shrink-0 px-3.5 py-2 text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: active ? 'var(--accent)' : 'var(--card-inset)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {dayLabel(d)}
                  </button>
                </Squircle>
              )
            })}
          </div>

          {/* Slots */}
          <div className="mt-4 min-h-[7rem]">
            {!selectedDate ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-subtle)' }}>{ja ? '上から日付を選んでください' : 'Select a day above'}</p>
            ) : loading ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>{ja ? '読み込み中…' : 'Loading…'}</p>
            ) : slots.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-subtle)' }}>{ja ? '予約可能な時間がありません' : 'No available times'}</p>
            ) : (
              <>
                <p className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>{shortTz}</p>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto overscroll-contain pr-1">
                  {slots.map((s) => {
                    const active = s === time
                    return (
                      <Squircle key={s} asChild cornerRadius={8} cornerSmoothing={0.8}>
                        <button
                          onClick={() => setTime(s)}
                          className="px-2 py-2 text-sm transition-transform hover:scale-[1.02] active:scale-[0.97]"
                          style={{
                            background: active ? 'var(--accent)' : 'var(--card-inset)',
                            color: active ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          {s}
                        </button>
                      </Squircle>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => { if (selectedDate && time) onPicked({ date: selectedDate, time, duration: TRIAL_DURATION, timezone }) }}
            disabled={!selectedDate || !time}
            className="w-full font-semibold mt-5 transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 15 }}
          >
            {ja ? '次へ' : 'Continue'}
          </button>
        </div>
      </Squircle>
    </div>
  )
}
