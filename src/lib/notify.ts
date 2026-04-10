// Unified notification dispatcher
// Routes notifications to all available channels:
//
// 1. Push notification (if user has registered Expo push tokens + preference enabled)
// 2. Email (if user has a real email address)
// 3. LINE push message (if user signed in with LINE)
//
// Push notifications are sent IN ADDITION to email/LINE (not instead of).

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

import { sendPushToUser } from '@/lib/expo-push'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type UserInfo = {
  email?: string | null           // auth email (may be fake @line.eigo.io)
  contactEmail?: string | null    // real email set by user in settings
  lineUserId?: string | null      // LINE user ID from metadata
  displayName?: string            // for greeting
  userId?: string | null          // Supabase user ID (for push token lookup)
}

/**
 * Get push tokens for a user, respecting their notification preferences.
 * Returns empty array if push is disabled or user has no tokens.
 */
async function getUserPushTokens(
  userId: string | null | undefined,
  preferenceKey?: 'lesson_reminders' | 'review_reminders' | 'news_updates' | 'promotional',
): Promise<string[]> {
  if (!userId) return []

  try {
    const supabase = getSupabaseAdmin()

    // Check notification preferences
    if (preferenceKey) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, ' + preferenceKey)
        .eq('user_id', userId)
        .single() as { data: Record<string, boolean> | null }

      // If prefs exist and push is disabled or the specific type is off, skip
      if (prefs && (!prefs.push_enabled || !prefs[preferenceKey])) {
        return []
      }
    }

    // Get all push tokens for this user
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)

    return tokens?.map((t) => t.token) || []
  } catch (err) {
    console.error('[notify] Failed to get push tokens:', err)
    return []
  }
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

  // Send push notification
  const tokens = await getUserPushTokens(user.userId, 'lesson_reminders')
  if (tokens.length > 0) {
    await sendPushToUser(tokens, {
      title: 'Lesson Booked ✅',
      body: `${lessonDate} ${lessonTime} — ${durationMinutes}min lesson confirmed.`,
      data: { screen: 'home' },
    }).catch((err) => console.error('[notify] Push error (booking):', err))
  }

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

  if (tokens.length === 0) {
    console.warn('No notification channel for user:', user.email)
  }
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

  // Send push notification
  const tokens = await getUserPushTokens(user.userId, 'lesson_reminders')
  if (tokens.length > 0) {
    await sendPushToUser(tokens, {
      title: 'Lesson Cancelled',
      body: `Your ${lessonDate} ${lessonTime} lesson has been cancelled.`,
      data: { screen: 'home' },
    }).catch((err) => console.error('[notify] Push error (cancellation):', err))
  }

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

  if (tokens.length === 0) {
    console.warn('No notification channel for user:', user.email)
  }
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

  // Send push notification
  const tokens = await getUserPushTokens(user.userId, 'lesson_reminders')
  if (tokens.length > 0) {
    await sendPushToUser(tokens, {
      title: 'Lesson Rescheduled',
      body: `Moved to ${newLessonDate} ${newLessonTime}.`,
      data: { screen: 'home' },
    }).catch((err) => console.error('[notify] Push error (reschedule):', err))
  }

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

  if (tokens.length === 0) {
    console.warn('No notification channel for user:', user.email)
  }
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

  // Send push notification
  const tokens = await getUserPushTokens(user.userId, 'lesson_reminders')
  if (tokens.length > 0) {
    await sendPushToUser(tokens, {
      title: 'Lesson Starting Soon ⏰',
      body: `Your lesson starts in 30 minutes (${lessonTime}).`,
      data: { screen: 'home' },
    }).catch((err) => console.error('[notify] Push error (reminder):', err))
  }

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

  if (tokens.length === 0) {
    console.warn('No notification channel for user:', user.email)
  }
}
