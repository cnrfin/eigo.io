'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import Header from '@/components/Header'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

type Tab = 'overview' | 'students' | 'news' | 'settings' | 'ai-test'

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
    { key: 'settings', label: 'Settings' },
    { key: 'ai-test', label: 'AI Test' },
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
                            {lesson.whereby_room_url && (
                              <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                                <a
                                  href={lesson.whereby_room_url}
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
                          <SquircleBox cornerRadius={12} className="p-4" style={{ background: 'var(--surface)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>
                              Lesson insights ({studentProgress.summaries.length})
                            </p>
                            <div className="space-y-4">
                              {studentProgress.summaries.map(summary => (
                                <div key={summary.id} className="rounded-lg p-3" style={{ background: 'var(--surface-hover)' }}>
                                  {summary.booking && (
                                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                                      {new Date(`${summary.booking.date}T${summary.booking.start_time}`).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                                      {' · '}
                                      {summary.booking.duration_minutes} min
                                    </p>
                                  )}
                                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    {locale === 'ja' ? summary.summary_ja : summary.summary_en}
                                  </p>
                                  {summary.key_topics.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {summary.key_topics.map((topic, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {summary.mistake_patterns.length > 0 && (
                                    <div className="space-y-1.5 mt-2">
                                      {summary.mistake_patterns.map((m, i) => (
                                        <div key={i} className="text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="shrink-0 flex items-center justify-center rounded" style={{ background: 'var(--danger)', color: '#fff', opacity: 0.8, width: '16px', height: '16px', fontSize: '10px' }}>✗</span>
                                            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{m.example_student}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="shrink-0 flex items-center justify-center rounded" style={{ background: 'var(--accent)', color: 'var(--selected-text)', width: '16px', height: '16px', fontSize: '10px' }}>✓</span>
                                            <span style={{ color: 'var(--text)' }}>{m.correction}</span>
                                          </div>
                                          <p className="mt-0.5" style={{ color: 'var(--text-subtle)', paddingLeft: '24px' }}>
                                            {locale === 'ja' ? m.explanation_ja : m.explanation_en}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </SquircleBox>
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

          {/* ═══ AI TEST TAB ═══ */}
          {activeTab === 'ai-test' && (
            <AITestPanel session={session} locale={locale} />
          )}
        </section>
      </div>
    </main>
  )
}

// ─── AI Test Panel ───
function AITestPanel({ session, locale }: { session: { access_token: string } | null; locale: string }) {
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    summary: { summary_en: string; summary_ja: string; key_topics: string[]; mistake_patterns: { type: string; example_student: string; correction: string; explanation_ja: string; explanation_en: string }[] }
    phrases: { id: string; phrase_en: string; example_en: string; translation_ja: string; explanation_ja: string; explanation_en: string; category: string }[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seedStatus, setSeedStatus] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const seedTestData = async () => {
    if (!session?.access_token) return
    setSeeding(true)
    setSeedStatus(null)
    try {
      const res = await fetch('/api/lessons/seed-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setSeedStatus(data.message || data.error || 'Done')
    } catch {
      setSeedStatus('Failed to seed')
    } finally {
      setSeeding(false)
    }
  }

  const clearTestData = async () => {
    if (!session?.access_token) return
    setSeeding(true)
    setSeedStatus(null)
    try {
      await fetch('/api/lessons/seed-test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      setSeedStatus('Test data cleared')
    } catch {
      setSeedStatus('Failed to clear')
    } finally {
      setSeeding(false)
    }
  }

  const runTest = async () => {
    if (!session?.access_token || !transcript.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/lessons/analyze-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ transcript: transcript.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <SquircleBox cornerRadius={14} className="p-6" style={{ background: 'var(--surface)' }}>
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>AI Analysis Test</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Paste a transcript (or use the sample) and test the AI analysis without needing a real lesson.
        </p>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          className="w-full text-sm p-4 rounded-lg border-none outline-none resize-y mb-4"
          style={{ background: 'var(--surface-hover)', color: 'var(--text)' }}
          placeholder="Paste transcript here..."
        />

        <div className="flex items-center gap-3">
          <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
            <button
              onClick={runTest}
              disabled={loading || !transcript.trim()}
              className="px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </Squircle>
          <button
            onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            Reset to sample
          </button>
          {error && <span className="text-sm" style={{ color: 'var(--danger)' }}>{error}</span>}
        </div>

        {/* Seed test data for student view */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
            Student View Test Data
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Seed sample analysis data onto your most recent lesson so you can see how it looks from the student dashboard (History tab + Phrases tab).
          </p>
          <div className="flex items-center gap-3">
            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
              <button
                onClick={seedTestData}
                disabled={seeding}
                className="px-4 py-2 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
              >
                {seeding ? '...' : 'Seed Test Data'}
              </button>
            </Squircle>
            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
              <button
                onClick={clearTestData}
                disabled={seeding}
                className="px-4 py-2 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
              >
                Clear Test Data
              </button>
            </Squircle>
            {seedStatus && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{seedStatus}</span>}
          </div>
        </div>
      </SquircleBox>

      {/* Results */}
      {result && (
        <SquircleBox cornerRadius={14} className="p-6 space-y-5" style={{ background: 'var(--surface)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Results</h3>

          {/* Topics */}
          {result.summary.key_topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.summary.key_topics.map((t, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>{t}</span>
              ))}
            </div>
          )}

          {/* Summary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-subtle)' }}>
              {locale === 'ja' ? 'レッスン概要' : 'Summary'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ja' ? result.summary.summary_ja : result.summary.summary_en}
            </p>
          </div>

          {/* Mistakes */}
          {result.summary.mistake_patterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
                {locale === 'ja' ? '改善ポイント' : 'Mistakes'}
              </p>
              <div className="space-y-2">
                {result.summary.mistake_patterns.map((m, i) => (
                  <div key={i} className="text-sm rounded-lg p-3" style={{ background: 'var(--surface-hover)' }}>
                    <p><span style={{ color: 'var(--danger)' }}>✗</span> <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{m.example_student}</span></p>
                    <p><span style={{ color: 'var(--accent)' }}>✓</span> <span style={{ color: 'var(--text)' }}>{m.correction}</span></p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? m.explanation_ja : m.explanation_en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phrases */}
          {result.phrases.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
                {locale === 'ja' ? 'フレーズ' : 'Phrases'} ({result.phrases.length})
              </p>
              <div className="space-y-2">
                {result.phrases.map((p, i) => (
                  <div key={i} className="text-sm rounded-lg p-3" style={{ background: 'var(--surface-hover)' }}>
                    <p className="font-medium" style={{ color: 'var(--text)' }}>{p.phrase_en} <span className="text-xs px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'var(--surface)', color: 'var(--text-subtle)' }}>{p.category}</span></p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {locale === 'ja' ? '例' : 'Example'}: {p.example_en}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--accent)' }}>
                      {locale === 'ja' ? '訳' : 'Translation'}: {p.translation_ja}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja' ? p.explanation_ja : p.explanation_en || p.explanation_ja}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SquircleBox>
      )}
    </div>
  )
}

const SAMPLE_TRANSCRIPT = `Teacher: So, how was your weekend? Did you do anything fun?

Student: Yes, I went to shopping with my friend on Saturday.

Teacher: Nice! We usually say "I went shopping" — without the "to." Where did you go?

Student: We went to Shibuya. There was so many people there.

Teacher: Ah yeah, Shibuya is always busy! Just a small note — since "people" is plural, we say "there were so many people." "Was" is for singular things. So, did you find anything good?

Student: Yes, I bought a new jacket. It was very cheap, only 3000 yen. I was looking for one since last month.

Teacher: Great deal! And nice use of "I was looking for one." You could also say "I've been looking for one since last month" — that emphasizes that the search continued up until now. Both work though.

Student: Ah I see. "I've been looking for." That's present perfect continuous?

Teacher: Exactly! Present perfect continuous. You use it when something started in the past and continued until now. Like "I've been studying English for two years."

Student: I've been studying English for two years... yes that makes sense. How about "I have studied English for two years"?

Teacher: Good question! "I have studied" focuses on the result, while "I've been studying" focuses on the ongoing process. Both are correct, but the continuous form sounds more natural when you're still doing it.

Student: OK, I understand. By the way, I have a business trip next week to Singapore.

Teacher: Oh exciting! Is it your first time going there?

Student: No, I went there before, two times. But this time I need to do presentation in English, so I'm a little nervous.

Teacher: I can understand that. We say "give a presentation" rather than "do a presentation." And "I've been there before, twice" sounds more natural. Would you like to practice your presentation in our next lesson?

Student: Yes, that would be very helpful! I want to make sure my pronunciation is clear.

Teacher: Absolutely, let's do that. For now, try to think about the key points you want to cover. We can work on the structure and delivery next time.

Student: OK, I will prepare the slides and practice before next lesson. Thank you!

Teacher: Sounds like a plan. See you next week!`

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
