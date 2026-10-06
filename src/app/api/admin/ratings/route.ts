import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

/**
 * GET /api/admin/ratings  (admin only)
 * Lesson ratings from the classroom's lesson-complete screen. Students can
 * write a rating but never read them back.
 *   { average: number | null, count: number,          ← last 30 days
 *     latest: [{ bookingId, stars, comment, createdAt, lessonDate, student }] }
 * ?userId=… limits everything to one student (admin student page).
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const userId = request.nextUrl.searchParams.get('userId')
  const db = getAdminSupabase()

  const since = new Date(Date.now() - 30 * 86400e3).toISOString()
  let recentQ = db.from('lesson_ratings').select('stars').gte('created_at', since)
  if (userId) recentQ = recentQ.eq('user_id', userId)
  let latestQ = db
    .from('lesson_ratings')
    .select('booking_id, stars, comment, created_at, user_id, profiles(display_name, email), bookings(date, start_time)')
    .order('created_at', { ascending: false })
    .limit(userId ? 100 : 12)
  if (userId) latestQ = latestQ.eq('user_id', userId)
  const [{ data: recent }, { data: latest, error }] = await Promise.all([recentQ, latestQ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stars = (recent ?? []).map((r) => r.stars as number)
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
  return NextResponse.json({
    average: stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 : null,
    count: stars.length,
    latest: (latest ?? []).map((r) => {
      const p = one(r.profiles as unknown as { display_name: string | null; email: string | null } | null)
      const b = one(r.bookings as unknown as { date: string; start_time: string } | null)
      const email = p?.email && !p.email.endsWith('@line.eigo.io') ? p.email : null
      return {
        bookingId: r.booking_id,
        userId: r.user_id,
        stars: r.stars,
        comment: r.comment,
        createdAt: r.created_at,
        lessonDate: b ? `${b.date}T${b.start_time}+09:00` : null,
        student: p?.display_name || email || 'Unknown',
      }
    }),
  })
}
