import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getUserPermissions } from '@/lib/user-permissions'
import { isAdminEmail } from '@/lib/admin-redirect'
import { lessonQueue, loadCatalog } from '@/lib/classroom/catalog'

/**
 * GET /api/slide-courses/catalog
 * Published courses for the booking course picker, with the caller's progress:
 *   { courses: [{ id, title, titleJa, description, descriptionJa, level, series,
 *                 chips, scenes, lessonCount, doneCount, queue: [lessonNumber…] }] }
 * `queue` lists the 1-based lesson numbers the student can still book, in
 * order (not completed and not already booked). Pilot users only
 * (user_permissions.classroom_enabled) and the admin; everyone else gets [].
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const v = await verifySupabaseToken(auth.slice(7))
  if (!v.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = v.user

  const perms = await getUserPermissions(getSupabaseAdmin(), user.id)
  if (!perms.classroom_enabled && !isAdminEmail(user.email)) return NextResponse.json({ courses: [] })

  const catalog = await loadCatalog()
  const courses = await Promise.all(
    catalog.map(async (c) => {
      const { doneCount, queue } = await lessonQueue(user.id, c.id, c.lessonIds)
      const { lessonIds, ...rest } = c
      return { ...rest, lessonCount: lessonIds.length, doneCount, queue: queue.map((id) => lessonIds.indexOf(id) + 1) }
    }),
  )
  return NextResponse.json({ courses }, { headers: { 'Cache-Control': 'private, no-store' } })
}
