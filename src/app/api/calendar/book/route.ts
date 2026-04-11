import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createBookingEvent, getAvailableSlots, timezoneToJst } from '@/lib/google-calendar'
import { createWherebyRoom } from '@/lib/whereby'
import { sendAdminBookingNotification } from '@/lib/email'
import { notifyBooking } from '@/lib/notify'
import { createStudentCalendarEvent } from '@/lib/student-calendar'
import { getUserSubscription, hasEnoughMinutes, recordMinuteUsage } from '@/lib/subscription'

// POST /api/calendar/book
// Body: { date: '2026-03-23', time: '17:00', duration: 30, timezone: 'Europe/London' }
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  try {
    const body = await request.json()
    const { date, time, duration, timezone = 'Asia/Tokyo', skipAdminEmail = false } = body

    if (!date || !time || !duration) {
      return NextResponse.json(
        { error: 'date, time, and duration are required' },
        { status: 400 }
      )
    }

    // Authenticate user via Supabase using the anon key + user's JWT
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

    // Check subscription & minute balance (skip for trial lessons — 15 min with no subscription)
    const subscription = await getUserSubscription(user.id)
    const isTrial = duration === 15 && !subscription

    if (!isTrial) {
      if (!subscription || subscription.status === 'cancelled') {
        return NextResponse.json(
          { error: 'No active subscription. Please subscribe first.', code: 'NO_SUBSCRIPTION' },
          { status: 403 },
        )
      }

      const minuteCheck = await hasEnoughMinutes(user.id, duration)
      if (!minuteCheck.allowed) {
        return NextResponse.json(
          {
            error: `Not enough minutes remaining. You have ${minuteCheck.remaining} minutes left but need ${minuteCheck.needed}.`,
            code: 'INSUFFICIENT_MINUTES',
            remaining: minuteCheck.remaining,
            needed: minuteCheck.needed,
          },
          { status: 403 },
        )
      }
    }

    // Verify the slot is still available (in the user's timezone)
    const availableSlots = await getAvailableSlots(date, duration, timezone)
    if (!availableSlots.includes(time)) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    // Convert to JST first so we can calculate Whereby room expiry
    const { jstDate, jstTime } = timezoneToJst(date, time, timezone)

    // Create a unique Whereby room for this lesson
    // Room expires 1 hour after lesson end
    const lessonEndJST = new Date(`${jstDate}T${jstTime}+09:00`)
    lessonEndJST.setMinutes(lessonEndJST.getMinutes() + duration + 60)

    let wherebyMeetingId = null
    let wherebyRoomUrl = null
    let wherebyHostUrl = null

    try {
      const room = await createWherebyRoom({
        endDate: lessonEndJST.toISOString(),
        roomNamePrefix: 'eigo',
        recording: true,
      })
      wherebyMeetingId = room.meetingId
      // Append student display name so it shows in the Whereby room
      const studentDisplayName = user.user_metadata?.full_name || (user.email && !user.email.endsWith('@line.eigo.io') ? user.email.split('@')[0] : '') || ''
      wherebyRoomUrl = studentDisplayName
        ? `${room.roomUrl}?displayName=${encodeURIComponent(studentDisplayName)}`
        : room.roomUrl
      wherebyHostUrl = room.hostRoomUrl
    } catch (wherebyError) {
      console.error('Failed to create Whereby room:', wherebyError)
      // Continue booking even if Whereby fails — lesson can still happen
    }

    // Create Google Calendar event with Whereby room as location
    const event = await createBookingEvent({
      date,
      time,
      durationMinutes: duration,
      studentEmail: user.email || '',
      studentName: user.user_metadata?.full_name || user.email,
      timezone,
      location: wherebyRoomUrl || undefined,
    })

    // Store booking in Supabase
    const { data: bookingRow, error: dbError } = await supabase.from('bookings').insert({
      user_id: user.id,
      date: jstDate,
      start_time: jstTime,
      duration_minutes: duration,
      google_event_id: event.id,
      whereby_meeting_id: wherebyMeetingId,
      whereby_room_url: wherebyRoomUrl,
      whereby_host_url: wherebyHostUrl,
      status: 'confirmed',
    }).select('id').single()

    if (dbError) {
      console.error('Failed to store booking in Supabase:', dbError)
    }

    // Record minute usage (skip for free trial lessons)
    if (!isTrial && bookingRow?.id && subscription) {
      try {
        await recordMinuteUsage(
          user.id,
          bookingRow.id,
          duration,
          subscription.current_period_start,
          'booked',
        )
      } catch (usageError) {
        console.error('Failed to record minute usage:', usageError)
        // Don't fail the booking if usage recording fails
      }
    }

    // Mark trial lesson if this is a 15-min trial
    // Set trial_completed_at to the lesson end time so the 48h discount window
    // starts automatically when the lesson finishes (no cron needed)
    if (isTrial && bookingRow?.id) {
      const lessonEnd = new Date(`${jstDate}T${jstTime}:00+09:00`)
      lessonEnd.setMinutes(lessonEnd.getMinutes() + duration)
      const supabaseService = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await supabaseService
        .from('profiles')
        .update({
          trial_booking_id: bookingRow.id,
          trial_completed_at: lessonEnd.toISOString(),
        })
        .eq('id', user.id)
    }

    // Add to student's Google Calendar (non-blocking)
    try {
      const startDateTime = `${jstDate}T${jstTime}:00+09:00`
      const endDt = new Date(new Date(startDateTime).getTime() + duration * 60 * 1000)
      const studentGcalEventId = await createStudentCalendarEvent({
        userId: user.id,
        title: 'eigo.io English Lesson',
        description: `${duration} minute English lesson with Connor\n\nClassroom: ${wherebyRoomUrl || 'https://eigo.io/dashboard'}`,
        startDateTime,
        endDateTime: endDt.toISOString(),
        location: wherebyRoomUrl || undefined,
      })

      // Store the student's calendar event ID so we can delete it on cancel
      if (studentGcalEventId && bookingRow?.id) {
        const supabaseService = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        await supabaseService
          .from('bookings')
          .update({ student_gcal_event_id: studentGcalEventId })
          .eq('id', bookingRow.id)
      }
    } catch (calErr) {
      console.error('Failed to create student calendar event:', calErr)
    }

    // Send booking confirmation notifications (email or LINE)
    try {
      const studentName = user.user_metadata?.full_name || user.email
      const studentEmail = user.email || ''
      const classroomUrl = wherebyRoomUrl || 'https://eigo.io/dashboard'

      // Fetch contact_email and language from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('contact_email, preferred_language')
        .eq('id', user.id)
        .single()

      // Format date/time for notification (using JST)
      const lessonStartJST = new Date(`${jstDate}T${jstTime}+09:00`)
      const emailDate = lessonStartJST.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
      const emailTime = lessonStartJST.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo',
      })

      // Send student notification via email or LINE
      const lessonStartISO = `${jstDate}T${jstTime}+09:00`
      await notifyBooking({
        user: {
          email: studentEmail,
          contactEmail: profile?.contact_email,
          lineUserId: user.user_metadata?.line_user_id,
          displayName: studentName,
          userId: user.id,
          locale: profile?.preferred_language || 'ja',
        },
        lessonDate: emailDate,
        lessonTime: emailTime,
        durationMinutes: duration,
        classroomUrl,
        lessonStartISO,
      })

      // Send admin notification (skipped for multi-booking — batch email sent separately)
      if (!skipAdminEmail) {
        await sendAdminBookingNotification({
          studentName,
          studentEmail,
          lessonDate: emailDate,
          lessonTime: emailTime,
          durationMinutes: duration,
          classroomUrl,
        })
      }
    } catch (emailError) {
      console.error('Failed to send booking notifications:', emailError)
      // Don't fail the booking if notifications fail
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: event.id,
        date,
        time,
        duration,
        timezone,
        status: 'confirmed',
        wherebyRoomUrl,
      },
    })
  } catch (error) {
    console.error('Failed to create booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
