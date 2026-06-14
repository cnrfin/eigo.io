'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import CourseMascot from '@/components/courses/CourseMascot'
import CourseStation from '@/components/courses/CourseStation'
import { startSmartRecording, createMic, type Mic } from '@/lib/smart-recorder'
import { CUE } from '@/lib/sound-cues'

/**
 * Challenge capstone: the learner says each word to walk Teri to the finish.
 * Each attempt advances her regardless of score; the walk is optimistic (she
 * glides while Azure grades in the background). Every recording is kept so that,
 * after the last word, a results breakdown lets the learner replay the model
 * clip next to their own recording with the score and per-sound feedback.
 *
 * The track matches the course map (gradient line + CourseStation markers,
 * active node pulsing) on a plane tilted back so it recedes. Recording
 * auto-stops on silence, with tap-to-stop as a fallback.
 */

type Node = { referenceText: string; displayText?: string; targetLabel?: string; targetSound?: string; targetPhonemeIndex?: number; audioUrl?: string | null; syllables?: string[]; stressIndex?: number; words?: string[]; stressed?: number[]; connected?: boolean }
type Position = { pairs: Node[][] }
type Phoneme = { label: string; score: number }
type Syllable = { label: string; score: number }
type WordScore = { word: string; accuracy: number; errorType: string; phonemes: Phoneme[]; syllables: Syllable[] }
type GradeResult = {
  recognized: string
  score: number
  verdict: 'great' | 'good' | 'retry'
  words: WordScore[]
  target: { index: number; label?: string; score: number; detected?: string } | null
  coaching: { en: string; ja: string } | null
}
type RecState = 'idle' | 'starting' | 'recording' | 'grading'

