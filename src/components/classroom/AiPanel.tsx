'use client'
/* eslint-disable @next/next/no-img-element -- scene and course pictures, as in the course picker */

import { useMemo, useRef, useState } from 'react'
import { LEVEL_NAMES, roleOf, otherRole, tasksFor, type LevelIndex, type RoleId, type Scene } from '@/lib/roleplay/types'
import type { SceneSummary } from '@/lib/roleplay/types'
import type { PanelCourse } from '@/lib/classroom/client'
import { propHit } from '@/lib/roleplay/prop'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico } from './Icons'

/**
 * The AI panel (ai-panel-implementation-plan.md, phase 3): a third screen in the main slot, next to the slides
 * and the whiteboard. Square, flush left, no border. Free talk only. It shows:
 *  - the picker: role-plays or courses, in the same scene-card style as the dashboard course picker
 *    (design: mockups/roleplay-picker.html, "In the lesson")
 *  - a role-play mission (design: mockups/ai-roleplay-mission.html)
 * The student taps or says what they want; there's no listening badge.
 */

export type PanelState =
  /** the picker; rpSel / courseSel = what's chosen (null = the first one) */
  | { view: 'picker'; mode: 'rp' | 'course'; rpSel: string | null; courseSel: string | null }
  /** a role-play: being played, then its mission-complete screen */
  | { view: 'roleplay'; scene: Scene; role: RoleId; level: LevelIndex; phase: 'play' | 'done'; finishedAt?: number }

type Lang = 'ja' | 'en'

const dots = (cleared: number) => (
  <span className="apn-dots" aria-hidden>
    {[0, 1, 2].map((i) => (
      <i key={i} className={i < cleared ? 'on' : i === cleared && cleared < 3 ? 'next' : ''} />
    ))}
  </span>
)

/* ---------------- the picker ---------------- */

