'use client'

import { useState } from 'react'
import Link from 'next/link'
import SquircleBox from '@/components/ui/SquircleBox'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'
import styles from './GuideBrowser.module.css'

/**
 * Index browser for the pronunciation guide.
 *
 * The sound list stays put — a sticky rail on desktop, a sticky horizontal
 * strip on mobile — and only the pane beside it swaps. That keeps ten sounds
 * and 200+ words reachable without the long scroll the old flat list forced.
 *
 * Every guide's word list is rendered and merely hidden with `display`, never
 * conditionally mounted, so all internal links to the word pages are present in
 * the server-rendered HTML for crawlers.
 */

export type BrowserWord = { slug: string; word: string; ipa: string; ja: string }
export type BrowserGuide = {
  slug: string
  railJa: string
  shortLabel: string
  group: 'consonant' | 'vowel'
  ipaA: string
  ipaB: string
  wordA: string
  wordB: string
  taglineJa: string
  words: BrowserWord[]
}

const MAGENTA = 'var(--v3-level)'
const pillCls = 'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95'
// Fixed heights — a random walk would differ between server and client render.
const BARS = [14, 30, 20, 44, 26, 38, 16, 48, 22, 34, 18, 42, 24]

const eyebrow: React.CSSProperties = {
  margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: '.14em',
  textTransform: 'uppercase', color: 'var(--text-muted)',
}

function Waveform() {
  return (
    <div aria-hidden style={{ position: 'absolute', right: -6, bottom: -4, display: 'flex', alignItems: 'flex-end', gap: 3, height: 76, opacity: 0.1, pointerEvents: 'none' }}>
      {BARS.map((h, i) => (
        <span key={i} style={{ display: 'block', width: 5, height: h + 22, borderRadius: 3, background: 'var(--accent)' }} />
      ))}
    </div>
  )
}

export default function GuideBrowser({ guides }: { guides: BrowserGuide[] }) {
  const { theme } = useTheme()
  const th = theme === 'dark' ? 'dark' : 'light'
  const [active, setActive] = useState(guides[0]?.slug ?? '')

  const consonants = guides.filter((g) => g.group === 'consonant')
  const vowels = guides.filter((g) => g.group === 'vowel')

  const RailItem = ({ g }: { g: BrowserGuide }) => (
    <button onClick={() => setActive(g.slug)} aria-current={g.slug === active} className={styles.railItem}>
      <span style={{ fontSize: 14, lineHeight: 1.35 }}>{g.railJa}</span>
      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)' }}>{g.words.length}</span>
    </button>
  )

  return (
    <div>
      {/* mobile: horizontal sound strip */}
      <div className={styles.strip}>
        <div className={styles.stripScroll}>
          <span style={{ ...eyebrow, margin: 0, alignSelf: 'center', flex: 'none', padding: '0 2px' }}>子音</span>
          {consonants.map((g) => (
            <button key={g.slug} onClick={() => setActive(g.slug)} aria-pressed={g.slug === active}
              className={`${styles.chip} ${pillCls}`} style={pillTabStyle(g.slug === active, th)}>{g.shortLabel}</button>
          ))}
          <span style={{ ...eyebrow, margin: 0, alignSelf: 'center', flex: 'none', padding: '0 2px' }}>母音</span>
          {vowels.map((g) => (
            <button key={g.slug} onClick={() => setActive(g.slug)} aria-pressed={g.slug === active}
              className={`${styles.chip} ${pillCls}`} style={pillTabStyle(g.slug === active, th)}>{g.shortLabel}</button>
          ))}
        </div>
      </div>

      <div className={styles.split}>
        {/* desktop: vertical rail */}
        <aside className={styles.rail}>
          <p style={eyebrow}>子音</p>
          <div style={{ marginBottom: 18 }}>{consonants.map((g) => <RailItem key={g.slug} g={g} />)}</div>
          <p style={eyebrow}>母音</p>
          <div>{vowels.map((g) => <RailItem key={g.slug} g={g} />)}</div>
        </aside>

        <div style={{ minWidth: 0 }}>
          {guides.map((g) => (
            <section key={g.slug} style={{ display: g.slug === active ? 'block' : 'none' }}>
              <SquircleBox
                cornerRadius={22}
                style={{ background: 'var(--card)', padding: 'clamp(20px,3vw,26px)', position: 'relative', overflow: 'hidden', display: 'block', marginBottom: 20 }}
              >
                <div style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{g.ipaA}</span><span style={{ opacity: 0.5, fontWeight: 400 }}>と</span><span>{g.ipaB}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', fontSize: 'clamp(30px,5vw,40px)', fontWeight: 700, letterSpacing: '-.035em', lineHeight: 1 }}>
                  <span style={{ color: 'var(--accent)' }}>{g.wordA}</span>
                  <span style={{ fontSize: 17, fontWeight: 400, color: 'var(--text-muted)' }}>と</span>
                  <span style={{ color: MAGENTA }}>{g.wordB}</span>
                </div>
                <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.8, color: 'var(--text-secondary)', maxWidth: 520 }}>{g.taglineJa}</p>
                <Link
                  href={`/pronunciation/sounds/${g.slug}`}
                  className="lp-press"
                  style={{ display: 'inline-flex', alignItems: 'center', marginTop: 18, padding: '11px 22px', borderRadius: 999, background: 'var(--accent)', color: 'var(--selected-text)', fontSize: 14.5, fontWeight: 600, textDecoration: 'none' }}
                >
                  練習する
                </Link>
                <Waveform />
              </SquircleBox>

              <p style={eyebrow}>この音を含む単語 <span style={{ color: 'var(--text-muted)' }}>{g.words.length}</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {g.words.map((w) => (
                  <Link
                    key={w.slug}
                    href={`/pronunciation/${w.slug}`}
                    style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, padding: '7px 13px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 14 }}
                  >
                    <b style={{ fontWeight: 600 }}>{w.word}</b>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{w.ipa}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
