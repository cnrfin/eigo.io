'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card, SayStyle } from '@/lib/ai-tutor/cards'
import { saidIt, words } from '@/lib/ai-tutor/voice-match'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico } from './Icons'

/**
 * AI lessons: the correction / "How do I say…?" card (design: mockups/ai-panel.html). It slides up over
 * whatever is on screen. The phrase is saved to the word list on its own a few seconds after it appears,
 * straight away when the student says it (ticked first) or says "save it", or with the button. Closing it
 * saves nothing. The student answers by voice or by tap; there's no listening badge.
 */

const AUTO_SAVE_MS = 7000
const SAVE_WORDS = /\bsave\b|保存/i
const STYLE_WORDS: [RegExp, SayStyle][] = [
  [/\bpolite\b|ていねい|丁寧/i, 'polite'],
  [/\bcasual\b|カジュアル/i, 'casual'],
  [/\b(?:normal|standard)\b|ふつう|普通/i, 'normal'],
]

export type ShownCard = { id: number; card: Card }
/** the classroom calls this with what the student has said since the card appeared (live transcript) */
export type HearFn = (said: string) => void

export default function AiCards({
  t,
  shown,
  hearRef,
  onSave,
  onClose,
  onChose,
}: {
  t: ClassroomT
  shown: ShownCard | null
  /** set by the card: the classroom passes it the student's words as they come in */
  hearRef: { current: HearFn | null }
  onSave: (el: HTMLElement, term: string, ja: string) => void
  onClose: () => void
  onChose: (style: SayStyle, text: string) => void
}) {
  if (!shown) return null
  return <OneCard key={shown.id} t={t} card={shown.card} hearRef={hearRef} onSave={onSave} onClose={onClose} onChose={onChose} />
}

function OneCard({
  t,
  card,
  hearRef,
  onSave,
  onClose,
  onChose,
}: {
  t: ClassroomT
  card: Card
  hearRef: { current: HearFn | null }
  onSave: (el: HTMLElement, term: string, ja: string) => void
  onClose: () => void
  onChose: (style: SayStyle, text: string) => void
}) {
  const el = useRef<HTMLDivElement | null>(null)
  const [pick, setPick] = useState(0)
  const [said, setSaid] = useState(false)
  const done = useRef(false)
  const opts = useMemo(() => (card.kind === 'say' ? card.options : []), [card])
  const term = card.kind === 'correction' ? card.now : (opts[pick]?.text ?? '')
  const ja = card.kind === 'correction' ? card.ja : card.heard

  const latest = useRef({ term, ja, onSave })
  useEffect(() => {
    latest.current = { term, ja, onSave }
  })
  const save = () => {
    if (done.current || !el.current) return
    done.current = true
    latest.current.onSave(el.current, latest.current.term, latest.current.ja)
  }
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  // saves on its own after a while; switching version (tap or voice) starts the wait again, so there's time to read it
  useEffect(() => {
    const id = window.setTimeout(() => saveRef.current(), AUTO_SAVE_MS)
    return () => window.clearTimeout(id)
  }, [pick])

  // voice: "save it", "the polite one", or saying the phrase (ticked, then saved)
  const state = useRef({ pick, said, term })
  useEffect(() => {
    state.current = { pick, said, term }
  })
  useEffect(() => {
    let tick: number | undefined
    hearRef.current = (heard: string) => {
      if (!heard || done.current) return
      if (SAVE_WORDS.test(heard)) return saveRef.current()
      const now = state.current
      if (card.kind === 'say') {
        for (const [re, style] of STYLE_WORDS) {
          const i = opts.findIndex((o) => o.style === style)
          if (re.test(heard) && i >= 0 && i !== now.pick) {
            setPick(i)
            setSaid(false)
            onChose(style, opts[i].text)
            return
          }
        }
      }
      if (!now.said && saidIt(heard, now.term)) {
        setSaid(true)
        tick = window.setTimeout(() => saveRef.current(), 900)
      }
    }
    return () => {
      hearRef.current = null
      window.clearTimeout(tick)
    }
  }, [hearRef, card.kind, opts, onChose])

  const styleLabel = (s: SayStyle) => (s === 'polite' ? t('stylePolite') : s === 'casual' ? t('styleCasual') : t('styleNormal'))

  return (
    <div className="aic" ref={el} role="status">
      <div className="aic-h">
        <span>{card.kind === 'correction' ? t('cardCorrection') : t('cardSay')}</span>
        <button className="aic-x" title={t('cardClose')} aria-label={t('cardClose')} onClick={() => ((done.current = true), onClose())}>
          <Ico name="x" />
        </button>
      </div>
      {card.kind === 'correction' ? (
        <>
          <div className="aic-was">{card.was}</div>
          <div className="aic-now">{markNew(card.now, card.was)}</div>
          {card.why && <div className="aic-why">{card.why}</div>}
        </>
      ) : (
        <>
          {card.heard && (
            <div className="aic-heard">
              {t('cardHeard')}：「{card.heard}」
            </div>
          )}
          <div className="aic-now">{term}</div>
          {opts.length > 1 && (
            <div className="aic-alts">
              {opts.map((o, i) => (
                <button
                  key={o.style}
                  className={`aic-alt${i === pick ? ' on' : ''}`}
                  aria-pressed={i === pick}
                  onClick={() => {
                    if (i === pick) return
                    setPick(i)
                    setSaid(false)
                    onChose(o.style, o.text)
                  }}
                >
                  {styleLabel(o.style)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="aic-acts">
        <button className="aic-save" onClick={save}>
          <Ico name="words" />
          {t('cardSave')}
        </button>
        {said && (
          <span className="aic-said">
            <Ico name="check" />
            {t('cardSaidIt')}
          </span>
        )}
      </div>
    </div>
  )
}

/** the corrected sentence, with the words that weren't in the student's version highlighted (neighbours merged) */
function markNew(now: string, was: string) {
  const old = new Set(words(was))
  const toks = now.split(/(\s+)/).filter(Boolean)
  const isNew = toks.map((tok) => {
    const w = words(tok)[0]
    return !!w && !old.has(w)
  })
  // a space between two new words belongs to the highlight
  const marked = toks.map((tok, i) => (/^\s+$/.test(tok) ? !!isNew[i - 1] && !!isNew[i + 1] : isNew[i]))
  const out: { text: string; mark: boolean }[] = []
  toks.forEach((tok, i) => {
    const last = out[out.length - 1]
    if (last && last.mark === marked[i]) last.text += tok
    else out.push({ text: tok, mark: marked[i] })
  })
  return out.map((p, i) => (p.mark ? <mark key={i}>{p.text}</mark> : p.text))
}
