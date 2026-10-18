'use client'
/* eslint-disable @next/next/no-img-element -- scene and course pictures, as in the course picker */

import { useMemo, useRef } from 'react'
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
  /** the picker; rpSel / courseSel = what's chosen (null = the first one) */
  | { view: 'picker'; mode: 'rp' | 'course'; rpSel: string | null; courseSel: string | null }
  | { view: 'roleplay'; scene: Scene; role: RoleId; level: LevelIndex }

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
          ? (scenes ?? []).map((s) => (
                <button key={s.id} className={`apn-row${s.id === rp?.id ? ' on' : ''}`} aria-pressed={s.id === rp?.id} onClick={() => onPick(s.id)}>
                  <img src={s.image} alt="" />
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
