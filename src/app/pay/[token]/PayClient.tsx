'use client'

import { useEffect, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import { motion } from 'framer-motion'
import SquircleBox from '@/components/ui/SquircleBox'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { intervalLabel, perIntervalLabel, periodMonths, type IntervalUnit } from '@/lib/custom-plans'
import { savePayReturn, takePayReturn } from '@/lib/pay-return'

interface PayInfo {
  status: 'open' | 'paid' | 'cancelled'
  forYou: boolean | null
  name: string | null
  priceJpy: number
  payJpy: number
  salePercent: number | null
  saleName: string | null
  saleForever: boolean
  intervalUnit: IntervalUnit
  intervalCount: number
  minutes: number
}

type LoadState = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'ready'; info: PayInfo }

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

export default function PayClient({ token }: { token: string }) {
  const { user, session, loading, signOut } = useAuth()
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const t = (jaText: string, en: string) => (ja ? jaText : en)

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [showAuth, setShowAuth] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  // Signed in on this page (email sign-in stays here): drop the saved return so
  // a later visit to the dashboard isn't sent back to this link.
  useEffect(() => { if (user) takePayReturn() }, [user])

  // Reload whenever the signed-in account changes (sign-in on this page).
  useEffect(() => {
    if (loading) return
    let cancelled = false
    fetch(`/api/pay/${encodeURIComponent(token)}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then(async (r) => {
        if (cancelled) return
        if (r.status === 404) return setState({ kind: 'missing' })
        if (!r.ok) return setState({ kind: 'error' })
        setState({ kind: 'ready', info: (await r.json()) as PayInfo })
      })
      .catch(() => !cancelled && setState({ kind: 'error' }))
    return () => { cancelled = true }
  }, [token, loading, session?.access_token])

  const openSignIn = () => {
    // Google, Apple and LINE sign-in land on the dashboard; this brings them back here.
    savePayReturn(`/pay/${token}`)
    setShowAuth(true)
  }

  const pay = async () => {
    if (!session?.access_token) return openSignIn()
    setPaying(true)
    setPayError(null)
    try {
      const r = await fetch(`/api/pay/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.url) {
        window.location.href = data.url
        return
      }
      setPayError(
        data.error === 'already_subscribed'
          ? t('現在ご利用中のプランがまだ有効です。切り替えについては講師にご連絡ください。', 'You still have an active plan. Message your teacher about switching.')
          : t('お支払いページを開けませんでした。もう一度お試しください。', 'The payment page didn’t open. Try again.'),
      )
    } catch {
      setPayError(t('お支払いページを開けませんでした。もう一度お試しください。', 'The payment page didn’t open. Try again.'))
    }
    setPaying(false)
  }

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 70%)' }}
      />

      {user && (
        <div className="relative w-full max-w-3xl mx-auto px-6 pt-6">
          <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('マイページ', 'Dashboard')}
          </a>
        </div>
      )}

      <div className="relative flex-1 flex items-center justify-center px-5 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {state.kind === 'loading' && (
            <div className="flex justify-center py-20">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}

          {(state.kind === 'missing' || state.kind === 'error') && (
            <Notice
              title={state.kind === 'missing' ? t('リンクが見つかりません', 'This link doesn’t exist') : t('読み込めませんでした', 'This page didn’t load')}
              body={state.kind === 'missing'
                ? t('URLをもう一度ご確認いただくか、講師にご連絡ください。', 'Check the address, or message your teacher.')
                : t('時間をおいて、もう一度お試しください。', 'Try again in a moment.')}
            />
          )}

          {state.kind === 'ready' && state.info.status === 'paid' && (
            <Notice
              title={t('お支払い済みです', 'This plan is paid for')}
              body={t('ご登録ありがとうございます。レッスンはマイページから予約できます。', 'Thanks for subscribing. Book lessons from your dashboard.')}
              action={{ label: t('マイページへ', 'Go to dashboard'), href: '/dashboard' }}
            />
          )}

          {state.kind === 'ready' && state.info.status === 'cancelled' && (
            <Notice
              title={t('このリンクは無効になりました', 'This link has been turned off')}
              body={t('新しいリンクについては講師にご連絡ください。', 'Message your teacher for a new link.')}
            />
          )}

          {state.kind === 'ready' && state.info.status === 'open' && (
            <PlanCard
              info={state.info}
              ja={ja}
              signedIn={!!user}
              paying={paying}
              error={payError}
              onPay={pay}
              onSignIn={openSignIn}
              onSwitchAccount={async () => { await signOut(); openSignIn() }}
            />
          )}
        </motion.div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  )
}

