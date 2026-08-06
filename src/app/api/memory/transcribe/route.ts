import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
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

/**
 * POST /api/memory/transcribe
 *
 * Speech-to-text ONLY (no pronunciation scoring). The Memory feature just needs
 * to know WHAT the learner said so it can compare it to the target sentence and,
 * if it differs, gently ask "did you mean …?".
 *
 * Request: multipart/form-data
 *   - audio:    the recorded clip (m4a / mp4 / wav …)
 *   - language: optional ISO code to bias recognition (default 'en')
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
  const language = (form.get('language') as string | null)?.trim() || 'en'

  try {
    const file = await toFile(Buffer.from(await audio.arrayBuffer()), 'clip.m4a', {
      type: audio.type || 'audio/m4a',
    })
    const res = await openai().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      // Nudge Whisper toward a clean, punctuated short English sentence.
      prompt: 'A short spoken English sentence.',
    })
    return NextResponse.json({ text: (res.text ?? '').trim() })
  } catch (err) {
    console.error('memory/transcribe error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
