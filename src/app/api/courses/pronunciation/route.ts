import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess } from '@/lib/test-entitlement'
import { toWav16k, assess, coach, praise, verdictFor, normalizeAccent, targetAssessment, sentenceScore, stressScore, stressCoach, sentenceStressScore, connectedScore, connectedCoach, flowGradeLLM, type TargetAssessment } from '@/lib/pronunciation'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/courses/pronunciation   (multipart/form-data)
 *   Fields: audio (file), referenceText (string), accent ('en-GB'|'en-US'),
 *           targetLabel? (string, the sound to watch), lessonId? (for gating)
 *
 * Grades a spoken attempt with Azure pronunciation assessment and returns a
 * score sheet (overall / accuracy / fluency / completeness / prosody, plus
 * per-word and per-phoneme scores), a verdict, and a short coaching line.
 * Nothing is persisted; this is instant feedback inside a lesson.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const audio = form.get('audio')
  const referenceText = form.get('referenceText')
  // The grading accent is the user's saved preference (the single source of
  // truth), not whatever the client sends. Falls back to the form value, then
  // British. This keeps the model audio they shadowed and the scorer aligned.
  const { data: accentProfile } = await supabase.from('profiles').select('pronunciation_accent').eq('id', user.id).maybeSingle()
  const accent = normalizeAccent(accentProfile?.pronunciation_accent ?? form.get('accent') ?? 'en-GB')
  const targetLabel = form.get('targetLabel')?.toString() || undefined
  const targetSound = form.get('targetSound')?.toString() || undefined
  const mode = form.get('mode')?.toString() || undefined // 'stress' (syllables) or 'stress_sentence' (word durations)
  let stressedIndices: number[] = []
  try { const raw = form.get('stressed')?.toString(); if (raw) stressedIndices = JSON.parse(raw) } catch { /* ignore */ }
  const targetIdxRaw = form.get('targetPhonemeIndex')?.toString()
  const targetPhonemeIndex = targetIdxRaw != null && targetIdxRaw !== '' ? Number(targetIdxRaw) : undefined
  const lessonId = form.get('lessonId')?.toString() || undefined
  const screenId = form.get('screenId')?.toString() || undefined

  if (!(audio instanceof File) || typeof referenceText !== 'string' || !referenceText.trim()) {
    return NextResponse.json({ error: 'audio file and referenceText are required' }, { status: 400 })
  }

  // Gate to mirror lesson access: if the attempt is tied to a paid lesson, the
  // caller needs entitlement (or admin). Free lessons (Level 1) are open.
  if (lessonId) {
    const { data: lesson } = await supabase.from('lessons').select('free').eq('id', lessonId).maybeSingle()
    if (lesson && !lesson.free && !isAdminTestUser(user) && !(await hasTestAccess(supabase, user))) {
      return NextResponse.json({ error: 'A subscription is required', code: 'payment_required' }, { status: 402 })
    }
  }

  const buffer = Buffer.from(await audio.arrayBuffer())
  if (buffer.length === 0) return NextResponse.json({ error: 'Empty recording' }, { status: 400 })

  let wav: Buffer
  try {
    wav = toWav16k(buffer)
  } catch (e) {
    console.error('Pronunciation transcode failed:', e)
    return NextResponse.json({ error: 'Could not process the recording' }, { status: 500 })
  }

  let result
  try {
    result = await assess(wav, referenceText.trim(), accent)
  } catch (e) {
    console.error('Azure pronunciation assessment failed:', e)
    return NextResponse.json({ error: 'Grading is temporarily unavailable' }, { status: 502 })
  }

  // Word drills name a target phoneme (minimal pairs) and grade on it, since the
  // overall word score is too lenient on sounds like R. Sentences have no single
  // target, so they grade on the accent-sensitive composite (accuracy + prosody),
  // not the blended overall that completeness/fluency inflate.
  //
  // This only works on en-US: Azure returns IPA phoneme labels + n-best there,
  // so we can locate the target sound. en-GB returns phoneme *scores* but no
  // labels/n-best/prosody, so for British grading we fall back to the word-level
  // accuracy (which, for these short minimal-pair words, tracks the target vowel
  // or consonant closely) and the accuracy-only sentence composite.
  const isSentence = referenceText.trim().includes(' ')
  const wordAccuracy = () => (isSentence ? sentenceScore(result) : (result.words[0]?.accuracy ?? result.overall))
  let target: TargetAssessment | null = null
  let basis: number
  let flowTip: { en: string; ja: string } | null = null
  if (mode === 'connected') {
    // Connected speech: grade flow with the audio model (it can hear linking,
    // which Azure can't). Fall back to Azure fluency if the model flakes.
    const flow = await flowGradeLLM(wav, referenceText.trim())
    if (flow) { basis = flow.score; flowTip = { en: flow.en, ja: flow.ja } }
    else basis = connectedScore(result)
    if (result.completeness < 70) basis = Math.min(basis, 45)
  } else if (mode === 'stress_sentence') {
    // Sentence-stress: grade on content-vs-function word duration prominence.
    basis = sentenceStressScore(result, stressedIndices)
  } else if (mode === 'stress') {
    // Word-stress drills grade on syllable reduction + prosody, not a phoneme.
    basis = stressScore(result, accent)
  } else if (accent === 'en-US') {
    // Precise: grade the named target phoneme. A word with no resolvable target
    // (e.g. the diphthongs lesson) grades on word accuracy; sentences on the composite.
    target = targetAssessment(result, { targetPhonemeIndex, targetSound, expectedLabel: targetLabel })
    basis = target ? target.score : wordAccuracy()
  } else {
    basis = wordAccuracy()
  }
  const verdict = verdictFor(result.overall, basis)
  // Clean attempts get free, pre-written praise; only "good"/"retry" spend an
  // LLM call, where a specific, actionable tip is worth generating.
  const coaching = mode === 'connected'
    ? (verdict === 'great' ? praise() : (flowTip ?? connectedCoach(verdict)))
    : mode === 'stress_sentence'
    ? (verdict === 'great' ? praise() : { en: 'Lean on the content words and let the small grammar words shrink.', ja: '内容語に乗り、小さな文法語は弱めましょう。' })
    : mode === 'stress'
      ? stressCoach(verdict)
      : verdict === 'great'
        ? praise(targetSound)
        : await coach(referenceText.trim(), result, targetLabel, target, verdict)

  // Record the attempt so the lesson can show a pronunciation score. Best-effort:
  // never fail grading if the table is missing or the insert errors.
  if (lessonId) {
    const { error: saveErr } = await supabase.from('pronunciation_attempts').insert({
      user_id: user.id,
      lesson_id: lessonId,
      screen_id: screenId ?? null,
      item_key: referenceText.trim(),
      reference_text: referenceText.trim(),
      target_label: targetLabel ?? null,
      score: Math.round(basis),
      overall: Math.round(result.overall),
      verdict,
      accent,
    })
    if (saveErr) console.error('Could not save pronunciation attempt:', saveErr.message)
  }

  return NextResponse.json({ ...result, verdict, score: Math.round(basis), target, coaching })
}
