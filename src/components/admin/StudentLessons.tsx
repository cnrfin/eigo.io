'use client'

/**
 * Admin, student detail: the student's past lessons, newest first, each with a
 * Missed toggle. Whereby lessons record no attendance and stay "confirmed"
 * whether or not the student came, so this is where a missed one is flagged
 * (POST /api/admin/bookings/[id]/no-show). A missed lesson drops out of the
 * student's speaking time and lesson count and shows as "Missed" in History.
 */
import { useState } from 'react'
import SquircleBox from '@/components/ui/SquircleBox'

export type AdminBooking = { id: string; date: string; start_time: string; duration_minutes: number; status: string }

const PAGE = 8

const startOf = (b: AdminBooking) => new Date(`${b.date}T${b.start_time}+09:00`)

export default function StudentLessons({ bookings, token, onChange }: {
  bookings: AdminBooking[]
  token?: string
  /** a lesson's status changed (after the server agreed) */
  onChange: (id: string, status: string) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const now = new Date()
  const past = bookings
    .filter((b) => ['confirmed', 'completed', 'no_show'].includes(b.status) && startOf(b) <= now)
    .sort((a, b) => +startOf(b) - +startOf(a))
  if (!past.length) return null
  const shown = all ? past : past.slice(0, PAGE)

  const toggle = async (b: AdminBooking) => {
    if (!token || busy) return
    const on = b.status !== 'no_show'
    setBusy(b.id)
    try {
      const res = await fetch(`/api/admin/bookings/${b.id}/no-show`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ on }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not update the lesson')
      onChange(b.id, data.status)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not update the lesson')
    } finally {
      setBusy(null)
    }
  }

  return (
    <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>Lessons ({past.length})</p>
      <div>
        {shown.map((b) => {
          const d = startOf(b)
          const missed = b.status === 'no_show'
          return (
            <div key={b.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: missed ? 'var(--text-muted)' : 'var(--text)' }}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {b.duration_minutes} min · {b.status === 'completed' ? 'Held in the classroom' : missed ? 'Missed' : 'Booked'}
                </p>
              </div>
              <button
                onClick={() => toggle(b)}
                disabled={busy === b.id}
                aria-pressed={missed}
                className="shrink-0 h-8 px-3 rounded-full text-xs font-semibold transition-[transform,opacity] duration-[120ms] ease-out active:scale-95 disabled:opacity-50"
                style={missed
                  ? { background: 'var(--rose-bg)', color: 'var(--rose)' }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--edge)' }}
              >
                {busy === b.id ? '…' : missed ? 'Missed' : 'Mark missed'}
              </button>
            </div>
          )
        })}
      </div>
      {past.length > PAGE && (
        <button onClick={() => setAll((v) => !v)} className="mt-3 text-xs font-medium transition-opacity hover:opacity-80" style={{ color: 'var(--accent)' }}>
          {all ? 'Show fewer' : `Show all ${past.length}`}
        </button>
      )}
    </SquircleBox>
  )
}
