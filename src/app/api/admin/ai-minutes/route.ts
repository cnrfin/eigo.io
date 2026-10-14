import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { isAdminEmail } from '@/lib/admin-redirect'
import { addTopup, getBalance } from '@/lib/minutes'
import { aiMinutesLeft } from '@/lib/minutes-core'

/**
 * POST /api/admin/ai-minutes  { userId, minutes, note? } → { aiMinutesLeft }
 * Admin: give a student AI minutes (a refund, goodwill, testing). Recorded as an admin top-up, valid 3 months.
 */
export async function POST(request: NextRequest) {
  const h = request.headers.get('Authorization') ?? ''
  const v = h.startsWith('Bearer ') ? await verifySupabaseToken(h.slice(7)) : null
  if (!v?.ok || !isAdminEmail(v.user.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { userId?: string; minutes?: number; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const minutes = Number(body.minutes)
  if (!body.userId || !Number.isInteger(minutes) || minutes < 1 || minutes > 600) return NextResponse.json({ error: 'userId and 1–600 minutes needed' }, { status: 400 })
  await addTopup(body.userId, minutes, { source: 'admin', note: (body.note ?? 'admin grant').slice(0, 200) })
  return NextResponse.json({ aiMinutesLeft: aiMinutesLeft((await getBalance(body.userId)).snapshot) })
}
