import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

// GET /api/admin/lessons — returns all upcoming lessons for the admin (teacher) view
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = getAdminSupabase()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bookings')
    .select('id, date, start_time, duration_minutes, status, user_id, whereby_room_url, whereby_host_url, profiles!bookings_user_id_fkey(display_name, email)')
    .eq('status', 'confirmed')
    .gte('date', yesterday)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Admin lessons error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter to only lessons whose end time hasn't passed
  const now = new Date()
  const upcoming = (data || []).filter((b) => {
    const lessonEnd = new Date(`${b.date}T${b.start_time}+09:00`)
    lessonEnd.setMinutes(lessonEnd.getMinutes() + (b.duration_minutes || 30))
    return lessonEnd > now
  })

  return NextResponse.json({ lessons: upcoming })
}
