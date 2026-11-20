import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

/**
 * POST /api/admin/bookings/[id]/no-show   { on: boolean }
 * Admin only. Marks a past lesson as missed (no_show) or undoes it.
 *
 * Lessons held on Whereby record no attendance, so they stay "confirmed" whether
 * or not the student came; this is how a missed one gets flagged afterwards. A
 * no-show is left out of speaking time and lesson counts (app and web) and shows
 * as "Missed" in History. Undoing sets it back to confirmed. Minutes aren't
 * refunded either way (same as the classroom's own no-show button).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await anon.auth.getUser(token)
  if (authError || !user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let on: boolean
  try {
    on = !!(await request.json()).on
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: booking } = await db.from('bookings').select('id, date, start_time, status').eq('id', id).single()
  if (!booking) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  if (new Date(`${booking.date}T${booking.start_time}+09:00`) > new Date()) {
    return NextResponse.json({ error: "This lesson hasn't started yet" }, { status: 400 })
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: on ? 'no_show' : 'confirmed' })
    .eq('id', id)
    .in('status', on ? ['confirmed', 'completed'] : ['no_show'])
    .select('id, status')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not update the lesson' }, { status: 500 })

  return NextResponse.json({ ok: true, status: updated?.status ?? booking.status })
}
