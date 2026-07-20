'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { useLanguage } from '@/context/LanguageContext'
import { localizedHref } from '@/lib/i18n'
import { useTheme } from '@/context/ThemeContext'
import FlagMorph from '@/components/lp/FlagMorph'
import BentoGridV3 from '@/components/lp/BentoGridV3'
import FeaturesV3 from '@/components/lp/FeaturesV3'
import VocabSection from '@/components/lp/VocabSection'
import ReviewsSection from '@/components/lp/ReviewsSection'
import FaqSection from '@/components/lp/FaqSection'
import SiteFooterV3 from '@/components/lp/SiteFooterV3'
import AuthModal from '@/components/AuthModal'
import { useIsMobile } from '@/components/lp/useIsMobile'
import FreeGate from '@/components/lp/FreeGate'
import TrialBookingModal from '@/components/lp/TrialBookingModal'
import InvisibleHCaptcha, { type HCaptchaHandle } from '@/components/InvisibleHCaptcha'
import { useCardFunnel, stashPendingTrial, GATE_COPY, type CardKey, type PendingTrial } from '@/lib/lp-funnel'

/* The eigo.io landing (served at / and /en): a pinned hero where "bento" squares
   scatter and reassemble into a waving UK flag as you scroll toward the next
   section (reversible on the way up), then the feature panel slides up over it. */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

// Phase boundaries as fractions of the pinned scroll. Mobile inserts a reveal
// (hero text + bento scroll up) and holds the bento as an interactive rest
// state, then runs the morph over a WIDE window so the particle flight isn't
// rushed, and finally slides the feature card up.
const PHASES = {
  desktop: { reveal: 0, morphStart: 0, morphEnd: 0.45, slideStart: 0.5 },
  mobile: { reveal: 0.13, morphStart: 0.22, morphEnd: 0.58, slideStart: 0.64 },
}

/* Stat count-up — identical easing to v2's LpImpactStats; plays when `play`
   becomes true (i.e. when the flag state is reached). */
function CountUp({ value, play }: { value: number; play: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!play || value <= 0) return
    let raf = 0
    const start = performance.now()
    const dur = 1300
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, value])
  return <>{n.toLocaleString()}+</>
}

