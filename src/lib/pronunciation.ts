import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import OpenAI from 'openai'
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Pronunciation grading for the pronunciation course.
 *
 * The browser records webm/mp4; Azure's pronunciation assessment wants 16 kHz
 * mono PCM WAV, so we transcode with ffmpeg first. Azure returns per-phoneme
 * accuracy scores (en-GB default, en-US adds a prosody score), which a cheap
 * text model then turns into a friendly coaching line. The Azure key never
 * leaves the server.
 */

function ffmpegPath(): string {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg'
}

/** Transcode WAV to mp3. The audio model answers reliably on mp3 but flakes on
 *  16 kHz wav (returns "please provide the audio" ~half the time). */
function toMp3(input: Buffer): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'pron-'))
  try {
    const inp = join(dir, 'in.wav')
    const out = join(dir, 'out.mp3')
    writeFileSync(inp, input)
    const r = spawnSync(ffmpegPath(), ['-y', '-i', inp, '-c:a', 'libmp3lame', '-q:a', '4', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.status !== 0) throw new Error('ffmpeg mp3 failed')
    return readFileSync(out)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Transcode any browser recording to 16 kHz mono 16-bit WAV (what Azure wants). */
export function toWav16k(input: Buffer): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'pron-'))
  try {
    const inp = join(dir, 'in')
    const out = join(dir, 'out.wav')
    writeFileSync(inp, input)
    const r = spawnSync(ffmpegPath(), ['-y', '-i', inp, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', out], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr?.toString().slice(-200) ?? ''))
    return readFileSync(out)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export type Phoneme = { label: string; score: number; nbest?: { label: string; score: number }[] }
export type Syllable = { label: string; score: number }
export type WordScore = { word: string; accuracy: number; errorType: string; phonemes: Phoneme[]; syllables: Syllable[]; duration: number }
export interface PronResult {
  recognized: string
  overall: number
  accuracy: number
  fluency: number
  completeness: number
  prosody?: number
  words: WordScore[]
}

export type Accent = 'en-GB' | 'en-US'
export function normalizeAccent(v: unknown): Accent {
  return String(v).toLowerCase() === 'en-us' ? 'en-US' : 'en-GB'
}

/** Run Azure pronunciation assessment on a WAV buffer against the reference text. */
export function assess(wav: Buffer, referenceText: string, locale: Accent): Promise<PronResult> {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) throw new Error('Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION')
  const enableProsody = locale === 'en-US' // prosody scoring is en-US only

  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
    speechConfig.speechRecognitionLanguage = locale
    const audioConfig = sdk.AudioConfig.fromWavFileInput(wav)
    // fromJSON so we can request n-best phoneme detection: Azure returns, per
    // expected phoneme, the phonemes it actually heard with scores. That's how
    // we catch an L (or ら tap) substituted for an R rather than trusting the
    // lenient overall word score.
    const pa = sdk.PronunciationAssessmentConfig.fromJSON(JSON.stringify({
      referenceText,
      gradingSystem: 'HundredMark',
      granularity: 'Phoneme',
      phonemeAlphabet: 'IPA',
      nbestPhonemeCount: 5,
      enableMiscue: true, // catch omitted/added words so completeness is meaningful
    }))
    pa.enableProsodyAssessment = enableProsody
    const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    pa.applyTo(reco)

    reco.recognizeOnceAsync(
      (r) => {
        try {
          if (r.reason === sdk.ResultReason.NoMatch || r.reason === sdk.ResultReason.Canceled) {
            resolve({ recognized: '', overall: 0, accuracy: 0, fluency: 0, completeness: 0, words: [] })
            return
          }
          const res = sdk.PronunciationAssessmentResult.fromResult(r)
          type AzPhon = { Phoneme?: string; PronunciationAssessment?: { AccuracyScore?: number; NBestPhonemes?: { Phoneme?: string; Score?: number }[] } }
          type AzSyl = { Syllable?: string; PronunciationAssessment?: { AccuracyScore?: number } }
          type AzWord = { Word: string; Duration?: number; PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string }; Phonemes?: AzPhon[]; Syllables?: AzSyl[] }
          const words: WordScore[] = (((res.detailResult?.Words ?? []) as unknown) as AzWord[]).map((w) => ({
            word: w.Word,
            accuracy: w.PronunciationAssessment?.AccuracyScore ?? 0,
            errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
            duration: w.Duration ?? 0,
            phonemes: (w.Phonemes ?? []).map((p) => ({
              label: p.Phoneme ?? '',
              score: p.PronunciationAssessment?.AccuracyScore ?? 0,
              nbest: (p.PronunciationAssessment?.NBestPhonemes ?? []).map((n) => ({ label: n.Phoneme ?? '', score: n.Score ?? 0 })),
            })),
            syllables: (w.Syllables ?? []).map((s) => ({ label: s.Syllable ?? '', score: s.PronunciationAssessment?.AccuracyScore ?? 0 })),
          }))
          resolve({
            recognized: r.text ?? '',
            overall: res.pronunciationScore ?? 0,
            accuracy: res.accuracyScore ?? 0,
            fluency: res.fluencyScore ?? 0,
            completeness: res.completenessScore ?? 0,
            prosody: enableProsody ? res.prosodyScore : undefined,
            words,
          })
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)))
        } finally {
          reco.close()
        }
      },
      (e) => {
        reco.close()
        reject(new Error(String(e)))
      },
    )
  })
}

