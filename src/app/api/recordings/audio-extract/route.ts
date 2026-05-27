import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRecordings, getRecordingAccessLink } from '@/lib/whereby'
import { spawn, execSync } from 'node:child_process'
import { createWriteStream, existsSync, chmodSync } from 'node:fs'
import { Readable, PassThrough } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// Allow up to 5 minutes for long recordings
export const maxDuration = 300

// Static FFmpeg binary URL — John Van Sickle's widely-used static builds.
// These are standalone, dependency-free linux-x64 binaries that run on any
// glibc-based system including Vercel's Amazon Linux runtime.
const FFMPEG_URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
const FFMPEG_PATH = '/tmp/ffmpeg'

/**
 * Ensure FFmpeg is available. Checks in order:
 * 1. Already downloaded to /tmp (warm serverless instance)
 * 2. Available on system PATH (local dev, or hosts that ship it)
 * 3. Downloads a static linux-x64 build to /tmp (Vercel cold start)
 */
async function ensureFfmpeg(): Promise<string> {
  // Already downloaded on a previous invocation (warm lambda)
  if (existsSync(FFMPEG_PATH)) return FFMPEG_PATH

  // Available on system PATH (local dev with brew, etc.)
  try {
    const systemPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim()
    if (systemPath) return systemPath
  } catch { /* not on PATH */ }

  // Download static build to /tmp
  console.log('[audio-extract] Downloading static FFmpeg binary...')
  const res = await fetch(FFMPEG_URL)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download FFmpeg: ${res.status}`)
  }

  // The download is a .tar.xz archive. Pipe it through tar to extract
  // just the ffmpeg binary. tar reads from stdin (-f -), xz decompresses
  // (--xz), and --wildcards picks out the single binary we need.
  const tarPath = '/tmp/ffmpeg-download.tar.xz'
  const nodeStream = Readable.fromWeb(res.body as import('stream/web').ReadableStream)
  await pipeline(nodeStream, createWriteStream(tarPath))

  execSync(
    `cd /tmp && tar --xz -xf ffmpeg-download.tar.xz --wildcards '*/ffmpeg' --strip-components=1`,
    { timeout: 30_000 },
  )
  chmodSync(FFMPEG_PATH, 0o755)
  console.log('[audio-extract] FFmpeg ready at', FFMPEG_PATH)

  return FFMPEG_PATH
}

// GET /api/recordings/audio-extract?bookingId=xxx
// Fetches the lesson recording from Whereby, extracts audio via FFmpeg,
// and streams an mp3 back to the client as a download.
export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('bookingId')
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
    .select('id, user_id, date, whereby_room_url')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.user_id !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  if (!booking.whereby_room_url) {
    return NextResponse.json({ error: 'No recording available for this lesson' }, { status: 404 })
  }

  try {
    // Ensure FFmpeg is available (system or downloaded)
    const ffmpegBin = await ensureFfmpeg()

    // Get the temporary access link from Whereby
    const roomName = new URL(booking.whereby_room_url).pathname
    const recordings = await getRecordings(roomName)
    if (!recordings.length) {
      return NextResponse.json({ error: 'No recording found' }, { status: 404 })
    }

    const accessLink = await getRecordingAccessLink(recordings[0].recordingId)
    if (!accessLink) {
      return NextResponse.json({ error: 'Could not generate access link' }, { status: 500 })
    }

    // Fetch the video from Whereby
    const videoResponse = await fetch(accessLink)
    if (!videoResponse.ok || !videoResponse.body) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 })
    }

    // Convert the Web ReadableStream to a Node.js Readable
    const nodeReadable = Readable.fromWeb(videoResponse.body as import('stream/web').ReadableStream)

    // Spawn FFmpeg: read video from stdin, output mp3 to stdout
    const ffmpeg = spawn(ffmpegBin, [
      '-i', 'pipe:0',
      '-vn',
      '-codec:a', 'libmp3lame',
      '-b:a', '128k',
      '-f', 'mp3',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    // Pipe video data into FFmpeg's stdin
    nodeReadable.pipe(ffmpeg.stdin)
    nodeReadable.on('error', () => ffmpeg.stdin.destroy())

    // Collect stderr for error logging (don't expose to client)
    let stderrData = ''
    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      stderrData += chunk.toString()
    })

    // Pass FFmpeg's stdout through to the response
    const output = new PassThrough()
    ffmpeg.stdout.pipe(output)

    ffmpeg.on('error', (err) => {
      console.error('[audio-extract] FFmpeg spawn error:', err)
      output.destroy(err)
    })

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('[audio-extract] FFmpeg exited with code', code, stderrData.slice(-500))
      }
      output.end()
    })

    const filename = `eigo-lesson-${booking.date}.mp3`

    // Stream the mp3 back to the client
    return new Response(output as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[audio-extract] Failed:', err)
    return NextResponse.json({ error: 'Failed to extract audio' }, { status: 500 })
  }
}
