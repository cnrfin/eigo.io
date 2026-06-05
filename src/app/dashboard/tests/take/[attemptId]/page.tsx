'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { Squircle } from '@squircle-js/react'

type Option = { id: string; label: string; content: string; order_index: number }
type Question = {
  id: string
  order_index: number
  question_type: string
  prompt: string
  payload: Record<string, unknown>
  max_score: number
  options: Option[]
  response: { selected_option_ids?: string[]; text_response?: string; audio_asset_id?: string | null } | null
}
type Group = {
  id: string
  order_index: number
  stimulus_type: string
  passage_text: string
  prompt: string
  audio: { url: string | null } | null
  image: { url: string | null; alt_text?: string } | null
  questions: Question[]
}
type Section = {
  id: string
  skill: string
  part_label: string
  title: string
  instructions: string
  order_index: number
  groups: Group[]
}
type Answer = { selectedOptionIds?: string[]; textResponse?: string }

const CHOICE_TYPES = ['single_choice', 'true_false_notgiven']
const AI_TYPES = ['essay', 'email_response', 'speaking_response']

export default function TakeTestPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { session } = useAuth()
  const { locale } = useLanguage()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  const [sections, setSections] = useState<Section[]>([])
  const [formTitle, setFormTitle] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [speakingDone, setSpeakingDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupIdx, setGroupIdx] = useState(0)
  const [navOpen, setNavOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [speakingStep, setSpeakingStep] = useState(0) // linear index for speaking interview mode
  const [instrAck, setInstrAck] = useState<Set<string>>(new Set()) // sections whose instruction screen was dismissed
  const [autoRecState, setAutoRecState] = useState<RecState | null>(null) // current machine-paced item's recorder state
  const autoStopRef = useRef<(() => void) | null>(null) // stop function of the current machine-paced recorder

  const answersRef = useRef(answers)
  answersRef.current = answers
  const submittedRef = useRef(false)
  const elapsedRef = useRef(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Load content ----
  // Loaded ONCE per attempt. The effect must not re-run when the access token
  // changes: Supabase refreshes the JWT shortly after load (and ~hourly), and
  // re-fetching would return freshly-signed audio URLs — swapping <audio> src
  // mid-playback (cutting the sound off) and re-seeding in-progress answers.
  const loadedAttemptRef = useRef<string | null>(null)
  useEffect(() => {
    if (!session?.access_token || !attemptId) return
    if (loadedAttemptRef.current === attemptId) return
    loadedAttemptRef.current = attemptId
    fetch(`/api/tests/attempts/${attemptId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'failed'); return d })
      .then(d => {
        if (d.attempt?.status && d.attempt.status !== 'in_progress') {
          router.replace(`/dashboard/tests/results/${attemptId}`)
          return
        }
        setSections(d.sections ?? [])
        setFormTitle(locale === 'ja' ? d.form?.title_ja || d.form?.title || '' : d.form?.title || '')
        // Speaking is self-paced (each answer has its own recording cap), so it
        // never gets a whole-test countdown — regardless of the form's value.
        const allSpeaking = (d.sections ?? []).length > 0 &&
          (d.sections ?? []).every((s: Section) => s.groups.every(g => g.questions.every(q => q.question_type === 'speaking_response')))
        if (d.form?.time_limit_seconds && !allSpeaking) {
          const spent = d.attempt?.time_spent_seconds ?? 0
          // Resume the clock from the stored total. elapsedRef must ALSO start
          // from it — saves persist elapsedRef, and starting it at 0 would
          // overwrite the cumulative time with just this session's seconds
          // (letting students reset the timer by leaving and coming back).
          elapsedRef.current = spent
          setTimeLeft(Math.max(0, d.form.time_limit_seconds - spent))
        }
        const seeded: Record<string, Answer> = {}
        const done = new Set<string>()
        for (const s of d.sections ?? [])
          for (const g of s.groups ?? [])
            for (const q of g.questions ?? []) {
              if (!q.response) continue
              if (q.question_type === 'speaking_response') {
                if (q.response.audio_asset_id) done.add(q.id)
              } else {
                seeded[q.id] = {
                  selectedOptionIds: q.response.selected_option_ids ?? undefined,
                  textResponse: q.response.text_response ?? undefined,
                }
              }
            }
        setAnswers(seeded)
        setSpeakingDone(done)
        // Resume a speaking interview at the first unrecorded item (or the last
        // item if everything is recorded, so the student can submit).
        if (allSpeaking) {
          let idx = 0
          let firstUnrecorded = -1
          for (const s of d.sections ?? [])
            for (const g of s.groups ?? [])
              for (const q of g.questions ?? []) {
                if (firstUnrecorded === -1 && !done.has(q.id)) firstUnrecorded = idx
                idx += 1
              }
          if (firstUnrecorded === -1 && idx > 0) setSpeakingStep(idx - 1)
          else if (firstUnrecorded > 0) setSpeakingStep(firstUnrecorded)
        }
      })
      .catch(() => {
        loadedAttemptRef.current = null // allow a retry (e.g. after the token refreshes)
        setError(t('テストを読み込めませんでした', 'Could not load the test'))
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, attemptId])

  // ---- Flatten groups + global question numbering ----
  const groups = useMemo(() => {
    let n = 0
    const out: { section: Section; group: Group; questions: (Question & { number: number })[] }[] = []
    for (const s of sections)
      for (const g of s.groups) {
        const qs = g.questions.map(q => { n += 1; return { ...q, number: n } })
        out.push({ section: s, group: g, questions: qs })
      }
    return out
  }, [sections])

  const total = groups.reduce((a, g) => a + g.questions.length, 0)
  // AI-graded (writing/speaking) questions → submitted for asynchronous AI review.
  const hasAi = useMemo(() => sections.some(s => s.groups.some(g => g.questions.some(q => AI_TYPES.includes(q.question_type)))), [sections])
  // Teacher review is offered ONLY for tests with recorded audio (speaking).
  const hasSpeaking = useMemo(() => sections.some(s => s.groups.some(g => g.questions.some(q => q.question_type === 'speaking_response'))), [sections])
  // A speaking-only test runs as a linear interview (one question at a time, forward-only).
  const isSpeakingTest = useMemo(() => sections.length > 0 && sections.every(s => s.groups.every(g => g.questions.every(q => q.question_type === 'speaking_response'))), [sections])
  const flatQuestions = useMemo(() => groups.flatMap(gr => gr.questions.map(q => ({ section: gr.section, group: gr.group, q }))), [groups])
  const qMeta = useMemo(() => {
    const gi = new Map<string, number>()
    const num = new Map<string, number>()
    groups.forEach((gr, idx) => gr.questions.forEach(q => { gi.set(q.id, idx); num.set(q.id, q.number) }))
    return { gi, num }
  }, [groups])

  const isAnswered = useCallback((q: Question) => {
    if (q.question_type === 'speaking_response') return speakingDone.has(q.id)
    const a = answers[q.id]
    if (!a) return false
    if (q.question_type === 'matching') {
      try { return Object.keys(JSON.parse(a.textResponse ?? '{}')).length > 0 } catch { return false }
    }
    return (a.selectedOptionIds?.length ?? 0) > 0 || (a.textResponse ?? '').trim().length > 0
  }, [answers, speakingDone])

  const answeredCount = groups.reduce((acc, gr) => acc + gr.questions.filter(isAnswered).length, 0) + 0

  // ---- Save / submit ----
  const buildResponses = useCallback(() =>
    Object.entries(answersRef.current).map(([questionId, a]) => ({
      questionId, selectedOptionIds: a.selectedOptionIds ?? [], textResponse: a.textResponse ?? '',
    })), [])

  const scheduleSave = useCallback(() => {
    if (!session?.access_token || !attemptId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch(`/api/tests/attempts/${attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ responses: buildResponses(), timeSpentSeconds: elapsedRef.current }),
      }).catch(() => {})
    }, 1500)
  }, [session?.access_token, attemptId, buildResponses])

  const submit = useCallback(async (reviewMode?: 'ai' | 'human') => {
    if (!session?.access_token || !attemptId || submittedRef.current) return
    submittedRef.current = true
    setReviewOpen(false)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tests/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ responses: buildResponses(), reviewMode }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'failed') }
      router.push(`/dashboard/tests/results/${attemptId}`)
    } catch {
      submittedRef.current = false
      setSubmitting(false)
      setError(t('提出できませんでした。もう一度お試しください。', 'Could not submit — please try again.'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, attemptId, buildResponses, router])

  // Tests with audio (speaking) ask the student to choose teacher vs AI review;
  // writing-only tests go straight to AI grading; objective tests grade instantly.
  const onSubmitClick = useCallback(() => {
    if (hasSpeaking) setReviewOpen(true)
    else if (hasAi) submit('ai')
    else submit()
  }, [hasSpeaking, hasAi, submit])

  const timerRunning = timeLeft !== null
  const timeExpired = timeLeft !== null && timeLeft <= 0
  useEffect(() => {
    if (!timerRunning) return
    if (timeExpired) { submit(hasAi ? 'ai' : undefined); return }
    const id = setInterval(() => {
      elapsedRef.current += 1
      // Persist elapsed time every 20s even if no answers change, so leaving
      // the page never rewinds the clock by more than a few seconds.
      if (elapsedRef.current % 20 === 0 && session?.access_token) {
        fetch(`/api/tests/attempts/${attemptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ timeSpentSeconds: elapsedRef.current }),
        }).catch(() => {})
      }
      setTimeLeft(p => (p === null ? null : p - 1))
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, timeExpired])

  // Last-chance time save when the tab is hidden or closed (keepalive survives
  // page unload). Answers are already saved on change; this covers the clock.
  useEffect(() => {
    const saveTime = () => {
      if (!session?.access_token || !timerRunning || submittedRef.current) return
      fetch(`/api/tests/attempts/${attemptId}`, {
        method: 'PATCH', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ timeSpentSeconds: elapsedRef.current }),
      }).catch(() => {})
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') saveTime() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', saveTime)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', saveTime)
    }
  }, [session?.access_token, attemptId, timerRunning])

  // ---- Answer setters ----
  const setChoice = (q: Question, optionId: string) => {
    setAnswers(prev => {
      const next = { ...prev }
      if (q.question_type === 'multiple_choice') {
        const cur = new Set(prev[q.id]?.selectedOptionIds ?? [])
        if (cur.has(optionId)) cur.delete(optionId); else cur.add(optionId)
        next[q.id] = { selectedOptionIds: [...cur] }
      } else next[q.id] = { selectedOptionIds: [optionId] }
      return next
    })
    scheduleSave()
  }
  const setText = (q: Question, value: string) => { setAnswers(prev => ({ ...prev, [q.id]: { textResponse: value } })); scheduleSave() }
  const setMatch = (q: Question, itemId: string, optionId: string) => {
    setAnswers(prev => {
      let map: Record<string, string> = {}
      try { map = JSON.parse(prev[q.id]?.textResponse ?? '{}') } catch { map = {} }
      if (optionId) map[itemId] = optionId; else delete map[itemId]
      return { ...prev, [q.id]: { textResponse: JSON.stringify(map) } }
    })
    scheduleSave()
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ---- Question renderer (shared by both layouts) ----
  // `auto` is set for machine-paced items (Versant-style): the stimulus audio
  // plays once, a beep starts the recording, and the test advances by itself.
  const renderQuestion = (q: Question & { number: number }, auto?: {
    stimulusUrl: string | null
    onFinished?: () => void
    onStateChange?: (s: RecState) => void
    stopRef?: { current: (() => void) | null }
  }) => {
    const a = answers[q.id]
    const isChoice = CHOICE_TYPES.includes(q.question_type) || q.question_type === 'multiple_choice'
    const isText = ['gap_fill', 'short_answer'].includes(q.question_type)
    const isLong = ['essay', 'email_response'].includes(q.question_type)
    const isSpeaking = q.question_type === 'speaking_response'
    const isMatching = q.question_type === 'matching'
    const mp = q.payload as { items?: { id: string; text: string }[]; match_options?: { id: string; text: string }[] }
    let matchSel: Record<string, string> = {}
    try { matchSel = JSON.parse(a?.textResponse ?? '{}') } catch { matchSel = {} }

    return (
      <div key={q.id} className="p-4 sm:p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
        <p className="font-medium mb-3" style={{ color: 'var(--text)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{q.number}. </span>{q.prompt}
        </p>

        {isChoice && (
          <div className="flex flex-col gap-2">
            {q.options.map(o => {
              const sel = (a?.selectedOptionIds ?? []).includes(o.id)
              return (
                <button key={o.id} onClick={() => setChoice(q, o.id)}
                  className={`option-row text-left px-4 py-2.5 rounded-xl flex items-center gap-3${sel ? ' is-selected' : ''}`}
                  style={{ background: sel ? 'var(--accent-bg)' : undefined, color: 'var(--text)', boxShadow: sel ? '0 0 0 1.5px var(--accent)' : 'none' }}>
                  {o.label && <span className="font-semibold" style={{ color: sel ? 'var(--accent)' : 'var(--text-muted)' }}>{o.label}</span>}
                  <span>{o.content}</span>
                </button>
              )
            })}
          </div>
        )}

        {isText && (
          <input type="text" value={a?.textResponse ?? ''} onChange={e => setText(q, e.target.value)}
            placeholder={t('答えを入力', 'Type your answer')} className="w-full px-4 py-2.5 rounded-xl outline-none"
            style={{ background: 'var(--card-inset)', color: 'var(--text)' }} />
        )}

        {isLong && (
          <textarea value={a?.textResponse ?? ''} onChange={e => setText(q, e.target.value)} rows={10}
            placeholder={t('ここに書いてください', 'Write your answer here')} className="w-full px-4 py-3 rounded-xl outline-none resize-y"
            style={{ background: 'var(--card-inset)', color: 'var(--text)' }} />
        )}

        {isMatching && (
          <div className="flex flex-col gap-2">
            {(mp.items ?? []).map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>{item.text}</span>
                <select value={matchSel[item.id] ?? ''} onChange={e => setMatch(q, item.id, e.target.value)}
                  className="px-3 py-2 rounded-xl outline-none text-sm" style={{ background: 'var(--card-inset)', color: 'var(--text)', minWidth: '12rem' }}>
                  <option value="">{t('選択', 'Select…')}</option>
                  {(mp.match_options ?? []).map(o => <option key={o.id} value={o.id}>{o.id}. {o.text}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {isSpeaking && attemptId && (
          <SpeakingRecorder attemptId={attemptId} questionId={q.id} token={session?.access_token ?? ''} t={t}
            maxSeconds={Number((q.payload as { speak_seconds?: number })?.speak_seconds) || 60}
            prepSeconds={Number((q.payload as { prep_seconds?: number })?.prep_seconds) || 0}
            autoFlow={!!auto} stimulusUrl={auto?.stimulusUrl ?? null} onFinished={auto?.onFinished}
            onStateChange={auto?.onStateChange} stopRef={auto?.stopRef}
            alreadyDone={speakingDone.has(q.id)} onSaved={() => setSpeakingDone(prev => new Set(prev).add(q.id))} />
        )}
      </div>
    )
  }

  const sendReport = useCallback(async (message: string) => {
    if (!session?.access_token) return
    const current = groups[groupIdx]
    await fetch('/api/tests/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ message, attemptId, questionId: current?.questions[0]?.id ?? null }),
    }).catch(() => {})
  }, [session?.access_token, attemptId, groups, groupIdx])

  const current = groups[groupIdx]
  const g = current?.group
  const hasStimulus = !!(g && (g.passage_text || g.audio?.url || g.image?.url))
  const isLast = groupIdx >= groups.length - 1

  // Render helpers — plain functions (not components) so inputs keep focus across re-renders.
  const stimulusEl = () => g ? (
    <div className="flex flex-col gap-3">
      {g.passage_text && (
        <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text)' }}>{g.passage_text}</div>
      )}
      {g.audio?.url && <audio controls src={g.audio.url} className="w-full" />}
      {g.image?.url && (
        // Full column width with height following the aspect ratio — fills the
        // space without stretching or cropping (key details must stay visible).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={g.image.url} alt={g.image.alt_text || ''} className="rounded-lg w-full h-auto" />
      )}
    </div>
  ) : null

  const questionsEl = () => current ? (
    <div className="flex flex-col gap-4">
      {g?.prompt && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{g.prompt}</p>}
      {current.questions.map(q => renderQuestion(q))}
    </div>
  ) : null

  const navigatorEl = () => (
    <div className="flex flex-col gap-4">
      {sections.map(section => (
        <div key={section.id}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            {section.part_label || section.title}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {section.groups.flatMap(gr => gr.questions).map(q => {
              const gi = qMeta.gi.get(q.id) ?? 0
              const cur = gi === groupIdx
              const ans = isAnswered(q)
              return (
                <button key={q.id} onClick={() => { setGroupIdx(gi); setNavOpen(false) }}
                  className="text-xs text-center py-1.5 rounded-lg transition-colors"
                  style={{
                    background: ans ? 'var(--accent)' : 'transparent',
                    color: ans ? '#fff' : cur ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: cur ? 600 : 400,
                    boxShadow: cur ? '0 0 0 1.5px var(--accent)' : '0 0 0 1px var(--divider)',
                  }}>
                  {qMeta.num.get(q.id)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{answeredCount} / {total} {t('回答済み', 'answered')}</p>
    </div>
  )

  // Speaking interview: one question at a time, forward-only, record-to-advance.
  const speakingInterviewEl = () => {
    if (loading) return <p className="m-auto" style={{ color: 'var(--text-muted)' }}>{t('読み込み中...', 'Loading...')}</p>
    const sp = flatQuestions[speakingStep]
    if (!sp) return null
    const recorded = speakingDone.has(sp.q.id)
    const isLastStep = speakingStep >= flatQuestions.length - 1
    const showPrompt = !!sp.group.prompt && (speakingStep === 0 || flatQuestions[speakingStep - 1].group.id !== sp.group.id)
    // Machine-paced (Versant-style) item: audio plays once -> beep -> auto-record -> auto-advance.
    const isAuto = (sp.q.payload as { flow?: string })?.flow === 'auto'
    const advance = () => setSpeakingStep(s => Math.min(flatQuestions.length - 1, s + 1))

    // Before each section's first item: a full-screen instruction page the student
    // dismisses themselves, so nothing starts playing while they're still reading.
    // (The dismissing click also counts as a user gesture, so the first clip of
    // the section is never blocked by autoplay rules.)
    if (sp.section.instructions && !instrAck.has(sp.section.id)) {
      return (
        <>
          <div className="flex-1 overflow-y-auto p-5 flex">
            <div className="max-w-xl m-auto w-full text-center flex flex-col gap-4">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {sp.section.part_label}{sp.section.part_label && sp.section.title ? ' · ' : ''}{sp.section.title}
              </p>
              <div className="p-6 rounded-2xl text-left whitespace-pre-line" style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)', color: 'var(--text)' }}>
                {sp.section.instructions}
              </div>
              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <button onClick={() => setInstrAck(prev => new Set(prev).add(sp.section.id))}
                  className="px-6 py-2.5 font-medium text-sm self-center transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  {t('開始する', 'Begin')} →
                </button>
              </Squircle>
            </div>
          </div>
          <footer className="flex items-center justify-end px-4 py-2.5 border-t shrink-0" style={{ borderColor: 'var(--divider)', background: 'var(--dash-bg)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{speakingStep + 1} / {flatQuestions.length}</span>
          </footer>
        </>
      )
    }

    return (
      <>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {sp.section.part_label}{sp.section.part_label && sp.section.title ? ' · ' : ''}{sp.section.title} · {t('問題', 'Question')} {speakingStep + 1} / {flatQuestions.length}
            </p>
            {showPrompt && (
              <div className="p-4 rounded-2xl text-sm whitespace-pre-line" style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>{sp.group.prompt}</div>
            )}
            {renderQuestion(sp.q, isAuto ? {
              stimulusUrl: sp.group.audio?.url ?? null,
              onFinished: isLastStep ? undefined : advance,
              onStateChange: setAutoRecState,
              stopRef: autoStopRef,
            } : undefined)}
            {isAuto && autoRecState === 'recording' && (
              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <button onClick={() => autoStopRef.current?.()}
                  className="px-6 py-2.5 font-medium text-sm self-center transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100"
                  style={{ background: 'var(--danger)', color: '#fff' }}>
                  {t('録音を終了', 'Done Recording')}
                </button>
              </Squircle>
            )}
          </div>
        </div>
        <footer className="flex items-center justify-between px-4 py-2.5 border-t shrink-0" style={{ borderColor: 'var(--divider)', background: 'var(--dash-bg)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{recorded ? '' : isAuto ? t('自動で進みます', 'Advances automatically') : t('録音後に次へ', 'Record to continue')}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{speakingStep + 1} / {flatQuestions.length}</span>
          {isLastStep ? (
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <button onClick={onSubmitClick} disabled={submitting || !recorded} className="px-5 py-2 font-medium text-sm disabled:opacity-40 transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100" style={{ background: 'var(--accent)', color: '#fff' }}>
                {t('提出する', 'Submit')}
              </button>
            </Squircle>
          ) : (
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <button onClick={() => setSpeakingStep(s => s + 1)} disabled={!recorded} className="px-5 py-2 font-medium text-sm disabled:opacity-40 transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100" style={{ background: 'var(--accent)', color: '#fff' }}>
                {t('次へ', 'Next')} →
              </button>
            </Squircle>
          )}
        </footer>
      </>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--dash-bg)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--divider)' }}>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{formTitle}</p>
          {current && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{current.section.part_label}{current.section.part_label && current.section.title ? ' · ' : ''}{current.section.title}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {timeLeft !== null && (
            <span className="text-sm font-mono px-3 py-1 rounded-full" style={{ background: timeLeft < 60 ? 'var(--danger)' : 'var(--inset)', color: timeLeft < 60 ? '#fff' : 'var(--text-secondary)' }}>{fmt(timeLeft)}</span>
          )}
          <button onClick={() => setReportOpen(true)} className="text-sm px-3 py-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-secondary)', boxShadow: '0 0 0 1px var(--border)' }}>
            {t('報告', 'Report')}
          </button>
          {!isSpeakingTest && (
            <button onClick={() => setNavOpen(true)} className="lg:hidden text-sm px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', boxShadow: '0 0 0 1px var(--border)' }}>
              {t('問題一覧', 'Questions')}
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      {isSpeakingTest ? speakingInterviewEl() : (
      <>
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 min-w-0 flex">
          {loading ? (
            <p className="m-auto" style={{ color: 'var(--text-muted)' }}>{t('読み込み中...', 'Loading...')}</p>
          ) : error && !current ? (
            <p className="m-auto text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          ) : hasStimulus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
              <div className="overflow-y-auto p-5 md:border-r" style={{ borderColor: 'var(--divider)' }}>{stimulusEl()}</div>
              <div className="overflow-y-auto p-5">{questionsEl()}</div>
            </div>
          ) : (
            <div className="overflow-y-auto p-5 flex-1"><div className="max-w-2xl mx-auto">{questionsEl()}</div></div>
          )}
        </main>

        {/* Navigator (desktop) */}
        <aside className="hidden lg:block w-64 border-l overflow-y-auto p-4 shrink-0" style={{ borderColor: 'var(--divider)' }}>
          {navigatorEl()}
        </aside>
      </div>

      {/* Bottom bar */}
      {!loading && current && (
        <footer className="flex items-center justify-between px-4 py-2.5 border-t shrink-0" style={{ borderColor: 'var(--divider)', background: 'var(--dash-bg)' }}>
          <button onClick={() => setGroupIdx(i => Math.max(0, i - 1))} disabled={groupIdx === 0}
            className="text-sm px-3 py-1.5 disabled:opacity-40" style={{ color: 'var(--text-secondary)' }}>← {t('前へ', 'Prev')}</button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{groupIdx + 1} / {groups.length}</span>
          {isLast ? (
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <button onClick={onSubmitClick} disabled={submitting} className="px-5 py-2 font-medium text-sm disabled:opacity-50 transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100" style={{ background: 'var(--accent)', color: '#fff' }}>
                {t('提出する', 'Submit')}
              </button>
            </Squircle>
          ) : (
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <button onClick={() => setGroupIdx(i => Math.min(groups.length - 1, i + 1))} className="px-5 py-2 font-medium text-sm transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100" style={{ background: 'var(--accent)', color: '#fff' }}>
                {t('次へ', 'Next')} →
              </button>
            </Squircle>
          )}
        </footer>
      )}
      </>
      )}

      {/* Navigator drawer (mobile) */}
      {navOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setNavOpen(false)}>
          <div className="w-72 h-full overflow-y-auto p-4" style={{ background: 'var(--dash-bg)' }} onClick={e => e.stopPropagation()}>
            {navigatorEl()}
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && <ReportModal t={t} onClose={() => setReportOpen(false)} onSend={sendReport} />}

      {/* Review-mode choice (tests with writing/speaking) */}
      {reviewOpen && <ReviewChoiceModal t={t} onClose={() => setReviewOpen(false)} onChoose={m => submit(m)} />}
      {submitting && <ScoringOverlay t={t} />}
    </div>
  )
}

// Full-screen "Scoring..." overlay shown while a submission is being graded:
// the text slowly fades in/out and the dots count up one by one.
function ScoringOverlay({ t }: { t: (ja: string, en: string) => string }) {
  const [dots, setDots] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 3) + 1), 500)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} role="status" aria-live="polite">
      <p className="scoring-pulse text-xl font-semibold" style={{ color: '#fff' }}>
        {t('採点中', 'Scoring')}
        <span className="inline-block w-7 text-left" aria-hidden>{'.'.repeat(dots)}</span>
      </p>
    </div>
  )
}

// Dark-mode mesh pairs for the option cards (pastel blobs that orbit on hover,
// same recipe as the home action buttons).
const REVIEW_MESH_DARK = {
  ai: ['rgba(85,183,235,0.50)', 'rgba(94,234,228,0.45)'],
  human: ['rgba(237,147,177,0.48)', 'rgba(167,159,236,0.48)'],
} as const

function ReviewChoiceModal({ t, onClose, onChoose }: { t: (ja: string, en: string) => string; onClose: () => void; onChoose: (m: 'ai' | 'human') => void }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [choice, setChoice] = useState<'ai' | 'human' | null>(null)

  // Two looks, per theme:
  //   light — flat cards; SELECTED = accent fill + white text
  //   dark  — mesh gradient orbits on hover; SELECTED = accent border (+ mesh stays on)
  const optionCard = (key: 'ai' | 'human', label: string, sub: string) => {
    const selected = choice === key
    const [a, b] = REVIEW_MESH_DARK[key]
    const grad = `radial-gradient(circle 130px at calc(84% + 28px * cos(var(--angle))) calc(80% + 20px * sin(var(--angle))), ${a}, transparent 70%), radial-gradient(circle 130px at calc(84% + 28px * cos(var(--angle) + 180deg)) calc(80% + 20px * sin(var(--angle) + 180deg)), ${b}, transparent 70%)`
    return (
      <button
        onClick={() => setChoice(key)}
        aria-pressed={selected}
        className="group relative overflow-hidden flex flex-col items-center justify-center w-44 h-56 px-4 rounded-2xl transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: !dark && selected ? 'var(--accent)' : 'var(--panel)',
          border: dark ? `1.5px solid ${selected ? 'var(--accent)' : 'transparent'}` : 'none',
          // Lifts the white cards off the light white-out scrim (invisible
          // against dark mode's near-black overlay — harmless there).
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.10)',
        }}
      >
        {dark && (
          <span
            aria-hidden
            className={`mesh-orbit absolute inset-0 ${selected ? 'mesh-on opacity-100 translate-x-0 translate-y-0' : 'opacity-0 translate-x-3 translate-y-3 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0'}`}
            style={{ background: grad, filter: 'blur(12px)', transition: 'opacity 220ms ease-out, transform 320ms ease-out' }}
          />
        )}
        <span className="relative z-10 text-lg font-semibold" style={{ color: !dark && selected ? '#fff' : 'var(--text)' }}>{label}</span>
        <span className="relative z-10 text-xs mt-1" style={{ color: !dark && selected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>{sub}</span>
      </button>
    )
  }

  return (
    // Brilliant-style: no containing card — title, option cards and buttons sit
    // directly on a dimmed backdrop (theme-aware: softer in light mode).
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div className="modal-card w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
        <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{t('採点方法を選んでください', 'How would you like to be graded?')}</p>
        <p className="text-sm mt-2 mb-10" style={{ color: 'var(--text-secondary)' }}>{t('実際の講師またはAIによる採点が選べます。', 'You can be graded by a real teacher or by AI.')}</p>
        <div className="flex justify-center gap-4">
          {optionCard('ai', 'AI', t('数分で採点されます', 'Graded in a few minutes'))}
          {optionCard('human', t('講師', 'Teacher'), t('24時間以内に採点されます', 'Graded within 24 hours'))}
        </div>
        <button
          onClick={() => { if (choice) onChoose(choice) }}
          disabled={!choice}
          className="block mx-auto w-full max-w-xs mt-10 py-3 rounded-full text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100"
          // Submit: accent in dark (original), black inverted pill in light.
          style={dark ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--text)', color: 'var(--dash-bg)' }}
        >
          {t('提出する', 'Submit')}
        </button>
        <button onClick={onClose} className="block mx-auto mt-4 text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          {t('キャンセル', 'Cancel')}
        </button>
      </div>
    </div>
  )
}

function ReportModal({ t, onClose, onSend }: { t: (ja: string, en: string) => string; onClose: () => void; onSend: (m: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const send = async () => { setState('sending'); await onSend(text.trim()); setState('sent'); setTimeout(onClose, 1200) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-card w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }} onClick={e => e.stopPropagation()}>
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{t('問題を報告', 'Report an issue')}</p>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('この問題の誤りや不具合を教えてください。', 'Tell us about an error or problem with this question.')}</p>
        {state === 'sent' ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--success)' }}>{t('報告を送信しました。ありがとうございます！', 'Thanks — report sent!')}</p>
        ) : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
              placeholder={t('内容を入力...', 'Describe the issue...')} className="w-full px-3 py-2 rounded-xl outline-none resize-y mb-3"
              style={{ background: 'var(--card-inset)', color: 'var(--text)' }} />
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="text-sm px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{t('キャンセル', 'Cancel')}</button>
              <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                <button onClick={send} disabled={state === 'sending' || text.trim().length < 3}
                  className="text-sm px-4 py-2 font-medium disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>
                  {state === 'sending' ? '...' : t('送信', 'Send')}
                </button>
              </Squircle>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

type RecState = 'idle' | 'ready' | 'listening' | 'prep' | 'recording' | 'uploading' | 'done' | 'error'

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

/**
 * Cue sounds. Drop SHORT (< 0.5s) clips into public/sounds/ to use your own:
 *   record-start.mp3  — played between the stimulus and the recording
 *   answer-saved.mp3  — played when a recording has been saved
 * If a file is missing or fails to play, a generated tone is used instead.
 */
const BEEP_SRC = '/sounds/record-start.mp3'
const SAVED_SRC = '/sounds/answer-saved.mp3'

/** Generated fallback: play a sequence of pitches, `ms` each. */
function playTone(freqs: number[], ms: number): Promise<void> {
  return new Promise(resolve => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) { resolve(); return }
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0.12
      osc.connect(gain)
      gain.connect(ctx.destination)
      freqs.forEach((f, i) => osc.frequency.setValueAtTime(f, ctx.currentTime + (i * ms) / 1000))
      osc.start()
      setTimeout(() => { try { osc.stop(); ctx.close().catch(() => {}) } catch { /* noop */ } resolve() }, ms * freqs.length)
    } catch { resolve() }
  })
}

/** Play a custom sound file, falling back to a generated tone; never hang > maxMs. */
function playCue(src: string, fallback: () => Promise<void>, maxMs = 2000): Promise<void> {
  return new Promise(resolve => {
    let settled = false
    let el: HTMLAudioElement | null = null
    const done = () => {
      if (settled) return
      settled = true
      try { el?.pause() } catch { /* noop */ } // don't let the tail bleed into the recording
      resolve()
    }
    try {
      const a = new Audio(src)
      el = a
      a.volume = 0.6
      a.onended = done
      a.onerror = () => { if (!settled) { settled = true; fallback().then(resolve) } }
      a.play().catch(() => { if (!settled) { settled = true; fallback().then(resolve) } })
      setTimeout(done, maxMs)
    } catch { fallback().then(resolve) }
  })
}

// The record-start cue gates the mic, so it gets a tight cap: recording begins
// at the file's end or 0.8s, whichever comes first (trailing silence or sloppy
// duration metadata in the sound file can otherwise stall the start).
const beep = () => playCue(BEEP_SRC, () => playTone([880], 250), 800)
const savedCue = () => playCue(SAVED_SRC, () => playTone([660, 990], 120), 1500)

function SpeakingRecorder({
  attemptId, questionId, token, t, maxSeconds = 60, prepSeconds = 0, alreadyDone, onSaved,
  autoFlow = false, stimulusUrl = null, onFinished, onStateChange, stopRef,
}: {
  attemptId: string; questionId: string; token: string
  t: (ja: string, en: string) => string; maxSeconds?: number; prepSeconds?: number; alreadyDone: boolean
  onSaved: () => void
  /** Machine-paced item: stimulus plays once -> beep -> auto-record -> auto-advance; no re-record. */
  autoFlow?: boolean; stimulusUrl?: string | null; onFinished?: () => void
  /** Lets the parent mirror the recorder state and render the stop control outside the card. */
  onStateChange?: (s: RecState) => void; stopRef?: { current: (() => void) | null }
}) {
  const cap = Math.min(180, Math.max(15, Math.floor(maxSeconds) || 60))
  const [state, setState] = useState<RecState>(alreadyDone ? 'done' : autoFlow && stimulusUrl ? 'ready' : 'idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [prepLeft, setPrepLeft] = useState(0)
  const [err, setErr] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stimulusRef = useRef<HTMLAudioElement | null>(null)
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  useEffect(() => { onStateChangeRef.current?.(state) }, [state])

  const clearTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])
  const clearPrepTimer = useCallback(() => { if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null } }, [])
  useEffect(() => () => { clearTimer(); clearPrepTimer() }, [clearTimer, clearPrepTimer])

  const upload = useCallback(async (blob: Blob) => {
    setState('uploading')
    setAudioUrl(URL.createObjectURL(blob))
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
    const fd = new FormData()
    fd.append('audio', blob, `answer.${ext}`)
    fd.append('questionId', questionId)
    try {
      const res = await fetch(`/api/tests/attempts/${attemptId}/speaking`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'failed')
      setState('done'); onSaved()
      savedCue()
      // Machine-paced flow: move on to the next item by itself.
      if (autoFlow) setTimeout(() => onFinishedRef.current?.(), 700)
    } catch {
      setErr(t('アップロードに失敗しました', 'Upload failed — please try again')); setState('error')
    }
  }, [attemptId, questionId, token, t, onSaved, autoFlow])

  const stop = useCallback(() => { clearTimer(); recorderRef.current?.stop() }, [clearTimer])
  useEffect(() => {
    if (!stopRef) return
    stopRef.current = stop
    return () => { stopRef.current = null }
  }, [stop, stopRef])

  const start = useCallback(async () => {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMimeType()
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = () => { clearTimer(); stream.getTracks().forEach(tr => tr.stop()); upload(new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })) }
      recorderRef.current = mr
      mr.start(); setState('recording'); setElapsed(0)
      timerRef.current = setInterval(() => { setElapsed(prev => { const next = prev + 1; if (next >= cap) stop(); return next }) }, 1000)
    } catch {
      setErr(t('マイクにアクセスできません', 'Could not access the microphone')); setState('error')
    }
  }, [t, upload, stop, clearTimer, cap])

  // Part 2: a preparation countdown that auto-starts recording when it ends.
  const startPrep = useCallback(() => {
    setErr(''); setState('prep'); setPrepLeft(prepSeconds)
    prepTimerRef.current = setInterval(() => {
      setPrepLeft(p => { const next = p - 1; if (next <= 0) { clearPrepTimer(); start() } return next })
    }, 1000)
  }, [prepSeconds, clearPrepTimer, start])

  // Machine-paced item: play the stimulus once; when it ends, beep then record.
  const playStimulus = useCallback(() => {
    const el = stimulusRef.current
    if (!el) return
    el.play().then(() => setState('listening')).catch(() => setState('ready'))
  }, [])
  useEffect(() => {
    // Try to start by itself (falls back to a Play button if the browser
    // blocks autoplay without a fresh user gesture).
    if (autoFlow && stimulusUrl && !alreadyDone) playStimulus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onStimulusEnded = useCallback(() => { beep().then(() => start()) }, [start])

  const btn = 'px-4 py-2 rounded-xl font-medium text-sm transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:hover:scale-100 disabled:active:scale-100'
  const fmtRec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-2">
      {autoFlow && stimulusUrl && (
        // Hidden one-shot stimulus player — no controls, no replay. If the clip
        // fails to load, fall back to recording so the attempt is never stuck.
        <audio ref={stimulusRef} src={stimulusUrl} preload="auto" onEnded={onStimulusEnded}
          onError={() => { if (!alreadyDone) onStimulusEnded() }} className="hidden" />
      )}
      {state === 'ready' && (
        <button onClick={playStimulus} className={btn} style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'flex-start' }}>{t('▶ 問題を再生', '▶ Play question')}</button>
      )}
      {state === 'listening' && (
        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          {t('再生中...', 'Listening...')}
        </p>
      )}
      {state === 'idle' && (
        prepSeconds > 0
          ? <button onClick={startPrep} className={btn} style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'flex-start' }}>{t(`${prepSeconds}秒の準備後に録音`, `Prepare (${prepSeconds}s), then record`)}</button>
          : <button onClick={start} className={btn} style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'flex-start' }}>{t('録音する', 'Record answer')}</button>
      )}
      {state === 'prep' && (
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('準備時間', 'Preparation')}: <span className="font-mono" style={{ color: 'var(--text)' }}>{fmtRec(prepLeft)}</span></span>
          <button onClick={() => { clearPrepTimer(); start() }} className={btn} style={{ background: 'var(--accent)', color: '#fff' }}>{t('今すぐ録音', 'Start now')}</button>
        </div>
      )}
      {state === 'recording' && (autoFlow ? (
        // The stop control is rendered by the parent below the card; in here just
        // show the live indicator (bigger red flashing dot) + the countdown.
        <p className="text-sm flex items-center gap-2.5" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--danger)' }} />
          {t('録音中', 'Recording')}
          <span className="font-mono" style={{ color: elapsed >= cap - 10 ? 'var(--danger)' : 'var(--text-muted)' }}>{fmtRec(elapsed)} / {fmtRec(cap)}</span>
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={stop} className={btn} style={{ background: 'var(--danger)', color: '#fff' }}>{t('■ 停止', '■ Stop recording')}</button>
          <span className="text-sm font-mono" style={{ color: elapsed >= cap - 10 ? 'var(--danger)' : 'var(--text-secondary)' }}>{fmtRec(elapsed)} / {fmtRec(cap)}</span>
        </div>
      ))}
      {state === 'uploading' && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('保存中...', 'Saving…')}</p>}
      {state === 'done' && (autoFlow ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('回答を記録しました。', 'Answer recorded.')}</p>
      ) : (
        <>
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('録音を保存しました。提出時に採点されます。', 'Recording saved — it will be scored when you submit.')}</p>
          <button onClick={start} className={btn} style={{ background: 'var(--surface-hover)', color: 'var(--text)', alignSelf: 'flex-start' }}>{t('録音し直す', 'Re-record')}</button>
        </>
      ))}
      {state === 'error' && (
        <>
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>
          <button onClick={start} className={btn} style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'flex-start' }}>{t('もう一度', 'Try again')}</button>
        </>
      )}
    </div>
  )
}
