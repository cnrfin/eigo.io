'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { Squircle } from '@squircle-js/react'
import { useRiveFile } from '@rive-app/react-webgl2'
import MascotCelebrate from '@/components/courses/MascotCelebrate'
import PronunciationExercise from '@/components/courses/PronunciationExercise'
import ChallengeExercise from '@/components/courses/ChallengeExercise'
import HvptPlayer from '@/components/courses/HvptPlayer'
import ShadowGrid from '@/components/courses/ShadowGrid'
import StressPick from '@/components/courses/StressPick'
import SentenceStress from '@/components/courses/SentenceStress'
import LinkPairs from '@/components/courses/LinkPairs'
import WhichNatural from '@/components/courses/WhichNatural'
import JoinType, { joinItemCorrect } from '@/components/courses/JoinType'
import GlidePick from '@/components/courses/GlidePick'
import TapT from '@/components/courses/TapT'
import LinkLetters, { linkLettersCorrect } from '@/components/courses/LinkLetters'
import SoundSorter from '@/components/courses/SoundSorter'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

// Render inline *emphasis* (single asterisks around example words/phrases, used
// throughout the English content) as bold. Splits on *...* and bolds the inner
// text; plain segments pass through unchanged (parent keeps whitespace-pre-line).
function rich(text: string) {
  return String(text ?? '').split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.length > 2 && part.startsWith('*') && part.endsWith('*')
      ? <strong key={i} className="font-semibold" style={{ color: 'var(--text)' }}>{part.slice(1, -1)}</strong>
      : part,
  )
}

/**
 * Lesson player — Brilliant-style: one screen at a time, progress bar on
 * top, instant feedback with 解説 on question screens, X to exit (progress
 * is saved on every advance, so leaving is always safe).
 */
