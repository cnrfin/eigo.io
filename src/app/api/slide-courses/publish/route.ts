import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { collectAssets, validateCourse } from '@/lib/slides/summary'
import type { Course } from '@/lib/slides/types'

/**
 * POST /api/slide-courses/publish
 *
 * Receives a finished course from the course studio (studio/server/fileApi.ts)
 * and makes it available to the classroom. Auth: `Authorization: Bearer
 * <EIGO_PUBLISH_KEY>` (server-to-server, no user session).
 *
 * Courses carry tens of MB of images and video, far over the request-body
 * limit of a serverless function, so publishing is two steps and the files
 * never pass through this route:
 *
 *   1. { step: 'prepare', course, assets: [{ path, size, contentType }] }
 *      Validates the course, compares the asset list with what's already in
 *      the `slide-courses` bucket, and returns signed upload URLs for the
 *      files that are new or changed (by size).
 *        → { uploads: [{ path, signedUrl }], skipped: n }
 *      The studio then PUTs each file straight to Supabase Storage.
 *
 *   2. { step: 'commit', course }
 *      Checks every referenced asset now exists, then upserts slide_courses
 *      (published = true, version + 1).
 *        → { ok, id, version, assetBase }
 *
 * Objects live at  slide-courses/<courseId>/<asset path>,
 * e.g. slide-courses/c_greatbritain/images/pexels-123.jpg
 */

const BUCKET = 'slide-courses'
const MAX_ASSET_BYTES = 50 * 1024 * 1024 // bucket limit
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/
const ASSET_RE = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/

type AssetMeta = { path: string; size: number; contentType?: string }
type Body =
  | { step: 'prepare'; course: Course; assets: AssetMeta[] }
  | { step: 'commit'; course: Course }

function authorized(request: NextRequest): boolean {
  const key = process.env.EIGO_PUBLISH_KEY
  const header = request.headers.get('Authorization') ?? ''
  if (!key || !header.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7))
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b)
}

function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status })
}

function safeAsset(p: string) {
  return ASSET_RE.test(p) && !p.split('/').some((s) => s === '..' || s === '.')
}

/** Sizes of everything already stored for this course, keyed by asset path. */
async function existingSizes(courseId: string, paths: string[]): Promise<Map<string, number>> {
  const storage = getSupabaseAdmin().storage.from(BUCKET)
  const dirs = new Set(paths.map((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')))
  const sizes = new Map<string, number>()
  for (const dir of dirs) {
    const prefix = dir ? `${courseId}/${dir}` : courseId
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(prefix, { limit: 1000, offset })
      if (error) throw error
      for (const obj of data ?? []) {
        const size = (obj.metadata as { size?: number } | null)?.size
        if (typeof size === 'number') sizes.set(dir ? `${dir}/${obj.name}` : obj.name, size)
      }
      if (!data || data.length < 1000) break
    }
  }
  return sizes
}

function checkCourse(course: unknown): { course: Course } | { error: NextResponse } {
  const c = course as Course | undefined
  if (!c || typeof c !== 'object' || !Array.isArray(c.units)) return { error: fail(400, 'Missing course.') }
  if (!ID_RE.test(c.id ?? '')) return { error: fail(400, 'Invalid course id.') }
  const errors = validateCourse(c).filter((i) => i.level === 'error')
  if (errors.length) return { error: fail(422, `Fix ${errors.length} error(s) before publishing.`, { issues: errors }) }
  const bad = collectAssets(c).filter((p) => !safeAsset(p))
  if (bad.length) return { error: fail(422, `Unsupported asset path(s): ${bad.slice(0, 5).join(', ')}`) }
  return { course: c }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return fail(401, 'Unauthorized')

  let body: Body
  try {
    body = await request.json()
  } catch {
    return fail(400, 'Invalid JSON body.')
  }

  const checked = checkCourse(body?.course)
  if ('error' in checked) return checked.error
  const course = checked.course
  const needed = collectAssets(course)
  const supabase = getSupabaseAdmin()

  try {
    if (body.step === 'prepare') {
      const meta = new Map((Array.isArray(body.assets) ? body.assets : []).map((a) => [a.path, a]))
      const missing = needed.filter((p) => !meta.has(p))
      if (missing.length) return fail(422, `Missing file(s) for: ${missing.slice(0, 5).join(', ')}`)
      const tooBig = needed.filter((p) => (meta.get(p)?.size ?? 0) > MAX_ASSET_BYTES)
      if (tooBig.length) return fail(422, `Over 50 MB: ${tooBig.join(', ')}`)

      const have = await existingSizes(course.id, needed)
      const toUpload = needed.filter((p) => have.get(p) !== meta.get(p)!.size)
      const uploads: { path: string; signedUrl: string }[] = []
      for (const p of toUpload) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUploadUrl(`${course.id}/${p}`, { upsert: true })
        if (error || !data) throw error ?? new Error('No signed URL')
        uploads.push({ path: p, signedUrl: data.signedUrl })
      }
      return NextResponse.json({ uploads, skipped: needed.length - toUpload.length })
    }

    if (body.step === 'commit') {
      const have = await existingSizes(course.id, needed)
      const absent = needed.filter((p) => !have.has(p))
      if (absent.length) return fail(409, `Not uploaded yet: ${absent.slice(0, 5).join(', ')}`)

      const { data: prev } = await supabase
        .from('slide_courses')
        .select('version')
        .eq('id', course.id)
        .maybeSingle()
      const version = (prev?.version ?? 0) + 1
      const now = new Date().toISOString()
      const { error } = await supabase.from('slide_courses').upsert(
        {
          id: course.id,
          slug: course.slug,
          title: course.title,
          title_ja: course.titleJa || null,
          description: course.description || null,
          level: course.level || null,
          category: course.category || null,
          cover_image: course.coverImage || null,
          published: true,
          version,
          course,
          published_at: now,
          updated_at: now,
        },
        { onConflict: 'id' },
      )
      if (error) throw error

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${course.id}/`)
      return NextResponse.json({ ok: true, id: course.id, version, assets: needed.length, assetBase: pub.publicUrl })
    }

    return fail(400, "step must be 'prepare' or 'commit'.")
  } catch (e) {
    console.error('slide-courses/publish failed:', e)
    return fail(500, e instanceof Error ? e.message : 'Publish failed.')
  }
}
