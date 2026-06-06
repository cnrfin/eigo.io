'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useLanguage } from '@/context/LanguageContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import SkeletonCard from '@/components/ui/SkeletonCard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

// Per-set "About this mock test" copy: what it is, what it assesses, and what
// taking it is practically useful for. [ja, en]; unknown sets get generic text.
const ABOUT: Record<string, [string, string]> = {
  'ielts-academic-mock-01': [
    '本番形式のIELTSアカデミック模試です。リスニング40問・リーディング40問・ライティング2タスク・3パート構成のスピーキング面接で、4技能を9段階のバンドスコアで評価します。IELTSアカデミックは海外大学への留学や移住・ビザ申請で広く求められるテストです。本番を受験する前に、現在のバンドスコアと弱点を把握するのに役立ちます。',
    'A full-length IELTS Academic mock: 40 listening questions, 40 reading questions, two writing tasks and a three-part speaking interview, all in the official format. It assesses all four skills on the IELTS 9-band scale, with writing and speaking graded against the official band descriptors. IELTS Academic is the standard requirement for university study abroad and many visa applications — use this mock to find your current band and what to fix before booking the real test.',
  ],
  'ielts-gt-mock-01': [
    '本番形式のIELTSジェネラル・トレーニング模試です。リスニング40問、生活・職場の文章を扱うリーディング40問、手紙（タスク1）とエッセイ（タスク2）のライティング、3パート構成のスピーキング面接で、4技能を9段階のバンドスコアで評価します。ジェネラル・トレーニングは海外での就労や移住（オーストラリア・カナダ・イギリスなど）のビザ申請で求められるテストです。',
    'A full-length IELTS General Training mock: 40 listening questions, 40 reading questions based on everyday and workplace texts, a letter (Task 1) and an essay (Task 2) in writing, and a three-part speaking interview. All four skills are scored on the IELTS 9-band scale — GT Reading uses the official, stricter band conversion. General Training is the variant required for work visas and migration, notably to Australia, Canada and the UK.',
  ],
  'versant-mock-01': [
    'Versant by Pearson スピーキング＆リスニングテストの模試です。文の復唱、質問への即答、会話や物語の聞き取り、ストーリーの再話、意見陳述など、機械進行の短い設問が約40問続きます。英語の会話をリアルタイムで理解し、明瞭に応答する力をGSEスコア（10〜90）とリスニング・スピーキング・話し方のサブスコアで測定します。Versantは企業の採用選考で広く使われており、就職・転職での受験に向けた実践的な練習になります。',
    'A mock of the Versant by Pearson English Speaking and Listening Test: around 40 short, machine-paced items — repeating sentences, answering spoken questions, understanding conversations and passages, retelling stories and giving opinions. It assesses how well you understand conversational English in real time and respond clearly, scored on the GSE (10–90) with Listening, Speaking and Manner-of-Speaking subscores. Versant is widely used by companies as a hiring screen, so this is realistic preparation if a job application may involve it.',
  ],
  'toeic-lr-mock-01': [
    '本番形式のTOEIC Listening & Reading模試です。リスニング100問（写真描写・応答・会話・説明文）45分とリーディング100問（短文穴埋め・長文穴埋め・読解）75分で構成され、公式と同じ10〜990点のスケールでスコアを算出します。TOEIC L&Rは日本の就職・昇進で最も広く使われる英語テストです。本番前に現在のスコアと弱点パートを把握するのに最適です。',
    'A full-length TOEIC Listening & Reading mock: 100 listening questions (photographs, question–response, conversations and talks) in 45 minutes, and 100 reading questions (incomplete sentences, text completion and reading comprehension) in 75 minutes — scored on the official 10–990 scale. TOEIC L&R is the most widely used English test for hiring and promotion in Japan; use this mock to find your current score and which parts to focus on before test day.',
  ],
  'toeic-sw-mock-01': [
    '本番形式のTOEIC Speaking & Writing模試です。スピーキングは音読・写真描写・応答問題・意見表明など11問（約20分）、ライティングは写真描写文・メール作成・意見エッセイの8問（60分）で構成され、それぞれ0〜200点のスコアで評価されます。AIがETSの採点基準に沿って解答を採点し、発音や文法など項目別のフィードバックも確認できます。英語で「話す・書く」力を測りたい方におすすめです。',
    'A full TOEIC Speaking & Writing mock: 11 speaking tasks (~20 min) — reading aloud, describing pictures, responding to questions and expressing an opinion — and 8 writing tasks (60 min) — picture sentences, e-mail replies and an opinion essay. Each section is scored 0–200, with AI grading against ETS-style criteria and per-criterion feedback on pronunciation, grammar and more. The companion to the L&R mock for measuring your productive English.',
  ],
  'cefr-check': [
    '約20分で受けられる英語力のレベルチェックです。語彙・文法・リーディング・リスニングの問題に加えて、短いライティング1問とスピーキング2問に取り組みます。解答はCEFRの公式基準に沿って採点され、結果はA1〜C2のレベルで表示されます。いまの実力の確認や、これからの学習計画づくりにお役立てください。',
    'A roughly 20-minute placement check that estimates your CEFR level (A1–C2). A graded ladder of vocabulary, grammar, reading and listening questions is combined with one short writing task and two speaking recordings, judged directly against the official CEFR descriptors. Use it to find your starting level.',
  ],
}

