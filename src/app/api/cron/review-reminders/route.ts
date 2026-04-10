import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/expo-push'

/**
 * GET /api/cron/review-reminders
 *
 * Called every 15 minutes by an external cron service.
 * Fetches all users with review reminders enabled, then checks
 * if the current time in each user's timezone matches their
 * chosen review_reminder_time. Sends a push notification if so.
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
    // Fetch all users with review reminders enabled
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, review_reminder_time, timezone')
      .eq('push_enabled', true)
      .eq('review_reminders', true)

    if (prefsError) {
      console.error('[ReviewReminder] Failed to fetch preferences:', prefsError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    if (!prefs || prefs.length === 0) {
      return NextResponse.json({ message: 'No users with review reminders', ...results })
    }

    const now = new Date()

    // Check each user's local time against their reminder time
    for (const pref of prefs) {
      try {
        const tz = pref.timezone || 'Asia/Tokyo'
        const reminderTime = pref.review_reminder_time || '09:00'

        // Get current time in the user's timezone
        const localTime = now.toLocaleTimeString('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })

        // Round down to nearest 15-minute slot (matching the cron interval)
        const [h, m] = localTime.split(':').map(Number)
        const slotMinute = Math.floor(m / 15) * 15
        const currentSlot = `${String(h).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`

        // Skip if the user's local time doesn't match their reminder time
        if (currentSlot !== reminderTime) continue

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

        console.log(`[ReviewReminder] Sending to user ${pref.user_id} (tz: ${tz}, slot: ${currentSlot})`)

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

    return NextResponse.json({ message: 'Review reminders processed', ...results })
  } catch (err) {
    console.error('[ReviewReminder] Cron error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
