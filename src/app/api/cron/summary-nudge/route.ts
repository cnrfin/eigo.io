import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/expo-push'

/**
 * GET /api/cron/summary-nudge
 *
 * Called every 15 minutes by an external cron service.
 * Finds completed bookings that are 24+ hours old with no lesson summary
 * and sends a push notification nudging the user to generate one.
 *
 * Only fires once per booking (sets summary_nudge_sent = true).
 * Requires push_enabled in notification_preferences (no specific toggle).
 */
export async function GET(request: NextRequest) {
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const isAuthorized =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()
  const results = { sent: 0, skipped: 0, errors: 0 }

  try {
    // Find confirmed bookings that ended 24+ hours ago and haven't been nudged yet
    // Bookings store date/start_time in JST (Asia/Tokyo)
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, date, start_time, duration_minutes')
      .eq('status', 'confirmed')
      .or('summary_nudge_sent.is.null,summary_nudge_sent.eq.false')

    if (fetchError) {
      console.error('[SummaryNudge] Failed to fetch bookings:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'No bookings to check', ...results })
    }

    // Filter to bookings that ended 24+ hours ago
    const eligibleBookings = bookings.filter((b) => {
      const lessonStart = new Date(`${b.date}T${b.start_time}+09:00`)
      const lessonEnd = new Date(lessonStart.getTime() + (b.duration_minutes || 15) * 60 * 1000)
      return lessonEnd <= cutoff
    })

    if (eligibleBookings.length === 0) {
      return NextResponse.json({ message: 'No eligible bookings', ...results })
    }

    // Check which of these already have summaries
    const bookingIds = eligibleBookings.map((b) => b.id)
    const { data: summaries } = await supabase
      .from('lesson_summaries')
      .select('booking_id')
      .in('booking_id', bookingIds)

    const summarizedIds = new Set((summaries || []).map((s) => s.booking_id))

    // Filter to bookings WITHOUT summaries
    const needsNudge = eligibleBookings.filter((b) => !summarizedIds.has(b.id))

    if (needsNudge.length === 0) {
      return NextResponse.json({ message: 'All eligible bookings have summaries', ...results })
    }

    // Group by user so we send one notification per user (not per booking)
    const byUser = new Map<string, typeof needsNudge>()
    for (const b of needsNudge) {
      const list = byUser.get(b.user_id) || []
      list.push(b)
      byUser.set(b.user_id, list)
    }

    for (const [userId, userBookings] of byUser) {
      try {
        // Check if user has push enabled
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('push_enabled')
          .eq('user_id', userId)
          .single()

        if (!prefs?.push_enabled) {
          results.skipped++
          // Still mark as sent so we don't recheck every cycle
          await supabase
            .from('bookings')
            .update({ summary_nudge_sent: true })
            .in('id', userBookings.map((b) => b.id))
          continue
        }

        // Get push tokens
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', userId)

        const tokenList = tokens?.map((t) => t.token) || []

        if (tokenList.length === 0) {
          results.skipped++
          await supabase
            .from('bookings')
            .update({ summary_nudge_sent: true })
            .in('id', userBookings.map((b) => b.id))
          continue
        }

        // Get language preference
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', userId)
          .single()

        const isJa = profile?.preferred_language !== 'en'
        const count = userBookings.length

        console.log(`[SummaryNudge] Sending to user ${userId} (${count} lesson(s) without summary)`)

        await sendPushToUser(tokenList, {
          title: isJa ? 'レッスンのまとめを見てみよう 📝' : 'Check out your lesson summary! 📝',
          body: isJa
            ? count === 1
              ? 'まだレッスンのまとめが生成されていません。履歴からチェックしましょう！'
              : `${count}件のレッスンのまとめがまだ生成されていません。履歴からチェックしましょう！`
            : count === 1
              ? "You haven't generated your lesson summary yet. Check your history!"
              : `You have ${count} lessons without summaries. Check your history!`,
          data: { screen: 'home' },
        })

        // Mark all these bookings as nudged
        await supabase
          .from('bookings')
          .update({ summary_nudge_sent: true })
          .in('id', userBookings.map((b) => b.id))

        results.sent++
      } catch (err) {
        console.error(`[SummaryNudge] Failed for user ${userId}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({ message: 'Summary nudges processed', ...results })
  } catch (err) {
    console.error('[SummaryNudge] Cron error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
