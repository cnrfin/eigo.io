import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/expo-push'

/**
 * GET /api/cron/review-reminders
 *
 * Called every 15 minutes by an external cron service.
 * Checks which users have review_reminders enabled and whose
 * review_reminder_time falls within the current 15-minute window (JST).
 * Sends a push notification to each matching user.
 *
 * Users set their reminder time in JST (Japan Standard Time) since
 * the app targets Japanese learners.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const isAuthorized =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const results = { sent: 0, errors: 0, skipped: 0 }

  try {
    // Get current time in JST (UTC+9)
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const currentHour = nowJST.getUTCHours()
    const currentMinute = nowJST.getUTCMinutes()

    // Build the time slots that fall within this 15-minute window
    // e.g. if it's 09:07 JST, we match 09:00
    // if it's 09:16, we match 09:15
    const windowStart = Math.floor(currentMinute / 15) * 15
    const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(windowStart).padStart(2, '0')}`

    console.log(`[ReviewReminder] Current JST: ${currentHour}:${String(currentMinute).padStart(2, '0')}, matching time slot: ${timeSlot}`)

    // Find users who have review reminders enabled at this time
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, review_reminder_time')
      .eq('push_enabled', true)
      .eq('review_reminders', true)
      .eq('review_reminder_time', timeSlot)

    if (prefsError) {
      console.error('[ReviewReminder] Failed to fetch preferences:', prefsError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    if (!prefs || prefs.length === 0) {
      console.log('[ReviewReminder] No users matched for time slot:', timeSlot)
      return NextResponse.json({ message: 'No reminders to send', timeSlot, ...results })
    }

    console.log(`[ReviewReminder] Found ${prefs.length} user(s) for time slot ${timeSlot}`)

    // Send push notifications to each matching user
    for (const pref of prefs) {
      try {
        // Get push tokens for this user
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', pref.user_id)

        const tokenList = tokens?.map((t) => t.token) || []

        if (tokenList.length === 0) {
          results.skipped++
          continue
        }

        await sendPushToUser(tokenList, {
          title: 'Time to review! 📖',
          body: 'Practice your vocabulary from recent lessons.',
          data: { screen: 'phrases' },
        })

        results.sent++
      } catch (err) {
        console.error(`[ReviewReminder] Failed for user ${pref.user_id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({ message: 'Review reminders processed', timeSlot, ...results })
  } catch (err) {
    console.error('[ReviewReminder] Cron error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
