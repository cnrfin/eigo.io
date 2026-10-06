import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdminEmail } from '@/lib/admin-redirect'
import { classroomAccess, type AccessResult } from './access'
import { serializeWindow } from './booking-window'

/**
 * Shared loader for every /api/classroom/[id]/* route: verifies the user's
 * token, loads the booking and its live session, and applies the access rules
 * (src/lib/classroom/access.ts). All DB access is service-role; the access
 * rules are what keep one student out of another student's lesson.
 */

export type ClassroomBooking = {
  id: string
  user_id: string
  date: string
  start_time: string
  duration_minutes: number
  status: string
  whereby_room_url: string | null
  whereby_host_url: string | null
  slide_course_id: string | null
  slide_lesson_id: string | null
  chat_log: ChatItem[]
}

export type ClassroomSession = {
  booking_id: string
  student_joined_at: string | null
  started_at: string | null
  ended_at: string | null
  recording_stopped_at: string | null
}

export type ChatItem = {
  id: string
  from: 'teacher' | 'student'
  text?: string
  file?: { path: string; name: string; size: number; type: string }
  at: string
}

export type ClassroomContext = {
  user: { id: string; email: string | null }
  isAdmin: boolean
  booking: ClassroomBooking
  session: ClassroomSession | null
  access: Extract<AccessResult, { allowed: true }>
}

const BOOKING_COLS =
  'id, user_id, date, start_time, duration_minutes, status, whereby_room_url, whereby_host_url, slide_course_id, slide_lesson_id, chat_log'

export function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

/** Student UI language (teacher UI is always English). */
async function uiLangFor(userId: string, isAdmin: boolean): Promise<'ja' | 'en'> {
  if (isAdmin) return 'en'
  const { data } = await getSupabaseAdmin().from('profiles').select('preferred_language').eq('id', userId).maybeSingle()
  return data?.preferred_language === 'en' ? 'en' : 'ja'
}

/**
 * Returns the context, or a ready-made error response:
 *  401 not signed in · 403 { reason, window, uiLang } not allowed (yet).
 * `allowWhenEnded` lets the lesson-complete screen still rate / download after the end.
 */
export async function loadClassroom(
  request: NextRequest,
  bookingId: string,
  opts: { allowWhenEnded?: boolean } = {},
): Promise<ClassroomContext | NextResponse> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' })
  const verified = await verifySupabaseToken(auth.slice(7))
  if (!verified.ok) return json(401, { error: 'Unauthorized' })
  const user = { id: verified.user.id, email: verified.user.email }
  const isAdmin = isAdminEmail(user.email)

  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json(403, { reason: 'not_found', uiLang: await uiLangFor(user.id, isAdmin) })

  const db = getSupabaseAdmin()
  const [{ data: booking }, { data: session }] = await Promise.all([
    db.from('bookings').select(BOOKING_COLS).eq('id', bookingId).maybeSingle(),
    db.from('classroom_sessions')
      .select('booking_id, student_joined_at, started_at, ended_at, recording_stopped_at')
      .eq('booking_id', bookingId)
      .maybeSingle(),
  ])

  const access = classroomAccess(user, booking as ClassroomBooking | null, session as ClassroomSession | null)
  if (!access.allowed) {
    const ownerAfterEnd =
      opts.allowWhenEnded && access.reason === 'ended' && booking && (booking.user_id === user.id || isAdmin)
    if (!ownerAfterEnd) {
      return json(403, {
        reason: access.reason,
        window: access.window ? serializeWindow(access.window) : null,
        uiLang: await uiLangFor(user.id, isAdmin),
      })
    }
    return {
      user,
      isAdmin,
      booking: booking as ClassroomBooking,
      session: session as ClassroomSession | null,
      access: { allowed: true, role: isAdmin ? 'teacher' : 'student', window: access.window! },
    }
  }
  return { user, isAdmin, booking: booking as ClassroomBooking, session: session as ClassroomSession | null, access }
}

export { uiLangFor }

/** Make sure a classroom_sessions row exists (idempotent). */
export async function ensureSession(bookingId: string) {
  await getSupabaseAdmin()
    .from('classroom_sessions')
    .upsert({ booking_id: bookingId }, { onConflict: 'booking_id', ignoreDuplicates: true })
}

export function publicSession(s: ClassroomSession | null) {
  return {
    startedAt: s?.started_at ?? null,
    endedAt: s?.ended_at ?? null,
    studentJoinedAt: s?.student_joined_at ?? null,
    recordingStoppedAt: s?.recording_stopped_at ?? null,
  }
}

/** Whereby URLs: the student URL carries ?displayName=…, the host URL ?roomKey=…. */
export function wherebyParts(b: Pick<ClassroomBooking, 'whereby_room_url' | 'whereby_host_url'>) {
  const strip = (u: string) => {
    const url = new URL(u)
    return `${url.origin}${url.pathname}`
  }
  const roomUrl = b.whereby_room_url ? strip(b.whereby_room_url) : b.whereby_host_url ? strip(b.whereby_host_url) : null
  let roomKey: string | null = null
  if (b.whereby_host_url) {
    try {
      roomKey = new URL(b.whereby_host_url).searchParams.get('roomKey')
    } catch {
      roomKey = null
    }
  }
  return { roomUrl, roomKey }
}

export function personName(displayName: string | null | undefined, email: string | null | undefined, fallback: string) {
  const n = (displayName || '').trim()
  if (n) return n
  if (email && !email.endsWith('@line.eigo.io')) return email.split('@')[0]
  return fallback
}
