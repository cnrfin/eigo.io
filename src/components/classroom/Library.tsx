'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchLibrary, type LibraryCourse, type LibraryProgress, type OpenLesson } from '@/lib/classroom/client'
import { Ico } from './Icons'

/**
 * Library (teacher only): published courses on the left, their lessons by unit
 * on the right. Opening a lesson starts where this student left off in it,
 * unless they finished it.
 */

const COLORS = ['#dff5f2', '#fae1d8', '#ece6f8', '#fff1cc', '#e3edf9']

export default function Library({
  bookingId,
  open,
  current,
  onClose,
  onOpenLesson,
}: {
  bookingId: string
  open: boolean
  current: OpenLesson | null
  onClose: () => void
  onOpenLesson: (o: OpenLesson) => void
}) {
  const [data, setData] = useState<{ courses: LibraryCourse[]; progress: LibraryProgress } | null>(null)
  const [failed, setFailed] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    let live = true
    fetchLibrary(bookingId).then((d) => {
      if (!live) return
      if (d) setData(d)
      else setFailed(true)
    })
    return () => {
      live = false
    }
  }, [open, bookingId])

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])

  const courseId = sel ?? current?.courseId ?? data?.courses[0]?.id ?? null
  const course = data?.courses.find((c) => c.id === courseId) ?? null
  const prog = courseId ? data?.progress[courseId] : undefined
  const ql = q.trim().toLowerCase()

  const units = useMemo(() => {
    if (!course) return []
    let n = 0
    return course.units
      .map((u, ui) => ({
        title: `Unit ${ui + 1} · ${u.title}`,
        lessons: u.lessons
          .map((l) => ({ ...l, n: ++n }))
          .filter((l) => !ql || l.title.toLowerCase().includes(ql)),
      }))
      .filter((u) => u.lessons.length)
  }, [course, ql])

  const lessonCount = (c: LibraryCourse) => c.units.reduce((s, u) => s + u.lessons.length, 0)

  return (
    <div className={`scrim${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Library">
        <div className="mhead">
          <h2>Library</h2>
          <label className="search">
            <Ico name="search" />
            <input placeholder="Search lessons" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button className="ib" onClick={onClose} title="Close" aria-label="Close">
            <Ico name="x" style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="mbody">
          <div className="clist">
            {!data && !failed && <p style={{ color: 'var(--text-muted)', padding: 10 }}>Loading…</p>}
            {failed && <p style={{ color: 'var(--danger)', padding: 10 }}>Couldn’t load the library.</p>}
            {data?.courses.length === 0 && (
              <p style={{ color: 'var(--text-muted)', padding: 10 }}>No published courses yet. Publish one from the studio.</p>
            )}
            {data?.courses.map((c, i) => (
              <button key={c.id} className={`course${c.id === courseId ? ' sel' : ''}`} onClick={() => setSel(c.id)}>
                <div className="cv" style={{ background: COLORS[i % COLORS.length] }}>
                  {(c.level || '').split(/[–-]/)[0] || '·'}
                </div>
                <div>
                  <h4>{c.title}</h4>
                  <p>
                    {lessonCount(c)} lessons{c.level ? ` · ${c.level}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="lessons">
            {course && !units.length && <p style={{ color: 'var(--text-muted)' }}>No lessons match.</p>}
            {units.map((u) => (
              <div className="unit" key={u.title}>
                <h5>{u.title}</h5>
                {u.lessons.map((l) => {
                  const now = current?.courseId === courseId && current?.lessonId === l.id
                  const done = prog?.completed.includes(l.id)
                  const resume = !done && prog?.lessonId === l.id ? prog.slideId : null
                  const label = now ? 'In class now' : resume ? 'Continue →' : done ? 'Done ✓ · Open again' : 'Open →'
                  return (
                    <button
                      key={l.id}
                      className={`lesson${now ? ' now' : ''}`}
                      onClick={() => {
                        if (!now) onOpenLesson({ courseId: courseId!, lessonId: l.id, slideId: resume })
                        onClose()
                      }}
                    >
                      <span className="n">{l.n}</span>
                      <span className="t">{l.title}</span>
                      <span className="go" style={resume || done ? { opacity: 1 } : undefined}>
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
