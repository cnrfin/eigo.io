import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'

const MAX_BYTES = 400_000 // per surface; a busy slide is a few KB

/**
 * PUT /api/classroom/[id]/ink   { surface, items }
 * Saves the drawings on one surface (a slide id, or 'board' for the lesson's
 * whiteboard), so they come back after a refresh or a dropped connection.
 * The live view is synced over Realtime; this is the debounced save.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx

  let body: { surface?: unknown; items?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const surface = typeof body.surface === 'string' ? body.surface : ''
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(surface)) return json(400, { error: 'Invalid surface' })
  if (!Array.isArray(body.items)) return json(400, { error: 'items must be an array' })
  if (JSON.stringify(body.items).length > MAX_BYTES) return json(413, { error: 'Too much on one slide' })

  const { error } = await getSupabaseAdmin()
    .from('classroom_ink')
    .upsert(
      { booking_id: ctx.booking.id, surface, items: body.items, updated_at: new Date().toISOString() },
      { onConflict: 'booking_id,surface' },
    )
  if (error) {
    console.error('classroom_ink save failed:', error)
    return json(500, { error: 'Could not save' })
  }
  return json(200, { ok: true })
}
