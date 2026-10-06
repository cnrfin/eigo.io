import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ensureSession, json, loadClassroom, publicSession } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/event   { type }
 *
 *   student_joined     student entered the room (first time is kept; also undoes a no-show)
 *   start              both people are in: start the lesson clock (first call wins)
 *   recording_stopped  teacher's client stopped the cloud recording at the booked end
 *   end                teacher ended the lesson for everyone → booking completed
 *
 * Returns the session, so every client agrees on the clock.
 */
type EventType = 'student_joined' | 'start' | 'recording_stopped' | 'end'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking, access } = ctx

  let type: EventType
  try {
    type = (await request.json()).type
  } catch {
    return json(400, { error: 'Invalid body' })
  }

  const db = getSupabaseAdmin()
  const now = new Date().toISOString()
  await ensureSession(booking.id)
  const sessions = () => db.from('classroom_sessions')

  switch (type) {
    case 'student_joined':
      if (access.role !== 'student') break
      await sessions().update({ student_joined_at: now, updated_at: now }).eq('booking_id', booking.id).is('student_joined_at', null)
      if (booking.status === 'no_show') await db.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id)
      break
    case 'start':
      await sessions().update({ started_at: now, updated_at: now }).eq('booking_id', booking.id).is('started_at', null)
      break
    case 'recording_stopped':
      if (access.role !== 'teacher') return json(403, { error: 'Teacher only' })
      await sessions().update({ recording_stopped_at: now, updated_at: now }).eq('booking_id', booking.id)
      break
    case 'end':
      if (access.role !== 'teacher') return json(403, { error: 'Teacher only' })
      await sessions().update({ ended_at: now, updated_at: now }).eq('booking_id', booking.id).is('ended_at', null)
      await db.from('bookings').update({ status: 'completed' }).eq('id', booking.id).in('status', ['confirmed', 'no_show'])
      break
    default:
      return json(400, { error: 'Unknown event' })
  }

  const { data } = await sessions()
    .select('booking_id, student_joined_at, started_at, ended_at, recording_stopped_at')
    .eq('booking_id', booking.id)
    .maybeSingle()
  return json(200, { session: publicSession(data), serverNow: now })
}
