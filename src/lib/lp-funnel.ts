'use client'

/* Free-funnel config + orchestration for the v2 landing cards.
   Principle (see mockups/free-funnel-flows-plan.md): let the guest do the
   valuable thing first, then ask for the account at the payoff moment. On the
   first card tap we mint an anonymous user so the existing test/lesson APIs
   (all keyed on user.id) write real rows; on sign-up we convert the SAME user. */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export type CardKey = 'trial' | 'cefr' | 'pron' | 'toeic' | 'ielts'

type CardConfig =
  | { kind: 'test'; formSlug: string }
  // lesson cards (pron / toeic / ielts): resolve the course's FREE lesson at
  // runtime and route into the lesson player in gate mode.
  | { kind: 'lesson'; course: { by: 'slug' | 'exam'; value: string } }
  | { kind: 'todo' } // not wired into the funnel yet (placeholder → AuthModal)

// CEFR runs the test stack; pron/toeic/ielts run the lesson player. Trial still
// falls back to the auth modal until its booking flow is built.
export const CARD_CONFIG: Record<CardKey, CardConfig> = {
  cefr: { kind: 'test', formSlug: 'cefr-check-01' },
  pron: { kind: 'lesson', course: { by: 'slug', value: 'pronunciation' } },
  toeic: { kind: 'lesson', course: { by: 'exam', value: 'toeic' } },
  ielts: { kind: 'lesson', course: { by: 'exam', value: 'ielts' } },
  trial: { kind: 'todo' },
}

// Gate copy per surface (shown at the payoff moment). `more` (optional) carries
// a "{num} more lessons" line filled from the course's remaining count; `cta` is
// the primary button — a short imperative, not a sentence.
export type GateCopy = {
  titleJa: string; titleEn: string
  subJa: string; subEn: string
  moreJa?: string; moreEn?: string
  ctaJa: string; ctaEn: string
}
export const GATE_COPY: Record<string, GateCopy> = {
  cefr: {
    titleJa: 'おつかれさまでした！',
    titleEn: 'Well done!',
    subJa: '無料登録で、あなたのCEFRスコアを確認。結果は数分で表示されます。',
    subEn: 'Sign up for free to see your CEFR score. Your results will be ready within minutes.',
    ctaJa: '結果を見る',
    ctaEn: 'See results',
  },
  pron: {
    titleJa: '結果ができました！',
    titleEn: 'Your results are waiting!',
    subJa: '無料登録で、発音スコアを確認しましょう。',
    subEn: 'Sign up for free to see your pronunciation score.',
    moreJa: 'このコースには、あと{num}レッスンあります！',
    moreEn: 'There are {num} more lessons in this course!',
    ctaJa: '結果を見る',
    ctaEn: 'See results',
  },
  // generic lesson payoff (toeic / ielts)
  lesson: {
    titleJa: 'レッスン1が完了！',
    titleEn: 'Lesson 1 finished!',
    subJa: '無料登録で、続きを学びましょう。',
    subEn: 'Sign up for free to continue.',
    moreJa: 'このコースには、あと{num}レッスンあります！',
    moreEn: 'There are {num} more lessons in this course!',
    ctaJa: '続ける',
    ctaEn: 'Continue',
  },
  trial: {
    titleJa: '予約まであと少し！',
    titleEn: 'Almost booked!',
    subJa: '無料登録で、体験レッスンの予約が確定します。',
    subEn: 'Sign up for free to confirm your trial booking.',
    ctaJa: '予約する',
    ctaEn: 'Book',
  },
}

