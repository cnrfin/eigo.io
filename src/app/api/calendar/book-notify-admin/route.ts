import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminBatchBookingNotification } from '@/lib/email'

// POST /api/calendar/book-notify-admin
// Sends a single admin email summarising multiple bookings
// Body: { lessons: [{ lessonDate, lessonTime, durationMinutes }] }
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lessons } = await request.json()

    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
      return NextResponse.json({ error: 'lessons array is required' }, { status: 400 })
    }

    const studentName = user.user_metadata?.full_name || user.email || 'Unknown'
    const studentEmail = user.email || ''

    await sendAdminBatchBookingNotification({
      studentName,
      studentEmail,
      lessons,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send batch admin notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
