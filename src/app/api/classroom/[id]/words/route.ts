import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * The student's word list from the classroom (review cards).
 *
 * GET     → { saved: [{ itemId, term, source, courseId }] } words saved from
 *           courses, lookups and chat (so the classroom can show them as saved)
 * POST    { source: 'course'|'lookup'|'chat', courseId?, itemId, term, pos?, meaning?, ja?, example? }
 *           → saves the word (vocabulary_phrases) and makes a review card that's
 *             due now (vocabulary_cards), like the + on a lesson summary
 * DELETE  ?itemId=… → removes it again
 *
 * Words are keyed by (user, source_course_id, source_item_id): course words by
 * their VocabItem id, lookups 'lk:<term>', chat 'chat:<message id>'.
 * Only the student saves (the teacher's taps are just looking).
 */

const SOURCES = ['course', 'lookup', 'chat'] as const
type Source = (typeof SOURCES)[number]
const groupFor = (source: Source, courseId?: string | null) => (source === 'course' && courseId ? courseId : source)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  const { data } = await getSupabaseAdmin()
    .from('vocabulary_phrases')
    .select('source, source_course_id, source_item_id, phrase_en')
    .eq('user_id', ctx.booking.user_id)
    .in('source', [...SOURCES])
  return json(200, {
    saved: (data ?? []).map((r) => ({
      itemId: r.source_item_id,
      term: r.phrase_en,
      source: r.source,
      courseId: r.source === 'course' ? r.source_course_id : null,
    })),
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  if (ctx.access.role !== 'student') return json(403, { error: 'Students only' })

  let b: Record<string, unknown>
  try {
    b = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const s = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '')
  const source = b.source as Source
  if (!SOURCES.includes(source)) return json(400, { error: 'Invalid source' })
  const itemId = s('itemId', 200)
  const term = s('term', 300)
  if (!itemId || !term) return json(400, { error: 'itemId and term required' })
  const courseId = s('courseId', 80) || null

  const db = getSupabaseAdmin()
  const userId = ctx.booking.user_id
  const group = groupFor(source, courseId)
  const row = {
    user_id: userId,
    booking_id: ctx.booking.id,
    source,
    source_course_id: group,
    source_item_id: itemId,
    phrase_en: term,
    translation_ja: s('ja', 300),
    explanation_en: s('meaning', 500),
    explanation_ja: '',
    example_en: s('example', 500).replace(/\*\*(.+?)\*\*/g, '$1'),
    category: 'general',
  }

  // upsert by (user, group, item): the unique index is partial, so look it up first
  const { data: existing } = await db
    .from('vocabulary_phrases')
    .select('id')
    .eq('user_id', userId)
    .eq('source_course_id', group)
    .eq('source_item_id', itemId)
    .maybeSingle()
  let phraseId = existing?.id as string | undefined
  if (!phraseId) {
    const { data: ins, error } = await db.from('vocabulary_phrases').insert(row).select('id').single()
    if (error || !ins) {
      console.error('save word failed:', error)
      return json(500, { error: 'Could not save' })
    }
    phraseId = ins.id
  }
  const { error: cardErr } = await db.from('vocabulary_cards').upsert(
    {
      user_id: userId,
      phrase_id: phraseId,
      comfort_level: 'learning',
      interval_days: 1,
      ease_factor: 2.5,
      next_review_at: new Date().toISOString(), // due now
    },
    { onConflict: 'user_id,phrase_id', ignoreDuplicates: true },
  )
  if (cardErr) console.error('save word card failed:', cardErr)
  return json(200, { ok: true, itemId })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  if (ctx.access.role !== 'student') return json(403, { error: 'Students only' })
  const itemId = request.nextUrl.searchParams.get('itemId') || ''
  if (!itemId) return json(400, { error: 'itemId required' })
  // removing the phrase removes its card too (ON DELETE CASCADE)
  const { error } = await getSupabaseAdmin()
    .from('vocabulary_phrases')
    .delete()
    .eq('user_id', ctx.booking.user_id)
    .eq('source_item_id', itemId)
    .in('source', [...SOURCES])
  if (error) return json(500, { error: 'Could not remove' })
  return json(200, { ok: true })
}
