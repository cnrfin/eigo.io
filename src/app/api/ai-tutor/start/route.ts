import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { aiStartState, canUseAi, startAiNow } from '@/lib/ai-tutor/start'

/**
 * GET  /api/ai-tutor/start              → AiStartState (lengths they can start, why not, lesson in progress, course to continue)
 * POST /api/ai-tutor/start  { duration } → { bookingId, resumed }   then the browser opens /classroom/[bookingId]
 * "Start now" AI lessons. Pilot only (user_permissions.ai_enabled) and admins.
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
  const access = await canUseAi(user)
  if (!access.ok) return NextResponse.json({ error: 'AI lessons are not available for this account' }, { status: 403 })
  return NextResponse.json(await aiStartState(user.id, access.unlimited))
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await canUseAi(user)
  if (!access.ok) return NextResponse.json({ error: 'AI lessons are not available for this account' }, { status: 403 })
  let duration = 0
  try {
    duration = Number((await request.json()).duration)
  } catch {
    /* handled below */
  }
  if (!Number.isInteger(duration)) return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  const r = await startAiNow(user.id, access.unlimited, duration)
  if (!r.ok) return NextResponse.json({ error: r.reason, state: r.state ?? null }, { status: r.reason === 'error' ? 500 : 409 })
  return NextResponse.json({ bookingId: r.bookingId, resumed: r.resumed })
}