export function PanelPicker({
  t,
  lang,
  mode,
  setMode,
  scenes,
  courses,
  rpSel,
  courseSel,
  onPick,
  onStartRoleplay,
  onOpenCourse,
}: {
  t: ClassroomT
  lang: Lang
  mode: 'rp' | 'course'
  setMode: (m: 'rp' | 'course') => void
  scenes: SceneSummary[] | null
  courses: PanelCourse[] | null
  /** what's chosen (null = the first one); the classroom keeps it, so voice can choose too */
  rpSel: string | null
  courseSel: string | null
  onPick: (id: string) => void
  onStartRoleplay: (s: SceneSummary) => void
  onOpenCourse: (c: PanelCourse) => void
}) {
  const rp = scenes?.find((s) => s.id === rpSel) ?? scenes?.[0] ?? null
  const course = courses?.find((c) => c.id === courseSel) ?? courses?.[0] ?? null
  const list = useRef<HTMLDivElement | null>(null)

  const start = () => {
    if (mode === 'rp' && rp) onStartRoleplay(rp)
    if (mode === 'course' && course) onOpenCourse(course)
  }

  const lv = (n: LevelIndex) => LEVEL_NAMES[n][lang]
  const rpLine = (s: SceneSummary) => (s.cleared === 0 ? t('rpFirst') : s.cleared >= 3 ? t('rpAll') : t('rpNext', { lv: lv(s.next) }))

  const hero =
    mode === 'rp' ? (
      rp && (
        <>
          <div className={`apn-reel${rp.image ? '' : ' ph'}`} key={rp.id}>
            {rp.image && <img src={rp.image} alt="" />}
          </div>
          <div className="apn-info">
            <span className="apn-kick">
              {t('rpKick')} · {lv(rp.next)}
            </span>
            <h2>{rp.title[lang]}</h2>
            {lang === 'ja' && <div className="apn-en">{rp.title.en}</div>}
            <p className="apn-desc">{rp.summary[lang]}</p>
          </div>
        </>
      )
    ) : (
      course && (
        <>
          <div className="apn-reel" key={course.id}>
            {course.image && <img src={course.image} alt="" />}
          </div>
          <div className="apn-info">
            {course.level && <span className="apn-kick">{course.level}</span>}
            <h2>{lang === 'ja' ? course.titleJa : course.title}</h2>
            {lang === 'ja' && course.title !== course.titleJa && <div className="apn-en">{course.title}</div>}
            <p className="apn-desc">{lang === 'ja' ? course.descriptionJa : course.description}</p>
          </div>
        </>
      )
    )

  const loading = mode === 'rp' ? scenes === null : courses === null
  return (
    <div className="apn apn-pick">
      <div className="apn-hero">
        {hero}
        <div className="apn-seg" role="tablist">
          <button role="tab" aria-selected={mode === 'course'} className={mode === 'course' ? 'on' : ''} onClick={() => setMode('course')}>
            {t('panelCourses')}
          </button>
          <button role="tab" aria-selected={mode === 'rp'} className={mode === 'rp' ? 'on' : ''} onClick={() => setMode('rp')}>
            {t('panelRoleplays')}
          </button>
        </div>
      </div>
      <div className="apn-list" ref={list}>
        {loading && <div className="apn-load" />}
        {mode === 'rp'
          ? (scenes ?? []).map((s) => (
                <button key={s.id} className={`apn-row${s.id === rp?.id ? ' on' : ''}`} aria-pressed={s.id === rp?.id} onClick={() => onPick(s.id)}>
                  {s.image ? <img src={s.image} alt="" /> : <span className="apn-ph" />}
                  <span className="apn-rt">
                    <b>{s.title[lang]}</b>
                    <span>{rpLine(s)}</span>
                  </span>
                  {dots(s.cleared)}
                </button>
              ))
          : (courses ?? []).map((c) => (
                <button key={c.id} className={`apn-row${c.id === course?.id ? ' on' : ''}`} aria-pressed={c.id === course?.id} onClick={() => onPick(c.id)}>
                  {c.image ? <img src={c.image} alt="" /> : <span className="apn-ph" />}
                  <span className="apn-rt">
                    <b>{lang === 'ja' ? c.titleJa : c.title}</b>
                    <span>
                      {c.level ? `${c.level} · ` : ''}
                      {t('lessonsOf', { d: c.doneCount, n: c.lessonCount })}
                    </span>
                  </span>
                </button>
              ))}
      </div>
      <div className="apn-foot">
        <span className="apn-hint">{t('panelPick')}</span>
        <button className="apn-go" onClick={start} disabled={mode === 'rp' ? !rp : !course}>
          {t('panelStart')}
        </button>
      </div>
    </div>
  )
}

/* ---------------- a role-play mission ---------------- */

