import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { translateMessage } from '@/lib/classroom/ai'
import { json, loadClassroom, type ChatItem } from '@/lib/classroom/server'

/**
 * POST /api/classroom/[id]/translate   { messageId }
 * Translates one of the teacher's chat messages into the student's language
 * (profiles.native_language). Cached per message text.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx

  let messageId = ''
  try {
    messageId = String((await request.json()).messageId ?? '')
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  const msg = ((ctx.booking.chat_log ?? []) as ChatItem[]).find((m) => m.id === messageId)
  if (!msg?.text) return json(404, { error: 'Message not found' })

  const { data: student } = await getSupabaseAdmin()
    .from('profiles')
    .select('native_language')
    .eq('id', ctx.booking.user_id)
    .maybeSingle()
  const lang = student?.native_language || 'ja'
  try {
    return json(200, { translation: await translateMessage(msg.text, lang), lang })
  } catch (e) {
    console.error('classroom translate failed:', e)
    return json(502, { error: 'Translation failed' })
  }
}
