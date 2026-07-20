'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Squircle } from '@squircle-js/react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import type { GateCopy } from '@/lib/lp-funnel'

/* The sign-up gate shown at a funnel's payoff moment ("save your results").
   It converts the CURRENT anonymous user into a permanent account, so the work
   they just did is preserved (user.id never changes). On success it routes to
   `destination` (e.g. the results page). Closing also lands them there — as an
   anon user it's still their attempt; signing up just makes it permanent.
   `remaining` fills the copy's "{num} more lessons" line when present. */
export default function FreeGate({
  destination,
  copy,
  remaining = null,
  onClose,
}: {
  destination: string
  copy: GateCopy
  remaining?: number | null
  onClose?: () => void
}) {
  const { convertAnonUser, linkGoogleIdentity } = useAuth()
  const { locale } = useLanguage()
  const router = useRouter()
  const ja = locale === 'ja'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Defensive: never hard-crash the host page if copy is momentarily missing
  // (e.g. a stale Fast-Refresh swap). All hooks above run unconditionally.
  if (!copy) return null

  const moreLine = copy.moreJa && remaining != null && remaining > 0
    ? (ja ? copy.moreJa : copy.moreEn!).replace('{num}', String(remaining))
    : null

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await convertAnonUser(email, password, name)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push(destination)
  }

  const handleGoogle = async () => {
    setError('')
    // Land back on the payoff page after the OAuth round-trip.
    const redirectTo = typeof window !== 'undefined' ? window.location.origin + destination : destination
    const { error } = await linkGoogleIdentity(redirectTo)
    if (error) setError(error.message)
  }

  const close = () => {
    if (onClose) onClose()
    else router.push(destination)
  }

  const field = {
    background: 'var(--card-inset)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  } as const

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-backdrop"
      style={{ background: 'var(--overlay)' }}
      onClick={close}
    >
      <Squircle asChild cornerRadius={22} cornerSmoothing={0.8}>
        <div
          className="modal-card w-full max-w-sm p-7"
          style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{ja ? copy.titleJa : copy.titleEn}</h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>{ja ? copy.subJa : copy.subEn}</p>
              {moreLine && <p className="text-sm mt-1.5 font-medium" style={{ color: 'var(--accent)' }}>{moreLine}</p>}
            </div>
            <button onClick={close} aria-label={ja ? '閉じる' : 'Close'} className="shrink-0 -mr-1 -mt-1 p-1 transition-opacity hover:opacity-60" style={{ color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          </div>

          <button
            onClick={handleGoogle}
            className="google-signin-btn w-full flex items-center justify-center gap-2.5 mt-5 font-medium transition-transform hover:scale-[1.01] active:scale-[0.98]"
            style={{ borderRadius: 12, padding: '12px 14px', fontSize: 14 }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            {ja ? 'Googleで続ける' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 my-4" aria-hidden="true">
            <span className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{ja ? 'または' : 'or'}</span>
            <span className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-2.5">
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={ja ? 'お名前' : 'Name'} autoComplete="name" />
            <input style={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={ja ? 'メールアドレス' : 'Email'} type="email" autoComplete="email" required />
            <input style={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={ja ? 'パスワード' : 'Password'} type="password" autoComplete="new-password" required minLength={6} />
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold mt-1 transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 15 }}
            >
              {loading ? (ja ? '登録中…' : 'Signing up…') : ja ? copy.ctaJa : copy.ctaEn}
            </button>
          </form>
        </div>
      </Squircle>
    </div>
  )
}
