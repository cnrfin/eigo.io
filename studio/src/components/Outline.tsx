import { useState } from 'react'
import { createLesson, createUnit, type Course } from '@slides'
import { move, type Selection } from '../model'
import type { CourseEditor } from '../useCourseEditor'
import { IconButton } from '../ui/fields'
import { IconDown, IconPlus, IconSettings, IconTrash, IconUp } from '../ui/icons'

function EditableLabel({ value, onCommit, className }: { value: string; onCommit: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (editing)
    return (
      <input
        className="input input-inline"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => {
          setEditing(false)
          if (draft.trim() && draft !== value) onCommit(draft.trim())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  return (
    <span
      className={className}
      title="Double-click to rename"
      onDoubleClick={(e) => {
        e.stopPropagation()
        setDraft(value)
        setEditing(true)
      }}
    >
      {value || 'Untitled'}
    </span>
  )
}

export function Outline({
  course,
  editor,
  selection,
  onSelect,
}: {
  course: Course
  editor: CourseEditor
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  const activeLesson = selection.view === 'slides' ? selection.lessonId : null

  return (
    <nav className="outline">
      <button
        type="button"
        className={`outline-course${selection.view === 'settings' ? ' is-active' : ''}`}
        onClick={() => onSelect({ view: 'settings' })}
      >
        <span className="outline-course-title">{course.title || 'Untitled course'}</span>
        <span className="outline-course-meta">
          <IconSettings size={13} /> Course details
        </span>
      </button>

      <div className="outline-units">
        {course.units.map((u, ui) => (
          <div key={u.id} className="outline-unit">
            <div className="outline-unit-head">
              <EditableLabel
                className="outline-unit-title"
                value={u.title}
                onCommit={(v) => editor.update((d) => void (d.units[ui].title = v))}
              />
              <div className="outline-actions">
                <IconButton
                  title="Add lesson"
                  onClick={() => {
                    const l = createLesson(`Lesson ${u.lessons.length + 1}`)
                    editor.update((d) => void d.units[ui].lessons.push(l))
                    onSelect({ view: 'slides', lessonId: l.id, slideId: l.slides[0].id, blockId: null })
                  }}
                >
                  <IconPlus size={14} />
                </IconButton>
                <IconButton title="Move unit up" disabled={ui === 0} onClick={() => editor.update((d) => move(d.units, ui, ui - 1))}>
                  <IconUp size={14} />
                </IconButton>
                <IconButton
                  title="Move unit down"
                  disabled={ui === course.units.length - 1}
                  onClick={() => editor.update((d) => move(d.units, ui, ui + 1))}
                >
                  <IconDown size={14} />
                </IconButton>
                <IconButton
                  title="Delete unit"
                  danger
                  disabled={course.units.length === 1}
                  onClick={() => {
                    if (!confirm(`Delete “${u.title}” and its ${u.lessons.length} lesson(s)? You can undo with ⌘Z.`)) return
                    editor.update((d) => void d.units.splice(ui, 1))
                    if (u.lessons.some((l) => l.id === activeLesson)) onSelect({ view: 'settings' })
                  }}
                >
                  <IconTrash size={14} />
                </IconButton>
              </div>
            </div>

            <ul className="outline-lessons">
              {u.lessons.map((l, li) => (
                <li key={l.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`outline-lesson${l.id === activeLesson ? ' is-active' : ''}`}
                    onClick={() => onSelect({ view: 'slides', lessonId: l.id, slideId: l.slides[0]?.id ?? null, blockId: null })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelect({ view: 'slides', lessonId: l.id, slideId: l.slides[0]?.id ?? null, blockId: null })
                    }}
                  >
                    <span className="outline-lesson-num">{li + 1}</span>
                    <EditableLabel
                      className="outline-lesson-title"
                      value={l.title}
                      onCommit={(v) => editor.update((d) => void (d.units[ui].lessons[li].title = v))}
                    />
                    <span className="outline-lesson-count">{l.slides.length}</span>
                    <div className="outline-actions">
                      <IconButton
                        title="Move lesson up"
                        disabled={li === 0}
                        onClick={() => editor.update((d) => move(d.units[ui].lessons, li, li - 1))}
                      >
                        <IconUp size={13} />
                      </IconButton>
                      <IconButton
                        title="Move lesson down"
                        disabled={li === u.lessons.length - 1}
                        onClick={() => editor.update((d) => move(d.units[ui].lessons, li, li + 1))}
                      >
                        <IconDown size={13} />
                      </IconButton>
                      <IconButton
                        title="Delete lesson"
                        danger
                        onClick={() => {
                          if (!confirm(`Delete “${l.title}”? You can undo with ⌘Z.`)) return
                          editor.update((d) => void d.units[ui].lessons.splice(li, 1))
                          if (l.id === activeLesson) onSelect({ view: 'settings' })
                        }}
                      >
                        <IconTrash size={13} />
                      </IconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-sm btn-ghost outline-add-unit"
        onClick={() => {
          const unit = createUnit(`Unit ${course.units.length + 1}`)
          editor.update((d) => void d.units.push(unit))
          onSelect({ view: 'slides', lessonId: unit.lessons[0].id, slideId: unit.lessons[0].slides[0].id, blockId: null })
        }}
      >
        <IconPlus size={14} /> Add unit
      </button>
    </nav>
  )
}
