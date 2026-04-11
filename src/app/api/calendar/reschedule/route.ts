import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createBookingEvent, cancelBookingEvent, timezoneToJst } from '@/lib/google-calendar'
import { createWherebyRoom, deleteWherebyRoom } from '@/lib/whereby'
import { sendAdminRescheduleNotification } from '@/lib/email'
import { notifyReschedule } from '@/lib/notify'
import { createStudentCalendarEvent, deleteStudentCalendarEvent } from '@/lib/student-calendar'

// POST /api/calendar/reschedule
// Body: { oldBookingId, oldGoogleEventId, date, time, duration, timezone }
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  try {
    const body = await request.json()
    const { oldBookingId, oldGoogleEventId, date, time, duration, timezone = 'Asia/Tokyo' } = body

    if (!oldBookingId || !date || !time || !duration) {
      return NextResponse.json(
        { error: 'oldBookingId, date, time, and duration are required' },
        { status: 400 }
      )
    }

    // Authenticate
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

    // Fetch old booking details (for email and Whereby cleanup)
    const { data: oldBooking } = await supabase
      .from('bookings')
      .select('id, date, start_time, duration_minutes, whereby_meeting_id, whereby_room_url, student_gcal_event_id')
      .eq('id', oldBookingId)
      .eq('user_id', user.id)
      .single()

    if (!oldBooking) {
      return NextResponse.json({ error: 'Original booking not found' }, { status: 404 })
    }

    // Convert new time to JST
    const { jstDate, jstTime } = timezoneToJst(date, time, timezone)

    // Create new Whereby room
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
      const studentDisplayName = user.user_metadata?.full_name || (user.email && !user.email.endsWith('@line.eigo.io') ? user.email.split('@')[0] : '') || ''
      wherebyRoomUrl = studentDisplayName
        ? `${room.roomUrl}?displayName=${encodeURIComponent(studentDisplayName)}`
        : room.roomUrl
      wherebyHostUrl = room.hostRoomUrl
    } catch (wherebyError) {
      console.error('Failed to create Whereby room:', wherebyError)
    }

    // Create new Google Calendar event
    const event = await createBookingEvent({
      date,
      time,
      durationMinutes: duration,
      studentEmail: user.email || '',
      studentName: user.user_metadata?.full_name || user.email,
      timezone,
      location: wherebyRoomUrl || undefined,
    })

    // Store new booking in Supabase
    const { data: newBookingRow, error: dbError } = await supabase.from('bookings').insert({
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
      console.error('Failed to store new booking in Supabase:', dbError)
    }

    // Add new event to student's Google Calendar + delete old one
    try {
      // Delete old student calendar event
      if (oldBooking.student_gcal_event_id) {
        await deleteStudentCalendarEvent({ userId: user.id, eventId: oldBooking.student_gcal_event_id })
      }

      // Create new student calendar event
      const startDt = `${jstDate}T${jstTime}:00+09:00`
      const endDt = new Date(new Date(startDt).getTime() + duration * 60 * 1000)
      const studentGcalEventId = await createStudentCalendarEvent({
        userId: user.id,
        title: 'eigo.io English Lesson',
        description: `${duration} minute English lesson with Connor\n\nClassroom: ${wherebyRoomUrl || 'https://eigo.io/dashboard'}`,
        startDateTime: startDt,
        endDateTime: endDt.toISOString(),
        location: wherebyRoomUrl || undefined,
      })

      if (studentGcalEventId && newBookingRow?.id) {
        const supabaseService = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        await supabaseService
          .from('bookings')
          .update({ student_gcal_event_id: studentGcalEventId })
          .eq('id', newBookingRow.id)
      }
    } catch (calErr) {
      console.error('Failed to update student calendar events:', calErr)
    }

    // Cancel old booking
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', oldBookingId)
      .eq('user_id', user.id)

    // Delete old Google Calendar event
    if (oldGoogleEventId) {
      try {
        await cancelBookingEvent(oldGoogleEventId)
      } catch (err) {
        console.error('Failed to delete old Google Calendar event:', err)
      }
    }

    // Delete old Whereby room
    if (oldBooking.whereby_meeting_id) {
      try {
        await deleteWherebyRoom(oldBooking.whereby_meeting_id)
      } catch (err) {
        console.error('Failed to delete old Whereby room:', err)
      }
    }

    // Send reschedule emails
    try {
      const studentName = user.user_metadata?.full_name || user.email || ''
      const studentEmail = user.email || ''
      const classroomUrl = wherebyRoomUrl || 'https://eigo.io/dashboard'

      // Format old lesson date/time
      const oldStartJST = new Date(`${oldBooking.date}T${oldBooking.start_time}+09:00`)
      const oldEmailDate = oldStartJST.toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      })
      const oldEmailTime = oldStartJST.toLocaleTimeString('ja-JP', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
      })

      // Format new lesson date/time
      const newStartJST = new Date(`${jstDate}T${jstTime}+09:00`)
      const newEmailDate = newStartJST.toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      })
      const newEmailTime = newStartJST.toLocaleTimeString('ja-JP', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
      })

      // Fetch contact_email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('contact_email, preferred_language')
        .eq('id', user.id)
        .single()

      // Student reschedule notification (email or LINE)
      const newLessonStartISO = `${jstDate}T${jstTime}+09:00`
      await notifyReschedule({
        user: {
          email: studentEmail,
          contactEmail: profile?.contact_email,
          lineUserId: user.user_metadata?.line_user_id,
          displayName: studentName,
          userId: user.id,
          locale: profile?.preferred_language || 'ja',
        },
        oldLessonDate: oldEmailDate,
        oldLessonTime: oldEmailTime,
        newLessonDate: newEmailDate,
        newLessonTime: newEmailTime,
        durationMinutes: duration,
        classroomUrl,
        newLessonStartISO,
      })

      // Admin reschedule notification
      await sendAdminRescheduleNotification({
        studentName,
        studentEmail,
        oldLessonDate: oldEmailDate,
        oldLessonTime: oldEmailTime,
        newLessonDate: newEmailDate,
        newLessonTime: newEmailTime,
        durationMinutes: duration,
        classroomUrl,
      })
    } catch (emailError) {
      console.error('Failed to send reschedule emails:', emailError)
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
    console.error('Failed to reschedule booking:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule booking' },
      { status: 500 }
    )
  }
}