export type Mission = {
  /** task id → the words the student used (ticked) */
  done: Record<string, string>
  /** the twist has happened (上級, some scenes): its task is on the list */
  twisted: boolean
  startedAt: number
  /** the hint showing for the current task: 0 = none, 1 = what to do (JA), 2 = a starter, 3 = the full sentence */
  hint: number
}
export const newMission = (): Mission => ({ done: {}, twisted: false, startedAt: Date.now(), hint: 0 })

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function RoleplayMission({
  t,
  lang,
  scene,
  role,
  level,
  tutorName,
  mission,
  heard,
  now,
  onEnd,
}: {
  t: ClassroomT
  lang: Lang
  scene: Scene
  role: RoleId
  level: LevelIndex
  tutorName: string
  mission: Mission
  /** what's been said in the scene (normalised), to light up what's mentioned on the prop */
  heard: string
  now: number
  onEnd: () => void
}) {
  const mine = roleOf(scene, role)
  const theirs = roleOf(scene, otherRole(role))
  const L = mine.levels[level]
  const tasks = useMemo(() => tasksFor(L, mission.twisted), [L, mission.twisted])
  const current = tasks.find((x) => !mission.done[x.id])
  const twistId = L.twist?.task.id
  const [propOpen, setPropOpen] = useState(false)
  const prop = scene.prop
  // about 45 s a task: the bar fills as time goes, it never stops the scene
  const took = now - mission.startedAt
  const share = Math.min(1, took / (tasks.length * 45_000))
  const hit = (name: string, key?: string) => propHit(heard, { name, key })
  return (
    <div className="apn apn-mission">
      <div className="apn-mh">
        <div className="apn-mt">
          <span className="apn-k">
            {t('rpKick')} <span className="apn-lvl">{LEVEL_NAMES[level][lang]}</span>
          </span>
          <div className="apn-h">{scene.title[lang]}</div>
          <div className="apn-muted">
            {t('rpYou')}：{mine.name[lang]} · {tutorName}：{theirs.name[lang]}
          </div>
        </div>
        {prop && (
          <button className={`apn-propbtn${propOpen ? ' on' : ''}`} aria-pressed={propOpen} onClick={() => setPropOpen((o) => !o)}>
            <Ico name={propOpen ? 'x' : 'book'} />
            {t(propOpen ? 'rpPropHide' : 'rpPropShow', { p: lang === 'en' ? prop.label.en.toLowerCase() : prop.label.ja })}
          </button>
        )}
      </div>
      <div className="apn-goals">
        {tasks.map((task) => (
          <div key={task.id} className={`apn-goal${mission.done[task.id] ? ' done' : ''}${task.id === twistId ? ' twist' : ''}`}>
            <span className="apn-bx">
              <Ico name="check" />
            </span>
            <span className="apn-gt">
              <b>
                {task.title[lang]}
                {task.id === twistId && <span className="apn-tw">{t('rpTwist')}</span>}
              </b>
              {mission.done[task.id] ? <span className="apn-said">“{mission.done[task.id]}”</span> : lang === 'ja' && <span>{task.title.en}</span>}
            </span>
          </div>
        ))}
      </div>
      {current && mission.hint > 0 && (
        <div className="apn-hbox" role="status" key={`${current.id}:${mission.hint}`}>
          <span className="apn-hk">{t('rpHint')}</span>
          <span className={`apn-hv${mission.hint >= 3 ? ' full' : ''}`}>{current.hints[Math.min(2, mission.hint - 1)]}</span>
          <span className="apn-hdots" aria-hidden>
            {[1, 2, 3].map((i) => (
              <i key={i} className={mission.hint >= i ? 'on' : ''} />
            ))}
          </span>
        </div>
      )}
      <div className="apn-timer">
        <div className="apn-bar">
          <i style={{ width: `${(share * 100).toFixed(1)}%` }} />
        </div>
        <span>{mmss(took)}</span>
      </div>
      <div className="apn-foot">
        <span className="apn-hint">{t('rpGo')}</span>
        <button className="apn-end" onClick={onEnd}>
          {t('rpEnd')}
        </button>
      </div>
      {prop && (
        <div className={`apn-prop${propOpen ? ' open' : ''}`} aria-hidden={!propOpen}>
          <div className="apn-pt">{prop.title}</div>
          {prop.sections.map((sec) => (
            <div key={sec.heading}>
              <div className="apn-ps">{sec.heading}</div>
              {sec.items.map((it) => (
                <div key={it.name} className={`apn-pi${hit(it.name, it.key) ? ' hit' : ''}`}>
                  <span>{it.name}</span>
                  {it.value && (
                    <>
                      <span className="apn-pd" />
                      <span>{it.value}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
          {prop.foot && <div className="apn-pf">{prop.foot}</div>}
        </div>
      )}
    </div>
  )
}

/* ---------------- mission complete ---------------- */

export function RoleplayDone({
  t,
  lang,
  scene,
  role,
  level,
  mission,
  took,
  feedback,
  phrases,
  isSaved,
  onSavePhrase,
  onAgain,
  onSwap,
  onNext,
  onEnd,
  welcome,
}: {
  t: ClassroomT
  lang: Lang
  scene: Scene
  role: RoleId
  level: LevelIndex
  mission: Mission
  took: number
  /** the AI tutor's spoken feedback, sentence by sentence as it says them */
  feedback: string[]
  /** model phrases from the scene worth saving (lib/roleplay/phrases.ts) */
  phrases: { term: string; ja: string }[]
  isSaved: (term: string) => boolean
  onSavePhrase: (term: string, ja: string) => void
  onAgain: () => void
  onSwap: (() => void) | null
  onNext: () => void
  onEnd: () => void
  /** the welcome call: no swap / again / next, it moves on by itself */
  welcome?: boolean
}) {
  const tasks = tasksFor(roleOf(scene, role).levels[level], mission.twisted)
  const said = Object.values(mission.done)
  const best = said.reduce((a, b) => (b.split(/\s+/).length > a.split(/\s+/).length ? b : a), '')
  const icon = (line: string) => (/\b(try|natural|next time|instead|remember)\b/i.test(line) ? 'pen' : /\b(swap|switch|roles?|again|another)\b/i.test(line) || /\?\s*$/.test(line) ? 'users' : 'check')
  return (
    <div className="apn apn-done">
      <div className="apn-dt">
        <div className="apn-medal">
          <Ico name="check" />
        </div>
        <div>
          <span className="apn-k">
            {t('rpDone')} <span className="apn-lvl">{LEVEL_NAMES[level][lang]}</span>
          </span>
          <div className="apn-h">{scene.title[lang]}</div>
        </div>
      </div>
      <div className="apn-ticks">
        {tasks.map((x) => (
          <span key={x.id} className={mission.done[x.id] ? '' : 'miss'}>
            {mission.done[x.id] && <Ico name="check" />}
            {x.title[lang]}
          </span>
        ))}
      </div>
      {best && (
        <div className="apn-best">
          <span className="apn-bl">{t('rpBest')}</span>
          <span className="apn-bm">{mmss(took)}</span>
          <span className="apn-bq">“{best}”</span>
        </div>
      )}
      {phrases.length > 0 && (
        <div className="apn-phr">
          <span className="apn-bl">{t('rpPhrases')}</span>
          {phrases.map((p) => {
            const saved = isSaved(p.term)
            return (
              <div key={p.term} className={`apn-pr${saved ? ' saved' : ''}`}>
                <span className="apn-prt">
                  <b>{p.term}</b>
                  {lang === 'ja' && <span>{p.ja}</span>}
                </span>
                <button className="apn-prs" disabled={saved} aria-label={saved ? t('rpSaved') : t('rpSave')} title={saved ? t('rpSaved') : t('rpSave')} onClick={() => onSavePhrase(p.term, p.ja)}>
                  <Ico name={saved ? 'check' : 'words'} />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <div className="apn-fb">
        {feedback.map((line, i) => (
          <div key={i} className={`apn-fbl ${icon(line)}`}>
            <span className="apn-fic">
              <Ico name={icon(line) as 'check' | 'pen' | 'users'} />
            </span>
            <span>{line}</span>
          </div>
        ))}
      </div>
      {welcome ? (
        <div className="apn-next" role="status">
          <i />
          {t('wlMovingOn')}
        </div>
      ) : (
        <div className="apn-acts">
          <button className="apn-btn" onClick={onAgain}>
            <Ico name="undo" className="ico flip" />
            {t('rpAgain')}
          </button>
          {onSwap && (
            <button className="apn-btn pri" onClick={onSwap}>
              <Ico name="users" />
              {t('rpSwap')}
            </button>
          )}
          <button className="apn-btn" onClick={onNext}>
            <Ico name="right" />
            {t('rpNextScene')}
          </button>
          <button className="apn-end" onClick={onEnd}>
            {t('rpEnd')}
          </button>
        </div>
      )}
    </div>
  )
}
