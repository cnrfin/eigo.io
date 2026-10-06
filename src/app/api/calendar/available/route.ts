import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAvailableSlots, timezoneToJst } from '@/lib/google-calendar'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getUserPermissions } from '@/lib/user-permissions'

/**
 * Test accounts (user_permissions.booking_test_mode) get every 15-minute slot
 * of the day from 15 minutes ago onwards, ignoring opening hours, the booking
 * buffer and the teacher's calendar. Only checked when the request carries the
 * user's token; anonymous requests behave exactly as before.
 */
async function isBookingTester(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const verified = await verifySupabaseToken(auth.slice(7))
  if (!verified.ok) return false
  const perms = await getUserPermissions(getSupabaseAdmin(), verified.user.id)
  return perms.booking_test_mode
}

function allSlotsFromNow(date: string, timezone: string): string[] {
  const earliest = Date.now() - 15 * 60_000
  const out: string[] = []
  for (let m = 0; m < 24 * 60; m += 15) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const { jstDate, jstTime } = timezoneToJst(date, time, timezone)
    if (new Date(`${jstDate}T${jstTime}:00+09:00`).getTime() >= earliest) out.push(time)
  }
  return out
}

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

  try {
    if (await isBookingTester(request)) {
      return NextResponse.json({ date, duration, timezone, slots: allSlotsFromNow(date, timezone), testMode: true })
    }
  } catch (e) {
    console.error('Booking test-mode check failed:', e)
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
