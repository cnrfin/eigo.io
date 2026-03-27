import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { notifyReminder } from '@/lib/notify'

// GET /api/cron/reminders
// Called every ~15 minutes by an external cron service
// Sends a 30-minute lesson reminder
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  // Vercel Cron sends this header automatically; manual calls use Authorization header
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const isAuthorized =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const now = new Date()
  const results = { sent30min: 0, errors: 0 }

  try {
    // Fetch confirmed bookings that need a 30-minute reminder
    // Bookings store date/time in JST
    const { data: bookings, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*, profiles!bookings_user_id_fkey(email, display_name, contact_email)')
      .eq('status', 'confirmed')
      .eq('reminder_30min_sent', false)

    if (fetchError) {
      console.error('Failed to fetch bookings:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'No reminders to send', ...results })
    }

    for (const booking of bookings) {
      // Parse lesson start time in JST
      const lessonStartJST = new Date(`${booking.date}T${booking.start_time}+09:00`)
      const hoursUntil = (lessonStartJST.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Skip if lesson is in the past
      if (hoursUntil < 0) continue

      const email = booking.profiles?.email
      const contactEmail = booking.profiles?.contact_email
      let studentName = booking.profiles?.display_name || ''

      // Get LINE user ID from auth metadata (needed for LINE push notifications)
      // Also use auth metadata full_name as fallback for display name
      let lineUserId: string | null = null
      if (!contactEmail && email?.endsWith('@line.eigo.io')) {
        try {
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(booking.user_id)
          lineUserId = authUser?.user_metadata?.line_user_id || null
          // Use auth metadata full_name if profiles.display_name is empty
          if (!studentName) {
            studentName = authUser?.user_metadata?.full_name || ''
          }
        } catch {
          // ignore — will skip LINE notification
        }
      }

      // Final fallback for non-LINE users
      if (!studentName) {
        studentName = email?.split('@')[0] || 'Student'
      }

      // Skip if we have no way to contact the student
      if (!contactEmail && !email && !lineUserId) continue

      // Format the date for the notification
      const lessonDate = lessonStartJST.toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
      const lessonTime = lessonStartJST.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo',
      })

      try {
        const classroomUrl = booking.whereby_room_url || 'https://eigo.io/dashboard'

        // Send 30-minute reminder (between 15-45 minutes before)
        const minutesUntil = hoursUntil * 60
        if (!booking.reminder_30min_sent && minutesUntil <= 45 && minutesUntil > 5) {
          await notifyReminder({
            user: { email, contactEmail, lineUserId, displayName: studentName },
            lessonDate,
            lessonTime,
            durationMinutes: booking.duration_minutes,
            type: '30min',
            classroomUrl,
          })

          await supabaseAdmin
            .from('bookings')
            .update({ reminder_30min_sent: true })
            .eq('id', booking.id)

          results.sent30min++
        }
      } catch (notifyError) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, notifyError)
        results.errors++
      }
    }

    return NextResponse.json({ message: 'Reminders processed', ...results })
  } catch (err) {
    console.error('Cron reminders error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
