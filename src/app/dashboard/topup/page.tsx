'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Squircle } from '@squircle-js/react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import SquircleCard from '@/components/ui/SquircleCard'
import { aiMinutesLeft, type MinuteSnapshot } from '@/lib/minutes-core'

/**
 * Add AI minutes (pilot): one card, +60分 · ¥980, valid 3 months → Stripe Checkout → back here.
 * Design: the plans page, reduced to what's needed to buy.
 */

type Info = { aiEnabled: boolean; subscribed: boolean; snapshot: MinuteSnapshot | null }

export default function TopUpPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense>
      <TopUp />
    </Suspense>
  )
}

function TopUp() {
  const { session, loading } = useAuth()
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const router = useRouter()
  const params = useSearchParams()
  const done = params.get('done') === '1'
  const [info, setInfo] = useState<Info | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!session?.access_token) return null
    const r = await fetch('/api/subscription', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const d = r.ok ? await r.json() : null
    const next: Info = {
      aiEnabled: !!d?.features?.aiEnabled,
      subscribed: !!d?.subscription && d.subscription.status !== 'cancelled',
      snapshot: d?.aiMinutes?.snapshot ?? null,
    }
    setInfo(next)
    return next
  }, [session?.access_token])

  useEffect(() => {
    if (loading) return
    let alive = true
    void (async () => {
      const first = await load()
      if (!alive) return
      if (first && !first.aiEnabled) router.replace('/dashboard')
      // just paid: the webhook may land a moment after the redirect, so look again briefly
      if (done && first) {
        const before = first.snapshot ? aiMinutesLeft(first.snapshot) : 0
        for (let i = 0; i < 4 && alive; i++) {
          await new Promise((r) => setTimeout(r, 1500))
          const n = await load()
          if (n?.snapshot && aiMinutesLeft(n.snapshot) > before) break
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [loading, load, done, router])

  const buy = async () => {
    if (!session?.access_token) return
    setBusy(true)
    setError(false)
    try {
      const r = await fetch('/api/stripe/topup', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.url) throw new Error()
      window.location.href = d.url
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  const left = info?.snapshot ? aiMinutesLeft(info.snapshot) : null

  return (
    <section className="pt-12 pb-8">
      <motion.div className="max-w-2xl mx-auto w-full px-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
        <h1 className="text-2xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          {ja ? 'AI分数を追加' : 'Add AI minutes'}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          {done ? (ja ? '追加しました。ありがとうございます。' : 'Added. Thank you!') : left != null ? (ja ? `いまのAI分数: ${left}分` : `AI minutes now: ${left}`) : ' '}
        </p>

        <SquircleCard radius={20} className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1 min-w-0">
              <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                +60{ja ? '分' : ' min'}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {ja ? 'AIチューターとのレッスンに · 3か月有効' : 'For AI tutor lessons · valid for 3 months'}
              </div>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                ¥980
              </span>
              {info && !info.subscribed ? (
                <a href="/plans" className="px-6 py-3.5 text-sm font-semibold rounded-xl" style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}>
                  {ja ? 'プランを見る' : 'View plans'}
                </a>
              ) : (
                <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                  <button
                    onClick={() => void buy()}
                    disabled={busy || !info}
                    className="px-6 py-3.5 text-sm font-semibold transition-transform duration-[120ms] ease-out active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {ja ? '処理中…' : 'Loading…'}
                      </span>
                    ) : ja ? (
                      '購入する'
                    ) : (
                      'Buy'
                    )}
                  </button>
                </Squircle>
              )}
            </div>
          </div>
        </SquircleCard>
        {info && !info.subscribed && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {ja ? 'AI分数の追加にはプランへの登録が必要です。' : 'A plan is needed to add AI minutes.'}
          </p>
        )}
        {error && (
          <p className="text-xs mt-3" style={{ color: 'var(--danger)' }}>
            {ja ? 'お支払いページを開けませんでした。もう一度お試しください。' : "Couldn't open the payment page. Please try again."}
          </p>
        )}
      </motion.div>
    </section>
  )
}
