import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import OpenAI, { toFile } from 'openai'

/**
 * Lesson transcription via the OpenAI Audio API.
 *
 * Replaces Whereby's recording-transcription ($0.024/min) with the OpenAI
 * transcription endpoint (gpt-4o-mini-transcribe, ~$0.003/min). We already hold
 * the recording in Whereby; here we pull it, strip it to a small mono audio
 * file, and hand that to OpenAI. The recording itself still lives in Whereby —
 * only the transcription vendor changes.
 *
 * Model is env-overridable so it can move to gpt-4o-transcribe or whisper-1
 * without a code change. It must be added to the OpenAI project's allowed
 * models (Project Settings -> Limits) or the call returns 403 model_not_found.
 */

const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'

// OpenAI rejects uploads over 25 MB. 16 kHz mono at 32 kbps is ~0.24 MB/min, so
// a 75-minute lesson (the longest bookable) is ~18 MB — comfortably under. The
// guard turns an oversized file into a clear error instead of a cryptic 413.
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// Same resolution as the audio-extract route: bundled static binary on Vercel,
// else the system PATH in local dev.
function getFfmpegPath(): string {
  const bundled = join(/*turbopackIgnore: true*/ process.cwd(), 'bin', 'ffmpeg')
  if (existsSync(bundled)) return bundled
  try {
    return execFileSync('/usr/bin/env', ['which', 'ffmpeg'], { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('FFmpeg not found — install via brew or run scripts/install-ffmpeg.sh')
  }
}

/**
 * Download a Whereby recording (via its temporary access link) and transcode to
 * a compact, transcription-friendly audio buffer: mono, 16 kHz, 32 kbps MP3.
 * The video track is dropped and the bitrate is low on purpose — speech
 * recognition doesn't benefit from more, and it keeps us under the upload cap.
 */
export async function extractCompactAudio(accessLink: string): Promise<Buffer> {
  const ffmpegBin = getFfmpegPath()

  const res = await fetch(accessLink)
  if (!res.ok || !res.body) throw new Error(`recording fetch failed: HTTP ${res.status}`)

  const input = Readable.fromWeb(res.body as import('stream/web').ReadableStream)
  const ff = spawn(
    ffmpegBin,
    ['-i', 'pipe:0', '-vn', '-ac', '1', '-ar', '16000', '-codec:a', 'libmp3lame', '-b:a', '32k', '-f', 'mp3', 'pipe:1'],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  )

  // If ffmpeg rejects the container and closes stdin early, writing to the pipe
  // raises EPIPE. Without a handler that becomes an unhandled 'error' that reads
  // as a mysterious failure — swallow it and let the exit code carry the reason.
  ff.stdin.on('error', () => {})
  input.on('error', () => { try { ff.stdin.destroy() } catch { /* already gone */ } })
  input.pipe(ff.stdin)

  const chunks: Buffer[] = []
  let size = 0
  let stderr = ''
  ff.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

  return new Promise<Buffer>((resolve, reject) => {
    ff.stdout.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_UPLOAD_BYTES) {
        ff.kill('SIGKILL')
        reject(new Error('recording too long to transcribe automatically'))
        return
      }
      chunks.push(c)
    })
    ff.on('error', (e) => reject(new Error(`ffmpeg spawn failed: ${e.message}`)))
    ff.on('close', (code) => {
      // No audio out means ffmpeg couldn't decode the recording — the stderr
      // tail says why (bad container, no audio track, unseekable pipe, …).
      if (chunks.length === 0) {
        return reject(new Error(`ffmpeg produced no audio (exit ${code}): ${stderr.slice(-400)}`))
      }
      if (code !== 0 && code !== null) {
        return reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`))
      }
      resolve(Buffer.concat(chunks))
    })
  })
}

/**
 * Transcribe a compact audio buffer. Language is left to auto-detect because
 * lessons mix English and Japanese; the prompt nudges proper-noun spelling. On
 * success returns the raw transcript text (the caller runs the clean-up pass).
 */
export async function transcribeAudio(audio: Buffer): Promise<string> {
  const file = await toFile(audio, 'lesson.mp3', { type: 'audio/mpeg' })
  const result = await openai().audio.transcriptions.create({
    model: TRANSCRIBE_MODEL,
    file,
    prompt:
      'A one-to-one English lesson between a British tutor and a Japanese learner. ' +
      'The audio may contain Japanese words and Japanese names.',
  })
  return (result.text ?? '').trim()
}
