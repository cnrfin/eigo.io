'use client'

import { useMemo, useRef, useState } from 'react'

/**
 * Tap-the-T (perception of the flap / deletion): a sentence rendered word by
 * word, with every letter t (or tt = one tile) tappable. The learner plays the
 * audio, then taps every t that SOFTENS into the fast d. Tapping shrinks the t
 * (softened, not gone). On `revealed`: correctly-tapped t's turn accent + small;
 * missed ones danger + small; wrongly-tapped (hard t) danger + full size; and any
 * t in `deleted` renders ghosted (it vanished entirely, not just softened).
 * Selection is controlled by the player and graded on Check.
 */
type Item = {
  text: string
  tSpots: { word: number; char: number }[]
  answer: number[]            // indices into tSpots that soften
  deleted?: number[]          // subset of answer that fully disappears
  joined?: string; joined_ja?: string
  note?: string; note_ja?: string
  audioUrl?: string | null
}

function ItemRow({
  item, locale, tapped, onToggle, revealed,
}: {
  item: Item; locale: 'ja' | 'en'; tapped: number[]; onToggle: (spotIdx: number) => void; revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  // map "word-char" -> tSpot index, for fast lookup while rendering
  const spotAt = useMemo(() => {
    const m = new Map<string, number>()
    item.tSpots.forEach((s, i) => m.set(`${s.word}-${s.char}`, i))
    return m
  }, [item.tSpots])

  const play = () => {
    if (!item.audioUrl) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = item.audioUrl; a.currentTime = 0
    a.onended = () => setPlaying(false)
    void a.play().catch(() => {})
    setPlaying(true)
  }

  const words = item.text.split(' ')
  const deleted = item.deleted ?? []
  const joined = locale === 'ja' ? (item.joined_ja ?? item.joined) : item.joined
  const note = locale === 'ja' ? (item.note_ja ?? item.note) : item.note

  return (
    <div className="flex items-start gap-3">
      <button onClick={play} aria-label={t('再生', 'Play')}
        className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
        style={{ background: playing ? 'var(--accent)' : 'var(--card-inset)', color: playing ? '#fff' : 'var(--text-secondary)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 text-2xl sm:text-3xl leading-snug" style={{ color: 'var(--text)' }}>
          {words.map((w, wi) => {
            const out: React.ReactNode[] = []
            let ci = 0
            while (ci < w.length) {
              const idx = spotAt.get(`${wi}-${ci}`)
              if (idx !== undefined) {
                const isTT = w[ci + 1]?.toLowerCase() === 't' && !spotAt.has(`${wi}-${ci + 1}`)
                const label = isTT ? w.slice(ci, ci + 2) : w[ci]
                const isTapped = tapped.includes(idx)
                const inAns = item.answer.includes(idx)
                const isDeleted = deleted.includes(idx)
                // keycap affordance: every t sits on a soft pressable pad
                // (answers and distractors look identical — no leak). Tapping
                // shrinks it and turns it accent: "softened" + "selected".
                let color = 'var(--text)', scale = 1, opacity = 1, weight = 600
                let bg = 'var(--card-inset)', border = '1px solid var(--edge)'
                if (!revealed) {
                  if (isTapped) { color = 'var(--accent)'; bg = 'var(--accent-bg)'; border = '1px solid var(--accent)'; scale = 0.72 }
                } else if (inAns && isTapped) { color = 'var(--accent)'; bg = 'var(--accent-bg)'; border = '1px solid var(--accent)'; scale = isDeleted ? 0.9 : 0.72; opacity = isDeleted ? 0.35 : 1; weight = 700 }
                else if (inAns && !isTapped) { color = 'var(--danger)'; bg = 'transparent'; border = '1px dashed var(--danger)'; scale = isDeleted ? 0.9 : 0.72; opacity = isDeleted ? 0.35 : 1; weight = 700 } // missed
                else if (!inAns && isTapped) { color = 'var(--danger)'; bg = 'transparent'; border = '1px solid var(--danger)'; scale = 1; weight = 700 } // wrongly tapped hard t
                else { bg = 'transparent'; border = '1px solid transparent' } // untapped non-answer on reveal: plain text
                out.push(
                  <button key={`${wi}-${ci}`} disabled={revealed} onClick={() => { if (!revealed) onToggle(idx) }}
                    className="inline-block align-baseline transition-all duration-150 origin-bottom rounded-md px-0.5"
                    style={{ color, fontWeight: weight, transform: `scale(${scale})`, opacity, background: bg, border, cursor: revealed ? 'default' : 'pointer' }}>
                    {label}
                  </button>,
                )
                ci += isTT ? 2 : 1
              } else {
                out.push(<span key={`${wi}-${ci}`}>{w[ci]}</span>)
                ci += 1
              }
            }
            return <span key={wi} className="whitespace-nowrap">{out}</span>
          })}
        </div>
        {revealed && (joined || note) && (
          <div className="mt-2">
            {joined && <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>{joined}</p>}
            {note && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TapT({
  items, locale, selections, onToggle, revealed,
}: {
  items: Item[]
  locale: 'ja' | 'en'
  selections: Record<number, number[]>
  onToggle: (itemIndex: number, spotIdx: number) => void
  revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const anyTapped = items.some((_, i) => (selections[i]?.length ?? 0) > 0)
  return (
    <div className="space-y-7">
      {items.map((it, i) => (
        <ItemRow key={i} item={it} locale={locale}
          tapped={selections[i] ?? []} onToggle={(s) => onToggle(i, s)} revealed={revealed} />
      ))}
      {!revealed && !anyTapped && (
        <p className="text-sm pt-1" style={{ color: 'var(--text-muted)' }}>
          {t('やわらかい d に変わる t をタップ。タップすると小さくなります。', 'Tap every t that softens into a fast d. A tapped t shrinks.')}
        </p>
      )}
    </div>
  )
}
