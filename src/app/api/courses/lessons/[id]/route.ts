import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess } from '@/lib/test-entitlement'

const BUCKET = 'test-assets'

/**
 * GET /api/courses/lessons/[id]
 *   Full screens for one lesson (concepts + questions WITH answers and
 *   explanations — courses teach, so leaking the key to the client is the
 *   point: feedback is instant). Gated: lesson.free, or any non-cancelled
 *   subscription (Exam Pass / lesson plans), or admin.
 *
 * POST /api/courses/lessons/[id]  { screenIndex?: number, completed?: boolean }
 *   Upsert the caller's progress.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { id } = await params

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, slug, title, title_ja, free, estimated_minutes, level:course_levels ( id, title, title_ja, course:courses ( id, slug, title, title_ja, published ) )')
    .eq('id', id).single()
  if (error || !lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const course = (lesson.level as unknown as { course: { published: boolean } | null } | null)?.course
  const admin = isAdminTestUser(user)
  if (!course || (!course.published && !admin)) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }
  if (!lesson.free && !admin && !(await hasTestAccess(supabase, user))) {
    return NextResponse.json(
      { error: 'A subscription is required for this lesson', code: 'payment_required' },
      { status: 402 },
    )
  }

  const { data: screens } = await supabase
    .from('lesson_screens')
    .select('id, order_index, type, content, audio_asset_id, image_asset_id')
    .eq('lesson_id', id).order('order_index')

  // Sign asset URLs (1h) like the test engine does
  const assetIds = [...new Set((screens ?? []).flatMap(s => [s.audio_asset_id, s.image_asset_id]).filter(Boolean))] as string[]
  const assetMap = new Map<string, { url: string | null }>()
  if (assetIds.length) {
    const { data: assets } = await supabase.from('assets').select('id, storage_path').in('id', assetIds)
    for (const a of assets ?? []) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 3600)
      assetMap.set(a.id, { url: signed?.signedUrl ?? null })
    }
  }

  const { data: progress } = await supabase
    .from('lesson_progress').select('status, screen_index')
    .eq('user_id', user.id).eq('lesson_id', id).maybeSingle()

  return NextResponse.json({
    lesson: { id: lesson.id, slug: lesson.slug, title: lesson.title, title_ja: lesson.title_ja, estimated_minutes: lesson.estimated_minutes },
    course: lesson.level,
    screens: (screens ?? []).map(s => ({
      id: s.id, order_index: s.order_index, type: s.type, content: s.content,
      audio: s.audio_asset_id ? assetMap.get(s.audio_asset_id) ?? null : null,
      image: s.image_asset_id ? assetMap.get(s.image_asset_id) ?? null : null,
    })),
    progress: progress ?? null,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { id } = await params

  let body: { screenIndex?: number; completed?: boolean }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { data: lesson } = await supabase.from('lessons').select('id').eq('id', id).single()
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('lesson_progress').select('status, screen_index')
    .eq('user_id', user.id).eq('lesson_id', id).maybeSingle()

  const update = {
    user_id: user.id,
    lesson_id: id,
    // completed is sticky; screen index only moves forward
    status: body.completed || existing?.status === 'completed' ? 'completed' : 'in_progress',
    screen_index: Math.max(existing?.screen_index ?? 0, Math.floor(body.screenIndex ?? 0)),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('lesson_progress').upsert(update)
  if (error) {
    console.error('Failed to save lesson progress:', error)
    return NextResponse.json({ error: 'Could not save progress' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
