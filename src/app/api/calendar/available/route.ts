import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAvailableSlots } from '@/lib/google-calendar'

// GET /api/calendar/available?date=2026-03-23&duration=30&tz=Asia/Tokyo
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') || '30')
  const timezone = searchParams.get('tz') || 'Asia/Tokyo'

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD format' }, { status: 400 })
  }

  // Don't allow booking in the past (check in user's timezone)
  const now = new Date()
  const userNow = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  if (date < userNow) {
    return NextResponse.json({ date, duration, timezone, slots: [] })
  }

  // Fetch site settings for dynamic hours & booking buffer
  let siteSettings: { time_windows?: { open: number; close: number }[]; booking_buffer_hours?: number } | undefined
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase
      .from('site_settings')
      .select('time_windows, booking_buffer_hours')
      .eq('id', 1)
      .single()
    if (data) siteSettings = data
  } catch {
    // Fall back to defaults if settings fetch fails
  }

  try {
    const slots = await getAvailableSlots(date, duration, timezone, siteSettings)

    return NextResponse.json({
      date,
      duration,
      timezone,
      slots,
    })
  } catch (error) {
    console.error('Failed to fetch available slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}
