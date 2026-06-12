'use client'

import { useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'

/**
 * Sentence-stress picker (perception): each sentence has a play button and its
 * words as tappable chips. The learner taps every word they think is stressed
 * (the content words) — multi-select. Selection is controlled by the player,
 * graded through the normal Check flow. Once `revealed`, the stressed words show
 * in accent (filled if the learner caught them, outlined if missed) and any
 * wrongly-tapped function word shows in danger.
 */
type Sentence = { text: string; words: string[]; stressed: number[]; audioUrl?: string | null }

export default function SentenceStress({
  sentences, locale, selections, onToggle, revealed,
}: {
  sentences: Sentence[]
  locale: 'ja' | 'en'
  selections: Record<number, number[]>
  onToggle: (sentenceIndex: number, wordIndex: number) => void
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
    <div className="space-y-5">
      {sentences.map((s, i) => {
        const sel = selections[i] ?? []
        return (
          <div key={i} className="flex items-start gap-3">
            <button onClick={() => play(i, s.audioUrl)} aria-label={t('再生', 'Play')}
              className="shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
              style={{ background: playing === i ? 'var(--accent)' : 'var(--card-inset)', color: playing === i ? '#fff' : 'var(--text-secondary)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {s.words.map((w, k) => {
                const isSel = sel.includes(k)
                const isAns = s.stressed.includes(k)
                let bg = 'transparent', color = 'var(--text-secondary)', weight = 400, border = '1px solid transparent'
                if (!revealed) {
                  if (isSel) { bg = 'var(--accent)'; color = '#fff'; weight = 700 }
                } else if (isAns && isSel) { bg = 'var(--accent)'; color = '#fff'; weight = 700 }
                else if (isAns && !isSel) { bg = 'transparent'; color = 'var(--accent)'; weight = 700; border = '1px solid var(--accent)' }
                else if (!isAns && isSel) { bg = 'var(--danger)'; color = '#fff'; weight = 700 }
                return (
                  <Squircle key={k} asChild cornerRadius={10} cornerSmoothing={0.8}>
                    <button disabled={revealed} onClick={() => onToggle(i, k)}
                      className="px-2.5 py-1 text-base sm:text-lg transition-all duration-150"
                      style={{ background: bg, color, fontWeight: weight, border }}>{w}</button>
                  </Squircle>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
