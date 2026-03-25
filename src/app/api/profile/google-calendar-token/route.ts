import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/profile/google-calendar-token
// Body: { refreshToken: string }
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { refreshToken, force } = body

    if (!refreshToken) {
      return NextResponse.json({ error: 'refreshToken is required' }, { status: 400 })
    }

    // Store token using service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // If not a forced connect (i.e. automatic from session), check if user
    // explicitly disconnected — don't overwrite their choice
    if (!force) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('google_calendar_connected')
        .eq('id', user.id)
        .single()

      if (profile?.google_calendar_connected === false) {
        return NextResponse.json({ skipped: true, reason: 'User explicitly disconnected' })
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_calendar_refresh_token: refreshToken,
        google_calendar_connected: true,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store Google Calendar token:', updateError)
      return NextResponse.json({ error: 'Failed to store token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Calendar token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profile/google-calendar-token — disconnect calendar
export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase
      .from('profiles')
      .update({
        google_calendar_refresh_token: null,
        google_calendar_connected: false,
      })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
