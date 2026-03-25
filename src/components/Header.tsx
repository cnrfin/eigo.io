'use client'

import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useState, useRef, useEffect } from 'react'
import { Squircle } from '@squircle-js/react'
import AuthModal from './AuthModal'

export default function Header() {
  const { t, locale, toggleLocale } = useLanguage()
  const { user, signOut, loading, avatarUrl: profileAvatarUrl } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const avatarUrl = profileAvatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const displayName = user?.user_metadata?.full_name || (user?.email && !user.email.endsWith('@line.eigo.io') ? user.email.split('@')[0] : '') || ''

  return (
    <>
      <header
        className="w-full sticky top-0 z-40"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'var(--header-glass)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className={`max-w-5xl mx-auto flex items-center px-6 h-14 ${!loading && !user ? 'grid grid-cols-3' : 'justify-between'}`}>
          {/* Left — Logo (dashboard) or Lang+Theme (landing) */}
          {!loading && !user ? (
            <>
              {/* Landing: lang+theme left, logo center, login right */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleLocale}
                  className="h-8 px-2.5 rounded-full flex items-center justify-center text-xs font-medium tracking-wide transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Toggle language"
                >
                  {locale === 'ja' ? 'EN' : 'JA'}
                </button>
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </button>
              </div>

              <a href="/" className="text-xl font-bold tracking-tight text-center" style={{ color: 'var(--text)' }}>
                eigo.io
              </a>

              <div className="flex items-center justify-end">
                <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <button
                    onClick={() => setShowAuth(true)}
                    className="text-sm px-4 py-1.5 font-medium transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                  >
                    {t('login')}
                  </button>
                </Squircle>
              </div>
            </>
          ) : (
            <>
              {/* Dashboard: logo left, controls right */}
              <a href="/" className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                eigo.io
              </a>

              <div className="flex items-center gap-2">
                {!loading && user && (
                  <>
                    <button
                      onClick={toggleLocale}
                      className="h-8 px-2.5 rounded-full flex items-center justify-center text-xs font-medium tracking-wide transition-opacity hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label="Toggle language"
                    >
                      {locale === 'ja' ? 'EN' : 'JA'}
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {theme === 'dark' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="5" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                      )}
                    </button>

                    <div className="relative ml-1" ref={dropdownRef}>
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center transition-opacity hover:opacity-80"
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </button>

                      {showDropdown && (
                        <Squircle asChild cornerRadius={16} cornerSmoothing={0.8}>
                          <div
                            className="absolute right-0 top-12 w-52 p-2 z-50 flex flex-col gap-0.5"
                            style={{ background: 'var(--card-white)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)' }}
                          >
                            <div className="px-3 pt-2 pb-3">
                              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{displayName}</p>
                              {user.email && !user.email.endsWith('@line.eigo.io') && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.email}</p>}
                            </div>
                            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                              <a
                                href="/dashboard"
                                className="block px-3 py-2.5 text-sm transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onClick={() => setShowDropdown(false)}
                              >
                                {t('dashboard')}
                              </a>
                            </Squircle>
                            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                              <a
                                href="/settings"
                                className="block px-3 py-2.5 text-sm transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onClick={() => setShowDropdown(false)}
                              >
                                {t('settings')}
                              </a>
                            </Squircle>
                            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                              <button
                                onClick={() => { signOut(); setShowDropdown(false) }}
                                className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                                style={{ color: 'var(--danger)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                {t('logout')}
                              </button>
                            </Squircle>
                          </div>
                        </Squircle>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
