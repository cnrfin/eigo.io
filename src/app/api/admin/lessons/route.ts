import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { filterUpcoming } from '@/lib/classroom/upcoming'

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

  // Lessons whose end time hasn't passed (a pilot lesson that is running over
  // stays until the room closes or the next lesson opens; see src/lib/classroom/upcoming.ts)
  const upcoming = (await filterUpcoming(supabase, data || [], (b) => pilot.has(b.user_id)))
    .map((b) => ({ ...b, classroom_enabled: pilot.has(b.user_id) }))

  return NextResponse.json({ lessons: upcoming })
}
