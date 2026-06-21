import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'
import { DEFAULT_PERMISSIONS } from '@/lib/user-permissions'

/**
 * Admin per-user feature permissions.
 *
 * GET  /api/admin/permissions
 *   All users with their effective feature permissions. A user with no stored
 *   row defaults to everything enabled (`customized: false`).
 *
 * PUT  /api/admin/permissions   { userId, permissions: {...} }
 *   Upsert one user's permissions. Setting all four to true effectively
 *   restores the default (the row is kept but is equivalent to no row).
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = getAdminSupabase()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Permissions GET (profiles) error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: perms } = await supabase
    .from('user_permissions')
    .select('user_id, courses_enabled, tests_enabled, recordings_enabled, transcription_enabled')
  const permByUser = new Map((perms ?? []).map(p => [p.user_id, p]))

  const users = (profiles ?? []).map((p) => {
    const row = permByUser.get(p.id)
    return {
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      customized: !!row,
      permissions: row
        ? {
            courses_enabled: row.courses_enabled,
            tests_enabled: row.tests_enabled,
            recordings_enabled: row.recordings_enabled,
            transcription_enabled: row.transcription_enabled,
          }
        : { ...DEFAULT_PERMISSIONS },
    }
  })

  return NextResponse.json({ users })
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: { userId?: string; permissions?: Partial<typeof DEFAULT_PERMISSIONS> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { userId, permissions } = body
  if (!userId || !permissions) {
    return NextResponse.json({ error: 'userId and permissions are required' }, { status: 400 })
  }

  const supabase = getAdminSupabase()
  const row = {
    user_id: userId,
    courses_enabled: permissions.courses_enabled ?? true,
    tests_enabled: permissions.tests_enabled ?? true,
    recordings_enabled: permissions.recordings_enabled ?? true,
    transcription_enabled: permissions.transcription_enabled ?? true,
    updated_at: new Date().toISOString(),
    updated_by: admin.email ?? null,
  }
  const { data, error } = await supabase
    .from('user_permissions')
    .upsert(row, { onConflict: 'user_id' })
    .select('courses_enabled, tests_enabled, recordings_enabled, transcription_enabled')
    .single()
  if (error) {
    console.error('Permissions PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ permissions: data })
}
