import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess, isCourseTester } from '@/lib/test-entitlement'
import { pronLessonAllowed } from '@/lib/pron-gate'
import { getUserPermissions } from '@/lib/user-permissions'

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

  const course = (lesson.level as unknown as { course: { slug: string; published: boolean } | null } | null)?.course
  const admin = isAdminTestUser(user)
  if (!course || (!course.published && !admin && !(await isCourseTester(supabase, user)))) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }
  // Per-user feature permission: an admin can switch off course access entirely
  // for a user (e.g. a custom plan that omits courses), independent of their
  // subscription or a lesson's free flag. Admins themselves are never blocked.
  if (!admin && !(await getUserPermissions(supabase, user.id)).courses_enabled) {
    return NextResponse.json({ error: 'Courses are not included in your plan', code: 'feature_disabled' }, { status: 403 })
  }
  // NOTE: gating relies on hasTestAccess alone (admins normally pass inside
  // it; the admin_simulate_free override turns them into a free user here
  // while `admin` keeps draft visibility above).
  if (!lesson.free && !(await hasTestAccess(supabase, user))) {
    // The pronunciation course gates on graded attempts instead of a hard
    // paywall: PRON_FREE_ATTEMPTS completed non-free lessons anywhere in the
    // course; started/completed lessons stay re-openable (see lib/pron-gate).
    if (course.slug === 'pronunciation' && (await pronLessonAllowed(supabase, user.id, lesson.id))) {
      // attempts remain (or this lesson is already theirs): allow through
    } else {
      return NextResponse.json(
        {
          error: course.slug === 'pronunciation'
            ? 'Free attempts used up; a subscription unlocks the rest'
            : 'A subscription is required for this lesson',
          code: course.slug === 'pronunciation' ? 'attempts_exhausted' : 'payment_required',
        },
        { status: 402 },
      )
    }
  }

  const { data: screens } = await supabase
    .from('lesson_screens')
    .select('id, order_index, type, content, audio_asset_id, image_asset_id')
    .eq('lesson_id', id).order('order_index')

  // Sign asset URLs (1h) like the test engine does. Challenge screens also
  // carry per-node model-clip ids (content.nodes[].audioAssetId) for playback in
  // the results breakdown, so collect those too.
  // Per-word clips live in challenge pools (positions[].pairs[][], sentences[]),
  // shadow grids (words[]), and HVPT discrimination (voices[]). Collect them all.
  // Each spoken word/sentence can carry a UK clip (audioAssetId) and a US clip
  // (audioAssetIdUs); we serve whichever matches the learner's grading accent so
  // the voice they shadow and the scorer stay aligned. Both ids are collected
  // for signing, then withSignedAudio picks one per node.
  type WordNode = { audioAssetId?: string; audioAssetIdUs?: string }
  // which_natural items carry two clips per side (natural + choppy), each dual-accent.
  type ABNode = { naturalAudioAssetId?: string; naturalAudioAssetIdUs?: string; choppyAudioAssetId?: string; choppyAudioAssetIdUs?: string }
  type ScreenContent = { question_type?: string; positions?: { pairs?: WordNode[][] }[]; sentences?: WordNode[]; words?: WordNode[]; voices?: string[]; items?: (WordNode & ABNode)[] } | null
  const nodeIds = (nd: WordNode) => [nd.audioAssetId, nd.audioAssetIdUs]
  const abIds = (nd: ABNode) => [nd.naturalAudioAssetId, nd.naturalAudioAssetIdUs, nd.choppyAudioAssetId, nd.choppyAudioAssetIdUs]
  const challengeIds = (c: ScreenContent): (string | undefined)[] => c?.question_type !== 'challenge' ? []
    : [...(c.positions ?? []).flatMap(p => (p.pairs ?? []).flat().flatMap(nodeIds)), ...(c.sentences ?? []).flatMap(nodeIds)]
  const itemIds = (c: ScreenContent): (string | undefined)[] => {
    if (c?.question_type === 'link_pairs' || c?.question_type === 'glide_pick' || c?.question_type === 'tap_t' || c?.question_type === 'link_letters') return (c.items ?? []).flatMap(nodeIds)
    if (c?.question_type === 'which_natural') return (c.items ?? []).flatMap(abIds)
    return []
  }
  const collected = (screens ?? []).flatMap(s => {
    const c = s.content as ScreenContent
    return [...challengeIds(c), ...itemIds(c), ...((c?.words ?? []).flatMap(nodeIds)), ...((c?.sentences ?? []).flatMap(nodeIds)), ...(c?.voices ?? [])]
  })
  const assetIds = [...new Set([...(screens ?? []).flatMap(s => [s.audio_asset_id, s.image_asset_id]), ...collected].filter(Boolean))] as string[]
  const assetMap = new Map<string, { url: string | null }>()
  if (assetIds.length) {
    const { data: assets } = await supabase.from('assets').select('id, storage_path').in('id', assetIds)
    const rows = assets ?? []
    // Batch-sign every clip in ONE request instead of a sequential round-trip per
    // asset — a flow lesson can carry dozens of clips, and serial signing from a
    // serverless function dominated lesson-open latency.
    const paths = rows.map(a => a.storage_path)
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
      const urlByPath = new Map<string, string>()
      for (const s of signed ?? []) { if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl) }
      for (const a of rows) assetMap.set(a.id, { url: urlByPath.get(a.storage_path) ?? null })
    }
  }
  const sign = (id?: string) => (id ? (assetMap.get(id)?.url ?? null) : null)
  // Serve the US clip when the learner grades in American English and one exists,
  // else the UK clip. HVPT voice sets stay multi-accent (deliberate ear training).
  const { data: accProf } = await supabase.from('profiles').select('pronunciation_accent').eq('id', user.id).maybeSingle()
  const preferUs = accProf?.pronunciation_accent === 'en-US'
  const signNode = (nd: WordNode) => sign(preferUs && nd.audioAssetIdUs ? nd.audioAssetIdUs : nd.audioAssetId)
  const signAB = (nd: ABNode) => ({
    naturalAudioUrl: sign(preferUs && nd.naturalAudioAssetIdUs ? nd.naturalAudioAssetIdUs : nd.naturalAudioAssetId),
    choppyAudioUrl: sign(preferUs && nd.choppyAudioAssetIdUs ? nd.choppyAudioAssetIdUs : nd.choppyAudioAssetId),
  })
  // Inject signed URLs into challenge pools, shadow grids and HVPT voice sets.
  const withSignedAudio = (content: unknown) => {
    const c = content as ScreenContent
    if (c?.question_type === 'challenge') {
      return {
        ...c,
        positions: (c.positions ?? []).map(p => ({ ...p, pairs: (p.pairs ?? []).map(pair => pair.map(nd => ({ ...nd, audioUrl: signNode(nd) }))) })),
        sentences: (c.sentences ?? []).map(nd => ({ ...nd, audioUrl: signNode(nd) })),
      }
    }
    if (c?.question_type === 'sentence_stress') return { ...c, sentences: (c.sentences ?? []).map(nd => ({ ...nd, audioUrl: signNode(nd) })) }
    if (c?.question_type === 'link_pairs' || c?.question_type === 'link_letters' || c?.question_type === 'glide_pick' || c?.question_type === 'tap_t') return { ...c, items: (c.items ?? []).map(nd => ({ ...nd, audioUrl: signNode(nd) })) }
    if (c?.question_type === 'which_natural') return { ...c, items: (c.items ?? []).map(nd => ({ ...nd, ...signAB(nd) })) }
    if (c?.words?.length) return { ...c, words: c.words.map(w => ({ ...w, audioUrl: signNode(w) })) }
    if (c?.voices?.length) return { ...c, voiceUrls: c.voices.map(sign).filter(Boolean) }
    return content
  }

  const { data: progress } = await supabase
    .from('lesson_progress').select('status, screen_index')
    .eq('user_id', user.id).eq('lesson_id', id).maybeSingle()

  return NextResponse.json({
    lesson: { id: lesson.id, slug: lesson.slug, title: lesson.title, title_ja: lesson.title_ja, estimated_minutes: lesson.estimated_minutes },
    course: lesson.level,
    screens: (screens ?? []).map(s => ({
      id: s.id, order_index: s.order_index, type: s.type, content: withSignedAudio(s.content),
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

  let body: { screenIndex?: number; completed?: boolean; score?: number }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { data: lesson } = await supabase.from('lessons').select('id').eq('id', id).single()
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('lesson_progress').select('status, screen_index, best_score')
    .eq('user_id', user.id).eq('lesson_id', id).maybeSingle()

  // best_score keeps the learner's best lesson run (only ever moves up).
  const prevBest = (existing as { best_score?: number | null } | null)?.best_score ?? null
  const nextBest = typeof body.score === 'number'
    ? Math.max(prevBest ?? 0, Math.round(body.score))
    : prevBest

  const update = {
    user_id: user.id,
    lesson_id: id,
    // completed is sticky; screen index only moves forward
    status: body.completed || existing?.status === 'completed' ? 'completed' : 'in_progress',
    screen_index: Math.max(existing?.screen_index ?? 0, Math.floor(body.screenIndex ?? 0)),
    ...(nextBest != null ? { best_score: nextBest } : {}),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('lesson_progress').upsert(update)
  if (error) {
    console.error('Failed to save lesson progress:', error)
    return NextResponse.json({ error: 'Could not save progress' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
