import { isAdminEmail } from '@/lib/admin-redirect'
import { bookingWindow, type BookingTimes, type BookingWindow } from './booking-window'

/**
 * Who may enter /classroom/[bookingId], and when.
 *
 *  - Admin (the teacher): any time, any booking that isn't cancelled.
 *  - Student (booking owner): from 10 minutes before the start until the room
 *    closes (60 min after the booked end), unless the teacher has already
 *    ended the lesson for everyone. A booking marked no_show still lets the
 *    student in: arriving late undoes the no-show.
 *  - Anyone else: never.
 *
 * Pure function: the caller loads the booking and session and passes them in,
 * so this is easy to unit-test and to reuse in every classroom route.
 */

export type ClassroomRole = 'teacher' | 'student'

export type DenyReason =
  | 'not_found'      // no booking, or not yours
  | 'cancelled'
  | 'too_early'      // student, more than 10 min before the start
  | 'ended'          // teacher ended the lesson, or the room has closed

export type AccessResult =
  | { allowed: true; role: ClassroomRole; window: BookingWindow }
  | { allowed: false; reason: DenyReason; window?: BookingWindow }

export type AccessBooking = BookingTimes & {
  user_id: string
  status: string
}

export type AccessSession = { ended_at: string | null } | null

export function classroomAccess(
  user: { id: string; email: string | null },
  booking: AccessBooking | null,
  session: AccessSession,
  now: Date = new Date(),
): AccessResult {
  if (!booking) return { allowed: false, reason: 'not_found' }

  const isAdmin = isAdminEmail(user.email)
  const isOwner = booking.user_id === user.id
  if (!isAdmin && !isOwner) return { allowed: false, reason: 'not_found' }

  const window = bookingWindow(booking)
  if (booking.status === 'cancelled') return { allowed: false, reason: 'cancelled', window }

  if (isAdmin) return { allowed: true, role: 'teacher', window }

  if (session?.ended_at) return { allowed: false, reason: 'ended', window }
  if (now < window.studentOpensAt) return { allowed: false, reason: 'too_early', window }
  if (now > window.closesAt) return { allowed: false, reason: 'ended', window }
  return { allowed: true, role: 'student', window }
}
