import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
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

  const verified = await verifySupabaseToken(token)
  if (!verified.ok) {
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

  // Look up which of these bookings already have a summary so the UI
  // can show an indicator on lessons that still need one, and pull each
  // summary's key topics so the client can compute "most discussed" stats.
  const bookingIds = pastBookings.map((b) => b.id)
  const summarizedIds = new Set<string>()
  const topicsByBooking = new Map<string, string[]>()
  const phrasesByBooking = new Map<string, string[]>()
  if (bookingIds.length > 0) {
    const [{ data: summaries }, { data: phrases }] = await Promise.all([
      supabase
        .from('lesson_summaries')
        .select('booking_id, key_topics')
        .in('booking_id', bookingIds),
      supabase
        .from('vocabulary_phrases')
        .select('booking_id, phrase_en, translation_ja')
        .in('booking_id', bookingIds),
    ])
    for (const s of (summaries || []) as { booking_id: string; key_topics: string[] | null }[]) {
      summarizedIds.add(s.booking_id)
      if (Array.isArray(s.key_topics) && s.key_topics.length > 0) topicsByBooking.set(s.booking_id, s.key_topics)
    }
    for (const p of (phrases || []) as { booking_id: string; phrase_en: string | null; translation_ja: string | null }[]) {
      const texts = [p.phrase_en, p.translation_ja].filter((t): t is string => !!t)
      if (texts.length > 0) phrasesByBooking.set(p.booking_id, [...(phrasesByBooking.get(p.booking_id) || []), ...texts])
    }
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
    hasSummary: summarizedIds.has(b.id),
    keyTopics: topicsByBooking.get(b.id) || [],
    phrases: phrasesByBooking.get(b.id) || [],
  }))

  return NextResponse.json({ lessons })
}