export type Verdict = 'great' | 'good' | 'retry'
export type TargetAssessment = { index: number; label?: string; score: number; detected?: string }

// IPA symbols Azure (en-US) returns for our target consonants. The key is the
// short code used in lesson content (targetSound); the value is the phoneme to
// match in Azure's output.
const IPA_FOR: Record<string, string> = {
  r: 'ɹ', l: 'l',
  th: 'θ', dh: 'ð', s: 's', z: 'z', sh: 'ʃ',
  v: 'v', b: 'b', f: 'f', h: 'h',
  // Vowels (en-US IPA symbols Azure returns). Used for the target-phoneme
  // grade on en-US; en-GB grades on word accuracy (no phoneme labels there).
  ee: 'i', ih: 'ɪ', oo: 'u', uh: 'ʊ', ae: 'æ', ah: 'ʌ', eh: 'ɛ', er: 'ɝ', aw: 'ɔ',
}

/**
 * For minimal-pair drills, the truth is in the target phoneme, not the lenient
 * overall word score. Locate it either by an explicit index, or by sound
 * ('r'/'l') so the same target works in any position (right, arrive, store).
 * Returns that phoneme's score and, via n-best, what Azure actually heard.
 */
export function targetAssessment(
  result: PronResult,
  opts: { targetPhonemeIndex?: number; targetSound?: string; expectedLabel?: string },
): TargetAssessment | null {
  const phs = result.words[0]?.phonemes ?? []
  let ph: Phoneme | undefined
  let index = -1
  if (opts.targetPhonemeIndex != null && !Number.isNaN(opts.targetPhonemeIndex)) {
    index = opts.targetPhonemeIndex
    ph = phs[index]
  } else if (opts.targetSound) {
    const code = opts.targetSound
    const sym = IPA_FOR[code]
    // R fuses into r-coloured vowels (ɛɹ, ɑɹ, ɚ, ɝ...), so match those too;
    // others match by substring. Worst-scoring instance is most diagnostic.
    const matches = (label: string) => (code === 'r' ? /[ɹɚɝr]/.test(label) : sym ? label.includes(sym) : false)
    phs.forEach((p, i) => { if (matches(p.label) && (!ph || p.score < ph.score)) { ph = p; index = i } })
  }
  if (!ph) return null
  const top = ph.nbest?.[0]
  const detected = top && top.label && top.label !== ph.label ? top.label : undefined
  return { index, label: ph.label || opts.expectedLabel, score: ph.score, detected }
}

/** Verdict from the target phoneme when we have one (stricter), else the overall. */
export function verdictFor(overall: number, targetScore?: number): Verdict {
  const basis = targetScore ?? overall
  return basis >= 80 ? 'great' : basis >= 60 ? 'good' : 'retry'
}

/**
 * Sentence basis. The blended overall score is propped up by completeness and
 * fluency (a thick accent still says every word, smoothly), which hides the
 * accent. The accent lives in segmental accuracy and prosody (rhythm and
 * intonation), so we score on those two and gate on completeness so omitting
 * words still fails. Prosody is en-US only; without it we fall back to accuracy.
 */
export function sentenceScore(result: PronResult): number {
  const base = result.prosody != null ? 0.6 * result.accuracy + 0.4 * result.prosody : result.accuracy
  const gated = result.completeness < 70 ? Math.min(base, 55) : base
  return Math.round(gated)
}

/**
 * Word-stress basis. Azure returns the reference syllables with reduced vowels
 * baked in (bə, nə), so per-syllable accuracy catches a learner who gives every
 * syllable equal weight (the Japanese mora habit) — the unstressed syllables
 * score low. Prosody captures the rhythm/stress directly, so we lean on it when
 * available (en-US only); en-GB falls back to syllable accuracy alone.
 */
