import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { TEST_ASSETS_BUCKET } from '@/lib/test-grading'

/**
 * POST /api/admin/tests/assets
 *   Register an asset row after the file has been uploaded to the private
 *   `test-assets` bucket. The transcript (listening answer key) is stored here
 *   but is NEVER returned to test-takers — it lives only on the service-role side.
 *   Body: { type: 'audio'|'image', storage_path, transcript?, alt_text?, duration_seconds? }
 *   Returns: { asset: { id, type } }
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()

  let body: {
    type?: 'audio' | 'image'
    storage_path?: string
    transcript?: string
    alt_text?: string
    duration_seconds?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.type || !['audio', 'image'].includes(body.type) || !body.storage_path) {
    return NextResponse.json({ error: "type ('audio'|'image') and storage_path are required" }, { status: 400 })
  }

  // Confirm the object actually exists in the bucket so we don't register dangling assets.
  const { data: signed } = await supabase.storage
    .from(TEST_ASSETS_BUCKET)
    .createSignedUrl(body.storage_path, 60)
  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: `Object not found in "${TEST_ASSETS_BUCKET}" bucket at "${body.storage_path}"` },
      { status: 404 }
    )
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .insert({
      type: body.type,
      storage_path: body.storage_path,
      transcript: body.transcript ?? '',
      alt_text: body.alt_text ?? '',
      duration_seconds: body.duration_seconds ?? null,
    })
    .select('id, type')
    .single()

  if (error || !asset) {
    console.error('Failed to register asset:', error)
    return NextResponse.json({ error: 'Could not register asset' }, { status: 500 })
  }
  return NextResponse.json({ asset }, { status: 201 })
}
