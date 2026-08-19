import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Interest/media suggestion for the CUPS onboarding "interests" screen. Given a
// free-text query, the model returns related interests as {label, emoji} chips —
// and it picks the right domain on its own: a TV show returns that show + similar
// shows, a band returns related artists, a game returns related games, a hobby
// returns adjacent hobbies. No per-domain APIs.
//
// PUBLIC (no auth): onboarding runs before sign-in, so this can't require a
// session. It only returns generic suggestions, so there's nothing sensitive.

export const runtime = 'nodejs'
export const maxDuration = 20

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const MODEL = process.env.OPENAI_CONVERSE_MODEL || 'gpt-5.6-luna'

const SYSTEM = `You suggest interests for the onboarding screen of an English-learning app. The learner types a query and you return related interests as chips.

Rules:
- The query is usually INCOMPLETE — the user is still typing. Infer the single most likely intended term and treat that as the query: "ariana gr" -> Ariana Grande, "stranger th" -> Stranger Things, "rock clim" -> Rock Climbing. Only treat it as nonsense if there is no reasonable completion.
- Detect the query's domain automatically and stay in it: a TV/streaming show -> that show plus similar shows; a musician or genre -> related artists/genres; a video game -> related games; a sport, hobby, food, or topic -> adjacent ones. Mixed or generic queries -> a sensible spread.
- If the query names (or clearly begins to name) a real, specific thing, put that closest direct match FIRST, then the related items.
- Each item: "label" = the specific thing in Title Case, 1-4 words, recognizable on its own; "emoji" = ONE single emoji that fits it.
- Up to 10 items. No duplicates. No numbering, no explanations, no extra text.
- If the query is empty, a single letter, or nonsense, return an empty list.

Return STRICT JSON: {"items":[{"label":"...","emoji":"..."}]}`

type Item = { label: string; emoji: string }

// keep only the first emoji-ish glyph; fall back to a neutral tag
function oneEmoji(s: string): string {
  const t = String(s || '').trim()
  if (!t) return '✨'
  const chars = Array.from(t)
  return chars.slice(0, 2).join('').length <= 4 ? chars[0] : t.slice(0, 2)
}

export async function POST(request: NextRequest) {
  let body: { q?: unknown; exclude?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const q = typeof body.q === 'string' ? body.q.trim() : ''
  if (q.length < 2) return NextResponse.json({ items: [] })
  const exclude = Array.isArray(body.exclude)
    ? body.exclude.filter((x): x is string => typeof x === 'string').map((x) => x.toLowerCase())
    : []

  const base = {
    model: MODEL,
    messages: [
      { role: 'system' as const, content: SYSTEM },
      { role: 'user' as const, content: `Query: ${q}` },
    ],
    response_format: { type: 'json_object' as const },
    max_completion_tokens: 400,
  }

  let completion
  try {
    try {
      completion = await openai().chat.completions.create({ ...base, reasoning_effort: 'low' } as never)
    } catch (e) {
      if (/reasoning|effort/i.test(e instanceof Error ? e.message : String(e))) {
        completion = await openai().chat.completions.create(base)
      } else throw e
    }
  } catch (e) {
    console.error('[interests/suggest]', e)
    return NextResponse.json({ items: [] })
  }

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: { items?: { label?: unknown; emoji?: unknown }[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return NextResponse.json({ items: [] })
  }

  const seen = new Set<string>(exclude)
  const items: Item[] = []
  for (const it of Array.isArray(parsed.items) ? parsed.items : []) {
    const label = String(it?.label ?? '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ label, emoji: oneEmoji(String(it?.emoji ?? '')) })
    if (items.length >= 10) break
  }

  return NextResponse.json({ items })
}
