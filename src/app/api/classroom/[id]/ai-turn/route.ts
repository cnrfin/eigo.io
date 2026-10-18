import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'
import { findLesson, loadCourse } from '@/lib/classroom/courses'
import { lessonOutline } from '@/lib/ai-tutor/brief'
import { decideScreenAction, decideSlideMove, type SlideMove } from '@/lib/ai-tutor/turn'
import type { Decision, Named, Screen, ScreenView } from '@/lib/ai-tutor/actions'

/**
 * POST /api/classroom/[id]/ai-turn
 *   { sessionId, courseId?, lessonId?, slideId?, furthest?, reviewing?, lines?: [{ from, text }],   ← slide check
 *     screen?: { view, board, pickerMode?, roleplay?, wrappingUp? }, courses?: [{id,title}], scenes?: [{id,title}],
 *     recent?: [{ from, text }] }                                                                     ← action judge
 *   → { move: 'stay' | 'next' | 'back' | 'return', slide, action, quote }
 *
 * AI lessons, after each pause:
 *  - the slide check (lib/ai-tutor/turn.ts decideSlideMove): with a course open, should the slide change?
 *    lines = the conversation since this slide appeared
 *  - the action judge (lib/ai-tutor/actions.ts): should the screen change (course, role-plays, whiteboard)?
 *    recent = the conversation since the screen last changed. Validated here against the screen and the lists.
 * Both run at once; anything unsure or failed is "stay" / "none".
 */
export const maxDuration = 15

type In = { from: string; text: string }
const cleanLines = (v: unknown, n: number) =>
  (Array.isArray(v) ? (v as In[]) : [])
    .filter((l) => l && (l.from === 'student' || l.from === 'tutor') && typeof l.text === 'string' && l.text.trim())
    .slice(-n)
    .map((l) => ({ from: l.from as 'student' | 'tutor', text: l.text.slice(0, 600) }))
const cleanNamed = (v: unknown): Named[] =>
  (Array.isArray(v) ? (v as Named[]) : [])
    .filter((x) => x && typeof x.id === 'string' && typeof x.title === 'string')
    .slice(0, 30)
    .map((x) => ({ id: x.id.slice(0, 80), title: x.title.replace(/\s+/g, ' ').slice(0, 100) }))

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })

  let b: {
    sessionId?: string
    courseId?: string
    lessonId?: string
    slideId?: string
    furthest?: number
    reviewing?: boolean
    lines?: unknown
    screen?: Partial<Screen>
    courses?: unknown
    scenes?: unknown
    recent?: unknown
  }
  try {
    b = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const stay: SlideMove = { move: 'stay', slide: null }
  const none: Decision = { action: { kind: 'none' }, quote: '' }
  const { data: sess } = await getSupabaseAdmin()
    .from('ai_sessions')
    .select('ended_at')
    .eq('session_id', String(b.sessionId ?? ''))
    .eq('booking_id', booking.id)
    .maybeSingle()
  if (!sess || sess.ended_at) return json(409, { ...stay, ...none })

  // the course on screen (if any), from the published course
  const c = b.courseId ? await loadCourse(String(b.courseId)) : null
  const found = c ? findLesson(c.course, String(b.lessonId ?? '')) : null
  const lesson = found?.lesson
  const i = lesson ? lesson.slides.findIndex((s) => s.id === b.slideId) : -1
  const total = lesson?.slides.length ?? 0
  const furthest = lesson ? Math.min(total, Math.max(i + 1, Math.round(Number(b.furthest) || 0))) : 0
  const reviewing = !!b.reviewing && i + 1 < furthest

  // 1) the slide check
  const slideLines = cleanLines(b.lines, 16)
  const slideCheck: Promise<SlideMove> =
    lesson && i >= 0 && slideLines.length
      ? decideSlideMove({ slideNo: i + 1, total, furthest, reviewing, outline: lessonOutline(lesson), slideLines })
      : Promise.resolve(stay)

  // 2) the action judge
  const recent = cleanLines(b.recent, 10)
  const views: ScreenView[] = ['free', 'course', 'picker', 'roleplay']
  const view = views.includes(b.screen?.view as ScreenView) ? (b.screen!.view as ScreenView) : null
  const screen: Screen | null =
    view && (view !== 'course' || (lesson && i >= 0))
      ? {
          view,
          board: !!b.screen?.board,
          pickerMode: b.screen?.pickerMode === 'course' ? 'course' : 'rp',
          roleplay: typeof b.screen?.roleplay === 'string' ? b.screen.roleplay.slice(0, 100) : undefined,
          wrappingUp: !!b.screen?.wrappingUp,
          course: view === 'course' && lesson && c && found ? { id: String(b.courseId), title: c.course.title, lesson: found.number, slideNo: i + 1, total, furthest, reviewing } : undefined,
        }
      : null
  const judge: Promise<Decision> = screen && recent.length ? decideScreenAction(screen, { courses: cleanNamed(b.courses), scenes: cleanNamed(b.scenes) }, recent) : Promise.resolve(none)

  const [move, decision] = await Promise.all([slideCheck, judge])
  if (decision.action.kind !== 'none') console.info('ai-action', JSON.stringify({ booking: booking.id, screen: screen?.view, action: decision.action, quote: decision.quote }))
  return json(200, { ...move, ...decision })
}
