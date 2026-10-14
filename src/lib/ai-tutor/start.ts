import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getUserPermissions } from '@/lib/user-permissions'
import { isAdminEmail } from '@/lib/admin-redirect'
import { getMinuteBalance, getUserSubscription, recordMinuteUsage } from '@/lib/subscription'
import { loadCatalog } from '@/lib/classroom/catalog'
import { aiLengthOptions, aiMinutesFor } from './settings'

/**
 * "Start now" AI lessons (pilot: user_permissions.ai_enabled, and admins).
 * Starting now is an instant booking: an AI booking that starts this minute, so minutes, history, summaries,
 * course progress and the end-of-lesson sweep all work exactly as for a booked AI lesson.
 */

const MIN = 60_000
/** no instant AI lesson this close before a lesson with the teacher (or during one) */
const TEACHER_GAP_MIN = 30

type Row = { id: string; date: string; start_time: string; duration_minutes: number; lesson_kind: string | null }
const startOf = (b: Row) => new Date(`${b.date}T${String(b.start_time).slice(0, 5)}:00+09:00`).getTime()
const jstNow = (now: number) => {
  const iso = new Date(now + 9 * 3600e3).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

export type AiStartState = {
  /** plan minutes left this month; null = no limit (admin / test account) */
  remaining: number | null
  /** AI lesson lengths the student can start (lesson minutes); empty = not enough minutes */
  options: number[]
  /** why they can't start now */
  blocked: null | 'no_subscription' | 'minutes' | 'teacher_lesson'
  /** the teacher lesson that blocks it (ISO start) */
  teacherAt: string | null
  /** an AI lesson already in progress: go back to it instead of starting another */
  liveId: string | null
  /** what an AI lesson started now would continue */
  resume: { courseId: string; title: string; titleJa: string; lessonId: string; lessonNumber: number } | null
}

export async function canUseAi(user: { id: string; email?: string | null }) {
  if (isAdminEmail(user.email)) return { ok: true, unlimited: true }
  const perms = await getUserPermissions(getSupabaseAdmin(), user.id)
  return { ok: perms.ai_enabled, unlimited: perms.booking_test_mode }
}

/**
 * The course the student is working through (their latest booking with a course) and the first lesson they
 * haven't completed: where an AI lesson started now picks up. (Unlike the booking queue, lessons on other
 * bookings don't count as taken: "carry on where I left off" is what the student expects here.)
 */
async function currentCourse(userId: string): Promise<AiStartState['resume']> {
  const { data } = await getSupabaseAdmin()
    .from('bookings')
    .select('slide_course_id')
    .eq('user_id', userId)
    .not('slide_course_id', 'is', null)
    .neq('status', 'cancelled')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()
  const courseId = data?.slide_course_id as string | undefined
  if (!courseId) return null
  const course = (await loadCatalog()).find((c) => c.id === courseId)
  if (!course?.lessonIds.length) return null
  const { data: prog } = await getSupabaseAdmin()
    .from('slide_course_progress')
    .select('completed_lesson_ids')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  const done = new Set<string>((prog?.completed_lesson_ids as string[] | null) ?? [])
  const lessonId = course.lessonIds.find((id) => !done.has(id))
  if (!lessonId) return null // course finished: free talk
  return { courseId, title: course.title, titleJa: course.titleJa, lessonId, lessonNumber: course.lessonIds.indexOf(lessonId) + 1 }
}

export async function aiStartState(userId: string, unlimited: boolean, now = Date.now()): Promise<AiStartState> {
  const db = getSupabaseAdmin()
  const today = jstNow(now - 24 * 3600e3).date // yesterday in JST, to catch lessons running over midnight
  const [{ data: rows }, balance, sub, resume] = await Promise.all([
    db
      .from('bookings')
      .select('id, date, start_time, duration_minutes, lesson_kind')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('date', today)
      .order('date')
      .order('start_time')
      .limit(50),
    unlimited ? Promise.resolve(null) : getMinuteBalance(userId),
    unlimited ? Promise.resolve(null) : getUserSubscription(userId),
    currentCourse(userId),
  ])
  const list = (rows ?? []) as Row[]

  // an AI lesson that is on now and not ended
  let liveId: string | null = null
  const liveCandidates = list.filter((b) => b.lesson_kind === 'ai' && startOf(b) - 10 * MIN <= now && now < startOf(b) + (b.duration_minutes + 2) * MIN)
  if (liveCandidates.length) {
    const { data: ended } = await db
      .from('classroom_sessions')
      .select('booking_id, ended_at')
      .in('booking_id', liveCandidates.map((b) => b.id))
    const done = new Set((ended ?? []).filter((r) => r.ended_at).map((r) => r.booking_id as string))
    liveId = liveCandidates.find((b) => !done.has(b.id))?.id ?? null
  }

  const teacher = list.find((b) => b.lesson_kind !== 'ai' && startOf(b) - TEACHER_GAP_MIN * MIN <= now && now < startOf(b) + b.duration_minutes * MIN)
  const remaining = unlimited ? null : (balance?.minutesRemaining ?? 0)
  const options = aiLengthOptions(remaining)
  const blocked: AiStartState['blocked'] = teacher
    ? 'teacher_lesson'
    : !unlimited && (!sub || sub.status === 'cancelled')
      ? 'no_subscription'
      : !options.length
        ? 'minutes'
        : null
  return { remaining, options, blocked, teacherAt: teacher ? new Date(startOf(teacher)).toISOString() : null, liveId, resume }
}

/**
 * Start an AI lesson now. Returns the booking to open (an AI lesson already in progress is returned instead
 * of starting a second one), or why it can't start.
 */
export async function startAiNow(
  userId: string,
  unlimited: boolean,
  duration: number,
): Promise<{ ok: true; bookingId: string; resumed: boolean } | { ok: false; reason: string; state?: AiStartState }> {
  const state = await aiStartState(userId, unlimited)
  if (state.liveId) return { ok: true, bookingId: state.liveId, resumed: true }
  if (state.blocked) return { ok: false, reason: state.blocked, state }
  if (!state.options.includes(duration)) return { ok: false, reason: 'bad_duration', state }

  const sub = unlimited ? null : await getUserSubscription(userId)
  const charge = aiMinutesFor(duration)
  const { date, time } = jstNow(Date.now())
  const { data: row, error } = await getSupabaseAdmin()
    .from('bookings')
    .insert({
      user_id: userId,
      date,
      start_time: time,
      duration_minutes: duration,
      status: 'confirmed',
      lesson_kind: 'ai',
      ai_minutes_charged: charge,
      slide_course_id: state.resume?.courseId ?? null,
      slide_lesson_id: state.resume?.lessonId ?? null,
    })
    .select('id')
    .single()
  if (error || !row) {
    console.error('AI start-now booking failed', error)
    return { ok: false, reason: 'error' }
  }
  if (sub) {
    try {
      await recordMinuteUsage(userId, row.id, charge, sub.current_period_start, 'booked')
    } catch (e) {
      console.error('AI start-now: minute usage not recorded', e)
    }
  }
  return { ok: true, bookingId: row.id as string, resumed: false }
}
