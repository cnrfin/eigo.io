/**
 * Booking times are stored as a Tokyo-local date + time (bookings.date,
 * bookings.start_time) plus duration_minutes, with no timestamp column.
 * Every classroom rule (join window, clock, recording stop, no-show) goes
 * through this one helper so the conversion lives in a single place.
 */

export const STUDENT_EARLY_JOIN_MIN = 10   // students may enter 10 minutes before the start
export const NO_SHOW_AFTER_MIN = 15        // not joined 15 minutes after the start = no-show
export const ROOM_GRACE_AFTER_END_MIN = 60 // Whereby rooms are created to stay open 60 min after the end

export type BookingTimes = {
  date: string            // 'YYYY-MM-DD' (Tokyo)
  start_time: string      // 'HH:MM' or 'HH:MM:SS' (Tokyo)
  duration_minutes: number
}

export type BookingWindow = {
  start: Date
  end: Date
  /** earliest moment a student can enter */
  studentOpensAt: Date
  /** after this the room is gone (Whereby room endDate) */
  closesAt: Date
  /** if the student hasn't joined by now, it's a no-show */
  noShowAt: Date
}

const MIN = 60_000

export function bookingStart(b: Pick<BookingTimes, 'date' | 'start_time'>): Date {
  const time = b.start_time.length === 5 ? `${b.start_time}:00` : b.start_time.slice(0, 8)
  return new Date(`${b.date}T${time}+09:00`)
}

export function bookingWindow(b: BookingTimes): BookingWindow {
  const start = bookingStart(b)
  const end = new Date(start.getTime() + (b.duration_minutes || 30) * MIN)
  return {
    start,
    end,
    studentOpensAt: new Date(start.getTime() - STUDENT_EARLY_JOIN_MIN * MIN),
    closesAt: new Date(end.getTime() + ROOM_GRACE_AFTER_END_MIN * MIN),
    noShowAt: new Date(start.getTime() + NO_SHOW_AFTER_MIN * MIN),
  }
}

/** JSON-friendly version for API responses. */
export function serializeWindow(w: BookingWindow) {
  return {
    start: w.start.toISOString(),
    end: w.end.toISOString(),
    studentOpensAt: w.studentOpensAt.toISOString(),
    closesAt: w.closesAt.toISOString(),
    noShowAt: w.noShowAt.toISOString(),
  }
}
