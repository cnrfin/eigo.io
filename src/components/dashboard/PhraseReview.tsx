'use client'

/**
 * Phrase review on the dashboard, asked the same way as the app (eigo-ios
 * app/review.tsx): today's batch of up to 12 due phrases, one at a time, as a
 * meaning, build-it or complete-the-sentence question (lib/phraseQuiz). The answer
 * grades the phrase for FSRS: right first time is Good, wrong is Again, and a missed
 * phrase comes back tomorrow.
 *
 * One column, full width on phones and 640px on wider screens. On a keyboard (no
 * on-screen instructions, only the 1 2 3 badges on the answers):
 * 1 2 3 answer a meaning question, typing a letter picks the next word that starts
 * with it, Backspace takes the last word back, Enter checks and continues, Esc stops.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion'
import SquircleBox from '@/components/ui/SquircleBox'
import { type PhraseQ, type QuizCard, questionFor, tilesRight, todaysQueue } from '@/lib/phraseQuiz'
import { MASTERED_DAYS } from '@/lib/fsrs'

const BATCH = 12
const SPRING = { type: 'spring' as const, damping: 22, stiffness: 300, mass: 0.7 }
const EASE = [0.22, 1, 0.36, 1] as const

/** The dashboard's card shape, as /api/vocabulary returns it. */
export type ReviewCard = {
  id: string
  next_review_at: string
  created_at?: string | null
  state?: QuizCard['state']
  stability?: number | null
  scheduled_days?: number | null
  phrase: {
    phrase_en: string
    translation_ja: string
    example_en?: string | null
    explanation_en?: string | null
    explanation_ja?: string | null
    source?: string | null
  } | null
}

type Card = QuizCard & { scheduled_days?: number | null }
type Step = { card: Card; q: PhraseQ }
type Result = { card: Card; ok: boolean; nextReview: string; scheduledDays: number }

export function toQuizCards(cards: ReviewCard[]): Card[] {
  return cards.filter((c) => c.phrase).map((c) => ({
    id: c.id,
    phrase_en: c.phrase!.phrase_en ?? '',
    phrase_ja: c.phrase!.translation_ja ?? '',
    example_en: c.phrase!.example_en,
    explanation_en: c.phrase!.explanation_en,
    explanation_ja: c.phrase!.explanation_ja,
    source: c.phrase!.source,
    state: c.state ?? null,
    stability: c.stability ?? null,
    scheduled_days: c.scheduled_days ?? null,
    next_review_at: c.next_review_at,
    created_at: c.created_at,
  }))
}

const LABEL: Record<PhraseQ['kind'], [string, string]> = {
  meaning: ['Meaning', '意味'],
  build: ['Build it in English', '英語で組み立てる'],
  context: ['Complete the sentence', '文を完成させる'],
}