export default function LessonPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const { locale, toggleLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  const [data, setData] = useState<Any>(null)
  const [idx, setIdx] = useState(0)
  const [maxIdx, setMaxIdx] = useState(0) // furthest screen reached — segments up to here are navigable
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  // Draft state for the CURRENT unanswered question…
  const [picked, setPicked] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [placed, setPlaced] = useState<(string | null)[]>([]) // drag_fill blanks
  const [stressSel, setStressSel] = useState<Record<number, number>>({}) // stress_pick: word index -> chosen syllable
  const [sentSel, setSentSel] = useState<Record<number, number[]>>({}) // sentence_stress: sentence index -> chosen word indices
  const [linkSel, setLinkSel] = useState<Record<number, number[]>>({}) // link_pairs: item index -> chosen gap indices
  const [whichSel, setWhichSel] = useState<Record<number, boolean>>({}) // which_natural: item index -> picked the natural take?
  const [joinTyped, setJoinTyped] = useState<Record<number, string>>({}) // join_type: item index -> typed reduced form
  const [glideSel, setGlideSel] = useState<Record<number, 'y' | 'w' | 'r'>>({}) // glide_pick: item index -> chosen bridge
  const [tapTSel, setTapTSel] = useState<Record<number, number[]>>({}) // tap_t: item index -> tapped t-spot indices
  const [linkLetSel, setLinkLetSel] = useState<Record<number, { from: [number, number]; to: [number, number] }[]>>({}) // link_letters: item index -> made links
  // …and a per-screen memory of submitted answers, so navigating back shows
  // the previous result instead of resetting the screen.
  const [answers, setAnswers] = useState<Record<string, { picked: number | null; typed: string; placed?: (string | null)[]; correct: boolean }>>({})
  const [explainOpen, setExplainOpen] = useState(false)
  // Speak (record+grade) screens aren't pass/fail; we just track that the
  // learner has had at least one attempt so Continue can unlock.
  const [spoken, setSpoken] = useState<Record<string, boolean>>({})
  const [lessonScore, setLessonScore] = useState<number | null>(null) // challenge result, shown on finish
  const [sorterDone, setSorterDone] = useState<Record<string, boolean>>({}) // sound_sorter: screen id -> game finished (gates Continue)
  const loadedRef = useRef(false)
  // Preload the celebration rig during the lesson so it's ready (file + runtime
  // warm) the instant the complete screen appears — no missed dance frames.
  // Earl on IELTS lessons, Teri elsewhere (matches the course-map mascot).
  const celebrateSrc = data?.lesson?.slug?.startsWith('ielts') ? '/rive/earl-complete.riv' : '/rive/teri-complete.riv'
  const { riveFile: celebrateFile } = useRiveFile({ src: celebrateSrc })

  // UI sounds (public/sounds/*.mp3) — preloaded and decoded into Web Audio
  // buffers on mount, so playback is instant (HTMLAudio adds noticeable lag).
  const audioCtxRef = useRef<AudioContext | null>(null)
  const soundBuffersRef = useRef<Record<string, AudioBuffer>>({})
  useEffect(() => {
    const Ctx = window.AudioContext ?? (window as Any).webkitAudioContext
    if (!Ctx) return
    const ctx: AudioContext = new Ctx()
    audioCtxRef.current = ctx
    for (const name of ['wrong', 'correct', 'click', 'select', 'lesson-finish']) {
      fetch(`/sounds/${name}.mp3`)
        .then(r => r.arrayBuffer())
        .then(b => ctx.decodeAudioData(b))
        .then(buf => { soundBuffersRef.current[name] = buf })
        .catch(() => {})
    }
    return () => { void ctx.close().catch(() => {}) }
  }, [])
  const play = useCallback((name: 'wrong' | 'correct' | 'click' | 'select' | 'lesson-finish') => {
    try {
      const ctx = audioCtxRef.current
      const buf = soundBuffersRef.current[name]
      if (!ctx || !buf) return
      // Autoplay policy: the context unsuspends inside this user-gesture handler
      if (ctx.state === 'suspended') void ctx.resume()
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start()
    } catch { /* no sound is never an error */ }
  }, [])

  useEffect(() => {
    if (!session?.access_token || loadedRef.current) return
    loadedRef.current = true
    fetch(`/api/courses/lessons/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async r => {
        const d = await r.json()
        if (r.status === 402) { router.push('/plans'); throw new Error('paywalled') }
        if (!r.ok) throw new Error(d.error)
        return d
      })
      .then(d => {
        setData(d)
        // resume where they left off (never past the last screen)
        const resume = Math.min(d.progress?.screen_index ?? 0, Math.max(0, (d.screens?.length ?? 1) - 1))
        const start = d.progress?.status === 'completed' ? 0 : resume
        setIdx(start)
        setMaxIdx(d.progress?.status === 'completed' ? Math.max(0, (d.screens?.length ?? 1) - 1) : resume)
      })
      .catch(e => { if (e.message !== 'paywalled') setError(t('レッスンを読み込めませんでした', 'Could not load this lesson')) })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, id])

  const saveProgress = useCallback((screenIndex: number, completed = false, score?: number) => {
    if (!session?.access_token) return
    fetch(`/api/courses/lessons/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ screenIndex, completed, ...(score != null ? { score } : {}) }),
      keepalive: true,
    }).catch(() => {})
  }, [session?.access_token, id])

  const screens = data?.screens ?? []
  const screen = screens[idx]
  const isQuestion = screen?.type === 'question'
  const c = screen?.content ?? {}
  const isSpeak = isQuestion && c.question_type === 'speak'
  const isShadow = isQuestion && c.question_type === 'shadow'
  const isChallenge = isQuestion && c.question_type === 'challenge'
  const isSorter = isQuestion && c.question_type === 'sound_sorter'
  // Practice screens (speak/shadow/challenge/sorter) skip the Check + correct/incorrect flow.
  const isPractice = isSpeak || isShadow || isChallenge || isSorter
  // Saved answer for this screen (set once submitted; survives back/forward)
  const saved = screen ? answers[screen.id] : undefined
  const answered: boolean | null = saved ? saved.correct : null
  const shownPicked = saved ? saved.picked : picked
  const shownTyped = saved ? saved.typed : typed

  // ── drag_fill: text with ___ blanks + a chip bank ──
  const dragSegments: string[] = c.question_type === 'drag_fill' ? String(c.text ?? '').split('___') : []
  const blankCount = Math.max(0, dragSegments.length - 1)
  const shownPlaced = saved?.placed ?? placed
  useEffect(() => {
    // (re)initialise the blanks whenever a drag_fill screen becomes current
    if (screen?.content?.question_type === 'drag_fill' && !answers[screen.id]) {
      setPlaced(Array(Math.max(0, String(screen.content.text ?? '').split('___').length - 1)).fill(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen?.id])

  const placeChip = (chip: string, blankIdx?: number) => {
    if (!screen || answered !== null) return
    const target = blankIdx ?? placed.findIndex(p => p === null)
    if (target === -1 || target >= blankCount) return
    play('select')
    setPlaced(prev => {
      const nextArr = [...prev]
      // a chip can only live in one blank at a time
      const existing = nextArr.indexOf(chip)
      if (existing !== -1) nextArr[existing] = null
      nextArr[target] = chip
      return nextArr
    })
  }
  const removeChipAt = (blankIdx: number) => {
    if (answered !== null) return
    play('select')
    setPlaced(prev => { const nextArr = [...prev]; nextArr[blankIdx] = null; return nextArr })
  }

  const checkGap = () => {
    const accepted: string[] = c.accepted ?? []
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    return accepted.some(a => norm(a) === norm(typed))
  }

  // Selecting never grades — the Check button does (Brilliant-style).
  const selectOption = (optIdx: number) => {
    if (!screen || answered !== null) return
    play('select')
    setPicked(optIdx)
  }

  const check = () => {
    if (!screen || answered !== null) return
    let correct: boolean
    if (c.question_type === 'gap_fill') {
      if (!typed.trim()) return
      correct = checkGap()
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed, correct } }))
    } else if (c.question_type === 'drag_fill') {
      if (placed.some(p => p === null)) return
      const answer: string[] = c.answer ?? []
      correct = placed.every((p, i) => p === answer[i])
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', placed: [...placed], correct } }))
    } else if (c.question_type === 'stress_pick') {
      const wlist: { stressIndex: number }[] = c.words ?? []
      if (!wlist.every((_, i) => stressSel[i] != null)) return
      correct = wlist.every((w, i) => stressSel[i] === w.stressIndex)
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'sentence_stress') {
      const slist: { stressed: number[] }[] = c.sentences ?? []
      if (!slist.every((_, i) => (sentSel[i]?.length ?? 0) > 0)) return
      const same = (a: number[], b: number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, k) => v === [...b].sort((x, y) => x - y)[k])
      correct = slist.every((s, i) => same(sentSel[i] ?? [], s.stressed))
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'link_pairs') {
      const ilist: { links: number[] }[] = c.items ?? []
      const same = (a: number[], b: number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, k) => v === [...b].sort((x, y) => x - y)[k])
      correct = ilist.every((it, i) => same(linkSel[i] ?? [], it.links))
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'which_natural') {
      const ilist: unknown[] = c.items ?? []
      if (!ilist.every((_, i) => whichSel[i] != null)) return
      correct = ilist.every((_, i) => whichSel[i] === true)
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'join_type') {
      const ilist: { accepted: string[] }[] = c.items ?? []
      if (!ilist.every((_, i) => (joinTyped[i] ?? '').trim())) return
      correct = ilist.every((it, i) => joinItemCorrect(it, joinTyped[i] ?? ''))
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'glide_pick') {
      const ilist: { answer: string }[] = c.items ?? []
      if (!ilist.every((_, i) => glideSel[i] != null)) return
      correct = ilist.every((it, i) => glideSel[i] === it.answer)
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'tap_t') {
      const ilist: { answer: number[] }[] = c.items ?? []
      if (!ilist.every((_, i) => (tapTSel[i]?.length ?? 0) > 0)) return
      const same = (a: number[], b: number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, k) => v === [...b].sort((x, y) => x - y)[k])
      correct = ilist.every((it, i) => same(tapTSel[i] ?? [], it.answer))
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else if (c.question_type === 'link_letters') {
      const ilist = (c.items ?? []) as Parameters<typeof linkLettersCorrect>[0][]
      if (!ilist.every((_, i) => (linkLetSel[i]?.length ?? 0) > 0)) return
      correct = ilist.every((it, i) => linkLettersCorrect(it, linkLetSel[i] ?? []))
      setAnswers(a => ({ ...a, [screen.id]: { picked: null, typed: '', correct } }))
    } else {
      if (picked === null) return
      correct = !!c.options?.[picked]?.is_correct
      setAnswers(a => ({ ...a, [screen.id]: { picked, typed: '', correct } }))
    }
    play(correct ? 'correct' : 'wrong')
  }

  const next = () => {
    const nextIdx = idx + 1
    setPicked(null); setTyped(''); setExplainOpen(false); setStressSel({}); setSentSel({}); setLinkSel({}); setWhichSel({}); setJoinTyped({}); setGlideSel({}); setTapTSel({}); setLinkLetSel({})
    if (nextIdx >= screens.length) {
      play('lesson-finish')
      setFinished(true)
      saveProgress(idx, true)
    } else {
      play('click')
      setIdx(nextIdx)
      setMaxIdx(m => Math.max(m, nextIdx))
      saveProgress(nextIdx)
    }
  }

  // Jump to any previously-visited screen via the segmented bar
  const goTo = (target: number) => {
    if (target === idx && !finished) return
    if (target > maxIdx) return
    play('click')
    setPicked(null); setTyped(''); setExplainOpen(false); setFinished(false); setStressSel({}); setSentSel({}); setLinkSel({}); setWhichSel({}); setJoinTyped({}); setGlideSel({}); setTapTSel({}); setLinkLetSel({})
    setIdx(target)
  }

  const exit = () => {
    saveProgress(idx, finished)
    router.push(`/dashboard/courses/${data?.course?.course?.slug ?? ''}`)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--dash-bg)' }}>
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--dash-bg)' }}>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--text-muted)' }}>{t('戻る', 'Go back')}</button>
      </div>
    )
  }


  return (
    // z-50 matches the dashboard top bar; as the later sibling at equal z the
    // player covers it (the lesson is fullscreen, X + progress is its own bar).
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--dash-bg)' }}>
      {/* ── Top bar: X + progress ── */}
      <div className="flex items-center gap-4 px-4 py-3 shrink-0">
        <button onClick={exit} aria-label={t('レッスンを終了', 'Exit the lesson')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        {/* Segmented progress — the active segment expands; any visited
            segment is clickable, so navigation never depends on the footer.
            Kept narrow and centered so it reads as a stepper, not a bar. */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 w-full max-w-xs">
          {screens.map((s: Any, i: number) => {
            const isCurrent = !finished && i === idx
            const visited = i <= maxIdx
            return (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                disabled={!visited}
                aria-label={t(`スライド${i + 1}へ`, `Go to screen ${i + 1}`)}
                className="h-2 rounded-full transition-all duration-300 ease-out disabled:cursor-default"
                style={{
                  flex: isCurrent ? 3 : 1,
                  // visited = accent (dimmed when not current); not yet reached =
                  // secondary grey so the remaining steps are always visible
                  background: finished || visited ? 'var(--accent)' : 'var(--inset)',
                  opacity: finished || isCurrent ? 1 : visited ? 0.45 : 1,
                }}
              />
            )
          })}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={toggleLocale} aria-label="Toggle language"
            className="h-8 px-2.5 rounded-full flex items-center justify-center text-xs font-medium tracking-wide transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            {locale === 'ja' ? 'EN' : 'JA'}
          </button>
          <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            {/* static sun/moon, matching the dashboard header (no Rive light artboard) */}
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="24" cy="24" r="10.5" />
                <path d="M24 3v4.5M24 40.5V45M3 24h4.5M40.5 24H45M9 9l3 3M36 36l3 3M9 39l3-3M36 12l3-3" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path transform="matrix(0.232019 -0.232019 0.232019 0.232019 19.7812 19.7812)" strokeWidth="10" d="M0 18.1827C56 18.1828 56 -30.9279 56 0C56 30.9279 30.9279 56 0 56C-30.9279 56 -56 30.9279 -56 0C-56 -30.9279 -54.466 19.7168 0 18.1827Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Screen ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 min-h-full flex flex-col">
          <AnimatePresence mode="wait">
            {finished ? (
              <motion.div key="done" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center my-auto">
                <div className="mx-auto -mb-1 flex items-center justify-center" style={{ width: 180, height: 180 }}>
                  <MascotCelebrate size={180} src={celebrateSrc} file={celebrateFile} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{data.lesson.slug?.endsWith('-review') ? t('レベル完了！', 'Level complete!') : t('レッスン完了！', 'Lesson complete!')}</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? data.lesson.title_ja : data.lesson.title}
                </p>
                {lessonScore != null && (
                  <div className="mt-4 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--card-inset)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('発音スコア', 'Pronunciation')}</span>
                      <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{lessonScore}/100</span>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex justify-center">
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <button onClick={exit} className="px-8 py-3 font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
                      style={{ background: 'var(--accent)', color: '#fff' }}>
                      {t('コースに戻る', 'Back to the course')}
                    </button>
                  </Squircle>
                </div>
              </motion.div>
            ) : screen && (
              <motion.div key={screen.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }} className={`py-8 ${isChallenge ? 'flex-1 flex flex-col' : ''}`}>
                {/* image / audio stimulus */}
                {screen.image?.url && <img src={screen.image.url} alt="" className="rounded-xl w-full h-auto mb-6" />}
                {/* speak screens have their own "Hear it" button for the model clip,
                    so skip the generic player there; listening questions keep it. */}
                {screen.audio?.url && !isSpeak && <audio controls src={screen.audio.url} className="w-full mb-6" />}

                {!isQuestion ? (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--text)' }}>
                      {locale === 'ja' ? c.title_ja : (c.title ?? c.title_ja)}
                    </h2>
                    {String(locale === 'ja' ? c.body_ja : (c.body ?? c.body_ja) ?? '').split('\n\n').map((p: string, i: number) => (
                      <p key={i} className="text-[17px] leading-[1.85] mb-5 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{rich(p)}</p>
                    ))}
                    {c.example && (
                      <div className="mt-2 p-4 rounded-xl text-[17px] leading-[1.85] whitespace-pre-line"
                        style={{ background: 'var(--card-inset)', color: 'var(--text)' }}>
                        {rich(c.example)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {c.prompt_ja && <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{c.prompt_ja}</p>}
                    <h2 className="text-lg sm:text-xl font-semibold mb-6 whitespace-pre-line" style={{ color: 'var(--text)' }}>{c.prompt}</h2>

                    {/* HVPT discrimination: a Listen control that rotates voices */}
                    {Array.isArray(c.voiceUrls) && c.voiceUrls.length > 0 && (
                      <div className="mb-6 -mt-2"><HvptPlayer urls={c.voiceUrls} locale={locale} /></div>
                    )}

                    {c.question_type === 'challenge' ? (
                      <ChallengeExercise
                        positions={c.positions ?? []}
                        sentences={c.sentences ?? []}
                        accent={c.accent === 'en-US' ? 'en-US' : 'en-GB'}
                        mascotSrc={data?.lesson?.slug?.startsWith('ielts') ? '/rive/earl.riv' : '/rive/teri.riv'}
                        lessonId={data?.lesson?.id}
                        screenId={screen.id}
                        token={session?.access_token}
                        locale={locale}
                        onFinish={(avg) => { setLessonScore(avg); play('lesson-finish'); setFinished(true); saveProgress(idx, true, avg) }}
                      />
                    ) : c.question_type === 'sound_sorter' ? (
                      <SoundSorter
                        key={screen.id}
                        left={c.left}
                        right={c.right}
                        words={c.words ?? []}
                        locale={locale}
                        onRound={(ok: boolean) => play(ok ? 'correct' : 'wrong')}
                        onDone={() => setSorterDone(d => ({ ...d, [screen.id]: true }))}
                      />
                    ) : c.question_type === 'shadow' ? (
                      Array.isArray(c.words) && c.words.length > 0 ? (
                        <ShadowGrid words={c.words} sounds={c.sounds} locale={locale} />
                      ) : (
                        <div className="flex flex-col items-center text-center py-4">
                          <p className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>{c.displayText ?? c.text ?? ''}</p>
                          <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                            {t('音声を聞いて、同じように声に出してまねしてみよう。', 'Listen, then say it out loud the same way.')}
                          </p>
                        </div>
                      )
                    ) : c.question_type === 'stress_pick' ? (
                      <StressPick
                        words={c.words}
                        locale={locale}
                        selections={stressSel}
                        onSelect={(i, k) => { if (answered === null) { play('select'); setStressSel(s => ({ ...s, [i]: k })) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'sentence_stress' ? (
                      <SentenceStress
                        sentences={c.sentences}
                        locale={locale}
                        selections={sentSel}
                        onToggle={(si, wi) => { if (answered === null) { play('select'); setSentSel(s => { const cur = s[si] ?? []; return { ...s, [si]: cur.includes(wi) ? cur.filter(x => x !== wi) : [...cur, wi] } }) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'link_pairs' ? (
                      <LinkPairs
                        items={c.items}
                        locale={locale}
                        selections={linkSel}
                        onToggle={(i, g) => { if (answered === null) { play('select'); setLinkSel(s => { const cur = s[i] ?? []; return { ...s, [i]: cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g] } }) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'which_natural' ? (
                      <WhichNatural
                        items={c.items}
                        locale={locale}
                        selections={whichSel}
                        onSelect={(i, isNat) => { if (answered === null) { play('select'); setWhichSel(s => ({ ...s, [i]: isNat })) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'join_type' ? (
                      <JoinType
                        items={c.items}
                        locale={locale}
                        values={joinTyped}
                        onChange={(i, v) => { if (answered === null) setJoinTyped(s => ({ ...s, [i]: v })) }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'glide_pick' ? (
                      <GlidePick
                        items={c.items}
                        locale={locale}
                        selections={glideSel}
                        onSelect={(i, b) => { if (answered === null) { play('select'); setGlideSel(s => ({ ...s, [i]: b })) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'tap_t' ? (
                      <TapT
                        items={c.items}
                        locale={locale}
                        selections={tapTSel}
                        onToggle={(i, sp) => { if (answered === null) { play('select'); setTapTSel(s => { const cur = s[i] ?? []; return { ...s, [i]: cur.includes(sp) ? cur.filter(x => x !== sp) : [...cur, sp] } }) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'link_letters' ? (
                      <LinkLetters
                        items={c.items}
                        locale={locale}
                        selections={linkLetSel}
                        onChange={(i, links) => { if (answered === null) { play('select'); setLinkLetSel(s => ({ ...s, [i]: links })) } }}
                        revealed={answered !== null}
                      />
                    ) : c.question_type === 'speak' ? (
                      <PronunciationExercise
                        referenceText={c.referenceText ?? c.text ?? ''}
                        displayText={c.displayText}
                        targetLabel={c.targetLabel}
                        targetPhonemeIndex={c.targetPhonemeIndex}
                        accent={c.accent === 'en-US' ? 'en-US' : 'en-GB'}
                        modelAudioUrl={screen.audio?.url}
                        phonemeLabels={c.phonemeLabels}
                        lessonId={data?.lesson?.id}
                        screenId={screen.id}
                        token={session?.access_token}
                        locale={locale}
                        onAttempted={() => setSpoken(s => ({ ...s, [screen.id]: true }))}
                      />
                    ) : c.question_type === 'drag_fill' ? (
                      <>
                        {/* text with drop-target blanks */}
                        <div className="text-[16px] leading-loose" style={{ color: 'var(--text)' }}>
                          {dragSegments.map((seg: string, i: number) => (
                            <span key={i}>
                              <span className="whitespace-pre-line">{seg}</span>
                              {i < blankCount && (
                                shownPlaced[i] !== null && answered === null ? (
                                  // A placed chip: draggable — drag it OUT to remove, onto
                                  // another blank to move it, or just tap to remove.
                                  <motion.button
                                    key={`${i}-${shownPlaced[i]}`}
                                    data-blank-idx={i}
                                    drag
                                    dragSnapToOrigin
                                    dragMomentum={false}
                                    whileDrag={{ scale: 1.08, zIndex: 50 }}
                                    onDragEnd={(e: Any, info: Any) => {
                                      // elementsFromPoint (plural): the dragged chip itself sits
                                      // under the pointer, so we look THROUGH it for a blank
                                      const self = e?.target instanceof Element ? e.target.closest('[data-blank-idx]') : null
                                      const els = document.elementsFromPoint(info.point.x - window.scrollX, info.point.y - window.scrollY)
                                      const blank = els.map(el => el.closest?.('[data-blank-idx]')).find(b => b && b !== self) as HTMLElement | null
                                      const target = blank ? Number(blank.dataset.blankIdx) : null
                                      if (target === null) removeChipAt(i)
                                      else if (target !== i) placeChip(shownPlaced[i] as string, target)
                                    }}
                                    onTap={() => removeChipAt(i)}
                                    aria-label={t('ドラッグまたはタップで取り外す', 'Drag out or tap to remove')}
                                    className="inline-flex items-center align-baseline mx-1 px-3 py-1 rounded-lg text-[15px] font-medium min-w-20 justify-center cursor-grab active:cursor-grabbing"
                                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px dashed transparent', touchAction: 'none' }}>
                                    {shownPlaced[i]}
                                  </motion.button>
                                ) : (
                                  // Empty blank (drop target) — or the graded result
                                  <span
                                    data-blank-idx={i}
                                    className="inline-flex items-center align-baseline mx-1 px-3 py-1 rounded-lg text-[15px] font-medium min-w-20 justify-center transition-all duration-[120ms]"
                                    style={{
                                      background: answered !== null
                                        ? (shownPlaced[i] === (c.answer ?? [])[i] ? 'var(--accent)' : 'var(--danger)')
                                        : 'var(--card-inset)',
                                      color: answered !== null ? '#fff' : 'var(--text-subtle)',
                                      border: '1px dashed ' + (answered !== null ? 'transparent' : 'var(--edge)'),
                                    }}>
                                    {shownPlaced[i] ?? '・・・'}
                                  </span>
                                )
                              )}
                            </span>
                          ))}
                        </div>
                        {/* chip bank — drag onto a blank, or tap to fill the next empty one */}
                        {answered === null && (
                          <div className="flex flex-wrap gap-2.5 mt-6">
                            {(c.chips ?? []).filter((chip: string) => !shownPlaced.includes(chip)).map((chip: string) => (
                              <motion.button
                                key={chip}
                                drag
                                dragSnapToOrigin
                                dragMomentum={false}
                                whileDrag={{ scale: 1.08, zIndex: 50 }}
                                onDragEnd={(e: Any, info: Any) => {
                                  // look through the dragged chip for the blank beneath it
                                  const self = e?.target instanceof Element ? e.target : null
                                  const els = document.elementsFromPoint(info.point.x - window.scrollX, info.point.y - window.scrollY)
                                  const blank = els.filter(el => !self || !self.contains(el) && el !== self)
                                    .map(el => el.closest?.('[data-blank-idx]')).find(Boolean) as HTMLElement | null
                                  if (blank) placeChip(chip, Number(blank.dataset.blankIdx))
                                }}
                                // onTap (not onClick): framer suppresses clicks after drags,
                                // and micro-drags from finger jitter were eating plain taps
                                onTap={() => placeChip(chip)}
                                className="w-fit max-w-full px-4 py-2 rounded-xl text-[15px] cursor-grab active:cursor-grabbing"
                                style={{ background: 'var(--card-inset)', color: 'var(--text)', border: '1px solid var(--edge)', touchAction: 'none' }}>
                                {chip}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : c.question_type === 'gap_fill' ? (
                      <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                        <input
                          value={shownTyped}
                          onChange={e => setTyped(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') check() }}
                          disabled={answered !== null}
                          placeholder={t('答えを入力', 'Type your answer')}
                          className="w-full px-4 py-3 text-[15px] outline-none"
                          style={{ background: 'var(--card-inset)', color: 'var(--text)', border: '1px solid var(--edge)' }}
                        />
                      </Squircle>
                    ) : (
                      // Horizontal chips sized to their content (Brilliant-style) —
                      // selecting highlights; grading waits for the Check button.
                      <div className="flex flex-wrap gap-2.5">
                        {(c.options ?? []).map((o: Any, i: number) => {
                          const isPicked = shownPicked === i
                          const showCorrect = answered !== null && o.is_correct
                          const showWrong = answered !== null && isPicked && !o.is_correct
                          return (
                            <Squircle key={i} asChild cornerRadius={12} cornerSmoothing={0.8}>
                              <button onClick={() => selectOption(i)} disabled={answered !== null}
                                className="text-left w-fit max-w-full px-4 py-2.5 text-[15px] transition-all duration-[120ms] ease-out enabled:hover:scale-[1.02] enabled:active:scale-[0.97]"
                                style={{
                                  background: showCorrect ? 'var(--accent)' : showWrong ? 'var(--danger)' : 'var(--card-inset)',
                                  color: showCorrect || showWrong ? '#fff' : 'var(--text)',
                                  border: '1.5px solid ' + (isPicked && answered === null ? 'var(--accent)' : showCorrect || showWrong ? 'transparent' : 'var(--edge)'),
                                }}>
                                {/* subtle letter label — the 解説 refers to options as (A)(B)(C) */}
                                {o.label ? <span className="font-semibold mr-1.5 opacity-50">{o.label}</span> : null}
                                {o.content}
                              </button>
                            </Squircle>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer: back + check/continue — or the result banner over it.
          The challenge drives its own flow (walk + auto-advance), so no footer. ── */}
      {!finished && screen && !isChallenge && (
        <div className="shrink-0 relative overflow-hidden">
          <div className="px-5 pb-6 pt-3"
            style={{ borderTop: '1px solid var(--divider)', visibility: isQuestion && !isPractice && answered !== null ? 'hidden' : 'visible' }}>
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <button
                  onClick={() => { if (isQuestion && !isPractice && answered === null) { check(); return } next() }}
                  disabled={
                    isSpeak ? !spoken[screen.id]
                    : isSorter ? !sorterDone[screen.id]
                    : isShadow ? false
                    : isQuestion && answered === null && (
                      c.question_type === 'gap_fill' ? !typed.trim()
                      : c.question_type === 'drag_fill' ? placed.length === 0 || placed.some(p => p === null)
                      : c.question_type === 'stress_pick' ? !(c.words ?? []).every((_: unknown, i: number) => stressSel[i] != null)
                      : c.question_type === 'sentence_stress' ? !(c.sentences ?? []).every((_: unknown, i: number) => (sentSel[i]?.length ?? 0) > 0)
                      : c.question_type === 'link_pairs' ? false
                      : c.question_type === 'which_natural' ? !(c.items ?? []).every((_: unknown, i: number) => whichSel[i] != null)
                      : c.question_type === 'join_type' ? !(c.items ?? []).every((_: unknown, i: number) => (joinTyped[i] ?? '').trim())
                      : c.question_type === 'glide_pick' ? !(c.items ?? []).every((_: unknown, i: number) => glideSel[i] != null)
                      : c.question_type === 'tap_t' ? !(c.items ?? []).every((_: unknown, i: number) => (tapTSel[i]?.length ?? 0) > 0)
                      : c.question_type === 'link_letters' ? !(c.items ?? []).every((_: unknown, i: number) => (linkLetSel[i]?.length ?? 0) > 0)
                      : picked === null
                    )
                  }
                  className="flex-1 py-3.5 font-semibold transition-all duration-[120ms] ease-out enabled:hover:scale-[1.01] enabled:active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  {isQuestion && !isPractice && answered === null
                    ? t('答え合わせ', 'Check')
                    : idx + 1 >= screens.length ? t('完了', 'Finish') : t('続ける', 'Continue')}
                </button>
              </Squircle>
              <span className="text-xs tabular-nums shrink-0 w-12 text-right" style={{ color: 'var(--text-subtle)' }}>
                {idx + 1} / {screens.length}
              </span>
            </div>
          </div>

          {/* Result banner — slides up and covers the footer bar. The tint is
              layered over the OPAQUE page background so nothing bleeds through. */}
          <AnimatePresence>
            {isQuestion && !isPractice && answered !== null && (
              <motion.div key="result" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                className="absolute inset-0 px-5 flex items-center"
                style={{
                  // colour gathers around the result icon on the left and
                  // settles out toward the actions — over an opaque base.
                  // Incorrect uses a NEUTRAL grey wash (only the ✕ and label
                  // stay red): a wall of red reads as judgement, not feedback.
                  background: answered
                    ? 'linear-gradient(105deg, rgba(0,194,184,0.26) 0%, rgba(0,194,184,0.12) 45%, rgba(0,194,184,0.05) 100%), var(--dash-bg)'
                    : 'linear-gradient(105deg, rgba(127,127,134,0.20) 0%, rgba(127,127,134,0.09) 45%, rgba(127,127,134,0.03) 100%), var(--dash-bg)',
                  borderTop: `1px solid ${answered ? 'var(--accent)' : 'var(--edge)'}`,
                }}>
                <div className="max-w-2xl mx-auto w-full flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: answered ? 'var(--accent)' : 'var(--danger)' }}>
                    {answered ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    )}
                  </span>
                  <p className="flex-1 min-w-0 font-bold text-lg truncate" style={{ color: answered ? 'var(--accent)' : 'var(--danger)' }}>
                    {answered ? t('正解！', 'Correct!') : t('おしい！', 'Incorrect')}
                  </p>
                  {/* outlined ghost pill in the result colour — sits inside the
                      tinted banner without fighting it */}
                  <button onClick={() => { play('select'); setExplainOpen(true) }}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold shrink-0 transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
                    style={{
                      background: 'transparent',
                      color: answered ? 'var(--accent)' : 'var(--text)',
                      border: `1px solid ${answered ? 'var(--accent)' : 'var(--edge)'}`,
                    }}>
                    {t('解説', 'Why?')}
                  </button>
                  <button onClick={next}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold shrink-0 transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    {idx + 1 >= screens.length ? t('完了', 'Finish') : t('続ける', 'Continue')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 解説 modal ── */}
      {explainOpen && screen && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={() => setExplainOpen(false)}>
          <div className="modal-card w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: '0 8px 28px rgba(0,0,0,0.10)' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-lg font-bold mb-3" style={{ color: answered ? 'var(--accent)' : 'var(--danger)' }}>
              {answered ? t('正解！', 'Correct!') : t('おしい！', 'Not quite')}
            </p>
            {answered === false && c.question_type === 'gap_fill' && c.accepted?.[0] && (
              <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>
                <span className="font-semibold">{t('正解：', 'Answer: ')}</span>{c.accepted[0]}
              </p>
            )}
            <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
              {rich(locale === 'ja' ? c.explanation_ja : (c.explanation ?? c.explanation_ja))}
            </p>
            {c.transcript && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-subtle)' }}>
                  {t('スクリプト', 'Transcript')}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{c.transcript}</p>
              </div>
            )}
            <button onClick={() => setExplainOpen(false)}
              className="block w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.01] active:scale-[0.98]"
              style={{ background: 'var(--card-inset)', color: 'var(--text)' }}>
              {t('閉じる', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
