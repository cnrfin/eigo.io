import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getRecordings, createTranscription, getTranscription, getTranscriptionAccessLink } from '@/lib/whereby'

/**
 * Helper: check transcription status, fetch content if ready, and cache in Supabase.
 */
async function resolveTranscription(
  transcriptionId: string,
  bookingId: string,
  supabase: SupabaseClient,
): Promise<{ status: string; content?: string; cleanedContent?: string; message?: string }> {
  const transcription = await getTranscription(transcriptionId)

  if (!transcription) {
    console.error('getTranscription returned null for:', transcriptionId)
    await supabase.from('bookings').update({ transcription_id: null }).eq('id', bookingId)
    return { status: 'error', message: 'Could not check transcription — tap to retry' }
  }

  if (transcription.state === 'finished' || transcription.state === 'ready') {
    const accessLink = await getTranscriptionAccessLink(transcriptionId)
    if (accessLink) {
      const contentRes = await fetch(accessLink)
      const content = await contentRes.text()

      // Cache transcript text in Supabase so we don't need to fetch from Whereby again
      await supabase
        .from('bookings')
        .update({ transcript_text: content })
        .eq('id', bookingId)

      // Check if we already have a cleaned version
      const { data: booking } = await supabase
        .from('bookings')
        .select('cleaned_transcript')
        .eq('id', bookingId)
        .single()

      return {
        status: 'ready',
        content,
        cleanedContent: booking?.cleaned_transcript || undefined,
      }
    }
    return { status: 'error', message: 'Could not fetch transcript content' }
  }

  if (transcription.state === 'failed') {
    await supabase.from('bookings').update({ transcription_id: null }).eq('id', bookingId)
    return { status: 'failed', message: 'Transcription failed — tap to retry' }
  }

  return { status: 'processing' }
}

/**
 * GET /api/transcriptions?bookingId=xxx
 *
 * On-demand transcription flow:
 * 1. If transcript_text cached in Supabase → return immediately (no Whereby call)
 * 2. If booking has a transcription_id → check status in Whereby → cache & return if ready
 * 3. If no transcription_id → find recording → request transcription → cache & return
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const bookingId = new URL(request.url).searchParams.get('bookingId')

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

  // Use service role to read/write (RLS may not expose all columns)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch the booking
  const { data: booking, error: dbError } = await supabase
    .from('bookings')
    .select('id, user_id, whereby_room_url, transcription_id, transcript_text, cleaned_transcript')
    .eq('id', bookingId)
    .single()

  if (dbError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Verify ownership
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // ── Case 0: Transcript already cached in Supabase — instant return ──
  if (booking.transcript_text) {
    return NextResponse.json({
      status: 'ready',
      content: booking.transcript_text,
      cleanedContent: booking.cleaned_transcript || undefined,
    })
  }

  if (!booking.whereby_room_url) {
    return NextResponse.json({ error: 'No recording available for this lesson' }, { status: 404 })
  }

  try {
    // ── Case 1: We already have a transcription ID stored ──
    if (booking.transcription_id) {
      const result = await resolveTranscription(booking.transcription_id, bookingId, supabase)
      return NextResponse.json(result)
    }

    // ── Case 2: No transcription yet — find recording and request one ──
    const roomName = new URL(booking.whereby_room_url).pathname
    const recordings = await getRecordings(roomName)

    if (recordings.length === 0) {
      return NextResponse.json({ status: 'no_recording', message: 'No recording found for this lesson' })
    }

    // Request transcription (handles 403 "already exists" by looking it up)
    const recordingId = recordings[0].recordingId
    const transcriptionId = await createTranscription(recordingId, roomName)

    if (!transcriptionId) {
      return NextResponse.json({ status: 'error', message: 'Could not start transcription' })
    }

    // Store the transcription ID
    await supabase
      .from('bookings')
      .update({ transcription_id: transcriptionId })
      .eq('id', bookingId)

    // Check immediately — it might already be finished
    const result = await resolveTranscription(transcriptionId, bookingId, supabase)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Transcription error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
