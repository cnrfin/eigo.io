'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { useDashboardNav, type DashboardTab } from '@/context/DashboardNavContext'
import RiveIcon, { type RiveIconHandle } from '@/components/ui/RiveIcon'

type IconProps = { className?: string }
const I = {
  home: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" />
    </svg>
  ),
  calendar: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  history: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" />
    </svg>
  ),
  cards: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="6" width="14" height="12" rx="2" /><path d="M8 4h11a2 2 0 0 1 2 2v9" />
    </svg>
  ),
  file: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4M9 13h6M9 17h6" />
    </svg>
  ),
  // public/icons/course.svg, inlined so it themes via currentColor (no Rive icon yet)
  course: (p: IconProps) => (
    <svg viewBox="0 0 256 256" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="128" y1="128" x2="224" y2="32" />
      <path d="M195.88,60.12a95.88,95.88,0,1,0,18.77,26.49" />
      <path d="M161.94,94.06a48,48,0,1,0,14,31.2" />
    </svg>
  ),
}

type DashItem = { key: DashboardTab; label: string; label_ja: string; icon: (p: IconProps) => React.ReactElement; dot?: number; rive?: string }

// Everything below lives inside a FIXED-WIDTH inner panel (PANEL_W). The aside
// animates its width and clips that panel, so the menu rows never narrow — which
// is what was letting the inherited body rules (overflow-wrap: anywhere /
// word-break: auto-phrase) break labels one letter per line. Labels just fade.
// Must equal the expanded aside width (w-56 = 14rem) so the panel fills it with
// no right-side gap. Using rem (not px) keeps them matched when the root
// font-size changes — a px value desyncs as soon as the base scales.
const PANEL_W = '14rem' // expanded content width — matches the aside's w-56
const navLabelStyle = (collapsed: boolean): React.CSSProperties => ({
  opacity: collapsed ? 0 : 1,
  whiteSpace: 'nowrap',
  transition: 'opacity 150ms ease-out',
})

