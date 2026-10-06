/**
 * Local file API for the course studio, mounted into the Vite dev server.
 *
 * Drafts live on disk:
 *   studio/data/courses/<courseId>/course.json
 *   studio/data/courses/<courseId>/images/<file>
 * Deleted courses are moved to studio/data/trash/ (never hard-deleted).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import type { Course } from '../../src/lib/slides/types'
import { createCourse, uid } from '../../src/lib/slides/templates'
import { collectAssets, summarizeCourse, validateCourse } from '../../src/lib/slides/summary'
import { isCompressible, processMedia } from './media'

const MAX_BODY = 300 * 1024 * 1024 // 300 MB (raw videos are compressed on upload)
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/
const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}
/** Short video and audio clips (animated look-and-guess scenes, listening clips). Stored next to the images. */
const MEDIA_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
}
const ALL_TYPES: Record<string, string> = { ...IMAGE_TYPES, ...MEDIA_TYPES }

export interface FileApiOptions {
  dataDir: string
  publishUrl?: string
  publishKey?: string
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > MAX_BODY) throw new HttpError(413, 'Upload too large (max 300 MB).')
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const raw = (await readBody(req)).toString('utf8')
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new HttpError(400, 'Invalid JSON body.')
  }
}

async function exists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/** Write via temp file + rename so a crash never leaves a half-written course. */
async function writeAtomic(file: string, data: string | Buffer) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, data)
  await fs.rename(tmp, file)
}

