'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'

type BillingInterval = 'monthly' | 'yearly'

const PLANS = [
  {
    key: 'light' as const,
    nameEn: 'Student Lite',
    nameJa: 'Student Lite',
    descEn: '30 min/week · ~2 hrs/month',
    descJa: '週30分 · 月約2時間',
    minutesPerMonth: 120,
    prices: {
      monthly: { trial: 6000, full: 10000 },
      yearly: { trial: 60000, full: 120000 },
    },
  },
  {
    key: 'standard' as const,
    nameEn: 'Student Standard',
    nameJa: 'Student Standard',
    descEn: '60 min/week · ~4 hrs/month',
    descJa: '週60分 · 月約4時間',
    minutesPerMonth: 240,
    prices: {
      monthly: { trial: 12000, full: 20000 },
      yearly: { trial: 120000, full: 240000 },
    },
  },
]

/* ─── Animated number: spring-driven digit interpolation ─── */
function AnimatedPrice({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const spring = useSpring(value, { stiffness: 120, damping: 28, mass: 0.8 })
  const display = useTransform(spring, (v) => `¥${Math.round(v).toLocaleString()}`)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => { spring.set(value) }, [value, spring])

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsubscribe
  }, [display])

  return <span ref={ref} className={className} style={style}>¥{value.toLocaleString()}</span>
}