// A trial slot the guest picked on the landing, finalized into a real booking
// after sign-up (booking needs a real email, so it can't be made as a guest).
export type PendingTrial = { date: string; time: string; duration: number; timezone: string }
const PENDING_TRIAL_KEY = 'eigo:pendingTrial'
export function stashPendingTrial(p: PendingTrial) {
  try { localStorage.setItem(PENDING_TRIAL_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}
export function readPendingTrial(): PendingTrial | null {
  try { const s = localStorage.getItem(PENDING_TRIAL_KEY); return s ? (JSON.parse(s) as PendingTrial) : null } catch { return null }
}
export function clearPendingTrial() {
  try { localStorage.removeItem(PENDING_TRIAL_KEY) } catch { /* ignore */ }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

type ApiLesson = { id: string; free?: boolean }
type ApiCourse = { slug: string; exam_slug: string; levels?: { lessons?: ApiLesson[] }[] }

/** Resolve a course's free lesson id via /api/courses (works for anon users —
 *  free lessons are public). Returns the first `free` lesson, else the first. */
async function resolveFreeLessonId(token: string, course: { by: 'slug' | 'exam'; value: string }): Promise<string | null> {
  const res = await fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
  const d = (await res.json().catch(() => ({}))) as { courses?: ApiCourse[] }
  if (!res.ok || !d.courses?.length) return null
  const c = d.courses.find((x) => (course.by === 'slug' ? x.slug === course.value : x.exam_slug === course.value))
  if (!c) return null
  const lessons = (c.levels ?? []).flatMap((l) => l.lessons ?? [])
  if (!lessons.length) return null
  return (lessons.find((l) => l.free) ?? lessons[0]).id
}

/** Orchestrates a card tap: ensure a session (anon for guests), start the
 *  feature, and route into it. Guests get ?gate=1 so the take page gates the
 *  results behind sign-up; already-signed-in users go straight through.
 *  `getCaptchaToken` (optional) supplies an hCaptcha token for the anon sign-in
 *  when Supabase bot protection is enabled. */
export function useCardFunnel(getCaptchaToken?: () => Promise<string | null>) {
  const { user, signInAnonymously } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState<CardKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openCard = useCallback(
    async (key: CardKey): Promise<'started' | 'fallback'> => {
      const cfg = CARD_CONFIG[key]
      if (cfg.kind === 'todo') return 'fallback'
      if (busy) return 'started'
      setBusy(key)
      setError(null)
      try {
        // Ensure we have a session — mint an anonymous one for guests.
        let token = await getAccessToken()
        const wasGuest = !user
        if (!token) {
          const captchaToken = getCaptchaToken ? await getCaptchaToken() : null
          const { error: anonError, session } = await signInAnonymously(captchaToken)
          if (anonError) throw anonError
          token = session?.access_token ?? (await getAccessToken())
        }
        if (!token) throw new Error('Could not start a session')

        // Guests (anon or brand-new) get the sign-up gate at the payoff.
        const isGuest = wasGuest || !!user?.is_anonymous
        const q = isGuest ? '?gate=1' : ''

        if (cfg.kind === 'test') {
          // Free CEFR exam — works for anon users.
          const res = await fetch('/api/tests/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ formSlug: cfg.formSlug }),
          })
          const d = await res.json().catch(() => ({}))
          if (!res.ok || !d.attempt) throw new Error(d.error || 'Could not start the test')
          router.push(`/dashboard/tests/take/${d.attempt.id}${q}`)
          return 'started'
        }

        // Lesson card: resolve the course's free lesson, then open the player.
        const lessonId = await resolveFreeLessonId(token, cfg.course)
        if (!lessonId) throw new Error('Could not find a free lesson')
        router.push(`/dashboard/courses/lessons/${lessonId}${q}`)
        return 'started'
      } catch (e) {
        setBusy(null)
        setError(e instanceof Error ? e.message : 'Something went wrong')
        return 'fallback'
      }
    },
    [busy, user, signInAnonymously, router, getCaptchaToken],
  )

  // Ensure a session exists (mint an anonymous one for guests). Used by the
  // trial flow so the FreeGate's convert path works uniformly even though the
  // booking itself is finalized after sign-up.
  const ensureGuestSession = useCallback(async (): Promise<boolean> => {
    const existing = await getAccessToken()
    if (existing) return true
    const captchaToken = getCaptchaToken ? await getCaptchaToken() : null
    const { error: anonError, session } = await signInAnonymously(captchaToken)
    return !anonError && !!session
  }, [signInAnonymously, getCaptchaToken])

  return { openCard, ensureGuestSession, busy, error }
}
