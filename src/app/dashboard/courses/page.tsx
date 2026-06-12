'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDashboardNav } from '@/context/DashboardNavContext'
import SquircleBox from '@/components/ui/SquircleBox'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'

type Lesson = { id: string; progress: { status: string } | null }
type Level = { id: string; lessons: Lesson[] }
type Course = {
  id: string; slug: string; exam_slug: string; title: string; title_ja: string
  published: boolean; levels: Level[]
}

// Pill tabs: All first, then alphabetical. Pronunciation is its own shelf;
// everything else is an exam-prep course.
const CATEGORIES = [
  { key: 'all', ja: 'すべて', en: 'All' },
  { key: 'exams', ja: '試験対策', en: 'Exams' },
  { key: 'pronunciation', ja: '発音', en: 'Pronunciation' },
] as const
type CategoryKey = (typeof CATEGORIES)[number]['key']
const categoryOf = (c: Course): CategoryKey => (c.exam_slug === 'pronunciation' ? 'pronunciation' : 'exams')

export default function CoursesPage() {
  const { session } = useAuth()
  const { locale } = useLanguage()
  const { theme } = useTheme()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryKey>('all')

  const { setCrumbs } = useDashboardNav()
  useEffect(() => {
    setCrumbs([{ label: t('コース', 'Courses') }])
    return () => setCrumbs([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, setCrumbs])

  useEffect(() => {
    if (!session?.access_token) return
    fetch('/api/courses', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then(d => setCourses(d.courses ?? []))
      .catch(() => setError(t('コースを読み込めませんでした', 'Could not load courses')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const shown = category === 'all' ? courses : courses.filter(c => categoryOf(c) === category)

  return (
    <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-6" style={{ color: 'var(--text)' }}>{t('コース', 'Courses')}</h1>

      {/* category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => {
          const active = category === cat.key
          return (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
              style={pillTabStyle(active, theme === 'dark' ? 'dark' : 'light')}
              aria-pressed={active}>
              {locale === 'ja' ? cat.ja : cat.en}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--inset)' }} />
          ))}
        </div>
      ) : error ? (
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      ) : shown.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('まだコースがありません。', 'No courses yet.')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shown.map(c => {
            const lessons = c.levels.flatMap(l => l.lessons)
            const done = lessons.filter(l => l.progress?.status === 'completed').length
            const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0
            return (
              <SquircleBox key={c.id} cornerRadius={16}
                className="p-5 flex flex-col gap-2.5 text-left cursor-pointer transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
                onClick={() => router.push(`/dashboard/courses/${c.slug}`)}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold flex-1 min-w-0 truncate" style={{ color: 'var(--text)' }}>
                    {locale === 'ja' ? c.title_ja : c.title}
                  </p>
                  {c.published === false && (
                    <span className="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--warning)', color: '#fff' }}>
                      {t('下書き', 'Draft')}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t(`${lessons.length}レッスン · 完了 ${done}`, `${lessons.length} lessons · ${done} completed`)}
                </p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--card-inset)' }}>
                  <div className="h-full rounded-full transition-all" style={{ background: 'var(--accent)', width: `${pct}%` }} />
                </div>
              </SquircleBox>
            )
          })}
        </div>
      )}
    </div>
  )
}
