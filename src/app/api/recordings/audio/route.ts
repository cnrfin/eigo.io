import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRecordings, getRecordingAccessLink } from '@/lib/whereby'
import { getUserPermissions } from '@/lib/user-permissions'

// GET /api/recordings/audio?bookingId=xxx
// Returns a temporary access link for the lesson recording
export async function GET(request: NextRequest) {
  const bookingId = new URL(request.url).searchParams.get('bookingId')
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  // Verify auth
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch booking and verify ownership
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id, whereby_room_url')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.user_id !== user.id) {
    // Allow admins to access any recording
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  if (!booking.whereby_room_url) {
    return NextResponse.json({ error: 'No recording available for this lesson' }, { status: 404 })
  }

  // Per-user feature permission: if the lesson owner's plan doesn't include
  // recordings, don't serve one (the room was created without recording anyway).
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (!(await getUserPermissions(svc, booking.user_id)).recordings_enabled) {
    return NextResponse.json({ error: 'Recordings are not included in this plan', code: 'feature_disabled' }, { status: 403 })
  }

  try {
    // Extract room name from URL
    const roomName = new URL(booking.whereby_room_url).pathname

    // Get recordings for this room
    const recordings = await getRecordings(roomName)
    if (!recordings.length) {
      return NextResponse.json({ error: 'No recording found' }, { status: 404 })
    }

    // Get access link for the first (most recent) recording
    const accessLink = await getRecordingAccessLink(recordings[0].recordingId)
    if (!accessLink) {
      return NextResponse.json({ error: 'Could not generate access link' }, { status: 500 })
    }

    return NextResponse.json({ accessLink })
  } catch (err) {
    console.error('Failed to fetch recording:', err)
    return NextResponse.json({ error: 'Failed to fetch recording' }, { status: 500 })
  }
}
