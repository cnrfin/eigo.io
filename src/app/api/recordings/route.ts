import { NextRequest, NextResponse } from 'next/server'
import { getRecordingAccessLink } from '@/lib/whereby'

// GET /api/recordings?roomUrl=https://eigo.whereby.com/eigo-xxx
// Returns temporary access links for recordings of a given room
export async function GET(request: NextRequest) {
  const roomUrl = new URL(request.url).searchParams.get('roomUrl')

  if (!roomUrl) {
    return NextResponse.json({ error: 'roomUrl is required' }, { status: 400 })
  }

  const apiKey = process.env.WHEREBY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Whereby API not configured' }, { status: 500 })
  }

  try {
    // Extract room name from URL: https://eigo.whereby.com/eigo-xxx → /eigo-xxx
    const url = new URL(roomUrl)
    const roomName = url.pathname // e.g. "/eigo34beb552-5a85-451a-..."

    // Query recordings directly by roomName — no need to look up the meeting
    const recRes = await fetch(`https://api.whereby.dev/v1/recordings?roomName=${encodeURIComponent(roomName)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!recRes.ok) {
      console.error('Whereby recordings query failed:', recRes.status, await recRes.text())
      return NextResponse.json({ recordings: [] })
    }

    const recData = await recRes.json()
    const recordings = recData.results || []

    // Get access links for each recording
    const recordingsWithLinks = await Promise.all(
      recordings.map(async (rec: { recordingId: string; startDate: string; endDate: string }) => {
        const accessLink = await getRecordingAccessLink(rec.recordingId)
        return {
          recordingId: rec.recordingId,
          startDate: rec.startDate,
          endDate: rec.endDate,
          accessLink,
        }
      })
    )

    return NextResponse.json({ recordings: recordingsWithLinks })
  } catch (err) {
    console.error('Failed to fetch recordings:', err)
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 })
  }
}
