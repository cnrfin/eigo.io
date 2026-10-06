import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * PUT /api/classroom/[id]/activity   { blockId, state }
 * Saves a true/false or matching block's answers so they survive a refresh.
 * The live view is synced over Realtime.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx

  let body: { blockId?: unknown; state?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const blockId = typeof body.blockId === 'string' ? body.blockId : ''
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(blockId)) return json(400, { error: 'Invalid blockId' })
  if (JSON.stringify(body.state ?? null).length > 20_000) return json(413, { error: 'Too large' })

  const { error } = await getSupabaseAdmin()
    .from('classroom_activity')
    .upsert(
      { booking_id: ctx.booking.id, block_id: blockId, state: body.state ?? {}, updated_at: new Date().toISOString() },
      { onConflict: 'booking_id,block_id' },
    )
  if (error) return json(500, { error: 'Could not save' })
  return json(200, { ok: true })
}
