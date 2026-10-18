'use client'
/* eslint-disable @next/next/no-img-element -- scene and course pictures, as in the course picker */

import { useEffect, useMemo, useRef, useState } from 'react'
import { LEVEL_NAMES, roleOf, otherRole, tasksFor, type LevelIndex, type RoleId, type Scene } from '@/lib/roleplay/types'
import type { SceneSummary } from '@/lib/roleplay/types'
import type { PanelCourse } from '@/lib/classroom/client'
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
  | { view: 'picker'; mode: 'rp' | 'course' }
  | { view: 'roleplay'; scene: Scene; role: RoleId; level: LevelIndex }

export type PanelHear = (said: string) => void
type Lang = 'ja' | 'en'

const dots = (cleared: number) => (
  <span className="apn-dots" aria-hidden>
    {[0, 1, 2].map((i) => (
      <i key={i} className={i < cleared ? 'on' : i === cleared && cleared < 3 ? 'next' : ''} />
    ))}
  </span>
)

/* ---------------- the picker ---------------- */

const START = /\b(?:start|let'?s (?:do|try|go)|that one|this one|go for)\b|はじめ|始め|これ(?:に|で)|やります|やりたい/i
const COURSE_WORDS = /\bcourses?\b|コース/i
const RP_WORDS = /\brole[- ]?plays?\b|ロールプレイ/i
const ORDINALS: [RegExp, number][] = [
  [/\b(?:first|1st)\b|1つ目|一つ目|ひとつめ/i, 0],
  [/\b(?:second|2nd)\b|2つ目|二つ目|ふたつめ/i, 1],
  [/\b(?:third|3rd)\b|3つ目|三つ目|みっつめ/i, 2],
]
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const STOP = new Set(['ordering', 'with', 'your', 'yourself', 'from', 'about', 'that', 'this', 'at', 'the', 'an', 'and'])
const keyWords = (en: string) => fold(en).split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w))

export function PanelPicker({
  t,
  lang,
  mode,
  setMode,
  scenes,
  courses,
  hearRef,
  onStartRoleplay,
  onOpenCourse,
}: {
  t: ClassroomT
  lang: Lang
  mode: 'rp' | 'course'
  setMode: (m: 'rp' | 'course') => void
  scenes: SceneSummary[] | null
  courses: PanelCourse[] | null
  hearRef: { current: PanelHear | null }
  onStartRoleplay: (s: SceneSummary) => void
  onOpenCourse: (c: PanelCourse) => void
}) {
  const [rpSel, setRpSel] = useState<string | null>(null)
  const [courseSel, setCourseSel] = useState<string | null>(null)
  const rp = scenes?.find((s) => s.id === rpSel) ?? scenes?.[0] ?? null
  const course = courses?.find((c) => c.id === courseSel) ?? courses?.[0] ?? null
  const list = useRef<HTMLDivElement | null>(null)

  const start = () => {
    if (mode === 'rp' && rp) onStartRoleplay(rp)
    if (mode === 'course' && course) onOpenCourse(course)
  }
  const startRef = useRef(start)
  useEffect(() => {
    startRef.current = start
  })

  // voice: "role-plays" / "courses" switches; a title, a word from it, or "the first one" picks; "let's start" starts
  const state = useRef({ mode, scenes, courses })
  useEffect(() => {
    state.current = { mode, scenes, courses }
  })
  useEffect(() => {
    hearRef.current = (said: string) => {
      const { mode: m, scenes: S, courses: C } = state.current
      const tail = said.slice(-160)
      if (m === 'course' && RP_WORDS.test(tail)) return setMode('rp')
      if (m === 'rp' && COURSE_WORDS.test(tail) && !RP_WORDS.test(tail)) return setMode('course')
      const f = fold(tail)
      const items: { id: string; en: string; ja: string }[] =
        m === 'rp' ? (S ?? []).map((s) => ({ id: s.id, en: s.title.en, ja: s.title.ja })) : (C ?? []).map((c) => ({ id: c.id, en: c.title, ja: c.titleJa }))
      let hit = items.find((x) => tail.includes(x.ja.slice(0, 4)) || keyWords(x.en).some((w) => f.includes(w)))
      if (!hit) for (const [re, i] of ORDINALS) if (re.test(tail) && items[i]) hit = items[i]
      if (hit) (m === 'rp' ? setRpSel : setCourseSel)(hit.id)
      if (START.test(tail)) window.setTimeout(() => startRef.current(), hit ? 250 : 0)
    }
    return () => {
      hearRef.current = null
    }
  }, [hearRef, setMode])

  const pick = (id: string) => {
    const y = list.current?.scrollTop ?? 0
    ;(mode === 'rp' ? setRpSel : setCourseSel)(id)
    requestAnimationFrame(() => list.current && (list.current.scrollTop = y))
  }

  const lv = (n: LevelIndex) => LEVEL_NAMES[n][lang]
  const rpLine = (s: SceneSummary) => (s.cleared === 0 ? t('rpFirst') : s.cleared >= 3 ? t('rpAll') : t('rpNext', { lv: lv(s.next) }))

  const hero =
    mode === 'rp' ? (
      rp && (
        <>
          <div className="apn-reel" key={rp.id}>
            <img src={rp.image} alt="" />
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
          ? (scenes ?? [])
              .filter((s) => s.id !== rp?.id)
              .map((s) => (
                <button key={s.id} className="apn-row" onClick={() => pick(s.id)}>
                  <img src={s.image} alt="" />
                  <span className="apn-rt">
                    <b>{s.title[lang]}</b>
                    <span>{rpLine(s)}</span>
                  </span>
                  {dots(s.cleared)}
                </button>
              ))
          : (courses ?? [])
              .filter((c) => c.id !== course?.id)
              .map((c) => (
                <button key={c.id} className="apn-row" onClick={() => pick(c.id)}>
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

export function RoleplayMission({
  t,
  lang,
  scene,
  role,
  level,
  tutorName,
  done,
  onEnd,
}: {
  t: ClassroomT
  lang: Lang
  scene: Scene
  role: RoleId
  level: LevelIndex
  tutorName: string
  /** task id → the words the student used (ticked) */
  done: Record<string, string>
  onEnd: () => void
}) {
  const mine = roleOf(scene, role)
  const theirs = roleOf(scene, otherRole(role))
  const L = mine.levels[level]
  const tasks = useMemo(() => tasksFor(L, false), [L])
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
      </div>
      <div className="apn-goals">
        {tasks.map((task) => (
          <div key={task.id} className={`apn-goal${done[task.id] ? ' done' : ''}`}>
            <span className="apn-bx">
              <Ico name="check" />
            </span>
            <span className="apn-gt">
              <b>{task.title[lang]}</b>
              {done[task.id] ? <span className="apn-said">“{done[task.id]}”</span> : lang === 'ja' && <span>{task.title.en}</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="apn-foot">
        <span className="apn-hint">{t('rpGo')}</span>
        <button className="apn-end" onClick={onEnd}>
          {t('rpEnd')}
        </button>
      </div>
    </div>
  )
}
