import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/calendar/history
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

  // Fetch all confirmed/completed bookings, then filter by whether
  // the lesson's end time (start_time + duration) has passed in JST
  const { data: bookings, error: dbError } = await supabase
    .from('bookings')
    .select('*')
    .in('status', ['confirmed', 'completed'])
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(100)

  const now = new Date()

  // Only include lessons whose end time has passed
  const pastBookings = (bookings || []).filter((b) => {
    const lessonEnd = new Date(`${b.date}T${b.start_time}+09:00`)
    lessonEnd.setMinutes(lessonEnd.getMinutes() + (b.duration_minutes || 30))
    return lessonEnd <= now
  }).slice(0, 50)

  if (dbError) {
    console.error('Failed to fetch lesson history:', dbError)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }

  const lessons = pastBookings.map((b) => ({
    id: b.id,
    date: b.date,
    startTime: b.start_time,
    durationMinutes: b.duration_minutes,
    status: b.status,
    googleEventId: b.google_event_id,
    wherebyMeetingId: b.whereby_meeting_id,
    wherebyRoomUrl: b.whereby_room_url,
  }))

  return NextResponse.json({ lessons })
}
