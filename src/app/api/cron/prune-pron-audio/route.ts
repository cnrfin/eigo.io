import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/cron/prune-pron-audio
 *
 * Deletes recordings in the private `pronunciation-audio` bucket older than 24h.
 * Funnel (anonymous) pronunciation attempts upload their audio so the
 * post-sign-up results screen can play it back — a one-time, immediate view —
 * so the objects only need to live briefly. Schedule daily (Vercel cron /
 * Supabase scheduled function). Guarded by CRON_SECRET like the other crons.
 */
const BUCKET = 'pronunciation-audio'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// Recursively walk the bucket via the Storage API (the `storage` schema isn't
// exposed to PostgREST, so we can't query storage.objects directly). Files have
// metadata + created_at; folders don't. Objects are nested user/lesson/file, so
// a small depth cap is plenty.
async function listFiles(supabase: SupabaseClient, prefix: string, depth = 0): Promise<{ path: string; createdAt: string | null }[]> {
  if (depth > 4) return []
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error || !data) return []
  const out: { path: string; createdAt: string | null }[] = []
  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    const isFolder = entry.id == null && entry.metadata == null
    if (isFolder) {
      out.push(...(await listFiles(supabase, path, depth + 1)))
    } else {
      out.push({ path, createdAt: entry.created_at ?? entry.updated_at ?? null })
    }
  }
  return out
}

export async function GET(request: NextRequest) {
  const vercelCronSecret = request.headers.get('x-vercel-cron-auth')
  const authHeader = request.headers.get('authorization')
  const isAuthorized =
    (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`)
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const cutoff = Date.now() - MAX_AGE_MS

  let all: { path: string; createdAt: string | null }[]
  try {
    all = await listFiles(supabase, '')
  } catch (e) {
    console.error('prune-pron-audio: list failed:', e)
    return NextResponse.json({ error: 'list failed' }, { status: 500 })
  }

  const stale = all.filter((f) => f.createdAt && new Date(f.createdAt).getTime() < cutoff).map((f) => f.path)
  if (stale.length === 0) return NextResponse.json({ deleted: 0, scanned: all.length })

  // Remove in batches to keep each request small.
  let deleted = 0
  for (let i = 0; i < stale.length; i += 100) {
    const batch = stale.slice(i, i + 100)
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(batch)
    if (rmErr) {
      console.error('prune-pron-audio: remove failed:', rmErr.message)
      return NextResponse.json({ error: 'remove failed', deleted }, { status: 500 })
    }
    deleted += batch.length
  }
  return NextResponse.json({ deleted, scanned: all.length })
}
