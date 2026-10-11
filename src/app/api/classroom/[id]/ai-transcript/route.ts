import { NextRequest } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'
import { summarizeAiLesson } from '@/lib/ai-tutor/summary'

/**
 * POST /api/classroom/[id]/ai-transcript   { sessionId, lines: [{ from, text, t }], final }
 *
 * The classroom sends the AI lesson transcript it collected from GPT-Live's
 * transcript events: periodically during the lesson, and once more at the end
 * (final = true). It is stored as plain "Student: … / Teacher: …" text in
 * bookings.transcript_text (already clean, so no cleanup step), and the final
 * call marks the session ended and makes the lesson summary in the background.
 * It only ever feeds the student's own summary.
 */
type Line = { from: 'student' | 'tutor'; text: string; t: number }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })

  let body: { sessionId?: string; lines?: Line[]; final?: boolean }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .filter((l) => l && (l.from === 'student' || l.from === 'tutor') && typeof l.text === 'string' && l.text.trim())
    .slice(0, 2000)
  const text = lines
    .map((l) => `${l.from === 'student' ? 'Student' : 'Teacher'}: ${l.text.replace(/\s+/g, ' ').trim().slice(0, 2000)}`)
    .join('\n')
    .slice(0, 200_000)

  const db = getSupabaseAdmin()
  const { data: sess } = body.sessionId
    ? await db.from('ai_sessions').select('session_id, started_at, ended_at').eq('session_id', body.sessionId).eq('booking_id', booking.id).maybeSingle()
    : { data: null }

  // Several sessions can make up one lesson (reconnects): keep earlier text, append this session's.
  const { data: cur } = await db.from('bookings').select('transcript_text').eq('id', booking.id).maybeSingle()
  const marker = sess ? `\n[session ${sess.session_id}]\n` : '\n'
  const prev = (cur?.transcript_text as string | null) ?? ''
  const before = sess && prev.includes(marker) ? prev.slice(0, prev.indexOf(marker)) : prev
  const merged = text ? `${before}${marker}${text}`.trim() : prev
  if (merged !== prev) await db.from('bookings').update({ transcript_text: merged, cleaned_transcript: merged }).eq('id', booking.id)

  if (body.final && sess && !sess.ended_at) {
    const endedAt = new Date()
    await db
      .from('ai_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        end_reason: 'client_end',
        duration_s: Math.round((endedAt.getTime() - new Date(sess.started_at).getTime()) / 1000),
      })
      .eq('session_id', sess.session_id)
  }
  // Summarise only when the lesson is really over (near the booked end). An early "final" (a session
  // that dropped) must not lock in a summary of half a lesson; the sweep summarises after the end.
  const over = Date.now() >= ctx.access.window.end.getTime() - 90_000
  if (body.final && over) waitUntil(summarizeAiLesson(booking.id).catch((e) => console.error('AI lesson summary failed', e)))
  return json(200, { ok: true })
}
