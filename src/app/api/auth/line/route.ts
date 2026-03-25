import { NextResponse } from 'next/server'

// GET /api/auth/line — redirect user to LINE Login authorization page
export async function GET() {
  const clientId = process.env.LINE_CHANNEL_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/line/callback`
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid email',
  })

  const response = NextResponse.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`)
  // Store state in cookie for CSRF validation
  response.cookies.set('line_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
