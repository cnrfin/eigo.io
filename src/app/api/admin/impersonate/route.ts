import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

// POST /api/admin/impersonate
// Body: { email: string }
// Returns a magic link URL that signs you in as that user (without emailing them)
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const supabase = getAdminSupabase()

    // Generate a magic link without sending the email
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://eigo.io'}/dashboard`

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

    if (error || !data?.properties?.hashed_token) {
      console.error('Failed to generate impersonation link:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to generate link' },
        { status: 500 },
      )
    }

    // Build the verification URL that Supabase auth expects
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${data.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`

    return NextResponse.json({ url: verifyUrl })
  } catch (err) {
    console.error('Impersonation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
