'use client'

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { isAdminEmail } from '@/lib/admin-redirect'
import { renderMarkdown } from '@/lib/markdown'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import Header from '@/components/Header'
import BookingCalendar from '@/components/BookingCalendar'
import { motion, AnimatePresence } from 'framer-motion'
import { formatNextReview, previewIntervals, type ReviewRating } from '@/lib/srs'

type Lesson = {
  id: string
  date: string
  startTime: string
  durationMinutes: number
  status: string
  googleEventId: string | null
  wherebyRoomUrl: string | null
  wherebyMeetingId: string | null
}

type Tab = 'home' | 'booking' | 'history' | 'vocab'

type VocabCard = {
  id: string
  comfort_level: 'learning' | 'reviewing' | 'mastered'
  last_reviewed: string | null
  review_count: number
  interval_days: number
  ease_factor: number
  next_review_at: string
  phrase: {
    id: string
    phrase_en: string
    example_en: string
    translation_ja: string
    explanation_ja: string
    explanation_en: string
    category: string
    booking_id: string
  }
}

type NewsItem = {
  id: string
  date: string
  title_ja: string
  title_en: string
  content_ja: string
  content_en: string
  poster_name?: string
  poster_avatar_url?: string
}

// ─── Cancel Modal ───
function CancelModal({
  lesson, onConfirm, onClose, cancelling, locale, cancelAll, setCancelAll,
}: {
  lesson: Lesson; onConfirm: () => void; onClose: () => void; cancelling: boolean; locale: string; cancelAll: boolean; setCancelAll: (v: boolean) => void
}) {
  const date = new Date(`${lesson.date}T${lesson.startTime}`)
  const dateStr = date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-backdrop">
      <div className="modal-card">
      <SquircleBox cornerRadius={20} className="p-8 w-full max-w-sm mx-4 shadow-[0_0_0_1px_var(--border)]" style={{ background: 'var(--surface)' }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          {locale === 'ja' ? 'キャンセル' : 'Cancel'}
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          {locale === 'ja'
            ? `${dateStr} ${timeStr}（${lesson.durationMinutes}分）をキャンセルしますか？`
            : `Cancel your ${lesson.durationMinutes} min lesson on ${dateStr} at ${timeStr}?`}
        </p>
        <button
          type="button"
          onClick={() => setCancelAll(!cancelAll)}
          className="flex items-center gap-3 mb-6 cursor-pointer"
        >
          <span
            className="relative inline-flex items-center shrink-0 w-10 h-6 rounded-full transition-colors"
            style={{ background: cancelAll ? 'var(--danger)' : 'var(--surface-hover)' }}
          >
            <span
              className={`absolute w-4 h-4 rounded-full transition-transform shadow-sm ${cancelAll ? '' : 'toggle-handle-off'}`}
              style={{
                ...(cancelAll ? { background: '#fff' } : {}),
                transform: cancelAll ? 'translateX(21px)' : 'translateX(3px)',
              }}
            />
          </span>
          <span className="text-sm" style={{ color: cancelAll ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {locale === 'ja' ? 'これ以降もすべてキャンセル' : 'Cancel all after this too'}
          </span>
        </button>
        <div className="flex gap-3">
          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <button onClick={onClose} disabled={cancelling} className="flex-1 py-3 font-medium transition-colors disabled:opacity-50 hover:opacity-90" style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}>
              {locale === 'ja' ? '戻る' : 'Back'}
            </button>
          </Squircle>
          <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
            <button onClick={onConfirm} disabled={cancelling} className="flex-1 py-3 font-medium transition-colors disabled:opacity-50 hover:opacity-90" style={{ background: 'var(--danger)', color: '#fff' }}>
              {cancelling ? '...' : cancelAll
                ? (locale === 'ja' ? 'すべてキャンセル' : 'Cancel All')
                : (locale === 'ja' ? 'キャンセル' : 'Cancel')}
            </button>
          </Squircle>
        </div>
      </SquircleBox>
      </div>
    </div>
  )
}

// ─── Next Lesson Card (hero-style, prominent) ───
function NextLessonCard({
  lesson, locale, wherebyUrl, onCancel, onReschedule, isAdmin = false,
}: {
  lesson: Lesson; locale: string; wherebyUrl: string; onCancel: (lesson: Lesson) => void; onReschedule: (lesson: Lesson) => void; isAdmin?: boolean
}) {
  const date = new Date(`${lesson.date}T${lesson.startTime}`)
  const dateStr = date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeStr = date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })

  const now = new Date()
  const lessonStart = new Date(`${lesson.date}T${lesson.startTime}+09:00`)
  const minutesUntil = (lessonStart.getTime() - now.getTime()) / (1000 * 60)
  const classroomActive = isAdmin || (minutesUntil <= 10 && minutesUntil > -lesson.durationMinutes)

  const formatCountdown = (mins: number) => {
    const days = Math.round(mins / (60 * 24))
    const hours = Math.round(mins / 60)
    const m = Math.floor(mins)
    if (locale === 'ja') {
      if (days >= 1) return `${days}日後`
      if (hours >= 1) return `${hours}時間後`
      return `${m}分後`
    }
    if (days >= 1) return `in ${days}d`
    if (hours >= 1) return `in ${hours}h`
    return `in ${m}m`
  }

  return (
    <SquircleBox cornerRadius={16} className="px-8 py-6" style={{ background: 'var(--surface)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-subtle)' }}>
            {locale === 'ja' ? '次のレッスン' : 'Next lesson'}
          </p>
          <p className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{dateStr}</p>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>{timeStr} · {lesson.durationMinutes} min</p>
        </div>
        <div className="text-right">
          {minutesUntil > 0 && (
            <span className="text-lg font-medium" style={{ color: 'var(--accent)' }}>
              {formatCountdown(minutesUntil)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {classroomActive ? (
          <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
            <a
              href={lesson.wherebyRoomUrl || wherebyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 text-center font-medium transition-all hover:opacity-90 animate-pulse"
              style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
            >
              {locale === 'ja' ? '入室する →' : 'Enter →'}
            </a>
          </Squircle>
        ) : (
          <p className="flex-1 text-sm" style={{ color: 'var(--text-subtle)' }}>
            {locale === 'ja' ? '10分前から入室できます' : 'Opens 10 min before'}
          </p>
        )}
        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
          <button
            onClick={() => onReschedule(lesson)}
            className="px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            {locale === 'ja' ? '変更' : 'Reschedule'}
          </button>
        </Squircle>
        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
          <button
            onClick={() => onCancel(lesson)}
            className="px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
          >
            {locale === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
        </Squircle>
      </div>
    </SquircleBox>
  )
}

// ─── Lesson Card (compact, for remaining lessons) ───
function LessonCard({
  lesson, locale, wherebyUrl, onCancel, onReschedule, isAdmin = false,
}: {
  lesson: Lesson; locale: string; wherebyUrl: string; onCancel: (lesson: Lesson) => void; onReschedule: (lesson: Lesson) => void; isAdmin?: boolean
}) {
  const date = new Date(`${lesson.date}T${lesson.startTime}`)
  const dateStr = date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })

  const now = new Date()
  const lessonStart = new Date(`${lesson.date}T${lesson.startTime}+09:00`)
  const minutesUntil = (lessonStart.getTime() - now.getTime()) / (1000 * 60)

  const formatCountdown = (mins: number) => {
    const days = Math.round(mins / (60 * 24))
    const hours = Math.round(mins / 60)
    const m = Math.floor(mins)
    if (locale === 'ja') {
      if (days >= 1) return `${days}日後`
      if (hours >= 1) return `${hours}時間後`
      return `${m}分後`
    }
    if (days >= 1) return `in ${days}d`
    if (hours >= 1) return `in ${hours}h`
    return `in ${m}m`
  }

  return (
    <SquircleBox cornerRadius={12} className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--surface)' }}>
      <div className="flex-1">
        <p className="font-medium" style={{ color: 'var(--text)' }}>{dateStr}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{timeStr} · {lesson.durationMinutes} min</p>
      </div>
      <div className="flex items-center gap-3">
        {minutesUntil > 0 && (
          <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>
            {formatCountdown(minutesUntil)}
          </span>
        )}
        {isAdmin && (
          <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
            <a
              href={lesson.wherebyRoomUrl || wherebyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
            >
              {locale === 'ja' ? '入室 →' : 'Enter →'}
            </a>
          </Squircle>
        )}
        <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
          <button
            onClick={() => onReschedule(lesson)}
            className="px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            {locale === 'ja' ? '変更' : 'Reschedule'}
          </button>
        </Squircle>
        <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
          <button
            onClick={() => onCancel(lesson)}
            className="px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
          >
            {locale === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
        </Squircle>
      </div>
    </SquircleBox>
  )
}

// ─── Video Player Modal ───
function VideoPlayerModal({
  accessLink, onClose, locale,
}: {
  accessLink: string; onClose: () => void; locale: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl mx-4 modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-white/70 hover:text-white text-sm px-3 py-1 transition-colors">
            {locale === 'ja' ? '閉じる ✕' : 'Close ✕'}
          </button>
        </div>
        <SquircleBox cornerRadius={16} className="overflow-hidden" style={{ background: '#000' }}>
          <video
            src={accessLink}
            controls
            autoPlay
            className="w-full aspect-video"
            style={{ outline: 'none' }}
          />
        </SquircleBox>
      </div>
    </div>
  )
}

// ─── Transcript Modal ───
// ─── Types for lesson analysis ───
type LessonSummary = {
  id: string
  summary_en: string
  summary_ja: string
  key_topics: string[]
  mistake_patterns: {
    type: string
    example_student: string
    correction: string
    explanation_ja: string
    explanation_en: string
  }[]
}

type VocabPhrase = {
  id: string
  phrase_en: string
  example_en: string
  translation_ja: string
  explanation_ja: string
  explanation_en: string
  category: string
}

// ─── History Lesson Card (with accordion summary + phrases) ───
function HistoryLessonCard({
  lesson, locale, session, onViewTranscript, onAddToDeck, deckPhraseIds,
}: {
  lesson: Lesson; locale: string; session: { access_token: string } | null
  onViewTranscript: (lesson: Lesson, content: string) => void
  onAddToDeck?: (phraseId: string) => void
  deckPhraseIds?: Set<string>
}) {
  const [recordingState, setRecordingState] = useState<'idle' | 'loading' | 'ready' | 'none' | 'error'>('idle')
  const [accessLink, setAccessLink] = useState<string | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)
  const [transcriptState, setTranscriptState] = useState<'idle' | 'loading' | 'processing' | 'ready' | 'none' | 'error'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`eigo_transcript_${lesson.id}`)
        if (stored === 'ready') return 'ready'
      } catch { /* ignore */ }
    }
    return 'idle'
  })
  const [transcriptContent, setTranscriptContent] = useState<string | null>(null)

  // Analysis state
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'ready' | 'error'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`eigo_analysis_${lesson.id}`)
        if (stored === 'ready') return 'ready'
      } catch { /* ignore */ }
    }
    return 'idle'
  })
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const [phrases, setPhrases] = useState<VocabPhrase[]>([])
  const [expanded, setExpanded] = useState(false)
  const [selectedPhrase, setSelectedPhrase] = useState<VocabPhrase | null>(null)

  const date = new Date(`${lesson.date}T${lesson.startTime}`)
  const dateStr = date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })

  // Check for existing analysis on mount
  useEffect(() => {
    if (!session?.access_token) return
    if (summary) return // already loaded

    fetch(`/api/lessons/analyze?bookingId=${lesson.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ready') {
          setSummary(data.summary)
          setPhrases(data.phrases || [])
          setAnalysisState('ready')
          try { localStorage.setItem(`eigo_analysis_${lesson.id}`, 'ready') } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [lesson.id, session?.access_token, summary])

  const fetchRecording = async () => {
    if (!lesson.wherebyRoomUrl || !session?.access_token) {
      setRecordingState('none')
      return
    }
    setRecordingState('loading')
    try {
      const res = await fetch(`/api/recordings?roomUrl=${encodeURIComponent(lesson.wherebyRoomUrl)}`)
      const data = await res.json()
      if (data.recordings && data.recordings.length > 0 && data.recordings[0].accessLink) {
        setAccessLink(data.recordings[0].accessLink)
        setRecordingState('ready')
        setShowPlayer(true)
      } else {
        setRecordingState('none')
      }
    } catch {
      setRecordingState('error')
    }
  }

  const fetchTranscript = async () => {
    if (!session?.access_token) return

    // If we already have content, show it inline
    if (transcriptContent) {
      onViewTranscript(lesson, transcriptContent)
      return
    }

    setTranscriptState('loading')
    try {
      const res = await fetch(`/api/transcriptions?bookingId=${lesson.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()

      if (data.status === 'ready' && data.content) {
        setTranscriptContent(data.content)
        setTranscriptState('ready')
        onViewTranscript(lesson, data.content)
        try { localStorage.setItem(`eigo_transcript_${lesson.id}`, 'ready') } catch { /* ignore */ }
      } else if (data.status === 'processing') {
        setTranscriptState('processing')
        setTimeout(() => { fetchTranscript() }, 5000)
      } else if (data.status === 'no_recording') {
        setTranscriptState('none')
      } else if (data.status === 'failed' || data.status === 'error') {
        setTranscriptState('error')
      } else {
        setTranscriptState('error')
      }
    } catch {
      setTranscriptState('error')
    }
  }

  const generateAnalysis = async () => {
    if (!session?.access_token) return
    setAnalysisState('loading')
    try {
      const res = await fetch('/api/lessons/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId: lesson.id }),
      })
      const data = await res.json()
      if (data.status === 'ready') {
        setSummary(data.summary)
        setPhrases(data.phrases || [])
        setAnalysisState('ready')
        setExpanded(true)
        try { localStorage.setItem(`eigo_analysis_${lesson.id}`, 'ready') } catch { /* ignore */ }
      } else {
        setAnalysisState('error')
      }
    } catch {
      setAnalysisState('error')
    }
  }

  const transcriptLabel = () => {
    switch (transcriptState) {
      case 'loading': return locale === 'ja' ? '取得中' : 'Loading'
      case 'processing': return locale === 'ja' ? '作成中...' : 'Processing...'
      case 'ready': return locale === 'ja' ? '文字起こし' : 'Transcript'
      case 'none': return locale === 'ja' ? '録画なし' : 'No recording'
      case 'error': return locale === 'ja' ? '再試行' : 'Retry'
      default: return locale === 'ja' ? '文字起こし' : 'Transcript'
    }
  }

  const analysisLabel = () => {
    switch (analysisState) {
      case 'loading': return locale === 'ja' ? '分析中...' : 'Analyzing...'
      case 'ready': return locale === 'ja' ? 'サマリー' : 'Summary'
      case 'error': return locale === 'ja' ? '再試行' : 'Retry'
      default: return locale === 'ja' ? 'サマリー' : 'Summary'
    }
  }

  return (
    <>
      <SquircleBox cornerRadius={12} className="overflow-hidden" style={{ background: 'var(--surface)' }}>
        {/* Main card row */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="font-medium" style={{ color: 'var(--text)' }}>{dateStr}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{timeStr} · {lesson.durationMinutes} min</p>
          </div>
          <div className="flex items-center gap-2">
            {lesson.wherebyRoomUrl && (
              <>
                {/* Transcript button */}
                <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <button
                    onClick={fetchTranscript}
                    disabled={transcriptState === 'loading' || transcriptState === 'processing' || transcriptState === 'none'}
                    className="px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    style={{
                      background: 'var(--surface-hover)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {(transcriptState === 'loading' || transcriptState === 'processing') && (
                      <span className="spinner-sm" />
                    )}
                    {transcriptLabel()}
                  </button>
                </Squircle>

                {/* AI Analysis button — shows when transcript is ready or analysis already cached */}
                {(transcriptState === 'ready' || analysisState === 'ready') && (
                  <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                    <button
                      onClick={analysisState === 'ready' ? () => setExpanded(!expanded) : generateAnalysis}
                      disabled={analysisState === 'loading'}
                      className="px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                      style={{
                        background: analysisState === 'ready' ? 'var(--accent)' : 'var(--surface-hover)',
                        color: analysisState === 'ready' ? 'var(--selected-text)' : 'var(--text-muted)',
                      }}
                    >
                      {analysisState === 'loading' && <span className="spinner-sm" />}
                      {analysisLabel()}
                      {analysisState === 'ready' && (
                        <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
                      )}
                    </button>
                  </Squircle>
                )}

                {/* Recording button */}
                <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <button
                    onClick={fetchRecording}
                    disabled={recordingState === 'loading'}
                    className="px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: recordingState === 'none' ? 'var(--surface-hover)' : recordingState === 'error' ? 'var(--danger)' : 'var(--accent)',
                      color: recordingState === 'none' ? 'var(--text-muted)' : 'var(--selected-text)',
                    }}
                  >
                    {recordingState === 'loading' ? '...'
                      : recordingState === 'none' ? (locale === 'ja' ? '録画なし' : 'No recording')
                      : recordingState === 'error' ? (locale === 'ja' ? '再試行' : 'Retry')
                      : (locale === 'ja' ? '録画' : 'Watch')}
                  </button>
                </Squircle>
              </>
            )}
          </div>
        </div>

        {/* Accordion: Summary + Phrases */}
        <AnimatePresence>
          {expanded && analysisState === 'ready' && summary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-5 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {/* Key topics */}
                {summary.key_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {summary.key_topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? summary.summary_ja : summary.summary_en}
                </p>

                {/* Mistake patterns */}
                {summary.mistake_patterns.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
                      {locale === 'ja' ? '改善ポイント' : 'Areas to improve'}
                    </p>
                    <div className="space-y-2">
                      {summary.mistake_patterns.map((m, i) => (
                        <div key={i} className="text-sm rounded-lg p-3" style={{ background: 'var(--surface-hover)' }}>
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--danger)', color: '#fff', opacity: 0.8, width: '22px', height: '22px', lineHeight: '22px' }}>✗</span>
                            <span className="pt-0.5" style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{m.example_student}</span>
                          </div>
                          <div className="flex items-start gap-2 mb-1.5">
                            <span className="text-xs rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--selected-text)', width: '22px', height: '22px', lineHeight: '22px' }}>✓</span>
                            <span className="pt-0.5" style={{ color: 'var(--text)' }}>{m.correction}</span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)', paddingLeft: '30px' }}>
                            {locale === 'ja' ? m.explanation_ja : m.explanation_en}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vocabulary phrases */}
                {phrases.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
                      {locale === 'ja' ? 'フレーズ' : 'Phrases'}
                    </p>
                    <div className="space-y-1.5">
                      {phrases.map((phrase) => (
                        <div key={phrase.id}>
                          <div
                            onClick={() => setSelectedPhrase(selectedPhrase?.id === phrase.id ? null : phrase)}
                            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80 cursor-pointer"
                            style={{ background: selectedPhrase?.id === phrase.id ? 'var(--surface-hover)' : 'transparent' }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate" style={{ color: 'var(--text)' }}>{phrase.phrase_en}</span>
                              <span className="text-xs shrink-0 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-subtle)' }}>
                                {phrase.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {onAddToDeck && (
                                <Squircle asChild cornerRadius={6} cornerSmoothing={0.8}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onAddToDeck(phrase.id) }}
                                    disabled={deckPhraseIds?.has(phrase.id)}
                                    className="px-2 py-1 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-40"
                                    style={{
                                      background: deckPhraseIds?.has(phrase.id) ? 'var(--surface-hover)' : 'var(--accent)',
                                      color: deckPhraseIds?.has(phrase.id) ? 'var(--text-muted)' : 'var(--selected-text)',
                                    }}
                                  >
                                    {deckPhraseIds?.has(phrase.id)
                                      ? (locale === 'ja' ? '追加済み' : 'Added')
                                      : (locale === 'ja' ? 'バンクに追加' : 'Add to bank')}
                                  </button>
                                </Squircle>
                              )}
                              <span style={{ transform: selectedPhrase?.id === phrase.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', color: 'var(--text-subtle)' }}>▾</span>
                            </div>
                          </div>
                          <AnimatePresence>
                            {selectedPhrase?.id === phrase.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 pt-1 space-y-1.5">
                                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{locale === 'ja' ? '例' : 'Example'}: </span>
                                    {phrase.example_en}
                                  </p>
                                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{locale === 'ja' ? '訳' : 'Translation'}: </span>
                                    {phrase.translation_ja}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {locale === 'ja' ? phrase.explanation_ja : phrase.explanation_en}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SquircleBox>
      {showPlayer && accessLink && (
        <VideoPlayerModal
          accessLink={accessLink}
          onClose={() => setShowPlayer(false)}
          locale={locale}
        />
      )}
    </>
  )
}

// ─── Dashboard Content ───
function DashboardContent() {
  const { user, session, loading } = useAuth()
  const { t, locale } = useLanguage()
  const searchParams = useSearchParams()
  const durationParam = searchParams.get('duration')

  const isAdmin = isAdminEmail(user?.email)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [historyLessons, setHistoryLessons] = useState<Lesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [lessonToCancel, setLessonToCancel] = useState<Lesson | null>(null)
  const [cancelAllFuture, setCancelAllFuture] = useState(false)
  const [showAllLessons, setShowAllLessons] = useState(false)
  const [showAllNews, setShowAllNews] = useState(false)
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set())
  const [historyPage, setHistoryPage] = useState(0)
  const [lessonToReschedule, setLessonToReschedule] = useState<Lesson | null>(null)
  const [selectedTranscript, setSelectedTranscript] = useState<{ lesson: Lesson; content: string } | null>(null)
  const [vocabCards, setVocabCards] = useState<VocabCard[]>([])
  const [loadingVocab, setLoadingVocab] = useState(false)
  const [vocabFilter, setVocabFilter] = useState<'all' | 'learning' | 'reviewing' | 'mastered'>('all')
  const [vocabVisible, setVocabVisible] = useState(20)
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<VocabCard[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewFlipped, setReviewFlipped] = useState(false)
  const [reviewingCardId, setReviewingCardId] = useState<string | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [subStatus, setSubStatus] = useState<'loading' | 'none' | 'active' | 'past_due'>('loading')
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null)
  const [minutesPerMonth, setMinutesPerMonth] = useState<number | null>(null)
  const [trialCompleted, setTrialCompleted] = useState<boolean | null>(null) // null = loading
  const LESSONS_VISIBLE = 4 // 1 hero + 3 compact
  const NEWS_VISIBLE = 3
  const HISTORY_PER_PAGE = 10

  const wherebyUrl = process.env.NEXT_PUBLIC_WHEREBY_ROOM_URL || ''

  // Load read news IDs from localStorage
  const readNewsKey = user?.id ? `eigo_read_news_${user.id}` : null
  useEffect(() => {
    if (!readNewsKey) return
    try {
      const stored = localStorage.getItem(readNewsKey)
      if (stored) setReadNewsIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [readNewsKey])

  const markNewsRead = useCallback((id: string) => {
    setReadNewsIds(prev => {
      const next = new Set(prev)
      next.add(id)
      if (readNewsKey) {
        try { localStorage.setItem(readNewsKey, JSON.stringify([...next])) } catch { /* ignore */ }
      }
      return next
    })
  }, [readNewsKey])

  // If user navigated with ?duration= or ?tab=booking, jump to booking tab
  useEffect(() => {
    if (durationParam) setActiveTab('booking')
    else if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab')
      if (tabParam === 'booking') setActiveTab('booking')
    }
  }, [durationParam])

  const fetchLessons = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingLessons(true)
    try {
      const res = await fetch('/api/calendar/upcoming', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setLessons(data.lessons || [])
    } catch {
      setLessons([])
    } finally {
      setLoadingLessons(false)
    }
  }, [session?.access_token])

  const fetchHistory = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/calendar/history', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setHistoryLessons(data.lessons || [])
    } catch {
      setHistoryLessons([])
    } finally {
      setLoadingHistory(false)
    }
  }, [session?.access_token])

  const fetchVocab = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingVocab(true)
    try {
      const res = await fetch('/api/vocabulary', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setVocabCards(data.cards || [])
      setDueCount(data.dueCount || 0)
    } catch {
      setVocabCards([])
      setDueCount(0)
    } finally {
      setLoadingVocab(false)
    }
  }, [session?.access_token])

  const deckPhraseIds = useMemo(() => new Set(vocabCards.map(c => c.phrase?.id).filter(Boolean)), [vocabCards])

  const addToDeck = async (phraseId: string) => {
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phraseId }),
      })
      if (res.ok) {
        fetchVocab() // refresh deck
      }
    } catch { /* ignore */ }
  }

  const updateCardLevel = async (cardId: string, comfortLevel: string) => {
    if (!session?.access_token) return
    try {
      await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ cardId, comfortLevel }),
      })
      setVocabCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, comfort_level: comfortLevel as VocabCard['comfort_level'] } : c
      ))
    } catch { /* ignore */ }
  }

  const removeCard = async (cardId: string) => {
    if (!session?.access_token) return
    try {
      await fetch(`/api/vocabulary?cardId=${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setVocabCards(prev => prev.filter(c => c.id !== cardId))
    } catch { /* ignore */ }
  }

  const startReview = () => {
    const now = new Date().toISOString()
    const due = vocabCards.filter(c => c.next_review_at <= now)
    if (due.length === 0) return
    // Shuffle due cards for variety
    const shuffled = [...due].sort(() => Math.random() - 0.5)
    setReviewQueue(shuffled)
    setReviewIndex(0)
    setReviewFlipped(false)
    setReviewMode(true)
  }

  const reviewCard = async (rating: ReviewRating) => {
    const card = reviewQueue[reviewIndex]
    if (!card || !session?.access_token) return
    setReviewingCardId(card.id)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ cardId: card.id, rating }),
      })
      if (res.ok) {
        const data = await res.json()
        // Update card in local state
        setVocabCards(prev => prev.map(c =>
          c.id === card.id ? {
            ...c,
            comfort_level: data.comfort_level,
            interval_days: data.interval_days,
            ease_factor: data.ease_factor,
            next_review_at: data.next_review_at,
            last_reviewed: new Date().toISOString(),
            review_count: c.review_count + 1,
          } : c
        ))
        setDueCount(prev => Math.max(0, prev - 1))
      }
    } catch { /* ignore */ } finally {
      setReviewingCardId(null)
    }
    // Advance to next card
    if (reviewIndex + 1 < reviewQueue.length) {
      setReviewIndex(prev => prev + 1)
      setReviewFlipped(false)
    } else {
      // Review session complete
      setReviewMode(false)
      setReviewQueue([])
      setReviewIndex(0)
    }
  }

  const rescheduleLesson = (lesson: Lesson) => {
    setLessonToReschedule(lesson)
    setActiveTab('booking')
  }

  const cancelLesson = async (lesson: Lesson) => {
    if (!session?.access_token) return
    setCancellingId(lesson.id)
    try {
      if (cancelAllFuture) {
        const lessonsToCancel = lessons.filter(
          (l) => l.date > lesson.date || (l.date === lesson.date && l.startTime >= lesson.startTime)
        )
        const isMultiCancel = lessonsToCancel.length > 1
        const results = await Promise.all(
          lessonsToCancel.map((l) =>
            fetch('/api/calendar/cancel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                bookingId: l.id,
                googleEventId: l.googleEventId,
                wherebyMeetingId: l.wherebyMeetingId,
                skipAdminEmail: isMultiCancel,
              }),
            })
          )
        )
        // Send a single batch admin email for multi-cancellations
        if (isMultiCancel) {
          const cancelledLessons = lessonsToCancel.map((l) => {
            const dt = new Date(`${l.date}T${l.startTime}+09:00`)
            return {
              lessonDate: dt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
              lessonTime: dt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
              durationMinutes: l.durationMinutes,
            }
          })
          fetch('/api/calendar/cancel-notify-admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ lessons: cancelledLessons }),
          }).catch(() => {})
        }
        const cancelledIds = new Set(lessonsToCancel.map((l) => l.id))
        setLessons((prev) => prev.filter((l) => !cancelledIds.has(l.id)))
      } else {
        const res = await fetch('/api/calendar/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bookingId: lesson.id, googleEventId: lesson.googleEventId, wherebyMeetingId: lesson.wherebyMeetingId }),
        })
        if (res.ok) {
          setLessons((prev) => prev.filter((l) => l.id !== lesson.id))
        }
      }
      setLessonToCancel(null)
      setCancelAllFuture(false)
    } catch {
      // Silently fail
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    if (!loading && !user) window.location.href = '/'
  }, [user, loading])

  useEffect(() => {
    if (session?.access_token) fetchLessons()
  }, [session?.access_token, fetchLessons])

  // Fetch subscription status + trial status
  useEffect(() => {
    if (!session?.access_token) return
    const fetchSub = async () => {
      try {
        const [subRes, profileRes] = await Promise.all([
          fetch('/api/subscription', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          import('@/lib/supabase').then(({ supabase }) =>
            supabase.from('profiles').select('trial_completed_at').eq('id', user?.id).single()
          ),
        ])

        if (subRes.ok) {
          const data = await subRes.json()
          if (!data.subscription || data.subscription.status === 'cancelled') {
            setSubStatus('none')
          } else if (data.subscription.status === 'past_due') {
            setSubStatus('past_due')
          } else {
            setSubStatus('active')
          }
          if (data.balance) {
            setMinutesRemaining(data.balance.minutesRemaining)
            setMinutesPerMonth(data.balance.minutesPerMonth)
          }
        } else {
          setSubStatus('none')
        }

        setTrialCompleted(!!profileRes.data?.trial_completed_at)
      } catch {
        setSubStatus('none')
        setTrialCompleted(false)
      }
    }
    fetchSub()
  }, [session?.access_token, user?.id])

  useEffect(() => {
    if (activeTab === 'history' && session?.access_token && historyLessons.length === 0) {
      fetchHistory()
    }
  }, [activeTab, session?.access_token, fetchHistory, historyLessons.length])

  useEffect(() => {
    if (activeTab === 'vocab' && session?.access_token && vocabCards.length === 0) {
      fetchVocab()
    }
  }, [activeTab, session?.access_token, fetchVocab, vocabCards.length])

  const [news, setNews] = useState<(NewsItem & { title: string; body: string; posterName: string; posterAvatar: string })[]>([])

  // Fetch news from Supabase
  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        const items = (data.news || []).map((n: NewsItem) => ({
          ...n,
          title: locale === 'ja' ? (n.title_ja || n.title_en) : (n.title_en || n.title_ja),
          body: locale === 'ja' ? n.content_ja : n.content_en,
          posterName: n.poster_name || '',
          posterAvatar: n.poster_avatar_url || '',
        }))
        setNews(items)
      })
      .catch(() => setNews([]))
  }, [locale])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    const LAST_VISIT_KEY = 'eigo_last_visit'
    const lastVisit = typeof window !== 'undefined' ? localStorage.getItem(LAST_VISIT_KEY) : null
    const hoursSinceLastVisit = lastVisit ? (Date.now() - parseInt(lastVisit)) / (1000 * 60 * 60) : Infinity

    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_VISIT_KEY, Date.now().toString())
    }

    if (hoursSinceLastVisit >= 24 * 14) {
      return locale === 'ja' ? '久しぶり' : 'Long time no see'
    }
    if (hoursSinceLastVisit >= 24) {
      return locale === 'ja' ? 'おかえり' : 'Welcome back'
    }
    if (hour >= 5 && hour < 12) {
      return locale === 'ja' ? 'おはよう' : 'Good morning'
    } else if (hour >= 12 && hour < 17) {
      return locale === 'ja' ? 'こんにちは' : 'Good afternoon'
    } else {
      return locale === 'ja' ? 'こんばんは' : 'Good evening'
    }
  }, [locale])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </main>
    )
  }
  if (!user) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: t('tabHome') },
    { key: 'booking', label: t('tabBooking') },
    { key: 'history', label: t('tabHistory') },
    { key: 'vocab', label: locale === 'ja' ? 'フレーズ' : 'Phrases' },
  ]

  const nextLesson = lessons[0] || null
  const laterLessons = lessons.slice(1)
  const selectedNews = news.find(n => n.id === selectedNewsId) || null

  return (
    <>
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto">
          <Header />

          <section className="py-8 px-6">
            {/* Welcome */}
            <h1 className="text-2xl sm:text-4xl font-bold mb-8" style={{ color: 'var(--text)' }}>
              {greeting}
              {user && <span className="font-normal text-base sm:text-xl ml-2 sm:ml-3" style={{ color: 'var(--text-muted)' }}>{(user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || (user.email && !user.email.endsWith('@line.eigo.io') ? user.email.split('@')[0] : '') || '')}{locale === 'ja' ? 'さん' : ''}</span>}
            </h1>

            {/* Tab navigation */}
            <div className="flex gap-1 mb-8 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); if (key !== 'history') setSelectedTranscript(null) }}
                  className="px-3 sm:px-5 py-3 font-medium transition-colors relative text-sm sm:text-base whitespace-nowrap"
                  style={{
                    color: activeTab === key ? 'var(--text)' : 'var(--text-muted)',
                  }}
                >
                  {label}
                  {activeTab === key && (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'var(--accent)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
            {/* ═══ HOME TAB ═══ */}
            {activeTab === 'home' && (
              <motion.div
                key="tab-home"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
              <AnimatePresence mode="wait">
                {selectedNews ? (
                  /* ── News Detail View ── */
                  <motion.div
                    key={`news-${selectedNews.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Back button */}
                    <button
                      onClick={() => setSelectedNewsId(null)}
                      className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>←</span>
                      <span>{locale === 'ja' ? '戻る' : 'Back'}</span>
                    </button>

                    <SquircleBox cornerRadius={16} className="p-6 sm:p-8" style={{ background: 'var(--surface)' }}>
                      {/* Header: avatar + author + date */}
                      <div className="flex items-center gap-3 mb-5">
                        {selectedNews.posterAvatar ? (
                          <img
                            src={selectedNews.posterAvatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                          >
                            E
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{selectedNews.posterName || 'eigo.io'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{selectedNews.date}</p>
                        </div>
                      </div>

                      {/* Title */}
                      {selectedNews.title && (
                        <h2
                          className={`text-lg mb-4 ${locale === 'ja' ? 'font-bold' : 'font-semibold'}`}
                          style={{ color: 'var(--text)' }}
                        >
                          {selectedNews.title}
                        </h2>
                      )}

                      {/* Body */}
                      {selectedNews.body && (
                        <div
                          className="text-base news-body leading-relaxed"
                          style={{ color: 'var(--text-secondary)' }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNews.body) }}
                        />
                      )}
                    </SquircleBox>
                  </motion.div>
                ) : (
                  /* ── Default Home View (lessons + news list) ── */
                  <motion.div
                    key="home-default"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="space-y-8"
                  >
                    {/* Subscription / trial banner */}
                    {subStatus === 'none' && trialCompleted !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      >
                      <div
                        className="rounded-xl px-5 py-4"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {!trialCompleted ? (
                          /* User hasn't done trial yet */
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                                {locale === 'ja' ? '無料体験レッスンを予約しよう' : 'Book your free trial lesson'}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {locale === 'ja'
                                  ? '15分の体験後、48時間以内の入会で最大50%オフ'
                                  : 'Get up to 50% off when you subscribe within 48h of your trial'}
                              </p>
                            </div>
                            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                              <button
                                onClick={() => { setActiveTab('booking') }}
                                className="btn-trial shrink-0 px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                              >
                                {locale === 'ja' ? '体験予約' : 'Book trial'}
                              </button>
                            </Squircle>
                          </div>
                        ) : (
                          /* Trial done but no subscription */
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                                {locale === 'ja' ? 'プランを選んでレッスンを始めよう' : 'Choose a plan to start booking'}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {locale === 'ja'
                                  ? 'レッスンの予約にはプランの登録が必要です'
                                  : 'A subscription is required to book lessons'}
                              </p>
                            </div>
                            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                              <button
                                onClick={() => (window.location.href = '/plans')}
                                className="shrink-0 px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                              >
                                {locale === 'ja' ? 'プランを見る' : 'View plans'}
                              </button>
                            </Squircle>
                          </div>
                        )}
                      </div>
                      </motion.div>
                    )}


                    {/* Upcoming lessons — next lesson is hero, rest are compact */}
                    {loadingLessons ? (
                      <SquircleBox cornerRadius={12} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                      </SquircleBox>
                    ) : lessons.length === 0 ? (
                      <SquircleBox cornerRadius={16} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                        <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>{t('noUpcoming')}</p>
                        <button
                          onClick={() => setActiveTab('booking')}
                          className="text-sm font-medium transition-colors hover:opacity-80"
                          style={{ color: 'var(--accent)' }}
                        >
                          {locale === 'ja' ? '予約する →' : 'Book one →'}
                        </button>
                      </SquircleBox>
                    ) : (
                      <div className="space-y-3">
                        {nextLesson && (
                          <NextLessonCard
                            lesson={nextLesson}
                            locale={locale}
                            wherebyUrl={nextLesson.wherebyRoomUrl || wherebyUrl}
                            onCancel={setLessonToCancel}
                            onReschedule={rescheduleLesson}
                            isAdmin={isAdmin}
                          />
                        )}
                        {laterLessons.length > 0 && (
                          <>
                            {(showAllLessons ? laterLessons : laterLessons.slice(0, LESSONS_VISIBLE - 1)).map((lesson) => (
                              <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                locale={locale}
                                wherebyUrl={lesson.wherebyRoomUrl || wherebyUrl}
                                onCancel={setLessonToCancel}
                                onReschedule={rescheduleLesson}
                                isAdmin={isAdmin}
                              />
                            ))}
                            {!showAllLessons && laterLessons.length > LESSONS_VISIBLE - 1 && (
                              <button
                                onClick={() => setShowAllLessons(true)}
                                className="w-full py-3 text-sm font-medium transition-colors hover:opacity-80"
                                style={{ color: 'var(--accent)' }}
                              >
                                {locale === 'ja'
                                  ? `すべて表示（${lessons.length}件）`
                                  : `See all ${lessons.length} lessons`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* News BBS — collapsed rows, click to expand */}
                    {news.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>{t('news')}</h2>
                        <div>
                          {(showAllNews ? news : news.slice(0, NEWS_VISIBLE)).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => { markNewsRead(item.id); setSelectedNewsId(item.id) }}
                              className="w-full flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg text-left transition-colors news-bbs-row"
                              style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            >
                              {item.posterAvatar ? (
                                <img
                                  src={item.posterAvatar}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                                >
                                  E
                                </div>
                              )}
                              <span className="text-xs shrink-0" style={{ color: 'var(--text-subtle)' }}>{item.date}</span>
                              {item.title && (
                                <span
                                  className={`text-sm truncate ${locale === 'ja' ? 'font-semibold' : 'font-medium'}`}
                                  style={{ color: 'var(--text)' }}
                                >
                                  {item.title}
                                </span>
                              )}
                              <span
                                className={`ml-auto shrink-0 w-2 h-2 rounded-full ${readNewsIds.has(item.id) ? '' : 'news-unread-dot'}`}
                                style={{ background: readNewsIds.has(item.id) ? 'var(--text-disabled)' : 'var(--accent)' }}
                              />
                            </button>
                          ))}
                        </div>
                        {!showAllNews && news.length > NEWS_VISIBLE && (
                          <button
                            onClick={() => setShowAllNews(true)}
                            className="mt-3 text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: 'var(--accent)' }}
                          >
                            {locale === 'ja' ? 'もっと見る' : 'See more'}
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
            )}

            {/* ═══ BOOKING TAB ═══ */}
            {activeTab === 'booking' && (
              <motion.div
                key="tab-booking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
              {/* Minutes remaining badge */}
              {subStatus === 'active' && minutesRemaining !== null && (
                <div className="flex justify-end mb-3">
                  <span
                    className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{
                      background: minutesRemaining < 30 ? 'rgba(240, 96, 96, 0.1)' : 'rgba(0, 194, 184, 0.1)',
                      color: minutesRemaining < 30 ? 'var(--danger)' : 'var(--accent)',
                    }}
                  >
                    {locale === 'ja'
                      ? `${minutesRemaining}分残り`
                      : `${minutesRemaining} min left`}
                  </span>
                </div>
              )}
              <BookingCalendar
                selectedDuration={durationParam ? parseInt(durationParam) : undefined}
                onBookingComplete={() => { fetchLessons(); setLessonToReschedule(null); setActiveTab('home') }}
                rescheduleLesson={lessonToReschedule ? { id: lessonToReschedule.id, googleEventId: lessonToReschedule.googleEventId } : undefined}
                hasSubscription={subStatus === 'active'}
              />
              </motion.div>
            )}

            {/* ═══ HISTORY TAB ═══ */}
            {activeTab === 'history' && (
              <motion.div
                key="tab-history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
              <AnimatePresence mode="wait">
                {selectedTranscript ? (
                  /* ── Transcript Detail View ── */
                  <motion.div
                    key={`transcript-${selectedTranscript.lesson.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Back button */}
                    <button
                      onClick={() => setSelectedTranscript(null)}
                      className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>←</span>
                      <span>{locale === 'ja' ? '戻る' : 'Back'}</span>
                    </button>

                    <SquircleBox cornerRadius={16} className="p-6 sm:p-8" style={{ background: 'var(--surface)' }}>
                      {/* Header with lesson date/time */}
                      <div className="flex items-center gap-3 mb-5">
                        <div
                          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            {locale === 'ja' ? '文字起こし' : 'Transcript'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                            {new Date(`${selectedTranscript.lesson.date}T${selectedTranscript.lesson.startTime}`).toLocaleDateString(
                              locale === 'ja' ? 'ja-JP' : 'en-GB',
                              { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }
                            )}
                            {' · '}
                            {new Date(`${selectedTranscript.lesson.date}T${selectedTranscript.lesson.startTime}`).toLocaleTimeString(
                              locale === 'ja' ? 'ja-JP' : 'en-GB',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                            {' · '}
                            {selectedTranscript.lesson.durationMinutes} min
                          </p>
                        </div>
                      </div>

                      {/* Transcript content */}
                      <div className="space-y-4">
                        {selectedTranscript.content.split('\n').filter(line => line.trim()).map((line, i) => {
                          // Try to parse "Speaker: text" format
                          const speakerMatch = line.match(/^([^:]{1,30}):\s*(.+)/)
                          if (speakerMatch) {
                            return (
                              <div key={i}>
                                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                                  {speakerMatch[1]}
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                  {speakerMatch[2]}
                                </p>
                              </div>
                            )
                          }
                          return (
                            <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {line}
                            </p>
                          )
                        })}
                      </div>
                    </SquircleBox>
                  </motion.div>
                ) : (
                  /* ── History List View ── */
                  <motion.div
                    key="history-list"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                {loadingHistory ? (
                  <SquircleBox cornerRadius={12} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                  </SquircleBox>
                ) : historyLessons.length === 0 ? (
                  <SquircleBox cornerRadius={12} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>{t('noHistory')}</p>
                  </SquircleBox>
                ) : (
                  <>
                    <div className="space-y-3">
                      {historyLessons
                        .slice(historyPage * HISTORY_PER_PAGE, (historyPage + 1) * HISTORY_PER_PAGE)
                        .map((lesson) => (
                          <HistoryLessonCard
                            key={lesson.id}
                            lesson={lesson}
                            locale={locale}
                            session={session}
                            onViewTranscript={(l, content) => setSelectedTranscript({ lesson: l, content })}
                            onAddToDeck={addToDeck}
                            deckPhraseIds={deckPhraseIds}
                          />
                        ))}
                    </div>
                    {historyLessons.length > HISTORY_PER_PAGE && (
                      <div className="flex items-center justify-between mt-6">
                        <button
                          onClick={() => setHistoryPage((p) => p - 1)}
                          disabled={historyPage === 0}
                          className="text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-30"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ← {locale === 'ja' ? '前へ' : 'Previous'}
                        </button>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {historyPage + 1} / {Math.ceil(historyLessons.length / HISTORY_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setHistoryPage((p) => p + 1)}
                          disabled={(historyPage + 1) * HISTORY_PER_PAGE >= historyLessons.length}
                          className="text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-30"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {locale === 'ja' ? '次へ' : 'Next'} →
                        </button>
                      </div>
                    )}
                  </>
                )}
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
            )}

            {/* ═══ VOCAB TAB ═══ */}
            {activeTab === 'vocab' && (
              <motion.div
                key="tab-vocab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                {loadingVocab ? (
                  <SquircleBox cornerRadius={12} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                  </SquircleBox>
                ) : vocabCards.length === 0 ? (
                  <SquircleBox cornerRadius={16} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                    <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? 'まだフレーズがありません' : 'No phrases yet'}
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-subtle)' }}>
                      {locale === 'ja'
                        ? 'レッスン履歴からサマリーを生成して、フレーズをバンクに追加しましょう'
                        : 'Generate a summary from your lesson history and add phrases to your bank'}
                    </p>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--accent)' }}
                    >
                      {locale === 'ja' ? 'レッスン履歴へ →' : 'Go to history →'}
                    </button>
                  </SquircleBox>
                ) : reviewMode && reviewQueue.length > 0 ? (
                  /* ═══ REVIEW SESSION ═══ */
                  <>
                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => { setReviewMode(false); setReviewQueue([]) }}
                        className="text-sm font-medium transition-colors hover:opacity-80"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ← {locale === 'ja' ? '戻る' : 'Back'}
                      </button>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'var(--accent)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${((reviewIndex) / reviewQueue.length) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                        {reviewIndex + 1}/{reviewQueue.length}
                      </span>
                    </div>

                    {/* Review card */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={reviewQueue[reviewIndex]?.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                      >
                        <SquircleBox cornerRadius={16} className="overflow-hidden" style={{ background: 'var(--surface)' }}>
                          {(() => {
                            const card = reviewQueue[reviewIndex]
                            if (!card?.phrase) return null
                            return (
                              <>
                                {/* Question side */}
                                <button
                                  onClick={() => setReviewFlipped(true)}
                                  className="w-full text-left px-6 py-8"
                                  disabled={reviewFlipped}
                                >
                                  <p className="text-center text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
                                    {card.phrase.phrase_en}
                                  </p>
                                  <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {card.phrase.example_en}
                                  </p>
                                  {!reviewFlipped && (
                                    <p className="text-center text-xs mt-4" style={{ color: 'var(--text-subtle)' }}>
                                      {locale === 'ja' ? 'タップして答えを見る' : 'Tap to reveal answer'}
                                    </p>
                                  )}
                                </button>

                                {/* Answer side */}
                                <AnimatePresence>
                                  {reviewFlipped && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      transition={{ duration: 0.25 }}
                                    >
                                      <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <div className="px-6 py-5">
                                          <p className="text-center text-lg font-medium mb-1" style={{ color: 'var(--accent)' }}>
                                            {card.phrase.translation_ja}
                                          </p>
                                          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                            {locale === 'ja' ? card.phrase.explanation_ja : card.phrase.explanation_en}
                                          </p>
                                        </div>

                                        {/* Rating buttons */}
                                        <div className="px-4 pb-5">
                                          <p className="text-center text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                                            {locale === 'ja' ? 'どれくらい覚えていましたか？' : 'How well did you know this?'}
                                          </p>
                                          <div className="grid grid-cols-4 gap-2">
                                            {previewIntervals(card.interval_days ?? 1, card.ease_factor ?? 2.5).map(r => (
                                              <Squircle key={r.rating} asChild cornerRadius={10} cornerSmoothing={0.8}>
                                                <button
                                                  onClick={() => reviewCard(r.rating)}
                                                  disabled={reviewingCardId === card.id}
                                                  className="py-2.5 text-center transition-all hover:opacity-90 disabled:opacity-50"
                                                  style={{
                                                    background: r.rating === 1 ? 'rgba(239,68,68,0.15)'
                                                      : r.rating === 2 ? 'rgba(234,179,8,0.15)'
                                                      : r.rating === 3 ? 'rgba(59,130,246,0.15)'
                                                      : 'rgba(34,197,94,0.15)',
                                                    color: r.rating === 1 ? '#ef4444'
                                                      : r.rating === 2 ? '#ca8a04'
                                                      : r.rating === 3 ? '#3b82f6'
                                                      : '#16a34a',
                                                  }}
                                                >
                                                  <span className="text-xs font-semibold block">
                                                    {locale === 'ja' ? r.label_ja : r.label_en}
                                                  </span>
                                                  <span className="text-[10px] block mt-0.5 opacity-70">
                                                    {locale === 'ja' ? r.preview_ja : r.preview_en}
                                                  </span>
                                                </button>
                                              </Squircle>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            )
                          })()}
                        </SquircleBox>
                      </motion.div>
                    </AnimatePresence>
                  </>
                ) : (
                  /* ═══ PHRASE BANK (default view) ═══ */
                  <>
                    {/* Review banner */}
                    {dueCount > 0 && (
                      <SquircleBox cornerRadius={12} className="p-4 mb-4 flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {locale === 'ja'
                            ? `${dueCount}件のフレーズが復習可能です`
                            : `${dueCount} phrase${dueCount !== 1 ? 's' : ''} due for review`}
                        </p>
                        <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                          <button
                            onClick={startReview}
                            className="px-4 py-2 text-sm font-semibold shrink-0 transition-all hover:opacity-90"
                            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                          >
                            {locale === 'ja' ? '復習する' : 'Review'}
                          </button>
                        </Squircle>
                      </SquircleBox>
                    )}

                    {/* Stats bar */}
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {vocabCards.length} {locale === 'ja' ? 'フレーズ' : 'phrases'}
                      </span>
                      <div className="flex gap-1.5 ml-auto">
                        {(['all', 'learning', 'reviewing', 'mastered'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => { setVocabFilter(f); setVocabVisible(20) }}
                            className="px-2.5 py-1 text-xs font-medium rounded-full transition-all"
                            style={{
                              background: vocabFilter === f ? 'var(--accent)' : 'var(--surface)',
                              color: vocabFilter === f ? 'var(--selected-text)' : 'var(--text-muted)',
                            }}
                          >
                            {f === 'all' ? (locale === 'ja' ? 'すべて' : 'All')
                              : f === 'learning' ? (locale === 'ja' ? '学習中' : 'Learning')
                              : f === 'reviewing' ? (locale === 'ja' ? '復習中' : 'Reviewing')
                              : (locale === 'ja' ? 'マスター' : 'Mastered')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3">
                      {vocabCards
                        .filter(c => vocabFilter === 'all' || c.comfort_level === vocabFilter)
                        .slice(0, vocabVisible)
                        .map(card => (
                          <SquircleBox key={card.id} cornerRadius={12} className="overflow-hidden" style={{ background: 'var(--surface)' }}>
                            {/* Card front — tap to flip */}
                            <button
                              onClick={() => setFlippedCardId(flippedCardId === card.id ? null : card.id)}
                              className="w-full text-left px-5 py-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="font-medium text-base" style={{ color: 'var(--text)' }}>
                                    {card.phrase?.phrase_en}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {flippedCardId !== card.id && (
                                      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                        {locale === 'ja' ? 'タップして詳細を見る' : 'Tap to reveal'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-subtle)' }}>
                                    {formatNextReview(card.next_review_at, locale)}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-subtle)' }}>
                                    {card.phrase?.category}
                                  </span>
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      background: card.comfort_level === 'mastered' ? '#22c55e'
                                        : card.comfort_level === 'reviewing' ? '#facc15'
                                        : 'var(--accent)',
                                    }}
                                  />
                                </div>
                              </div>
                            </button>

                            {/* Card back — revealed content */}
                            <AnimatePresence>
                              {flippedCardId === card.id && card.phrase && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-4 space-y-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <div className="pt-3">
                                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent)' }}>
                                        {card.phrase.translation_ja}
                                      </p>
                                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {card.phrase.example_en}
                                      </p>
                                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                                        {locale === 'ja' ? card.phrase.explanation_ja : card.phrase.explanation_en}
                                      </p>
                                    </div>

                                    {/* Card info + remove */}
                                    <div className="flex items-center justify-between pt-1">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                          {locale === 'ja' ? '復習回数' : 'Reviews'}: {card.review_count}
                                        </span>
                                        <span
                                          className="text-xs px-2 py-0.5 rounded-full"
                                          style={{
                                            background: card.comfort_level === 'mastered' ? 'rgba(34,197,94,0.15)'
                                              : card.comfort_level === 'reviewing' ? 'rgba(234,179,8,0.15)'
                                              : 'rgba(59,130,246,0.15)',
                                            color: card.comfort_level === 'mastered' ? '#16a34a'
                                              : card.comfort_level === 'reviewing' ? '#ca8a04'
                                              : '#3b82f6',
                                          }}
                                        >
                                          {card.comfort_level === 'learning' ? (locale === 'ja' ? '学習中' : 'Learning')
                                            : card.comfort_level === 'reviewing' ? (locale === 'ja' ? '復習中' : 'Reviewing')
                                            : (locale === 'ja' ? 'マスター' : 'Mastered')}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => removeCard(card.id)}
                                        className="text-xs transition-colors hover:opacity-80"
                                        style={{ color: 'var(--text-subtle)' }}
                                      >
                                        {locale === 'ja' ? '削除' : 'Remove'}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </SquircleBox>
                        ))}
                    </div>

                    {/* Show more */}
                    {(() => {
                      const filtered = vocabCards.filter(c => vocabFilter === 'all' || c.comfort_level === vocabFilter)
                      return filtered.length > vocabVisible && (
                        <button
                          onClick={() => setVocabVisible(prev => prev + 20)}
                          className="w-full mt-4 py-2.5 text-sm font-medium rounded-lg transition-colors hover:opacity-80"
                          style={{ color: 'var(--accent)' }}
                        >
                          {locale === 'ja'
                            ? `さらに表示（残り${filtered.length - vocabVisible}件）`
                            : `Show more (${filtered.length - vocabVisible} remaining)`}
                        </button>
                      )
                    })()}
                  </>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {lessonToCancel && (
        <CancelModal
          lesson={lessonToCancel}
          onConfirm={() => cancelLesson(lessonToCancel)}
          onClose={() => { setLessonToCancel(null); setCancelAllFuture(false) }}
          cancelling={cancellingId === lessonToCancel.id}
          locale={locale}
          cancelAll={cancelAllFuture}
          setCancelAll={setCancelAllFuture}
        />
      )}
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  )
}
