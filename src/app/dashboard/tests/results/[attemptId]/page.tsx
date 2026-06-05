'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import SquircleBox from '@/components/ui/SquircleBox'
import SkeletonCard from '@/components/ui/SkeletonCard'
import Header from '@/components/Header'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { session } = useAuth()
  const { locale } = useLanguage()
  const t = (ja: string, en: string) => (locale === 'ja' ? ja : en)

  const [data, setData] = useState<Any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session?.access_token || !attemptId) return
    try {
      const r = await fetch(`/api/tests/attempts/${attemptId}/results`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setData(d)
    } catch {
      setError(t('結果を読み込めませんでした', 'Could not load results'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, attemptId])

  // Initial load happens once per attempt — NOT again on token refresh, which
  // would return newly-signed audio URLs and reset any playing <audio> element.
  // (The grading poll below still re-runs `load` intentionally while pending.)
  const loadedAttemptRef = useRef<string | null>(null)
  useEffect(() => {
    if (!session?.access_token || loadedAttemptRef.current === attemptId) return
    loadedAttemptRef.current = attemptId
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, attemptId])

  // While AI grading is still running, poll until results are ready.
  const pending = data && data.attempt?.status !== 'scored'
  useEffect(() => {
    if (!pending || data?.attempt?.review_mode !== 'ai') return
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [pending, data?.attempt?.review_mode, load])

  const overall = data?.attempt?.overall_score
  const skillScores: Any[] = data?.skill_scores ?? []
  // CEFR check: per-skill scaled scores are continuous level numbers (1=A1..6=C2).
  const cefrLabel = (n: number | null | undefined) => {
    if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—'
    return ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'][Math.min(6, Math.max(0, Math.floor(Number(n))))]
  }
  const skillLabel = (s: string) => {
    const m: Record<string, [string, string]> = {
      reading: ['リーディング', 'Reading'], listening: ['リスニング', 'Listening'],
      writing: ['ライティング', 'Writing'], speaking: ['スピーキング', 'Speaking'],
    }
    return m[s] ? t(m[s][0], m[s][1]) : s
  }

  // Headline score block depends on the scoring model.
  function Headline() {
    if (!overall) return null
    if (overall.official_score_available === false) {
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--text)' }}>{overall.percent}%</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {overall.raw} / {overall.max} {t('問正解（練習のため公式スコアはありません）', 'correct (practice — not an official score)')}
          </p>
        </>
      )
    }
    if (overall.model === 'eiken_cse') {
      const passed = overall.passed
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: passed === true ? 'var(--success)' : passed === false ? 'var(--danger)' : 'var(--text)' }}>
            {passed === true ? t('合格', 'Pass') : passed === false ? t('不合格', 'Not yet') : t('採点中', 'Pending')}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('CSE合計', 'Total CSE')}: {overall.cse_total}
          </p>
        </>
      )
    }
    if (overall.model === 'cefr_level') {
      // EN reads "High A2"; JA reads 「A2 上位」 (level first, position after).
      const sj: Record<string, string> = { low: '下位', mid: '中位', high: '上位' }
      const se: Record<string, string> = { low: 'Low', mid: 'Mid', high: 'High' }
      const st = overall.strength as string | null
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{overall.level ?? '—'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {st ? (locale === 'ja' ? `${overall.level} ${sj[st]}` : `${se[st]} ${overall.level}`) : overall.level}
            {overall.cefr_j ? ` · CEFR-J ${overall.cefr_j}${locale === 'ja' ? ' 相当' : ''}` : ''}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('推定レベルです（公式な認定ではありません）', 'Estimated level — not an official certification')}
          </p>
        </>
      )
    }
    if (overall.model === 'versant_gse') {
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{overall.overall ?? '—'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('GSE総合スコア', 'Overall GSE score')}{overall.cefr ? ` · CEFR ${overall.cefr}` : ''}
          </p>
          {overall.manner_of_speaking != null && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {t('話し方（Manner of Speaking）', 'Manner of Speaking')}: {overall.manner_of_speaking}
            </p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('AIによる推定スコアです（公式のVersantスコアではありません）', 'AI-estimated — not an official Versant score')}
          </p>
        </>
      )
    }
    if (overall.model === 'ielts_band') {
      // A single-skill mock (one section of a set) reports its SECTION band —
      // the true overall band needs all four skills (shown on the set page).
      const single = Array.isArray(overall.per_skill) && overall.per_skill.length === 1 ? overall.per_skill[0] : null
      return (
        <>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>
            {(single ? single.band : overall.overall_band) ?? '—'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {single ? t(`${skillLabel(single.skill)}バンドスコア`, `${skillLabel(single.skill)} band`) : t('総合バンドスコア', 'Overall band')}
          </p>
        </>
      )
    }
    // TOEIC / scaled / generic
    return (
      <>
        <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>
          {overall.scaled_total ?? overall.scaled ?? `${overall.percent}%`}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {overall.scaled_total != null ? t('スケールスコア合計', 'Total scaled score') : `${overall.raw} / ${overall.max}`}
        </p>
      </>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div aria-hidden>
            <div className="h-4 w-24 rounded mb-4 animate-pulse" style={{ background: 'var(--inset)' }} />
            <div className="h-8 w-72 max-w-full rounded mb-5 animate-pulse" style={{ background: 'var(--inset)' }} />
            <SkeletonCard rows={2} center className="mb-4" />
            <div className="grid grid-cols-2 gap-3 mb-6">
              <SkeletonCard rows={2} />
              <SkeletonCard rows={2} />
            </div>
            <div className="flex flex-col gap-3">
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
            </div>
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--accent-bg)', color: 'var(--danger)' }}>{error}</div>
        ) : pending ? (
          <>
            <Link href="/dashboard/tests" className="text-sm" style={{ color: 'var(--accent)' }}>
              ← {t('テスト一覧', 'All tests')}
            </Link>
            <h1 className="text-2xl font-bold mt-3 mb-2" style={{ color: 'var(--text)' }}>
              {locale === 'ja' ? data.form?.title_ja || data.form?.title : data.form?.title}
            </h1>
            <SquircleBox cornerRadius={18} className="p-8 my-4 text-center" style={{ background: 'var(--surface)' }}>
              {data.attempt?.review_mode === 'human' ? (
                <>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t('講師が採点中です', 'A teacher is reviewing your answers')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t('採点が終わると、こことダッシュボードに結果が表示されます。', "You'll find your results here and in your dashboard once grading is complete.")}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t('結果を準備しています', 'Your results are being prepared')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t('数分かかることがあります。このページを離れても、後で戻って確認できます。', 'This can take a few minutes — you can leave and come back to this page.')}</p>
                  <button onClick={load} className="text-sm mt-4 px-4 py-2 rounded-lg transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.95]" style={{ color: 'var(--accent)', boxShadow: '0 0 0 1px var(--border)' }}>{t('更新', 'Refresh')}</button>
                </>
              )}
            </SquircleBox>
          </>
        ) : (
          <>
            <Link href="/dashboard/tests" className="text-sm" style={{ color: 'var(--accent)' }}>
              ← {t('テスト一覧', 'All tests')}
            </Link>

            <h1 className="text-2xl font-bold mt-3 mb-1" style={{ color: 'var(--text)' }}>
              {locale === 'ja' ? data.form?.title_ja || data.form?.title : data.form?.title}
            </h1>

            {/* Score summary */}
            <SquircleBox cornerRadius={18} className="p-6 my-4 text-center"
              style={{ background: 'var(--surface)' }}>
              <Headline />
              {overall?.pending_human_review && (
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  {t('一部の解答は講師の採点待ちです。', 'Some answers are awaiting tutor grading.')}
                </p>
              )}
            </SquircleBox>

            {/* Per-skill */}
            {skillScores.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {skillScores.map((s: Any) => (
                  <SquircleBox key={s.skill} cornerRadius={14} className="p-4"
                    style={{ background: 'var(--surface)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{skillLabel(s.skill)}</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                      {overall?.model === 'cefr_level'
                        ? cefrLabel(s.scaled_score)
                        : s.scaled_score != null ? s.scaled_score : `${s.raw_score} / ${s.max_score}`}
                    </p>
                  </SquircleBox>
                ))}
              </div>
            )}

            {/* Per-question review */}
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('解答の確認', 'Review')}</h2>
            <div className="flex flex-col gap-6">
              {(data.sections ?? []).map((section: Any) => (
                <section key={section.id}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                    {section.part_label}{section.part_label && section.title ? ' · ' : ''}{section.title}
                  </h3>
                  {section.groups.map((group: Any) => (
                    <div key={group.id} className="mb-4">
                      {group.passage_text && (
                        <SquircleBox cornerRadius={12} className="p-3 mb-2 text-sm whitespace-pre-line"
                          style={{ background: 'var(--surface)', color: 'var(--text-secondary)', boxShadow: '0 0 0 1px var(--border)' }}>
                          {group.passage_text}
                        </SquircleBox>
                      )}
                      {group.audio?.url && (
                        <audio controls src={group.audio.url} className="w-full mb-2" />
                      )}
                      {group.audio?.transcript && (
                        <details className="mb-2 text-sm">
                          <summary className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                            {t('スクリプトを表示', 'Show transcript')}
                          </summary>
                          <p className="mt-1 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                            {group.audio.transcript}
                          </p>
                        </details>
                      )}
                      <div className="flex flex-col gap-3">
                        {group.questions.map((q: Any) => <QuestionReview key={q.id} q={q} t={t} />)}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function QuestionReview({ q, t }: { q: Any; t: (ja: string, en: string) => string }) {
  const resp = q.response
  const isChoice = q.options?.length > 0
  const isMatching = Array.isArray(q.payload?.items)
  const correctIds: string[] = q.correct_option_ids ?? []
  const selected: string[] = resp?.selected_option_ids ?? []
  const score = resp?.score
  const maxScore = q.max_score
  const correctness = resp?.is_correct
  const aiFeedback = resp?.ai_feedback

  // Matching: student's map + correct map (revealed in review).
  let matchSel: Record<string, string> = {}
  try { matchSel = JSON.parse(resp?.text_response ?? '{}') } catch { matchSel = {} }
  const matchAnswer: Record<string, string> = (q.payload?.answer as Record<string, string>) ?? {}
  const optText = (id: string) => {
    const o = (q.payload?.match_options as Any[] | undefined)?.find((x: Any) => x.id === id)
    return o ? `${o.id}. ${o.text}` : id || '—'
  }

  // Correctness is shown inline (✓/✗ on the options) — the card border stays neutral.
  void correctness

  return (
    <SquircleBox cornerRadius={14} className="p-4" style={{ background: 'var(--surface)' }}>
      <div className="flex justify-between gap-3 mb-2">
        <p className="font-medium" style={{ color: 'var(--text)' }}>{q.prompt}</p>
        {score != null && (
          <span className="text-sm font-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>{score}/{maxScore}</span>
        )}
      </div>

      {isChoice && (
        <div className="flex flex-col gap-1.5">
          {q.options.map((o: Any) => {
            const isCorrect = correctIds.includes(o.id)
            const isPicked = selected.includes(o.id)
            const color = isCorrect ? 'var(--success)' : isPicked ? 'var(--danger)' : 'var(--text-secondary)'
            return (
              <div key={o.id} className="flex items-center gap-2 text-sm" style={{ color }}>
                <span className="font-semibold w-5">{o.label}</span>
                <span>{o.content}</span>
                {isCorrect && <span className="ml-1">✓</span>}
                {isPicked && !isCorrect && <span className="ml-1">✗ {t('あなたの解答', 'your answer')}</span>}
              </div>
            )
          })}
        </div>
      )}

      {isMatching && (
        <div className="flex flex-col gap-1.5 text-sm">
          {(q.payload.items as Any[]).map((item: Any) => {
            const picked = matchSel[item.id]
            const right = matchAnswer[item.id]
            const ok = String(picked) === String(right)
            return (
              <div key={item.id} className="flex flex-col">
                <span style={{ color: 'var(--text)' }}>{item.text}</span>
                <span style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>
                  {ok ? '✓' : '✗'} {t('あなた: ', 'You: ')}{picked ? optText(picked) : t('（未選択）', '(none)')}
                  {!ok && <span style={{ color: 'var(--success)' }}>  →  {optText(right)}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!isChoice && !isMatching && (
        <div className="text-sm flex flex-col gap-1">
          {resp?.audio_url ? (
            <>
              <audio controls src={resp.audio_url} className="w-full mb-1" />
              <p style={{ color: 'var(--text-muted)' }}>{t('あなたの録音', 'Your recording')}</p>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('あなたの解答: ', 'Your answer: ')}</span>
              {resp?.text_response || <em style={{ color: 'var(--text-muted)' }}>{t('（無回答）', '(no answer)')}</em>}
            </p>
          )}
          {Array.isArray(q.payload?.accepted) && q.payload.accepted.length > 0 && (
            <p style={{ color: 'var(--success)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('正解: ', 'Accepted: ')}</span>
              {q.payload.accepted.join(' / ')}
            </p>
          )}
        </div>
      )}

      {/* Author-written explanation (revealed after scoring) */}
      {(q.payload?.explanation || q.payload?.explanation_ja) && (
        <p className="mt-3 pt-3 text-sm" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--divider)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{t('解説: ', 'Explanation: ')}</span>
          {t(q.payload.explanation_ja || q.payload.explanation, q.payload.explanation || q.payload.explanation_ja)}
        </p>
      )}

      {/* AI / tutor feedback for writing & speaking */}
      {aiFeedback && (aiFeedback.improvements_en || aiFeedback.strengths_en || aiFeedback.tutor_comment || aiFeedback.pronunciation) && (
        <div className="mt-3 pt-3 text-sm flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--divider)' }}>
          {aiFeedback.band != null && (
            <p style={{ color: 'var(--accent)' }}>{t('バンド', 'Band')}: <strong>{aiFeedback.band}</strong></p>
          )}
          {aiFeedback.pronunciation && (
            <p style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('発音: ', 'Pronunciation: ')}</span>{aiFeedback.pronunciation}
            </p>
          )}
          {aiFeedback.strengths_en && (
            <p style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('良い点: ', 'Strengths: ')}</span>
              {t(aiFeedback.strengths_en, aiFeedback.strengths_en)}
            </p>
          )}
          {(aiFeedback.improvements_ja || aiFeedback.improvements_en) && (
            <p style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('改善点: ', 'To improve: ')}</span>
              {t(aiFeedback.improvements_ja || aiFeedback.improvements_en, aiFeedback.improvements_en)}
            </p>
          )}
          {aiFeedback.tutor_comment && (
            <p style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('講師より: ', 'Tutor: ')}</span>{aiFeedback.tutor_comment}
            </p>
          )}
        </div>
      )}
    </SquircleBox>
  )
}
