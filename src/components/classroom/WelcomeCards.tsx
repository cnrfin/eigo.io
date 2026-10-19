'use client'
/* eslint-disable @next/next/no-img-element -- scene and course pictures, as in the AI panel */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import AiAvatar from '@/components/ai/AiAvatar'
import type { AvatarMood } from '@/lib/ai-tutor/avatar-mood'
import { FACT_KEYS, FACT_LABELS, type FactKey, type Facts } from '@/lib/classroom/welcome'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico } from './Icons'

/**
 * The welcome call's cards and end screen (lib/classroom/welcome.ts; design: mockups/welcome-call.html).
 * The cards are the same card as corrections (.aic), so the AI tutor floats above them in the same way.
 */

type Lang = 'ja' | 'en'

/* ---------------- About you ---------------- */

export function AboutCard({
  t,
  lang,
  facts,
  state,
  onSave,
  onClose,
  onEdit,
  inline,
}: {
  t: ClassroomT
  lang: Lang
  facts: Facts
  /** waiting for an answer, saved, or ended without saving (it says so, so they always know) */
  state: 'ask' | 'saved' | 'skipped'
  onSave: () => void
  onClose: () => void
  onEdit: (k: FactKey, v: string) => void
  /** on the end screen (not floating over the room) */
  inline?: boolean
}) {
  const [editing, setEditing] = useState<FactKey | null>(null)
  const [draft, setDraft] = useState('')
  // the rows fill in one by one when the card appears; a row changed later just flashes in
  const [fresh, setFresh] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setFresh(false), 1200)
    return () => clearTimeout(id)
  }, [])
  const keys = FACT_KEYS.filter((k) => facts[k])
  const saved = state !== 'ask'
  const done = () => {
    if (editing && draft.trim()) onEdit(editing, draft.trim())
    setEditing(null)
  }
  return (
    <div className={`aic wlc${inline ? ' inline' : ''}`} role="dialog" aria-label={t('wlAboutTitle')}>
      <div className="aic-h">
        {t('wlAboutTitle')}
        {!saved && (
          <button className="aic-x" aria-label={t('cardClose')} onClick={onClose}>
            <Ico name="x" />
          </button>
        )}
      </div>
      <div className="wlc-rows">
        {keys.map((k, i) => (
          <div key={`${k}:${facts[k]}`} className="wlc-row" style={fresh ? { animationDelay: `${0.2 + i * 0.35}s` } : undefined}>
            <span className="wlc-k">{FACT_LABELS[k][lang]}</span>
            {editing === k ? (
              <input
                className="wlc-in"
                autoFocus
                value={draft}
                maxLength={80}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={done}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') done()
                  if (e.key === 'Escape') setEditing(null)
                }}
              />
            ) : (
              <span className="wlc-v">{facts[k]}</span>
            )}
            {!saved && editing !== k && (
              <button
                className="wlc-ed"
                aria-label={t('wlEdit')}
                title={t('wlEdit')}
                onClick={() => {
                  setDraft(facts[k] ?? '')
                  setEditing(k)
                }}
              >
                <Ico name="pen" />
              </button>
            )}
          </div>
        ))}
      </div>
      {state === 'saved' ? (
        <div className="wlc-done" role="status">
          <Ico name="check" />
          {t('wlSaved')}
        </div>
      ) : state === 'skipped' ? (
        <div className="wlc-done off" role="status">
          {t('wlNotSavedYet')}
        </div>
      ) : (
        <div className="wlc-acts">
          <button className="wlc-b pri grow" onClick={onSave} disabled={!keys.length}>
            <Ico name="check" />
            {t('wlSave')}
          </button>
          <span className="wlc-hint">{t('wlSayYes')}</span>
        </div>
      )}
    </div>
  )
}

/* ---------------- the role-play for them ---------------- */

