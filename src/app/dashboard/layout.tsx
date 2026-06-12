'use client'

import { Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import AppsMenu from '@/components/dashboard/AppsMenu'
import { DashboardNavProvider, useDashboardNav, type Crumb } from '@/context/DashboardNavContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

// Transparent top bar inside the content column: mobile menu button + breadcrumbs
// (left), language + theme toggles (right). No background, no border.
function TopBar() {
  const { setMobileOpen, activeTab, setActiveTab, crumbs } = useDashboardNav()
  const { locale, toggleLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  // Trail after "Dashboard": pages can register their own (e.g. Tests > IELTS);
  // otherwise it's derived from the route / active tab.
  const tabLabel: Record<string, [string, string]> = {
    home: ['ホーム', 'Home'], booking: ['予約', 'Book'], history: ['履歴', 'History'], vocab: ['フレーズ', 'Phrases'],
  }
  const defaultTrail: Crumb[] = pathname.startsWith('/dashboard/tests')
    ? [{ label: t('テスト', 'Tests') }]
    : pathname.startsWith('/dashboard/courses')
      ? [{ label: t('コース', 'Courses') }]
      : pathname.startsWith('/dashboard/settings')
        ? [{ label: t('設定', 'Settings') }]
        : [{ label: t(tabLabel[activeTab][0], tabLabel[activeTab][1]) }]
  const trail = crumbs.length > 0 ? crumbs : defaultTrail
  const onDashboard = () => {
    setActiveTab('home')
    router.push('/dashboard')
  }

  return (
    // Gradient (bg -> transparent) so content scrolling beneath fades out under the
    // bar. The fade layer is taller than the bar itself for a softer dissolve.
    // z-50: must beat page-level headers (e.g. the course page's z-40 accent
    // pill row) so the apps dropdown is never overlapped; page modals still
    // win as equal-z later siblings.
    <div className="sticky top-0 z-50 flex items-center h-14 relative">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '6.5rem',
          zIndex: -1,
          background: 'linear-gradient(to bottom, var(--dash-bg) 0%, var(--dash-bg) 54%, transparent 100%)',
        }}
      />
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden w-9 h-9 mr-1 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={locale === 'ja' ? 'メニューを開く' : 'Open menu'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm font-medium min-w-0">
        <button onClick={onDashboard} className="transition-opacity hover:opacity-70 shrink-0" style={{ color: 'var(--text-muted)' }}>
          {t('ダッシュボード', 'Dashboard')}
        </button>
        {trail.map((c, i) => {
          const last = i === trail.length - 1
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0" style={{ color: 'var(--text-subtle)' }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              {c.onClick && !last ? (
                <button onClick={c.onClick} className="transition-opacity hover:opacity-70 truncate" style={{ color: 'var(--text-muted)' }}>
                  {c.label}
                </button>
              ) : (
                <span className="truncate" style={{ color: last ? 'var(--text)' : 'var(--text-muted)' }} aria-current={last ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      <div className="flex items-center gap-1 ml-auto">
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
          {/* static sun/moon (same geometry as public/icons/light*.svg, recolored
              via currentColor). The Rive morph dropped its sun rays after a
              re-export, and the animation wasn't earning its keep anyway. */}
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="24" cy="24" r="10.5" />
              <path d="M24 3v4.5M24 40.5V45M3 24h4.5M40.5 24H45M9 9l3 3M36 36l3 3M9 39l3-3M36 12l3-3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path transform="matrix(0.232019 -0.232019 0.232019 0.232019 19.7812 19.7812)" strokeWidth="10" d="M0 18.1827C56 18.1828 56 -30.9279 56 0C56 30.9279 30.9279 56 0 56C-30.9279 56 -56 30.9279 -56 0C-56 -30.9279 -54.466 19.7168 0 18.1827Z" />
            </svg>
          )}
        </button>
        <AppsMenu />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Full-screen flows (taking a test, viewing results) render without the
  // dashboard chrome — they bring their own header.
  const bare = pathname.includes('/dashboard/tests/take/') || pathname.includes('/dashboard/tests/results/')
  if (bare) return <>{children}</>

  return (
    <DashboardNavProvider>
      {/* Fetch the Rive icon file alongside the page instead of after the
          components mount — shortens the SVG-fallback -> Rive crossfade. */}
      <link rel="preload" href="/icons.riv" as="fetch" crossOrigin="anonymous" />
      {/* Full-viewport backdrop so the page (grey body) background never pokes
          through above/around the dashboard when scrolling or overscrolling. */}
      <div aria-hidden className="fixed inset-0 -z-10" style={{ background: 'var(--dash-bg)' }} />
      <div className="min-h-screen" style={{ background: 'var(--dash-bg)' }}>
        <div className="w-full">
          <div className="md:flex md:gap-6">
            <Suspense fallback={<div className="hidden md:block w-52 shrink-0" />}>
              <DashboardSidebar />
            </Suspense>
            <div className="flex-1 min-w-0 px-4 sm:px-6">
              <TopBar />
              {children}
            </div>
          </div>
        </div>
      </div>
    </DashboardNavProvider>
  )
}
