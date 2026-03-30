import { NextRequest, NextResponse } from 'next/server'
import { sendAdminSupportTicketNotification } from '@/lib/email'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/webhooks/support-ticket
 *
 * Called by Supabase Database Webhook when a new row is inserted
 * into the `support_tickets` table.
 *
 * Supabase sends a payload like:
 * {
 *   type: "INSERT",
 *   table: "support_tickets",
 *   record: { id, user_id, email, category, subject, body, device_info, ... },
 *   schema: "public",
 *   old_record: null
 * }
 */

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  // Verify the webhook is from Supabase
  if (WEBHOOK_SECRET) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const payload = await req.json()
    const record = payload.record

    if (!record) {
      return NextResponse.json({ error: 'No record in payload' }, { status: 400 })
    }

    // Look up the user's display name from profiles
    let studentName = 'Unknown user'
    const studentEmail = record.email || '—'

    if (record.user_id) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', record.user_id)
        .single()

      if (profile?.display_name) {
        studentName = profile.display_name
      }
    }

    await sendAdminSupportTicketNotification({
      ticketId: record.id,
      studentName,
      studentEmail,
      category: record.category,
      subject: record.subject,
      body: record.body,
      deviceInfo: record.device_info,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Support ticket webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
