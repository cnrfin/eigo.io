'use client'

/**
 * Interactive practice blocks (pronunciation first, usable in any course): listen and choose, model and repeat,
 * "Did you get it?", speaking prompts, personal gap-fills, a timer, the can-do goal, and "show" gates.
 *
 * Shared answer state goes through the slide activity context (SlideRenderer's useActivityState): in a live
 * lesson the student's and teacher's screens stay in step, and each result is reported as a plain-English
 * `detail` for the AI tutor. Without a provider (the studio) each block keeps its own state.
 * Keep it framework-free like the rest of src/lib/slides.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { RichText, resolveAsset, useActivityState, useVocabSave, type SlideMode } from './SlideRenderer'
import type { CanDoBlock, GapFillBlock, ListenBlock, ListenOption, PromptBlock, RepeatBlock, SayMatchBlock, TimerBlock } from './types'

/* ---------- small shared pieces ---------- */

let playing: HTMLAudioElement | null = null
/** Play one clip at a time (a new one stops the last). */
function playClip(src: string) {
  if (typeof Audio === 'undefined' || !src) return
  playing?.pause()
  playing = new Audio(src)
  void playing.play().catch(() => undefined)
}

const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
)
const Tick = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="es-ico">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
const Cross = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="es-ico">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
const TeacherTag = () => <span className="es-tutor-tag es-tag-inline">Teacher</span>

const optLabel = (o: ListenOption | undefined) => o?.text || o?.alt || 'picture'

/* ---------- reveal: hidden until someone taps "Show" ---------- */

export function RevealGate({ blockId, mode, children }: { blockId: string; mode: SlideMode; children: ReactNode }) {
  const [st, setSt] = useActivityState<{ shown: boolean }>(`${blockId}:reveal`, { shown: false })
  if (mode === 'editor')
    return (
      <div className="es-reveal is-editor">
        {children}
        <span className="es-reveal-tag">Hidden until “Show”</span>
      </div>
    )
  if (st.shown) return <div className="es-reveal is-open">{children}</div>
  if (mode === 'teacher')
    return (
      <div className="es-reveal is-teacher">
        <div className="es-reveal-dim">{children}</div>
        <button type="button" className="es-reveal-btn" onClick={() => setSt({ shown: true })}>
          Show the student
        </button>
      </div>
    )
  return (
    <div className="es-reveal is-hidden">
      <button type="button" className="es-reveal-btn" onClick={() => setSt({ shown: true })}>
        Show
      </button>
    </div>
  )
}

/* ---------- listen and choose ---------- */

