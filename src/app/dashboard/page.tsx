'use client'

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'
import { isAdminEmail } from '@/lib/admin-redirect'
import { renderMarkdown } from '@/lib/markdown'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import SquircleCard from '@/components/ui/SquircleCard'
import SkeletonCard from '@/components/ui/SkeletonCard'
import BookingCalendar, { type BookingResult } from '@/components/BookingCalendar'
import { motion, AnimatePresence } from 'framer-motion'
import { formatNextReview, previewIntervals, type ReviewRating } from '@/lib/srs'
import HomeView from '@/components/dashboard/HomeView'
import PronAnnounceArt from '@/components/dashboard/PronAnnounceArt'
import { useDashboardNav } from '@/context/DashboardNavContext'

type Lesson = {
  id: string
  date: string
  startTime: string
  durationMinutes: number
  status: string
  googleEventId: string | null
  wherebyRoomUrl: string | null
  wherebyMeetingId: string | null
  hasSummary?: boolean
  keyTopics?: string[]
  phrases?: string[]
}


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

type NewsCard = NewsItem & { title: string; body: string; posterName: string; posterAvatar: string }

// ─── Cancel Modal ───
function CancelModal({
  lesson, onConfirm, onClose, cancelling, locale, cancelAll, setCancelAll,
}: {
  lesson: Lesson; onConfirm: () => void; onClose: () => void; cancelling: boolean; locale: string; cancelAll: boolean; setCancelAll: (v: boolean) => void
}) {
  const date = new Date(`${lesson.date}T${lesson.startTime}+09:00`)
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
            className="relative inline-flex items-center shrink-0 rounded-full transition-colors"
            style={{ width: '40px', height: '24px', background: cancelAll ? 'var(--danger)' : 'var(--surface-hover)' }}
          >
            <span
              className={`absolute rounded-full transition-transform shadow-sm ${cancelAll ? '' : 'toggle-handle-off'}`}
              style={{
                width: '16px', height: '16px',
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

// ─── Export phrases (CSV / Anki TSV) ───
function ExportPhrasesButton({ cards, locale }: { cards: VocabCard[]; locale: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    const esc = (v: string | number | null | undefined) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = ['Phrase (EN)', 'Example (EN)', 'Translation (JA)', 'Explanation (EN)', 'Explanation (JA)', 'Category', 'Comfort level', 'Review count', 'Interval (days)', 'Next review']
    const rows = cards.map((c) => [
      c.phrase?.phrase_en, c.phrase?.example_en, c.phrase?.translation_ja,
      c.phrase?.explanation_en, c.phrase?.explanation_ja, c.phrase?.category,
      c.comfort_level, c.review_count, c.interval_days, (c.next_review_at || '').slice(0, 10),
    ].map(esc).join(','))
    // Leading BOM so Excel decodes the Japanese text as UTF-8
    download('\uFEFF' + [header.map(esc).join(','), ...rows].join('\n'), 'eigo-phrases.csv', 'text/csv;charset=utf-8')
    setOpen(false)
  }

  const exportAnki = () => {
    const clean = (s?: string | null) => (s ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')
    const rows = cards.map((c) => {
      const front = clean(c.phrase?.phrase_en)
      const backParts = [clean(c.phrase?.translation_ja)]
      if (c.phrase?.example_en) backParts.push(`<i>${clean(c.phrase.example_en)}</i>`)
      if (c.phrase?.explanation_ja) backParts.push(clean(c.phrase.explanation_ja))
      const tag = (c.phrase?.category || '').trim().replace(/\s+/g, '-')
      return [front, backParts.join('<br><br>'), tag].join('\t')
    })
    // File header directives understood by Anki's import dialog
    const directives = ['#separator:tab', '#html:true', '#columns:Front\tBack\tTags', '#tags column:3']
    download([...directives, ...rows].join('\n'), 'eigo-phrases-anki.txt', 'text/plain;charset=utf-8')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={cards.length === 0}
        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95] disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100"
        style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {locale === 'ja' ? 'エクスポート' : 'Export as…'}
      </button>
      {open && (
        <div
          className="modal-card absolute right-0 top-full mt-2 z-50 p-1.5 rounded-2xl"
          style={{ minWidth: 190, background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
        >
          <button onClick={exportCsv} className="sidebar-item w-full text-left px-3 py-2 text-sm rounded-xl" style={{ color: 'var(--text)' }}>
            CSV
            <span className="block text-xs" style={{ color: 'var(--text-subtle)' }}>{locale === 'ja' ? 'Excel・スプレッドシート用' : 'For Excel / Sheets'}</span>
          </button>
          <button onClick={exportAnki} className="sidebar-item w-full text-left px-3 py-2 text-sm rounded-xl" style={{ color: 'var(--text)' }}>
            Anki
            <span className="block text-xs" style={{ color: 'var(--text-subtle)' }}>{locale === 'ja' ? 'Ankiにインポートできるファイル' : 'Importable flashcard file'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── History Lesson Card (with accordion summary + phrases) ───
function HistoryLessonCard({
  lesson, locale, session, onViewTranscript, onAddToDeck, deckPhraseIds,
}: {
  lesson: Lesson; locale: string; session: { access_token: string } | null
  onViewTranscript: (lesson: Lesson, content: string, cleanedContent?: string) => void
  onAddToDeck?: (phraseId: string) => void
  deckPhraseIds?: Set<string>
}) {
  const [recordingState, setRecordingState] = useState<'idle' | 'loading' | 'ready' | 'none' | 'error'>('idle')
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloadingType, setDownloadingType] = useState<'video' | 'audio' | null>(null)
  const downloadBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [transcriptState, setTranscriptState] = useState<'idle' | 'loading' | 'cleaning' | 'processing' | 'ready' | 'none' | 'error'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`eigo_transcript_${lesson.id}`)
        if (stored === 'ready') return 'ready'
      } catch { /* ignore */ }
    }
    return 'idle'
  })
  const [transcriptContent, setTranscriptContent] = useState<string | null>(null)
  const [cleanedTranscriptContent, setCleanedTranscriptContent] = useState<string | undefined>(undefined)

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

  const date = new Date(`${lesson.date}T${lesson.startTime}+09:00`)
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
        } else {
          // Summary was deleted or doesn't exist — reset to idle
          setAnalysisState('idle')
          try { localStorage.removeItem(`eigo_analysis_${lesson.id}`) } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [lesson.id, session?.access_token, summary])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!downloadOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        downloadBtnRef.current && !downloadBtnRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setDownloadOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [downloadOpen])

  const downloadVideo = async () => {
    if (!session?.access_token) return
    setDownloadOpen(false)
    setDownloadingType('video')
    setRecordingState('loading')
    try {
      const res = await fetch(
        `/api/recordings/audio?bookingId=${lesson.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      )
      const data = await res.json()
      if (data.accessLink) {
        const a = document.createElement('a')
        a.href = data.accessLink
        a.download = `eigo-lesson-${lesson.date}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setRecordingState('ready')
      } else {
        setRecordingState('none')
      }
    } catch {
      setRecordingState('error')
    } finally {
      setDownloadingType(null)
    }
  }

  const downloadAudio = async () => {
    if (!session?.access_token) return
    setDownloadOpen(false)
    setDownloadingType('audio')
    setRecordingState('loading')
    try {
      const res = await fetch(
        `/api/recordings/audio-extract?bookingId=${lesson.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      )
      if (!res.ok) {
        setRecordingState('error')
        return
      }
      // Stream the response as a file download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eigo-lesson-${lesson.date}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setRecordingState('ready')
    } catch {
      setRecordingState('error')
    } finally {
      setDownloadingType(null)
    }
  }

  // Prefetch transcript content silently in the background.
  const prefetchTranscript = useCallback(async () => {
    if (!session?.access_token) return
    if (transcriptContent) return // already loaded
    if (transcriptState !== 'idle' && transcriptState !== 'ready') return
    try {
      const res = await fetch(`/api/transcriptions?bookingId=${lesson.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.status === 'ready' && data.content) {
        setTranscriptContent(data.content)
        setCleanedTranscriptContent(data.cleanedContent || undefined)
        setTranscriptState('ready')
        try { localStorage.setItem(`eigo_transcript_${lesson.id}`, 'ready') } catch { /* ignore */ }
      } else if (data.status === 'no_recording') {
        setTranscriptState('none')
      }
      // Ignore 'processing' or 'failed' on prefetch — don't poll silently
    } catch {
      // Silent fail
    }
  }, [lesson.id, session?.access_token, transcriptContent, transcriptState])

  // Prefetch transcript once when user shows intent (hover/focus/touch).
  const prefetchedRef = useRef(false)
  const handlePrefetch = useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    prefetchTranscript()
  }, [prefetchTranscript])

  // Run cleanup on a raw transcript and open the viewer with the result.
  // Falls back to raw if cleanup fails so the user always sees something.
  const runCleanupAndShow = async (rawContent: string) => {
    if (!session?.access_token) return
    setTranscriptState('cleaning')
    try {
      const res = await fetch('/api/transcriptions/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId: lesson.id }),
      })
      const data = await res.json()
      if (data.status === 'ready' && data.cleanedContent) {
        setCleanedTranscriptContent(data.cleanedContent)
        setTranscriptState('ready')
        onViewTranscript(lesson, rawContent, data.cleanedContent)
        try { localStorage.setItem(`eigo_transcript_${lesson.id}`, 'ready') } catch { /* ignore */ }
      } else {
        // Cleanup failed — still show the raw transcript so the user isn't stuck
        setTranscriptState('ready')
        onViewTranscript(lesson, rawContent, undefined)
        try { localStorage.setItem(`eigo_transcript_${lesson.id}`, 'ready') } catch { /* ignore */ }
      }
    } catch {
      // Network error — still show raw
      setTranscriptState('ready')
      onViewTranscript(lesson, rawContent, undefined)
      try { localStorage.setItem(`eigo_transcript_${lesson.id}`, 'ready') } catch { /* ignore */ }
    }
  }

  const fetchTranscript = async () => {
    if (!session?.access_token) return

    // If we already have raw + cleaned, open immediately
    if (transcriptContent && cleanedTranscriptContent) {
      onViewTranscript(lesson, transcriptContent, cleanedTranscriptContent)
      return
    }

    // If we have raw but no cleaned version yet, trigger cleanup now
    if (transcriptContent && !cleanedTranscriptContent) {
      await runCleanupAndShow(transcriptContent)
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
        if (data.cleanedContent) {
          // Already cleaned — open immediately
          setCleanedTranscriptContent(data.cleanedContent)
          setTranscriptState('ready')
          onViewTranscript(lesson, data.content, data.cleanedContent)
          try { localStorage.setItem(`eigo_transcript_${lesson.id}`, 'ready') } catch { /* ignore */ }
        } else {
          // Raw only — run cleanup, then open
          await runCleanupAndShow(data.content)
        }
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
      case 'cleaning': return locale === 'ja' ? '整理中...' : 'Cleaning...'
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
      <SquircleBox
        cornerRadius={16}
        style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
        onFocus={handlePrefetch}
      >
        {/* Main card row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
          <div className="shrink-0">
            <p className="font-medium" style={{ color: 'var(--text)' }}>{dateStr}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{timeStr} · {lesson.durationMinutes} min</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lesson.wherebyRoomUrl && (
              <>
                {/* Transcript button */}
                <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <button
                    onClick={fetchTranscript}
                    disabled={transcriptState === 'loading' || transcriptState === 'cleaning' || transcriptState === 'processing' || transcriptState === 'none'}
                    className="px-3 py-1.5 text-xs font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 flex items-center gap-1.5"
                    style={{
                      background: 'var(--panel)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--edge)',
                      boxShadow: 'var(--card-shadow)',
                    }}
                  >
                    {(transcriptState === 'loading' || transcriptState === 'cleaning' || transcriptState === 'processing') && (
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
                      className="px-3 py-1.5 text-xs font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 flex items-center gap-1.5"
                      style={{
                        background: analysisState === 'ready' ? 'var(--accent)' : 'var(--panel)',
                        color: analysisState === 'ready' ? 'var(--selected-text)' : 'var(--text-muted)',
                        border: analysisState === 'ready' ? '1px solid transparent' : '1px solid var(--edge)',
                        boxShadow: analysisState === 'ready' ? 'none' : 'var(--card-shadow)',
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

                {/* Download recording button */}
                <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <button
                    ref={downloadBtnRef}
                    onClick={() => {
                      if (recordingState === 'loading') return
                      setDownloadOpen(!downloadOpen)
                    }}
                    disabled={recordingState === 'loading' || recordingState === 'none'}
                    className="px-3 py-1.5 text-xs font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 flex items-center gap-1.5"
                    style={{
                      background: recordingState === 'error' ? 'var(--danger)' : 'var(--panel)',
                      color: recordingState === 'error' ? 'var(--selected-text)' : recordingState === 'none' ? 'var(--text-muted)' : 'var(--text)',
                      border: recordingState === 'error' ? '1px solid transparent' : '1px solid var(--edge)',
                      boxShadow: recordingState === 'error' ? 'none' : 'var(--card-shadow)',
                    }}
                  >
                    {recordingState === 'loading' && <span className="spinner-sm" />}
                    {recordingState === 'loading'
                      ? (downloadingType === 'audio'
                          ? (locale === 'ja' ? '音声を変換中...' : 'Extracting audio...')
                          : (locale === 'ja' ? 'ダウンロード中...' : 'Downloading...'))
                      : recordingState === 'none' ? (locale === 'ja' ? '録画なし' : 'No recording')
                      : recordingState === 'error' ? (locale === 'ja' ? '再試行' : 'Retry')
                      : (locale === 'ja' ? 'ダウンロード' : 'Download')}
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
                        className="px-2.5 py-0.5 text-xs font-medium rounded-full"
                        style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
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
                        <div key={i} className="text-sm rounded-xl p-3" style={{ background: 'var(--card-inset)' }}>
                          <div className="flex items-start gap-2 mb-1">
                            <span className="shrink-0 flex items-center justify-center" style={{ width: '22px', height: '22px', fontSize: '14px', lineHeight: '22px' }}>❌</span>
                            <span className="pt-0.5" style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{m.example_student}</span>
                          </div>
                          <div className="flex items-start gap-2 mb-1.5">
                            <span className="shrink-0 flex items-center justify-center" style={{ width: '22px', height: '22px', fontSize: '14px', lineHeight: '22px' }}>✅</span>
                            <span className="pt-0.5" style={{ color: 'var(--text)' }}>{m.correction}</span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text)', paddingLeft: '30px' }}>
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
                            style={{ background: selectedPhrase?.id === phrase.id ? 'var(--inset)' : 'transparent' }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate" style={{ color: 'var(--text)' }}>{phrase.phrase_en}</span>
                              <span className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                                {phrase.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {onAddToDeck && (
                                <Squircle asChild cornerRadius={6} cornerSmoothing={0.8}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onAddToDeck(phrase.id) }}
                                    disabled={deckPhraseIds?.has(phrase.id)}
                                    className="px-2 py-1 text-xs font-medium transition-all duration-[120ms] ease-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
                                    style={{
                                      background: deckPhraseIds?.has(phrase.id) ? 'var(--inset)' : 'var(--accent)',
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
                                  <p className="text-xs" style={{ color: 'var(--text)' }}>
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
      {downloadOpen && downloadBtnRef.current && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50"
          style={{
            width: 'fit-content',
            top: downloadBtnRef.current.getBoundingClientRect().bottom + 4,
            right: window.innerWidth - downloadBtnRef.current.getBoundingClientRect().right,
          }}
        >
          <div
            className="modal-card p-1.5 rounded-2xl"
            style={{ minWidth: 190, background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
          >
            <button onClick={downloadAudio} className="sidebar-item w-full text-left px-3 py-2 text-sm rounded-xl" style={{ color: 'var(--text)' }}>
              MP3
              <span className="block text-xs" style={{ color: 'var(--text-subtle)' }}>{locale === 'ja' ? '音声ファイル' : 'Audio file'}</span>
            </button>
            <button onClick={downloadVideo} className="sidebar-item w-full text-left px-3 py-2 text-sm rounded-xl" style={{ color: 'var(--text)' }}>
              MP4
              <span className="block text-xs" style={{ color: 'var(--text-subtle)' }}>{locale === 'ja' ? '動画ファイル' : 'Video file'}</span>
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Dashboard Content ───
function DashboardContent() {
  const { user, session, loading } = useAuth()
  const { t, locale } = useLanguage()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const durationParam = searchParams.get('duration')
  const tabParam = searchParams.get('tab')
  // ?preview=announce — force-show the course announcement (no flag stamped)
  const previewParam = searchParams.get('preview')

  const isAdmin = isAdminEmail(user?.email)

  // Deep link: /dashboard?tab=booking (used by the course upsell modal)
  useEffect(() => {
    if (tabParam === 'booking') setActiveTab('booking')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam])

  useEffect(() => {
    if (previewParam === 'announce') setPronAnnounce({ freeLessonId: null })
  }, [previewParam])
  const router = useRouter()
  const { activeTab, setActiveTab, setIndicators } = useDashboardNav()
  // One-time "How's your L & R?" announcement for the pronunciation course:
  // shown once ever (profiles.pron_announce_seen_at), only while published.
  const [pronAnnounce, setPronAnnounce] = useState<{ freeLessonId: string | null } | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [historyLessons, setHistoryLessons] = useState<Lesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [lessonToCancel, setLessonToCancel] = useState<Lesson | null>(null)
  const [cancelAllFuture, setCancelAllFuture] = useState(false)
  const [news, setNews] = useState<NewsCard[]>([])

  useEffect(() => {
    if (!session?.access_token) return
    const headers = { Authorization: `Bearer ${session.access_token}` }
    fetch('/api/courses/pron-status', { headers })
      .then(r => r.json())
      .then(s => {
        if (!s || s.error || s.announceSeen) return
        // only announce a published course; the list API hides drafts
        return fetch('/api/courses?exam=pronunciation', { headers })
          .then(r => r.json())
          .then(d => {
            const c = (d.courses ?? []).find((x: { slug: string }) => x.slug === 'pronunciation')
            if (!c) return
            const free = c.levels?.flatMap((l: { lessons: { id: string; free: boolean }[] }) => l.lessons).find((le: { free: boolean }) => le.free)
            setPronAnnounce({ freeLessonId: free?.id ?? null })
            // stamp immediately: "only show once" means once, even if they
            // close the tab instead of tapping a button
            fetch('/api/courses/pron-status', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ announce_seen: true }),
            }).catch(() => {})
          })
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])
  const [loadingNews, setLoadingNews] = useState(true)
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set())
  const [historyPage, setHistoryPage] = useState(0)
  const [historySearch, setHistorySearch] = useState('')
  const [historySort, setHistorySort] = useState<'newest' | 'oldest'>('newest')
  const [lessonToReschedule, setLessonToReschedule] = useState<Lesson | null>(null)
  const [selectedTranscript, setSelectedTranscript] = useState<{ lesson: Lesson; content: string; cleanedContent?: string } | null>(null)
  const [transcriptView, setTranscriptView] = useState<'clean' | 'original'>('clean')
  const [cleaningTranscript, setCleaningTranscript] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState(false)
  const [bookingResultModal, setBookingResultModal] = useState<BookingResult | null>(null)
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
  const [trialCompleted, setTrialCompleted] = useState<boolean | null>(null) // null = loading
  const HISTORY_PER_PAGE = 10

  const wherebyUrl = process.env.NEXT_PUBLIC_WHEREBY_ROOM_URL || ''

  // If user navigated with ?duration= or ?tab=booking, jump to booking tab
  useEffect(() => {
    if (durationParam) setActiveTab('booking')
    else if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab')
      if (tabParam === 'booking') setActiveTab('booking')
    }
  }, [durationParam])

  // Stale-while-revalidate: hydrate the last known lessons/news from
  // localStorage as soon as we know who the user is, so the home view shows
  // content immediately while the live fetches (calendar API is slow) run in
  // the background. Keys are per-user so shared browsers never leak data.
  const hydratedFromCache = useRef(false)
  useEffect(() => {
    if (!user?.id || hydratedFromCache.current) return
    hydratedFromCache.current = true
    /* eslint-disable react-hooks/set-state-in-effect -- one-time cache hydration on mount */
    try {
      const cachedLessons = localStorage.getItem(`eigo_cache_lessons_${user.id}`)
      if (cachedLessons) setLessons(JSON.parse(cachedLessons))
      const cachedNews = localStorage.getItem(`eigo_cache_news_${locale}`)
      if (cachedNews) setNews(JSON.parse(cachedNews))
    } catch { /* ignore corrupt cache */ }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user?.id, locale])

  const fetchLessons = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingLessons(true)
    try {
      const res = await fetch('/api/calendar/upcoming', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setLessons(data.lessons || [])
      if (user?.id) {
        try { localStorage.setItem(`eigo_cache_lessons_${user.id}`, JSON.stringify(data.lessons || [])) } catch { /* ignore */ }
      }
    } catch {
      setLessons([])
    } finally {
      setLoadingLessons(false)
    }
  }, [session?.access_token, user?.id])

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

  // History stats (always from the full set, not the filtered view)
  const historyStats = useMemo(() => {
    const minutes = historyLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0)
    const counts = new Map<string, number>()
    for (const l of historyLessons) {
      for (const raw of l.keyTopics || []) {
        const topic = raw.trim()
        if (topic) counts.set(topic, (counts.get(topic) || 0) + 1)
      }
    }
    const topTopics = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([topic]) => topic)
    return { count: historyLessons.length, minutes, topTopics }
  }, [historyLessons])

  // Searchable text per lesson: topics, phrases, and the date in several
  // forms — ISO (2026-03-24), the card's display format (Tue 24 Mar), and a
  // long form (24 March 2026) — so users can search what they see.
  const historySearchIndex = useMemo(() => {
    const loc = locale === 'ja' ? 'ja-JP' : 'en-GB'
    const map = new Map<string, string>()
    for (const l of historyLessons) {
      const d = new Date(`${l.date}T${l.startTime}+09:00`)
      const parts = [
        l.date,
        d.toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' }),
        d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }),
        ...(l.keyTopics || []),
        ...(l.phrases || []),
      ]
      map.set(l.id, parts.join(' ').toLowerCase())
    }
    return map
  }, [historyLessons, locale])

  // Search and newest/oldest sort, applied before pagination
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    const filtered = q
      ? historyLessons.filter((l) => (historySearchIndex.get(l.id) || '').includes(q))
      : historyLessons
    return [...filtered].sort((a, b) => {
      const cmp = `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
      return historySort === 'newest' ? -cmp : cmp
    })
  }, [historyLessons, historySearch, historySort, historySearchIndex])

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

  // Fetch history and vocab on mount so tab indicators (unsummarized lessons,
  // phrases due for review) are accurate before the user visits those tabs
  useEffect(() => {
    if (session?.access_token) {
      fetchHistory()
      fetchVocab()
    }
  }, [session?.access_token, fetchHistory, fetchVocab])

  // Surface tab indicators (phrases due, lessons awaiting a summary) to the sidebar.
  useEffect(() => {
    const unsummarized = historyLessons.filter(l => l.hasSummary === false).length
    setIndicators({ vocabDue: dueCount, historyUnsummarized: unsummarized })
  }, [dueCount, historyLessons, setIndicators])

  // News (shown on the home view, below upcoming lessons)
  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        const items: NewsCard[] = (data.news || []).map((n: NewsItem) => ({
          ...n,
          title: locale === 'ja' ? (n.title_ja || n.title_en) : (n.title_en || n.title_ja),
          body: locale === 'ja' ? n.content_ja : n.content_en,
          posterName: n.poster_name || '',
          posterAvatar: n.poster_avatar_url || '',
        }))
        setNews(items)
        try { localStorage.setItem(`eigo_cache_news_${locale}`, JSON.stringify(items)) } catch { /* ignore */ }
      })
      .catch(() => { /* keep whatever is shown (cached or empty) */ })
      .finally(() => setLoadingNews(false))
  }, [locale])

  const readNewsKey = user?.id ? `eigo_read_news_${user.id}` : null
  useEffect(() => {
    if (!readNewsKey) return
    try {
      const stored = localStorage.getItem(readNewsKey)
      if (stored) setReadNewsIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [readNewsKey])

  const markNewsRead = useCallback((id: string) => {
    setReadNewsIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      if (readNewsKey) {
        try { localStorage.setItem(readNewsKey, JSON.stringify([...next])) } catch { /* ignore */ }
      }
      return next
    })
  }, [readNewsKey])

  const selectedNews = news.find((n) => n.id === selectedNewsId) || null

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }
  if (!user) return null

  const firstName = (user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || (user.email && !user.email.endsWith('@line.eigo.io') ? user.email.split('@')[0] : '') || '')
  const tabTitle = activeTab === 'history'
    ? (locale === 'ja' ? '履歴' : 'History')
    : activeTab === 'vocab'
      ? (locale === 'ja' ? 'フレーズ' : 'Phrases')
      : ''

  return (
    <>
      <section className="pt-12 pb-8">
        {/* Shared content container — constant width so switching tabs never
            reflows. The Book tab narrows its OWN content (max-w-4xl) instead, so
            navigation stays seamless (no visible shrink of the container). */}
        <div className="max-w-6xl mx-auto w-full px-4">
            {/* Each tab renders its own heading inside its animated block so the
                page (including the title) fades in/out together — Home has its
                centered welcome, History/Phrases their title, Book none. */}
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
                <HomeView
                  locale={locale}
                  greeting={greeting}
                  firstName={firstName}
                  subStatus={subStatus}
                  trialCompleted={trialCompleted}
                  lessons={lessons}
                  loadingLessons={loadingLessons}
                  wherebyUrl={wherebyUrl}
                  isAdmin={isAdmin}
                  onBook={() => setActiveTab('booking')}
                  onReviewPhrases={() => setActiveTab('vocab')}
                  onTakeTests={() => router.push('/dashboard/tests')}
                  onViewPlans={() => (window.location.href = '/plans')}
                  onCancelLesson={setLessonToCancel}
                  onRescheduleLesson={rescheduleLesson}
                  news={news}
                  loadingNews={loadingNews}
                  readNewsIds={readNewsIds}
                  onOpenNews={(id) => { markNewsRead(id); setSelectedNewsId(id) }}
                />
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
              <div className="w-full max-w-4xl mx-auto">
                {/* Title row — title left, minutes-remaining badge right */}
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>
                    {locale === 'ja' ? '予約' : 'Book'}
                  </h1>
                  {subStatus === 'active' && minutesRemaining !== null && (
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
                  )}
                </div>
                <BookingCalendar
                  selectedDuration={durationParam ? parseInt(durationParam) : undefined}
                  onBookingComplete={(result) => { fetchLessons(); setLessonToReschedule(null); setActiveTab('home'); if (result) setBookingResultModal(result) }}
                  rescheduleLesson={lessonToReschedule ? { id: lessonToReschedule.id, googleEventId: lessonToReschedule.googleEventId } : undefined}
                  hasSubscription={subStatus === 'active'}
                />
              </div>
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
              <h1 className="text-2xl sm:text-4xl font-bold mb-8" style={{ color: 'var(--text)' }}>{tabTitle}</h1>
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

                    <SquircleCard radius={20} className="p-6 sm:p-8">
                      {/* Header with lesson date/time */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        {/* Top row: title + info */}
                        <div className="flex items-center gap-3">
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
                              {new Date(`${selectedTranscript.lesson.date}T${selectedTranscript.lesson.startTime}+09:00`).toLocaleDateString(
                                locale === 'ja' ? 'ja-JP' : 'en-GB',
                                { weekday: 'short', day: 'numeric', month: 'short' }
                              )}
                              {' · '}
                              {new Date(`${selectedTranscript.lesson.date}T${selectedTranscript.lesson.startTime}+09:00`).toLocaleTimeString(
                                locale === 'ja' ? 'ja-JP' : 'en-GB',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                              {' · '}
                              {selectedTranscript.lesson.durationMinutes} min
                            </p>
                          </div>
                        </div>

                        {/* Action buttons row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Copy */}
                          <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                            <button
                              onClick={() => {
                                const text = transcriptView === 'clean' && selectedTranscript.cleanedContent
                                  ? selectedTranscript.cleanedContent
                                  : selectedTranscript.content
                                navigator.clipboard.writeText(text)
                                setCopiedTranscript(true)
                                setTimeout(() => setCopiedTranscript(false), 1500)
                              }}
                              className="w-8 h-8 flex items-center justify-center transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
                              style={{ background: 'var(--panel)', border: '1px solid var(--edge)', boxShadow: 'var(--card-shadow)', color: copiedTranscript ? 'var(--accent)' : 'var(--text-muted)' }}
                              title={locale === 'ja' ? 'コピー' : 'Copy'}
                            >
                              {copiedTranscript ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </Squircle>
                          {/* Download */}
                          <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                            <button
                              onClick={() => {
                                const text = transcriptView === 'clean' && selectedTranscript.cleanedContent
                                  ? selectedTranscript.cleanedContent
                                  : selectedTranscript.content
                                const dateStr = selectedTranscript.lesson.date
                                const blob = new Blob([text], { type: 'text/markdown' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `transcript-${dateStr}.md`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                              className="w-8 h-8 flex items-center justify-center transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
                              style={{ background: 'var(--panel)', border: '1px solid var(--edge)', boxShadow: 'var(--card-shadow)', color: 'var(--text-muted)' }}
                              title={locale === 'ja' ? 'ダウンロード' : 'Download'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                          </Squircle>
                          {/* Clean / Original toggle or Clean up button */}
                          {selectedTranscript.cleanedContent ? (
                            <div
                              className="flex h-8 p-0.5 ml-1 items-center rounded-lg"
                              style={{ background: 'var(--inset)', border: '1px solid var(--edge)' }}
                            >
                              <button
                                onClick={() => setTranscriptView('clean')}
                                className="h-full px-3 text-xs font-medium flex items-center rounded-md"
                                style={{
                                  background: transcriptView === 'clean' ? 'var(--card)' : 'transparent',
                                  boxShadow: transcriptView === 'clean' ? 'var(--card-shadow)' : 'none',
                                  color: transcriptView === 'clean' ? 'var(--text)' : 'var(--text-muted)',
                                }}
                              >
                                {locale === 'ja' ? '整理済み' : 'Clean'}
                              </button>
                              <button
                                onClick={() => setTranscriptView('original')}
                                className="h-full px-3 text-xs font-medium flex items-center rounded-md"
                                style={{
                                  background: transcriptView === 'original' ? 'var(--card)' : 'transparent',
                                  boxShadow: transcriptView === 'original' ? 'var(--card-shadow)' : 'none',
                                  color: transcriptView === 'original' ? 'var(--text)' : 'var(--text-muted)',
                                }}
                              >
                                {locale === 'ja' ? 'オリジナル' : 'Original'}
                              </button>
                            </div>
                          ) : cleaningTranscript ? (
                            <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                              <span
                                className="h-8 px-3 text-xs font-medium flex items-center gap-1.5 shrink-0"
                                style={{ background: 'var(--panel)', border: '1px solid var(--edge)', boxShadow: 'var(--card-shadow)', color: 'var(--text-muted)' }}
                              >
                                <span className="spinner-sm" />
                                {locale === 'ja' ? '整理中...' : 'Cleaning...'}
                              </span>
                            </Squircle>
                          ) : (
                            <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                              <button
                                onClick={async () => {
                                  if (!session?.access_token) return
                                  setCleaningTranscript(true)
                                  try {
                                    const res = await fetch('/api/transcriptions/clean', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${session.access_token}`,
                                      },
                                      body: JSON.stringify({ bookingId: selectedTranscript.lesson.id }),
                                    })
                                    const data = await res.json()
                                    if (data.status === 'ready' && data.cleanedContent) {
                                      setSelectedTranscript(prev => prev ? { ...prev, cleanedContent: data.cleanedContent } : prev)
                                      setTranscriptView('clean')
                                    }
                                  } catch { /* ignore */ }
                                  setCleaningTranscript(false)
                                }}
                                className="h-8 px-3 text-xs font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95 shrink-0 flex items-center gap-1.5"
                                style={{ background: 'var(--panel)', border: '1px solid var(--edge)', boxShadow: 'var(--card-shadow)', color: 'var(--text-muted)' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                                </svg>
                                {locale === 'ja' ? '整理' : 'Clean up'}
                              </button>
                            </Squircle>
                          )}
                        </div>
                      </div>

                      {/* Transcript content */}
                      <div className="space-y-4">
                        {(transcriptView === 'clean' && selectedTranscript.cleanedContent
                          ? selectedTranscript.cleanedContent
                          : selectedTranscript.content
                        ).split('\n').filter(line => line.trim()).map((line, i) => {
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
                    </SquircleCard>
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
                {/* Stats cards — equal height, title pinned top, data pinned bottom */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <SquircleCard radius={16} fullHeight className="p-4 flex flex-col justify-between gap-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? '完了したレッスン' : 'Lessons completed'}
                    </p>
                    <p className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>
                      {loadingHistory ? '—' : historyStats.count}
                    </p>
                  </SquircleCard>
                  <SquircleCard radius={16} fullHeight className="p-4 flex flex-col justify-between gap-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? '話した時間' : 'Minutes talked'}
                    </p>
                    <p className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>
                      {loadingHistory ? '—' : historyStats.minutes}
                      {!loadingHistory && (
                        <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-muted)' }}>
                          {locale === 'ja' ? '分' : 'min'}
                        </span>
                      )}
                    </p>
                  </SquircleCard>
                  <SquircleCard radius={16} fullHeight className="p-4 flex flex-col justify-between gap-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? 'よく話したトピック' : 'Most discussed'}
                    </p>
                    {!loadingHistory && historyStats.topTopics.length > 0 ? (
                      <div className="flex flex-col items-start gap-1">
                        {historyStats.topTopics.map((topic, i) => (
                          <span key={topic} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--inset)', color: 'var(--text-secondary)' }}>
                            <span className="font-semibold mr-1" style={{ color: 'var(--text-subtle)' }}>#{i + 1}</span>
                            {topic}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-subtle)' }}>—</p>
                    )}
                  </SquircleCard>
                </div>

                {/* Search + sort */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative flex-1">
                    <svg
                      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-subtle)' }} aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="search"
                      value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(0) }}
                      placeholder={locale === 'ja' ? 'トピック・日付・フレーズで検索' : 'Search topics, dates or phrases'}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-full"
                      style={{ background: 'var(--inset)', color: 'var(--text)', border: '1px solid var(--hairline)' }}
                    />
                    {historySearch && (
                      <button
                        onClick={() => { setHistorySearch(''); setHistoryPage(0) }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-subtle)' }}
                        aria-label={locale === 'ja' ? '検索をクリア' : 'Clear search'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 5l14 14M19 5L5 19" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { setHistorySort((s) => (s === 'newest' ? 'oldest' : 'newest')); setHistoryPage(0) }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-full transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label={locale === 'ja' ? '並び順を切り替え' : 'Toggle sort order'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {historySort === 'newest' ? <path d="M12 5v14m0 0-5-5m5 5 5-5" /> : <path d="M12 19V5m0 0-5 5m5-5 5 5" />}
                    </svg>
                    {historySort === 'newest'
                      ? (locale === 'ja' ? '新しい順' : 'Newest')
                      : (locale === 'ja' ? '古い順' : 'Oldest')}
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="space-y-3">
                    <SkeletonCard rows={2} />
                    <SkeletonCard rows={2} />
                    <SkeletonCard rows={2} />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <SquircleBox cornerRadius={12} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {historySearch.trim()
                        ? (locale === 'ja' ? '検索に一致するレッスンはありません' : 'No lessons match your search')
                        : t('noHistory')}
                    </p>
                  </SquircleBox>
                ) : (
                  <>
                    <div className="space-y-3">
                      {filteredHistory
                        .slice(historyPage * HISTORY_PER_PAGE, (historyPage + 1) * HISTORY_PER_PAGE)
                        .map((lesson) => (
                          <HistoryLessonCard
                            key={lesson.id}
                            lesson={lesson}
                            locale={locale}
                            session={session}
                            onViewTranscript={(l, content, cleanedContent) => { setSelectedTranscript({ lesson: l, content, cleanedContent }); setTranscriptView(cleanedContent ? 'clean' : 'original') }}
                            onAddToDeck={addToDeck}
                            deckPhraseIds={deckPhraseIds}
                          />
                        ))}
                    </div>
                    {filteredHistory.length > HISTORY_PER_PAGE && (
                      <div className="flex items-center justify-between mt-6">
                        <button
                          onClick={() => setHistoryPage((p) => p - 1)}
                          disabled={historyPage === 0}
                          className="text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-30"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {locale === 'ja' ? '前へ' : 'Previous'}
                        </button>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {historyPage + 1} / {Math.ceil(filteredHistory.length / HISTORY_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setHistoryPage((p) => p + 1)}
                          disabled={(historyPage + 1) * HISTORY_PER_PAGE >= filteredHistory.length}
                          className="text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-30"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {locale === 'ja' ? '次へ' : 'Next'}
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
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>{tabTitle}</h1>
                  <ExportPhrasesButton cards={vocabCards} locale={locale} />
                </div>
                {loadingVocab ? (
                  <SkeletonCard rows={6} />
                ) : vocabCards.length === 0 ? (
                  <SquircleBox cornerRadius={16} className="p-8 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
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
                        <SquircleBox cornerRadius={16} className="overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
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
                      <SquircleBox cornerRadius={16} className="p-4 mb-4 flex items-center justify-between" style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {locale === 'ja'
                            ? `${dueCount}件のフレーズが復習可能です`
                            : `${dueCount} phrase${dueCount !== 1 ? 's' : ''} due for review`}
                        </p>
                        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                          <button
                            onClick={startReview}
                            className="px-4 py-2 text-sm font-semibold shrink-0 transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
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
                            className="px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-[120ms] ease-out hover:scale-105 active:scale-95"
                            style={pillTabStyle(vocabFilter === f, theme === 'dark' ? 'dark' : 'light')}
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
                          <SquircleBox key={card.id} cornerRadius={16} className="overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
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
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--inset)', color: 'var(--text-subtle)' }}>
                                    {formatNextReview(card.next_review_at, locale)}
                                  </span>
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
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
        </div>
      </section>

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

      {/* Booking result modal */}
      {pronAnnounce && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-backdrop py-6"
          onClick={() => setPronAnnounce(null)}>
          {/* Minimal announcement card: illustration → header → one line → CTA,
              with a small NEW COURSE badge riding the top edge. */}
          <div className="w-full max-w-sm mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <SquircleBox cornerRadius={24} className="modal-card px-7 pt-10 pb-7 text-center" style={{ background: 'var(--surface)' }}>
              <PronAnnounceArt />
              <p className="text-xl font-bold mt-5 mb-2" style={{ color: 'var(--text)' }}>
                {locale === 'ja' ? 'L と R、自信ありますか？' : "How's your L & R?"}
              </p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                {locale === 'ja' ? '新コース「発音 101」で、耳と口を鍛えよう！' : 'Train your ear and mouth in Pronunciation 101!'}
              </p>
              <button
                onClick={() => { setPronAnnounce(null); router.push('/dashboard/courses/pronunciation') }}
                className="w-full py-3.5 rounded-full font-semibold transition-transform duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {locale === 'ja' ? 'コースを見る' : 'See course'}
              </button>
              <button onClick={() => setPronAnnounce(null)} className="block w-full mt-2 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                {locale === 'ja' ? 'あとで' : 'Later'}
              </button>
            </SquircleBox>
          </div>
        </div>
      )}

      {bookingResultModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-backdrop overflow-y-auto py-6"
          onClick={() => setBookingResultModal(null)}
        >
          <div className="modal-card w-full flex items-center justify-center min-h-0" onClick={(e) => e.stopPropagation()}>
            <SquircleBox cornerRadius={20} className="p-6 sm:p-8 w-full max-w-sm mx-4 relative shadow-[0_0_0_1px_var(--border)]" style={{ background: 'var(--surface)' }}>
              <button
                onClick={() => setBookingResultModal(null)}
                className="absolute top-4 right-4 text-xl hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>

              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
                {bookingResultModal.success
                  ? (locale === 'ja' ? '予約完了' : 'Lessons booked')
                  : (locale === 'ja' ? '予約結果' : 'Booking results')}
              </h2>
              <p className="text-sm mb-4" style={{ color: bookingResultModal.success ? 'var(--success)' : 'var(--text-muted)' }}>
                {bookingResultModal.message}
              </p>

              {bookingResultModal.details && bookingResultModal.details.length > 0 && (
                <SquircleBox cornerRadius={10} className="p-3 space-y-2 mb-4" style={{ background: 'var(--surface-hover)' }}>
                  {bookingResultModal.details.map((d, i) => {
                    const dt = new Date(`${d.date}T${d.time}:00`)
                    const label = dt.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-2 text-sm">
                          <span style={{ fontSize: '14px' }}>{d.success ? '✅' : '❌'}</span>
                          <span style={{ color: 'var(--text)' }}>{label} · {d.time}</span>
                        </div>
                        {!d.success && d.reason && (
                          <p className="text-xs ml-6" style={{ color: 'var(--text-muted)' }}>
                            {d.reason === 'This time slot is no longer available'
                              ? (locale === 'ja' ? 'この時間は予約できません' : 'Time unavailable')
                              : d.reason?.includes('Not enough minutes')
                                ? (locale === 'ja' ? '残り時間が足りません' : 'Not enough minutes')
                                : (locale === 'ja' ? '予約できませんでした' : 'Could not book')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </SquircleBox>
              )}

              <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                <button
                  onClick={() => setBookingResultModal(null)}
                  className="w-full py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                  style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                >
                  {locale === 'ja' ? '閉じる' : 'Done'}
                </button>
              </Squircle>
            </SquircleBox>
          </div>
        </div>
      )}

      {/* News detail modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNewsId(null)}>
          <div className="modal-backdrop absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div
            className="modal-card relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
            style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNewsId(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
              aria-label={locale === 'ja' ? '閉じる' : 'Close'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
            <div className="flex items-center gap-3 mb-5">
              {selectedNews.posterAvatar ? (
                <img src={selectedNews.posterAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>E</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{selectedNews.posterName || 'eigo.io'}</p>
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{selectedNews.date}</p>
              </div>
            </div>
            {selectedNews.title && (
              <h2 className={`text-lg mb-4 ${locale === 'ja' ? 'font-bold' : 'font-semibold'}`} style={{ color: 'var(--text)' }}>{selectedNews.title}</h2>
            )}
            {selectedNews.body && (
              <div className="text-base news-body leading-relaxed" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNews.body) }} />
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