/**
 * Circular ring showing how far through a section the student is
 * (answered questions / total). Sections are ideally one sitting, but they
 * can be resumed — the ring shows exactly where they left off.
 *   not started: empty ring · in progress: partial + %
 *   in review: full ring + … · completed: full ring + ✓
 */
function ProgressRing({ answered, total, status }: { answered: number; total: number; status?: string }) {
  const size = 48
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const started = !!status
  const pct = !started || total <= 0 ? 0 : Math.max(0, Math.min(100, (answered / total) * 100))
  const done = status === 'scored'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-hover)" strokeWidth={stroke} />
        {started && pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={done ? 'var(--success)' : 'var(--accent)'} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold"
        style={{ color: done ? 'var(--success)' : started ? 'var(--text)' : 'var(--text-muted)' }}>
        {done ? '100%' : status === 'submitted' ? '…' : status === 'in_progress' ? `${Math.round(pct)}%` : '—'}
      </span>
    </div>
  )
}

/**
 * Mock-set hub: two columns.
 *   Left  — the overall (combined) score once every section is finished,
 *           plus what this mock is and how it works.
 *   Right — the sections, each with a stateful button
 *           (Start Speaking → Resume Speaking → In review → Results).
 * Sections are sat separately and graded instantly; the official combined
 * score (overall band / CSE pass-fail) unlocks on completion.
 */
