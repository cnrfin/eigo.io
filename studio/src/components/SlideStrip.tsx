import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SlideRenderer, cloneSlide, type Lesson, type Slide } from '@slides'
import { draftLesson, move } from '../model'
import type { CourseEditor } from '../useCourseEditor'
import { IconButton } from '../ui/fields'
import { IconCopy, IconPlus, IconTrash } from '../ui/icons'

function Thumb({
  slide,
  index,
  active,
  assetBase,
  onClick,
  onDuplicate,
  onDelete,
  canDelete,
}: {
  slide: Slide
  index: number
  active: boolean
  assetBase: string
  onClick: () => void
  onDuplicate: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })
  return (
    <div
      ref={setNodeRef}
      className={`thumb${active ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <span className="thumb-num">{index + 1}</span>
      <div className="thumb-frame">
        <SlideRenderer slide={slide} mode="editor" assetBase={assetBase} />
        {slide.tutorNotes.trim() ? <span className="thumb-notes" title="Has teacher notes" /> : null}
      </div>
      <div className="thumb-actions" onPointerDown={(e) => e.stopPropagation()}>
        <IconButton title="Duplicate slide" onClick={onDuplicate}>
          <IconCopy size={13} />
        </IconButton>
        <IconButton title="Delete slide" danger disabled={!canDelete} onClick={onDelete}>
          <IconTrash size={13} />
        </IconButton>
      </div>
    </div>
  )
}

export function SlideStrip({
  lesson,
  editor,
  activeSlideId,
  assetBase,
  onSelectSlide,
  onAddSlide,
}: {
  lesson: Lesson
  editor: CourseEditor
  activeSlideId: string | null
  assetBase: string
  onSelectSlide: (id: string | null) => void
  onAddSlide: () => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = lesson.slides.findIndex((s) => s.id === e.active.id)
    const to = lesson.slides.findIndex((s) => s.id === e.over!.id)
    editor.update((d) => {
      const l = draftLesson(d, lesson.id)
      if (l) move(l.slides, from, to)
    })
  }

  return (
    <aside className="strip">
      <div className="strip-head">
        <span>Slides</span>
        <span className="muted small">{lesson.slides.length}</span>
      </div>
      <div className="strip-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={lesson.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {lesson.slides.map((s, i) => (
              <Thumb
                key={s.id}
                slide={s}
                index={i}
                active={s.id === activeSlideId}
                assetBase={assetBase}
                canDelete={lesson.slides.length > 1}
                onClick={() => onSelectSlide(s.id)}
                onDuplicate={() => {
                  const copy = cloneSlide(s)
                  editor.update((d) => void draftLesson(d, lesson.id)?.slides.splice(i + 1, 0, copy))
                  onSelectSlide(copy.id)
                }}
                onDelete={() => {
                  editor.update((d) => {
                    const l = draftLesson(d, lesson.id)
                    if (l) l.slides = l.slides.filter((x) => x.id !== s.id)
                  })
                  if (s.id === activeSlideId) onSelectSlide(lesson.slides[i + 1]?.id ?? lesson.slides[i - 1]?.id ?? null)
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button type="button" className="strip-add" onClick={onAddSlide}>
          <IconPlus size={16} />
          <span>Add slide</span>
        </button>
      </div>
    </aside>
  )
}
