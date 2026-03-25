import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/profile/update
// Body: { display_name: string }
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const body = await request.json()
    const { display_name, contact_email } = body

    // At least one field must be provided
    if (!display_name && contact_email === undefined) {
      return NextResponse.json(
        { error: 'display_name or contact_email is required' },
        { status: 400 }
      )
    }

    if (display_name && (typeof display_name !== 'string' || display_name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'display_name must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate contact_email format if provided (allow empty string to clear it)
    if (contact_email !== undefined && contact_email !== '' && contact_email !== null) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(contact_email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Authenticate user via Supabase using the anon key + user's JWT
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

    // Build the update payload
    const updateData: Record<string, string | null> = {}
    if (display_name) updateData.display_name = display_name.trim()
    if (contact_email !== undefined) {
      updateData.contact_email = contact_email === '' ? null : contact_email
    }

    // Update the user's profile in the profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
