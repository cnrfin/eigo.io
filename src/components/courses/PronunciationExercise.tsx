'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import { startSmartRecording, createMic, type Mic } from '@/lib/smart-recorder'

/**
 * Record-and-grade pronunciation exercise (the "speak" lesson screen).
 *
 * The learner hears the model clip, records themselves, and the recording is
 * graded by Azure via /api/courses/pronunciation. We show an overall score,
 * per-sound bars, a coaching line, and a retry. Continue lives in the player
 * footer (enabled once they've had at least one attempt).
 */

type Phoneme = { label: string; score: number }
type WordScore = { word: string; accuracy: number; errorType: string; phonemes: Phoneme[] }
type GradeResult = {
  recognized: string
  overall: number
  accuracy: number
  fluency: number
  completeness: number
  prosody?: number
  words: WordScore[]
  verdict: 'great' | 'good' | 'retry'
  score: number // the basis we graded on (target phoneme or sentence composite)
  target: { index: number; label?: string; score: number; detected?: string } | null
  coaching: { en: string; ja: string } | null
}

type RecState = 'idle' | 'recording' | 'grading' | 'result' | 'error'

const COLOR = (v: 'great' | 'good' | 'retry') =>
  v === 'great' ? 'var(--accent)' : v === 'good' ? '#e0982e' : 'var(--danger)'

