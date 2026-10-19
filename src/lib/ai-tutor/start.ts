import { roleplayColumns, type RoleplayPick } from '@/lib/roleplay/booking'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { chargeAiLesson, getBalance, type Balance } from '@/lib/minutes'
import { aiLengthsFor, splitAiCharge, type MinuteSnapshot } from '@/lib/minutes-core'
import { loadCatalog } from '@/lib/classroom/catalog'

/**
 * "Start now" AI lessons (who may: src/lib/ai-tutor/access.ts).
 * Starting now is an instant booking: an AI booking that starts this minute, so minutes, history, summaries,
 * course progress and the end-of-lesson sweep all work exactly as for a booked AI lesson.
 */

const MIN = 60_000
/** no instant AI lesson this close before a lesson with the teacher (or during one) */
const TEACHER_GAP_MIN = 30
/** the free welcome call (once per account) */
export const AI_TRIAL_MINUTES = 5

type Row = { id: string; date: string; start_time: string; duration_minutes: number; lesson_kind: string | null }
const startOf = (b: Row) => new Date(`${b.date}T${String(b.start_time).slice(0, 5)}:00+09:00`).getTime()
const jstNow = (now: number) => {
  const iso = new Date(now + 9 * 3600e3).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

export type AiStartState = {
  /** what they can spend (plan, AI and top-up minutes); null = no limit (admin / test account) */
  minutes: MinuteSnapshot | null
  /** AI lesson lengths the student can start (lesson minutes); empty = not enough minutes */
  options: number[]
  /** why they can't start now */
  blocked: null | 'no_subscription' | 'minutes' | 'teacher_lesson'
  /** the teacher lesson that blocks it (ISO start) */
  teacherAt: string | null
  /** an AI lesson already in progress: go back to it instead of starting another */
  liveId: string | null
  /** the free 5-minute welcome call is available (no subscription yet, not used): the only option is 5 */
  trial: boolean
  /** what an AI lesson started now would continue */
  resume: { courseId: string; title: string; titleJa: string; lessonId: string; lessonNumber: number } | null
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
  return courseId ? courseLesson(userId, courseId, false) : null
}

/**
 * The lesson an AI lesson in `courseId` starts with: the first one not completed. A finished course gives
 * null, or its last lesson when the student chose the course themselves (`lastWhenDone`), as booking does.
 */
async function courseLesson(userId: string, courseId: string, lastWhenDone: boolean): Promise<AiStartState['resume']> {
  const course = (await loadCatalog()).find((c) => c.id === courseId)
  if (!course?.lessonIds.length) return null
  const { data: prog } = await getSupabaseAdmin()
    .from('slide_course_progress')
    .select('completed_lesson_ids')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  const done = new Set<string>((prog?.completed_lesson_ids as string[] | null) ?? [])
  const lessonId = course.lessonIds.find((id) => !done.has(id)) ?? (lastWhenDone ? course.lessonIds[course.lessonIds.length - 1] : undefined)
  if (!lessonId) return null // course finished: free talk
  return { courseId, title: course.title, titleJa: course.titleJa, lessonId, lessonNumber: course.lessonIds.indexOf(lessonId) + 1 }
}

/**
 * welcomeTest: admins and test accounts are never charged, so they never look plan-less and never get the
 * welcome call. With /dashboard?welcome=1 they do (once, while profiles.ai_trial_booking_id is empty), to try it.
 */
export async function aiStartState(userId: string, unlimited: boolean, now = Date.now(), welcomeTest = false): Promise<AiStartState> {
  return (await startState(userId, unlimited, now, welcomeTest)).state
}

async function startState(userId: string, unlimited: boolean, now = Date.now(), welcomeTest = false): Promise<{ state: AiStartState; balance: Balance | null }> {
  const db = getSupabaseAdmin()
  const today = jstNow(now - 24 * 3600e3).date // yesterday in JST, to catch lessons running over midnight
  const [{ data: rows }, balance, resume, { data: prof }] = await Promise.all([
    db
      .from('bookings')
      .select('id, date, start_time, duration_minutes, lesson_kind')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('date', today)
      .order('date')
      .order('start_time')
      .limit(50),
    unlimited ? Promise.resolve(null) : getBalance(userId),
    currentCourse(userId),
    db.from('profiles').select('ai_trial_booking_id').eq('id', userId).maybeSingle(),
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
  const minutes = balance ? balance.snapshot : null
  // no subscription and no top-ups: the free 5-minute welcome call, once
  const noPlan = !!balance && !balance.active && !balance.snapshot.topups.length
  const trial = (noPlan || (unlimited && welcomeTest)) && !prof?.ai_trial_booking_id
  const options = trial ? [AI_TRIAL_MINUTES] : aiLengthsFor(minutes)
  const blocked: AiStartState['blocked'] = teacher
    ? 'teacher_lesson'
    : noPlan && !trial
      ? 'no_subscription'
      : !options.length
        ? 'minutes'
        : null
  return {
    state: { minutes, options, blocked, teacherAt: teacher ? new Date(startOf(teacher)).toISOString() : null, liveId, trial, resume: trial ? null : resume },
    balance,
  }
}

/**
 * Start an AI lesson now. Returns the booking to open (an AI lesson already in progress is returned instead
 * of starting a second one), or why it can't start.
 */
export async function startAiNow(
  userId: string,
  unlimited: boolean,
  duration: number,
  /** the course the student chose: undefined = carry on where they left off, null = free talk */
  courseId?: string | null,
  /** a role-play instead of a course (checked by checkRoleplayPick); the lesson opens straight into it */
  roleplay?: RoleplayPick,
  /** admins / test accounts: start the welcome call (see aiStartState) */
  welcomeTest = false,
): Promise<{ ok: true; bookingId: string; resumed: boolean } | { ok: false; reason: string; state?: AiStartState }> {
  const { state, balance } = await startState(userId, unlimited, Date.now(), welcomeTest)
  if (state.liveId) return { ok: true, bookingId: state.liveId, resumed: true }
  if (state.blocked) return { ok: false, reason: state.blocked, state }
  if (!state.options.includes(duration)) return { ok: false, reason: 'bad_duration', state }

  const parts = state.trial || !balance ? [] : splitAiCharge(balance.snapshot, duration)
  if (!parts) return { ok: false, reason: 'minutes', state }
  // the welcome call has no course; otherwise their choice (checked here, never trusted from the browser)
  const rp = state.trial ? undefined : roleplay
  const course = state.trial || rp ? null : courseId === undefined ? state.resume : courseId === null ? null : await courseLesson(userId, courseId, true)
  if (courseId && !state.trial && !course) return { ok: false, reason: 'bad_course', state }
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
      ai_minutes_charged: parts.reduce((a, p) => a + p.minutes, 0),
      slide_course_id: course?.courseId ?? null,
      slide_lesson_id: course?.lessonId ?? null,
      ...roleplayColumns(rp),
    })
    .select('id')
    .single()
  if (error || !row) {
    console.error('AI start-now booking failed', error)
    return { ok: false, reason: 'error' }
  }
  if (state.trial) {
    // claim the welcome call (only if still unused, so two tabs can't both get one)
    const { data: claimed } = await getSupabaseAdmin()
      .from('profiles')
      .update({ ai_trial_booking_id: row.id })
      .eq('id', userId)
      .is('ai_trial_booking_id', null)
      .select('id')
    if (!claimed?.length) {
      await getSupabaseAdmin().from('bookings').update({ status: 'cancelled' }).eq('id', row.id)
      return { ok: false, reason: 'no_subscription' }
    }
  } else if (balance) {
    try {
      await chargeAiLesson(userId, row.id as string, duration, balance)
    } catch (e) {
      console.error('AI start-now: minute usage not recorded', e)
    }
  }
  return { ok: true, bookingId: row.id as string, resumed: false }
}
