import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { endLiveSession } from '@/lib/ai-tutor/openai'
import { summarizeAiLesson } from '@/lib/ai-tutor/summary'

export const maxDuration = 60

/**
 * GET /api/cron/ai-tutor-sweep   (schedule every minute in the Vercel dashboard)
 *
 * The hard stop for AI lessons: hangs up every GPT-Live session whose booked
 * end has passed, whatever the student's browser is doing. Then marks those
 * bookings completed and makes any missing summaries. This is what makes the
 * lesson length impossible to extend from the client.
 */
export async function GET(request: NextRequest) {
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const ok =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const now = new Date()
  const { data: due } = await db
    .from('ai_sessions')
    .select('session_id, booking_id, started_at')
    .is('ended_at', null)
    .lte('ends_at', now.toISOString())
    .limit(50)

  const results: { session: string; how: string | null }[] = []
  const bookings = new Set<string>()
  for (const s of due ?? []) {
    const how = await endLiveSession(s.session_id).catch(() => null)
    results.push({ session: s.session_id, how })
    await db
      .from('ai_sessions')
      .update({
        ended_at: now.toISOString(),
        end_reason: how ? `swept_${how}` : 'swept_unconfirmed',
        duration_s: Math.round((now.getTime() - new Date(s.started_at).getTime()) / 1000),
        ...(how ? {} : { flags: { sweep_failed: true } }),
      })
      .eq('session_id', s.session_id)
    bookings.add(s.booking_id)
  }

  // Also finish AI lessons whose booked end passed in the last 10 minutes even if every session was
  // already closed by the page (mark completed, make the summary; both are idempotent).
  const { data: recent } = await db
    .from('ai_sessions')
    .select('booking_id')
    .lte('ends_at', now.toISOString())
    .gte('ends_at', new Date(now.getTime() - 10 * 60_000).toISOString())
    .limit(200)
  for (const r of recent ?? []) bookings.add(r.booking_id)

  for (const id of bookings) {
    await db.from('classroom_sessions').update({ ended_at: now.toISOString(), updated_at: now.toISOString() }).eq('booking_id', id).is('ended_at', null)
    await db.from('bookings').update({ status: 'completed' }).eq('id', id).in('status', ['confirmed', 'no_show'])
    await summarizeAiLesson(id).catch((e) => console.error('sweep summary failed', id, e))
  }

  return NextResponse.json({ swept: results.length, results })
}
