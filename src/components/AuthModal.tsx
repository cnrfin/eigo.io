'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from './ui/SquircleBox'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const { signIn, signUp, signInWithGoogle, signInWithLine } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, firstName, lastName)

    setLoading(false)

    if (error) {
      setError(error.message)
    } else if (!isLogin) {
      setSuccess('Check your email to confirm your account!')
    } else {
      onClose()
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-backdrop">
      <div className="modal-card">
      <SquircleBox cornerRadius={20} className="p-8 w-full max-w-sm mx-4 relative shadow-[0_0_0_1px_var(--border)]" style={{ background: 'var(--surface)' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
          {isLogin ? t('loginButton') : t('signupButton')}
        </h2>

        {/* Social Sign In */}
        <div className="space-y-3 mb-4">
          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 font-medium transition-colors hover:opacity-90 google-signin-btn"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </Squircle>

          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <button
              onClick={async () => {
                setError('')
                const { error } = await signInWithLine()
                if (error) setError(error.message)
              }}
              className="w-full flex items-center justify-center gap-3 py-3 font-medium transition-colors hover:opacity-90"
              style={{ background: '#06C755', color: '#ffffff' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE
            </button>
          </Squircle>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }}></div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }}></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <input
                  type="text"
                  placeholder={t('firstNamePlaceholder')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 focus:outline-none transition-colors"
                  style={{ background: 'var(--surface-hover)', color: 'var(--text)', '--placeholder-color': 'var(--text-muted)' } as React.CSSProperties}
                  required={!isLogin}
                />
              </Squircle>
              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <input
                  type="text"
                  placeholder={t('lastNamePlaceholder')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 focus:outline-none transition-colors"
                  style={{ background: 'var(--surface-hover)', color: 'var(--text)', '--placeholder-color': 'var(--text-muted)' } as React.CSSProperties}
                  required={!isLogin}
                />
              </Squircle>
            </div>
          )}
          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 focus:outline-none transition-colors"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)', '--placeholder-color': 'var(--text-muted)' } as React.CSSProperties}
              required
            />
          </Squircle>
          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <input
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 focus:outline-none transition-colors"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
              required
              minLength={6}
            />
          </Squircle>
          {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          {success && <p className="text-sm" style={{ color: 'var(--success)' }}>{success}</p>}
          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-medium transition-colors disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--surface-alt)', color: 'var(--text)' }}
            >
              {loading ? '...' : isLogin ? t('loginButton') : t('signupButton')}
            </button>
          </Squircle>
        </form>
        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          {isLogin ? t('noAccount') : t('hasAccount')}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setSuccess('')
              setFirstName('')
              setLastName('')
            }}
            className="underline hover:no-underline"
            style={{ color: 'var(--text)' }}
          >
            {isLogin ? t('signupButton') : t('loginButton')}
          </button>
        </p>
      </SquircleBox>
      </div>
    </div>
  )
}
