import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTranscription, getTranscriptionAccessLink } from '@/lib/whereby'
import { analyzeLesson, cleanTranscript } from '@/lib/lesson-ai'

/**
 * POST /api/lessons/analyze
 *
 * On-demand lesson analysis: fetches transcript, sends to AI, stores results.
 * Body: { bookingId: string }
 *
 * Returns existing analysis if already generated, otherwise creates new one.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: { bookingId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { bookingId } = body
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  // Fetch booking and verify ownership
  const { data: booking, error: dbError } = await supabase
    .from('bookings')
    .select('id, user_id, transcription_id, transcript_text, cleaned_transcript')
    .eq('id', bookingId)
    .single()

  if (dbError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Check if analysis already exists
  const { data: existingSummary } = await supabase
    .from('lesson_summaries')
    .select('*')
    .eq('booking_id', bookingId)
    .single()

  if (existingSummary) {
    // Also fetch existing phrases
    const { data: phrases } = await supabase
      .from('vocabulary_phrases')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      status: 'ready',
      summary: existingSummary,
      phrases: phrases || [],
    })
  }

  // Need to generate — get transcript text (prefer cached version in Supabase)
  try {
    let transcriptText = booking.transcript_text

    // Fallback: fetch from Whereby if not cached yet
    if (!transcriptText) {
      if (!booking.transcription_id) {
        return NextResponse.json({
          error: 'Transcript not available yet. Please generate the transcript first.',
        }, { status: 400 })
      }

      const transcription = await getTranscription(booking.transcription_id)
      if (!transcription || (transcription.state !== 'finished' && transcription.state !== 'ready')) {
        return NextResponse.json({
          error: 'Transcript is still processing. Please try again shortly.',
        }, { status: 400 })
      }

      const accessLink = await getTranscriptionAccessLink(booking.transcription_id)
      if (!accessLink) {
        return NextResponse.json({ error: 'Could not fetch transcript content' }, { status: 500 })
      }

      const contentRes = await fetch(accessLink)
      transcriptText = await contentRes.text()

      // Cache it for next time
      if (transcriptText) {
        await supabase.from('bookings').update({ transcript_text: transcriptText }).eq('id', bookingId)
      }
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      return NextResponse.json({
        error: 'Transcript too short to analyze',
      }, { status: 400 })
    }

    // Auto-generate cleaned transcript if it doesn't exist yet
    let cleanedTranscriptText = booking.cleaned_transcript || undefined
    if (!cleanedTranscriptText) {
      try {
        cleanedTranscriptText = await cleanTranscript(transcriptText)
        // Save immediately so it's not lost if the user leaves during analysis
        await supabase.from('bookings').update({ cleaned_transcript: cleanedTranscriptText }).eq('id', bookingId)
      } catch (cleanErr) {
        console.error('Auto-cleanup failed, proceeding with raw only:', cleanErr)
        // Continue with raw-only analysis — better than failing entirely
      }
    }

    // Analyze with AI — pass both raw and cleaned transcripts for best results
    const analysis = await analyzeLesson(transcriptText, cleanedTranscriptText)

    // Store summary
    const { data: summary, error: summaryError } = await supabase
      .from('lesson_summaries')
      .insert({
        booking_id: bookingId,
        user_id: user.id,
        summary_en: analysis.summary_en,
        summary_ja: analysis.summary_ja,
        key_topics: analysis.key_topics,
        mistake_patterns: analysis.mistake_patterns,
      })
      .select()
      .single()

    if (summaryError) {
      console.error('Failed to store summary:', summaryError)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    // Store vocabulary phrases
    const phrasesToInsert = analysis.vocabulary_phrases.map(v => ({
      booking_id: bookingId,
      user_id: user.id,
      phrase_en: v.phrase_en,
      example_en: v.example_en,
      translation_ja: v.translation_ja,
      explanation_ja: v.explanation_ja,
      explanation_en: v.explanation_en,
      category: v.category,
    }))

    let phrases: typeof phrasesToInsert = []
    if (phrasesToInsert.length > 0) {
      const { data: insertedPhrases, error: phrasesError } = await supabase
        .from('vocabulary_phrases')
        .insert(phrasesToInsert)
        .select()

      if (phrasesError) {
        console.error('Failed to store phrases:', phrasesError)
      } else {
        phrases = insertedPhrases || []
      }
    }

    return NextResponse.json({
      status: 'ready',
      summary,
      phrases,
    })
  } catch (err) {
    console.error('Lesson analysis error:', err)
    return NextResponse.json({ error: 'Analysis failed — please try again' }, { status: 500 })
  }
}

/**
 * GET /api/lessons/analyze?bookingId=xxx
 *
 * Check if analysis exists for a booking (lightweight check).
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

  const bookingId = new URL(request.url).searchParams.get('bookingId')
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: summary } = await supabase
    .from('lesson_summaries')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('user_id', user.id)
    .single()

  if (!summary) {
    return NextResponse.json({ status: 'not_generated' })
  }

  const { data: phrases } = await supabase
    .from('vocabulary_phrases')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    status: 'ready',
    summary,
    phrases: phrases || [],
  })
}
