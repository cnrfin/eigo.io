/**
 * Compresses uploaded video and audio for lessons, using FFmpeg.
 *
 * FFmpeg is found the same way as the eigo.io recordings API: bin/ffmpeg at the
 * project root, then the usual Homebrew paths, then PATH. Without FFmpeg the
 * upload is kept as it is and the studio says how to turn compression on.
 *
 * Video → MP4 (H.264), max 1280px wide, 24 fps, no sound track, fast start,
 *         plus a WebP poster from the first frame (about 1 MB for 5–8 seconds).
 * Audio → M4A (AAC), mono, 64 kbps (about 80 KB for 10 seconds).
 */
import { execFile, spawn } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov'])
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.ogg'])

let cached: string | null | undefined
async function findFfmpeg(root: string): Promise<string | null> {
  if (cached !== undefined) return cached
  const candidates = [path.join(root, 'bin', 'ffmpeg'), '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']
  for (const c of candidates) if (existsSync(c)) return (cached = c)
  cached = await new Promise<string | null>((resolve) =>
    execFile('ffmpeg', ['-version'], (err) => resolve(err ? null : 'ffmpeg')),
  )
  return cached
}

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...args])
    let err = ''
    p.stderr.on('data', (d: Buffer) => (err = (err + d.toString()).slice(-2000)))
    p.on('error', reject)
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `FFmpeg exited with code ${code}`))))
  })
}

export interface ProcessedMedia {
  /** Final file data and extension to save. */
  data: Buffer
  ext: string
  /** WebP (or JPG) poster from the first frame, for videos. */
  poster?: { data: Buffer; ext: string }
  compressed: boolean
  note?: string
}

export const isCompressible = (ext: string) => VIDEO_EXT.has(ext) || AUDIO_EXT.has(ext)

export async function processMedia(root: string, input: Buffer, ext: string): Promise<ProcessedMedia> {
  const video = VIDEO_EXT.has(ext)
  const bin = await findFfmpeg(root)
  if (!bin) {
    return {
      data: input,
      ext,
      compressed: false,
      note: 'Saved without compressing: FFmpeg isn’t installed. Run “brew install ffmpeg”, then restart the studio.',
    }
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'eigo-media-'))
  try {
    const src = path.join(tmp, `in${ext}`)
    await fs.writeFile(src, input)
    const outExt = video ? '.mp4' : '.m4a'
    const out = path.join(tmp, `out${outExt}`)

    if (video) {
      await run(bin, [
        '-i', src,
        '-an',
        '-vf', "scale='min(1280,iw)':-2,fps=24",
        '-c:v', 'libx264', '-crf', '26', '-preset', 'slow',
        '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        out,
      ])
    } else {
      await run(bin, ['-i', src, '-vn', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out])
    }

    let data: Buffer = await fs.readFile(out)
    let finalExt = outExt
    let note: string | undefined
    // Already small and in a format every browser plays: keep the original.
    const browserSafe = ext === '.mp4' || ext === '.m4a' || ext === '.mp3'
    if (data.length >= input.length && browserSafe) {
      data = input
      finalExt = ext
      note = 'This file was already small, so it was kept as it is.'
    }

    let poster: ProcessedMedia['poster']
    if (video) {
      const webp = path.join(tmp, 'poster.webp')
      const jpg = path.join(tmp, 'poster.jpg')
      try {
        await run(bin, ['-i', out, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', webp])
        poster = { data: await fs.readFile(webp), ext: '.webp' }
      } catch {
        try {
          await run(bin, ['-i', out, '-frames:v', '1', '-q:v', '4', jpg])
          poster = { data: await fs.readFile(jpg), ext: '.jpg' }
        } catch {
          /* no poster; not essential */
        }
      }
    }
    return { data, ext: finalExt, poster, compressed: data !== input, note }
  } catch (e) {
    return {
      data: input,
      ext,
      compressed: false,
      note: `Saved without compressing: FFmpeg couldn’t read this file (${(e as Error).message.split('\n')[0]}).`,
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true })
  }
}
