import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/auth/line/native
 *
 * Handles LINE login from the native LINE SDK on iOS/Android.
 * The SDK returns an access token directly (no auth code exchange needed).
 * We verify the token with LINE, find/create the Supabase user, and return
 * a magic link token for the client to verify.
 *
 * Body: { accessToken: string, idToken?: string, profile?: { userId, displayName, pictureUrl } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, idToken, profile } = body

    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
    }

    // Verify the access token with LINE and get the user profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileRes.ok) {
      const text = await profileRes.text()
      console.error('[LINE Native] Profile verification failed:', text)
      return NextResponse.json({ error: 'Invalid LINE access token' }, { status: 401 })
    }

    const lineProfile = await profileRes.json()
    // lineProfile: { userId, displayName, pictureUrl, statusMessage }

    console.log('[LINE Native] Verified profile:', { userId: lineProfile.userId, displayName: lineProfile.displayName })

    // Try to extract email from ID token if available
    let email: string | null = null
    if (idToken) {
      try {
        const payload = JSON.parse(
          Buffer.from(idToken.split('.')[1], 'base64').toString()
        )
        email = payload.email || null
      } catch {
        // Email not available in token
      }
    }

    const userEmail = email || `line_${lineProfile.userId}@line.eigo.io`
    const supabaseAdmin = getSupabaseAdmin()

    // Check if user already exists with this LINE ID
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.user_metadata?.line_user_id === lineProfile.userId
    )

    let userId: string

    if (existingUser) {
      // Update existing user's metadata
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: lineProfile.displayName,
          avatar_url: lineProfile.pictureUrl,
          line_user_id: lineProfile.userId,
        },
      })
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          full_name: lineProfile.displayName,
          avatar_url: lineProfile.pictureUrl,
          line_user_id: lineProfile.userId,
          provider: 'line',
        },
      })

      if (createError || !newUser.user) {
        console.error('[LINE Native] Failed to create user:', createError)
        return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // Ensure profiles table has the LINE display name
    await supabaseAdmin
      .from('profiles')
      .update({ display_name: lineProfile.displayName })
      .eq('id', userId)

    // Generate a magic link token for the client to verify
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: existingUser?.email || userEmail,
    })

    if (linkError || !linkData) {
      console.error('[LINE Native] Failed to generate magic link:', linkError)
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

    return NextResponse.json({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    })
  } catch (err) {
    console.error('[LINE Native] Auth error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