const C1 = '#00c2b8'
const C2 = '#3ad6a0'
const COLOR = (v?: string) => (v === 'great' ? 'var(--accent)' : v === 'good' ? '#e0982e' : v === 'retry' ? 'var(--danger)' : 'var(--text-muted)')
const phColor = (score: number) => (score >= 80 ? 'var(--accent)' : score >= 60 ? '#e0982e' : 'var(--danger)')
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t)
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t)
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t)
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`
}

export default function ChallengeExercise({
  positions, sentences, accent = 'en-US', mascotSrc = '/rive/teri.riv', lessonId, screenId, token, locale, onFinish,
}: {
  positions: Position[]
  sentences: Node[]
  accent?: 'en-GB' | 'en-US'
  mascotSrc?: string
  lessonId?: string
  screenId?: string
  token?: string
  locale: 'ja' | 'en'
  onFinish: (avgScore: number) => void
}) {
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  // Build the run once: one random minimal pair per position + one random
  // sentence, so each playthrough varies.
  const nodes = useMemo(() => {
    const picked: Node[] = []
    for (const pos of positions) {
      const ps = pos.pairs ?? []
      if (ps.length) picked.push(...ps[Math.floor(Math.random() * ps.length)])
    }
    if (sentences.length) picked.push(sentences[Math.floor(Math.random() * sentences.length)])
    return picked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const n = nodes.length
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const [rec, setRec] = useState<RecState>('idle')
  const [moving, setMoving] = useState(false)
  const [notice, setNotice] = useState(false)
  const [noHeard, setNoHeard] = useState(false) // last take had no speech — prompt a retry
  const [showSummary, setShowSummary] = useState(false)
  const scoresRef = useRef<Record<number, number>>({})
  const [results, setResults] = useState<Record<number, GradeResult>>({})
  const [userUrls, setUserUrls] = useState<Record<number, string>>({})
  const urlsRef = useRef<string[]>([])
  const stopRef = useRef<null | (() => void)>(null)
  const micRef = useRef<Mic | null>(null)

  // Pre-warm the mic on entry so even the first attempt sees a settled signal
  // (a fresh stream's gain control takes a second or two to stabilise).
  useEffect(() => {
    let cancelled = false
    createMic().then((m) => { if (cancelled) m.close(); else micRef.current = m }).catch(() => {})
    return () => {
      cancelled = true
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      micRef.current?.close()
      micRef.current = null
    }
  }, [])

  // Measure each node's on-screen centre (post-3D-transform) for the mascot.
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [centers, setCenters] = useState<{ x: number; y: number }[]>([])
  const measure = useCallback(() => {
    const cont = containerRef.current
    if (!cont) return
    const cr = cont.getBoundingClientRect()
    setCenters(nodeRefs.current.map((el) => {
      if (!el) return { x: 0, y: 0 }
      const r = el.getBoundingClientRect()
      return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 }
    }))
  }, [])
  useLayoutEffect(() => {
    if (showSummary) return
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [measure, n, showSummary])

  const gradeOne = useCallback(async (blob: Blob, node: Node): Promise<GradeResult> => {
    const fd = new FormData()
    fd.append('audio', blob, 'attempt.webm')
    fd.append('referenceText', node.referenceText)
    fd.append('accent', accent)
    if (node.targetLabel) fd.append('targetLabel', node.targetLabel)
    if (node.targetSound) fd.append('targetSound', node.targetSound)
    if (node.targetPhonemeIndex != null) fd.append('targetPhonemeIndex', String(node.targetPhonemeIndex))
    if (node.syllables) fd.append('mode', 'stress')
    else if (node.stressed) { fd.append('mode', 'stress_sentence'); fd.append('stressed', JSON.stringify(node.stressed)) }
    else if (node.connected) fd.append('mode', 'connected')
    if (lessonId) fd.append('lessonId', lessonId)
    if (screenId) fd.append('screenId', screenId)
    const res = await fetch('/api/courses/pronunciation', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: fd })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'grading failed')
    return d as GradeResult
  }, [accent, lessonId, screenId, token])

  const handleStop = useCallback((blob: Blob, hadSpeech: boolean) => {
    const nodeIdx = idxRef.current
    // Silent take (no speech detected): don't advance or grade — keep Teri on
    // this node and ask the learner to try again, so an empty recording can't
    // pass them through with a 0.
    if (!hadSpeech) { setRec('idle'); setNoHeard(true); return }
    const last = nodeIdx >= n - 1
    const url = URL.createObjectURL(blob)
    urlsRef.current[nodeIdx] = url
    setUserUrls((u) => ({ ...u, [nodeIdx]: url }))
    setRec('grading')
    if (!last) {
      setNotice(false)
      setMoving(true)
      const next = nodeIdx + 1
      idxRef.current = next
      setIdx(next)
      window.setTimeout(() => { setMoving(false); setNotice(true); setRec('idle') }, 620)
    }
    gradeOne(blob, nodes[nodeIdx])
      .then((r) => {
        scoresRef.current[nodeIdx] = Math.max(scoresRef.current[nodeIdx] ?? 0, r.score)
        setResults((res) => ({ ...res, [nodeIdx]: r }))
      })
      .catch(() => { /* keep going; the row just shows no score */ })
      .finally(() => { if (last) { setRec('idle'); setNotice(true); setShowSummary(true) } })
  }, [n, nodes, gradeOne])

  const start = useCallback(async () => {
    setRec('starting')
    setNoHeard(false)
    try {
      if (!micRef.current) micRef.current = await createMic()
      stopRef.current = startSmartRecording(micRef.current, handleStop, { onStart: () => setRec('recording') })
    } catch { setRec('idle') }
  }, [handleStop])

  const avgScore = () => {
    const vals = nodes.map((_, i) => scoresRef.current[i]).filter((s): s is number => typeof s === 'number')
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }

  const idxC = Math.min(idx, n - 1)
  const cur = nodes[idxC]
  const nodeX = (i: number) => 8 + 84 * (n > 1 ? i / (n - 1) : 0)

  // ── results breakdown ──────────────────────────────────────
  if (showSummary) {
    return (
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--text)' }}>{t('結果', 'Your results')}</h2>
        <p className="text-center text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {t('お手本と、自分の録音を聞き比べてみましょう。', 'Compare the model with your own recording.')}
        </p>

        <div className="flex flex-col gap-3">
          {nodes.map((node, i) => {
            const res = results[i]
            const uurl = userUrls[i]
            const fw = res?.words?.[0]
            // Decide from the node (reliable), not from what Azure heard.
            const isSentence = (node.referenceText ?? '').trim().includes(' ')
            return (
              <Squircle key={i} asChild cornerRadius={16} cornerSmoothing={0.8}>
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
                    {uurl ? <audio controls src={uurl} className="w-full h-9" /> : <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</p>}
                  </div>
                </div>

                {/* sentence-stress: show which words should carry the beat (target) */}
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
                {/* feedback */}
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
                {/* phoneme strip: each sound in IPA, coloured by score; the target
                    sound is outlined, and shows "→ /x/" if it came out as another sound */}
                {/* stress: a syllable strip — the stressed beat filled, each
                    syllable tinted by how well it was produced (reduction shows here) */}
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
                {res && !isSentence && !node.syllables && fw && fw.phonemes.length > 0 && fw.phonemes.every(p => p.label) && (
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
          })}
        </div>

        <button onClick={() => onFinish(avgScore())}
          className="w-full mt-6 py-3.5 rounded-full font-semibold transition-transform duration-[120ms] ease-out hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {t('完了', 'Finish')}
        </button>
      </div>
    )
  }

  // ── the walk ───────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center pt-2">
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{`${idxC + 1} / ${n}`}</p>
        <p className="text-2xl sm:text-3xl font-bold min-h-9" style={{ color: 'var(--text)' }}>{cur.displayText ?? cur.referenceText}</p>
        {cur.targetSound && CUE[cur.targetSound] && (
          <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {locale === 'ja' ? CUE[cur.targetSound].ja : CUE[cur.targetSound].en}
          </p>
        )}
        {cur.syllables && (
          <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {t('強い拍を、長く大きく。', 'Stretch the strong beat — longer and louder.')}
          </p>
        )}
      </div>

      <div className="flex justify-center mt-5" style={{ minHeight: 56 }}>
        {rec === 'grading' || rec === 'starting' ? (
          <div className="flex items-center gap-2 text-sm self-center" style={{ color: 'var(--text-muted)' }}>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {rec === 'grading' ? t('採点中…', 'Grading…') : t('準備中…', 'Getting ready…')}
          </div>
        ) : rec === 'recording' ? (
          <button onClick={() => stopRef.current?.()} aria-label={t('録音を止める', 'Stop')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold transition-transform active:scale-95"
            style={{ background: 'var(--danger)', color: '#fff', boxShadow: '0 0 0 6px rgba(220,70,70,0.15)' }}>
            <span className="w-3 h-3 rounded-sm bg-white animate-pulse" />
            {t('聞いています…', 'Listening…')}
          </button>
        ) : (
          <button onClick={start}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold transition-transform duration-[120ms] ease-out hover:scale-[1.02] active:scale-95"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-3.1A7 7 0 0019 11h-2z"/></svg>
            {t('話す', 'Speak')}
          </button>
        )}
      </div>

      {noHeard && rec === 'idle' && (
        <p className="text-center text-sm mt-2" style={{ color: 'var(--danger)' }}>
          {t('音声が聞こえませんでした。もう一度話してみてください。', "We didn't hear you — tap Speak and try again.")}
        </p>
      )}

      <div className="flex-1" />

      {/* 3D track */}
      <div ref={containerRef} className="relative w-full" style={{ height: 230 }}>
        <div className="absolute inset-0" style={{ transform: 'perspective(800px) rotateX(58deg)', transformOrigin: '50% 78%' }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="challenge-line" gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="100" y2="50">
                <stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C2} />
              </linearGradient>
            </defs>
            <path d={`M ${nodeX(0)} 50 L ${nodeX(n - 1)} 50`} fill="none" stroke="url(#challenge-line)" strokeWidth={10} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {nodes.map((_, i) => {
            const state = i < idxC ? 3 : i === idxC ? 2 : 1
            const color = lerpColor(C1, C2, n > 1 ? i / (n - 1) : 0)
            const isFinal = i === n - 1
            return (
              <div key={i} ref={(el) => { nodeRefs.current[i] = el }} className="absolute" style={{ left: `${nodeX(i)}%`, top: '50%', transform: 'translate(-50%,-50%)' }}>
                <div className={isFinal ? 'challenge-goal-spin' : undefined}>
                  <CourseStation size={isFinal ? 95 : 78} state={state} color={color} isReview={isFinal} pulseClass="challenge-node-pulse" />
                </div>
              </div>
            )
          })}
        </div>
        {centers[idxC] && (
          <div className="absolute pointer-events-none" style={{
            left: centers[idxC].x, top: centers[idxC].y,
            transform: 'translate(-50%,-94%)',
            transition: moving ? 'left 0.6s ease-in-out, top 0.6s ease-in-out' : 'none',
          }}>
            <CourseMascot size={140} src={mascotSrc} moving={moving} direction={0} notice={notice} />
          </div>
        )}
      </div>
    </div>
  )
}
