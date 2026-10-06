import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/no-show   { on: boolean }
 * Teacher only. on = true marks the booking as a no-show (the student never
 * joined within 15 minutes of the start); on = false undoes it. A student who
 * joins later also undoes it (event 'student_joined').
 * Minutes were deducted at booking time and a no-show doesn't refund them, so
 * minute_usage isn't touched.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking, access, session } = ctx
  if (access.role !== 'teacher') return json(403, { error: 'Teacher only' })

  let on = true
  try {
    on = (await request.json()).on !== false
  } catch {
    /* default: mark */
  }

  const db = getSupabaseAdmin()
  if (on) {
    if (session?.student_joined_at) return json(409, { error: 'The student has joined' })
    if (new Date() < access.window.noShowAt) return json(409, { error: 'Too early' })
    await db.from('bookings').update({ status: 'no_show' }).eq('id', booking.id).eq('status', 'confirmed')
  } else {
    await db.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id).eq('status', 'no_show')
  }
  return json(200, { ok: true, status: on ? 'no_show' : 'confirmed' })
}
