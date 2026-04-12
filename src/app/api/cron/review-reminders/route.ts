import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/expo-push'

/**
 * GET /api/cron/review-reminders
 *
 * Called every 15 minutes by an external cron service.
 * Fetches all users with review reminders enabled, then checks
 * if the current time in each user's timezone matches their
 * chosen review_reminder_time. Counts due vocabulary phrases
 * and sends a push notification only if there are cards to review.
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
    const nowISO = now.toISOString()

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

        // Count vocabulary cards that are due for review
        const { count: dueCount } = await supabase
          .from('vocabulary_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', pref.user_id)
          .lte('next_review_at', nowISO)

        // Skip if no phrases are due
        if (!dueCount || dueCount === 0) {
          results.skipped++
          continue
        }

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

        // Get user's language preference
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', pref.user_id)
          .single()

        const isJa = profile?.preferred_language !== 'en'

        console.log(`[ReviewReminder] Sending to user ${pref.user_id} (tz: ${tz}, due: ${dueCount})`)

        const phraseWord = isJa ? 'フレーズ' : (dueCount === 1 ? 'phrase' : 'phrases')

        await sendPushToUser(tokenList, {
          title: isJa ? '復習の時間です 📖' : 'Time to review! 📖',
          body: isJa
            ? `${dueCount}件の${phraseWord}が復習待ちです。続けていきましょう！`
            : `You have ${dueCount} ${phraseWord} to review. Let's keep it up!`,
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