export function ListenView({ b, blockId, mode, assetBase }: { b: ListenBlock; blockId: string; mode: SlideMode; assetBase?: string }) {
  const [st, setSt, api] = useActivityState<{ at: number; answers: number[]; plays: number[] }>(blockId, { at: 0, answers: [], plays: [] })
  const teacher = mode !== 'student'
  const total = b.items.length
  if (mode === 'editor')
    return (
      <div className="es-listen is-editor">
        {b.items.map((it, i) => (
          <div key={i} className="es-listen-row">
            <span className="es-num">{i + 1}</span>
            <span className={`es-listen-clip${it.audio ? '' : ' is-missing'}`}>{it.audio ? '♪' : 'no clip'}</span>
            {it.options.map((o, k) => (
              <span key={k} className={`es-chip${k === it.answer ? ' is-key' : ''}`}>
                {optLabel(o)}
              </span>
            ))}
          </div>
        ))}
      </div>
    )
  const at = Math.min(st.at, total)
  const right = st.answers.filter((a, i) => a === b.items[i]?.answer).length
  if (at >= total || !total)
    return (
      <div className="es-listen is-done">
        <div className="es-listen-score">
          <b>
            {right} of {total}
          </b>{' '}
          correct
        </div>
        <div className="es-listen-recap">
          {b.items.map((it, i) => {
            const ok = st.answers[i] === it.answer
            return (
              <span key={i} className={`es-chip ${ok ? 'is-right' : 'is-wrong'}`}>
                {ok ? <Tick /> : <Cross />}
                {optLabel(it.options[it.answer])}
              </span>
            )
          })}
        </div>
        <button type="button" className="es-act-reset" onClick={() => setSt({ at: 0, answers: [], plays: [] })}>
          Try again
        </button>
      </div>
    )
  const it = b.items[at]
  const chosen = st.answers[at]
  const answered = chosen !== undefined
  const plays = st.plays[at] ?? 0
  const canPlay = !!it.audio && (b.replays === 0 || plays <= b.replays || teacher)
  const pictures = it.options.some((o) => o.image)
  const play = () => {
    if (!canPlay) return
    playClip(resolveAsset(it.audio, assetBase))
    const next = [...st.plays]
    next[at] = plays + 1
    setSt({ ...st, plays: next })
  }
  const choose = (k: number) => {
    if (answered) return
    const answers = [...st.answers]
    answers[at] = k
    setSt({ ...st, answers })
    const ok = k === it.answer
    api?.onResult?.(blockId, {
      correct: ok,
      message: ok ? 'Correct!' : `It was “${optLabel(it.options[it.answer])}”.`,
      detail: `Listening, item ${at + 1} of ${total}: the student tapped "${optLabel(it.options[k])}", which is ${ok ? 'right' : `wrong (it was "${optLabel(it.options[it.answer])}")`}. Score so far: ${answers.filter((a, i) => a === b.items[i]?.answer).length}/${at + 1}.`,
    })
  }
  return (
    <div className="es-listen">
      <div className="es-listen-top">
        {it.audio ? (
          <button type="button" className="es-media-btn es-listen-play" onClick={play} disabled={!canPlay} aria-label="Play">
            <Play />
          </button>
        ) : null}
        <div className="es-listen-ask">
          {it.audio ? (
            <span>{b.replays && !teacher ? `Listen (${Math.max(0, b.replays + 1 - plays)} left)` : 'Listen'}</span>
          ) : (
            <span>Listen to your teacher.</span>
          )}
          {teacher ? (
            <span className="es-listen-say">
              <TeacherTag />
              {it.audio ? 'Answer' : 'Say'}: <b>{it.says || optLabel(it.options[it.answer])}</b>
            </span>
          ) : null}
        </div>
      </div>
      <div className={`es-listen-opts${pictures ? ' is-pics' : ''}`} style={{ gridTemplateColumns: `repeat(${Math.min(it.options.length, pictures ? 2 : 4)}, 1fr)` }}>
        {it.options.map((o, k) => {
          const cls = answered ? (k === it.answer ? ' is-right' : k === chosen ? ' is-wrong' : ' is-off') : teacher && k === it.answer ? ' is-key' : ''
          return (
            <button key={k} type="button" className={`es-listen-opt${cls}`} onClick={() => choose(k)}>
              {o.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAsset(o.image, assetBase)} alt={o.alt ?? ''} draggable={false} />
              ) : null}
              {o.text ? <span>{o.text}</span> : null}
              {!o.text && !o.image ? <span className="es-muted">{o.alt || 'picture'}</span> : null}
            </button>
          )
        })}
      </div>
      <div className="es-listen-foot">
        <span>
          {at + 1} of {total}
        </span>
        {answered && it.says ? (
          <span className="es-listen-says">
            “<RichText text={it.says} />”
          </span>
        ) : null}
        {answered ? (
          <button type="button" className="es-next" onClick={() => setSt({ ...st, at: at + 1 })}>
            {at + 1 < total ? 'Next' : 'See score'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/* ---------- model and repeat ---------- */

const VOICES = [
  ['ukF', 'UK ♀'],
  ['ukM', 'UK ♂'],
  ['usF', 'US ♀'],
  ['usM', 'US ♂'],
] as const

export function RepeatView({ b, blockId, mode, assetBase }: { b: RepeatBlock; blockId: string; mode: SlideMode; assetBase?: string }) {
  const [st, setSt, api] = useActivityState<{ cur: number; ok: boolean[]; tries: number[] }>(blockId, { cur: 0, ok: [], tries: [] })
  const teacher = mode === 'teacher'
  const cur = Math.min(st.cur, Math.max(0, b.items.length - 1))
  const firstClip = (i: number) => VOICES.map(([k]) => b.items[i]?.audio?.[k]).find(Boolean)
  const pick = (i: number) => {
    if (mode === 'editor') return
    setSt({ ...st, cur: i })
    const c = firstClip(i)
    if (c) playClip(resolveAsset(c, assetBase))
  }
  const mark = (understood: boolean) => {
    const ok = [...st.ok]
    const tries = [...st.tries]
    tries[cur] = (tries[cur] ?? 0) + 1
    if (understood) ok[cur] = true
    const next = understood && cur + 1 < b.items.length ? cur + 1 : cur
    setSt({ cur: next, ok, tries })
    api?.onResult?.(blockId, {
      correct: understood,
      message: understood ? 'Understood!' : 'Once more',
      detail: `Repeat, "${b.items[cur].text}": the teacher ${understood ? 'understood it' : 'asked for another try'} (try ${tries[cur]}).`,
    })
  }
  const it = b.items[cur]
  return (
    <div className="es-repeat">
      <div className="es-repeat-cards">
        {b.items.map((x, i) => (
          <button
            key={i}
            type="button"
            className={`es-repeat-card${i === cur && mode !== 'editor' ? ' is-cur' : ''}${st.ok[i] ? ' is-ok' : ''}`}
            onClick={() => pick(i)}
          >
            <RichText text={x.text} />
            {st.ok[i] ? <Tick /> : null}
            {(st.tries[i] ?? 0) > 0 && !st.ok[i] ? <span className="es-repeat-tries">{'•'.repeat(Math.min(3, st.tries[i]))}</span> : null}
          </button>
        ))}
      </div>
      {it && mode !== 'editor' ? (
        <div className="es-repeat-bar">
          <span className="es-repeat-word">
            <RichText text={it.text} />
            {it.respell ? <span className="es-repeat-respell">{it.respell}</span> : null}
          </span>
          <span className="es-repeat-voices">
            {VOICES.filter(([k]) => it.audio?.[k]).map(([k, label]) => (
              <button key={k} type="button" className="es-voice" onClick={() => playClip(resolveAsset(it.audio![k]!, assetBase))}>
                <Play />
                {label}
              </button>
            ))}
          </span>
          {teacher ? (
            <span className="es-repeat-mark">
              <button type="button" className="es-btn-ok" onClick={() => mark(true)}>
                <Tick /> Understood
              </button>
              <button type="button" className="es-btn-again" onClick={() => mark(false)}>
                Once more
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ---------- "Did you get it?" ---------- */

type SayMatchState = { round: number; pick: number | null; stage: 'pick' | 'said' | 'check' | 'result'; heard: number | null; results: boolean[] }

export function SayMatchView({ b, blockId, mode }: { b: SayMatchBlock; blockId: string; mode: SlideMode }) {
  const blank: SayMatchState = { round: 0, pick: null, stage: 'pick', heard: null, results: [] }
  const [st, setSt, api] = useActivityState<SayMatchState>(blockId, blank)
  const teacher = mode === 'teacher'
  const pairs = b.pairs.length ? b.pairs : [{ a: 'light', b: 'right' }]
  const rounds = Math.max(1, b.rounds)
  const score = st.results.filter(Boolean).length
  if (mode === 'editor')
    return (
      <div className="es-say is-editor">
        <div className="es-say-tiles">
          <span className="es-say-tile">{pairs[0].a}</span>
          <span className="es-say-tile">{pairs[0].b}</span>
        </div>
        <div className="es-say-foot">
          {rounds} rounds · {pairs.map((p) => `${p.a}/${p.b}`).join(', ')}
        </div>
      </div>
    )
  if (st.round >= rounds)
    return (
      <div className="es-say is-done">
        <div className="es-listen-score">
          <b>
            {score} of {rounds}
          </b>{' '}
          understood
        </div>
        <button type="button" className="es-act-reset" onClick={() => setSt(blank)}>
          Play again
        </button>
      </div>
    )
  const pair = pairs[st.round % pairs.length]
  const words = [pair.a, pair.b]
  const finish = (heard: number) => {
    const ok = heard === st.pick
    const results = [...st.results, ok]
    setSt({ ...st, heard, stage: 'result', results })
    api?.onResult?.(blockId, {
      correct: ok,
      message: ok ? 'Point! You were understood.' : `You chose “${words[st.pick ?? 0]}”.`,
      detail: `"Did you get it?" round ${st.round + 1} of ${rounds}: the student chose "${words[st.pick ?? 0]}" and the tutor ${ok ? 'heard it right' : `heard "${words[heard]}"`}. Score ${results.filter(Boolean).length}/${results.length}.`,
    })
  }
  const next = () => setSt({ ...st, round: st.round + 1, pick: null, heard: null, stage: 'pick' })
  // the student's secret pick is never shown on the teacher's screen before the result
  return (
    <div className="es-say">
      {st.stage === 'pick' && !teacher ? (
        <>
          <div className="es-say-ask">Choose one secretly, then say it.</div>
          <div className="es-say-tiles">
            {words.map((w, k) => (
              <button key={k} type="button" className="es-say-tile" onClick={() => setSt({ ...st, pick: k, stage: 'said' })}>
                {w}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {st.stage === 'pick' && teacher ? <div className="es-say-ask">The student is choosing a word…</div> : null}
      {st.stage === 'said' && !teacher ? (
        <>
          <div className="es-say-ask">
            Say <b>{words[st.pick ?? 0]}</b>. Your teacher will say which word they heard.
          </div>
          <div className="es-say-tiles">
            {words.map((w, k) => (
              <span key={k} className={`es-say-tile${k === st.pick ? ' is-picked' : ' is-off'}`}>
                {w}
              </span>
            ))}
          </div>
          <button type="button" className="es-next" onClick={() => setSt({ ...st, stage: 'check' })}>
            They said it: check
          </button>
        </>
      ) : null}
      {(st.stage === 'said' || st.stage === 'check') && teacher ? (
        <>
          <div className="es-say-ask">Which word did you hear?</div>
          <div className="es-say-tiles">
            {words.map((w, k) => (
              <button key={k} type="button" className="es-say-tile" onClick={() => finish(k)}>
                {w}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {st.stage === 'check' && !teacher ? (
        <>
          <div className="es-say-ask">
            You chose <b>{words[st.pick ?? 0]}</b>. Did your teacher say the same word?
          </div>
          <div className="es-say-tiles">
            <button type="button" className="es-say-tile is-yes" onClick={() => finish(st.pick ?? 0)}>
              <Tick /> Yes
            </button>
            <button type="button" className="es-say-tile is-no" onClick={() => finish(1 - (st.pick ?? 0))}>
              <Cross /> No
            </button>
          </div>
        </>
      ) : null}
      {st.stage === 'result' ? (
        <>
          <div className={`es-say-result ${st.heard === st.pick ? 'is-right' : 'is-wrong'}`}>
            {st.heard === st.pick ? <Tick /> : <Cross />}
            {st.heard === st.pick ? 'Understood: a point!' : `Heard “${words[st.heard ?? 0]}”, chosen “${words[st.pick ?? 0]}”`}
          </div>
          <button type="button" className="es-next" onClick={next}>
            {st.round + 1 < rounds ? 'Next round' : 'See score'}
          </button>
        </>
      ) : null}
      <div className="es-say-foot">
        Round {st.round + 1} of {rounds} · {score} {score === 1 ? 'point' : 'points'}
      </div>
    </div>
  )
}

/* ---------- speaking prompt ---------- */

export function PromptView({ b, blockId, mode }: { b: PromptBlock; blockId: string; mode: SlideMode }) {
  const [st, setSt, api] = useActivityState<{ model: boolean; ticked: boolean[] }>(blockId, { model: false, ticked: [] })
  const goals = b.goals?.filter(Boolean) ?? []
  const starters = b.starters?.filter(Boolean) ?? []
  const live = mode !== 'editor'
  const tick = (i: number) => {
    if (!live) return
    const ticked = [...st.ticked]
    ticked[i] = !ticked[i]
    setSt({ ...st, ticked })
    if (goals.every((_, k) => ticked[k])) api?.onResult?.(blockId, { correct: true, message: 'All done!', detail: `Speaking task: all ${goals.length} goals are ticked.` })
  }
  return (
    <div className="es-prompt">
      <div className="es-prompt-q">
        <RichText text={b.text} />
      </div>
      {starters.length ? (
        <div className="es-prompt-starters">
          <span className="es-prompt-label">You can start with:</span>
          {starters.map((s, i) => (
            <span key={i} className="es-chip">
              {s}
            </span>
          ))}
        </div>
      ) : null}
      {goals.length ? (
        <div className="es-prompt-goals">
          {goals.map((g, i) => (
            <button key={i} type="button" className={`es-goal${st.ticked[i] ? ' is-done' : ''}`} onClick={() => tick(i)}>
              <span className="es-goal-box">{st.ticked[i] ? <Tick /> : null}</span>
              <RichText text={g} />
            </button>
          ))}
        </div>
      ) : null}
      {b.model ? (
        st.model || mode !== 'student' ? (
          <div className="es-prompt-model">
            {mode !== 'student' && !st.model ? <TeacherTag /> : null}
            <span className="es-prompt-label">Example:</span> <RichText text={b.model} />
          </div>
        ) : (
          <button type="button" className="es-next es-prompt-show" onClick={() => setSt({ ...st, model: true })}>
            Show an example
          </button>
        )
      ) : null}
      {b.model && mode === 'teacher' && !st.model ? (
        <button type="button" className="es-next es-prompt-show" onClick={() => setSt({ ...st, model: true })}>
          Show the student the example
        </button>
      ) : null}
    </div>
  )
}

/* ---------- personal gap-fill ---------- */

const GAP = /…|\.\.\./

export function GapFillView({ b, blockId, mode }: { b: GapFillBlock; blockId: string; mode: SlideMode }) {
  const [st, setSt, api] = useActivityState<{ values: string[][] }>(blockId, { values: [] })
  const save = useVocabSave()
  const [draft, setDraft] = useState<string[][]>(st.values)
  // keep the boxes in step with the other screen (what was typed there arrives as shared state)
  const synced = JSON.stringify(st.values)
  const [seen, setSeen] = useState(synced)
  if (synced !== seen) {
    setSeen(synced)
    setDraft(st.values)
  }
  const filled = (i: number) => {
    const parts = b.lines[i].split(GAP)
    return parts.map((p, k) => p + (k < parts.length - 1 ? (draft[i]?.[k] || '…') : '')).join('')
  }
  const commit = (i: number) => {
    if (mode === 'editor') return
    if (JSON.stringify(draft) === synced) return
    setSeen(JSON.stringify(draft))
    setSt({ values: draft })
    api?.onResult?.(blockId, { correct: true, message: 'Saved your answer', detail: `Gap-fill, line ${i + 1}: the student wrote "${filled(i)}".` })
  }
  return (
    <div className="es-gap">
      {b.lines.map((line, i) => {
        const parts = line.split(GAP)
        const done = parts.length > 1 && parts.slice(0, -1).every((_, k) => (draft[i]?.[k] ?? '').trim())
        const item = { id: `gf_${blockId}_${i}`, term: filled(i) }
        const saved = done && (save?.isSaved(item) ?? false)
        return (
          <div key={i} className="es-gap-line">
            <span className="es-num">{i + 1}</span>
            <span className="es-gap-text">
              {parts.map((p, k) => (
                <span key={k}>
                  <RichText text={p} />
                  {k < parts.length - 1 ? (
                    <input
                      className="es-gap-in"
                      value={draft[i]?.[k] ?? ''}
                      placeholder="…"
                      readOnly={mode === 'editor'}
                      size={Math.max(4, (draft[i]?.[k] ?? '').length + 1)}
                      onChange={(e) => {
                        const next = draft.map((r) => [...r])
                        while (next.length <= i) next.push([])
                        next[i][k] = e.target.value
                        setDraft(next)
                      }}
                      onBlur={() => commit(i)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                    />
                  ) : null}
                </span>
              ))}
            </span>
            {save && done ? (
              <button type="button" className={`es-vsave${saved ? ' is-saved' : ''}`} title={saved ? 'Saved' : 'Save to my phrases'} onClick={() => save.toggle(item)}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  {saved ? (
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- timer ---------- */

export function TimerView({ b, blockId, mode }: { b: TimerBlock; blockId: string; mode: SlideMode }) {
  const [st, setSt] = useActivityState<{ endsAt: number | null }>(blockId, { endsAt: null })
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!st.endsAt) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [st.endsAt])
  const total = Math.max(1, b.seconds)
  const left = st.endsAt && now ? Math.min(total, Math.max(0, Math.ceil((st.endsAt - now) / 1000))) : total
  const over = !!st.endsAt && left === 0
  return (
    <div className={`es-timer${over ? ' is-over' : ''}`}>
      {b.label ? <span className="es-timer-label">{b.label}</span> : null}
      <span className="es-timer-num">{over ? 'Time!' : `${left}s`}</span>
      <span className="es-timer-track">
        <span className="es-timer-fill" style={{ width: `${(left / total) * 100}%` }} />
      </span>
      {mode !== 'editor' ? (
        <button type="button" className="es-next" onClick={() => setSt({ endsAt: st.endsAt && !over ? null : Date.now() + total * 1000 })}>
          {st.endsAt && !over ? 'Reset' : over ? 'Again' : 'Start'}
        </button>
      ) : null}
    </div>
  )
}

/* ---------- can-do goal and rating ---------- */

const RATINGS = [
  ['yes', 'I can ✓'],
  ['help', 'With help'],
  ['not', 'Not yet'],
] as const

export function CanDoView({ b, blockId, mode }: { b: CanDoBlock; blockId: string; mode: SlideMode }) {
  const [st, setSt, api] = useActivityState<{ rating: string | null }>(blockId, { rating: null })
  return (
    <div className="es-cando">
      {b.progress ? <span className="es-cando-progress">{b.progress}</span> : null}
      <div className="es-cando-goal">
        <RichText text={b.goal} />
      </div>
      {b.rate ? (
        <div className="es-cando-rate">
          {RATINGS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`es-cando-btn${st.rating === k ? ' is-on' : ''}`}
              onClick={() => {
                if (mode === 'editor') return
                setSt({ rating: k })
                api?.onResult?.(blockId, { correct: true, message: 'Thanks!', detail: `Can-do check: the student rated today's goal "${label}".` })
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
