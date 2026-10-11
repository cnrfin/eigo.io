import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ensureSession, json, loadClassroom } from '@/lib/classroom/server'
import { buildSessionBrief } from '@/lib/ai-tutor/brief'
import { createLiveSession, endLiveSession } from '@/lib/ai-tutor/openai'

/**
 * POST /api/classroom/[id]/ai-session   { sdp }  → { sessionId, sdp, endsAt }
 *
 * Starts the AI tutor for an AI lesson. Our server creates the GPT-Live session
 * (the API key and the tutor's instructions never reach the browser) and
 * returns only the WebRTC answer. Rules (anti-gaming):
 *  - only the booking's owner, only for lesson_kind = 'ai'
 *  - only from 2 minutes before the start until the booked end
 *  - one live session per booking: an older one is ended first (reconnects
 *    replace, never add, time)
 * The cron /api/cron/ai-tutor-sweep hangs every session up at the booked end.
 */
const EARLY_MS = 2 * 60_000
const MIN_LEFT_MS = 45_000

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking, access, session } = ctx
  if (booking.lesson_kind !== 'ai') return json(400, { reason: 'not_ai' })
  if (booking.user_id !== ctx.user.id) return json(403, { reason: 'not_owner' })
  if (session?.ended_at) return json(403, { reason: 'ended' })

  const now = Date.now()
  const start = access.window.start.getTime()
  const end = access.window.end.getTime()
  if (now < start - EARLY_MS) return json(403, { reason: 'too_early', startsAt: access.window.start.toISOString() })
  if (now > end - MIN_LEFT_MS) return json(403, { reason: 'ended' })

  let sdp = ''
  try {
    sdp = String((await request.json()).sdp ?? '')
  } catch {
    /* handled below */
  }
  if (!sdp.trim() || sdp.length > 20_000) return json(400, { reason: 'bad_offer' })

  const db = getSupabaseAdmin()

  // One live session per booking.
  const { data: open } = await db.from('ai_sessions').select('session_id').eq('booking_id', booking.id).is('ended_at', null)
  for (const s of open ?? []) {
    await endLiveSession(s.session_id).catch(() => null)
    await db.from('ai_sessions').update({ ended_at: new Date().toISOString(), end_reason: 'replaced' }).eq('session_id', s.session_id)
  }

  // What the student sees: the live course/lesson (if any), else what was booked.
  const openLesson = session?.course_id && session.lesson_id ? { courseId: session.course_id, lessonId: session.lesson_id } : null
  const brief = await buildSessionBrief(db, booking, openLesson)

  let created: { sessionId: string; sdp: string }
  try {
    created = await createLiveSession({
      sdp,
      instructions: brief.instructions,
      voice: brief.voice,
      backendInstructions: brief.backendInstructions,
      tools: brief.tools,
      safetyId: createHash('sha256').update(`eigo:${booking.user_id}`).digest('hex').slice(0, 32),
    })
  } catch (e) {
    console.error('ai-session create failed', e)
    return json(502, { reason: 'provider_error' })
  }

  await ensureSession(booking.id)
  await db.from('ai_sessions').insert({
    session_id: created.sessionId,
    booking_id: booking.id,
    user_id: booking.user_id,
    voice: brief.voice,
    ends_at: new Date(end).toISOString(),
  })

  return json(200, { sessionId: created.sessionId, sdp: created.sdp, endsAt: new Date(end).toISOString() })
}
