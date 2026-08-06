import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
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

/**
 * POST /api/memory/transcribe
 *
 * Speech-to-text ONLY (no pronunciation scoring). The Memory feature just needs
 * to know WHAT the learner said so it can compare it to the target sentence and,
 * if it differs, gently ask "did you mean …?".
 *
 * The client records WAV (16kHz mono LPCM) so we can hand it straight to
 * gpt-audio (which accepts wav/mp3) — no server-side transcode, no ffmpeg.
 *
 * Request: multipart/form-data { audio: <wav clip> }
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
    const buf = Buffer.from(await audio.arrayBuffer())
    if (buf.length === 0) return NextResponse.json({ error: 'Empty recording' }, { status: 400 })
    const base64 = buf.toString('base64')

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
          { type: 'input_audio', input_audio: { data: base64, format: 'wav' } },
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
    // Surface the real cause to the client (dev prototype) so we can diagnose.
    const detail = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number })?.status ?? null
    const code = (err as { code?: string })?.code ?? null
    return NextResponse.json({ error: 'Transcription failed', detail, status, code }, { status: 500 })
  }
}
