import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/test-auth'

/**
 * POST /api/tests/report
 *   Student-reported issue with a test question. Writes a support_tickets row
 *   (category 'bug') with the message + attempt/question context, reusing the
 *   existing ticket pipeline (which emails the admin on insert).
 *   Body: { message: string, attemptId?: string, questionId?: string, formSlug?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  let body: { message?: string; attemptId?: string; questionId?: string; formSlug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (message.length < 3) {
    return NextResponse.json({ error: 'Please describe the issue' }, { status: 400 })
  }

  const { error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    email: user.email ?? null,
    category: 'bug',
    subject: 'Practice test issue report',
    body: message,
    device_info: {
      source: 'practice_test',
      attempt_id: body.attemptId ?? null,
      question_id: body.questionId ?? null,
      form_slug: body.formSlug ?? null,
    },
  })

  if (error) {
    console.error('Failed to save report:', error)
    return NextResponse.json({ error: 'Could not submit your report' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