const tint = (v: string, pct = 18) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`

function Kbd({ children, onSolid }: { children: React.ReactNode; onSolid?: boolean }) {
  return (
    <kbd
      className="hidden sm:inline-flex [@media(hover:none)]:hidden items-center justify-center min-w-5 h-5 px-1.5 rounded-md text-xs font-semibold"
      style={{ border: `1px solid ${onSolid ? 'rgba(0,0,0,0.18)' : 'var(--edge)'}`, color: onSolid ? 'inherit' : 'var(--text-muted)', fontFamily: 'inherit' }}
    >
      {children}
    </kbd>
  )
}


function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="h-[52px] w-full sm:w-auto px-9 rounded-full text-[17px] font-semibold transition-[transform,background-color,color] duration-[120ms] ease-out active:scale-95 disabled:active:scale-100"
      style={{ background: disabled ? 'var(--inset)' : 'var(--accent)', color: disabled ? 'var(--text-subtle)' : 'var(--selected-text)' }}
    >
      {children}
    </button>
  )
}

export default function PhraseReview({ cards, token, locale, onExit }: {
  cards: ReviewCard[]
  token: string
  locale: string
  /** leave the review (the dashboard refetches so the list shows the new schedules) */
  onExit: () => void
}) {
  const ja = locale === 'ja'
  // the first batch, dealt once from the cards as they are now
  const [first] = useState(() => {
    const list = toQuizCards(cards)
    const { batch, waiting } = todaysQueue(list, BATCH)
    return { list, waiting, steps: batch.map((card) => ({ card, q: questionFor(card, list) })).filter((s): s is Step => !!s.q) }
  })
  const [all, setAll] = useState<Card[]>(first.list)
  const [steps, setSteps] = useState<Step[] | null>(first.steps)
  const [waiting, setWaiting] = useState(first.waiting)
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [placed, setPlaced] = useState<number[]>([]) // indexes into the bank
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [view, setView] = useState<'play' | 'summary'>('play')
  const shownAt = useRef(0) // set when a question is shown
  const saves = useRef<Promise<unknown>[]>([])

  const deal = useCallback((list: Card[]) => {
    const { batch, waiting: w } = todaysQueue(list, BATCH)
    setSteps(batch.map((card) => ({ card, q: questionFor(card, list) })).filter((s): s is Step => !!s.q))
    setWaiting(w)
    setPos(0); setPicked(null); setPlaced([]); setChecked(false); setResults([]); setView('play')
    shownAt.current = Date.now()
  }, [])

  useEffect(() => { shownAt.current = Date.now() }, [])

  const step = steps?.[pos]
  const q = step?.q
  const total = steps?.length ?? 0
  const answered = q?.kind === 'meaning' ? picked !== null : checked
  const words = q && q.kind !== 'meaning' ? placed.map((i) => q.bank[i]) : []
  const full = !!q && q.kind !== 'meaning' && placed.length === q.target.length
  const ok = !q ? false : q.kind === 'meaning' ? picked === q.answer : tilesRight(q.target, words)
  const score = results.filter((r) => r.ok).length

  /** grade the phrase on its first answer and save it in the background */
  const grade = (s: Step, right: boolean) => {
    const responseMs = Date.now() - shownAt.current
    const save = fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cardId: s.card.id, rating: right ? 3 : 1, responseMs }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    saves.current.push(save)
    // the summary counts today's results straight away; the saved schedule fills in when it lands
    const fallback = new Date(Date.now() + (right ? 3 : 1) * 864e5).toISOString()
    setResults((r) => [...r, { card: s.card, ok: right, nextReview: fallback, scheduledDays: right ? 3 : 1 }])
    save.then((data) => {
      if (!data?.next_review_at) return
      setResults((r) => r.map((x) => x.card.id === s.card.id ? { ...x, nextReview: data.next_review_at, scheduledDays: data.scheduled_days ?? x.scheduledDays } : x))
    })
  }

  const pick = (i: number) => {
    if (!step || !q || q.kind !== 'meaning' || picked !== null) return
    setPicked(i)
    grade(step, i === q.answer)
  }
  const place = (i: number) => {
    if (!q || q.kind === 'meaning' || checked || placed.includes(i) || placed.length >= q.target.length) return
    setPlaced((p) => [...p, i])
  }
  const unplace = (i: number) => { if (!checked) setPlaced((p) => p.filter((x) => x !== i)) }
  const check = () => {
    if (!step || !q || q.kind === 'meaning' || !full || checked) return
    setChecked(true)
    grade(step, ok)
  }
  const next = () => {
    if (pos + 1 >= total) { setView('summary'); return }
    setPos(pos + 1); setPicked(null); setPlaced([]); setChecked(false)
    shownAt.current = Date.now()
  }
  const close = () => { if (results.length > 0 && view === 'play') setView('summary'); else onExit() }
  const again = async () => {
    setSteps(null)
    // wait for this batch's saves, so the next batch skips what was just done
    await Promise.all(saves.current)
    saves.current = []
    try {
      const res = await fetch('/api/vocabulary', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      const fresh = toQuizCards(data.cards || [])
      setAll(fresh)
      deal(fresh)
    } catch { deal(all) }
  }

  // keyboard
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => { keyRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) return
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (view === 'summary') { if (e.key === 'Enter') { e.preventDefault(); onExit() } return }
    if (!q) return
    if (q.kind === 'meaning') {
      if (!answered && /^[1-9]$/.test(e.key) && +e.key <= q.options.length) { e.preventDefault(); pick(+e.key - 1) }
      else if (answered && e.key === 'Enter') { e.preventDefault(); next() }
      return
    }
    if (e.key === 'Enter') { e.preventDefault(); if (checked) next(); else check(); return }
    if (checked) return
    if (e.key === 'Backspace' && placed.length) { e.preventDefault(); unplace(placed[placed.length - 1]); return }
    if (e.key.length === 1 && /\p{L}|['’]/u.test(e.key)) {
      const k = e.key.toLowerCase().replace('’', "'")
      const hit = q.bank.findIndex((w, i) => !placed.includes(i) && w.toLowerCase().replace(/[’]/g, "'").startsWith(k))
      if (hit >= 0) { e.preventDefault(); place(hit) }
    }
  } })
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (view === 'summary') {
    return <Summary results={results} cards={all} waiting={waiting} locale={locale} onAgain={waiting > 0 ? again : undefined} onDone={onExit} />
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full max-w-[640px] mx-auto pt-2 sm:pt-4 pb-10">
        {/* close, progress across the batch, right so far */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={close}
            aria-label={ja ? '復習を終える' : 'Stop reviewing'}
            title={ja ? '復習を終える (Esc)' : 'Stop reviewing (Esc)'}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-transform duration-[120ms] ease-out active:scale-90"
            style={{ background: 'var(--card)', color: 'var(--text)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--inset)' }}
            role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={results.length}
            aria-label={ja ? `${total}個中${results.length}個` : `${results.length} of ${total} reviewed`}
          >
            <div className="h-full rounded-full transition-[width] duration-[450ms] motion-reduce:transition-none" style={{ width: `${total ? (results.length / total) * 100 : 0}%`, background: 'var(--accent)', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
          </div>
          <motion.div
            key={score}
            initial={score ? { scale: 1.18 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 400 }}
            className="h-9 pl-[11px] pr-3.5 rounded-full flex items-center gap-[7px] text-[15px] font-semibold tabular-nums"
            style={{ background: 'var(--card)', color: 'var(--text)' }}
            aria-label={ja ? `${score}問正解` : `${score} right so far`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--accent)" /><path d="M7.5 12.3l3 3 6-6.3" fill="none" stroke="var(--selected-text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {score}
          </motion.div>
        </div>

        {steps === null ? (
          <div className="flex justify-center pt-24" aria-label={ja ? '読み込み中' : 'Loading'}>
            <span className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', animationDuration: '0.7s' }} />
          </div>
        ) : !step || !q ? (
          <div className="pt-20 text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{ja ? '今は復習するフレーズがありません' : 'Nothing to review right now'}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{ja ? 'レッスンでフレーズを保存すると、ここで復習できます。' : 'Phrases you save in lessons come back here when they’re due.'}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pos}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <p className="mt-10 sm:mt-14 mb-3 text-[15px] font-semibold" style={{ color: 'var(--text-muted)' }}>{LABEL[q.kind][ja ? 1 : 0]}</p>

              {q.kind === 'meaning' && (
                <MeaningQuestion q={q} step={step} picked={picked} ja={ja} onPick={pick} onNext={next} />
              )}

              {q.kind !== 'meaning' && (
                <>
                  <TileQuestion q={q} placed={placed} checked={checked} ok={ok} ja={ja} onPlace={place} onUnplace={unplace} />
                  <div className="mt-7 flex items-center justify-end gap-3.5">
                    {checked
                      ? <PrimaryButton onClick={next}>{ja ? '次へ' : 'Continue'}</PrimaryButton>
                      : <PrimaryButton onClick={check} disabled={!full}>{ja ? 'チェック' : 'Check'}</PrimaryButton>}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </MotionConfig>
  )
}

function MeaningQuestion({ q, step, picked, ja, onPick, onNext }: {
  q: Extract<PhraseQ, { kind: 'meaning' }>
  step: Step
  picked: number | null
  ja: boolean
  onPick: (i: number) => void
  onNext: () => void
}) {
  const answered = picked !== null
  const wrong = answered && picked !== q.answer
  const explanation = ja ? step.card.explanation_ja || step.card.explanation_en : step.card.explanation_en || step.card.explanation_ja
  return (
    <>
      <p className="text-[32px] leading-[40px] sm:text-[44px] sm:leading-[52px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>{q.prompt}</p>

      <div className="mt-8 sm:mt-10 flex flex-col gap-2.5">
        {q.options.map((o, i) => {
          const s = !answered ? 'idle' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'
          const solid = s === 'right' || s === 'wrong'
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: s === 'dim' ? 0.4 : 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: answered ? 0 : 0.04 * i }}
              onClick={() => onPick(i)}
              disabled={answered}
              className="min-h-[60px] py-3 px-[18px] rounded-[18px] flex items-center gap-3.5 text-left text-[17px] sm:text-[18px] font-medium transition-[transform,background-color,color] duration-200 ease-out active:scale-[0.97] disabled:active:scale-100"
              style={{
                background: s === 'right' ? 'var(--accent)' : s === 'wrong' ? 'var(--danger)' : 'var(--card)',
                color: solid ? 'var(--selected-text)' : 'var(--text)',
              }}
              aria-label={s === 'right' ? `${o}, ${ja ? '正解' : 'right answer'}` : s === 'wrong' ? `${o}, ${ja ? '不正解' : 'wrong'}` : o}
            >
              <Kbd onSolid={solid}>{i + 1}</Kbd>
              <span lang="ja" className="flex-1" style={{ wordBreak: 'auto-phrase' as React.CSSProperties['wordBreak'], lineBreak: 'strict' }}>{o}</span>
              {s === 'wrong' && (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0"><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.22" /><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              )}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {wrong && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
            <SquircleBox cornerRadius={22} className="mt-4 px-5 py-[18px]" style={{ background: 'var(--card)' }} aria-live="polite">
              <p className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                {step.card.phrase_en} <span lang="ja" style={{ color: 'var(--accent)' }}>= {step.card.phrase_ja}</span>
              </p>
              {!!explanation && <p className="mt-2 text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>{explanation}</p>}
              {!!step.card.example_en?.trim() && <p className="mt-1.5 text-[15px] italic" style={{ color: 'var(--text-muted)' }}>“{step.card.example_en.trim()}”</p>}
            </SquircleBox>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-end gap-3.5 min-h-[52px]">
        {answered ? (
          <motion.div className="flex items-center gap-3.5 w-full sm:w-auto justify-end" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <PrimaryButton onClick={onNext}>{ja ? '次へ' : 'Continue'}</PrimaryButton>
          </motion.div>
        ) : null}
      </div>
    </>
  )
}

/** Words fly between the bank and the answer (framer-motion shared layout). */
function TileQuestion({ q, placed, checked, ok, ja, onPlace, onUnplace }: {
  q: Extract<PhraseQ, { kind: 'build' | 'context' }>
  placed: number[]
  checked: boolean
  ok: boolean
  ja: boolean
  onPlace: (i: number) => void
  onUnplace: (i: number) => void
}) {
  const tileBase = 'h-11 sm:h-12 px-4 sm:px-[18px] rounded-[14px] text-[17px] sm:text-[19px] font-medium whitespace-nowrap'
  const placedTiles = placed.map((bi, pos) => {
    const state = !checked ? 'idle' : q.bank[bi] === q.target[pos] ? 'ok' : 'bad'
    return (
      <motion.button
        key={`t${bi}`}
        layoutId={`t${bi}`}
        layout
        transition={SPRING}
        onClick={() => onUnplace(bi)}
        disabled={checked}
        className={tileBase}
        style={{
          background: state === 'ok' ? tint('--accent') : state === 'bad' ? tint('--danger') : 'var(--text)',
          color: state === 'ok' ? 'var(--accent)' : state === 'bad' ? 'var(--danger)' : 'var(--bg)',
          transition: 'background-color .25s ease, color .25s ease',
        }}
        aria-label={q.bank[bi] + (state === 'ok' ? (ja ? '、正しい位置' : ', right place') : state === 'bad' ? (ja ? '、違う位置' : ', wrong place') : '')}
      >
        {q.bank[bi]}
      </motion.button>
    )
  })
  const answer = q.kind === 'context' ? [...(q.before ?? []), ...(q.after ?? [])].join(' ') : ''
  const fix = q.kind === 'context'
    ? [...(q.before ?? []), ...q.target, ...(q.after ?? [])].join(' ')
    : q.target.join(' ') + (q.end ?? '')

  return (
    <LayoutGroup>
      {q.kind === 'build' ? (
        <>
          <p lang="ja" className="text-[26px] leading-[38px] sm:text-[34px] sm:leading-[48px] font-bold" style={{ color: 'var(--text)', wordBreak: 'auto-phrase' as React.CSSProperties['wordBreak'], lineBreak: 'strict' }}>{q.prompt}</p>
          <div className="mt-7 sm:mt-8 min-h-[60px] flex flex-wrap content-start gap-2 pb-3" style={{ borderBottom: '2px solid var(--inset)' }} aria-label={ja ? 'あなたの答え' : 'Your answer'}>
            {placedTiles}
            {!!q.end && placed.length > 0 && (
              <motion.span layout transition={SPRING} key="end" aria-hidden="true" className="h-11 sm:h-12 flex items-end pb-1.5 -ml-1 text-[22px] sm:text-[26px] font-medium" style={{ color: 'var(--text-muted)' }}>{q.end}</motion.span>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-[22px] sm:text-[26px] leading-[48px] font-medium" style={{ color: 'var(--text)' }} aria-label={ja ? `空欄のある文: ${answer}` : `Sentence with a gap: ${answer}`}>
          {(q.before ?? []).map((w, i) => <motion.span layout transition={SPRING} key={`b${i}`}>{w}</motion.span>)}
          {placed.length === 0 && <motion.span layout transition={SPRING} key="gap" aria-hidden="true" className="inline-block w-40 sm:w-56 h-11" style={{ borderBottom: '2px solid var(--inset)' }} />}
          {placedTiles}
          {/* punctuation straight after the gap (";", ",") hugs the word before it */}
          {(q.after ?? []).map((w, i) => <motion.span layout transition={SPRING} key={`a${i}`} className={i === 0 && /^[,.;:!?)]/.test(w) ? '-ml-1.5' : undefined}>{w}</motion.span>)}
        </div>
      )}

      <AnimatePresence>
        {checked && !ok && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
            className="mt-3 px-0.5 text-[17px] font-semibold" style={{ color: 'var(--accent)' }} aria-live="polite">
            {fix}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-10 sm:mt-11 min-h-[104px] flex flex-wrap justify-center content-start gap-2">
        {q.bank.map((w, i) => placed.includes(i) ? (
          // keeps the word's place in the bank while it's in the answer
          <span key={`g${i}`} aria-hidden="true" className={`${tileBase} inline-flex items-center`} style={{ background: 'var(--inset)', color: 'transparent', opacity: 0.5 }}>{w}</span>
        ) : (
          <motion.button
            key={`t${i}`}
            layoutId={`t${i}`}
            layout
            transition={SPRING}
            onClick={() => onPlace(i)}
            disabled={checked}
            className={`${tileBase} active:scale-95`}
            style={{ background: 'var(--card)', color: 'var(--text)' }}
          >
            {w}
          </motion.button>
        ))}
      </div>
    </LayoutGroup>
  )
}

function Summary({ results, cards, waiting, locale, onAgain, onDone }: {
  results: Result[]
  cards: Card[]
  waiting: number
  locale: string
  onAgain?: () => void
  onDone: () => void
}) {
  const ja = locale === 'ja'
  const right = results.filter((r) => r.ok).length
  const missed = results.length - right
  const mastered = results.filter((r) => r.ok && (r.card.scheduled_days ?? 0) < MASTERED_DAYS && r.scheduledDays >= MASTERED_DAYS)

  // what's due when, counting this session's new schedules
  const upcoming = useMemo(() => {
    const next = new Map(results.map((r) => [r.card.id, r.nextReview]))
    const now = new Date()
    const endTomorrow = new Date(now); endTomorrow.setDate(now.getDate() + 1); endTomorrow.setHours(23, 59, 59, 999)
    const endWeek = new Date(now); endWeek.setDate(now.getDate() + 7); endWeek.setHours(23, 59, 59, 999)
    let t = 0, w = 0, l = 0
    for (const card of cards) {
      if (card.source === 'tutor') continue
      const due = new Date(next.get(card.id) ?? card.next_review_at)
      if (due <= now) continue
      if (due <= endTomorrow) t++
      else if (due <= endWeek) w++
      else l++
    }
    return [
      { n: t, label: ja ? '明日' : 'Tomorrow' },
      { n: w, label: ja ? '今週' : 'This week' },
      { n: l, label: ja ? 'それ以降' : 'Later' },
    ]
  }, [results, cards, ja])

  const up = <path d="M12 19V5M6 11l6-6 6 6" />
  const tick = <path d="M5 12.5l4.5 4.5L19 7.5" />
  const redo = <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /></>
  const rows = [
    right > 0 && { icon: up, tone: 'up', text: ja ? `${right}個のフレーズが定着しました` : `${right} phrase${right === 1 ? '' : 's'} got stronger` },
    mastered.length > 0 && { icon: tick, tone: 'up', text: mastered.length === 1
      ? (ja ? `「${mastered[0].card.phrase_en}」を習得しました` : `“${mastered[0].card.phrase_en}” is now mastered`)
      : (ja ? `${mastered.length}個を習得しました` : `${mastered.length} are now mastered`) },
    missed > 0 && { icon: redo, tone: 'again', text: ja ? `${missed}個は明日もう一度` : `${missed} come${missed === 1 ? 's' : ''} back tomorrow for another go` },
  ].filter(Boolean) as { icon: React.ReactNode; tone: string; text: string }[]

  const fade = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: EASE, delay } })

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full max-w-[640px] mx-auto pt-6 sm:pt-12 pb-10">
        <motion.div {...fade(0)} className="text-center">
          <p className="text-[15px] sm:text-base font-semibold" style={{ color: 'var(--text-muted)' }}>{ja ? '今日の復習はおしまいです' : 'Today’s review is done'}</p>
          <p className="mt-1.5 text-[64px] leading-[70px] sm:text-[76px] sm:leading-[82px] font-semibold tracking-[-0.03em] tabular-nums" style={{ color: 'var(--text)' }}>
            {right}<span className="text-[40px] sm:text-[46px] tracking-[-0.02em]" style={{ color: 'var(--text-subtle)' }}> / {results.length}</span>
          </p>
          <p className="mt-0.5 text-[15px] sm:text-base" style={{ color: 'var(--text-secondary)' }}>{ja ? '1回目で正解' : 'right first time'}</p>
        </motion.div>

        <div className={`mt-8 grid gap-3 ${rows.length ? 'sm:grid-cols-[1.6fr_1fr]' : ''}`}>
          {rows.length > 0 && (
            <motion.div {...fade(0.08)}>
              <SquircleBox cornerRadius={22} className="px-[18px] py-1 h-full" style={{ background: 'var(--card)' }}>
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-3.5" style={i ? { borderTop: '1px solid var(--divider)' } : undefined}>
                    <span className="w-[34px] h-[34px] shrink-0 rounded-[11px] flex items-center justify-center" style={{ background: tint(r.tone === 'up' ? '--accent' : '--amber', 16) }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={r.tone === 'up' ? 'var(--accent)' : 'var(--amber)'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{r.icon}</svg>
                    </span>
                    <p className="flex-1 text-[15.5px] sm:text-base" style={{ color: 'var(--text)' }}>{r.text}</p>
                  </div>
                ))}
              </SquircleBox>
            </motion.div>
          )}
          <motion.div {...fade(0.16)} className={`grid grid-cols-3 gap-2 ${rows.length ? 'sm:grid-cols-1' : ''}`}>
            {upcoming.map((u) => (
              <SquircleBox key={u.label} cornerRadius={18} className={`px-3.5 py-3 sm:px-[18px] flex flex-col ${rows.length ? 'sm:flex-row-reverse sm:items-center sm:justify-between' : ''}`} style={{ background: 'var(--card)' }} aria-label={`${u.label}: ${u.n}`}>
                <p className="text-[26px] leading-[30px] font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{u.n}</p>
                <p className="mt-0.5 sm:mt-0 text-[13px] sm:text-[15px]" style={{ color: 'var(--text-muted)' }}>{u.label}</p>
              </SquircleBox>
            ))}
          </motion.div>
        </div>

        <motion.div {...fade(0.24)} className="mt-8 flex flex-col sm:flex-row justify-center gap-2.5">
          {onAgain && (
            <button
              onClick={onAgain}
              className="h-[52px] px-7 rounded-full text-base font-medium transition-transform duration-[120ms] ease-out active:scale-95"
              style={{ border: '1px solid var(--edge)', color: 'var(--text)' }}
            >
              {ja ? `あと${Math.min(BATCH, waiting)}個（残り${waiting}個）` : `Do ${Math.min(BATCH, waiting)} more (${waiting} waiting)`}
            </button>
          )}
          <button
            onClick={onDone}
            className="h-[52px] px-11 rounded-full text-[17px] font-semibold transition-transform duration-[120ms] ease-out active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
          >
            {ja ? '完了' : 'Done'}
          </button>
        </motion.div>
      </div>
    </MotionConfig>
  )
}