function NavList({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { locale } = useLanguage()
  const { activeTab, setActiveTab, indicators } = useDashboardNav()
  const pathname = usePathname()
  const router = useRouter()
  const onDashboard = pathname === '/dashboard'
  const onTests = pathname.startsWith('/dashboard/tests')
  const onCourses = pathname.startsWith('/dashboard/courses')

  // `rive` = artboard name in public/icons.riv; items without it fall back to
  // the inline SVG. Add 'book' / 'lessons' / 'phrases' once they're in the export.
  const dashItems: DashItem[] = [
    { key: 'home', label: 'Home', label_ja: 'ホーム', icon: I.home, rive: 'home' },
    { key: 'booking', label: 'Book', label_ja: '予約', icon: I.calendar, rive: 'book' },
    { key: 'history', label: 'History', label_ja: '履歴', icon: I.history, dot: indicators.historyUnsummarized, rive: 'lessons' },
    { key: 'vocab', label: 'Phrases', label_ja: 'フレーズ', icon: I.cards, dot: indicators.vocabDue, rive: 'phrases' },
  ]
  const goTab = (key: DashboardTab) => {
    setActiveTab(key)
    if (!onDashboard) router.push('/dashboard')
    onNavigate?.()
  }
  const goTests = () => {
    router.push('/dashboard/tests')
    onNavigate?.()
  }
  const goCourses = () => {
    router.push('/dashboard/courses')
    onNavigate?.()
  }

  const itemBase = 'nav-btn relative w-full flex items-center gap-3 py-2.5 px-2.5'
  const riveRefs = useRef<Record<string, RiveIconHandle | null>>({})
  const hl = (active: boolean) => (
    <span
      aria-hidden
      className={`nav-hl absolute left-0 rounded-xl${active ? ' is-active' : ''}`}
      style={collapsed
        ? { width: 40, height: 40, top: '50%', transform: 'translateY(-50%)' } // a centred square, not a tall bar
        : { top: 0, bottom: 0, width: '100%', transition: 'width 200ms ease' }}
    />
  )

  return (
    <nav className="flex flex-col gap-1">
      {collapsed ? null : (
        <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>
          {locale === 'ja' ? 'ダッシュボード' : 'Dashboard'}
        </p>
      )}
      {dashItems.map((item) => {
        const active = onDashboard && activeTab === item.key
        const Icon = item.icon
        const label = locale === 'ja' ? item.label_ja : item.label
        return (
          <button
            key={item.key}
            onClick={() => goTab(item.key)}
            onMouseEnter={() => riveRefs.current[item.key]?.fire()}
            title={collapsed ? label : undefined}
            className={itemBase}
            style={{ color: 'var(--text)' }}
          >
            {hl(active)}
            {/* Collapsed: a 40px box pulled left by the button's px-2.5 so it lines
                up with the 40px highlight, centering the icon in it. Inner span
                stays icon-sized so the unread dot hugs the icon's corner. */}
            <span className="shrink-0 flex items-center justify-center" style={collapsed ? { width: 40, marginLeft: '-0.625rem' } : undefined}>
              <span className="relative flex items-center justify-center">
                {item.rive ? <RiveIcon ref={(h) => { riveRefs.current[item.key] = h }} artboard={item.rive} /> : <Icon />}
                {item.dot && collapsed ? <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden="true" /> : null}
              </span>
            </span>
            <span className="relative text-sm font-medium" style={navLabelStyle(collapsed)}>{label}</span>
            {item.dot && !collapsed ? <span className="news-unread-dot relative ml-auto shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden="true" /> : null}
          </button>
        )
      })}

      {/* Courses + Tests are routes (not tabs), each with a Rive icon. */}
      <button
        onClick={goCourses}
        onMouseEnter={() => riveRefs.current.courses?.fire()}
        title={collapsed ? (locale === 'ja' ? 'コース' : 'Courses') : undefined}
        className={itemBase}
        style={{ color: 'var(--text)' }}
      >
        {hl(onCourses)}
        <span className="relative shrink-0 flex items-center justify-center" style={collapsed ? { width: 40, marginLeft: '-0.625rem' } : undefined}>
          <RiveIcon ref={(h) => { riveRefs.current.courses = h }} artboard="course" />
        </span>
        <span className="relative text-sm font-medium" style={navLabelStyle(collapsed)}>
          {locale === 'ja' ? 'コース' : 'Courses'}
        </span>
      </button>

      <button
        onClick={goTests}
        onMouseEnter={() => riveRefs.current.tests?.fire()}
        title={collapsed ? (locale === 'ja' ? 'テスト' : 'Tests') : undefined}
        className={itemBase}
        style={{ color: 'var(--text)' }}
      >
        {hl(onTests)}
        <span className="relative shrink-0 flex items-center justify-center" style={collapsed ? { width: 40, marginLeft: '-0.625rem' } : undefined}>
          <RiveIcon ref={(h) => { riveRefs.current.tests = h }} artboard="exam" />
        </span>
        <span className="relative text-sm font-medium" style={navLabelStyle(collapsed)}>
          {locale === 'ja' ? 'テスト' : 'Tests'}
        </span>
      </button>
    </nav>
  )
}

function SidebarUser({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut, avatarUrl: profileAvatarUrl } = useAuth()
  const { t, locale } = useLanguage()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const avatarUrl = profileAvatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const displayName = user?.user_metadata?.full_name || (user?.email && !user.email.endsWith('@line.eigo.io') ? user.email.split('@')[0] : '') || ''
  const email = user?.email && !user.email.endsWith('@line.eigo.io') ? user.email : ''

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ left: r.left, bottom: window.innerHeight - r.top + 8 })
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title={collapsed ? displayName : undefined}
        className="nav-btn relative w-full flex items-center gap-3 px-2.5 py-2"
        aria-label={locale === 'ja' ? 'アカウント' : 'Account'}
      >
        <span aria-hidden className="nav-hl absolute left-0 rounded-xl" style={collapsed
          ? { width: 44, height: 44, top: '50%', transform: 'translateY(-50%)' }
          : { top: 0, bottom: 0, width: '100%', transition: 'width 200ms ease' }} />
        {/* Collapsed: a 44px box absolutely centred over the square highlight,
            independent of the button's (rem-scaled) padding. */}
        <span className="shrink-0 flex items-center justify-center" style={collapsed ? { width: 44, marginLeft: '-0.625rem' } : undefined}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="relative w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="relative w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </span>
        <div className="relative flex-1 min-w-0 text-left" style={navLabelStyle(collapsed)}>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{displayName}</p>
          {email && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{email}</p>}
        </div>
      </button>
      {/* Rendered in a portal so it escapes the sidebar's collapse clipping. */}
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="flex flex-col gap-0.5"
          style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, minWidth: 180, padding: 6, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)', zIndex: 60 }}
        >
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            {t('settings')}
          </Link>
          <button onClick={() => { signOut(); setOpen(false) }} className="text-left px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--danger)' }}>
            {t('logout')}
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
      <path d="M14 6l-6 6 6 6" />
    </svg>
  )
}

