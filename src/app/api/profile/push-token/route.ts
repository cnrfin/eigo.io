import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/profile/push-token
// Body: { token: string, deviceId?: string, platform?: string }
// Registers or updates an Expo push token for the authenticated user.
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const body = await request.json()
    const { token, deviceId, platform } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

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

    // Upsert the push token (unique on user_id + token)
    const { error: upsertError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          device_id: deviceId || null,
          platform: platform || 'ios',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      )

    if (upsertError) {
      console.error('Push token upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save push token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push token registration error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/profile/push-token
// Body: { token: string }
// Removes a push token (e.g. on sign-out).
export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

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

    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push token delete error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
