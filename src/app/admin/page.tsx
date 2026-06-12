'use client'

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import Header from '@/components/Header'
import { motion, AnimatePresence } from 'framer-motion'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

type Tab = 'overview' | 'students' | 'news' | 'grading' | 'settings' | 'testing'

// One pending response in the tutor grading queue.
type GradingItem = {
  response_id: string
  attempt_id: string
  student: { id: string; name: string | null } | null
  form: { id: string; title: string; track: unknown } | null
  question: {
    id: string
    prompt: string
    type: string
    skill?: string
    scoring_method: string
    max_score: number
    rubric: { name: string; criteria: unknown; max_score: number | null } | null
    passage_text: string | null
    stimulus_audio_url: string | null
    stimulus_transcript: string | null
    reference: string | null
  } | null
  submission: { text_response: string | null; transcript: string | null; audio_url: string | null }
  provisional: { score: number | null; max_score: number | null; graded_by: string | null; ai_feedback: Record<string, unknown> | null }
}

type StudentProfile = {
  id: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
  minutesRemaining: number | null
  minutesPerMonth: number | null
}

type StudentProgress = {
  profile: StudentProfile & { created_at: string }
  stats: {
    totalPhrases: number
    learning: number
    reviewing: number
    mastered: number
    totalReviews: number
    dueNow: number
    avgEase: number
    totalLessons: number
    analyzedLessons: number
  }
  recentActivity: {
    id: string
    phrase_id: string
    comfort_level: string
    last_reviewed: string | null
    review_count: number
    interval_days: number
    ease_factor: number
    next_review_at: string
    phrase: { id: string; phrase_en: string; category: string; translation_ja: string } | null
  }[]
  cards: {
    id: string
    comfort_level: string
    review_count: number
    interval_days: number
    next_review_at: string
    last_reviewed: string | null
    phrase: { id: string; phrase_en: string; example_en: string; translation_ja: string; explanation_en: string; category: string } | null
  }[]
  summaries: {
    id: string
    summary_en: string
    summary_ja: string
    key_topics: string[]
    mistake_patterns: { type: string; example_student: string; correction: string; explanation_en: string; explanation_ja: string }[]
    created_at: string
    booking: { id: string; date: string; start_time: string; duration_minutes: number } | null
  }[]
  bookings: { id: string; date: string; start_time: string; duration_minutes: number; status: string }[]
}

type NewsItem = {
  id: string
  date: string
  title_ja: string
  title_en: string
  content_ja: string
  content_en: string
  published: boolean
}

type AdminLesson = {
  id: string
  date: string
  start_time: string
  duration_minutes: number
  status: string
  user_id: string
  whereby_room_url: string | null
  whereby_host_url: string | null
  profiles: { display_name: string | null; email: string | null } | null
}

type Stats = {
  activeStudents: number
  upcomingLessons: number
  completedLessons: number
  totalUsers: number
}

type TimeWindow = { open: number; close: number }

type Settings = {
  time_windows: TimeWindow[]
  booking_buffer_hours: number
}

// ─── Stat Card ───
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <SquircleBox cornerRadius={14} className="p-5 flex-1 min-w-[140px]" style={{ background: 'var(--surface)' }}>
      <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
    </SquircleBox>
  )
}

