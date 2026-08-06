import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { spawn } from 'node:child_process'
import { writeFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { authenticate } from '@/lib/test-auth'

export const runtime = 'nodejs'
export const maxDuration = 30

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// Reuse the audio model the rest of the app already runs (gpt-audio). The
// transcription-only SKUs (whisper-1 / gpt-4o-*-transcribe) aren't enabled on
// this project — chat/audio here is gpt-5.4-mini / gpt-audio.
const AUDIO_MODEL = process.env.OPENAI_AUDIO_MODEL || 'gpt-audio'

function ffmpegPath(): string {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg'
}

/**
 * Transcode an audio clip to mono 16kHz mp3.
 *
 * IMPORTANT: we transcode from a TEMP FILE, not stdin. The phone records m4a
 * (an MP4 container), which ffmpeg can't demux from a non-seekable pipe — the
 * moov atom can live at the end of the file. Writing to disk gives ffmpeg a
 * seekable input. (The web tests pipe webm, which is streamable, so they can
 * use stdin — this route can't.)
 */
async function transcodeToMp3(input: Buffer): Promise<Buffer> {
  const tmpIn = join(tmpdir(), `mem-${randomUUID()}`)
  await writeFile(tmpIn, input)
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const ff = spawn(ffmpegPath(), ['-i', tmpIn, '-f', 'mp3', '-ac', '1', '-ar', '16000', '-b:a', '64k', 'pipe:1'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const out: Buffer[] = []
      const err: Buffer[] = []
      ff.stdout.on('data', (c) => out.push(c as Buffer))
      ff.stderr.on('data', (c) => err.push(c as Buffer))
      ff.on('error', reject)
      ff.on('close', (code) =>
        code === 0
          ? resolve(Buffer.concat(out))
          : reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(err).toString().slice(-400)}`)),
      )
    })
  } finally {
    unlink(tmpIn).catch(() => {})
  }
}

/**
 * POST /api/memory/transcribe
 *
 * Speech-to-text ONLY (no pronunciation scoring). The Memory feature just needs
 * to know WHAT the learner said so it can compare it to the target sentence and,
 * if it differs, gently ask "did you mean …?".
 *
 * Request: multipart/form-data { audio: <m4a/mp4/webm clip> }
 * Response: { text: string }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const audio = form.get('audio')
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
  }

  try {
    const input = Buffer.from(await audio.arrayBuffer())
    if (input.length === 0) return NextResponse.json({ error: 'Empty recording' }, { status: 400 })

    const mp3 = await transcodeToMp3(input)
    const mp3Base64 = mp3.toString('base64')

    const messages = [
      {
        role: 'system',
        content:
          'You are a speech-to-text engine. Transcribe the English audio EXACTLY as spoken. ' +
          'Return ONLY the transcript text — no quotation marks, no commentary, no explanation. ' +
          'If the audio is empty, silent or unintelligible, return an empty string.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe this audio.' },
          { type: 'input_audio', input_audio: { data: mp3Base64, format: 'mp3' } },
        ],
      },
    ]

    const completion = (await openai().chat.completions.create({
      model: AUDIO_MODEL,
      modalities: ['text'],
      messages,
    } as unknown as Parameters<OpenAI['chat']['completions']['create']>[0])) as OpenAI.Chat.Completions.ChatCompletion

    const text = (completion.choices[0]?.message?.content ?? '').trim()
    return NextResponse.json({ text })
  } catch (err) {
    console.error('memory/transcribe error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number })?.status ?? null
    const code = (err as { code?: string })?.code ?? null
    return NextResponse.json({ error: 'Transcription failed', detail, status, code }, { status: 500 })
  }
}
