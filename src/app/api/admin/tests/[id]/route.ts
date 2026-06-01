import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

/**
 * PATCH /api/admin/tests/[id]
 *   Update form metadata / toggle publish.
 *   Body: { published?, title?, title_ja?, mode?, time_limit_seconds? }
 *
 * DELETE /api/admin/tests/[id]
 *   Delete a form and its entire tree (cascades to sections/groups/questions/options).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getAdminSupabase()

  let body: {
    published?: boolean
    title?: string
    title_ja?: string
    mode?: string
    time_limit_seconds?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.published === 'boolean') update.published = body.published
  if (typeof body.title === 'string') update.title = body.title
  if (typeof body.title_ja === 'string') update.title_ja = body.title_ja
  if (typeof body.mode === 'string') update.mode = body.mode
  if (body.time_limit_seconds !== undefined) update.time_limit_seconds = body.time_limit_seconds

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const { data: form, error } = await supabase
    .from('test_forms')
    .update(update)
    .eq('id', id)
    .select('id, slug, title, published')
    .single()

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found or update failed' }, { status: 404 })
  }
  return NextResponse.json({ form })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getAdminSupabase()

  const { error } = await supabase.from('test_forms').delete().eq('id', id)
  if (error) {
    console.error('Failed to delete form:', error)
    return NextResponse.json({ error: 'Could not delete form' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
