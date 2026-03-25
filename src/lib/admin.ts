import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

/**
 * Verify the request is from an admin user.
 * Returns the user if admin, null otherwise.
 */
export async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  if (!ADMIN_EMAILS.includes(user.email || '')) return null

  return user
}

/**
 * Get a service-role Supabase client for admin writes.
 */
export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
