'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import Header from '@/components/Header'
import PronResultCard, { type GradeResult, type ResultNode } from '@/components/courses/PronResultCard'

type Item = {
  itemKey: string
  referenceText: string
  targetLabel: string | null
  score: number
  verdict: string | null
  audioUrl?: string | null
  details?: { node: ResultNode; grade: GradeResult } | null
}

/* Pronunciation result — the funnel payoff. Shown once after a guest finishes
   the free L&R lesson and signs up. Mirrors the test-grading results template:
   a big overall score plus a per-item breakdown (score bars), with Home / Try
   again. Data comes from pronunciation_attempts (saved during the lesson; the
   same user.id survives the conversion). */
export default function PronunciationResultPage() {
  const { session } = useAuth()
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const t = (j: string, e: string) => (ja ? j : e)

  const [lessonId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lesson') : null,
  )
  const [items, setItems] = useState<Item[]>([])
  const [overall, setOverall] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.access_token) return
    let cancelled = false
    const run = async () => {
      try {
        // lessonId may be missing (e.g. dropped through an OAuth redirect); the
        // API falls back to the user's most recent pronunciation attempt.
        const url = lessonId ? `/api/courses/pronunciation?lessonId=${lessonId}` : '/api/courses/pronunciation'
        const r = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const d = await r.json()
        if (cancelled) return
        setItems(d.items ?? [])
        setOverall(d.overall ?? null)
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [session?.access_token, lessonId])

  const verdict = overall == null ? null : overall >= 80 ? t('すばらしい！', 'Excellent!') : overall >= 60 ? t('いい調子です', 'Nicely done') : t('練習を続けましょう', 'Keep practising')
  const barColor = (s: number) => (s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--accent)' : 'var(--warning)')

  return (
    <main className="min-h-screen" style={{ background: 'var(--dash-bg)' }}>
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <SquircleBox cornerRadius={24} className="p-8" style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>
            {t('発音チェックの結果', 'Pronunciation result')}
          </p>

          {loading ? (
            <div className="my-10 mx-auto h-12 w-12 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
          ) : (
            <>
              {/* Hero overall */}
              {overall != null ? (
                <div className="text-center">
                  <p className="mt-4 font-bold leading-none" style={{ fontSize: 64, color: 'var(--accent)' }}>
                    {overall}
                    <span className="text-2xl" style={{ color: 'var(--text-muted)' }}> / 100</span>
                  </p>
                  {verdict && <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>{verdict}</p>}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {t('LとRの発音をAIが採点しました。', 'Your L and R sounds, graded by AI.')}
                  </p>
                </div>
              ) : (
                <p className="my-8 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  {t('レッスンが完了しました。', 'Lesson complete.')}
                </p>
              )}

              {/* Per-item breakdown — the same card as the in-lesson challenge
                  summary (model + your audio, phoneme/syllable/word feedback,
                  coaching) when the full detail was persisted; otherwise a bar. */}
              {items.length > 0 && (
                <div className="mt-8 flex flex-col gap-3">
                  {items.map((it) =>
                    it.details?.node && it.details?.grade ? (
                      <PronResultCard
                        key={it.itemKey}
                        node={it.details.node}
                        result={it.details.grade}
                        userAudioUrl={it.audioUrl}
                        locale={ja ? 'ja' : 'en'}
                      />
                    ) : (
                      <div key={it.itemKey}>
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{it.targetLabel || it.referenceText}</span>
                          <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: barColor(it.score) }}>{it.score}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--inset)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, it.score))}%`, background: barColor(it.score) }} />
                        </div>
                        {it.audioUrl && <audio controls src={it.audioUrl} className="w-full h-9 mt-2" />}
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <Link href="/dashboard/courses/pronunciation" className="px-6 py-3 font-medium text-center transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'var(--accent)', color: '#fff' }}>
                {t('もう一度挑戦', 'Try again')}
              </Link>
            </Squircle>
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <Link href="/dashboard" className="px-6 py-3 font-medium text-center transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'var(--card-inset)', color: 'var(--text)' }}>
                {t('ホームへ', 'Home')}
              </Link>
            </Squircle>
          </div>
        </SquircleBox>
      </div>
    </main>
  )
}
