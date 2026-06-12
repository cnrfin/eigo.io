'use client'

import { useRef, useState } from 'react'

/**
 * HVPT (High Variability Phonetic Training) play control for discrimination
 * drills: the same word is provided in several voices, and each press plays a
 * random one. Hearing a contrast across many talkers is what makes it
 * generalise, which is the whole point of the ear-training.
 */
export default function HvptPlayer({ urls, locale }: { urls: string[]; locale: 'ja' | 'en' }) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastRef = useRef(-1)
  const [played, setPlayed] = useState(false)

  const play = () => {
    if (!urls.length) return
    // avoid repeating the same voice twice in a row when there's a choice
    let i = Math.floor(Math.random() * urls.length)
    if (urls.length > 1 && i === lastRef.current) i = (i + 1) % urls.length
    lastRef.current = i
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = urls[i]
    audioRef.current.currentTime = 0
    void audioRef.current.play().catch(() => {})
    setPlayed(true)
  }

  return (
    <button onClick={play}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-transform duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
      style={{ background: 'var(--card-inset)', color: 'var(--text)', border: '1px solid var(--edge)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>
      {played ? t('もう一度（別の声）', 'Again (new voice)') : t('聞く', 'Listen')}
    </button>
  )
}