export default function DashboardSidebar() {
  const { mobileOpen, setMobileOpen } = useDashboardNav()
  const { locale } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  // The user's saved preference (their choice on a wide screen). Below the lg
  // breakpoint the sidebar auto-collapses for space; at lg+ it returns to this
  // preference. A ref so the resize listener always reads the latest value.
  const prefRef = useRef(false)

  useEffect(() => {
    const pref = typeof window !== 'undefined' && localStorage.getItem('eigo_sidebar_collapsed') === '1'
    prefRef.current = pref
    const mq = window.matchMedia('(min-width: 1024px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const apply = () => setCollapsed(mq.matches ? prefRef.current : true)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const toggle = () => setCollapsed((c) => {
    const next = !c
    prefRef.current = next
    try { localStorage.setItem('eigo_sidebar_collapsed', next ? '1' : '0') } catch { /* ignore */ }
    return next
  })

  return (
    <>
      {/* Desktop persistent sidebar — width animates and clips the fixed-width panel */}
      <aside className={`hidden md:flex md:flex-col shrink-0 md:sticky md:top-0 md:h-screen overflow-hidden transition-[width] duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
        {/* Fixed-width panel: never narrows, so labels never reflow. The aside clips it. */}
        <div className="flex flex-col h-full py-4 px-2" style={{ width: PANEL_W }}>
          {collapsed ? (
            <button
              onClick={toggle}
              className="nav-btn relative w-full flex items-center py-2.5 px-2.5 mb-4"
              style={{ color: 'var(--text-muted)' }}
              aria-label={locale === 'ja' ? 'サイドバーを展開' : 'Expand sidebar'}
            >
              <span aria-hidden className="nav-hl absolute left-0 rounded-xl" style={{ width: 40, height: 40, top: '50%', transform: 'translateY(-50%)' }} />
              <span className="relative flex items-center justify-center" style={{ width: 40, marginLeft: '-0.625rem' }}><CollapseIcon collapsed /></span>
            </button>
          ) : (
            <div className="flex items-center justify-between mb-4 px-2.5 h-9">
              <Link href="/" className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>eigo.io</Link>
              <button
                onClick={toggle}
                className="w-8 h-8 flex items-center justify-center rounded-xl sidebar-item shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label={locale === 'ja' ? 'サイドバーを折りたたむ' : 'Collapse sidebar'}
              >
                <CollapseIcon collapsed={false} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overflow-x-hidden"><NavList collapsed={collapsed} /></div>
          <div className="pt-3"><SidebarUser collapsed={collapsed} /></div>
        </div>

        {/* Clickable, hover-highlighted edge to collapse/expand */}
        <button
          onClick={toggle}
          aria-label={locale === 'ja' ? 'サイドバーを切り替え' : 'Toggle sidebar'}
          className="sb-edge absolute top-0 right-0 h-full w-2"
        />
      </aside>

      {/* Mobile drawer — above the dashboard header (z-50) so the backdrop + panel
          cover it when open. The header stays z-50 to beat the course page's z-40. */}
      <div className="md:hidden fixed inset-0 z-[60]" style={{ pointerEvents: mobileOpen ? 'auto' : 'none' }} aria-hidden={!mobileOpen}>
        <div
          className="absolute inset-0 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.5)', opacity: mobileOpen ? 1 : 0 }}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className="absolute left-0 top-0 bottom-0 w-64 p-4 flex flex-col transition-transform duration-200"
          style={{
            background: 'var(--dash-bg)',
            borderRight: '1px solid var(--hairline)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>eigo.io</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: 'var(--text-muted)' }}
              aria-label={locale === 'ja' ? '閉じる' : 'Close menu'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto"><NavList onNavigate={() => setMobileOpen(false)} /></div>
          <div className="pt-3"><SidebarUser /></div>
        </div>
      </div>
    </>
  )
}
