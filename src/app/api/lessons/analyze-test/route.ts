import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeLesson } from '@/lib/lesson-ai'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

/**
 * POST /api/lessons/analyze-test
 *
 * Admin-only test endpoint: analyze raw transcript text without a booking.
 * Body: { transcript: string }
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Auth check
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin only
  if (!ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  let body: { transcript?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.transcript || body.transcript.trim().length < 50) {
    return NextResponse.json({ error: 'Transcript too short (min 50 chars)' }, { status: 400 })
  }

  try {
    const analysis = await analyzeLesson(body.transcript)

    return NextResponse.json({
      summary: {
        summary_en: analysis.summary_en,
        summary_ja: analysis.summary_ja,
        key_topics: analysis.key_topics,
        mistake_patterns: analysis.mistake_patterns,
      },
      phrases: analysis.vocabulary_phrases.map((v, i) => ({
        id: `test-${i}`,
        ...v,
      })),
    })
  } catch (err) {
    console.error('AI test error:', err)
    return NextResponse.json({ error: 'Analysis failed: ' + (err instanceof Error ? err.message : 'unknown') }, { status: 500 })
  }
}