export default function LandingClient() {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const bentoSlotRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const [p, setP] = useState(0)

  const { locale, toggleLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const ja = locale === 'ja'
  const mobile = useIsMobile()
  // read inside the scroll handler without re-subscribing
  const mobileRef = useRef(mobile)
  useEffect(() => { mobileRef.current = mobile }, [mobile])

  // Funnel — same destinations as v2: cefr → test, pron/ielts → lesson player,
  // trial → booking modal then sign-up gate. Falls back to the auth modal.
  const [showAuth, setShowAuth] = useState(false)
  const [showTrial, setShowTrial] = useState(false)
  const [showTrialGate, setShowTrialGate] = useState(false)
  const captchaRef = useRef<HCaptchaHandle>(null)
  const { openCard, ensureGuestSession } = useCardFunnel(() => captchaRef.current?.getToken() ?? Promise.resolve(null))

  const handleCard = async (key: string) => {
    if (key === 'trial') { await ensureGuestSession(); setShowTrial(true); return }
    const result = await openCard(key as CardKey)
    if (result === 'fallback') setShowAuth(true)
  }
  const onTrialPicked = (slot: PendingTrial) => { stashPendingTrial(slot); setShowTrial(false); setShowTrialGate(true) }

  // Back/forward cache: a hard navigation away (e.g. to /plans) freezes this
  // page and restores it on Back WITHOUT re-running any scripts. That leaves the
  // scroll-morph, WebGL flag, Lenis and the reveal observers un-initialised, so
  // the page comes back half-rendered. Force a fresh load on bfcache restore.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // Smooth scroll (Lenis) + scroll-driven morph progress in one place. Driving
  // `p` straight off Lenis's own scroll event keeps the morph progress locked to
  // the real scroll position. This matters most on back-navigation: a restored
  // scroll position used to desync `p` from where the page actually was, which
  // left the hero/bento/flag stuck mid-morph and the feature panel half-slid.
  useEffect(() => {
    // Start every visit at the top with a fresh morph. Disabling scroll
    // restoration stops the browser/router from returning to a mid-page spot.
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) history.scrollRestoration = 'manual'

    const lenis = new Lenis({ lerp: 0.08 })

    const compute = () => {
      const el = wrapRef.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const prog = total > 0 ? clamp(-el.getBoundingClientRect().top / total) : 0
      // On mobile the first slice of scroll is a reveal (hero text → bento), so
      // the morph window is pushed back and widened; on desktop it starts at once.
      const ph = mobileRef.current ? PHASES.mobile : PHASES.desktop
      progressRef.current = clamp((prog - ph.morphStart) / (ph.morphEnd - ph.morphStart))
      setP(prog)
    }
    lenis.on('scroll', compute)
    window.addEventListener('resize', compute)

    let id = 0
    const raf = (time: number) => { lenis.raf(time); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)

    // Reset to the top now and again next frame (in case a restoration fires
    // after mount); each reset re-runs compute so `p` matches the real position.
    lenis.scrollTo(0, { immediate: true }); compute()
    const reset = requestAnimationFrame(() => { lenis.scrollTo(0, { immediate: true }); compute() })

    return () => {
      cancelAnimationFrame(id)
      cancelAnimationFrame(reset)
      window.removeEventListener('resize', compute)
      lenis.destroy()
    }
  }, [])

  // Scroll timeline (phase boundaries differ per platform — see PHASES).
  const ph = mobile ? PHASES.mobile : PHASES.desktop
  const flagP = clamp((p - ph.morphStart) / (ph.morphEnd - ph.morphStart))
  const slideP = clamp((p - ph.slideStart) / (1 - ph.slideStart))
  // Flag (canvas + text) stays fully visible while the feature card rises, then
  // dissolves once the card is ~halfway up and rising over it.
  const flagFade = 1 - clamp((slideP - 0.5) / 0.36)
  const titleFade = clamp((flagP - 0.33) / 0.08) // appear right as the flag forms

  // Mobile reveal phase (before the morph): the hero text + bento scroll up
  // together as two stacked panels — the text lifts off the top while the bento
  // rises into the centre. Only once the bento is fully in view does the morph
  // begin. Desktop shows the flex column with no reveal.
  const revealP = mobile ? clamp(p / ph.reveal) : 1
  const revealShift = mobile ? Math.min(revealP, 1) * 100 : 0 // vh the column lifts
  const settled = mobile ? revealP >= 1 : true                // bento resting → safe to re-measure
  const heroFade = 1 - clamp(flagP / 0.16)                    // desktop hero fade
  const bentoInteractive = mobile ? (revealP >= 1 && flagP < 0.02) : flagP < 0.02

  // Shared hero pieces (placed in the desktop column or the mobile overlay).
  const heroTitle = (
    <>
      {/* The heading stays in English in both locales: it reads as a signal that
          this is a place English is used, rather than a standard eikaiwa. The
          Japanese keywords live in the title tag and the visible sub below, so
          there is no hidden keyword text here. */}
      <h1 style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(34px,5vw,72px)', fontWeight: 500, letterSpacing: '-.02em', lineHeight: 1.1, color: 'var(--text)' }}>
      {(() => {
        let k = 0
        return ['One-to-one English', 'lessons from the UK'].map((line, l) => (
          <span key={l} style={{ display: 'block' }}>
            {[...line].map((ch, i) => {
              const delay = (k++ * 0.025).toFixed(3)
              return ch === ' '
                ? <span key={i}>{' '}</span>
                : <span key={i} className="lp-letter" style={{ animationDelay: `${delay}s` }}>{ch}</span>
            })}
          </span>
        ))
      })()}
      </h1>
    </>
  )
  const heroSubtitle = (
    <p className="jp lp-fade-up" style={{ margin: 'clamp(14px,1.8vh,22px) auto 0', textAlign: 'center', maxWidth: 560, fontSize: 'clamp(15px,1.5vw,20px)', fontWeight: 400, lineHeight: ja ? 1.75 : 1.5, color: 'var(--text-secondary)', animationDelay: '0.42s' }}>
      {ja
        ? 'イギリス人講師とのマンツーマン・オンライン英会話。初心者の方も、目的に合わせて学べます。'
        : 'One-to-one online English lessons with a tutor from the UK, from beginner level up, built around what you need it for.'}
    </p>
  )
  const heroCta = (
    <div className="lp-fade-up" style={{ animationDelay: '0.5s' }}>
      <button
        onClick={() => setShowAuth(true)}
        className="jp lp-press"
        style={{ background: 'var(--text)', color: 'var(--bg)', border: 0, borderRadius: 999, height: 48, padding: '0 36px', fontSize: 17, fontWeight: 400, cursor: 'pointer', pointerEvents: heroFade > 0.4 ? 'auto' : 'none' }}
      >
        {ja ? '15分の無料体験' : 'Free 15-minute trial'}
      </button>
    </div>
  )
  const flagBoost = mobile ? 1.75 : 1 // a bigger flag on mobile (narrow bento)
  const bentoStage = (
    <BentoGridV3 interactive={bentoInteractive} progress={flagP} settled={settled} flagBoost={flagBoost} onOpen={handleCard} />
  )

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* pinned morph stage — taller on mobile so the reveal + morph aren't rushed */}
      <div ref={wrapRef} style={{ height: mobile ? '360vh' : '300vh', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          {/* full-screen morph canvas — particles fly in from the whole screen;
              the flag forms at the bento slot (anchorRef) so it stays aligned.
              Fades out as the features panel slides over it. */}
          <div style={{ position: 'absolute', inset: 0, opacity: flagFade, transition: 'opacity 0.1s linear', pointerEvents: 'none' }}>
            <FlagMorph progressRef={progressRef} anchorRef={bentoSlotRef} boost={mobile ? 1.75 : 1} />
          </div>

          {/* header — logo left, EN + login right (v2 styling) */}
          <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', height: 92, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a href={localizedHref('/', locale)} className="lp-fade-up" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text)' }}>eigo.io</a>
              <nav className="lp-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 10, animationDelay: '0.08s' }}>
                <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="lp-press" style={{ background: 'transparent', color: 'var(--text-muted)', border: 0, width: 44, height: 44, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {theme === 'dark' ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                  )}
                </button>
                <button onClick={toggleLocale} aria-label="Toggle language" className="lp-press" style={{ background: 'var(--v3-soft)', color: 'var(--text)', border: 0, borderRadius: 999, height: 44, padding: '0 22px', fontSize: 15, fontWeight: 400, cursor: 'pointer' }}>{ja ? 'EN' : 'JA'}</button>
                <button onClick={() => setShowAuth(true)} className="jp lp-press" style={{ background: 'var(--text)', color: 'var(--bg)', border: 0, borderRadius: 999, height: 44, padding: '0 26px', fontSize: 15, fontWeight: 400, cursor: 'pointer' }}>{ja ? 'ログイン' : 'Login'}</button>
              </nav>
            </div>
          </header>

          {/* hero — two layouts. Desktop: a single flex column (title, CTA, then
              the bento/flag stage). Mobile: the hero text fills the viewport, then
              a reveal scroll cross-fades it out and the full-size bento in (so the
              bento is legible), before the morph runs. */}
          {mobile ? (
            // two stacked full-height panels (hero text, then bento) that scroll
            // up together during the reveal. At revealP=1 the column has lifted a
            // full panel so the bento sits centred, held there for the morph.
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200vh', transform: `translateY(-${revealShift}vh)`, transition: 'transform 0.08s linear', pointerEvents: 'none' }}>
              {/* panel 1 — hero text + teacher preview, fills the first viewport */}
              <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '88px 24px 40px', boxSizing: 'border-box' }}>
                <div>{heroTitle}{heroSubtitle}</div>
                <div style={{ pointerEvents: revealP < 0.4 ? 'auto' : 'none' }}>{heroCta}</div>
                {/* teacher preview — the portrait + greeting from the trial card,
                    moved here to fill the hero; photo rises in, then the two chat
                    bubbles pop in one after another */}
                <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div className="fdv3-rise-in" style={{ animationDelay: '0.7s', position: 'relative', height: 'clamp(260px,42vh,400px)', aspectRatio: '3 / 4', borderRadius: 24, overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/profile-lp.jpg" alt="" aria-hidden="true" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', left: 16, bottom: 14, color: 'var(--v3-on-photo)', fontSize: 16, fontWeight: 600, textShadow: '0 1px 6px rgba(0,0,0,.5)' }}>Connor</span>
                  </div>
                  <div className="fdv3-msg-up" style={{ marginTop: 16, background: 'var(--v3-bubble)', color: 'var(--v3-bubble-ink)', fontSize: 14, fontWeight: 400, padding: '9px 17px', borderRadius: 999, animationDelay: '1.05s' }}>
                    Nice to meet you!
                  </div>
                  <div className="fdv3-msg-up" style={{ marginTop: 8, background: 'var(--v3-bubble)', color: 'var(--v3-bubble-ink)', fontSize: 14, fontWeight: 400, padding: '9px 17px', borderRadius: 999, animationDelay: '1.5s' }}>
                    I&apos;m Connor 👋
                  </div>
                </div>
              </div>
              {/* panel 2 — the bento (also the flag anchor); rises into view */}
              <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '84px 16px 60px', boxSizing: 'border-box', pointerEvents: bentoInteractive ? 'auto' : 'none' }}>
                <div ref={bentoSlotRef} style={{ position: 'relative', width: '100%', height: '100%', maxHeight: '78vh' }}>
                  {bentoStage}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 'clamp(24px,3.5vh,38px)', padding: 'clamp(128px,17vh,196px) 24px clamp(28px,4vh,52px)', boxSizing: 'border-box', pointerEvents: 'none' }}>
              {/* 1 — title */}
              <div style={{ opacity: heroFade, transform: `translateY(${(1 - heroFade) * -48}px)`, transition: 'opacity 0.1s linear, transform 0.1s linear' }}>
                {heroTitle}
                {heroSubtitle}
              </div>
              {/* 2 — CTA */}
              <div style={{ opacity: heroFade, transform: `translateY(${(1 - heroFade) * -48}px)`, transition: 'opacity 0.1s linear, transform 0.1s linear', flex: 'none' }}>
                {heroCta}
              </div>
              {/* 3 — bento slot (also the flag's anchor) */}
              <div ref={bentoSlotRef} style={{ position: 'relative', width: '100%', flex: '1 1 auto', minHeight: 0, maxHeight: 'clamp(330px,40vh,420px)', pointerEvents: 'auto' }}>
                {bentoStage}
              </div>
            </div>
          )}

          {/* flag-state content — title (same spot as the hero title), then the
              subtext + stats row below the flag. Fades in as the flag forms. */}
          <div style={{ position: 'absolute', inset: 0, opacity: titleFade * flagFade, transition: 'opacity 0.1s linear', pointerEvents: 'none' }}>
            {/* section title — desktop pins it near the top. Mobile anchors the
                title's BOTTOM a fixed distance above the flag centre (44%) and the
                subtext's TOP the same distance below, so the gaps above and below
                the flag are always equal regardless of the flag's size. */}
            <div style={mobile
              ? { position: 'absolute', top: '44%', left: 0, right: 0, padding: '0 24px', textAlign: 'center', transform: 'translateY(calc(-100% - 96px - 8vh))' }
              : { position: 'absolute', top: 'clamp(128px,17vh,196px)', left: 0, right: 0, padding: '0 24px', textAlign: 'center' }}>
              {/* jp-display: this is heading-size text but not a heading tag, so it
                  opts into the tightened metrics explicitly. */}
              <div className="jp jp-display" style={{ fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.28 : 1.12, color: 'var(--text)' }}>
                {ja ? <>イギリス発の<br />英会話スクール</> : <>A UK-based<br />English School</>}
              </div>
            </div>
            {/* subtext + stats — below the flag. Stats stack into 3 rows on mobile. */}
            <div style={mobile
              ? { position: 'absolute', top: '44%', left: 0, right: 0, transform: 'translateY(calc(96px + 8vh))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }
              : { position: 'absolute', top: '63%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(28px,4.5vh,52px)' }}>
              <p className="jp" style={{ margin: 0, padding: '0 24px', maxWidth: 960, textAlign: 'center', fontSize: 'clamp(15px,1.3vw,18px)', lineHeight: ja ? 1.85 : 1.7, color: 'var(--text-secondary)' }}>
                {ja
                  ? 'eigo.io は、2021年にイギリスではじまったオンライン英会話スクールです。日本人の学習者に英語を教えることを専門にしています。日本語話者がつまずきやすい点を踏まえて、苦手なところを一緒に直していきます。急がず、一人ひとりのペースに合わせて進めることを大切にしています。'
                  : 'eigo.io is an online English school, started in the UK in 2021. We specialise in teaching English to Japanese learners. We know the places Japanese speakers tend to get stuck, and we work through those weak points with you. Lessons go at your pace, and there is no rush.'}
              </p>
              <div style={{ width: '100%', maxWidth: 1240, marginTop: mobile ? 18 : 0, padding: mobile ? '0 40px' : '0 32px', boxSizing: 'border-box', display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 16 : 0 }}>
                {[
                  { v: 1000, l: ja ? '指導した生徒' : 'Students taught' },
                  { v: 10000, l: ja ? '完了したレッスン' : 'Lessons completed' },
                  { v: 500000, l: ja ? '会話した分数' : 'Minutes of conversation' },
                ].map((s, i) => (
                  <Fragment key={i}>
                    {i > 0 && !mobile && <div aria-hidden="true" style={{ width: 1, height: 'clamp(44px,6vh,68px)', background: 'var(--border)', flex: 'none' }} />}
                    {mobile ? (
                      // full-width row: big number left, label right, on a hairline
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', lineHeight: 1 }}><CountUp value={s.v} play={flagP > 0.34} /></div>
                        <div className="jp" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.l}</div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(26px,3vw,44px)', fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', lineHeight: 1 }}><CountUp value={s.v} play={flagP > 0.34} /></div>
                        <div className="jp" style={{ marginTop: 10, fontSize: 'clamp(12px,1vw,15px)', color: 'var(--text-secondary)' }}>{s.l}</div>
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* scroll hint — a bouncing glass pill at the bottom. Lower layer than
              the feature card (it lives in the z-1 stage), and fades out as the
              slide begins so it never pokes out below the card. */}
          <div style={{ position: 'absolute', bottom: 'clamp(22px,4vh,40px)', left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - clamp((slideP - 0.55) / 0.2), transition: 'opacity 0.15s linear', pointerEvents: 'none' }}>
            <div className="fdv3-scrollhint" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 22px', borderRadius: 999, background: 'var(--v3-glass)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
              <span className="jp">{ja ? '下にスクロール' : 'Scroll to continue'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* features — slides up over the flag (maze-style) on a higher layer */}
      <section id="features" style={{ position: 'relative', zIndex: 2, marginTop: '-100vh', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mobile ? '78px 0 64px' : 'clamp(80px,12vh,140px) 0 clamp(120px,16vh,200px)', pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 56%, var(--v3-wash) 100%)' }}>
        <div style={{ pointerEvents: 'auto', width: '100%' }}><FeaturesV3 /></div>
      </section>

      {/* from here on the page scrolls normally (no overlaying sections) */}
      <VocabSection />
      <ReviewsSection />
      <FaqSection />
      <SiteFooterV3 onSignup={() => setShowAuth(true)} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showTrial && <TrialBookingModal onClose={() => setShowTrial(false)} onPicked={onTrialPicked} />}
      {showTrialGate && <FreeGate destination="/dashboard" copy={GATE_COPY.trial} onClose={() => setShowTrialGate(false)} />}
      <InvisibleHCaptcha ref={captchaRef} />
    </main>
  )
}