function sanitizeFileName(name: string): { base: string; ext: string } {
  const ext = path.extname(name).toLowerCase()
  const base = path
    .basename(name, path.extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'image'
  return { base, ext }
}

export function fileApi(opts: FileApiOptions): Plugin {
  const coursesDir = path.join(opts.dataDir, 'courses')
  const trashDir = path.join(opts.dataDir, 'trash')

  const courseDir = (id: string) => {
    if (!ID_RE.test(id)) throw new HttpError(400, 'Invalid course id.')
    return path.join(coursesDir, id)
  }
  const courseFile = (id: string) => path.join(courseDir(id), 'course.json')

  async function loadCourse(id: string): Promise<Course> {
    const file = courseFile(id)
    if (!(await exists(file))) throw new HttpError(404, 'Course not found.')
    return JSON.parse(await fs.readFile(file, 'utf8')) as Course
  }

  async function saveCourse(course: Course) {
    const dir = courseDir(course.id)
    await fs.mkdir(path.join(dir, 'images'), { recursive: true })
    await writeAtomic(path.join(dir, 'course.json'), JSON.stringify(course, null, 2))
  }

  async function listCourses() {
    await fs.mkdir(coursesDir, { recursive: true })
    const entries = await fs.readdir(coursesDir, { withFileTypes: true })
    const out = []
    for (const e of entries) {
      if (!e.isDirectory() || !ID_RE.test(e.name)) continue
      try {
        out.push(summarizeCourse(await loadCourse(e.name)))
      } catch {
        /* skip unreadable */
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const method = req.method ?? 'GET'

    // ---- static course images: /files/<courseId>/images/<name>
    if (parts[0] === 'files' && parts.length === 4 && parts[2] === 'images') {
      const dir = path.join(courseDir(parts[1]), 'images')
      const file = path.join(dir, path.basename(parts[3]))
      const type = ALL_TYPES[path.extname(file).toLowerCase()]
      if (!type || !(await exists(file))) throw new HttpError(404, 'Not found')
      const data = await fs.readFile(file)
      res.setHeader('Content-Type', type)
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Accept-Ranges', 'bytes')
      // Range requests let browsers (Safari especially) seek and play video/audio.
      const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/)
      if (range) {
        const start = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]))
        const end = range[1] && range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1
        if (start >= data.length || start > end) {
          res.statusCode = 416
          res.setHeader('Content-Range', `bytes */${data.length}`)
          res.end()
          return true
        }
        res.statusCode = 206
        res.setHeader('Content-Range', `bytes ${start}-${end}/${data.length}`)
        res.setHeader('Content-Length', String(end - start + 1))
        res.end(data.subarray(start, end + 1))
        return true
      }
      res.statusCode = 200
      res.setHeader('Content-Length', String(data.length))
      res.end(data)
      return true
    }

    if (parts[0] !== 'api') return false

    // ---- GET /api/config
    if (parts[1] === 'config' && method === 'GET') {
      send(res, 200, {
        publishConfigured: Boolean(opts.publishUrl && opts.publishKey),
        publishTarget: opts.publishUrl ? new URL(opts.publishUrl).host : null,
      })
      return true
    }

    if (parts[1] !== 'courses') return false

    // ---- /api/courses
    if (parts.length === 2) {
      if (method === 'GET') {
        send(res, 200, await listCourses())
        return true
      }
      if (method === 'POST') {
        const body = await readJson<{ title?: string; course?: Course }>(req)
        let course: Course
        if (body.course) {
          // import: keep content, ensure a free id
          course = { ...body.course }
          if (!course.id || !ID_RE.test(course.id) || (await exists(courseDir(course.id)))) course.id = uid('c')
          if (!Array.isArray(course.units)) throw new HttpError(400, 'Not a course file.')
        } else {
          course = createCourse(body.title?.trim() || 'Untitled course')
        }
        course.updatedAt = new Date().toISOString()
        await saveCourse(course)
        send(res, 201, course)
        return true
      }
    }

    const id = parts[2]

    // ---- /api/courses/:id
    if (parts.length === 3) {
      if (method === 'GET') {
        send(res, 200, await loadCourse(id))
        return true
      }
      if (method === 'PUT') {
        const course = await readJson<Course>(req)
        if (course.id !== id) throw new HttpError(400, 'Course id mismatch.')
        if (!Array.isArray(course.units)) throw new HttpError(400, 'Not a course.')
        // Optimistic concurrency: refuse to overwrite a file that changed on disk
        // (e.g. regenerated or edited in another tab) since this client loaded it.
        const base = req.headers['if-match']
        if (typeof base === 'string' && base && (await exists(courseFile(id)))) {
          const current = await loadCourse(id)
          if (current.updatedAt !== base) throw new HttpError(409, 'This course was changed outside this tab.')
        }
        course.updatedAt = new Date().toISOString()
        await saveCourse(course)
        send(res, 200, { ok: true, updatedAt: course.updatedAt })
        return true
      }
      if (method === 'DELETE') {
        const dir = courseDir(id)
        if (!(await exists(dir))) throw new HttpError(404, 'Course not found.')
        await fs.mkdir(trashDir, { recursive: true })
        await fs.rename(dir, path.join(trashDir, `${id}-${Date.now()}`))
        send(res, 200, { ok: true })
        return true
      }
    }

    // ---- /api/courses/:id/images
    if (parts.length === 4 && parts[3] === 'images') {
      const dir = path.join(courseDir(id), 'images')
      if (!(await exists(courseFile(id)))) throw new HttpError(404, 'Course not found.')
      await fs.mkdir(dir, { recursive: true })
      if (method === 'GET') {
        const kind = url.searchParams.get('kind') === 'media' ? MEDIA_TYPES : IMAGE_TYPES
        const files = (await fs.readdir(dir)).filter((f) => kind[path.extname(f).toLowerCase()])
        const out = await Promise.all(
          files.map(async (f) => ({ name: f, src: `images/${f}`, size: (await fs.stat(path.join(dir, f))).size })),
        )
        send(res, 200, out)
        return true
      }
      if (method === 'POST') {
        const requested = url.searchParams.get('name') || 'image.jpg'
        const { base, ext } = sanitizeFileName(requested)
        if (!ALL_TYPES[ext]) throw new HttpError(415, 'Use an image (JPG, PNG, WebP, GIF, AVIF, SVG), a video (MP4, WebM, MOV) or audio (MP3, M4A, WAV, OGG).')
        const raw = await readBody(req)
        if (raw.length === 0) throw new HttpError(400, 'Empty upload.')
        const unique = async (b: string, x: string) => {
          let n = `${b}${x}`
          for (let i = 2; await exists(path.join(dir, n)); i++) n = `${b}-${i}${x}`
          return n
        }
        if (isCompressible(ext)) {
          const out = await processMedia(process.cwd(), raw, ext)
          const name = await unique(base, out.ext)
          await writeAtomic(path.join(dir, name), out.data)
          let poster: string | undefined
          if (out.poster) {
            const pname = await unique(`${path.basename(name, out.ext)}-poster`, out.poster.ext)
            await writeAtomic(path.join(dir, pname), out.poster.data)
            poster = `images/${pname}`
          }
          send(res, 201, {
            name,
            src: `images/${name}`,
            size: out.data.length,
            originalSize: raw.length,
            compressed: out.compressed,
            poster,
            note: out.note,
          })
          return true
        }
        const name = await unique(base, ext)
        await writeAtomic(path.join(dir, name), raw)
        send(res, 201, { name, src: `images/${name}`, size: raw.length })
        return true
      }
    }

    // ---- POST /api/courses/:id/publish
    if (parts.length === 4 && parts[3] === 'publish' && method === 'POST') {
      if (!opts.publishUrl || !opts.publishKey) {
        throw new HttpError(
          501,
          'Publishing is not set up yet. Add EIGO_PUBLISH_URL and EIGO_PUBLISH_KEY to studio/.env.local once the eigo.io endpoint exists.',
        )
      }
      const course = await loadCourse(id)
      const errors = validateCourse(course).filter((i) => i.level === 'error')
      if (errors.length) throw new HttpError(422, `Fix ${errors.length} error(s) before publishing.`)
      // Two steps (see src/app/api/slide-courses/publish/route.ts): the course
      // is far too big to send in one request with its images and video, so
      // eigo.io hands back signed upload URLs and we upload the files straight
      // to storage. Unchanged files (same size) are skipped.
      const imagesDir = path.join(courseDir(id), 'images')
      const files = new Map<string, { file: string; size: number; contentType: string }>()
      for (const src of collectAssets(course)) {
        const file = path.join(imagesDir, path.basename(src))
        if (!(await exists(file))) throw new HttpError(422, `Missing image file: ${src}`)
        files.set(src, {
          file,
          size: (await fs.stat(file)).size,
          contentType: ALL_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        })
      }

      const call = async (payload: unknown) => {
        const r = await fetch(opts.publishUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.publishKey}` },
          body: JSON.stringify(payload),
        })
        const text = await r.text()
        if (!r.ok) throw new HttpError(502, `eigo.io rejected the publish (${r.status}): ${text.slice(0, 300)}`)
        try {
          return JSON.parse(text)
        } catch {
          return text
        }
      }

      const prep = (await call({
        step: 'prepare',
        course,
        assets: [...files].map(([p, f]) => ({ path: p, size: f.size, contentType: f.contentType })),
      })) as { uploads: { path: string; signedUrl: string }[]; skipped: number }

      const queue = [...prep.uploads]
      const worker = async () => {
        for (let u = queue.shift(); u; u = queue.shift()) {
          const f = files.get(u.path)!
          const up = await fetch(u.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': f.contentType, 'x-upsert': 'true' },
            body: await fs.readFile(f.file),
          })
          if (!up.ok) throw new HttpError(502, `Upload failed for ${u.path} (${up.status}): ${(await up.text()).slice(0, 200)}`)
        }
      }
      await Promise.all([worker(), worker(), worker()])

      const result = await call({ step: 'commit', course })
      send(res, 200, {
        ok: true,
        result: { ...(typeof result === 'object' ? result : { result }), uploaded: prep.uploads.length, skipped: prep.skipped },
        publishedAt: new Date().toISOString(),
      })
      return true
    }

    throw new HttpError(404, 'Unknown endpoint.')
  }

  return {
    name: 'eigo-studio-file-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handle(req, res)
          .then((handled) => {
            if (!handled) next()
          })
          .catch((err: unknown) => {
            const status = err instanceof HttpError ? err.status : 500
            const message = err instanceof Error ? err.message : 'Unexpected error'
            if (status === 500) console.error('[studio api]', err)
            send(res, status, { error: message })
          })
      })
    },
  }
}
