import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authenticate } from '@/lib/test-auth'

export const runtime = 'nodejs'
export const maxDuration = 30

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const MODEL = process.env.OPENAI_GENERATION_MODEL || 'gpt-5.4-mini'

/**
 * POST /api/memory/remember
 *
 * Consolidates the teacup's long-term memory of the learner after a conversation.
 * Given the CURRENT memory and the NEW conversation, it REWRITES the memory in
 * place (merge durable facts, drop trivia) so it stays bounded — never appends.
 *
 * Request:  { memory?: string, transcript?: string, context?: string }
 * Response: { memory: string }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: { memory?: unknown; transcript?: unknown; context?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const memory = typeof body.memory === 'string' ? body.memory.trim().slice(0, 4000) : ''
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim().slice(0, 6000) : ''
  const context = typeof body.context === 'string' ? body.context.trim().slice(0, 500) : ''

  // Nothing new to learn from → keep the memory unchanged.
  if (!transcript) return NextResponse.json({ memory })

  const system =
    'You maintain a compact, long-term memory profile of a Japanese person learning English, kept by their friendly teacup companion so it can remember them across conversations. ' +
    'You are given the CURRENT memory and a NEW conversation. REWRITE the memory in full: merge in durable new facts and drop nothing important, but keep only things worth remembering long-term — ' +
    "people and their names (family, friends, pets), the learner's job/life, hobbies and interests, preferences and dislikes, recurring topics, meaningful milestones, and personality/tone. " +
    'Drop one-off trivia and small talk. Do NOT simply append — consolidate and deduplicate so the whole thing stays under ~180 words, written as short, factual notes (not prose, no headings). ' +
    'Write it in English. If the conversation adds nothing durable, return the current memory essentially unchanged. ' +
    'Return ONLY a JSON object: { "memory": string }. No markdown, no text outside the JSON.'

  const user =
    `CURRENT MEMORY:\n${memory || '(empty — this is the first conversation)'}\n\n` +
    (context ? `The conversation was about this photo: ${context}\n\n` : '') +
    `NEW CONVERSATION:\n${transcript}\n\n` +
    'Return the rewritten memory as JSON.'

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_completion_tokens: 500,
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { memory?: unknown }
    const updated = String(parsed.memory ?? '').trim()
    return NextResponse.json({ memory: updated || memory })
  } catch (err) {
    console.error('memory/remember error:', err)
    // Best-effort: on failure keep the existing memory rather than losing it.
    return NextResponse.json({ memory })
  }
}
