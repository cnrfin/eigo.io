import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'
import { decideCard } from '@/lib/ai-tutor/assist'
import { lastExchange, mayHaveCard, type CardLine } from '@/lib/ai-tutor/cards'

/**
 * POST /api/classroom/[id]/ai-assist   { sessionId, lines: [{ from, text }] }  (the last few turns)
 *   → { card: Card | null }
 *
 * AI lessons: after the AI tutor's turn, a correction or "How do I say…?" card for the student's screen
 * (see lib/ai-tutor/assist.ts and cards.ts). The browser only asks when the turn looks like one.
 */
export const maxDuration = 15

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })

  let b: { sessionId?: string; lines?: { from: string; text: string }[] }
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
  if (!sess || sess.ended_at) return json(409, { card: null })

  const lines = (Array.isArray(b.lines) ? b.lines : [])
    .filter((l) => l && (l.from === 'student' || l.from === 'tutor') && typeof l.text === 'string' && l.text.trim())
    .slice(-6)
    .map((l) => ({ from: l.from, text: l.text.slice(0, 600) })) as CardLine[]
  const ex = lastExchange(lines)
  if (!mayHaveCard(ex.student, ex.tutor)) return json(200, { card: null })
  return json(200, { card: await decideCard(lines) })
}
