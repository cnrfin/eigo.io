import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { lookupWord } from '@/lib/classroom/ai'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/lookup   { term, sentence }
 * Explains a tapped word or phrase (up to 6 words) as used in its sentence:
 * { term, pos, ja, meaning, example }. Words already in the course's
 * vocabulary tables are answered by the classroom itself; this is for the rest.
 * Translations go into the student's own language (profiles.native_language).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx

  let body: { term?: unknown; sentence?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const term = typeof body.term === 'string' ? body.term.trim() : ''
  const sentence = typeof body.sentence === 'string' ? body.sentence : ''
  if (!term || term.length > 80 || term.split(/\s+/).length > 6) return json(400, { error: 'Pick up to 6 words' })

  const { data: student } = await getSupabaseAdmin()
    .from('profiles')
    .select('native_language')
    .eq('id', ctx.booking.user_id)
    .maybeSingle()
  try {
    const result = await lookupWord(term, sentence, student?.native_language || 'ja')
    return json(200, result)
  } catch (e) {
    console.error('classroom lookup failed:', e)
    return json(502, { error: 'Lookup failed' })
  }
}
