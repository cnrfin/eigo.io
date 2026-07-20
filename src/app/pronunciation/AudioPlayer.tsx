'use client'

import { useRef } from 'react'

/* Plays the real recordings for a word. UK female is always present; the male
   and US takes only exist for library-sourced words, so every button here is
   rendered conditionally — we never point a "UK 男性" button at a female clip.
   One shared <audio> element; each button aims it at that voice and plays. */
export default function AudioPlayer({ male, female, usMale, usFemale, word, size = 'lg' }: {
  male?: string; female: string; usMale?: string; usFemale?: string; word: string; size?: 'lg' | 'sm'
}) {
  const ref = useRef<HTMLAudioElement>(null)

  const play = (src: string) => {
    const a = ref.current
    if (!a) return
    a.src = src
    a.currentTime = 0
    a.play().catch(() => { /* autoplay/gesture guards — ignore */ })
  }

  const big = size === 'lg'
  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    height: big ? 50 : 40, padding: big ? '0 22px' : '0 16px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
    fontSize: big ? 16 : 14, fontWeight: 600,
  }
  const icon = (
    <svg width={big ? 20 : 18} height={big ? 20 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <audio ref={ref} preload="none" />
      {male && <button className="lp-press" onClick={() => play(male)} aria-label={`${word} をUK男性の声で聞く`} style={btn}>{icon} UK 男性</button>}
      <button className="lp-press" onClick={() => play(female)} aria-label={`${word} をUK女性の声で聞く`} style={btn}>{icon} UK 女性</button>
      {usMale && <button className="lp-press" onClick={() => play(usMale)} aria-label={`${word} をUS男性の声で聞く`} style={btn}>{icon} US 男性</button>}
      {usFemale && <button className="lp-press" onClick={() => play(usFemale)} aria-label={`${word} をUS女性の声で聞く`} style={btn}>{icon} US 女性</button>}
    </div>
  )
}
