import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const CAMPAIGN_ID = '50hours-2026'
const MAX_SPOTS = 50

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, english_level, recording_preference, notes } = body

    if (!name || !email || !password || !english_level || !recording_preference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()

    // Check remaining spots
    const { count } = await admin
      .from('campaign_signups')
      .select('*', { count: 'exact', head: true })
      .eq('campaign', CAMPAIGN_ID)

    if (count !== null && count >= MAX_SPOTS) {
      return NextResponse.json(
        { error: 'Sorry, all spots have been filled.' },
        { status: 409 }
      )
    }

    // Check if email already signed up for this campaign
    const { data: existingUser } = await admin
      .from('profiles')
      .select('id, campaign_source')
      .eq('email', email)
      .single()

    if (existingUser?.campaign_source === CAMPAIGN_ID) {
      return NextResponse.json(
        { error: 'This email has already signed up for the campaign.' },
        { status: 409 }
      )
    }

    // Create the user account via Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: name.trim(),
        full_name: name.trim(),
      },
    })

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in at eigo.io instead.' },
          { status: 409 }
        )
      }
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Set campaign_source on profile
    await admin
      .from('profiles')
      .update({ campaign_source: CAMPAIGN_ID })
      .eq('id', userId)

    // Insert campaign signup record
    const { error: signupError } = await admin
      .from('campaign_signups')
      .insert({
        user_id: userId,
        campaign: CAMPAIGN_ID,
        english_level,
        recording_preference,
        notes: notes || null,
      })

    if (signupError) {
      console.error('Campaign signup insert error:', signupError)
      return NextResponse.json(
        { error: 'Account created but failed to save campaign details. Please contact hello@eigo.io.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, userId })
  } catch (error) {
    console.error('Campaign signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
