import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom, type ChatItem } from '@/lib/classroom/server'

const MAX_TEXT = 2000

/**
 * POST /api/classroom/[id]/messages   { text }
 * Appends one message to bookings.chat_log (atomic SQL append, so two people
 * typing at once can't overwrite each other) and returns it. The sender then
 * broadcasts it on the lesson's Realtime channel for instant display.
 * (File attachments come in a later step.)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx

  let text = ''
  try {
    text = String((await request.json()).text ?? '')
  } catch {
    return json(400, { error: 'Invalid body' })
  }
  text = text.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT)
  if (!text) return json(400, { error: 'Empty message' })

  const msg: ChatItem = { id: randomUUID(), from: ctx.access.role, text, at: new Date().toISOString() }
  const { error } = await getSupabaseAdmin().rpc('append_lesson_chat', { p_booking: ctx.booking.id, p_msg: msg })
  if (error) {
    console.error('append_lesson_chat failed:', error)
    return json(500, { error: 'Could not send' })
  }
  return json(200, { message: msg })
}
