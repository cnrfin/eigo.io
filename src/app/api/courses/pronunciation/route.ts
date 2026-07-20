import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess } from '@/lib/test-entitlement'
import { getUserPermissions } from '@/lib/user-permissions'
import { guestRateLimit } from '@/lib/guest-rate-limit'
import { toWav16k, assess, coach, praise, verdictFor, normalizeAccent, targetAssessment, sentenceScore, stressScore, stressCoach, sentenceStressScore, connectedScore, connectedCoach, flowGradeLLM, type TargetAssessment } from '@/lib/pronunciation'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * GET /api/courses/pronunciation?lessonId=...
 *   Returns the caller's graded items for a lesson (best attempt per item) plus
 *   the overall average — drives the pronunciation results screen. Service-role
 *   read (the table has no row policies); scoped to the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  // lessonId is preferred, but it can get dropped through an OAuth redirect, so
  // fall back to the user's most recent pronunciation attempt (a fresh
  // anon→sign-up user has only the lesson they just did).
  let lessonId = request.nextUrl.searchParams.get('lessonId')
  if (!lessonId) {
    const { data: latest } = await supabase
      .from('pronunciation_attempts')
      .select('lesson_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    lessonId = latest?.lesson_id ?? null
  }
  if (!lessonId) return NextResponse.json({ items: [], overall: null })

  const { data: rows } = await supabase
    .from('pronunciation_attempts')
    .select('item_key, reference_text, target_label, score, verdict, audio_path, details, created_at')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })

  // Keep the best attempt per item (mirrors how the lesson score is computed).
  type Item = { itemKey: string; referenceText: string; targetLabel: string | null; score: number; verdict: string | null; audioPath: string | null; details: unknown; audioUrl?: string | null }
  const best = new Map<string, Item>()
  for (const r of rows ?? []) {
    const prev = best.get(r.item_key)
    if (!prev || r.score > prev.score) {
      best.set(r.item_key, { itemKey: r.item_key, referenceText: r.reference_text, targetLabel: r.target_label, score: r.score, verdict: r.verdict, audioPath: r.audio_path ?? null, details: r.details ?? null })
    }
  }
  const items = [...best.values()]

  // Sign the stored recordings (funnel attempts only) for playback. Short TTL —
  // the results screen is a one-time, immediate-after-sign-up view.
  await Promise.all(
    items.map(async (it) => {
      if (!it.audioPath) return
      const { data: signed } = await supabase.storage.from('pronunciation-audio').createSignedUrl(it.audioPath, 60 * 60)
      it.audioUrl = signed?.signedUrl ?? null
    }),
  )

  const overall = items.length ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : null
  return NextResponse.json({ items: items.map(({ audioPath: _omit, ...rest }) => rest), overall })
}

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

  // Per-user feature permission: an admin can switch off course access for a
  // user; the pronunciation course is part of courses, so block grading too.
  if (!isAdminTestUser(user) && !(await getUserPermissions(supabase, user.id)).courses_enabled) {
    return NextResponse.json({ error: 'Courses are not included in your plan', code: 'feature_disabled' }, { status: 403 })
  }

  // Abuse guard for landing-funnel guests: grading spends money on every call
  // (Azure assessment + occasional LLM coaching), and anonymous users are free
  // to mint. Cap them per-user and per-IP; real signed-in accounts are exempt.
  // Generous enough for an honest run through the free lesson (with retries).
  if (user.isAnonymous) {
    const limited = await guestRateLimit(request, user.id, 'pron_attempt', {
      perUser: [60, 3600],
      perIp: [150, 3600],
    })
    if (limited) return limited
  }

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

  // The exact breakdown the client renders — also persisted (anon only) so the
  // funnel results screen can rebuild the same card.
  const payload = { ...result, verdict, score: Math.round(basis), target, coaching }

  // Record the attempt so the lesson can show a pronunciation score. Best-effort:
  // never fail grading if the table is missing or the insert errors.
  if (lessonId) {
    // Funnel (anonymous) attempts upload the recording so the post-sign-up
    // results screen can play it back; regular accounts keep using local blobs.
    // The 24h prune cron cleans the bucket up afterwards. Best-effort.
    let audioPath: string | null = null
    if (user.isAnonymous) {
      try {
        const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm'
        const path = `${user.id}/${lessonId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('pronunciation-audio')
          .upload(path, buffer, { contentType: audio.type || 'audio/webm', upsert: false })
        if (upErr) console.error('Could not upload pronunciation audio:', upErr.message)
        else audioPath = path
      } catch (e) {
        console.error('Pronunciation audio upload failed:', e)
      }
    }

    // Full breakdown for the funnel results screen (anon only) — the node render
    // info (display text, model clip, syllable/stress data) + the grade.
    let details: { node: unknown; grade: typeof payload } | null = null
    if (user.isAnonymous) {
      let node: unknown = null
      try { const raw = form.get('node')?.toString(); if (raw) node = JSON.parse(raw) } catch { /* ignore */ }
      details = { node, grade: payload }
    }

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
      audio_path: audioPath,
      details,
    })
    if (saveErr) console.error('Could not save pronunciation attempt:', saveErr.message)
  }

  return NextResponse.json(payload)
}
