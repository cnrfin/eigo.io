/**
 * Admin API for the Vocab scene editor (local admin tool).
 *
 *   GET    → all lessons, each with its senses (for the blank dropdown) and its
 *            scenes + ordered lines.
 *   POST   → save a scene: create if no id, else update meta; replace its lines.
 *   DELETE → remove a scene (cascades its lines).
 *
 * Admin-gated (verifyAdmin) and writes via the service-role client, which
 * bypasses RLS on the vocab_* content tables. Nothing here is student-facing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

type LineIn = {
  speaker: 'user' | 'npc'
  text_en: string
  text_ja?: string | null
  blank_answer?: string | null
  blank_sense_id?: string | null
  options?: string[] | null
  note?: string | null
}

export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getAdminSupabase()
  const lessonId = new URL(request.url).searchParams.get('lessonId')

  // Without a lessonId: the lightweight lesson LIST for the dropdown. (Loading
  // every lesson's scenes/lines/senses at once now exceeds Supabase's 1000-row
  // default, dropping lines and unlinking senses — so detail is fetched per
  // lesson below.)
  if (!lessonId) {
    const { data: lessons } = await db
      .from('vocab_lessons')
      .select('id, slug, title_en, title_ja, level_index, order_index')
      .order('level_index').order('order_index')
    return NextResponse.json({ lessons: lessons ?? [] })
  }

  // With a lessonId: that one lesson's senses (for the blank dropdown) and its
  // scenes + ordered lines. Every query is scoped to a single lesson, so it
  // stays well under any row limit.
  const { data: items } = await db
    .from('vocab_lesson_items').select('sense_id, order_index')
    .eq('lesson_id', lessonId).order('order_index')
  const senseIds = [...new Set((items ?? []).map((i) => i.sense_id))]
  const { data: senses } = senseIds.length
    ? await db.from('vocab_senses').select('id, slug, gloss_ja, word:vocab_words(headword)').in('id', senseIds)
    : { data: [] as any[] }
  const { data: scenes } = await db
    .from('vocab_scenes').select('*').eq('lesson_id', lessonId).order('order_index')
  const sceneIds = (scenes ?? []).map((s) => s.id)
  const { data: lines } = sceneIds.length
    ? await db.from('vocab_scene_lines').select('*').in('scene_id', sceneIds).order('order_index')
    : { data: [] as any[] }

  const senseById = new Map((senses ?? []).map((s: any) => [s.id, { id: s.id, slug: s.slug, gloss_ja: s.gloss_ja, headword: s.word?.headword ?? s.slug }]))
  const senseList = (items ?? []).map((it) => senseById.get(it.sense_id)).filter(Boolean)
  const linesByScene = new Map<string, any[]>()
  for (const ln of lines ?? []) {
    if (!linesByScene.has(ln.scene_id)) linesByScene.set(ln.scene_id, [])
    linesByScene.get(ln.scene_id)!.push(ln)
  }
  const scenesWithLines = (scenes ?? []).map((sc) => ({ ...sc, lines: linesByScene.get(sc.id) ?? [] }))

  return NextResponse.json({ lesson: { id: lessonId, senses: senseList, scenes: scenesWithLines } })
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getAdminSupabase()

  const body = await request.json()
  const { lessonId, scene, lines } = body as {
    lessonId: string
    scene: { id?: string; goal: string | null; order_index?: number; title_en: string; title_ja: string; setting?: string | null; npc_role?: string | null; published?: boolean }
    lines: LineIn[]
  }
  if (!scene?.title_en) return NextResponse.json({ error: 'Missing scene title' }, { status: 400 })

  let sceneId = scene.id
  const meta = {
    goal: scene.goal || null,
    order_index: scene.order_index ?? 0,
    title_en: scene.title_en,
    title_ja: scene.title_ja || '',
    setting: scene.setting || null,
    npc_role: scene.npc_role || null,
    published: scene.published ?? true,
  }
  if (sceneId) {
    const { error } = await db.from('vocab_scenes').update(meta).eq('id', sceneId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    if (!lessonId) return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    const { data, error } = await db.from('vocab_scenes').insert({ lesson_id: lessonId, ...meta }).select('id').single()
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 400 })
    sceneId = data.id
  }

  await db.from('vocab_scene_lines').delete().eq('scene_id', sceneId)
  const rows = (lines ?? []).map((ln, i) => ({
    scene_id: sceneId,
    order_index: i,
    speaker: ln.speaker,
    text_en: ln.text_en,
    text_ja: ln.text_ja || null,
    blank_answer: ln.blank_answer || null,
    blank_sense_id: ln.blank_sense_id || null,
    options: ln.options && ln.options.length ? ln.options : null,
    note: ln.note || null,
  }))
  if (rows.length) {
    const { error } = await db.from('vocab_scene_lines').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, sceneId })
}

export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sceneId = new URL(request.url).searchParams.get('sceneId')
  if (!sceneId) return NextResponse.json({ error: 'Missing sceneId' }, { status: 400 })
  const db = getAdminSupabase()
  const { error } = await db.from('vocab_scenes').delete().eq('id', sceneId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
