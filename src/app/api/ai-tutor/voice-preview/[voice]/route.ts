import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { COURSE_BUCKET } from '@/lib/classroom/courses'
import { pcmToWav, speakSample } from '@/lib/ai-tutor/openai'
import { ACCENT_RULE, TUTOR_VOICES, VOICE_SAMPLE_LINE } from '@/lib/ai-tutor/settings'

/**
 * GET /api/ai-tutor/voice-preview/:voice → { url }
 * The ▶ preview clip for a voice. Made once on first request (about a cent), kept in
 * the public slide-courses bucket under _voices/, then reused for everyone.
 * Changing VOICE_SAMPLE_LINE makes new clips automatically (the path includes its hash).
 */
export const maxDuration = 30

export async function GET(request: NextRequest, { params }: { params: Promise<{ voice: string }> }) {
  const h = request.headers.get('Authorization') ?? ''
  const v = h.startsWith('Bearer ') ? await verifySupabaseToken(h.slice(7)) : null
  if (!v?.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { voice } = await params
  if (!TUTOR_VOICES.some((x) => x.id === voice)) return NextResponse.json({ error: 'Unknown voice' }, { status: 404 })

  const tag = createHash('sha1').update('gpt-live|' + ACCENT_RULE + '|' + VOICE_SAMPLE_LINE).digest('hex').slice(0, 8)
  const path = `_voices/${voice}-${tag}.wav`
  const storage = getSupabaseAdmin().storage.from(COURSE_BUCKET)
  const url = storage.getPublicUrl(path).data.publicUrl

  const { data: existing } = await storage.list('_voices', { search: `${voice}-${tag}.wav`, limit: 1 })
  if (existing?.some((f) => f.name === `${voice}-${tag}.wav`)) return NextResponse.json({ url })

  try {
    const wav = pcmToWav(await speakSample(voice, VOICE_SAMPLE_LINE))
    const { error } = await storage.upload(path, wav, { contentType: 'audio/wav', cacheControl: '31536000', upsert: true })
    if (error) throw error
    return NextResponse.json({ url })
  } catch (e) {
    console.error('voice preview failed', voice, e)
    return NextResponse.json({ error: 'Preview unavailable' }, { status: 502 })
  }
}
