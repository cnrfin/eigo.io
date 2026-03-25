'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import Header from '@/components/Header'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

type Tab = 'overview' | 'news' | 'settings'

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

  useEffect(() => {
    if (isAdmin && session?.access_token) {
      fetchStats()
      fetchNews()
      fetchLessons()
      fetchSettings()
    }
  }, [isAdmin, session?.access_token, fetchStats, fetchNews, fetchLessons, fetchSettings])

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
    { key: 'news', label: 'News' },
    { key: 'settings', label: 'Settings' },
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
        </section>
      </div>
    </main>
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
