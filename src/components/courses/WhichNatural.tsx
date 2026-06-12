'use client'

import { useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'

// Stable, non-positional A/B order: hash the prompt so the natural take isn't
// always slot A, without an impure Math.random at render time.
const hashOdd = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h & 1) === 0 }

/**
 * "Which sounds natural?" (perception): each item plays two takes of the same
 * phrase — one linked and flowing, one said word by word. The two are shown as
 * A / B in a random order (fixed per item) so the answer isn't positional. The
 * learner taps the take that flows. Selection is controlled by the player and
 * graded through the normal Check flow; the component reports whether the pick
 * was the natural take. Once `revealed`, the natural take is marked in accent and
 * a wrong pick in danger.
 */
type Item = { prompt: string; naturalAudioUrl?: string | null; choppyAudioUrl?: string | null }

export default function WhichNatural({
  items, locale, selections, onSelect, revealed,
}: {
  items: Item[]
  locale: 'ja' | 'en'
  selections: Record<number, boolean> // itemIndex -> picked the natural take?
  onSelect: (itemIndex: number, isNatural: boolean) => void
  revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  // A/B order per item (true => slot A is the natural take), stable per prompt.
  const order = items.map((it, i) => hashOdd(it.prompt + i))

  const play = (key: string, url?: string | null) => {
    if (!url) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = url
    a.currentTime = 0
    a.onended = () => setPlaying((p) => (p === key ? null : p))
    void a.play().catch(() => {})
    setPlaying(key)
  }

  return (
    <div className="space-y-7">
      {items.map((it, i) => {
        const aIsNatural = order[i]
        const naturalSlot: 'A' | 'B' = aIsNatural ? 'A' : 'B'
        // picked slot is derived from the controlled selection (did they pick the
        // natural take?) plus this item's A/B order — no separate local state.
        const picked: 'A' | 'B' | undefined = selections[i] === undefined ? undefined : (selections[i] ? naturalSlot : (naturalSlot === 'A' ? 'B' : 'A'))
        const slots: { slot: 'A' | 'B'; url?: string | null; isNatural: boolean }[] = [
          { slot: 'A', url: aIsNatural ? it.naturalAudioUrl : it.choppyAudioUrl, isNatural: aIsNatural },
          { slot: 'B', url: aIsNatural ? it.choppyAudioUrl : it.naturalAudioUrl, isNatural: !aIsNatural },
        ]
        return (
          <div key={i}>
            <p className="text-base sm:text-lg font-semibold mb-3 text-center" style={{ color: 'var(--text)' }}>“{it.prompt}”</p>
            <div className="grid grid-cols-2 gap-3">
              {slots.map(({ slot, url, isNatural }) => {
                const isSel = picked === slot
                const isAns = slot === naturalSlot
                let bg = 'var(--card-inset)', color = 'var(--text)', border = '1px solid var(--edge)'
                if (!revealed) { if (isSel) { bg = 'var(--accent-bg)'; color = 'var(--accent)'; border = '1px solid var(--accent)' } }
                else if (isAns) { bg = 'var(--accent-bg)'; color = 'var(--accent)'; border = '1px solid var(--accent)' }
                else if (isSel) { bg = 'transparent'; color = 'var(--danger)'; border = '1px solid var(--danger)' }
                const key = `${i}-${slot}`
                return (
                  <Squircle key={slot} asChild cornerRadius={14} cornerSmoothing={0.8}>
                    <button
                      disabled={revealed}
                      onClick={() => {
                        if (revealed) return
                        play(key, url)
                        onSelect(i, isNatural)
                      }}
                      className="flex items-center justify-center gap-2.5 py-4 transition-all duration-150"
                      style={{ background: bg, color, border, cursor: revealed ? 'default' : 'pointer' }}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: playing === key ? 'var(--accent)' : 'transparent', border: playing === key ? 'none' : '1.5px solid currentColor', color: playing === key ? '#fff' : 'inherit' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                      </span>
                      <span className="font-semibold">{slot}</span>
                      {revealed && isAns && <span className="text-xs font-semibold">{t('なめらか', 'flows')}</span>}
                    </button>
                  </Squircle>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="text-sm pt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
        {t('なめらかにつながって聞こえるほうをタップ。', 'Tap the take that sounds smooth and linked.')}
      </p>
    </div>
  )
}
