import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = getAdminSupabase()

  // Active students (users with at least 1 confirmed booking)
  const { count: activeStudents } = await supabase
    .from('bookings')
    .select('user_id', { count: 'exact', head: true })
    .eq('status', 'confirmed')

  // Upcoming lessons
  const today = new Date().toISOString().split('T')[0]
  const { count: upcomingLessons } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed')
    .gte('date', today)

  // Total lessons completed
  const { count: completedLessons } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('status', ['confirmed', 'completed'])
    .lt('date', today)

  // Total registered users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    activeStudents: activeStudents || 0,
    upcomingLessons: upcomingLessons || 0,
    completedLessons: completedLessons || 0,
    totalUsers: totalUsers || 0,
  })
}