export function stressScore(result: PronResult, locale: Accent): number {
  const syls = result.words[0]?.syllables ?? []
  const avgSyl = syls.length ? syls.reduce((a, s) => a + s.score, 0) / syls.length : result.accuracy
  if (locale === 'en-US' && result.prosody != null) return Math.round(0.4 * avgSyl + 0.6 * result.prosody)
  return Math.round(avgSyl)
}

/**
 * Connected-speech (flow) grade. Choppy, word-by-word speech (the Japanese
 * habit) scores low on Azure's FluencyScore, while smoothly linked speech scores
 * high (validated: 100 flowing vs 36 choppy). We lean on fluency, with a little
 * accuracy so garbled words still fail, and gate on completeness.
 */
export function connectedScore(result: PronResult): number {
  const base = Math.round(0.8 * result.fluency + 0.2 * result.accuracy)
  return result.completeness < 70 ? Math.min(base, 45) : base
}
const CONNECTED_TIP = { en: 'Join the words without stopping between them, and let the small words shrink.', ja: '語と語の間で止めず、つなげて言いましょう。小さな語は弱めます。' }
/** Connected-speech coaching: praise a clean attempt, else one templated tip. */
export function connectedCoach(verdict: Verdict): { en: string; ja: string } {
  return verdict === 'great' ? praise() : CONNECTED_TIP
}

/**
 * Flow grading via the audio model (gpt-audio). Azure can't hear linking, but an
 * audio LLM can. Used on full sentences (it's flaky on very short clips). The wav
 * is sent as mp3 (the model answers reliably on mp3 but flakes on 16 kHz wav),
 * with up to 3 retries against any remaining non-answer. Returns null on failure
 * so the caller can fall back to Azure fluency.
 */
export async function flowGradeLLM(wav: Buffer, sentence: string): Promise<{ score: number; en: string; ja: string } | null> {
  const model = process.env.OPENAI_AUDIO_MODEL || 'gpt-audio'
  const sys = `You are a strict English pronunciation examiner judging CONNECTED SPEECH (word linking and flow) only, not accent or vocabulary. Target sentence: "${sentence}". A native links the words into a smooth stream (final consonants join the next vowel, small words reduce). A learner who pronounces each word fully and separately, even with no pauses between them, must score low. Return ONLY JSON: {"flow": <integer 0-100>, "tip_en": "<one short, kind tip>", "tip_ja": "<the same tip in natural Japanese>"}. No code fences.`
  try {
    const b64 = toMp3(wav).toString('base64')
    for (let attempt = 0; attempt < 3; attempt++) {
      const completion = await getOpenAI().chat.completions.create({
        model,
        modalities: ['text'],
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: [{ type: 'text', text: 'Grade the linking and flow of this recording.' }, { type: 'input_audio', input_audio: { data: b64, format: 'mp3' } }] },
        ],
      } as unknown as Parameters<OpenAI['chat']['completions']['create']>[0]) as OpenAI.Chat.Completions.ChatCompletion
      const raw = completion.choices[0]?.message?.content ?? ''
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          const j = JSON.parse(m[0])
          if (typeof j.flow === 'number') return { score: Math.max(0, Math.min(100, Math.round(j.flow))), en: String(j.tip_en ?? ''), ja: String(j.tip_ja ?? '') }
        } catch { /* malformed, retry */ }
      }
    }
    return null
  } catch { return null }
}

const STRESS_TIP = { en: 'Make the strong beat longer and louder, and let the other syllables go weak.', ja: '強い拍をより長く大きく、ほかの音節は弱く短くしてみましょう。' }
/** Stress coaching: praise a clean attempt, else one templated stress tip (no LLM). */
export function stressCoach(verdict: Verdict): { en: string; ja: string } {
  return verdict === 'great' ? praise() : STRESS_TIP
}

/**
 * Sentence-stress production grade. Azure's prosody score can't tell which words
 * were stressed, but its per-word durations can: in natural English the content
 * words run markedly longer *per syllable* than the function words. We compare
 * the learner's per-syllable duration on the target (content) words against the
 * rest — a flat or mis-stressed reading collapses that ratio. `stressed` is the
 * list of content-word indices (into the reference word order).
 */