export default function PronunciationExercise({
  referenceText,
  displayText,
  targetLabel,
  targetPhonemeIndex,
  accent = 'en-GB',
  modelAudioUrl,
  phonemeLabels,
  lessonId,
  screenId,
  token,
  locale,
  onAttempted,
}: {
  referenceText: string
  displayText?: string
  targetLabel?: string
  targetPhonemeIndex?: number
  accent?: 'en-GB' | 'en-US'
  modelAudioUrl?: string
  phonemeLabels?: string[]
  lessonId?: string
  screenId?: string
  token?: string
  locale: 'ja' | 'en'
  onAttempted: () => void
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const [state, setState] = useState<RecState>('idle')
  const [result, setResult] = useState<GradeResult | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const stopRef = useRef<null | (() => void)>(null)
  const micRef = useRef<Mic | null>(null)
  const modelRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => { micRef.current?.close() }, [])

  const playModel = useCallback(() => {
    if (!modelAudioUrl) return
    try {
      if (!modelRef.current) modelRef.current = new Audio(modelAudioUrl)
      modelRef.current.currentTime = 0
      void modelRef.current.play()
    } catch { /* ignore */ }
  }, [modelAudioUrl])

  const grade = useCallback(async (blob: Blob) => {
    setState('grading')
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'attempt.webm')
      fd.append('referenceText', referenceText)
      fd.append('accent', accent)
      if (targetLabel) fd.append('targetLabel', targetLabel)
      if (targetPhonemeIndex != null) fd.append('targetPhonemeIndex', String(targetPhonemeIndex))
      if (lessonId) fd.append('lessonId', lessonId)
      if (screenId) fd.append('screenId', screenId)
      const res = await fetch('/api/courses/pronunciation', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'grading failed')
      setResult(data as GradeResult)
      setState('result')
      onAttempted()
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'error')
      setState('error')
      onAttempted() // never trap the learner if grading fails
    }
  }, [referenceText, accent, targetLabel, targetPhonemeIndex, lessonId, screenId, token, onAttempted])

  const startRecording = useCallback(async () => {
    if (state === 'recording' || state === 'grading') return
    setErrMsg('')
    try {
      if (!micRef.current) micRef.current = await createMic()
      // Only show "recording" once capture is truly live (avoids the dead gap
      // where the UI implies the mic is on but it is still starting).
      stopRef.current = startSmartRecording(micRef.current, (blob) => grade(blob), { onStart: () => setState('recording') })
    } catch {
      setErrMsg(t('マイクを使えませんでした。ブラウザの許可を確認してください。', 'Could not access the microphone. Check your browser permission.'))
      setState('error')
    }
  }, [grade, state, t])

  const stopRecording = useCallback(() => { stopRef.current?.() }, [])

  const reset = useCallback(() => { setResult(null); setState('idle'); setErrMsg('') }, [])

  const word = displayText ?? referenceText
  const labels = phonemeLabels && phonemeLabels.length ? phonemeLabels : undefined
  const firstWord = result?.words?.[0]

  return (
    <div className="flex flex-col items-center text-center">
      {/* The word to say + model audio */}
      <p className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>{word}</p>
      {modelAudioUrl && (
        <button onClick={playModel}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-transform duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
          style={{ background: 'var(--card-inset)', color: 'var(--text)', border: '1px solid var(--edge)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>
          {t('お手本を聞く', 'Hear it')}
        </button>
      )}

      {/* Result */}
      {state === 'result' && result && (
        <div className="w-full max-w-sm mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
              style={{ border: `3px solid ${COLOR(result.verdict)}` }}>
              <span className="text-2xl font-bold leading-none" style={{ color: COLOR(result.verdict) }}>{Math.round(result.score)}</span>
              <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-subtle)' }}>/ 100</span>
            </div>
            <p className="text-lg font-bold" style={{ color: COLOR(result.verdict) }}>
              {result.verdict === 'great' ? t('お見事！', 'Great!') : result.verdict === 'good' ? t('いい感じ', 'Good') : t('もう一度', 'Try again')}
            </p>
          </div>

          {/* sentence: one chip per TARGET word, coloured by how it was said.
              Insertions (extra words Azure aligned in) are dropped so the chips
              read as the sentence; omitted words show muted + struck through. */}
          {!result.target && (() => {
            const words = result.words.filter(w => w.errorType !== 'Insertion')
            if (words.length <= 1) return null
            return (
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                {words.map((w, i) => {
                  const omitted = w.errorType === 'Omission'
                  const bad = !omitted && (w.errorType === 'Mispronunciation' || w.accuracy < 60)
                  const near = !omitted && !bad && w.accuracy < 80
                  const color = omitted ? 'var(--text-subtle)' : bad ? 'var(--danger)' : near ? '#e0982e' : 'var(--text)'
                  const border = bad ? 'var(--danger)' : near ? '#e0982e' : 'var(--edge)'
                  return (
                    <span key={i} className="px-2 py-0.5 rounded-md text-sm"
                      style={{ background: 'var(--card-inset)', color, border: `1px solid ${border}`, textDecoration: omitted ? 'line-through' : 'none', opacity: omitted ? 0.6 : 1 }}>
                      {w.word}
                    </span>
                  )
                })}
              </div>
            )
          })()}

          {/* single word: per-sound bars */}
          {result.target && firstWord && firstWord.phonemes.length > 0 && (
            <div className="flex items-end justify-center gap-1.5 mb-4" aria-hidden>
              {firstWord.phonemes.map((p, i) => {
                const isTarget = result.target?.index === i
                return (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ width: 22 }}>
                    <div className="w-full rounded-sm" style={{ height: 40, outline: isTarget ? '1.5px solid var(--text-subtle)' : 'none', outlineOffset: 2, borderRadius: 3 }}>
                      <div className="w-full rounded-sm" style={{
                        height: `${Math.max(8, p.score)}%`, marginTop: `${100 - Math.max(8, p.score)}%`,
                        background: p.score >= 80 ? 'var(--accent)' : p.score >= 60 ? '#e0982e' : 'var(--danger)',
                      }} />
                    </div>
                    {labels && labels[i] && <span className="text-[10px]" style={{ color: isTarget ? 'var(--text)' : 'var(--text-subtle)' }}>{labels[i]}</span>}
                  </div>
                )
              })}
            </div>
          )}

          {result.coaching && (
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ja' ? result.coaching.ja : result.coaching.en}
            </p>
          )}
          {result.verdict !== 'great' && result.recognized && result.recognized.toLowerCase().replace(/[^a-z]/g, '') !== referenceText.toLowerCase().replace(/[^a-z]/g, '') && (
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{t('聞こえたのは', 'We heard')}: “{result.recognized}”</p>
          )}
        </div>
      )}

      {state === 'error' && (
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--danger)' }}>
          {errMsg || t('うまくいきませんでした。もう一度お試しください。', 'Something went wrong. Please try again.')}
        </p>
      )}

      {/* Record / stop / retry control */}
      {state === 'grading' ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {t('採点中…', 'Grading…')}
        </div>
      ) : state === 'recording' ? (
        <button onClick={stopRecording}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-[120ms] active:scale-95"
          style={{ background: 'var(--danger)', boxShadow: '0 0 0 6px rgba(220,70,70,0.18)' }}
          aria-label={t('録音を止める', 'Stop recording')}>
          <span className="w-6 h-6 rounded-sm bg-white" />
        </button>
      ) : (
        <Squircle asChild cornerRadius={999} cornerSmoothing={0.8}>
          <button onClick={state === 'result' || state === 'error' ? reset : startRecording}
            className="inline-flex items-center gap-2 px-6 py-3.5 font-semibold transition-transform duration-[120ms] ease-out hover:scale-[1.02] active:scale-95"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-3.1A7 7 0 0019 11h-2z"/></svg>
            {state === 'result' || state === 'error' ? t('もう一度話す', 'Speak again') : t('話す', 'Speak')}
          </button>
        </Squircle>
      )}
    </div>
  )
}
