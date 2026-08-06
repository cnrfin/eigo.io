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
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { imageBase64?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:[^,]+,/, '').trim() : ''
  if (!imageBase64) {
    return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 })
  }

  try {
    const dataUrl = `data:image/jpeg;base64,${imageBase64}`

    const system =
      'You help a Japanese person learning English turn a personal photo into vocabulary and a friendly chat. ' +
      'Look at the image and return ONLY a JSON object: ' +
      '{ "context": string, "objects": [ { "term": string, "gloss": string, "pos": string, "example": string, "exampleGloss": string, "x": number, "y": number } ] }. ' +
      '"context" = one natural English sentence describing the scene/memory (what it shows and its mood), suitable for starting a warm conversation. ' +
      '"objects" = 4 to 8 clear, useful English vocabulary items visibly present in the photo. Prefer concrete, learnable words; skip anything you are unsure is in the image. ' +
      'For each: "term" = the English word (lowercase, singular), "gloss" = its Japanese meaning, "pos" = one of noun/verb/adj/adv/phrase, ' +
      '"example" = a short natural English sentence using the word, "exampleGloss" = its natural Japanese translation, ' +
      '"x" and "y" = the approximate CENTER of that object in the image as fractions from 0 (left/top) to 1 (right/bottom). ' +
      'No markdown, no code fences, no text outside the JSON object.'

    const completion = await openai().chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyse this photo.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } },
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
