import type { SupabaseClient } from '@supabase/supabase-js'
import { bookingWindow } from './booking-window'

type B = { id: string; date: string; start_time: string; duration_minutes: number }

/**
 * Which bookings still belong in "upcoming" lists (student dashboard, admin).
 *
 * Normally a lesson disappears at its booked end. A pilot-classroom lesson
 * that is actually running over (clock started, not ended) stays until the
 * room closes (end + 60 min), so either person can rejoin, but only until
 * the next lesson in the same list opens (10 minutes before its start).
 */
export async function filterUpcoming<T extends B>(
  db: SupabaseClient,
  bookings: T[],
  isPilot: (b: T) => boolean,
  now: Date = new Date(),
): Promise<T[]> {
  const t = now.getTime()
  const overtime = bookings.filter((b) => {
    const w = bookingWindow(b)
    return isPilot(b) && t >= w.end.getTime() && t < w.closesAt.getTime()
  })

  let running = new Set<string>()
  if (overtime.length) {
    const { data } = await db
      .from('classroom_sessions')
      .select('booking_id, started_at, ended_at')
      .in('booking_id', overtime.map((b) => b.id))
    running = new Set((data ?? []).filter((s) => s.started_at && !s.ended_at).map((s) => s.booking_id))
  }

  const nextOpen = (b: T) =>
    bookings.some((o) => {
      if (o.id === b.id) return false
      const w = bookingWindow(o)
      return w.start > bookingWindow(b).start && t >= w.studentOpensAt.getTime()
    })

  return bookings.filter((b) => {
    const w = bookingWindow(b)
    if (t < w.end.getTime()) return true
    return running.has(b.id) && t < w.closesAt.getTime() && !nextOpen(b)
  })
}
