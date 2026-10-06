import { useEffect, useState } from 'react'
import { SlideRenderer, type Lesson } from '@slides'
import { Segmented } from '../ui/fields'
import { IconLeft, IconRight, IconX } from '../ui/icons'

/** Full-screen lesson preview, as the student or as the teacher will see it. */
export function PreviewModal({
  lesson,
  startIndex,
  assetBase,
  onClose,
}: {
  lesson: Lesson
  startIndex: number
  assetBase: string
  onClose: () => void
}) {
  const [index, setIndex] = useState(Math.max(0, startIndex))
  const [mode, setMode] = useState<'student' | 'teacher'>('teacher')
  const slide = lesson.slides[index]
  const last = lesson.slides.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') setIndex((i) => Math.min(last, i + 1))
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 't') setMode((m) => (m === 'teacher' ? 'student' : 'teacher'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  if (!slide) return null
  const showNotes = mode === 'teacher'

  return (
    <div className="preview">
      <div className="preview-bar">
        <div className="preview-title">
          <strong>{lesson.title}</strong>
          <span className="muted">
            Slide {index + 1} of {lesson.slides.length}
          </span>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'teacher', label: 'Teacher view' },
            { value: 'student', label: 'Student view' },
          ]}
        />
        <button className="icon-btn" onClick={onClose} aria-label="Close preview">
          <IconX />
        </button>
      </div>
      <div className={`preview-body${showNotes ? ' has-notes' : ''}`}>
        <div className="preview-stage">
          <SlideRenderer slide={slide} mode={mode} assetBase={assetBase} />
        </div>
        {showNotes ? (
          <aside className="preview-notes">
            <h3>Teacher notes</h3>
            {slide.tutorNotes.trim() ? <p>{slide.tutorNotes}</p> : <p className="muted">No notes for this slide.</p>}
            {lesson.objective ? (
              <>
                <h3>Lesson objective</h3>
                <p>{lesson.objective}</p>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>
      <div className="preview-nav">
        <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <IconLeft size={16} /> Previous
        </button>
        <div className="preview-dots">
          {lesson.slides.map((s, i) => (
            <button
              key={s.id}
              className={`dot${i === index ? ' is-active' : ''}`}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button className="btn" disabled={index === last} onClick={() => setIndex(index + 1)}>
          Next <IconRight size={16} />
        </button>
      </div>
    </div>
  )
}
