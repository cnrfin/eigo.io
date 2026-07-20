'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import RiveIcon, { type RiveIconHandle } from '@/components/ui/RiveIcon'
import { useTheme } from '@/context/ThemeContext'
import Reveal from './Reveal'
import { useIsMobile } from './useIsMobile'

/* v3 features section — Brilliant-style tabbed card. Four tabs (Lessons, Review,
   Courses, Tests); left column is copy, right column is a stylised, looping
   mini-mockup of the real product UI. The active demo remounts on tab change
   (key) so its animation restarts. */

// ---- Video demo (Rive animation rendered to a looping MP4) ----
// A poster frame (first frame) shows immediately; the MP4 itself is only loaded
// once the card is near the viewport, so the heavy videos never download on
// initial page load (better mobile CWV).
function VideoDemo({ src }: { src: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { rootMargin: '250px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const poster = src.replace('.mp4', '-poster.jpg')
  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxSizing: 'border-box', lineHeight: 0 }}>
      <video src={inView ? src : undefined} poster={poster} autoPlay muted loop playsInline preload={inView ? 'auto' : 'none'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

type Tab = {
  key: string
  labelJa: string; labelEn: string
  titleJa: string; titleEn: string
  /** Three scannable lines per tab. A single paragraph made the reader work to
   *  find out whether the tab applied to them. */
  pointsJa: string[]; pointsEn: string[]
  rive: string // artboard name in public/icons.riv (same as the dashboard nav)
  render: (ja: boolean) => React.ReactNode
}

const TABS: Tab[] = [
  {
    key: 'lessons', labelJa: 'レッスン', labelEn: 'Lessons',
    titleJa: 'マンツーマンのオンラインレッスン', titleEn: 'One-to-one online lessons',
    pointsJa: [
      '15分から75分まで、都合に合わせて予約できます',
      '毎日6:00〜8:00と16:00〜翌2:00に開講しています',
      'すべてマンツーマン。ブラウザだけで受けられます',
    ],
    pointsEn: [
      'Book anything from 15 to 75 minutes, whenever suits you',
      'Available every day, 6:00 to 8:00 and 16:00 to 02:00 JST',
      'Always one to one, and it runs in your browser',
    ],
    rive: 'home',
    render: () => <VideoDemo src="/videos/lesson.mp4" />,
  },
  {
    key: 'review', labelJa: '復習', labelEn: 'Review',
    titleJa: 'レッスンの記録が残ります', titleEn: 'Every lesson is recorded',
    pointsJa: [
      'レッスンの文字起こしを、いつでも読み返せます',
      '直したところと覚えたフレーズをまとめたサマリーが届きます',
      '録画は音声でも動画でもダウンロードできます',
    ],
    pointsEn: [
      'Read the transcript of any lesson whenever you like',
      'A summary of your corrections and the phrases you learned',
      'Download each recording as audio or video',
    ],
    rive: 'lessons',
    render: () => <VideoDemo src="/videos/review.mp4" />,
  },
  {
    key: 'courses', labelJa: 'コース', labelEn: 'Courses',
    titleJa: '発音・TOEIC・IELTS・英検のコース', titleEn: 'Courses for pronunciation, TOEIC, IELTS and EIKEN',
    pointsJa: [
      '練習問題つきで、その場で採点されます',
      'レベルごとに、少しずつ進められます',
      '各コースの最初のレベルは無料です',
    ],
    pointsEn: [
      'Exercises included, marked as you go',
      'Work through it a level at a time',
      'The first level of each course is free',
    ],
    rive: 'course',
    render: () => <VideoDemo src="/videos/course.mp4" />,
  },
  {
    key: 'tests', labelJa: 'テスト', labelEn: 'Tests',
    titleJa: '本格模試とレベルチェック', titleEn: 'Mock tests and a level check',
    pointsJa: [
      'TOEIC・IELTS・英検・Versantに対応しています',
      'スピーキングは録音から自動で採点されます',
      'CEFRレベルと、弱点がわかります',
    ],
    pointsEn: [
      'Covers TOEIC, IELTS, EIKEN and Versant',
      'Speaking is graded automatically from your recording',
      'You get a CEFR level and a breakdown of weak points',
    ],
    rive: 'exam',
    render: () => <VideoDemo src="/videos/test.mp4" />,
  },
]

export default function FeaturesV3() {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const mobile = useIsMobile()
  const { theme } = useTheme()
  // the active tab pill is filled with var(--text); the icon must contrast, i.e.
  // match var(--bg) — light in light mode, dark in dark mode
  const activeIcon: [number, number, number] = theme === 'dark' ? [10, 10, 15] : [247, 246, 245]
  const [active, setActive] = useState(0)
  const t = TABS[active]
  const riveRefs = useRef<Record<string, RiveIconHandle | null>>({})

  return (
    // outer container matches the header (max-width + gutters) so the card lines
    // up with the logo / nav; gutters shrink on mobile so the card isn't cramped
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', width: '100%', boxSizing: 'border-box' }}>
      {/* the card — title, tabs and the 2-column panel all live inside it; it
          hugs its content with even padding on every side */}
      <div style={{ background: 'var(--card)', borderRadius: 'clamp(22px,4vw,32px)', boxShadow: '0 30px 80px rgba(0,0,0,.06)', padding: mobile ? 28 : 'clamp(22px,5vw,72px)' }}>
        <Reveal as="h2" className={ja ? 'jp' : undefined} style={{ textAlign: 'center', margin: 0, fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.3 : 1.14, color: 'var(--text)' }}>
          {ja ? '必要な機能は、すべて揃っています' : 'Everything in one place'}
        </Reveal>

        {/* tabs — 2×2 uniform grid on mobile, inline row on desktop */}
        <div role="tablist" style={mobile
          ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 44 }
          : { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 'clamp(34px,5vw,52px)' }}>
          {TABS.map((tab, i) => {
            const on = i === active
            return (
              <button key={tab.key} role="tab" aria-selected={on} onClick={() => setActive(i)} onMouseEnter={() => riveRefs.current[tab.key]?.fire()} className="lp-press"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 999, border: '1px solid', borderColor: on ? 'var(--text)' : 'var(--border)', background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--text-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                <RiveIcon ref={(h) => { riveRefs.current[tab.key] = h }} artboard={tab.rive} size={20} variant={on ? 'text' : 'muted'} colorRgb={on ? activeIcon : undefined} />
                <span className={ja ? 'jp' : undefined}>{ja ? tab.labelJa : tab.labelEn}</span>
              </button>
            )
          })}
        </div>

        {/* panel: description left, animation right (stacked on mobile) */}
        <div className="fdv3-panel" style={{ marginTop: mobile ? 64 : 'clamp(32px,4vw,56px)', display: 'grid', gridTemplateColumns: 'minmax(0,0.95fr) minmax(0,1.45fr)', gap: mobile ? 40 : 'clamp(32px,5vw,72px)', alignItems: 'center' }}>
          <div>
            <Reveal className={ja ? 'jp' : undefined} style={{ fontSize: 'clamp(23px,2.6vw,36px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.32 : 1.15, color: 'var(--text)' }}>
              {ja ? t.titleJa : t.titleEn}
            </Reveal>
            <Reveal delay={0.1} className={ja ? 'jp' : undefined} style={{ margin: mobile ? '18px 0 0' : '16px 0 0', maxWidth: 440 }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: mobile ? 10 : 12 }}>
                {(ja ? t.pointsJa : t.pointsEn).map((point) => (
                  <li key={point} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 'clamp(15px,1.2vw,18px)', lineHeight: ja ? 1.75 : 1.6, color: 'var(--text-secondary)' }}>
                    {/* the tick is decorative; the text carries the meaning */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: ja ? 5 : 3 }}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {/* fixed-aspect box (matches the 1280×810 videos) so the card stays
                the same height on every tab — no resize/flicker. Remounts on tab
                change so the demo animation restarts. */}
            <div key={t.key} style={{ width: '100%', aspectRatio: '1280 / 810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.render(ja)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