function PlanCard({ info, ja, signedIn, paying, error, onPay, onSignIn, onSwitchAccount }: {
  info: PayInfo
  ja: boolean
  signedIn: boolean
  paying: boolean
  error: string | null
  onPay: () => void
  onSignIn: () => void
  onSwitchAccount: () => void
}) {
  const t = (jaText: string, en: string) => (ja ? jaText : en)
  const sale = info.salePercent != null && info.payJpy < info.priceJpy
  const wrongAccount = info.forYou === false
  const months = periodMonths(info.intervalUnit, info.intervalCount)
  const monthly = info.intervalUnit === 'month' && info.intervalCount === 1

  const title = info.name
    ? (ja ? `${info.name}さん専用のプラン` : `A plan made for ${info.name}`)
    : t('あなた専用のプラン', 'A plan made for you')
  const minutesText = monthly
    ? t(`毎月${info.minutes}分`, `${info.minutes} min a month`)
    : ja
      ? `${info.intervalCount}${{ day: '日', week: '週間', month: 'ヶ月', year: '年' }[info.intervalUnit]}で${info.minutes}分${months >= 2 ? `（月${Math.round(info.minutes / months)}分）` : ''}`
      : `${info.minutes} min ${intervalLabel(info.intervalUnit, info.intervalCount, false)}${months >= 2 ? ` (${Math.round(info.minutes / months)} a month)` : ''}`
  const renewText = ja
    ? `${intervalLabel(info.intervalUnit, info.intervalCount, true)}${monthly ? '' : 'に'}自動更新`
    : `Renews ${intervalLabel(info.intervalUnit, info.intervalCount, false)}`

  const rows: [string, string][] = [
    [t('レッスン時間', 'Lessons'), minutesText],
    [t('お支払い', 'Billing'), renewText],
    ...(sale && info.saleForever ? [[t('割引', 'Discount'), t('ご継続中はずっとこの料金', 'Kept for as long as you stay')] as [string, string]] : []),
    [t('解約', 'Cancelling'), t('いつでもできます', 'Any time')],
  ]

  return (
    <SquircleBox cornerRadius={20} className="glass-card p-7">
      {sale && (
        <span className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full mb-3" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
          {info.saleName ? `${info.saleName} ${info.salePercent}%OFF` : `${info.salePercent}%OFF`}
        </span>
      )}
      <h1
        className="text-2xl mb-5"
        style={{ color: 'var(--text)', fontWeight: ja ? 600 : 500, lineHeight: ja ? 1.3 : 1.12, letterSpacing: ja ? '-0.01em' : '-0.02em', fontFeatureSettings: ja ? '"palt"' : undefined }}
      >
        {title}
      </h1>

      <div className="flex items-baseline flex-wrap gap-x-2">
        <span className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>{yen(info.payJpy)}</span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{perIntervalLabel(info.intervalUnit, info.intervalCount, ja)}</span>
        {sale && <span className="text-base line-through" style={{ color: 'var(--text-muted)' }}>{yen(info.priceJpy)}</span>}
      </div>

      <div className="mt-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 text-sm" style={{ borderTop: '1px solid var(--divider)', lineHeight: ja ? 1.85 : 1.7 }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span className="text-right" style={{ color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </div>

      {wrongAccount ? (
        <div className="mt-6">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: ja ? 1.85 : 1.7 }}>
            {t('このリンクは別のアカウント用です。プランを受け取るアカウントでログインしてください。', 'This link is for a different account. Sign in with the account the plan is for.')}
          </p>
          <CtaButton onClick={onSwitchAccount} label={t('別のアカウントでログイン', 'Sign in with another account')} />
        </div>
      ) : (
        <div className="mt-6">
          <CtaButton
            onClick={signedIn ? onPay : onSignIn}
            busy={paying}
            label={signedIn ? t('お支払いへ進む', 'Continue to payment') : t('ログインしてお支払いへ', 'Sign in to pay')}
          />
          {error && <p className="text-sm mt-3" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      )}

      <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
        {t('お支払いはStripeで安全に処理されます', 'Payment is handled securely by Stripe')}
      </p>
    </SquircleBox>
  )
}

function CtaButton({ onClick, label, busy }: { onClick: () => void; label: string; busy?: boolean }) {
  return (
    <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
      <button
        onClick={onClick}
        disabled={busy}
        className="w-full py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-60"
        style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
      >
        {busy ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin align-middle" /> : label}
      </button>
    </Squircle>
  )
}

function Notice({ title, body, action }: { title: string; body: string; action?: { label: string; href: string } }) {
  return (
    <SquircleBox cornerRadius={20} className="glass-card p-7 text-center">
      <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>{title}</h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{body}</p>
      {action && (
        <a href={action.href} className="inline-block mt-5 text-sm font-medium" style={{ color: 'var(--accent)' }}>{action.label}</a>
      )}
    </SquircleBox>
  )
}
