'use client'

import { useRef, useState } from 'react'

/**
 * Stress picker (perception): a plain list of words — each a compact play button,
 * the word as a small header, and a row of dots (one per syllable, syllable text
 * above). The learner taps the dot of the syllable they think is stressed; it
 * enlarges and fills with the accent colour. Selection is controlled by the
 * player, which grades it through the normal Check flow. Once `revealed`, the
 * correct beat shows in accent and any wrong pick in danger.
 */
type Word = { word: string; syllables: string[]; stressIndex: number; audioUrl?: string | null; hint?: string; hint_ja?: string }

export default function StressPick({
  words, locale, selections, onSelect, revealed,
}: {
  words: Word[]
  locale: 'ja' | 'en'
  selections: Record<number, number>
  onSelect: (wordIndex: number, syllableIndex: number) => void
  revealed: boolean
}) {
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
      {words.map((w, i) => (
        <div key={i} className="flex items-center gap-3 sm:gap-4 py-4 border-b last:border-b-0" style={{ borderColor: 'var(--divider)' }}>
          <button onClick={() => play(i, w.audioUrl)} aria-label={t('再生', 'Play')}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
            style={{ background: playing === i ? 'var(--accent)' : 'var(--card-inset)', color: playing === i ? '#fff' : 'var(--text-secondary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          </button>
          <span className="shrink-0 w-24 sm:w-32">
            <span className="block text-base font-semibold leading-tight" style={{ color: 'var(--text)' }}>{w.word}</span>
            {(locale === 'ja' ? (w.hint_ja ?? w.hint) : w.hint) && (
              <span className="block text-xs leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{locale === 'ja' ? (w.hint_ja ?? w.hint) : w.hint}</span>
            )}
          </span>
          <div className="flex-1 flex items-end justify-center gap-6 sm:gap-8">
            {w.syllables.map((syl, k) => {
              const isSel = selections[i] === k
              const isAnswer = w.stressIndex === k
              let dotBg = 'var(--text-subtle)', size = 13, labelColor = 'var(--text-secondary)', labelWeight = 400
              if (!revealed) {
                if (isSel) { dotBg = 'var(--accent)'; size = 22; labelColor = 'var(--text)'; labelWeight = 700 }
              } else if (isAnswer) {
                dotBg = 'var(--accent)'; size = 22; labelColor = 'var(--text)'; labelWeight = 700
              } else if (isSel) {
                dotBg = 'var(--danger)'; size = 22; labelColor = 'var(--danger)'; labelWeight = 700
              }
              return (
                <button key={k} disabled={revealed} onClick={() => onSelect(i, k)}
                  className="flex flex-col items-center gap-2" style={{ cursor: revealed ? 'default' : 'pointer' }}>
                  <span className="text-sm sm:text-base leading-none" style={{ color: labelColor, fontWeight: labelWeight }}>{syl}</span>
                  <span className="rounded-full transition-all duration-150 ease-out" style={{ width: size, height: size, background: dotBg }} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
