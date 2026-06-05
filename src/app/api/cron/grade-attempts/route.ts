import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { gradeAndFinalize } from '@/lib/test-grade-attempt'

export const maxDuration = 300

/**
 * GET /api/cron/grade-attempts
 *   Background grader for AI-review attempts. Finds attempts that finished but
 *   are still awaiting AI grading and finalizes them, so a student who chose AI
 *   review can leave and return to find their results ready.
 *
 *   Schedule this every minute in the Vercel dashboard (like the other crons).
 *   A 3-minute stale window means a half-finished attempt gets retried.
 */
const BATCH = 10

export async function GET(request: NextRequest) {
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const ok =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const staleBefore = new Date(Date.now() - 3 * 60 * 1000).toISOString()

  const { data: pending } = await supabase
    .from('test_attempts')
    .select('id, grading_started_at')
    .eq('status', 'submitted')
    .eq('review_mode', 'ai')
    .or(`grading_started_at.is.null,grading_started_at.lt.${staleBefore}`)
    .limit(BATCH)

  const processed: string[] = []
  for (const a of pending ?? []) {
    // Claim it so the next cron tick (and the submit-time kick) don't double-grade.
    await supabase.from('test_attempts').update({ grading_started_at: new Date().toISOString() }).eq('id', a.id)
    try {
      await gradeAndFinalize(supabase, a.id)
      processed.push(a.id)
    } catch (err) {
      console.error(`Cron grading failed for attempt ${a.id}:`, err)
    }
  }

  return NextResponse.json({ processed: processed.length })
}
