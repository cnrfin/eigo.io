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

  // Which students are in the classroom pilot (their lessons open in /classroom/[id])
  const userIds = [...new Set((data || []).map((b) => b.user_id))]
  const { data: perms } = userIds.length
    ? await supabase.from('user_permissions').select('user_id, classroom_enabled').in('user_id', userIds)
    : { data: [] as { user_id: string; classroom_enabled: boolean }[] }
  const pilot = new Set((perms || []).filter((p) => p.classroom_enabled).map((p) => p.user_id))

  // Filter to only lessons whose end time hasn't passed (pilot lessons stay
  // until the room closes, 60 min after the end, so the teacher can rejoin)
  const now = new Date()
  const upcoming = (data || [])
    .filter((b) => {
      const lessonEnd = new Date(`${b.date}T${b.start_time}+09:00`)
      lessonEnd.setMinutes(lessonEnd.getMinutes() + (b.duration_minutes || 30) + (pilot.has(b.user_id) ? 60 : 0))
      return lessonEnd > now
    })
    .map((b) => ({ ...b, classroom_enabled: pilot.has(b.user_id) }))

  return NextResponse.json({ lessons: upcoming })
}
