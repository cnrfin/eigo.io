'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import AuthModal from '@/components/AuthModal'

/* Dedicated header for the pronunciation guide — its own chrome (not the
   dashboard Header). Logo + nav on the left; theme toggle and sign-up on the
   right. Styled from the landing's tokens.

   Japanese only, deliberately. The guide teaches English to Japanese speakers
   and every word of its content is Japanese, with no English counterpart route.
   The old JA/EN toggle only relabelled this header while the page stayed
   Japanese, and the labels otherwise followed the browser's language, so an
   English browser got English chrome wrapped around Japanese content. Both are
   gone: the chrome is fixed to Japanese and links to the Japanese pages. */
export default function PronHeader() {
  const { theme, toggleTheme } = useTheme()
  const [showAuth, setShowAuth] = useState(false)

  // Home is omitted — the logo and About both return to the landing.
  const nav = [
    { label: 'スクールについて', href: '/' },
    { label: '料金', href: '/plans' },
  ]

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text)', textDecoration: 'none' }}>eigo.io</Link>
            <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 22 }}>
              {nav.map((n) => (
                <Link key={n.label} href={n.href} style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>{n.label}</Link>
              ))}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'} className="lp-press" style={{ background: 'transparent', color: 'var(--text-muted)', border: 0, width: 40, height: 40, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </button>
            <button onClick={() => setShowAuth(true)} className="lp-press" style={{ background: 'var(--text)', color: 'var(--bg)', border: 0, borderRadius: 999, height: 40, padding: '0 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>無料登録</button>
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
