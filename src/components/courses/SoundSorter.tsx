'use client'

import { useEffect, useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'

/**
 * Sound sorter (automaticity game): ~10 rounds. Each round a word plays
 * (EARS ONLY, no text) and the learner throws it into the left or right box,
 * the lesson's two sounds. Instant feedback: the box flashes, the word's
 * text appears for a beat, then the next round auto-plays. A streak counter
 * rewards momentum; mistakes never end the game. The end panel shows the
 * score, best streak, a verdict, and replayable missed words.
 *
 * A practice screen (no Check / correct-incorrect banner); the page enables
 * Continue once `onDone` fires. Round order is FIXED in the seed data
 * (balanced, never the same side 3x in a row): do not shuffle here.
 */
type Box = { sound: string; label: string }
type Round = { word: string; sound: string; audioUrl?: string | null }

const FLASH_MS = 950
const NUDGE_MS = 6000 // replay once if a round sits unanswered

export default function SoundSorter({
  left, right, words, locale, onRound, onDone,
}: {
  left: Box
  right: Box
  words: Round[]
  locale: 'ja' | 'en'
  onRound?: (ok: boolean) => void
  onDone: () => void
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const [phase, setPhase] = useState<'idle' | 'live' | 'flash' | 'done'>('idle')
  const [i, setI] = useState(0)
  const [results, setResults] = useState<(boolean | null)[]>(() => words.map(() => null))
  const [lastPick, setLastPick] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const doneFired = useRef(false)

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => { clearTimers(); audioRef.current?.pause() }, [])

  const playWord = (idx: number) => {
    const url = words[idx]?.audioUrl
    if (!url) return
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    a.src = url; a.currentTime = 0
    void a.play().catch(() => {})
  }

  const startRound = (idx: number) => {
    clearTimers()
    setI(idx); setLastPick(null); setPhase('live')
    playWord(idx)
    timers.current.push(setTimeout(() => playWord(idx), NUDGE_MS)) // one gentle nudge
  }

  const start = () => startRound(0)

  const pick = (box: Box) => {
    if (phase !== 'live') return
    clearTimers()
    const ok = words[i].sound === box.sound
    setResults((r) => { const n = [...r]; n[i] = ok; return n })
    setStreak((s) => { const n = ok ? s + 1 : 0; setBest((b) => Math.max(b, n)); return n })
    setLastPick(box.sound)
    onRound?.(ok)
    setPhase('flash')
    timers.current.push(setTimeout(() => {
      if (i + 1 < words.length) startRound(i + 1)
      else { setPhase('done'); if (!doneFired.current) { doneFired.current = true; onDone() } }
    }, FLASH_MS))
  }

  const score = results.filter((r) => r === true).length
  const missed = words.filter((_, k) => results[k] === false)
  const ok = results[i] === true
  const boxLabel = (s: string) => (s === left.sound ? left.label : right.label)

  const verdict = score >= 8
    ? t('耳が育っています。この調子！', 'Your ear has it. Keep going!')
    : score >= 5
      ? t('あと少し。シャドーイングの画面をもう一周してみよう。', 'Getting there. Replay the shadow screens once more.')
      : t('まずは口の形の画面に戻って、もう一度聞いてみよう。', 'Go back to the mechanics screen and listen again.')

  // ── end panel ──
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center text-center py-2">
        <p className="text-5xl font-bold mb-1 tabular-nums" style={{ color: score >= 8 ? 'var(--accent)' : 'var(--text)' }}>
          {score}<span className="text-2xl" style={{ color: 'var(--text-subtle)' }}> / {words.length}</span>
        </p>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          {t(`最長ストリーク ${best}`, `Best streak: ${best}`)}
        </p>
        <p className="text-base font-medium mb-5" style={{ color: 'var(--text)' }}>{verdict}</p>
        {missed.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-subtle)' }}>
              {t('聞き直してみよう', 'Listen again')}
            </p>
            <div className="space-y-1.5">
              {missed.map((w, k) => (
                <div key={k} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--card-inset)' }}>
                  <button onClick={() => { if (!audioRef.current) audioRef.current = new Audio(); const a = audioRef.current; if (w.audioUrl) { a.src = w.audioUrl; a.currentTime = 0; void a.play().catch(() => {}) } }}
                    aria-label={t('再生', 'Play')}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 active:scale-95"
                    style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--edge)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  </button>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{w.word}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{boxLabel(w.sound)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── idle: explain + start ──
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <p className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          {left.label}<span className="mx-2 font-normal" style={{ color: 'var(--text-subtle)' }}>{t('か', 'or')}</span>{right.label}
        </p>
        <p className="text-base max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {t(`単語が${words.length}個、音だけで流れます。聞こえたほうの箱をすばやくタップ。文字は答えたあとに出ます。`,
             `${words.length} words play, sound only. Tap the box you heard, fast. The spelling appears after you answer.`)}
        </p>
        <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
          <button onClick={start}
            className="px-10 py-3.5 font-semibold text-lg transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {t('スタート', 'Start')}
          </button>
        </Squircle>
      </div>
    )
  }

  // ── live / flash ──
  return (
    <div className="flex flex-col items-center">
      {/* progress dots, with the streak badge floated so the dots never shift */}
      <div className="relative flex items-center gap-1.5 mb-6">
        {words.map((_, k) => (
          <span key={k} className="w-2 h-2 rounded-full transition-colors duration-200"
            style={{ background: results[k] === true ? 'var(--accent)' : results[k] === false ? 'var(--danger)' : k === i ? 'var(--text-subtle)' : 'var(--edge)' }} />
        ))}
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums whitespace-nowrap transition-opacity duration-200"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)', opacity: streak >= 2 ? 1 : 0 }}>
          ×{streak}
        </span>
      </div>

      {/* the word: a pulsing dot while listening; the spelling during the flash */}
      <div className="h-16 flex items-center justify-center mb-6">
        {phase === 'flash' ? (
          <span className="text-4xl font-bold" style={{ color: ok ? 'var(--accent)' : 'var(--danger)' }}>
            {words[i].word}
          </span>
        ) : (
          <button onClick={() => playWord(i)} aria-label={t('もう一度聞く', 'Hear it again')}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            style={{ background: 'var(--card-inset)', border: '1px solid var(--edge)', animation: 'scoring-pulse 1.6s ease-in-out infinite' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text-secondary)" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}
      </div>

      {/* bins */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {[left, right].map((bin) => {
          const isPicked = phase === 'flash' && lastPick === bin.sound
          const isAnswer = phase === 'flash' && words[i].sound === bin.sound
          let bg = 'var(--card-inset)', color = 'var(--text)', border = '1.5px solid var(--edge)'
          if (phase === 'flash') {
            if (isAnswer) { bg = 'var(--accent)'; color = '#fff'; border = '1.5px solid transparent' }
            else if (isPicked) { bg = 'var(--danger)'; color = '#fff'; border = '1.5px solid transparent' }
          }
          return (
            <Squircle key={bin.sound} asChild cornerRadius={18} cornerSmoothing={0.8}>
              <button onClick={() => pick(bin)} disabled={phase !== 'live'}
                className="py-8 px-2 font-bold transition-all duration-150 enabled:hover:scale-[1.02] enabled:active:scale-[0.96]"
                style={{ background: bg, color, border, cursor: phase === 'live' ? 'pointer' : 'default' }}>
                <span className="text-2xl leading-none block">{bin.label}</span>
              </button>
            </Squircle>
          )
        })}
      </div>
    </div>
  )
}
