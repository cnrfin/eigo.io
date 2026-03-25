import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/calendar/upcoming
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')

  // Create a Supabase client with the user's JWT so RLS policies apply
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch upcoming bookings for this user (RLS ensures they only see their own)
  // Use yesterday's date to catch today's lessons, then filter by end time below
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: bookings, error: dbError } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .gte('date', yesterday)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (dbError) {
    console.error('Failed to fetch bookings:', dbError)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  // Only include lessons whose end time hasn't passed yet
  const now = new Date()
  const upcoming = (bookings || []).filter((b) => {
    const lessonEnd = new Date(`${b.date}T${b.start_time}+09:00`)
    lessonEnd.setMinutes(lessonEnd.getMinutes() + (b.duration_minutes || 30))
    return lessonEnd > now
  })

  const lessons = upcoming.map((b) => ({
    id: b.id,
    date: b.date,
    startTime: b.start_time,
    durationMinutes: b.duration_minutes,
    status: b.status,
    googleEventId: b.google_event_id,
    wherebyRoomUrl: b.whereby_room_url,
    wherebyMeetingId: b.whereby_meeting_id,
  }))

  return NextResponse.json({ lessons })
}
