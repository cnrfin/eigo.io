import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMinuteBalance } from '@/lib/subscription'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

/**
 * GET /api/admin/students
 * List all students who have bookings, including their minute balance.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get all profiles that have at least one booking
  const { data: bookings } = await supabase
    .from('bookings')
    .select('user_id')
    .order('date', { ascending: false })

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ students: [] })
  }

  const uniqueUserIds = [...new Set(bookings.map(b => b.user_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url')
    .in('id', uniqueUserIds)

  // Fetch minute balance for each student
  const students = await Promise.all(
    (profiles || []).map(async (p) => {
      const balance = await getMinuteBalance(p.id)
      return {
        ...p,
        minutesRemaining: balance?.minutesRemaining ?? null,
        minutesPerMonth: balance?.minutesPerMonth ?? null,
      }
    })
  )

  return NextResponse.json({ students })
}
