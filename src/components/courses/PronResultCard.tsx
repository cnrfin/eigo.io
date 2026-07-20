'use client'

import { Squircle } from '@squircle-js/react'

/* One pronunciation result card — model vs. your recording, the score, and the
   phonetic/written feedback (sentence-stress words, mispronounced words, the
   syllable strip, the IPA phoneme strip with the target sound outlined, and the
   coaching line). Shared by the in-lesson challenge summary and the funnel
   results screen so they show identical information. */

export type Phoneme = { label: string; score: number }
export type Syllable = { label: string; score: number }
export type WordScore = { word: string; accuracy: number; errorType: string; phonemes: Phoneme[]; syllables: Syllable[] }
export type GradeResult = {
  recognized: string
  score: number
  verdict: 'great' | 'good' | 'retry'
  words: WordScore[]
  target: { index: number; label?: string; score: number; detected?: string } | null
  coaching: { en: string; ja: string } | null
}
export type ResultNode = {
  referenceText: string
  displayText?: string
  audioUrl?: string | null
  syllables?: string[]
  stressIndex?: number
  words?: string[]
  stressed?: number[]
}

const COLOR = (v?: string) => (v === 'great' ? 'var(--accent)' : v === 'good' ? '#e0982e' : v === 'retry' ? 'var(--danger)' : 'var(--text-muted)')
const phColor = (score: number) => (score >= 80 ? 'var(--accent)' : score >= 60 ? '#e0982e' : 'var(--danger)')

export default function PronResultCard({ node, result: res, userAudioUrl, locale }: {
  node: ResultNode
  result?: GradeResult
  userAudioUrl?: string | null
  locale: 'ja' | 'en'
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const fw = res?.words?.[0]
  const isSentence = (node.referenceText ?? '').trim().includes(' ')

  return (
    <Squircle asChild cornerRadius={16} cornerSmoothing={0.8}>
      <div className="block p-4" style={{ background: 'var(--card)', border: '1px solid var(--hairline)' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="font-semibold min-w-0 truncate" style={{ color: 'var(--text)' }}>{node.displayText ?? node.referenceText}</p>
          {res && <span className="text-sm font-bold shrink-0" style={{ color: COLOR(res.verdict) }}>{Math.round(res.score)}/100</span>}
        </div>

        {/* players */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>{t('お手本', 'Model')}</p>
            {node.audioUrl ? <audio controls src={node.audioUrl} className="w-full h-9" /> : <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</p>}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>{t('あなた', 'You')}</p>
            {userAudioUrl ? <audio controls src={userAudioUrl} className="w-full h-9" /> : <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</p>}
          </div>
        </div>

        {/* sentence-stress: which words should carry the beat */}
        {res && node.stressed && node.words && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {node.words.map((w, k) => {
              const on = node.stressed?.includes(k)
              return (
                <Squircle key={k} asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <span className="px-2 py-1 text-sm" style={{ background: on ? 'var(--accent)' : 'var(--card-inset)', color: on ? '#fff' : 'var(--text-secondary)', fontWeight: on ? 700 : 500, border: on ? 'none' : '1px solid var(--edge)' }}>{w}</span>
                </Squircle>
              )
            })}
          </div>
        )}
        {/* per-word feedback (sentences) */}
        {res && isSentence && !node.stressed && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {res.words.filter((w) => w.errorType !== 'Insertion').map((w, k) => {
              const bad = w.errorType === 'Mispronunciation' || w.accuracy < 60
              const near = !bad && w.accuracy < 80
              return (
                <Squircle key={k} asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <span className="px-2 py-0.5 text-sm" style={{ background: 'var(--card-inset)', color: bad ? 'var(--danger)' : near ? '#e0982e' : 'var(--text)', border: `1px solid ${bad ? 'var(--danger)' : near ? '#e0982e' : 'var(--edge)'}` }}>{w.word}</span>
                </Squircle>
              )
            })}
          </div>
        )}
        {/* syllable strip (word-stress drills) */}
        {res && node.syllables && node.syllables.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {node.syllables.map((syl, k) => {
              const sc = fw?.syllables?.[k]?.score
              const isStress = node.stressIndex === k
              return (
                <Squircle key={k} asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <span className="px-2.5 py-1 text-sm" style={{
                    background: isStress ? COLOR(res.verdict) : 'var(--card-inset)',
                    color: isStress ? '#fff' : (sc != null ? phColor(sc) : 'var(--text)'),
                    fontWeight: isStress ? 700 : 500,
                    border: isStress ? 'none' : '1px solid var(--edge)',
                  }}>{syl}</span>
                </Squircle>
              )
            })}
          </div>
        )}
        {/* IPA phoneme strip (word drills) — target sound outlined, shows "→ /x/" if substituted */}
        {res && !isSentence && !node.syllables && fw && fw.phonemes.length > 0 && fw.phonemes.every((p) => p.label) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {fw.phonemes.map((p, k) => {
              const isTarget = res.target?.index === k
              if (isTarget) {
                const sub = res.target?.detected
                return (
                  <Squircle key={k} asChild cornerRadius={8} cornerSmoothing={0.8}>
                    <span className="px-2 py-1 text-sm font-bold" style={{ background: COLOR(res.verdict), color: '#fff' }}>
                      /{p.label}/{sub ? ` → /${sub}/` : ''}
                    </span>
                  </Squircle>
                )
              }
              return (
                <Squircle key={k} asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <span className="px-2 py-1 text-sm font-medium" style={{ background: 'var(--card-inset)', color: phColor(p.score), border: '1px solid var(--edge)' }}>
                    /{p.label}/
                  </span>
                </Squircle>
              )
            })}
          </div>
        )}
        {res?.coaching && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{locale === 'ja' ? res.coaching.ja : res.coaching.en}</p>
        )}
      </div>
    </Squircle>
  )
}
