import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/rating   { stars: 1–5, comment? }
 * The student rates the lesson on the lesson-complete screen. Write-only for
 * students: ratings are only ever shown on the admin dashboard.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  if (ctx.access.role !== 'student') return json(403, { error: 'Students only' })

  let body: { stars?: unknown; comment?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const stars = Number(body.stars)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return json(400, { error: 'stars must be 1–5' })
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) || null : undefined

  const row: Record<string, unknown> = { booking_id: ctx.booking.id, user_id: ctx.user.id, stars }
  if (comment !== undefined) row.comment = comment
  const { error } = await getSupabaseAdmin().from('lesson_ratings').upsert(row, { onConflict: 'booking_id' })
  if (error) {
    console.error('lesson rating failed:', error)
    return json(500, { error: 'Could not save rating' })
  }
  return json(200, { ok: true })
}
