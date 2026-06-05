import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { generateForm, type Skill } from '@/lib/test-generate'

export const maxDuration = 120

/**
 * POST /api/admin/tests/generate   (admin only)
 *   AI-draft original items for a track + skill, returned in the import shape.
 *   Nothing is saved — review/edit the draft, then POST it to /api/admin/tests
 *   to create it (unpublished), QA, and publish.
 *
 *   Body: { trackId? | trackSlug, skill, count?, topic?, partLabel?, extraInstructions? }
 */
const SKILLS: Skill[] = ['reading', 'listening', 'writing', 'speaking']

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminSupabase()

  let body: {
    trackId?: string; trackSlug?: string; skill?: string
    count?: number; topic?: string; partLabel?: string; extraInstructions?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if ((!body.trackId && !body.trackSlug) || !body.skill || !SKILLS.includes(body.skill as Skill)) {
    return NextResponse.json({ error: 'trackId/trackSlug and a valid skill are required' }, { status: 400 })
  }

  let trackQuery = supabase
    .from('exam_tracks')
    .select('slug, name, level_label, exam:exams ( slug, name )')
  trackQuery = body.trackId ? trackQuery.eq('id', body.trackId) : trackQuery.eq('slug', body.trackSlug!)
  const { data: track, error } = await trackQuery.single()
  if (error || !track) return NextResponse.json({ error: 'Track not found' }, { status: 404 })

  const exam = track.exam as { slug?: string; name?: string } | null

  try {
    const draft = await generateForm({
      examSlug: exam?.slug ?? '',
      examName: exam?.name ?? '',
      trackSlug: track.slug,
      trackName: track.name,
      levelLabel: track.level_label || track.name,
      skill: body.skill as Skill,
      count: body.count ?? 5,
      topic: body.topic,
      partLabel: body.partLabel,
      extraInstructions: body.extraInstructions,
    })
    return NextResponse.json(draft)
  } catch (err) {
    console.error('Generation failed:', err)
    return NextResponse.json({ error: 'Generation failed — please try again' }, { status: 500 })
  }
}
