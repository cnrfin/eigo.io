'use client'

import { Squircle } from '@squircle-js/react'

/**
 * "Type the joined form" (production-of-form): the full written form is shown
 * (e.g. "want to"); the learner types how it actually sounds when joined
 * ("wanna"). Input is controlled by the player and graded through the normal
 * Check flow against an accepted-answer set (matched after lower-casing and
 * stripping spaces/punctuation). Once `revealed`, each box tints accent/danger
 * and the canonical joined form is shown for any miss.
 */
type Item = { display: string; accepted: string[]; hint?: string; hint_ja?: string }

export const joinNorm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
export const joinItemCorrect = (it: Item, typed: string) => it.accepted.some((a) => joinNorm(a) === joinNorm(typed))

export default function JoinType({
  items, locale, values, onChange, revealed,
}: {
  items: Item[]
  locale: 'ja' | 'en'
  values: Record<number, string>
  onChange: (itemIndex: number, value: string) => void
  revealed: boolean
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  return (
    <div className="space-y-5">
      {items.map((it, i) => {
        const typed = values[i] ?? ''
        const correct = joinItemCorrect(it, typed)
        const hint = locale === 'ja' ? (it.hint_ja ?? it.hint) : it.hint
        let border = '1px solid var(--edge)', color = 'var(--text)'
        if (revealed) { border = `1px solid ${correct ? 'var(--accent)' : 'var(--danger)'}`; color = correct ? 'var(--accent)' : 'var(--danger)' }
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="shrink-0 w-28 sm:w-36 text-right">
              <span className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text)' }}>{it.display}</span>
              {hint && <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
            </div>
            <span className="shrink-0 text-xl" style={{ color: 'var(--text-subtle)' }}>→</span>
            <div className="flex-1">
              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <input
                  value={typed}
                  disabled={revealed}
                  onChange={(e) => onChange(i, e.target.value)}
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                  placeholder={t('話し言葉では…', 'how it sounds…')}
                  className="w-full px-4 py-3 text-lg font-medium outline-none transition-colors duration-150"
                  style={{ background: 'var(--card-inset)', border, color }} />
              </Squircle>
              {revealed && !correct && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold">{t('正解：', 'Answer: ')}</span>{it.accepted[0]}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
