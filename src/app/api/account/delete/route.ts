import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// POST /api/account/delete
// Deletes the authenticated user's account and all associated data.
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const admin = getSupabaseAdmin()

    // Delete user data from related tables (order matters for foreign keys)
    await admin.from('push_tokens').delete().eq('user_id', userId)
    await admin.from('notification_preferences').delete().eq('user_id', userId)
    await admin.from('vocabulary_phrases').delete().eq('user_id', userId)
    await admin.from('support_tickets').delete().eq('user_id', userId)
    await admin.from('minute_usage').delete().eq('user_id', userId)
    await admin.from('subscriptions').delete().eq('user_id', userId)
    await admin.from('profiles').delete().eq('id', userId)

    // Finally, delete the auth user via admin API
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[Account Delete] Failed to delete auth user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    console.log(`[Account Delete] User ${userId} deleted successfully`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Account Delete] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
