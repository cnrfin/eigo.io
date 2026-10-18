import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { aiStartState, startAiNow } from '@/lib/ai-tutor/start'
import { aiAccess } from '@/lib/ai-tutor/access'
import { checkRoleplayPick } from '@/lib/roleplay/booking'

/**
 * GET  /api/ai-tutor/start              → AiStartState (lengths they can start, why not, lesson in progress, course to continue)
 * POST /api/ai-tutor/start  { duration, courseId?, roleplay? } → { bookingId, resumed }   (courseId: null = free talk; omitted = carry on;
 *        roleplay: { sceneId, level } instead of a course)   then the browser opens /classroom/[bookingId]
 * "Start now" AI lessons: pilot students (user_permissions.ai_enabled), AI-plan subscribers and admins.
 */
async function auth(request: NextRequest) {
  const h = request.headers.get('Authorization') ?? ''
  if (!h.startsWith('Bearer ')) return null
  const v = await verifySupabaseToken(h.slice(7))
  return v.ok ? v.user : null
}

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await aiAccess(user)
  if (!access.ok) return NextResponse.json({ error: 'AI lessons are not available for this account' }, { status: 403 })
  return NextResponse.json(await aiStartState(user.id, access.unlimited))
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await aiAccess(user)
  if (!access.ok) return NextResponse.json({ error: 'AI lessons are not available for this account' }, { status: 403 })
  let duration = 0
  let courseId: string | null | undefined
  let rawRoleplay: unknown
  try {
    const body = await request.json()
    duration = Number(body.duration)
    // optional: a course id, or null for free talk; left out = carry on where they left off
    if (body.courseId === null || typeof body.courseId === 'string') courseId = body.courseId
    rawRoleplay = body.roleplay
  } catch {
    /* handled below */
  }
  if (!Number.isInteger(duration)) return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  const roleplay = await checkRoleplayPick(user.id, rawRoleplay)
  if (roleplay === 'bad') return NextResponse.json({ error: 'bad_roleplay' }, { status: 400 })
  const r = await startAiNow(user.id, access.unlimited, duration, courseId, roleplay)
  if (!r.ok) return NextResponse.json({ error: r.reason, state: r.state ?? null }, { status: r.reason === 'error' ? 500 : 409 })
  return NextResponse.json({ bookingId: r.bookingId, resumed: r.resumed })
}