export default function SetPage() {
  const { slug } = useParams<{ slug: string }>()
  const { session } = useAuth()
  const { locale } = useLanguage()
  const router = useRouter()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  const [data, setData] = useState<Any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session?.access_token || !slug) return
    try {
      const r = await fetch(`/api/tests/sets/${slug}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setData(d)
    } catch {
      setError(t('模試を読み込めませんでした', 'Could not load this mock test'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, slug])

  useEffect(() => { load() }, [load])

  // Breadcrumbs: Dashboard > Tests > {set}
  const { setCrumbs } = useDashboardNav()
  useEffect(() => {
    const title = data?.set ? (locale === 'ja' ? data.set.title_ja || data.set.title : data.set.title) : t('模試', 'Mock test')
    setCrumbs([
      { label: t('テスト', 'Tests'), onClick: () => router.push('/dashboard/tests') },
      { label: title },
    ])
    return () => setCrumbs([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.set, locale, setCrumbs])

  const skillLabel = (s: string) => {
    const m: Record<string, [string, string]> = {
      reading: ['リーディング', 'Reading'], listening: ['リスニング', 'Listening'],
      writing: ['ライティング', 'Writing'], speaking: ['スピーキング', 'Speaking'],
    }
    return m[s] ? t(m[s][0], m[s][1]) : s
  }

  // Start / resume / open results for one section.
  const go = useCallback(async (formId: string, attempt: { id: string; status: string } | null) => {
    if (attempt) {
      router.push(attempt.status === 'in_progress' ? `/dashboard/tests/take/${attempt.id}` : `/dashboard/tests/results/${attempt.id}`)
      return
    }
    if (!session?.access_token) return
    setStarting(formId)
    try {
      const res = await fetch('/api/tests/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ formId }),
      })
      const d = await res.json()
      if (!res.ok || !d.attempt) throw new Error(d.error || 'failed')
      router.push(d.attempt.status === 'in_progress' ? `/dashboard/tests/take/${d.attempt.id}` : `/dashboard/tests/results/${d.attempt.id}`)
    } catch {
      setError(t('テストを開始できませんでした', 'Could not start the section'))
      setStarting(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, router])

  const combined = data?.combined

  function Headline() {
    if (!combined) return null
    if (combined.model === 'eiken_cse') {
      const passed = combined.passed
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: passed === true ? 'var(--success)' : passed === false ? 'var(--danger)' : 'var(--text)' }}>
            {passed === true ? t('合格', 'Pass') : passed === false ? t('不合格', 'Not yet') : '—'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('CSE合計', 'Total CSE')}: {combined.cse_total}</p>
        </>
      )
    }
    if (combined.model === 'ielts_band') {
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{combined.overall_band ?? '—'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('総合バンドスコア（4技能）', 'Overall band (all four skills)')}</p>
        </>
      )
    }
    if (combined.model === 'versant_gse') {
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{combined.overall ?? '—'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('GSE総合スコア', 'Overall GSE score')}{combined.cefr ? ` · CEFR ${combined.cefr}` : ''}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('AIによる推定スコアです（公式のVersantスコアではありません）', 'AI-estimated — not an official Versant score')}
          </p>
        </>
      )
    }
    if (combined.model === 'cefr_level') {
      // EN reads "High A2"; JA reads 「A2 上位」 (level first, position after).
      const sj: Record<string, string> = { low: '下位', mid: '中位', high: '上位' }
      const se: Record<string, string> = { low: 'Low', mid: 'Mid', high: 'High' }
      const st = combined.strength as string | null
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{combined.level ?? '—'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {st ? (locale === 'ja' ? `${combined.level} ${sj[st]}` : `${se[st]} ${combined.level}`) : combined.level}
            {combined.cefr_j ? ` · CEFR-J ${combined.cefr_j}${locale === 'ja' ? ' 相当' : ''}` : ''}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('推定レベルです（公式な認定ではありません）', 'Estimated level — not an official certification')}
          </p>
        </>
      )
    }
    if (combined.model === 'scaled') {
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{combined.scaled_total ?? '—'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('スケールスコア合計', 'Total scaled score')}</p>
        </>
      )
    }
    return (
      <>
        <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{combined.percent}%</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{combined.raw} / {combined.max}</p>
      </>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--accent-bg)', color: 'var(--danger)' }}>{error}</div>
      )}

      {loading ? (
        <div aria-hidden>
          <div className="h-8 w-72 max-w-full rounded mb-8 animate-pulse" style={{ background: 'var(--inset)' }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col gap-4">
              <SkeletonCard rows={3} center />
              <SkeletonCard rows={4} />
            </div>
            <div className="flex flex-col gap-3">
              <SkeletonCard rows={2} />
              <SkeletonCard rows={2} />
            </div>
          </div>
        </div>
      ) : !data ? null : (
        <>
          <h1 className="text-2xl sm:text-4xl font-bold mb-12" style={{ color: 'var(--text)' }}>
            {locale === 'ja' ? data.set?.title_ja || data.set?.title : data.set?.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* ── Left: overall score + about this mock (transparent, divider-separated) ── */}
            <div className="flex flex-col">
              <div className="p-4 pb-6 text-center">
                {data.complete ? (
                  <Headline />
                ) : (
                  <>
                    <p className="text-4xl font-bold" style={{ color: 'var(--text)' }}>
                      {(data.sections?.filter((s: Any) => s.attempt?.status === 'scored').length ?? 0)} / {data.sections?.length ?? 0}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
                      {t('完了したセクション', 'sections completed')}
                    </p>
                    <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                      {t('完了すると結果がここに表示されます', 'Your results appear here once completed')}
                    </p>
                  </>
                )}
              </div>

              {/* Per-skill scores once combined */}
              {Array.isArray(combined?.per_skill) && combined.per_skill.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-6" style={{ borderTop: '1px solid var(--divider)' }}>
                  {combined.per_skill.map((p: Any) => (
                    <div key={p.skill}>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{skillLabel(p.skill)}</p>
                      <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{p.band ?? p.cse ?? p.scaled ?? p.gse ?? p.label ?? '—'}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-4 py-6" style={{ borderTop: '1px solid var(--divider)' }}>
                <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>{t('この模試について', 'About this mock test')}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {ABOUT[slug]
                    ? t(ABOUT[slug][0], ABOUT[slug][1])
                    : (data.sections?.length ?? 0) <= 1
                      ? t('本番と同じ構成・分量の模試です。1回の受験で完了し、提出後に自動で採点され、スコアがこのページに表示されます。途中で中断しても、続きから再開できます。',
                          'A full-length mock with the same structure as the real test, completed in a single sitting. It is graded automatically after you submit, and your score appears on this page. If you have to stop, you can resume where you left off.')
                      : t('本番と同じ構成・分量の模試です。実際の試験と同じように、各セクションは別々のタイミングで受験できます。提出するとすぐに採点され、すべてのセクションが完了すると総合スコアが表示されます。',
                          'A full-length mock with the same structure as the real exam. Just like the real thing, each section is sat in its own sitting. Every section is graded as soon as you submit it, and your official-format combined score appears once all sections are complete.')}
                </p>
              </div>
            </div>

            {/* ── Right: sections with stateful buttons ── */}
            <div className="flex flex-col gap-3">
              {(data.sections ?? []).map((s: Any) => {
                const status = s.attempt?.status
                const single = (data.sections?.length ?? 0) <= 1
                const skill = s.form.form_skills?.length === 1 ? s.form.form_skills[0] : null
                const name = single
                  ? t('テスト', 'the test')
                  : skill ? skillLabel(skill) : (locale === 'ja' ? s.form.title_ja || s.form.title : s.form.title)
                const label = starting === s.form.id ? '...'
                  : !s.attempt ? (single ? t('テストを開始', 'Start the test') : t(`${name}を開始`, `Start ${name}`))
                  : status === 'in_progress' ? (single ? t('続きから再開', 'Resume the test') : t(`${name}を再開`, `Resume ${name}`))
                  : status === 'submitted' ? t('採点中', 'In review')
                  : t('結果を見る', 'View results')
                const done = s.attempt && status !== 'in_progress'
                return (
                  <SquircleBox key={s.form.id} cornerRadius={14} className="p-4 flex flex-col gap-3"
                    style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-2" style={{ color: 'var(--text)' }}>
                          {single ? (locale === 'ja' ? s.form.title_ja || s.form.title : s.form.title) : name}
                          {s.form.published === false && (
                            <span className="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium"
                              style={{ background: 'var(--warning)', color: '#fff' }}>
                              {t('下書き', 'Draft')}
                            </span>
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {s.form.time_limit_seconds ? `${Math.round(s.form.time_limit_seconds / 60)} min` : t('時間制限なし', 'No time limit')}
                          {status === 'scored'
                            ? ` · ${t('完了', 'Completed')}`
                            : status === 'submitted' ? ` · ${t('採点中', 'In review')}` : ''}
                        </p>
                      </div>
                      <ProgressRing answered={s.progress?.answered ?? 0} total={s.progress?.total ?? 0} status={status} />
                    </div>
                    <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                      <button onClick={() => go(s.form.id, s.attempt)} disabled={starting === s.form.id}
                        className="px-4 py-2 text-sm font-medium self-start transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
                        style={{ background: done ? 'var(--card-inset)' : 'var(--accent)', color: done ? 'var(--text)' : '#fff' }}>
                        {label}
                      </button>
                    </Squircle>
                  </SquircleBox>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
