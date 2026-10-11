import { NextRequest } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'
import { sendAdminAiReport } from '@/lib/email'

/**
 * POST /api/classroom/[id]/ai-report
 *   { reason: 'slide'|'audio'|'content'|'other', note?, sessionId?, courseId?, lessonId?, slideId?, slideNo?, recent? }
 * A student's one-tap problem report from the AI classroom. Saved to ai_reports and
 * emailed to the admin with the slide and the last minute of conversation.
 */
const REASONS: Record<string, string> = { slide: 'Slide not moving', audio: 'Audio problem', content: 'Content seems wrong', other: 'Other' }
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })

  let b: Record<string, unknown>
  try {
    b = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const reason = typeof b.reason === 'string' && REASONS[b.reason] ? b.reason : 'other'
  const row = {
    booking_id: booking.id,
    user_id: booking.user_id,
    session_id: s(b.sessionId, 120) || null,
    reason,
    note: s(b.note, 1000) || null,
    course_id: s(b.courseId, 80) || null,
    lesson_id: s(b.lessonId, 80) || null,
    slide_id: s(b.slideId, 80) || null,
    slide_no: Number.isFinite(Number(b.slideNo)) ? Math.round(Number(b.slideNo)) : null,
    recent: s(b.recent, 4000) || null,
  }
  const db = getSupabaseAdmin()
  const { error } = await db.from('ai_reports').insert(row)
  if (error) console.error('ai_reports insert failed (is supabase/add-ai-reports.sql applied?)', error.message)

  const { data: prof } = await db.from('profiles').select('display_name, email').eq('id', booking.user_id).maybeSingle()
  waitUntil(
    sendAdminAiReport({
      studentName: (prof?.display_name as string) || 'Student',
      studentEmail: (prof?.email as string) || '',
      reason: REASONS[reason],
      note: row.note ?? '',
      where: row.lesson_id ? `Course ${row.course_id}, lesson ${row.lesson_id}, slide ${row.slide_no ?? '?'}` : 'Free talk',
      recent: row.recent ?? '',
      bookingId: booking.id,
    }).catch((e) => console.error('AI report email failed', e)),
  )
  return json(200, { ok: true })
}
