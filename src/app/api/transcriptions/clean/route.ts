import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cleanTranscript } from '@/lib/lesson-ai'

/**
 * POST /api/transcriptions/clean
 * Body: { bookingId: string }
 *
 * Cleans up a raw transcript using OpenAI. Requires:
 * - The booking must have a cached transcript_text
 * - The booking must have a lesson summary (lesson_summaries row exists)
 *
 * Returns { status: 'ready', cleanedContent: string } on success
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

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

    // Fetch booking with transcript
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .select('id, user_id, transcript_text, cleaned_transcript')
      .eq('id', bookingId)
      .single()

    if (dbError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Already cleaned? Return it
    if (booking.cleaned_transcript) {
      return NextResponse.json({ status: 'ready', cleanedContent: booking.cleaned_transcript })
    }

    // Must have raw transcript cached
    if (!booking.transcript_text) {
      return NextResponse.json(
        { error: 'No transcript available. Generate the transcript first.' },
        { status: 400 },
      )
    }

    // Must have a summary (ensures mistakes are captured from the raw version first)
    const { data: summary } = await supabase
      .from('lesson_summaries')
      .select('id')
      .eq('booking_id', bookingId)
      .single()

    if (!summary) {
      return NextResponse.json(
        { error: 'Generate a summary first so mistakes are captured from the original transcript.' },
        { status: 400 },
      )
    }

    // Clean the transcript
    const cleaned = await cleanTranscript(booking.transcript_text)

    // Save to Supabase
    await supabase
      .from('bookings')
      .update({ cleaned_transcript: cleaned })
      .eq('id', bookingId)

    return NextResponse.json({ status: 'ready', cleanedContent: cleaned })
  } catch (err) {
    console.error('Transcript cleanup error:', err)
    return NextResponse.json({ error: 'Failed to clean transcript' }, { status: 500 })
  }
}
