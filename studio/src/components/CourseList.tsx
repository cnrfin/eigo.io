import { useEffect, useRef, useState } from 'react'
import type { Course, CourseSummary } from '@slides'
import { api } from '../api'
import { IconBook, IconPlus, IconUpload } from '../ui/icons'

export function CourseList({ onOpen }: { onOpen: (id: string) => void }) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.listCourses().then(setCourses).catch((e: Error) => setError(e.message))
  }, [])

  async function create() {
    try {
      const c = await api.createCourse(title.trim() || 'Untitled course')
      onOpen(c.id)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    try {
      const course = JSON.parse(await file.text()) as Course
      const c = await api.importCourse(course)
      onOpen(c.id)
    } catch (e) {
      setError(e instanceof SyntaxError ? 'That file isn’t valid JSON.' : (e as Error).message)
    }
  }

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-head">
          <h1>Courses</h1>
          <p className="muted">Drafts are saved on this computer in studio/data.</p>
        </div>

        <form
          className="card new-course"
          onSubmit={(e) => {
            e.preventDefault()
            void create()
          }}
        >
          <input
            className="input"
            placeholder="New course title, e.g. Travel English"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <IconPlus size={15} /> Create course
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <IconUpload size={15} /> Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </form>

        {error ? <p className="field-error">{error}</p> : null}

        {courses === null ? (
          <p className="muted">Loading…</p>
        ) : courses.length === 0 ? (
          <div className="empty">
            <IconBook size={28} />
            <p>No courses yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((c) => (
              <button key={c.id} type="button" className="card course-card" onClick={() => onOpen(c.id)}>
                <div className="course-card-top">
                  {c.level ? <span className="pill">{c.level}</span> : null}
                </div>
                <div className="course-card-title">{c.title || 'Untitled course'}</div>
                <div className="muted small">
                  {c.units} units · {c.lessons} lessons · {c.slides} slides
                </div>
                <div className="muted small">Edited {new Date(c.updatedAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
