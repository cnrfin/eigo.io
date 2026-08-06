import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authenticate } from '@/lib/test-auth'
import { transcodeToMp3 } from '@/lib/test-speaking'

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
 * Request: multipart/form-data { audio: <m4a/mp4/webm clip> }
 * Response: { text: string }
 *
 * The clip is transcoded to mp3 (bundled ffmpeg) and transcribed by gpt-audio —
 * the same pipeline the speaking tests use, so it works with this project's
 * model access.
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

    // gpt-audio accepts mp3/wav — transcode the m4a clip first.
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
    // Surface the real cause to the client (dev prototype) so we can diagnose
    // without reading Vercel logs.
    const detail = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number })?.status ?? null
    const code = (err as { code?: string })?.code ?? null
    return NextResponse.json({ error: 'Transcription failed', detail, status, code }, { status: 500 })
  }
}