export function sentenceStressScore(result: PronResult, stressed: number[]): number {
  const words = result.words.filter((w) => w.errorType !== 'Insertion')
  if (words.length < 2 || !stressed?.length) return Math.round(result.accuracy)
  const perSyl = (w: WordScore) => (w.duration || 0) / Math.max(1, w.syllables.length || 1)
  const strong = words.filter((_, i) => stressed.includes(i)).map(perSyl).filter((x) => x > 0)
  const weak = words.filter((_, i) => !stressed.includes(i)).map(perSyl).filter((x) => x > 0)
  if (!strong.length || !weak.length) return Math.round(result.accuracy)
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  const ratio = avg(strong) / Math.max(1, avg(weak))
  // flat (ratio ~1.0) -> ~40; clear contrast (1.6) -> ~76; strong (2.0+) -> 100;
  // inverted (function words longer, <1) -> low. Gate on completeness so omitting
  // words can't score well.
  const score = Math.round(Math.max(0, Math.min(100, 40 + (ratio - 1.0) * 60)))
  return result.completeness < 70 ? Math.min(score, 45) : score
}

const SOUND_NAME: Record<string, string> = { r: 'R', l: 'L', th: 'TH', dh: 'TH', s: 'S', z: 'Z', sh: 'SH', v: 'V', b: 'B', f: 'F', h: 'H' }
const PRAISE_SOUND = [
  { en: (s: string) => `Clear ${s}! Nicely done.`, ja: (s: string) => `きれいな ${s} です！その調子。` },
  { en: (s: string) => `Spot on. Your ${s} sounded clean.`, ja: (s: string) => `バッチリ。${s} がはっきり出ていました。` },
  { en: (s: string) => `Great ${s}, that sounded natural.`, ja: (s: string) => `いい ${s}！自然に聞こえました。` },
  { en: (s: string) => `Perfect. The ${s} came through clearly.`, ja: (s: string) => `完璧です。${s} がクリアに聞こえました。` },
]
const PRAISE_GENERIC = [
  { en: 'Great job, clear and natural!', ja: 'お見事。クリアで自然でした！' },
  { en: 'Nicely said, that flowed well.', ja: 'いい感じ。なめらかでした。' },
  { en: 'Perfect, that sounded great.', ja: '完璧。とても良かったです。' },
]
/** Pre-written praise for a clean attempt (no LLM). Rotates, and names the sound. */
export function praise(targetSound?: string): { en: string; ja: string } {
  const s = targetSound ? SOUND_NAME[targetSound] : undefined
  if (s) {
    const p = PRAISE_SOUND[Math.floor(Math.random() * PRAISE_SOUND.length)]
    return { en: p.en(s), ja: p.ja(s) }
  }
  return PRAISE_GENERIC[Math.floor(Math.random() * PRAISE_GENERIC.length)]
}

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

/**
 * Turn raw phoneme scores into one short, warm coaching line (EN + JA). The
 * model only sees text, so this is near-free. Best-effort: returns null on any
 * failure so grading still works without it.
 */
export async function coach(
  referenceText: string,
  result: PronResult,
  targetLabel: string | undefined,
  target: TargetAssessment | null | undefined,
  verdict: Verdict,
): Promise<{ en: string; ja: string } | null> {
  try {
    const sys = `You are a warm English pronunciation coach for Japanese learners. Write ONE short line (under 30 words) in EN and JA. The Japanese must be natural teacher's Japanese, not a literal translation. Return ONLY JSON: {"en":"...","ja":"..."}.

Match the verdict exactly:
- "great": ONLY praise. Say what they did well (you may name the sound). Do NOT give any instruction, correction, how-to, or "keep/try/don't/make sure". No criticism at all.
- "good": brief praise plus ONE small, optional tweak.
- "retry": name the sound to fix and give one concrete physical cue (tongue or lips). For a sentence with low rhythm, coach rhythm and stress instead.

No phonetics jargon, no em-dashes.`
    const user = `Verdict: ${verdict}
Target: "${referenceText}"
Score: ${target ? Math.round(target.score) : result.overall}/100${result.prosody != null ? ` | rhythm: ${Math.round(result.prosody)}` : ''}
${target?.detected ? `It sounded more like "${target.detected}".` : ''}
Sound to watch: ${targetLabel ?? '(whole word)'}`
    const r = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_COACH_MODEL || 'gpt-5.4-nano',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    })
    const raw = r.choices[0]?.message?.content
    if (!raw) return null
    const j = JSON.parse(raw)
    if (typeof j.en === 'string' && typeof j.ja === 'string') return { en: j.en, ja: j.ja }
    return null
  } catch {
    return null
  }
}
