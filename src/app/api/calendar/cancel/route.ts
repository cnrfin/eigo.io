import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cancelBookingEvent } from '@/lib/google-calendar'
import { deleteWherebyRoom } from '@/lib/whereby'
import { sendAdminCancellationNotification } from '@/lib/email'
import { notifyCancellation } from '@/lib/notify'
import { deleteStudentCalendarEvent } from '@/lib/student-calendar'
import { getUserSubscription, recordMinuteUsage } from '@/lib/subscription'

// POST /api/calendar/cancel
// Body: { bookingId: 'uuid', googleEventId: 'string', skipEmail?: boolean }
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  try {
    const body = await request.json()
    const { bookingId, googleEventId, wherebyMeetingId, skipEmail = false, skipAdminEmail = false } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch booking details before cancelling (for email + Whereby cleanup)
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, date, start_time, duration_minutes, whereby_meeting_id, student_gcal_event_id')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    // Cancel in Supabase (RLS ensures user can only cancel their own)
    const { error: dbError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Failed to cancel booking in Supabase:', dbError)
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
    }

    // If this was a trial booking, clear trial state so user can rebook
    if (booking) {
      try {
        const supabaseService = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('trial_booking_id')
          .eq('id', user.id)
          .single()
        if (profile?.trial_booking_id === bookingId) {
          await supabaseService
            .from('profiles')
            .update({ trial_booking_id: null, trial_completed_at: null })
            .eq('id', user.id)
        }
      } catch (trialErr) {
        console.error('Failed to clear trial state:', trialErr)
      }
    }

    // Refund minutes if cancelled >= 15 minutes before lesson start
    if (booking) {
      try {
        const lessonStartJST = new Date(`${booking.date}T${booking.start_time}+09:00`)
        const minutesUntilLesson = (lessonStartJST.getTime() - Date.now()) / (1000 * 60)

        const subscription = await getUserSubscription(user.id)
        if (subscription && minutesUntilLesson >= 15) {
          // Refund minutes — cancelled with enough notice
          await recordMinuteUsage(
            user.id,
            bookingId,
            booking.duration_minutes,
            subscription.current_period_start,
            'cancelled_refund',
          )
        }
        // If < 15 min before lesson: no refund, minutes are spent
      } catch (refundError) {
        console.error('Failed to process minute refund:', refundError)
      }
    }

    // Delete from Google Calendar
    if (googleEventId) {
      try {
        await cancelBookingEvent(googleEventId)
      } catch (err) {
        console.error('Failed to delete Google Calendar event:', err)
      }
    }

    // Delete Whereby room — use passed ID or fall back to the one from the booking record
    const meetingIdToDelete = wherebyMeetingId || booking?.whereby_meeting_id
    if (meetingIdToDelete) {
      try {
        await deleteWherebyRoom(meetingIdToDelete)
      } catch (err) {
        console.error('Failed to delete Whereby room:', err)
      }
    }

    // Delete from student's Google Calendar
    if (booking?.student_gcal_event_id) {
      try {
        await deleteStudentCalendarEvent({ userId: user.id, eventId: booking.student_gcal_event_id })
      } catch (err) {
        console.error('Failed to delete student calendar event:', err)
      }
    }

    // Send cancellation notification (skip if this is part of a reschedule — the reschedule notification handles it)
    if (!skipEmail && booking) {
      try {
        const studentName = user.user_metadata?.full_name || user.email || ''
        const lessonStartJST = new Date(`${booking.date}T${booking.start_time}+09:00`)
        const emailDate = lessonStartJST.toLocaleDateString('ja-JP', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
        })
        const emailTime = lessonStartJST.toLocaleTimeString('ja-JP', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
        })

        // Fetch contact_email from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('id', user.id)
          .single()

        await notifyCancellation({
          user: {
            email: user.email,
            contactEmail: profile?.contact_email,
            lineUserId: user.user_metadata?.line_user_id,
            displayName: studentName,
          },
          lessonDate: emailDate,
          lessonTime: emailTime,
          durationMinutes: booking.duration_minutes,
        })

        if (!skipAdminEmail) {
          await sendAdminCancellationNotification({
            studentName,
            studentEmail: user.email || '',
            lessonDate: emailDate,
            lessonTime: emailTime,
            durationMinutes: booking.duration_minutes,
          })
        }
      } catch (emailErr) {
        console.error('Failed to send cancellation notification:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to cancel booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}