export function SuggestCard({
  t,
  lang,
  title,
  level,
  image,
  reason,
  phrase,
  lit,
  heard,
  onStart,
}: {
  t: ClassroomT
  lang: Lang
  title: { ja: string; en: string }
  level: string
  image: string
  reason: string
  phrase: string
  /** which of the phrase's words have been heard */
  lit: boolean[]
  heard: boolean
  onStart: () => void
}) {
  const words = phrase.split(' ')
  return (
    <div className="aic wlc" role="dialog" aria-label={t('wlSuggestTitle')}>
      <div className="aic-h">{t('wlSuggestTitle')}</div>
      <div className="wlc-sg">
        {image ? <img className="wlc-pic" src={image} alt="" /> : <span className="wlc-pic ph" />}
        <div className="wlc-st">
          <b>
            {title[lang]}
            <span className="wlc-lv">{level}</span>
          </b>
          {reason && <span>{reason}</span>}
        </div>
      </div>
      <div className={`wlc-say${heard ? ' heard' : ''}`}>
        <span className="wlc-mic">
          <Ico name="mic" />
        </span>
        <div>
          <div className="wlc-l">{t('wlSayToStart')}</div>
          <div className="wlc-p" lang="en">
            {words.map((w, i) => (
              <span key={i} className={heard || lit[i] ? 'on' : ''}>
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="wlc-acts">
        <span className="wlc-hint grow">{t('wlSayHint')}</span>
        <button className="wlc-b sec" onClick={onStart}>
          {t('wlStart')}
        </button>
      </div>
    </div>
  )
}

/* ---------------- what they can say in lessons (where courses come up) ---------------- */

/**
 * The one voice command, tried out: "Open the course" shows a preview of a course's first slide. With the preview
 * on screen the card is a single row, so it doesn't cover the slide.
 */
export function CommandCard({ t, said, compact }: { t: ClassroomT; said: boolean; compact: boolean }) {
  return (
    <div className={`aic wlc${compact ? ' compact' : ''}`} role="status" aria-label={t('wlCmdTitle')}>
      {!compact && (
        <div className="aic-h">
          {t('wlCmdTitle')}
          {!said && <span className="wlc-try">{t('wlTipsTry')}</span>}
        </div>
      )}
      <div className="wlc-tips">
        <div className={`wlc-tip${said ? ' done' : ' next'}`}>
          <Ico name={said ? 'check' : 'mic'} />
          <span className="wlc-q" lang="en">
            “Open the course”
          </span>
          {!compact && <span className="wlc-d">{t('wlTipCourse')}</span>}
        </div>
      </div>
    </div>
  )
}

/* ---------------- the end screen ---------------- */

const mins = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export type NextUp = { tag: string; title: string; sub: string; image: string | null }

export function WelcomeEnd({
  t,
  name,
  aiColor,
  aiBlush,
  spokeMs,
  phrases,
  cleared,
  about,
  onCheckAbout,
  next,
  children,
}: {
  t: ClassroomT
  name: string
  aiColor?: string | null
  aiBlush?: boolean
  spokeMs: number
  /** saved in this call (newest first) */
  phrases: string[]
  /** the role-play's levels cleared (null = no role-play) */
  cleared: number | null
  /** About me: saved (with what), not saved yet (with facts to check), or nothing to save */
  about: { state: 'saved'; what: string } | { state: 'unsaved' } | { state: 'none' }
  onCheckAbout: () => void
  next: NextUp[]
  /** the About-you card, when they tap 確認する */
  children?: ReactNode
}) {
  const mood = useRef<AvatarMood>({ face: 'delighted', until: Number.MAX_SAFE_INTEGER, listening: false, slideUntil: 0 })
  const box = useRef<HTMLDivElement | null>(null)
  useEffect(() => box.current?.focus(), [])
  return (
    <div className="wle" ref={box} tabIndex={-1} role="dialog" aria-label={t('wlEndTitle', { name })}>
      <div className="wle-c">
        <div className="wle-hi">
          <AiAvatar className="wle-av" color={aiColor} blush={aiBlush !== false} mood={mood} />
          <div>
            <h2>{t('wlEndTitle', { name })}</h2>
            <div className="wle-sub">{t('wlEndSub')}</div>
          </div>
        </div>
        <div className={`wle-stats${cleared === null ? ' two' : ''}`}>
          <div className="wle-st">
            <div className="n">{mins(spokeMs)}</div>
            <div className="l">{t('wlSpoke')}</div>
          </div>
          <div className="wle-st">
            <div className="n">{phrases.length}</div>
            <div className="l">{t('wlPhrasesN')}</div>
          </div>
          {cleared !== null && (
            <div className="wle-st">
              <div className="n">
                {cleared}
                <small>/3</small>
              </div>
              <div className="l">{t('wlLevel')}</div>
            </div>
          )}
        </div>
        {phrases.length > 0 && (
          <div className="wle-box">
            <div className="l">{t('wlToday')}</div>
            {phrases.slice(0, 3).map((p) => (
              <div key={p} className="wle-ph" lang="en">
                <Ico name="check" />
                {p}
              </div>
            ))}
          </div>
        )}
        {about.state !== 'none' && (
          <div className="wle-box">
            <div className="wle-me">
              {about.state === 'saved' ? (
                <>
                  <Ico name="check" />
                  {t('wlSavedWhat', { what: about.what })}
                </>
              ) : (
                <>
                  <span className="grow">{t('wlNotSaved')}</span>
                  <button className="wlc-b sec sm" onClick={onCheckAbout}>
                    {t('wlCheck')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {next.length > 0 && (
          <div className="wle-box">
            <div className="l">{t('wlRecommend')}</div>
            {next.map((x) => (
              <div key={x.title} className="wle-nx">
                {x.image ? <img src={x.image} alt="" /> : <span className="ph" />}
                <div className="tt">
                  <b>
                    <span className="tag">{x.tag}</span>
                    {x.title}
                  </b>
                  <span>{x.sub}</span>
                </div>
                <a className="wlc-b pri sm" href="/dashboard?ai=start">
                  {t('wlStart')}
                </a>
                <a className="wlc-b sec sm" href="/dashboard?tab=booking">
                  {t('wlBook')}
                </a>
              </div>
            ))}
          </div>
        )}
        <div className="wle-b">
          <a className="wlc-b sec" href="/plans">
            {t('wlPlans')}
          </a>
          <a className="wlc-b sec" href="/dashboard">
            {t('goDashboard')}
          </a>
        </div>
      </div>
      {children}
    </div>
  )
}
