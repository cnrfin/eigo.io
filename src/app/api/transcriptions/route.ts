import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRecordings, getRecordingAccessLink } from '@/lib/whereby'
import { extractCompactAudio, stripPromptEcho, transcribeAudio } from '@/lib/transcribe'
import { getUserPermissions } from '@/lib/user-permissions'

// Transcription pulls the recording, transcodes it and calls OpenAI, so it
// needs the long timeout (matches the audio-extract route).
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * GET /api/transcriptions?bookingId=xxx[&cachedOnly=1]
 *
 * On-demand transcription (OpenAI, not Whereby):
 * 1. If transcript_text is cached in Supabase → return it immediately.
 * 2. If `cachedOnly` is set (hover prefetch) → return not_cached, never transcribe.
 *    This stops a hover from generating a paid transcript nobody reads.
 * 3. Otherwise (explicit open) → pull the recording, transcribe it, cache & return.
 *
 * A recording with no speech (or only the model echoing its prompt back, which
 * happens on very short or silent audio) returns status 'too_short', so the
 * apps can say so instead of showing an error or an invented transcript.
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

  // Per-user feature permission: transcripts can be switched off for a user's
  // plan (uses the same service-role client already created above).
  if (!(await getUserPermissions(supabase, booking.user_id)).transcription_enabled) {
    return NextResponse.json({ status: 'disabled', message: 'Transcripts are not included in this plan' }, { status: 403 })
  }

  const TOO_SHORT = { status: 'too_short', message: 'This recording is too short to transcribe' }

  // ── Case 0: Transcript already cached in Supabase — instant return ──
  // (an earlier prompt echo cached before the check existed counts as no speech)
  if (booking.transcript_text && !stripPromptEcho(booking.transcript_text)) {
    return NextResponse.json(TOO_SHORT)
  }
  if (booking.transcript_text) {
    return NextResponse.json({
      status: 'ready',
      content: booking.transcript_text,
      cleanedContent: booking.cleaned_transcript || undefined,
    })
  }

  // Hover prefetch: only serve an already-transcribed lesson; never kick off a
  // new (paid, ~1-minute) transcription. Explicit opens omit cachedOnly.
  const cachedOnly = new URL(request.url).searchParams.get('cachedOnly')
  if (cachedOnly) {
    return NextResponse.json({ status: 'not_cached' })
  }

  if (!booking.whereby_room_url) {
    return NextResponse.json({ status: 'no_recording', message: 'No recording available for this lesson' })
  }

  try {
    // Find the recording for this lesson's room.
    const roomName = new URL(booking.whereby_room_url).pathname
    const recordings = await getRecordings(roomName)
    if (recordings.length === 0) {
      return NextResponse.json({ status: 'no_recording', message: 'No recording found for this lesson' })
    }

    // A lesson can have several recordings (recording stopped and restarted);
    // use the longest, not whichever Whereby lists first, which may be a fragment.
    const length = (r: (typeof recordings)[number]) => (Date.parse(r.endDate) || 0) - (Date.parse(r.startDate) || 0)
    const recording = recordings.reduce((best, r) => (length(r) > length(best) ? r : best))
    const accessLink = await getRecordingAccessLink(recording.recordingId)
    if (!accessLink) {
      return NextResponse.json({ status: 'error', message: 'Could not access the recording' })
    }

    // Pull the recording, strip to compact audio, transcribe via OpenAI.
    const audio = await extractCompactAudio(accessLink)
    const content = await transcribeAudio(audio)
    if (!content) {
      return NextResponse.json(TOO_SHORT)
    }

    // Cache so re-opens (and the summary step) never re-transcribe.
    await supabase.from('bookings').update({ transcript_text: content }).eq('id', bookingId)

    return NextResponse.json({ status: 'ready', content })
  } catch (err) {
    console.error('Transcription error:', err)
    // TEMPORARY diagnostic: surface the real cause to the client so we can see
    // why it fails (model access, ffmpeg, timeout, …) without server logs. Remove
    // the detail fields once the swap is confirmed working.
    const detail = err instanceof Error ? err.message : String(err)
    const apiStatus = (err as { status?: number })?.status ?? null
    const apiCode = (err as { code?: string })?.code ?? null
    return NextResponse.json({ status: 'error', message: 'Could not transcribe this lesson', detail, apiStatus, apiCode })
  }
}
