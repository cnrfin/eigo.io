'use client'

import { useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import { CUE, SOUND_NAME } from '@/lib/sound-cues'

/**
 * Shadowing board: a grid of word cards for one position (initial/medial/final).
 * Tap a card to hear the word, then say it out loud (shadow). No grading — this
 * is free, self-paced production practice across many words.
 */
export default function ShadowGrid({ words, sounds, locale }: { words: { word: string; audioUrl?: string | null }[]; sounds?: string[]; locale: 'ja' | 'en' }) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<number | null>(null)

  const play = (i: number, url?: string | null) => {
    if (!url) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = url
    a.currentTime = 0
    a.onended = () => setPlaying((p) => (p === i ? null : p))
    void a.play().catch(() => {})
    setPlaying(i)
  }

  return (
    <div>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {t('カードを押して聞いて、声に出してまねしよう。', 'Tap each card, listen, then say it out loud.')}
      </p>
      {sounds && sounds.some((c) => CUE[c]) && (
        <ul className="w-fit mx-auto mb-8 flex flex-col gap-3">
          {sounds.filter((c) => CUE[c]).map((c) => (
            <li key={c} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent)' }}>•</span>
              <span><span className="font-semibold" style={{ color: 'var(--text)' }}>{SOUND_NAME[c]}</span> — {locale === 'ja' ? CUE[c].ja : CUE[c].en}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3">
        {words.map((w, i) => {
          const on = playing === i
          return (
            <Squircle key={i} asChild cornerRadius={16} cornerSmoothing={0.8}>
              <button onClick={() => play(i, w.audioUrl)}
                className="flex flex-col items-center justify-center gap-2 py-4 transition-transform duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
                style={{ background: 'var(--card-inset)', border: `1.5px solid ${on ? 'var(--accent)' : 'var(--edge)'}` }}>
                <span className="text-base font-semibold" style={{ color: 'var(--text)' }}>{w.word}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ color: on ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z" />
                </svg>
              </button>
            </Squircle>
          )
        })}
      </div>
    </div>
  )
}
