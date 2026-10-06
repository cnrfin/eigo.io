import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { bookingStart } from '@/lib/classroom/booking-window'
import { loadClassroom, personName, type ChatItem } from '@/lib/classroom/server'

const ADMIN_EMAIL = 'cnrfin93@gmail.com'

/**
 * GET /api/classroom/[id]/chat
 * The lesson chat as a plain-text file, built from bookings.chat_log. Used by
 * the lesson-complete screen now, and by the lesson summary page later.
 * Nothing is stored: the text is generated on each download.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  const { booking } = ctx

  const db = getSupabaseAdmin()
  const [{ data: student }, { data: teacher }] = await Promise.all([
    db.from('profiles').select('display_name, email').eq('id', booking.user_id).maybeSingle(),
    db.from('profiles').select('display_name, email').eq('email', ADMIN_EMAIL).maybeSingle(),
  ])
  const names = {
    student: personName(student?.display_name, student?.email, 'Student'),
    teacher: personName(teacher?.display_name, teacher?.email, 'Connor'),
  }

  const start = bookingStart(booking)
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleString('en-GB', { timeZone: 'Asia/Tokyo', ...opts })
  const lines = [
    'eigo.io lesson chat',
    `${fmt(start, { dateStyle: 'long', timeStyle: 'short' })} (Japan time) · ${booking.duration_minutes} minutes`,
    '',
  ]
  for (const m of (booking.chat_log ?? []) as ChatItem[]) {
    const time = fmt(new Date(m.at), { hour: '2-digit', minute: '2-digit' })
    const body = m.file ? `[file] ${m.file.name}` : (m.text ?? '')
    lines.push(`[${time}] ${names[m.from]}: ${body.replace(/\n/g, '\n    ')}`)
  }
  if (!booking.chat_log?.length) lines.push('(No messages in this lesson.)')

  const day = booking.date
  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="eigo-lesson-chat-${day}.txt"`,
      'Cache-Control': 'no-store',
    },
  })
}
