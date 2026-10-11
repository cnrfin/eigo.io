import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'
import { findLesson, loadCourse } from '@/lib/classroom/courses'
import { checklist, lessonOutline } from '@/lib/ai-tutor/brief'
import { decideSlideMove } from '@/lib/ai-tutor/turn'

/**
 * POST /api/classroom/[id]/ai-turn
 *   { sessionId, courseId, lessonId, slideId, furthest, reviewing, recent: [{ from, text }] }
 *   → { move: 'stay' | 'next' | 'back' | 'return', slide }
 *
 * AI lessons: after each turn, should the slide change? (see lib/ai-tutor/turn.ts)
 */
export const maxDuration = 15

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })

  let b: { sessionId?: string; courseId?: string; lessonId?: string; slideId?: string; furthest?: number; reviewing?: boolean; recent?: { from: string; text: string }[] }
  try {
    b = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const { data: sess } = await getSupabaseAdmin()
    .from('ai_sessions')
    .select('ended_at')
    .eq('session_id', String(b.sessionId ?? ''))
    .eq('booking_id', booking.id)
    .maybeSingle()
  if (!sess || sess.ended_at) return json(409, { move: 'stay', slide: null })

  const c = b.courseId ? await loadCourse(String(b.courseId)) : null
  const found = c ? findLesson(c.course, String(b.lessonId ?? '')) : null
  const lesson = found?.lesson
  const i = lesson ? lesson.slides.findIndex((s) => s.id === b.slideId) : -1
  if (!lesson || i < 0) return json(200, { move: 'stay', slide: null })

  const recent = (Array.isArray(b.recent) ? b.recent : [])
    .filter((l) => l && (l.from === 'student' || l.from === 'tutor') && typeof l.text === 'string' && l.text.trim())
    .slice(-10) as { from: 'student' | 'tutor'; text: string }[]
  if (!recent.length) return json(200, { move: 'stay', slide: null })

  const total = lesson.slides.length
  const furthest = Math.min(total, Math.max(i + 1, Math.round(Number(b.furthest) || 0)))
  const r = await decideSlideMove({
    slideNo: i + 1,
    total,
    furthest,
    reviewing: !!b.reviewing && i + 1 < furthest,
    checklist: checklist(lesson.slides[i]),
    outline: lessonOutline(lesson),
    recent,
  })
  return json(200, r)
}
