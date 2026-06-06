'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useLanguage } from '@/context/LanguageContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'

type Form = {
  id: string
  slug: string
  title: string
  title_ja: string
  mode: 'full_mock' | 'skill_practice'
  time_limit_seconds: number | null
  published?: boolean
  set_slug: string | null
  set_title: string
  set_title_ja: string
  set_order: number
  sections?: { skill: string }[]
  track: {
    id: string
    name: string
    name_ja: string
    level_label: string
    order_index: number
    exam: { slug: string; name: string; name_ja: string; order_index: number } | null
  } | null
}

// The five test categories shown on the landing grid. CEFR spans both columns.
const CATEGORIES: {
  key: string
  span2?: boolean
  name: [string, string] // [ja, en]
  description: [string, string]
}[] = [
  {
    key: 'cefr',
    span2: true,
    name: ['CEFR レベルチェック', 'CEFR Level Check'],
    description: [
      '英語の総合力をA1〜C2の6段階で診断するテスト。',
      'Find your overall English level (A1–C2) with a general placement test.',
    ],
  },
  {
    key: 'toeic',
    name: ['TOEIC', 'TOEIC'],
    description: [
      '就職・昇進で広く使われるビジネス英語テスト。',
      'The business English test widely used by companies for hiring and promotion.',
    ],
  },
  {
    key: 'ielts',
    name: ['IELTS', 'IELTS'],
    description: [
      '留学・海外移住のためのアカデミック英語テスト。',
      'The academic English test for studying or moving abroad.',
    ],
  },
  {
    key: 'eiken',
    name: ['英検', 'EIKEN'],
    description: [
      '5級から1級まで、日本で最も受験されている英語検定。',
      "Japan's most popular English certification, from Grade 5 to Grade 1.",
    ],
  },
  {
    key: 'versant',
    name: ['Versant', 'Versant'],
    description: [
      '採用試験で使われる、AI採点のスピーキング＆リスニングテスト。',
      'The automated speaking & listening test used in hiring, scored in minutes.',
    ],
  },
]

