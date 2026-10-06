'use client'

import { useEffect, useState } from 'react'
import SquircleBox from '@/components/ui/SquircleBox'

/**
 * Admin-only: lesson ratings from the classroom (GET /api/admin/ratings).
 * Overview: average and count for the last 30 days, then the latest ratings.
 * With userId (admin student page): that student's ratings only.
 */

type Rating = {
  bookingId: string
  userId: string
  stars: number
  comment: string | null
  createdAt: string
  lessonDate: string | null
  student: string
}
type Data = { average: number | null; count: number; latest: Rating[] }

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span aria-label={`${n} / 5`} style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
            fill={i <= n ? 'var(--accent)' : 'var(--surface-hover)'}
          />
        </svg>
      ))}
    </span>
  )
}

export default function RatingsCard({ token, userId }: { token: string | undefined; userId?: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!token) return
    let alive = true
    fetch(`/api/admin/ratings${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => alive && setData(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [token, userId])

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Tokyo' })

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Lesson ratings
        </h2>
        {data && data.average !== null && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <b style={{ color: 'var(--text)' }}>{data.average.toFixed(1)}</b> average · {data.count} in the last 30 days
          </span>
        )}
      </div>
      {failed ? (
        <p style={{ color: 'var(--text-muted)' }}>Could not load ratings</p>
      ) : !data ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : data.latest.length === 0 ? (
        <SquircleBox cornerRadius={12} className="p-6 text-center" style={{ background: 'var(--surface)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No ratings yet</p>
        </SquircleBox>
      ) : (
        <div className="space-y-2">
          {data.latest.map((r) => (
            <SquircleBox key={r.bookingId} cornerRadius={12} className="px-5 py-3" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <Stars n={r.stars} />
                {!userId && (
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {r.student}
                  </span>
                )}
                <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                  {fmt(r.lessonDate ?? r.createdAt)}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {r.comment}
                </p>
              )}
            </SquircleBox>
          ))}
        </div>
      )}
    </div>
  )
}
