import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'
import { TEST_ASSETS_BUCKET } from '@/lib/test-grading'

export const maxDuration = 60

/**
 * POST /api/tests/attempts/[id]/speaking   (multipart/form-data)
 *   Fields: audio (file), questionId (string)
 *
 * Captures a spoken answer for a speaking_response question: uploads the
 * recording to the private test-assets bucket and saves the response
 * (audio_asset_id). The recording is graded from the AUDIO at submit time
 * (so pronunciation/fluency count) — there's no transcript step here, and none
 * is shown to the student.
 */
const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth
  const { id: attemptId } = await params

  // Verify the attempt belongs to the caller and is still open.
  const { data: attempt, error: aErr } = await supabase
    .from('test_attempts').select('id, user_id, form_id, status').eq('id', attemptId).single()
  if (aErr || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.user_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'Attempt is already submitted' }, { status: 409 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }
  const audio = form.get('audio')
  const questionId = form.get('questionId')
  if (!(audio instanceof File) || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'audio file and questionId are required' }, { status: 400 })
  }

  // Confirm the question is a speaking question belonging to this attempt's form.
  const { data: question } = await supabase
    .from('questions')
    .select('id, question_type, group:question_groups ( section:sections ( form_id ) )')
    .eq('id', questionId)
    .single()
  const qFormId = (question?.group as { section?: { form_id?: string } } | null)?.section?.form_id
  if (!question || qFormId !== attempt.form_id) {
    return NextResponse.json({ error: 'Question not part of this test' }, { status: 400 })
  }
  if (question.question_type !== 'speaking_response') {
    return NextResponse.json({ error: 'Not a speaking question' }, { status: 400 })
  }

  const buffer = Buffer.from(await audio.arrayBuffer())
  if (buffer.length === 0) return NextResponse.json({ error: 'Empty recording' }, { status: 400 })

  const ext = EXT_BY_MIME[audio.type] ?? 'webm'
  const path = `speaking/${attemptId}/${questionId}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(TEST_ASSETS_BUCKET)
    .upload(path, buffer, { contentType: audio.type || 'audio/webm', upsert: true })
  if (upErr) {
    console.error('Speaking upload failed:', upErr)
    return NextResponse.json({ error: 'Could not save the recording' }, { status: 500 })
  }

  const { data: asset, error: assetErr } = await supabase
    .from('assets')
    .insert({ type: 'audio', storage_path: path, transcript: '', alt_text: 'speaking response' })
    .select('id')
    .single()
  if (assetErr || !asset) {
    return NextResponse.json({ error: 'Could not register the recording' }, { status: 500 })
  }

  const { error: respErr } = await supabase
    .from('responses')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, audio_asset_id: asset.id, transcript: '', text_response: '', updated_at: new Date().toISOString() },
      { onConflict: 'attempt_id,question_id' }
    )
  if (respErr) {
    console.error('Saving speaking response failed:', respErr)
    return NextResponse.json({ error: 'Could not save the response' }, { status: 500 })
  }

  return NextResponse.json({ saved: true, audio_asset_id: asset.id })
}
