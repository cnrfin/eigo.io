import OpenAI from 'openai'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RubricRow, Skill } from '@/lib/test-grading'

/**
 * Audio-based grading for speaking responses.
 *
 * Speaking is graded from the ACTUAL RECORDING, not a transcript, so the model
 * can assess pronunciation, intonation, fluency and delivery as well as content,
 * grammar and vocabulary. The browser records webm/mp4, but audio-input models
 * accept mp3/wav, so we transcode with ffmpeg first.
 */
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// Audio-capable chat model. Override per your account (e.g. a gpt-5.4 audio model).
const AUDIO_MODEL = process.env.OPENAI_AUDIO_MODEL || 'gpt-4o-audio-preview'

function ffmpegPath(): string {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg'
}

/** Transcode any browser recording (webm/mp4/ogg) to mono 16kHz mp3 via ffmpeg stdin→stdout. */
export function transcodeToMp3(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath(), ['-i', 'pipe:0', '-f', 'mp3', '-ac', '1', '-ar', '16000', '-b:a', '64k', 'pipe:1'], {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    const chunks: Buffer[] = []
    ff.stdout.on('data', c => chunks.push(c as Buffer))
    ff.on('error', reject)
    ff.on('close', code => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited ${code}`))))
    ff.stdin.on('error', () => {}) // ignore EPIPE if ffmpeg closes early
    ff.stdin.end(input)
  })
}

export interface SpeakingGrade {
  score: number
  max_score: number
  feedback: {
    band: number | null
    criteria: { name: string; score: number; comment: string }[]
    manner_score: number | null // 0-5 delivery-only rating (pronunciation/fluency/intelligibility), used by Versant-style scoring
    pronunciation: string
    strengths_en: string
    improvements_en: string
    improvements_ja: string
    heard: string // rough transcript of what was heard (for tutor/records; not shown to the student)
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Parse JSON from a model reply that may be wrapped in code fences or prose. */
function extractJson(raw: string): Record<string, unknown> {
  let s = raw.trim()
  if (s.startsWith('```')) s = s.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1)
  return JSON.parse(s) as Record<string, unknown>
}

/**
 * Grade a spoken answer from its audio against a rubric.
 * @param mp3Base64  base64 of the mp3 (already transcoded)
 */
export async function gradeSpeakingFromAudio(opts: {
  mp3Base64: string
  taskPrompt: string
  rubric: RubricRow | null
  skill: Skill
  maxScore?: number          // this question's point value (e.g. 5); rubric = criteria only
  reference?: string         // for picture tasks: what the illustration shows / expected answers
}): Promise<SpeakingGrade> {
  const max = Number(opts.maxScore) || Number(opts.rubric?.max_score) || Number((opts.rubric?.criteria as Record<string, unknown>)?.max_score) || 9
  const criteria = opts.rubric?.criteria ?? {}

  const systemPrompt = `You are an experienced, calibrated examiner scoring a SPOKEN answer on an English speaking test. You are given the candidate's ACTUAL AUDIO recording.

Judge BOTH:
  - delivery: pronunciation, word/sentence stress, intonation, rhythm, fluency, hesitation; and
  - language: task fulfilment, content/relevance, grammar and vocabulary.
Score strictly against the supplied rubric. Do not reward content that doesn't address the task. If the audio is empty, silent, or not English, score very low and say so.

Return ONLY a JSON object — no markdown, no code fences, no commentary before or after:
{
  "overall_score": number,            // 0..${max}
  "band": number | null,              // band/level if the rubric is band-based, else null
  "criteria": [ { "name": string, "score": number, "comment": string } ],
  "manner_score": number,             // 0..5 DELIVERY ONLY — pronunciation, fluency, rhythm, intelligibility — judged independently of whether the content was correct (5 = clear conversational pace, 3 = non-native but fully intelligible, 0 = unintelligible/silent)
  "pronunciation": string,            // 1-2 sentences specifically on pronunciation/intonation/fluency
  "strengths_en": string,
  "improvements_en": string,
  "improvements_ja": string,          // same advice in natural, friendly Japanese
  "heard": string                     // a rough transcript of what you heard
}`

  const userText = `MAX SCORE: ${max}

TASK PROMPT:
${opts.taskPrompt || '(none provided)'}
${opts.reference ? `\nEXPECTED CONTENT (reference for content scoring — the expected answer, the exact sentence the candidate was asked to repeat, the passage they heard, or what an illustration they are describing shows):\n${opts.reference}\n` : ''}
RUBRIC (JSON):
${JSON.stringify(criteria, null, 2)}

Listen to the attached audio and grade it.`

  // Note: audio models (e.g. gpt-audio) don't support response_format:json_object,
  // so we ask for raw JSON in the prompt and parse defensively.
  const completion = await getOpenAI().chat.completions.create({
    model: AUDIO_MODEL,
    modalities: ['text'],
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'input_audio', input_audio: { data: opts.mp3Base64, format: 'mp3' } },
        ],
      },
    ],
  } as Parameters<OpenAI['chat']['completions']['create']>[0]) as OpenAI.Chat.Completions.ChatCompletion

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('No response from audio grader')
  const parsed = extractJson(raw)
  const score = clamp(Number(parsed.overall_score) || 0, 0, max)

  return {
    score,
    max_score: max,
    feedback: {
      band: parsed.band === null || parsed.band === undefined ? null : Number(parsed.band),
      criteria: Array.isArray(parsed.criteria)
        ? (parsed.criteria as Record<string, unknown>[]).map(c => ({
            name: String(c.name ?? ''), score: Number(c.score) || 0, comment: String(c.comment ?? ''),
          }))
        : [],
      manner_score: parsed.manner_score === null || parsed.manner_score === undefined
        ? null
        : clamp(Number(parsed.manner_score) || 0, 0, 5),
      pronunciation: String(parsed.pronunciation ?? ''),
      strengths_en: String(parsed.strengths_en ?? ''),
      improvements_en: String(parsed.improvements_en ?? ''),
      improvements_ja: String(parsed.improvements_ja ?? ''),
      heard: String(parsed.heard ?? ''),
    },
  }
}