export default function PlansPage() {
  const { user, loading, session } = useAuth()
  const { locale } = useLanguage()

  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [trialHoursLeft, setTrialHoursLeft] = useState<number>(0)
  const [priceTier, setPriceTier] = useState<'trial' | 'full' | 'loading'>('loading')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check trial window
  useEffect(() => {
    if (!session?.access_token) return
    const checkTrial = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('profiles')
          .select('trial_completed_at')
          .eq('id', user?.id)
          .single()

        if (data?.trial_completed_at) {
          const hoursSince = (Date.now() - new Date(data.trial_completed_at).getTime()) / (1000 * 60 * 60)
          if (hoursSince <= 48) {
            setPriceTier('trial')
            setTrialHoursLeft(Math.max(0, 48 - hoursSince))
          } else {
            setPriceTier('full')
          }
        } else {
          setPriceTier('trial')
        }
      } catch {
        setPriceTier('full')
      }
    }
    checkTrial()
  }, [session?.access_token, user?.id])

  // Countdown timer
  useEffect(() => {
    if (trialHoursLeft <= 0) return
    const timer = window.setInterval(() => {
      setTrialHoursLeft((prev) => {
        const next = prev - 1 / 60
        if (next <= 0) { setPriceTier('full'); return 0 }
        return next
      })
    }, 60000)
    return () => window.clearInterval(timer)
  }, [trialHoursLeft])

  const handleCheckout = useCallback(async (plan: 'light' | 'standard') => {
    if (!session?.access_token) return
    setCheckingOut(plan)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, interval }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.error?.includes('already have an active subscription')) {
          window.location.href = '/settings'
          return
        }
        setError(data.error || 'Something went wrong')
        return
      }

      if (data.url) window.location.href = data.url
    } catch {
      setError(locale === 'ja' ? 'エラーが発生しました' : 'Something went wrong')
    } finally {
      setCheckingOut(null)
    }
  }, [session?.access_token, interval, locale])

  useEffect(() => {
    if (!loading && !user) window.location.href = '/'
  }, [user, loading])

  if (loading || priceTier === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-muted)' }} />
      </main>
    )
  }

  if (!user) return null

  const formatCountdown = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    if (h > 0) return locale === 'ja' ? `${h}時間${m}分` : `${h}h ${m}m`
    return locale === 'ja' ? `${m}分` : `${m}m`
  }

  const hasNotTrialed = priceTier === 'trial' && trialHoursLeft === 0
  const hasActiveCountdown = priceTier === 'trial' && trialHoursLeft > 0
  const effectiveTier = priceTier

  const features = (plan: typeof PLANS[number]) => [
    locale === 'ja' ? `月${plan.minutesPerMonth}分のレッスン` : `${plan.minutesPerMonth} min/month`,
    locale === 'ja' ? '録画・文字起こし付き' : 'Recordings & transcripts',
    locale === 'ja' ? 'AI サマリー & フレーズ学習' : 'AI summaries & phrases',
    locale === 'ja' ? 'いつでも変更・解約可能' : 'Change or cancel anytime',
  ]

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ─── Background gradient glow ─── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(0, 194, 184, 0.06) 0%, transparent 70%)',
        }}
      />

      {/* ─── Back button ─── */}
      <div className="relative w-full max-w-3xl mx-auto px-6 pt-6">
        <button
          onClick={() => (window.location.href = '/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {locale === 'ja' ? 'マイページ' : 'Dashboard'}
        </button>
      </div>

      {/* ─── Content — vertically centered ─── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* ─── Header ─── */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              {locale === 'ja' ? 'プランを選ぶ' : 'Choose your plan'}
            </h1>
          </div>

          {/* ─── Trial banner ─── */}
          {hasNotTrialed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="mb-8"
            >
              <div
                className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                    {locale === 'ja'
                      ? '体験レッスンで最大50%オフ'
                      : 'Get up to 50% off with a trial lesson'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {locale === 'ja'
                      ? '無料15分の体験後、48時間以内に入会で割引適用'
                      : 'Subscribe within 48h of your free 15-min trial'}
                  </p>
                </div>
                <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                  <button
                    onClick={() => (window.location.href = '/dashboard?tab=booking')}
                    className="btn-trial shrink-0 px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                  >
                    {locale === 'ja' ? '体験予約' : 'Book trial'}
                  </button>
                </Squircle>
              </div>
            </motion.div>
          )}

          {/* ─── Countdown banner ─── */}
          <AnimatePresence>
            {hasActiveCountdown && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <SquircleBox
                  cornerRadius={12}
                  className="px-4 py-3 text-center"
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                    {locale === 'ja'
                      ? `体験レッスン割引が適用中 — 残り${formatCountdown(trialHoursLeft)}`
                      : `Trial discount active — ${formatCountdown(trialHoursLeft)} remaining`}
                  </span>
                </SquircleBox>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Billing toggle ─── */}
          <motion.div
            className="flex items-center justify-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div
              className="inline-flex p-1 rounded-full gap-1"
              style={{ background: 'var(--surface)' }}
            >
              {(['monthly', 'yearly'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInterval(tab)}
                  className="relative px-6 py-2 text-sm font-medium transition-colors"
                  style={{ color: interval === tab ? 'var(--selected-text)' : 'var(--text-muted)' }}
                >
                  {interval === tab && (
                    <motion.div
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'var(--accent)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === 'monthly'
                      ? (locale === 'ja' ? '月額' : 'Monthly')
                      : (locale === 'ja' ? '年額' : 'Yearly')}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* ─── Plan cards ─── */}
          <div className="grid gap-5 sm:grid-cols-2 mb-8">
            {PLANS.map((plan, i) => {
              const trialPrice = plan.prices[interval].trial
              const fullPrice = plan.prices[interval].full
              // Active trial window: show discounted price as main
              // No trial / expired: show full price as main, trial price as aspirational
              const mainPrice = hasActiveCountdown ? trialPrice : fullPrice
              const monthlyEquivalent = interval === 'yearly' ? Math.round(mainPrice / 12) : null
              const isStandard = plan.key === 'standard'

              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <SquircleBox
                    cornerRadius={20}
                    className={`p-7 h-full flex flex-col relative overflow-hidden ${isStandard ? 'glass-card-accent' : 'glass-card'}`}
                  >
                    {/* Recommended badge */}
                    {isStandard && (
                      <span
                        className="text-[11px] font-semibold px-3 py-1 rounded-full self-start mb-4"
                        style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                      >
                        {locale === 'ja' ? 'おすすめ' : 'Popular'}
                      </span>
                    )}

                    {/* Plan name & desc */}
                    <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                      {locale === 'ja' ? plan.nameJa : plan.nameEn}
                    </h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? plan.descJa : plan.descEn}
                    </p>

                    {/* ─── Price section ─── */}
                    <div className="mb-1">
                      {/* Active trial: show strikethrough full price + discounted price */}
                      {hasActiveCountdown && (
                        <span className="text-sm line-through mr-2" style={{ color: 'var(--text-subtle)' }}>
                          ¥{fullPrice.toLocaleString()}
                        </span>
                      )}
                      <AnimatedPrice
                        value={mainPrice}
                        className="text-3xl font-bold tracking-tight"
                        style={{ color: 'var(--text)' }}
                      />
                      <span className="text-sm ml-1.5" style={{ color: 'var(--text-muted)' }}>
                        /{interval === 'monthly'
                          ? (locale === 'ja' ? '月' : 'mo')
                          : (locale === 'ja' ? '年' : 'yr')}
                      </span>
                    </div>

                    {/* Trial price teaser for users who haven't trialed */}
                    {hasNotTrialed && trialPrice < fullPrice ? (
                      <p className="text-xs mb-6" style={{ color: 'var(--accent)', minHeight: '1.25rem' }}>
                        {locale === 'ja'
                          ? `体験レッスン後 ¥${trialPrice.toLocaleString()}/${interval === 'monthly' ? '月' : '年'}`
                          : `¥${trialPrice.toLocaleString()}/${interval === 'monthly' ? 'mo' : 'yr'} with trial`}
                      </p>
                    ) : (
                      <p className="text-xs mb-6" style={{ color: 'var(--text-subtle)', minHeight: '1.25rem' }}>
                        {monthlyEquivalent
                          ? (locale === 'ja'
                              ? `月あたり約¥${monthlyEquivalent.toLocaleString()}`
                              : `~¥${monthlyEquivalent.toLocaleString()}/mo`)
                          : '\u00A0'}
                      </p>
                    )}

                    {/* Features */}
                    <ul className="space-y-3 mb-8 flex-1">
                      {features(plan).map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                      <button
                        onClick={() => handleCheckout(plan.key)}
                        disabled={!!checkingOut}
                        className="w-full py-3.5 text-sm font-semibold transition-all disabled:opacity-50 hover:opacity-90"
                        style={{
                          background: isStandard ? 'var(--accent)' : 'var(--surface-hover)',
                          color: isStandard ? 'var(--selected-text)' : 'var(--text)',
                        }}
                      >
                        {checkingOut === plan.key ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {locale === 'ja' ? '処理中...' : 'Loading...'}
                          </span>
                        ) : (
                          locale === 'ja' ? 'このプランで始める' : 'Get started'
                        )}
                      </button>
                    </Squircle>
                  </SquircleBox>
                </motion.div>
              )
            })}
          </div>

          {/* ─── Footer notes ─── */}
          <div className="text-center space-y-2">

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-sm"
                  style={{ color: 'var(--danger)' }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="text-xs pb-4" style={{ color: 'var(--text-subtle)' }}>
              {locale === 'ja'
                ? 'お支払いはStripeで安全に処理されます'
                : 'Payments processed securely by Stripe'}
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
