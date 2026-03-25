// Unified notification dispatcher
// Routes notifications to email or LINE depending on user type
//
// Priority:
// 1. If user has a contact_email set → send email to that address
// 2. If user has a real email (not @line.eigo.io) → send email
// 3. If user has a line_user_id → send LINE push message
// 4. Skip (no valid channel)

import {
  sendBookingConfirmationEmail,
  sendCancellationEmail,
  sendRescheduleEmail,
  sendReminderEmail,
} from '@/lib/email'

import {
  sendLineBookingNotification,
  sendLineCancellationNotification,
  sendLineRescheduleNotification,
  sendLineReminderNotification,
} from '@/lib/line-notify'

type UserInfo = {
  email?: string | null           // auth email (may be fake @line.eigo.io)
  contactEmail?: string | null    // real email set by user in settings
  lineUserId?: string | null      // LINE user ID from metadata
  displayName?: string            // for greeting
}

function isRealEmail(email: string | null | undefined): email is string {
  return !!email && !email.endsWith('@line.eigo.io')
}

function getNotificationEmail(user: UserInfo): string | null {
  if (user.contactEmail && isRealEmail(user.contactEmail)) return user.contactEmail
  if (isRealEmail(user.email)) return user.email
  return null
}

// ── Booking ──

export async function notifyBooking({
  user,
  lessonDate,
  lessonTime,
  durationMinutes,
  classroomUrl,
  lessonStartISO,
}: {
  user: UserInfo
  lessonDate: string
  lessonTime: string
  durationMinutes: number
  classroomUrl: string
  lessonStartISO?: string
}) {
  const email = getNotificationEmail(user)
  const studentName = user.displayName || 'Student'

  if (email) {
    return sendBookingConfirmationEmail({
      to: email,
      studentName,
      lessonDate,
      lessonTime,
      durationMinutes,
      classroomUrl,
      lessonStartISO,
    })
  }

  if (user.lineUserId) {
    return sendLineBookingNotification({
      lineUserId: user.lineUserId,
      studentName,
      lessonDate,
      lessonTime,
      durationMinutes,
      classroomUrl,
    })
  }

  console.warn('No notification channel for user:', user.email)
}

// ── Cancellation ──

export async function notifyCancellation({
  user,
  lessonDate,
  lessonTime,
  durationMinutes,
}: {
  user: UserInfo
  lessonDate: string
  lessonTime: string
  durationMinutes: number
}) {
  const email = getNotificationEmail(user)
  const studentName = user.displayName || 'Student'

  if (email) {
    return sendCancellationEmail({
      to: email,
      studentName,
      lessonDate,
      lessonTime,
      durationMinutes,
    })
  }

  if (user.lineUserId) {
    return sendLineCancellationNotification({
      lineUserId: user.lineUserId,
      studentName,
      lessonDate,
      lessonTime,
      durationMinutes,
    })
  }

  console.warn('No notification channel for user:', user.email)
}

// ── Reschedule ──

export async function notifyReschedule({
  user,
  oldLessonDate,
  oldLessonTime,
  newLessonDate,
  newLessonTime,
  durationMinutes,
  classroomUrl,
  newLessonStartISO,
}: {
  user: UserInfo
  oldLessonDate: string
  oldLessonTime: string
  newLessonDate: string
  newLessonTime: string
  durationMinutes: number
  classroomUrl: string
  newLessonStartISO?: string
}) {
  const email = getNotificationEmail(user)
  const studentName = user.displayName || 'Student'

  if (email) {
    return sendRescheduleEmail({
      to: email,
      studentName,
      oldLessonDate,
      oldLessonTime,
      newLessonDate,
      newLessonTime,
      durationMinutes,
      classroomUrl,
      newLessonStartISO,
    })
  }

  if (user.lineUserId) {
    return sendLineRescheduleNotification({
      lineUserId: user.lineUserId,
      studentName,
      oldLessonDate,
      oldLessonTime,
      newLessonDate,
      newLessonTime,
      durationMinutes,
      classroomUrl,
    })
  }

  console.warn('No notification channel for user:', user.email)
}

// ── Reminder ──

export async function notifyReminder({
  user,
  lessonDate,
  lessonTime,
  durationMinutes,
  type,
  classroomUrl,
}: {
  user: UserInfo
  lessonDate: string
  lessonTime: string
  durationMinutes: number
  type: '30min'
  classroomUrl: string
}) {
  const email = getNotificationEmail(user)
  const studentName = user.displayName || 'Student'

  if (email) {
    return sendReminderEmail({
      to: email,
      studentName,
      lessonDate,
      lessonTime,
      durationMinutes,
      type,
      classroomUrl,
    })
  }

  if (user.lineUserId) {
    return sendLineReminderNotification({
      lineUserId: user.lineUserId,
      studentName,
      lessonDate,
      lessonTime,
      durationMinutes,
      type,
      classroomUrl,
    })
  }

  console.warn('No notification channel for user:', user.email)
}
