import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/auth/line/callback — handle LINE OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Check for LINE errors
  if (error) {
    return NextResponse.redirect(`${siteUrl}/?error=line_auth_denied`)
  }

  // Validate state (CSRF protection)
  const storedState = request.cookies.get('line_oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${siteUrl}/?error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/?error=no_code`)
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${siteUrl}/api/auth/line/callback`,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    })

    if (!tokenRes.ok) {
      console.error('LINE token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${siteUrl}/?error=line_token_failed`)
    }

    const tokens = await tokenRes.json()

    // Get user profile from LINE
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!profileRes.ok) {
      console.error('LINE profile fetch failed:', await profileRes.text())
      return NextResponse.redirect(`${siteUrl}/?error=line_profile_failed`)
    }

    const lineProfile = await profileRes.json()
    // lineProfile: { userId, displayName, pictureUrl, statusMessage }

    // Also try to get email from ID token if available
    let email: string | null = null
    if (tokens.id_token) {
      try {
        // Decode the ID token payload (we trust it since we just got it from LINE)
        const payload = JSON.parse(
          Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
        )
        email = payload.email || null
      } catch {
        // Email not available in token, that's fine
      }
    }

    // Use LINE userId as a stable identifier
    // Create an email-like identifier for users without email
    const userEmail = email || `line_${lineProfile.userId}@line.eigo.io`

    // Check if user already exists with this LINE ID (stored in raw_user_meta_data)
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
        console.error('Failed to create user:', createError)
        return NextResponse.redirect(`${siteUrl}/?error=user_creation_failed`)
      }
      userId = newUser.user.id
    }

    // Ensure profiles table has the LINE display name
    // (the DB trigger may create the row but won't set display_name from metadata)
    await supabaseAdmin
      .from('profiles')
      .update({ display_name: lineProfile.displayName })
      .eq('id', userId)

    // Generate a magic link and extract the OTP to verify client-side
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: existingUser?.email || userEmail,
    })

    if (linkError || !linkData) {
      console.error('Failed to generate magic link:', linkError)
      return NextResponse.redirect(`${siteUrl}/?error=session_failed`)
    }

    // Redirect to our client-side auth handler with the token hash
    const tokenHash = linkData.properties.hashed_token
    const response = NextResponse.redirect(
      `${siteUrl}/auth/line/complete?token_hash=${tokenHash}&type=magiclink`
    )
    // Clean up the state cookie
    response.cookies.delete('line_oauth_state')
    return response
  } catch (err) {
    console.error('LINE auth error:', err)
    return NextResponse.redirect(`${siteUrl}/?error=line_auth_error`)
  }
}
