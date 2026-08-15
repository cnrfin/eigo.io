import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authenticate } from '@/lib/test-auth'

export const runtime = 'nodejs'
export const maxDuration = 45

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// Vision-capable chat model. Defaults to the generation model; override with
// OPENAI_VISION_MODEL if needed.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_GENERATION_MODEL || 'gpt-5.4-mini'

/**
 * POST /api/memory/analyze
 *
 * Analyses a personal photo the learner shared. Returns a short natural
 * description of the memory (used to seed the mascot conversation + reactions)
 * and the useful vocabulary visible in it — each word with a Japanese gloss,
 * part of speech, an example sentence, and an approximate position so the app
 * can drop CapWords-style stickers on the image.
 *
 * Request:  JSON { imageBase64: string }  (JPEG bytes, base64 — the client sends
 *           the picker's JPEG base64 so HEIC iPhone photos are already converted)
 * Response: {
 *   context: string,
 *   objects: [{ term, gloss, pos, example, exampleGloss, x, y }]
 * }
 */
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  // ISO-BMFF 'ftyp' box → HEIF/HEIC family
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.toString('ascii', 8, 12)
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand)) return 'image/heic'
  }
  return null
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { imageBase64?: unknown; level?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:[^,]+,/, '').trim() : ''
  if (!imageBase64) {
    return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 })
  }
  const level = typeof body.level === 'string' && /^[ABC][12]$/.test(body.level) ? body.level : 'A2'

  try {
    // Normalise the image for OpenAI (accepts only png/jpeg/gif/webp). iPhone photos
    // are often HEIC/HEIF — decode those to JPEG first (pure-JS, no native deps).
    let buf = Buffer.from(imageBase64, 'base64')
    let mime = detectImageMime(buf)
    if (mime === 'image/heic' || mime === null) {
      const convert = (await import('heic-convert')).default
      const jpeg = await convert({ buffer: buf, format: 'JPEG', quality: 0.9 })
      buf = Buffer.from(jpeg)
      mime = 'image/jpeg'
    }
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

    const levelGuidance: Record<string, string> = {
      A1: 'The learner is CEFR A1 (beginner): choose only the most common, concrete everyday words (basic nouns).',
      A2: 'The learner is CEFR A2 (elementary): common everyday words, with a few useful adjectives or actions.',
      B1: 'The learner is CEFR B1 (intermediate): go beyond the obvious nouns — include useful adjectives, verbs, and less common items in the scene.',
      B2: 'The learner is CEFR B2 (upper-intermediate): favour more precise, less common, and descriptive vocabulary (materials, textures, specific objects, evocative adjectives).',
      C1: 'The learner is CEFR C1 (advanced): surface nuanced, specific, and sophisticated vocabulary a native would use to describe the scene, not beginner words.',
    }

    const system =
      'You help a Japanese person learning English turn a personal photo into vocabulary and a friendly chat. ' +
      'Look at the image and return ONLY a JSON object: ' +
      '{ "context": string, "objects": [ { "term": string, "gloss": string, "pos": string, "example": string, "exampleGloss": string, "x": number, "y": number } ] }. ' +
      '"context" = one natural English sentence describing the scene/memory (what it shows and its mood), suitable for starting a warm conversation. ' +
      '"objects" = 4 to 8 useful English vocabulary items that are clearly and unambiguously VISIBLE in the photo. ' +
      (levelGuidance[level] ?? levelGuidance.A2) + ' Skip anything you are not sure is in the image. ' +
      'For each: "term" = the English word (lowercase, singular), "gloss" = its Japanese meaning, "pos" = one of noun/verb/adj/adv/phrase, ' +
      '"example" = a short natural English sentence using the word, "exampleGloss" = its natural Japanese translation. ' +
      'PLACEMENT — "x" and "y" locate the object so the app can pin a label on it, so accuracy matters: ' +
      'give the CENTRE of the object as fractions of the image, where x=0 is the far left, x=1 the far right, y=0 the very top, y=1 the very bottom (origin top-left). ' +
      'Only include an object if you can confidently point to where it is; put x,y on the object itself, not on empty space. ' +
      'No markdown, no code fences, no text outside the JSON object.'

    const completion = await openai().chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyse this photo.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_completion_tokens: 900,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      context?: unknown
      objects?: { term?: unknown; gloss?: unknown; pos?: unknown; example?: unknown; exampleGloss?: unknown; x?: unknown; y?: unknown }[]
    }

    const clamp01 = (n: unknown) => {
      const v = typeof n === 'number' ? n : Number(n)
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5
    }
    const objects = Array.isArray(parsed.objects)
      ? parsed.objects
          .slice(0, 8)
          .map((o) => ({
            term: String(o.term ?? '').trim(),
            gloss: String(o.gloss ?? '').trim(),
            pos: String(o.pos ?? '').trim() || 'noun',
            example: String(o.example ?? '').trim(),
            exampleGloss: String(o.exampleGloss ?? '').trim(),
            x: clamp01(o.x),
            y: clamp01(o.y),
          }))
          .filter((o) => o.term)
      : []

    if (objects.length === 0) return NextResponse.json({ error: 'No objects detected' }, { status: 502 })

    return NextResponse.json({
      context: String(parsed.context ?? '').trim() || 'a personal photo the learner shared',
      objects,
    })
  } catch (err) {
    console.error('memory/analyze error:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Analysis failed', detail }, { status: 500 })
  }
}
