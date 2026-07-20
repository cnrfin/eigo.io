'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/context/LanguageContext'
import Reveal from './Reveal'
import { useIsMobile } from './useIsMobile'

/* Closing section — a contained photo CTA card (matching the feature card width),
   then a light, transparent footer with the logo, link columns, socials and
   copyright, all inside the same max width as the rest of the page. */

type Col = { title: [string, string]; links: [string, string, string][] } // [en, ja, href]
const COLUMNS: Col[] = [
  { title: ['Product', 'サービス'], links: [
    ['Lessons', 'レッスン', '#features'],
    ['Courses', 'コース', '#features'],
    ['Tests', 'テスト', '#features'],
    ['Pricing', '料金', '/plans'],
  ] },
  { title: ['Learn more', '詳しく見る'], links: [
    // The guide is the site's largest body of indexable content, so it needs a
    // real inbound link from the landing rather than only living in the sitemap.
    ['Pronunciation guide', '発音ガイド', '/pronunciation'],
    ['Reviews', '生徒の声', '#reviews'],
    ['FAQs', 'よくある質問', '#faq'],
  ] },
  { title: ['Support', 'サポート'], links: [
    ['Contact', 'お問い合わせ', 'mailto:connor@eigo.io'],
    ['Terms', '利用規約', '/terms'],
    ['Privacy', 'プライバシー', '/privacy'],
  ] },
]

const social = (d: React.ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{d}</svg>

/* Mirrors the social row in src/components/Footer.tsx (the footer the
   pronunciation guide uses) so both footers show the same accounts and the
   identical icon artwork. Keep the two in step if either changes. */
const SOCIALS: { label: string; href: string; d: string }[] = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/connorteacher_',
    d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/connorteacher/',
    d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCfFbwmvzDw_l5jH-4Qa4yvg',
    d: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
]

export default function SiteFooterV3({ onSignup }: { onSignup: () => void }) {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const mobile = useIsMobile()
  const bandRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLDivElement>(null) // parallax wrapper around the next/image

  // Desktop-only: same following circle-ring cursor as the bento cards. The ring
  // (.lp-bc-cursor) is shown on .lp-bcard:hover and positioned from --gx/--gy.
  const onCursorMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--gx', `${e.clientX - r.left}px`)
    el.style.setProperty('--gy', `${e.clientY - r.top}px`)
  }

  // Subtle parallax: the photo drifts up as the card scrolls up the viewport.
  useEffect(() => {
    const band = bandRef.current, img = imgRef.current
    if (!band || !img) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = band.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const prog = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh))
      img.style.transform = `translate3d(0, ${(prog * 64).toFixed(1)}px, 0) scale(1.24)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      {/* CTA — contained photo card */}
      <section style={{ padding: 'clamp(30px,4vh,60px) 0 clamp(56px,8vh,100px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px' }}>
          <div ref={bandRef} className={mobile ? undefined : 'lp-bcard'} onMouseMove={mobile ? undefined : onCursorMove} style={{ position: 'relative', borderRadius: 32, overflow: 'hidden', minHeight: 'clamp(400px,52vh,560px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* parallax wrapper carries the transform; the optimized image fills it */}
            <div ref={imgRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'scale(1.24)', willChange: 'transform' }}>
              <Image src="/footer-photo.jpg" alt="" fill sizes="(max-width: 1240px) 100vw, 1176px" style={{ objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.3), rgba(0,0,0,.52))' }} />
            {/* following circle-ring cursor (desktop) — matches the bento cards */}
            {!mobile && <div className="lp-bc-cursor" aria-hidden="true" style={{ color: 'var(--v3-on-photo)' }}><span className="lp-bc-cursor-ring" /></div>}
            <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px', color: 'var(--v3-on-photo)' }}>
              <Reveal as="h2" className={ja ? 'jp' : undefined} style={{ margin: 0, fontSize: 'clamp(30px,4.2vw,60px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.28 : 1.1 }}>
                {ja ? <>今日から、<br />英語を話そう</> : <>Start speaking<br />English today</>}
              </Reveal>
              <Reveal delay={0.12} style={{ marginTop: 'clamp(26px,3.5vh,40px)' }}>
                <button onClick={onSignup} className="jp lp-press" style={{ background: 'var(--v3-on-photo)', color: 'var(--v3-photo-ink)', border: 0, borderRadius: 999, height: 54, padding: '0 40px', fontSize: 17, fontWeight: 500, cursor: 'pointer' }}>
                  {ja ? '生徒になる' : 'Become a student'}
                </button>
                <div className={ja ? 'jp' : undefined} style={{ marginTop: 15, fontSize: 13.5, color: 'var(--v3-on-photo-dim)' }}>
                  {ja ? '初回15分の体験レッスンは無料です。' : 'Your first 15-minute lesson is free.'}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* footer — transparent, same max width */}
      <footer style={{ padding: '0 0 44px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vh,80px) 32px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'clamp(40px,6vw,80px)' }}>
            <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text)' }}>eigo.io</div>
              <div style={{ margin: '16px 0 0', maxWidth: 260 }}>
                <div className={ja ? 'jp' : undefined} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {ja ? '営業時間（日本時間）' : 'Opening hours (JST)'}
                </div>
                {[
                  { label: ja ? '午前' : 'Morning', time: '06:00 – 08:00' },
                  { label: ja ? '午後・夜' : 'Afternoon & Night', time: '16:00 – 02:00' },
                ].map(row => (
                  <div key={row.time} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 8, fontSize: 14, color: 'var(--text-muted)' }}>
                    <span className={ja ? 'jp' : undefined}>{row.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.time}</span>
                  </div>
                ))}
              </div>
              <a href="https://apps.apple.com/gb/app/eigo-io/id6761731252" target="_blank" rel="noopener noreferrer" className="lp-press" style={{ display: 'inline-block', marginTop: 'auto', paddingTop: 'clamp(24px,4vh,40px)' }} aria-label="Download on the App Store">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/${ja ? 'ja-jp' : 'en-us'}?size=250x83`} alt="Download on the App Store" style={{ height: 48, width: 'auto' }} />
              </a>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(36px,5vw,72px)' }}>
              {COLUMNS.map(col => (
                <nav key={col.title[0]} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className={ja ? 'jp' : undefined} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{ja ? col.title[1] : col.title[0]}</div>
                  {col.links.map(l => (
                    <a key={l[0]} href={l[2]} className={`v3-flink${ja ? ' jp' : ''}`}>{ja ? l[1] : l[0]}</a>
                  ))}
                </nav>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'clamp(48px,7vh,72px)', paddingTop: 28, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} eigo.io</div>
            {/* Same three accounts, and the same icon paths, as the site-wide
                footer used on the pronunciation guide (src/components/Footer.tsx). */}
            <div style={{ display: 'flex', gap: 18, color: 'var(--text-muted)' }}>
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="v3-flink" aria-label={s.label} style={{ display: 'inline-flex' }}>
                  {social(<path d={s.d} />)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
