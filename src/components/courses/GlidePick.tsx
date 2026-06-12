'use client'

import { useRef, useState } from 'react'

/**
 * Glide picker (perception): for each two-word phrase the learner hears the
 * join and picks which bridge sound carries it — a Y glide /j/, a W glide /w/,
 * or the linking R /r/.
 *
 * The phrase renders with a small ‿ slot at the join (the same liaison mark
 * link_letters draws): picking a chip docks that letter into the slot, the
 * invisible-consonant metaphor made visible. Chips are compact option pills
 * (the single_choice style) with no rule hints — the rule lives in the concept
 * screen and the post-answer note, so the ear has to do the work here.
 * Selection is controlled by the player and graded on Check. On `revealed` the
 * slot shows the true bridge, a wrong pick turns danger, and the joined
 * reading ("go-wahead") plus a one-line note appear.
 */
type Bridge = 'y' | 'w' | 'r'
type Item = { text: string; answer: Bridge; joined?: string; joined_ja?: string; note?: string; note_ja?: string; audioUrl?: string | null }

const CHOICES: { key: Bridge; glyph: string; sym: string }[] = [
  { key: 'y', glyph: 'Y', sym: '/j/' },
  { key: 'w', glyph: 'W', sym: '/w/' },
  { key: 'r', glyph: 'R', sym: '/r/' },
]

export default function GlidePick({
  items, locale, selections, onSelect, revealed,
}: {
  items: Item[]
  locale: 'ja' | 'en'
  selections: Record<number, Bridge>
  onSelect: (itemIndex: number, bridge: Bridge) => void
  revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<number | null>(null)

  const play = (i: number, url?: string | null) => {
    if (!url) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = url; a.currentTime = 0
    a.onended = () => setPlaying((p) => (p === i ? null : p))
    void a.play().catch(() => {})
    setPlaying(i)
  }

  return (
    <div className="space-y-7">
      {items.map((it, i) => {
        const sel = selections[i]
        const joined = locale === 'ja' ? (it.joined_ja ?? it.joined) : it.joined
        const note = locale === 'ja' ? (it.note_ja ?? it.note) : it.note
        const [w1, ...rest] = it.text.split(' ')
        // what sits in the ‿ slot: the pick while answering, the truth after
        const slot = revealed ? it.answer : sel
        const slotColor = 'var(--accent)'
        return (
          <div key={i}>
            <div className="flex items-center gap-3 mb-2.5">
              <button onClick={() => play(i, it.audioUrl)} aria-label={t('再生', 'Play')}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out hover:scale-110 active:scale-95"
                style={{ background: playing === i ? 'var(--accent)' : 'var(--card-inset)', color: playing === i ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--edge)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              </button>
              <span className="text-2xl sm:text-3xl font-semibold inline-flex items-baseline" style={{ color: 'var(--text)' }}>
                {w1}
                <span className="inline-flex flex-col items-center mx-0.5" style={{ width: '1.1em' }}>
                  <span className="text-[0.75em] font-bold leading-none transition-all duration-150"
                    style={{ color: slotColor, opacity: slot ? 1 : 0, transform: slot ? 'translateY(2px)' : 'translateY(-2px)' }}>
                    {slot ?? 'y'}
                  </span>
                  <span className="leading-none text-[0.8em]" style={{ color: slot ? slotColor : 'var(--text-subtle)', marginTop: '-0.32em' }}>‿</span>
                </span>
                {rest.join(' ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5 pl-12">
              {CHOICES.map(({ key, glyph, sym }) => {
                const isSel = sel === key
                const isAns = it.answer === key
                let bg = 'var(--card-inset)', color = 'var(--text)', border = '1.5px solid var(--edge)'
                if (!revealed) { if (isSel) { bg = 'var(--accent-bg)'; color = 'var(--accent)'; border = '1.5px solid var(--accent)' } }
                else if (isAns) { bg = 'var(--accent)'; color = '#fff'; border = '1.5px solid transparent' }
                else if (isSel) { bg = 'transparent'; color = 'var(--danger)'; border = '1.5px solid var(--danger)' }
                return (
                  <button key={key} disabled={revealed} onClick={() => { if (!revealed) onSelect(i, key) }}
                    className="w-fit px-4 py-2 rounded-xl text-[15px] transition-all duration-[120ms] ease-out enabled:hover:scale-[1.03] enabled:active:scale-95"
                    style={{ background: bg, color, border, cursor: revealed ? 'default' : 'pointer' }}>
                    <span className="font-bold">{glyph}</span>
                    <span className="ml-1.5 opacity-60 text-[13px]">{sym}</span>
                  </button>
                )
              })}
            </div>
            {revealed && (joined || note) && (
              <div className="mt-2.5 pl-12">
                {joined && <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>{joined}</p>}
                {note && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