// ─── News Editor ───
function NewsEditor({
  item, onSave, onDelete, onCancel,
}: {
  item: NewsItem | null
  onSave: (data: Partial<NewsItem>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}) {
  const [date, setDate] = useState(item?.date || new Date().toISOString().split('T')[0])
  const [titleJa, setTitleJa] = useState(item?.title_ja || '')
  const [titleEn, setTitleEn] = useState(item?.title_en || '')
  const [contentJa, setContentJa] = useState(item?.content_ja || '')
  const [contentEn, setContentEn] = useState(item?.content_en || '')
  const [published, setPublished] = useState(item?.published ?? false)
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState<'both' | 'ja' | 'en'>('both')

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      ...(item && { id: item.id }),
      date,
      title_ja: titleJa,
      title_en: titleEn,
      content_ja: contentJa,
      content_en: contentEn,
      published,
    })
    setSaving(false)
  }

  return (
    <SquircleBox cornerRadius={14} className="p-6" style={{ background: 'var(--surface)' }}>
      {/* Date + Published row */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border-none outline-none"
          style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
        />
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="accent-teal-500"
          />
          Published
        </label>
      </div>

      {/* Language toggle for textareas */}
      <div className="flex gap-1 mb-3">
        {(['both', 'ja', 'en'] as const).map((l) => (
          <Squircle key={l} asChild cornerRadius={6} cornerSmoothing={0.8}>
            <button
              onClick={() => setLang(l)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: lang === l ? 'var(--selected-bg)' : 'var(--surface-hover)',
                color: lang === l ? 'var(--selected-text)' : 'var(--text-muted)',
              }}
            >
              {l === 'both' ? 'Both' : l === 'ja' ? '日本語' : 'English'}
            </button>
          </Squircle>
        ))}
      </div>

      {/* Titles */}
      <div className={`grid gap-4 mb-3 ${lang === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {(lang === 'both' || lang === 'ja') && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>タイトル</label>
            <input
              value={titleJa}
              onChange={(e) => setTitleJa(e.target.value)}
              placeholder="日本語のタイトル..."
              className="w-full text-sm px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
            />
          </div>
        )}
        {(lang === 'both' || lang === 'en') && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Title</label>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="English title..."
              className="w-full text-sm px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
            />
          </div>
        )}
      </div>

      {/* Body (supports markdown) */}
      <div className={`grid gap-4 mb-4 ${lang === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {(lang === 'both' || lang === 'ja') && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>本文 <span className="font-normal opacity-60">（markdown対応）</span></label>
            <textarea
              value={contentJa}
              onChange={(e) => setContentJa(e.target.value)}
              rows={6}
              placeholder="日本語でニュースを入力..."
              className="w-full text-sm px-3 py-2 rounded-lg border-none outline-none resize-y font-mono"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
            />
          </div>
        )}
        {(lang === 'both' || lang === 'en') && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Body <span className="font-normal opacity-60">(markdown supported)</span></label>
            <textarea
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              rows={6}
              placeholder="Enter news body in English..."
              className="w-full text-sm px-3 py-2 rounded-lg border-none outline-none resize-y font-mono"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
          >
            {saving ? '...' : item ? 'Save' : 'Publish'}
          </button>
        </Squircle>
        <button
          onClick={onCancel}
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
        {item && onDelete && (
          <button
            onClick={onDelete}
            className="text-sm ml-auto transition-colors hover:opacity-80"
            style={{ color: 'var(--danger)' }}
          >
            Delete
          </button>
        )}
      </div>
    </SquircleBox>
  )
}

// ─── Admin Content ───
function AdminContent() {
  const { user, session, loading } = useAuth()
  const { locale } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // News
  const [newsList, setNewsList] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [editingNews, setEditingNews] = useState<NewsItem | null | 'new'>(null)

  // Upcoming lessons
  const [lessons, setLessons] = useState<AdminLesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)

  // Students
  const [studentList, setStudentList] = useState<StudentProfile[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [studentPhraseVisible, setStudentPhraseVisible] = useState(20)
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState(false)

  // Tutor grading queue
  const [gradingItems, setGradingItems] = useState<GradingItem[]>([])
  const [loadingGrading, setLoadingGrading] = useState(false)
  const [gradingFetched, setGradingFetched] = useState(false)
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: string; comment: string }>>({})
  const [savingAttempt, setSavingAttempt] = useState<string | null>(null)
  const [gradingMsg, setGradingMsg] = useState('')
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set())

  // Settings
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '')

  const headers = useCallback(() => ({
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  }), [session?.access_token])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingStats(true)
    try {
      const res = await fetch('/api/admin/stats', { headers: headers() })
      if (res.ok) setStats(await res.json())
    } catch { /* */ }
    setLoadingStats(false)
  }, [session?.access_token, headers])

  // Fetch news
  const fetchNews = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingNews(true)
    try {
      const res = await fetch('/api/admin/news', { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setNewsList(data.news || [])
      }
    } catch { /* */ }
    setLoadingNews(false)
  }, [session?.access_token, headers])

  // Fetch upcoming lessons
  const fetchLessons = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingLessons(true)
    try {
      const res = await fetch('/api/admin/lessons', { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setLessons(data.lessons || [])
      }
    } catch { /* */ }
    setLoadingLessons(false)
  }, [session?.access_token, headers])

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/admin/settings', { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
      }
    } catch { /* */ }
    setLoadingSettings(false)
  }, [session?.access_token, headers])

  useEffect(() => {
    if (!loading && !user) window.location.href = '/'
    if (!loading && user && !ADMIN_EMAILS.includes(user.email || '')) window.location.href = '/dashboard'
  }, [user, loading])

  // Fetch the tutor grading queue
  const fetchGrading = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingGrading(true)
    try {
      const res = await fetch('/api/admin/tests/grading', { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setGradingItems(data.items || [])
      }
    } catch { /* */ }
    setLoadingGrading(false)
    setGradingFetched(true)
  }, [session?.access_token, headers])

  useEffect(() => {
    if (activeTab === 'grading' && !gradingFetched && !loadingGrading) fetchGrading()
  }, [activeTab, gradingFetched, loadingGrading, fetchGrading])

  // Save tutor grades for one attempt (all of its queued responses must be scored).
  const saveAttemptGrades = useCallback(async (attemptId: string) => {
    const items = gradingItems.filter(it => it.attempt_id === attemptId)
    const grades = items.map(it => ({
      responseId: it.response_id,
      score: Number(gradeInputs[it.response_id]?.score),
      comment: gradeInputs[it.response_id]?.comment || undefined,
    }))
    if (grades.some(g => !Number.isFinite(g.score))) return
    setSavingAttempt(attemptId)
    setGradingMsg('')
    try {
      const res = await fetch('/api/admin/tests/grading', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ grades }),
      })
      if (!res.ok) throw new Error('failed')
      setGradingItems(prev => prev.filter(it => it.attempt_id !== attemptId))
      setGradingMsg('Graded — the student has been notified.')
    } catch {
      setGradingMsg('Saving grades failed — please try again.')
    }
    setSavingAttempt(null)
  }, [gradingItems, gradeInputs, headers])

  // Fetch student list
  const fetchStudents = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingStudents(true)
    try {
      const res = await fetch('/api/admin/students', { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setStudentList(data.students || [])
      }
    } catch { /* */ }
    setLoadingStudents(false)
  }, [session?.access_token, headers])

  // Fetch individual student progress
  const fetchStudentProgress = useCallback(async (studentId: string) => {
    if (!session?.access_token) return
    setLoadingProgress(true)
    setStudentProgress(null)
    setStudentPhraseVisible(20)
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setStudentProgress(data)
      }
    } catch { /* */ }
    setLoadingProgress(false)
  }, [session?.access_token, headers])

  useEffect(() => {
    if (isAdmin && session?.access_token) {
      fetchStats()
      fetchNews()
      fetchLessons()
      fetchSettings()
    }
  }, [isAdmin, session?.access_token, fetchStats, fetchNews, fetchLessons, fetchSettings])

  // Fetch students when tab is selected
  useEffect(() => {
    if (activeTab === 'students' && studentList.length === 0 && !loadingStudents) {
      fetchStudents()
    }
  }, [activeTab, studentList.length, loadingStudents, fetchStudents])

  // Fetch progress when student is selected
  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentProgress(selectedStudentId)
    }
  }, [selectedStudentId, fetchStudentProgress])

  // Impersonate student — open their dashboard in a new tab
  const handleViewAs = useCallback(async (email: string) => {
    if (!session?.access_token) return
    setImpersonating(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        const { url } = await res.json()
        window.open(url, '_blank')
      } else {
        const err = await res.json()
        alert(`Failed to impersonate: ${err.error}`)
      }
    } catch {
      alert('Failed to generate impersonation link')
    }
    setImpersonating(false)
  }, [session?.access_token, headers])

  // News CRUD
  const saveNews = async (data: Partial<NewsItem>) => {
    const method = data.id ? 'PUT' : 'POST'
    // Attach poster info from the logged-in admin's profile
    const posterName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''
    const posterAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
    const res = await fetch('/api/admin/news', {
      method,
      headers: headers(),
      body: JSON.stringify({ ...data, poster_name: posterName, poster_avatar_url: posterAvatarUrl }),
    })
    if (res.ok) {
      setEditingNews(null)
      fetchNews()
    }
  }

  const deleteNews = async (id: string) => {
    const res = await fetch(`/api/admin/news?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    })
    if (res.ok) {
      setEditingNews(null)
      fetchNews()
    }
  }

  // Save settings
  const saveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    setSettingsMsg('')
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      setSettingsMsg('Saved ✓')
      setTimeout(() => setSettingsMsg(''), 2000)
    } else {
      setSettingsMsg('Failed to save')
    }
    setSavingSettings(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </main>
    )
  }
  if (!user || !isAdmin) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'students', label: 'Students' },
    { key: 'news', label: 'News' },
    { key: 'grading', label: 'Grading' },
    { key: 'settings', label: 'Settings' },
    { key: 'testing', label: 'Testing' },
  ]

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto">
        <Header />

        <section className="py-8 px-6">
          <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text)' }}>Admin</h1>

          {/* Tabs */}
          <div className="flex gap-1 mb-8" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="px-5 py-3 font-medium transition-colors relative"
                style={{ color: activeTab === key ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {label}
                {activeTab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>

          {/* ═══ OVERVIEW ═══ */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {loadingStats ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : stats ? (
                <div className="flex flex-wrap gap-4">
                  <StatCard label="Students" value={stats.totalUsers} />
                  <StatCard label="Upcoming" value={stats.upcomingLessons} />
                  <StatCard label="Completed" value={stats.completedLessons} />
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Could not load stats</p>
              )}

              {/* Upcoming Lessons */}
              <div>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Upcoming Lessons</h2>
                {loadingLessons ? (
                  <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : lessons.length === 0 ? (
                  <SquircleBox cornerRadius={12} className="p-6 text-center" style={{ background: 'var(--surface)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No upcoming lessons</p>
                  </SquircleBox>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((lesson) => {
                      const dt = new Date(`${lesson.date}T${lesson.start_time}+09:00`)
                      const dateStr = dt.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
                      const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                      const profileEmail = lesson.profiles?.email
                      const studentName = lesson.profiles?.display_name
                        || (profileEmail && !profileEmail.endsWith('@line.eigo.io') ? profileEmail : null)
                        || 'Unknown'

                      return (
                        <SquircleBox
                          key={lesson.id}
                          cornerRadius={12}
                          className="flex items-center justify-between px-5 py-4"
                          style={{ background: 'var(--surface)' }}
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{studentName}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {dateStr} at {timeStr} JST · {lesson.duration_minutes} min
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(lesson.whereby_host_url || lesson.whereby_room_url) && (
                              <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                                <a
                                  href={lesson.whereby_host_url || lesson.whereby_room_url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                                  style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                                >
                                  Enter →
                                </a>
                              </Squircle>
                            )}
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--accent)', color: 'var(--selected-text)', opacity: 0.8 }}
                            >
                              confirmed
                            </span>
                          </div>
                        </SquircleBox>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Dashboard link */}
              <a
                href="/dashboard"
                className="inline-block text-sm transition-colors hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                View student dashboard →
              </a>
            </div>
          )}

          {/* ═══ NEWS ═══ */}
          {activeTab === 'news' && (
            <div className="space-y-4">
              {/* New post button */}
              {editingNews !== 'new' && (
                <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                  <button
                    onClick={() => setEditingNews('new')}
                    className="px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                  >
                    + New post
                  </button>
                </Squircle>
              )}

              {/* New post editor */}
              {editingNews === 'new' && (
                <NewsEditor
                  item={null}
                  onSave={saveNews}
                  onCancel={() => setEditingNews(null)}
                />
              )}

              {/* News list */}
              {loadingNews ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : newsList.length === 0 ? (
                <SquircleBox cornerRadius={12} className="p-8 text-center" style={{ background: 'var(--surface)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No news posts yet</p>
                </SquircleBox>
              ) : (
                newsList.map((item) => (
                  <div key={item.id}>
                    {editingNews && typeof editingNews === 'object' && editingNews.id === item.id ? (
                      <NewsEditor
                        item={item}
                        onSave={saveNews}
                        onDelete={() => deleteNews(item.id)}
                        onCancel={() => setEditingNews(null)}
                      />
                    ) : (
                      <SquircleBox
                        cornerRadius={12}
                        className="flex items-start justify-between px-5 py-4 cursor-pointer transition-opacity hover:opacity-90"
                        style={{ background: 'var(--surface)' }}
                        onClick={() => setEditingNews(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{item.date}</span>
                            {!item.published && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--warning)', color: '#fff' }}>
                                Draft
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.title_en || item.title_ja || item.content_en || item.content_ja}</p>
                          {(item.content_en || item.content_ja) && (item.title_en || item.title_ja) && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.content_en || item.content_ja}</p>
                          )}
                        </div>
                        <span className="text-xs ml-3 shrink-0" style={{ color: 'var(--text-subtle)' }}>Edit →</span>
                      </SquircleBox>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {/* ═══ GRADING (tutor review queue) ═══ */}
          {activeTab === 'grading' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {gradingItems.length > 0
                    ? `${gradingItems.length} answer${gradingItems.length === 1 ? '' : 's'} awaiting review`
                    : 'Tests submitted for teacher review appear here.'}
                </p>
                <button onClick={fetchGrading} disabled={loadingGrading}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)', boxShadow: '0 0 0 1px var(--border)' }}>
                  {loadingGrading ? 'Loading…' : 'Refresh'}
                </button>
              </div>

              {gradingMsg && <p className="text-sm" style={{ color: 'var(--accent)' }}>{gradingMsg}</p>}

              {loadingGrading && gradingItems.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : gradingItems.length === 0 ? (
                <SquircleBox cornerRadius={12} className="p-6 text-center" style={{ background: 'var(--surface)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nothing to grade 🎉</p>
                </SquircleBox>
              ) : (
                (() => {
                  // Group queue items by attempt: one card per student submission.
                  const byAttempt = new Map<string, GradingItem[]>()
                  for (const it of gradingItems) {
                    const arr = byAttempt.get(it.attempt_id) ?? []
                    arr.push(it)
                    byAttempt.set(it.attempt_id, arr)
                  }
                  return [...byAttempt.entries()].map(([attemptId, items]) => {
                    const first = items[0]
                    const expanded = expandedAttempts.has(attemptId)
                    const scoredCount = items.filter(it => Number.isFinite(Number(gradeInputs[it.response_id]?.score))).length
                    const allScored = scoredCount === items.length
                    return (
                      <SquircleBox key={attemptId} cornerRadius={14} className="overflow-hidden" style={{ background: 'var(--surface)' }}>
                        {/* Collapsible header (lesson-history style) */}
                        <button
                          onClick={() => setExpandedAttempts(prev => {
                            const next = new Set(prev)
                            if (next.has(attemptId)) next.delete(attemptId); else next.add(attemptId)
                            return next
                          })}
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:opacity-80"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{first.student?.name || 'Student'}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {first.form?.title || 'Practice test'} · {items.length} answer{items.length === 1 ? '' : 's'}
                              {scoredCount > 0 && !allScored ? ` · ${scoredCount}/${items.length} scored` : ''}
                            </p>
                          </div>
                          <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', color: 'var(--text-subtle)' }}>▾</span>
                        </button>

                        {expanded && (
                          <div className="px-5 pb-5 space-y-4">
                            {items.map(it => {
                              const inp = gradeInputs[it.response_id] ?? { score: '', comment: '' }
                              const max = it.question?.max_score || it.provisional.max_score || 0
                              const ai = it.provisional.ai_feedback
                              return (
                                <div key={it.response_id} className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                    <span className="uppercase text-[10px] tracking-wide mr-2 px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>
                                      {it.question?.skill || it.question?.type || '?'}
                                    </span>
                                    {it.question?.prompt}
                                  </p>

                                  {/* What the student saw/heard */}
                                  {it.question?.stimulus_audio_url && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>Question audio</span>
                                      <audio controls src={it.question.stimulus_audio_url} className="w-full h-8" preload="none" />
                                    </div>
                                  )}
                                  {it.question?.passage_text && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>Show passage</summary>
                                      <p className="mt-1 whitespace-pre-line p-2 rounded" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>{it.question.passage_text}</p>
                                    </details>
                                  )}
                                  {(it.question?.reference || it.question?.stimulus_transcript) && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>Grading key / transcript</summary>
                                      {it.question?.reference && (
                                        <p className="mt-1 whitespace-pre-line p-2 rounded" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>{it.question.reference}</p>
                                      )}
                                      {it.question?.stimulus_transcript && (
                                        <p className="mt-1 whitespace-pre-line p-2 rounded" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>{it.question.stimulus_transcript}</p>
                                      )}
                                    </details>
                                  )}

                                  {/* The student's answer */}
                                  {it.submission.audio_url ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs shrink-0 font-medium" style={{ color: 'var(--text-secondary)' }}>Student answer</span>
                                      <audio controls src={it.submission.audio_url} className="w-full h-8" preload="none" />
                                    </div>
                                  ) : (
                                    <p className="text-sm whitespace-pre-wrap p-3 rounded-lg" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                                      {it.submission.text_response || <em>(no answer)</em>}
                                    </p>
                                  )}

                                  {!!(it.provisional.score != null || (ai && (ai.heard || ai.pronunciation))) && (
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                      {it.provisional.score != null && <>AI provisional: <strong>{it.provisional.score}/{max}</strong>. </>}
                                      {typeof ai?.heard === 'string' && ai.heard ? <>Heard: “{String(ai.heard)}”</> : null}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number" min={0} max={max} step={0.5} value={inp.score}
                                      onChange={e => setGradeInputs(prev => ({ ...prev, [it.response_id]: { ...inp, score: e.target.value } }))}
                                      placeholder={`0–${max}`}
                                      className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
                                      style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
                                    />
                                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>/ {max}</span>
                                    <input
                                      type="text" value={inp.comment}
                                      onChange={e => setGradeInputs(prev => ({ ...prev, [it.response_id]: { ...inp, comment: e.target.value } }))}
                                      placeholder="Comment for the student (optional)"
                                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                                      style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
                                    />
                                  </div>
                                </div>
                              )
                            })}

                            <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                              <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                                <button
                                  onClick={() => saveAttemptGrades(attemptId)}
                                  disabled={!allScored || savingAttempt === attemptId}
                                  className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-40"
                                  style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                                >
                                  {savingAttempt === attemptId
                                    ? 'Saving…'
                                    : allScored
                                      ? `Save grades (${items.length})`
                                      : `Score all answers to save (${scoredCount}/${items.length})`}
                                </button>
                              </Squircle>
                            </div>
                          </div>
                        )}
                      </SquircleBox>
                    )
                  })
                })()
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              {loadingSettings ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : settings ? (
                <SquircleBox cornerRadius={14} className="p-6 space-y-6" style={{ background: 'var(--surface)' }}>
                  {/* Time Windows */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Teaching windows (JST)
                    </label>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                      Set the hours when lessons can be booked. Close &lt; Open means it wraps past midnight.
                    </p>

                    <div className="space-y-3">
                      {(settings.time_windows || []).map((w, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={w.open}
                              onChange={(e) => {
                                const updated = [...settings.time_windows]
                                updated[idx] = { ...updated[idx], open: parseInt(e.target.value) }
                                setSettings({ ...settings, time_windows: updated })
                              }}
                              className="text-sm px-3 py-2 rounded-lg border-none outline-none"
                              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                              ))}
                            </select>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                            <select
                              value={w.close}
                              onChange={(e) => {
                                const updated = [...settings.time_windows]
                                updated[idx] = { ...updated[idx], close: parseInt(e.target.value) }
                                setSettings({ ...settings, time_windows: updated })
                              }}
                              className="text-sm px-3 py-2 rounded-lg border-none outline-none"
                              style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                              ))}
                            </select>
                          </div>

                          {w.close < w.open && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: 'var(--selected-text)', opacity: 0.8 }}>
                              overnight
                            </span>
                          )}

                          {settings.time_windows.length > 1 && (
                            <button
                              onClick={() => {
                                const updated = settings.time_windows.filter((_, i) => i !== idx)
                                setSettings({ ...settings, time_windows: updated })
                              }}
                              className="text-xs px-2 py-1 rounded-md transition-colors hover:opacity-80"
                              style={{ color: 'var(--danger)' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add window */}
                    <button
                      onClick={() => {
                        const updated = [...(settings.time_windows || []), { open: 9, close: 17 }]
                        setSettings({ ...settings, time_windows: updated })
                      }}
                      className="mt-3 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--accent)' }}
                    >
                      + Add window
                    </button>
                  </div>

                  {/* Booking buffer */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Booking buffer (hours)
                    </label>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>
                      Students cannot book a lesson within this many hours
                    </p>
                    <select
                      value={settings.booking_buffer_hours}
                      onChange={(e) => setSettings({ ...settings, booking_buffer_hours: parseInt(e.target.value) })}
                      className="text-sm px-3 py-2 rounded-lg border-none outline-none"
                      style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
                    >
                      {[0, 1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                        <option key={h} value={h}>{h} hour{h !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Save */}
                  <div className="flex items-center gap-3">
                    <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                      <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className="px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                      >
                        {savingSettings ? '...' : 'Save'}
                      </button>
                    </Squircle>
                    {settingsMsg && (
                      <span className="text-sm" style={{ color: settingsMsg.includes('✓') ? 'var(--success)' : 'var(--danger)' }}>
                        {settingsMsg}
                      </span>
                    )}
                  </div>
                </SquircleBox>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Could not load settings</p>
              )}
            </div>
          )}

          {/* ═══ STUDENTS TAB ═══ */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {/* Student selector */}
              {loadingStudents ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading students...</p>
              ) : studentList.length === 0 ? (
                <SquircleBox cornerRadius={12} className="p-6 text-center" style={{ background: 'var(--surface)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No students with bookings yet</p>
                </SquircleBox>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {studentList.map(s => (
                      <Squircle key={s.id} asChild cornerRadius={10} cornerSmoothing={0.8}>
                        <button
                          onClick={() => setSelectedStudentId(s.id === selectedStudentId ? null : s.id)}
                          className="px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90 flex items-center gap-2"
                          style={{
                            background: selectedStudentId === s.id ? 'var(--accent)' : 'var(--surface)',
                            color: selectedStudentId === s.id ? 'var(--selected-text)' : 'var(--text)',
                          }}
                        >
                          {s.avatar_url && (
                            <img src={s.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                          )}
                          {s.display_name || s.email || 'Unknown'}
                          {s.minutesRemaining !== null && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-1"
                              style={{
                                background: selectedStudentId === s.id
                                  ? 'rgba(255, 255, 255, 0.25)'
                                  : s.minutesRemaining < 30 ? 'rgba(240, 96, 96, 0.15)' : 'rgba(0, 194, 184, 0.15)',
                                color: selectedStudentId === s.id
                                  ? 'var(--selected-text)'
                                  : s.minutesRemaining < 30 ? 'var(--danger)' : 'var(--accent)',
                              }}
                            >
                              {s.minutesRemaining}min
                            </span>
                          )}
                        </button>
                      </Squircle>
                    ))}
                  </div>

                  {/* Student progress content */}
                  {selectedStudentId && (
                    loadingProgress ? (
                      <p style={{ color: 'var(--text-muted)' }}>Loading progress...</p>
                    ) : studentProgress ? (
                      <div className="space-y-6">
                        {/* View as student button */}
                        {studentProgress.profile.email && (
                          <div className="flex justify-end">
                            <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                              <button
                                onClick={() => handleViewAs(studentProgress.profile.email!)}
                                disabled={impersonating}
                                className="px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90"
                                style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
                              >
                                {impersonating ? 'Opening...' : `View as ${studentProgress.profile.display_name || 'student'}`}
                              </button>
                            </Squircle>
                          </div>
                        )}

                        {/* Overview stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Phrases</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{studentProgress.stats.totalPhrases}</p>
                          </SquircleBox>
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Reviews</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{studentProgress.stats.totalReviews}</p>
                          </SquircleBox>
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Lessons</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{studentProgress.stats.totalLessons}</p>
                          </SquircleBox>
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Due now</p>
                            <p className="text-2xl font-bold" style={{ color: studentProgress.stats.dueNow > 0 ? 'var(--accent)' : 'var(--text)' }}>{studentProgress.stats.dueNow}</p>
                          </SquircleBox>
                        </div>

                        {/* Comfort breakdown bar */}
                        {studentProgress.stats.totalPhrases > 0 && (
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>Comfort breakdown</p>
                            <div className="flex rounded-full overflow-hidden h-3 mb-2" style={{ background: 'var(--surface-hover)' }}>
                              {studentProgress.stats.learning > 0 && (
                                <div style={{ width: `${(studentProgress.stats.learning / studentProgress.stats.totalPhrases) * 100}%`, background: '#3b82f6' }} />
                              )}
                              {studentProgress.stats.reviewing > 0 && (
                                <div style={{ width: `${(studentProgress.stats.reviewing / studentProgress.stats.totalPhrases) * 100}%`, background: '#facc15' }} />
                              )}
                              {studentProgress.stats.mastered > 0 && (
                                <div style={{ width: `${(studentProgress.stats.mastered / studentProgress.stats.totalPhrases) * 100}%`, background: '#22c55e' }} />
                              )}
                            </div>
                            <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                                Learning ({studentProgress.stats.learning})
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#facc15' }} />
                                Reviewing ({studentProgress.stats.reviewing})
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                                Mastered ({studentProgress.stats.mastered})
                              </span>
                            </div>
                          </SquircleBox>
                        )}

                        {/* Recent activity */}
                        {studentProgress.recentActivity.length > 0 && (
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>Recent activity</p>
                            <div className="space-y-2">
                              {studentProgress.recentActivity.map(card => (
                                <div key={card.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                                      {card.phrase?.phrase_en}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                      {card.phrase?.translation_ja}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
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
                                      {card.comfort_level}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                      {card.last_reviewed
                                        ? new Date(card.last_reviewed).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
                                        : '—'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </SquircleBox>
                        )}

                        {/* Phrase bank */}
                        {studentProgress.cards.length > 0 && (
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>
                              Phrase bank ({studentProgress.cards.length})
                            </p>
                            <div className="space-y-1">
                              {studentProgress.cards.slice(0, studentPhraseVisible).map(card => (
                                <div key={card.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:opacity-80" style={{ background: 'transparent' }}>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{card.phrase?.phrase_en}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                      {card.review_count}x
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-subtle)' }}>
                                      {card.phrase?.category}
                                    </span>
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{
                                        background: card.comfort_level === 'mastered' ? '#22c55e'
                                          : card.comfort_level === 'reviewing' ? '#facc15'
                                          : '#3b82f6',
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {studentProgress.cards.length > studentPhraseVisible && (
                              <button
                                onClick={() => setStudentPhraseVisible(prev => prev + 20)}
                                className="w-full mt-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                                style={{ color: 'var(--accent)' }}
                              >
                                Show more ({studentProgress.cards.length - studentPhraseVisible} remaining)
                              </button>
                            )}
                          </SquircleBox>
                        )}

                        {/* Lesson insights */}
                        {studentProgress.summaries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>
                              Lesson insights ({studentProgress.summaries.length})
                            </p>
                            <div className="space-y-2">
                              {studentProgress.summaries.map(summary => {
                                const isExpanded = expandedInsightId === summary.id
                                const dateObj = summary.booking ? new Date(`${summary.booking.date}T${summary.booking.start_time}`) : null
                                const dateStr = dateObj ? dateObj.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }) : null
                                return (
                                  <SquircleBox key={summary.id} cornerRadius={12} className="overflow-hidden" style={{ background: 'var(--surface)' }}>
                                    {/* Clickable header row */}
                                    <div
                                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setExpandedInsightId(isExpanded ? null : summary.id)}
                                    >
                                      <div>
                                        {dateStr && (
                                          <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                                            {dateStr}
                                            {summary.booking && <span className="text-xs ml-1.5" style={{ color: 'var(--text-secondary)' }}>· {summary.booking.duration_minutes} min</span>}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {summary.key_topics.slice(0, 2).map((topic, i) => (
                                          <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>
                                            {topic}
                                          </span>
                                        ))}
                                        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', color: 'var(--text-subtle)' }}>▾</span>
                                      </div>
                                    </div>

                                    {/* Expandable content */}
                                    <AnimatePresence>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            {/* All key topics */}
                                            {summary.key_topics.length > 0 && (
                                              <div className="flex flex-wrap gap-1.5 mb-3">
                                                {summary.key_topics.map((topic, i) => (
                                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>
                                                    {topic}
                                                  </span>
                                                ))}
                                              </div>
                                            )}

                                            {/* Summary text */}
                                            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                                              {locale === 'ja' ? summary.summary_ja : summary.summary_en}
                                            </p>

                                            {/* Mistake patterns */}
                                            {summary.mistake_patterns.length > 0 && (
                                              <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
                                                  Areas to improve
                                                </p>
                                                <div className="space-y-2">
                                                  {summary.mistake_patterns.map((m, i) => (
                                                    <div key={i} className="text-sm rounded-lg p-3" style={{ background: 'var(--surface-hover)' }}>
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
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </SquircleBox>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Empty state */}
                        {studentProgress.stats.totalPhrases === 0 && studentProgress.summaries.length === 0 && (
                          <SquircleBox cornerRadius={12} className="p-6 text-center" style={{ background: 'var(--surface)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No study data yet for this student</p>
                          </SquircleBox>
                        )}
                      </div>
                    ) : null
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ TESTING TAB ═══ */}
          {activeTab === 'testing' && (
            <TestingPanel session={session} />
          )}
        </section>
      </div>
    </main>
  )
}

// ─── Testing Panel ───
// Self-service sandbox for the admin account: simulate a free user (so
// gating, attempt counting and upsell flows behave as they do for real
// users), preview the one-time modals with sample data, and wipe this
// account's progress so flows can be rerun from zero.
function TestingPanel({ session }: { session: { access_token: string } | null }) {
  const [simulate, setSimulate] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }), [session?.access_token])

  useEffect(() => {
    if (!session?.access_token) return
    fetch('/api/admin/testing', { headers })
      .then(r => r.json())
      .then(d => setSimulate(!!d.simulate_free))
      .catch(() => setSimulate(false))
  }, [session?.access_token, headers])

  const post = async (body: Record<string, unknown>, label: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return null
    setBusy(label); setMsg(null)
    try {
      const r = await fetch('/api/admin/testing', { method: 'POST', headers, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      return d
    } catch (e) {
      setMsg(`${label}: ${e instanceof Error ? e.message : 'failed'}`)
      return null
    } finally { setBusy(null) }
  }

  const previews = [
    { label: 'Upsell modal (book a lesson)', href: '/dashboard/courses/pronunciation?preview=upsell' },
    { label: 'Upsell modal (see plans)', href: '/dashboard/courses/pronunciation?preview=upsell-booked' },
    { label: 'Course announcement', href: '/dashboard?preview=announce' },
  ]
  const clears = [
    { action: 'clear_lesson_progress', label: 'Clear lesson progress', desc: 'Deletes all your course progress and best scores (resets pronunciation attempts to 0/3).' },
    { action: 'clear_test_attempts', label: 'Clear test attempts', desc: 'Deletes all your mock-test attempts, responses and scores.' },
    { action: 'reset_nudges', label: 'Re-arm one-time modals', desc: 'Clears the upsell-dismissed and announcement-seen flags so they can fire again.' },
  ]

  return (
    <div className="space-y-5">
      {/* simulate free user */}
      <SquircleBox cornerRadius={14} className="p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Simulate free user</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
              Entitlement checks treat this account as non-subscribed: course gating counts your attempts,
              tests paywall, and upsells fire for real. Draft (unpublished) content stays visible.
            </p>
          </div>
          <button
            onClick={async () => {
              const next = !simulate
              const d = await post({ simulate_free: next }, 'Simulate')
              if (d) { setSimulate(next); setMsg(`Simulate free user: ${next ? 'ON' : 'OFF'}`) }
            }}
            disabled={simulate === null || busy !== null}
            aria-pressed={!!simulate}
            className="shrink-0 w-12 h-7 rounded-full relative transition-colors duration-150 disabled:opacity-40"
            style={{ background: simulate ? 'var(--accent)' : 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-150"
              style={{ left: simulate ? 24 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
      </SquircleBox>

      {/* modal previews */}
      <SquircleBox cornerRadius={14} className="p-6" style={{ background: 'var(--surface)' }}>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Modal previews</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-subtle)' }}>
          Force-show with sample data; nothing is stamped, so they stay repeatable.
        </p>
        <div className="flex flex-wrap gap-2">
          {previews.map(p => (
            <a key={p.href} href={p.href} target="_blank" rel="noreferrer"
              className="text-sm px-4 py-2 rounded-full transition-colors"
              style={{ background: 'var(--surface-hover)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              {p.label} ↗
            </a>
          ))}
        </div>
      </SquircleBox>

      {/* data clearing */}
      <SquircleBox cornerRadius={14} className="p-6" style={{ background: 'var(--surface)' }}>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Reset my data</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-subtle)' }}>
          Acts on YOUR account only. Lets you replay gating and upsell flows from a clean slate.
        </p>
        <div className="space-y-3">
          {clears.map(c => (
            <div key={c.action} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{c.desc}</p>
              </div>
              <button
                onClick={async () => {
                  const d = await post({ action: c.action }, c.label, `${c.label} for your account?`)
                  if (d) setMsg(`${c.label}: done${typeof d.cleared === 'number' ? ` (${d.cleared} rows)` : ''}`)
                }}
                disabled={busy !== null}
                className="shrink-0 text-sm px-4 py-2 rounded-full transition-colors disabled:opacity-40"
                style={{ background: 'transparent', color: 'var(--danger, #e5484d)', border: '1px solid var(--danger, #e5484d)' }}>
                {busy === c.label ? '…' : c.label}
              </button>
            </div>
          ))}
        </div>
        {msg && <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>{msg}</p>}
      </SquircleBox>
    </div>
  )
}

export default function Admin() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </main>
    }>
      <AdminContent />
    </Suspense>
  )
}