export default function TestsPage() {
  const { session, user } = useAuth()
  const { locale } = useLanguage()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null) // category key
  // form_id -> the user's (single) attempt for it
  const [attempts, setAttempts] = useState<Record<string, { id: string; status: string }>>({})

  useEffect(() => {
    if (!session?.access_token) return
    const headers = { Authorization: `Bearer ${session.access_token}` }
    Promise.all([
      fetch('/api/tests/catalog', { headers }).then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'catalog failed')
        return d
      }),
      fetch('/api/tests/attempts', { headers }).then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'attempts failed')
        return d
      }),
    ])
      .then(([cat, att]) => {
        setForms(cat.forms ?? [])
        const map: Record<string, { id: string; status: string }> = {}
        for (const a of att.attempts ?? []) {
          const fid = a.form?.id
          if (fid && !map[fid]) map[fid] = { id: a.id, status: a.status }
        }
        setAttempts(map)
      })
      .catch(() => setError(locale === 'ja' ? 'テストを読み込めませんでした' : 'Could not load tests'))
      .finally(() => setLoading(false))
  }, [session?.access_token, locale])

  // The user's latest result per exam (profiles.exam_scores — written when a
  // mock/check is fully scored). Powers the scoreboard at the top of the page.
  type ExamScore = Record<string, unknown> & { updated_at?: string }
  const [examScores, setExamScores] = useState<Record<string, ExamScore>>({})
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase.from('profiles').select('exam_scores').eq('id', user.id).single()
        if (data?.exam_scores) setExamScores(data.exam_scores)
      } catch { /* ignore */ }
    }
    load()
  }, [user?.id])

  // One column per exam category. IELTS/EIKEN can have multiple tracked keys
  // (academic/general, per grade) — show the most recent.
  const scoreCols = useMemo(() => {
    const latest = (keys: string[]): ExamScore | undefined =>
      keys.map(k => examScores[k]).filter(Boolean)
        .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))[0]
    const cefr = examScores['cefr']
    const toeic = examScores['toeic-lr']
    const ielts = latest(['ielts-academic', 'ielts-general'])
    const eiken = latest(Object.keys(examScores).filter(k => k.startsWith('eiken')))
    const versant = examScores['versant']
    return [
      { key: 'cefr', label: 'CEFR', value: cefr?.level != null ? String(cefr.level) : null, sub: cefr?.cefr_j ? `CEFR-J ${cefr.cefr_j}` : null },
      { key: 'toeic', label: 'TOEIC', value: toeic?.total != null ? String(toeic.total) : null, sub: toeic ? '/ 990' : null },
      { key: 'ielts', label: 'IELTS', value: ielts?.overall_band != null ? String(ielts.overall_band) : null, sub: ielts ? t('バンド', 'Band') : null },
      { key: 'eiken', label: t('英検', 'EIKEN'), value: eiken ? (eiken.passed === true ? t('合格', 'Pass') : eiken.cse_total != null ? String(eiken.cse_total) : null) : null, sub: eiken && eiken.passed !== true ? 'CSE' : null },
      { key: 'versant', label: 'Versant', value: versant?.gse != null ? String(versant.gse) : null, sub: versant ? 'GSE' : null },
    ]
  }, [examScores, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  const routeForAttempt = useCallback((id: string, status: string) => {
    router.push(status === 'in_progress' ? `/dashboard/tests/take/${id}` : `/dashboard/tests/results/${id}`)
  }, [router])

  // Start (or resume / view results for an already-attempted form).
  const go = useCallback(async (formId: string) => {
    if (!session?.access_token) return
    const existing = attempts[formId]
    if (existing) { routeForAttempt(existing.id, existing.status); return }
    setStarting(formId)
    try {
      const res = await fetch('/api/tests/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ formId }),
      })
      const data = await res.json()
      if (!res.ok || !data.attempt) throw new Error(data.error || 'failed')
      routeForAttempt(data.attempt.id, data.attempt.status)
    } catch {
      setError(locale === 'ja' ? 'テストを開始できませんでした' : 'Could not start the test')
      setStarting(null)
    }
  }, [session?.access_token, locale, attempts, routeForAttempt])

  // Forms per category + practice/full counts.
  const byCategory = useMemo(() => {
    const map = new Map<string, { forms: Form[]; practice: number; full: number }>()
    for (const c of CATEGORIES) map.set(c.key, { forms: [], practice: 0, full: 0 })
    for (const f of forms) {
      const key = f.track?.exam?.slug
      if (!key) continue
      const entry = map.get(key)
      if (!entry) continue
      entry.forms.push(f)
      if (f.mode === 'full_mock') entry.full += 1
      else entry.practice += 1
    }
    return map
  }, [forms])

  const selectedCategory = CATEGORIES.find(c => c.key === selected)
  const selectedForms = selected ? byCategory.get(selected)?.forms ?? [] : []

  // Top-bar breadcrumbs: Dashboard > Tests [> category]
  const { setCrumbs } = useDashboardNav()
  useEffect(() => {
    const tests = { label: locale === 'ja' ? 'テスト' : 'Tests', onClick: () => setSelected(null) }
    setCrumbs(selectedCategory
      ? [tests, { label: locale === 'ja' ? selectedCategory.name[0] : selectedCategory.name[1] }]
      : [tests])
    return () => setCrumbs([])
  }, [selectedCategory, locale, setCrumbs])

  return (
    <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--accent-bg)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
      {!selectedCategory ? (
        <motion.div
          key="categories"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <h1 className="text-2xl sm:text-4xl font-bold mb-8" style={{ color: 'var(--text)' }}>
            {t('テスト', 'Tests')}
          </h1>

          {/* Scoreboard — the user's latest result for each exam. Empty slots
              show a dash: an invitation to collect the rest. */}
          <SquircleBox cornerRadius={16} className="p-5 mb-8"
            style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-subtle)' }}>
              {t('マイスコア', 'My scores')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-5">
              {scoreCols.map(c => (
                <div key={c.key} className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                  <span className="text-2xl font-bold" style={{ color: c.value ? 'var(--accent)' : 'var(--text-disabled)' }}>
                    {c.value ?? '—'}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-subtle)', minHeight: '1em' }}>{c.sub ?? ''}</span>
                </div>
              ))}
            </div>
          </SquircleBox>

          {/* Small decorative divider between the scoreboard and the tests */}
          <div aria-hidden className="mx-auto mb-8 h-px w-16 rounded-full" style={{ background: 'var(--divider)' }} />

          {loading ? (
            // Skeletons in the category cards' shape so the layout doesn't jump.
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse" aria-hidden>
              {CATEGORIES.map(c => (
                <div key={c.key} className={`p-5 rounded-2xl flex flex-col gap-2 ${c.span2 ? 'sm:col-span-2' : ''}`}
                  style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
                  <div className="h-4 w-28 rounded" style={{ background: 'var(--inset)' }} />
                  <div className="h-3.5 rounded" style={{ background: 'var(--inset)', maxWidth: c.span2 ? '60%' : '90%' }} />
                  <div className="h-3 w-32 rounded mt-1" style={{ background: 'var(--inset)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map(c => {
                const counts = byCategory.get(c.key) ?? { practice: 0, full: 0, forms: [] }
                const total = counts.practice + counts.full
                const clickable = total > 0
                return (
                  <SquircleBox key={c.key} cornerRadius={16}
                    className={`p-5 flex flex-col gap-1.5 text-left ${c.span2 ? 'sm:col-span-2' : ''} ${clickable ? 'cursor-pointer transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]' : ''}`}
                    style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)', opacity: clickable ? 1 : 0.6 }}
                    onClick={clickable ? () => setSelected(c.key) : undefined}>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{t(c.name[0], c.name[1])}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t(c.description[0], c.description[1])}</p>
                    {/* mt-auto pins the footer line to the card bottom so badges align across the row */}
                    {total === 0 ? (
                      <span className="text-xs mt-auto pt-2 self-start" aria-disabled="true">
                        <span className="px-2.5 py-1 rounded-full font-medium inline-block"
                          style={{ background: 'var(--card-inset)', color: 'var(--text-muted)' }}>
                          {t('今月公開予定', 'Coming this month')}
                        </span>
                      </span>
                    ) : (
                      // Mock count only — practice tests are being replaced by
                      // prep mini-courses in a future update
                      <p className="text-xs mt-auto pt-2" style={{ color: 'var(--text-muted)' }}>
                        {t(`模試 ${counts.full}`, `${counts.full} full ${counts.full === 1 ? 'test' : 'tests'}`)}
                      </p>
                    )}
                  </SquircleBox>
                )
              })}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key={`category-${selectedCategory.key}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <h1 className="text-2xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            {t(selectedCategory.name[0], selectedCategory.name[1])}
          </h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t(selectedCategory.description[0], selectedCategory.description[1])}
          </p>

          {/* Mock SETS: the per-skill sections of one full mock, sat separately.
              Sections grade instantly; the official combined score unlocks when
              every section is finished. */}
          {(() => {
            const sets = new Map<string, Form[]>()
            for (const f of selectedForms) {
              if (!f.set_slug) continue
              const arr = sets.get(f.set_slug) ?? []
              arr.push(f)
              sets.set(f.set_slug, arr)
            }
            if (sets.size === 0) return null
            const skillName = (s: string) => {
              const m: Record<string, [string, string]> = {
                reading: ['リーディング', 'Reading'], listening: ['リスニング', 'Listening'],
                writing: ['ライティング', 'Writing'], speaking: ['スピーキング', 'Speaking'],
              }
              return m[s] ? t(m[s][0], m[s][1]) : s
            }
            return [...sets.entries()].map(([setSlug, fs]) => {
              const ordered = [...fs].sort((a, b) => a.set_order - b.set_order)
              const scoredCount = ordered.filter(f => attempts[f.id]?.status === 'scored').length
              const allScored = scoredCount === ordered.length
              return (
                <SquircleBox key={setSlug} cornerRadius={16}
                  className="p-5 mb-3 flex flex-col gap-2.5 cursor-pointer transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
                  onClick={() => router.push(`/dashboard/tests/sets/${setSlug}`)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {locale === 'ja' ? ordered[0].set_title_ja || ordered[0].set_title : ordered[0].set_title}
                    </p>
                    {ordered.some(f => f.published === false) && (
                      <span className="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--warning)', color: '#fff' }}>
                        {t('下書き', 'Draft')}
                      </span>
                    )}
                    <span className="text-xs shrink-0 px-2.5 py-1 rounded-full font-medium"
                      style={{ background: allScored ? 'var(--accent)' : 'var(--card-inset)', color: allScored ? '#fff' : 'var(--text-muted)' }}>
                      {allScored ? t('完了 ✓', 'Complete ✓') : `${scoredCount} / ${ordered.length}`}
                    </span>
                  </div>
                  {/* Skill chips — one per (section form, unique skill); filled once scored */}
                  <div className="flex flex-wrap gap-1.5">
                    {ordered.flatMap(f => {
                      const done = attempts[f.id]?.status === 'scored'
                      const skills = [...new Set((f.sections ?? []).map(s => s.skill))]
                      if (skills.length === 0) skills.push('')
                      return skills.map(sk => (
                        <span key={`${f.id}-${sk}`} className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            background: done ? 'var(--accent-bg)' : 'var(--card-inset)',
                            color: done ? 'var(--accent)' : 'var(--text-muted)',
                            boxShadow: done ? '0 0 0 1px var(--accent)' : 'none',
                          }}>
                          {sk ? skillName(sk) : f.title}{done ? ' ✓' : ''}
                        </span>
                      ))
                    })}
                  </div>
                </SquircleBox>
              )
            })
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedForms.filter(f => !f.set_slug).map(f => {
              const att = attempts[f.id]
              const done = att && att.status !== 'in_progress'
              const statusText = !att ? '' : att.status === 'scored'
                ? t(' · 完了', ' · Completed')
                : att.status === 'submitted'
                  ? t(' · 採点中', ' · In review')
                  : ''
              const label = starting === f.id
                ? '...'
                : !att
                  ? t('開始', 'Start')
                  : att.status === 'in_progress'
                    ? t('再開', 'Resume')
                    : att.status === 'submitted'
                      ? t('採点待ち', 'Results pending')
                      : t('結果を見る', 'View results')
              return (
                <SquircleBox key={f.id} cornerRadius={16} className="p-5 flex flex-col gap-3"
                  style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                      {locale === 'ja' ? f.title_ja || f.title : f.title}
                      {f.published === false && (
                        <span className="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--warning)', color: '#fff' }}>
                          {t('下書き', 'Draft')}
                        </span>
                      )}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {f.track ? (locale === 'ja' ? f.track.name_ja || f.track.name : f.track.name) : ''}
                      {' · '}
                      {f.mode === 'full_mock'
                        ? t('本番形式（公式スコア換算）', 'Full mock (official score)')
                        : t('スキル練習', 'Skill practice')}
                      {f.time_limit_seconds ? ` · ${Math.round(f.time_limit_seconds / 60)} min` : ''}
                      {statusText}
                    </p>
                  </div>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <button
                      onClick={() => go(f.id)}
                      disabled={starting === f.id}
                      className="px-5 py-2.5 font-medium self-start transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
                      style={{ background: done ? 'var(--card-inset)' : 'var(--accent)', color: done ? 'var(--text)' : '#fff' }}
                    >
                      {label}
                    </button>
                  </Squircle>
                </SquircleBox>
              )
            })}
            {selectedForms.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>{t('利用できるテストはまだありません。', 'No tests are available yet.')}</p>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
