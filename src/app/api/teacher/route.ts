import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'cnrfin93@gmail.com'

// GET /api/teacher — returns teacher profile (name + avatar)
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Look up admin user by email
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    return NextResponse.json({ name: 'Connor', avatarUrl: '' })
  }

  const admin = data.users.find(u => u.email === ADMIN_EMAIL)
  const name = admin?.user_metadata?.full_name || admin?.user_metadata?.name || 'Connor'
  const avatarUrl = admin?.user_metadata?.avatar_url || admin?.user_metadata?.picture || ''

  return NextResponse.json({ name, avatarUrl }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
