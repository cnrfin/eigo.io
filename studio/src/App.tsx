import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { SlideCharacters, cloneBlock, createSlide, uid, type Block, type Course } from '@slides'
import { api, assetBaseFor } from './api'
import { CourseList } from './components/CourseList'
import { CourseSettings } from './components/CourseSettings'
import { EditorCanvas } from './components/EditorCanvas'
import { Inspector } from './components/Inspector'
import { Outline } from './components/Outline'
import { PreviewModal } from './components/PreviewModal'
import { PublishModal } from './components/PublishModal'
import { SlideStrip } from './components/SlideStrip'
import { TemplatePicker } from './components/TemplatePicker'
import { clamp, draftBlock, draftLesson, draftSlide, findLesson, findSlide, firstLessonId, type Selection } from './model'
import { IconButton } from './ui/fields'
import { IconLeft, IconMoon, IconPlay, IconRedo, IconSend, IconSun, IconUndo } from './ui/icons'
import { useCourseEditor, type SaveStatus } from './useCourseEditor'

function readHash(): string | null {
  const m = location.hash.match(/^#\/course\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

// ---- block clipboard (Cmd/Ctrl+C, X, V). Kept in localStorage so it works across slides, lessons and tabs.
const CLIP_KEY = 'studio-block-clipboard'
function writeClipboard(block: Block) {
  try {
    localStorage.setItem(CLIP_KEY, JSON.stringify(block))
  } catch {
    /* ignore */
  }
}
function readClipboard(): Block | null {
  try {
    const raw = localStorage.getItem(CLIP_KEY)
    return raw ? (JSON.parse(raw) as Block) : null
  } catch {
    return null
  }
}
/** A pasteable copy with fresh ids; nudged if it would sit exactly on top of an existing block. */
function pasteCopy(block: Block, existing: Block[]): Block {
  const copy = JSON.parse(JSON.stringify(block)) as Block
  copy.id = uid('b')
  if (copy.type === 'vocab') for (const it of copy.items) it.id = uid('v')
  const f = copy.frame
  while (existing.some((b) => Math.abs(b.frame.x - f.x) < 0.01 && Math.abs(b.frame.y - f.y) < 0.01)) {
    f.x = clamp(f.x + 2, 0, 100 - f.w)
    f.y = clamp(f.y + 2, 0, 100 - f.h)
    if (f.x >= 100 - f.w && f.y >= 100 - f.h) break
  }
  return copy
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Save failed',
}

export default function App() {
  const [courseId, setCourseId] = useState<string | null>(readHash)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  useEffect(() => {
    const onHash = () => setCourseId(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('studio-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const open = (id: string | null) => {
    location.hash = id ? `#/course/${id}` : ''
    setCourseId(id)
  }

  const themeToggle = (
    <IconButton title={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
    </IconButton>
  )

  if (!courseId)
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            eigo <span>studio</span>
          </div>
          <div className="topbar-spacer" />
          {themeToggle}
        </header>
        <CourseList onOpen={open} />
      </div>
    )

  return <Editor key={courseId} courseId={courseId} onClose={() => open(null)} themeToggle={themeToggle} />
}

function Editor({ courseId, onClose, themeToggle }: { courseId: string; onClose: () => void; themeToggle: ReactNode }) {
  const editor = useCourseEditor(courseId)
  const { course } = editor
  const [selection, setSelection] = useState<Selection | null>(null)
  const [picker, setPicker] = useState(false)
  const [preview, setPreview] = useState(false)
  const [publish, setPublish] = useState(false)
  const assetBase = assetBaseFor(courseId)

  // Keep the selection valid as the course changes (deletes, undo, first load).
  useEffect(() => {
    if (!course) return
    setSelection((sel) => {
      if (sel?.view === 'settings') return sel
      const lessonId = sel && findLesson(course, sel.lessonId) ? sel.lessonId : firstLessonId(course)
      if (!lessonId) return { view: 'settings' }
      const lesson = findLesson(course, lessonId)!.lesson
      const slide = sel && sel.lessonId === lessonId ? findSlide(lesson, sel.slideId) : null
      const slideId = slide?.id ?? lesson.slides[0]?.id ?? null
      const blockId = slide && sel?.blockId && slide.blocks.some((b) => b.id === sel.blockId) ? sel.blockId : null
      if (sel && sel.lessonId === lessonId && sel.slideId === slideId && sel.blockId === blockId) return sel
      return { view: 'slides', lessonId, slideId, blockId }
    })
  }, [course])

  const lessonRef = course && selection?.view === 'slides' ? findLesson(course, selection.lessonId) : null
  const slide = lessonRef && selection?.view === 'slides' ? findSlide(lessonRef.lesson, selection.slideId) : null
  const block = slide && selection?.view === 'slides' && selection.blockId ? slide.blocks.find((b) => b.id === selection.blockId) ?? null : null

  const selectBlock = useCallback(
    (blockId: string | null) => setSelection((s) => (s?.view === 'slides' ? { ...s, blockId } : s)),
    [],
  )

  // ---- keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) editor.redo()
        else editor.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        editor.redo()
        return
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void editor.saveNow()
        return
      }
      if (isTyping(e.target) || picker || preview || publish) return
      if (!course || selection?.view !== 'slides' || !selection.slideId) return
      const { lessonId, slideId, blockId } = selection

      if (e.key === 'Escape') selectBlock(null)

      if (mod && e.key.toLowerCase() === 'v') {
        if (window.getSelection()?.toString()) return
        const clip = readClipboard()
        if (!clip || !slide) return
        e.preventDefault()
        const copy = pasteCopy(clip, slide.blocks)
        editor.update((d) => {
          const s = draftSlide(d, lessonId, slideId)
          if (s) s.blocks.push(copy)
        })
        selectBlock(copy.id)
        return
      }
      if (!blockId) return

      if (mod && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'x')) {
        if (window.getSelection()?.toString()) return
        const b = slide?.blocks.find((x) => x.id === blockId)
        if (!b) return
        e.preventDefault()
        writeClipboard(b)
        if (e.key.toLowerCase() === 'x') {
          editor.update((d) => {
            const s = draftSlide(d, lessonId, slideId)
            if (s) s.blocks = s.blocks.filter((x) => x.id !== blockId)
          })
          selectBlock(null)
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        editor.update((d) => {
          const s = draftSlide(d, lessonId, slideId)
          if (s) s.blocks = s.blocks.filter((b) => b.id !== blockId)
        })
        selectBlock(null)
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const b = slide?.blocks.find((x) => x.id === blockId)
        if (!b) return
        const copy = cloneBlock(b)
        editor.update((d) => {
          const s = draftSlide(d, lessonId, slideId)
          if (!s) return
          s.blocks.splice(s.blocks.findIndex((x) => x.id === blockId) + 1, 0, copy)
        })
        selectBlock(copy.id)
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 2 : 0.5
        editor.update((d) => {
          const b = draftBlock(d, lessonId, slideId, blockId)
          if (!b) return
          if (e.key === 'ArrowLeft') b.frame.x = clamp(b.frame.x - step, 0, 100 - b.frame.w)
          if (e.key === 'ArrowRight') b.frame.x = clamp(b.frame.x + step, 0, 100 - b.frame.w)
          if (e.key === 'ArrowUp') b.frame.y = clamp(b.frame.y - step, 0, 100 - b.frame.h)
          if (e.key === 'ArrowDown') b.frame.y = clamp(b.frame.y + step, 0, 100 - b.frame.h)
        }, `${blockId}:nudge`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, course, selection, slide, picker, preview, publish, selectBlock])

  async function deleteCourse(c: Course) {
    if (!confirm(`Delete “${c.title}”? It will be moved to studio/data/trash.`)) return
    await api.deleteCourse(c.id)
    onClose()
  }

  if (editor.loadError)
    return (
      <div className="app">
        <div className="center-msg">
          <p>{editor.loadError}</p>
          <button className="btn" onClick={onClose}>
            Back to courses
          </button>
        </div>
      </div>
    )

  if (!course || !selection) return <div className="app"><div className="center-msg muted">Loading…</div></div>

  return (
    <SlideCharacters characters={course.characters} assetBase={assetBase}>
    <div className="app">
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          <IconLeft size={15} /> Courses
        </button>
        <div className="topbar-title">{course.title || 'Untitled course'}</div>
        <div className="topbar-spacer" />
        <span className={`save-status is-${editor.saveStatus}`} title={editor.saveError ?? undefined}>
          {SAVE_LABEL[editor.saveStatus]}
        </span>
        <IconButton title="Undo (⌘Z)" disabled={!editor.canUndo} onClick={editor.undo}>
          <IconUndo size={16} />
        </IconButton>
        <IconButton title="Redo (⇧⌘Z)" disabled={!editor.canRedo} onClick={editor.redo}>
          <IconRedo size={16} />
        </IconButton>
        {themeToggle}
        <button className="btn btn-sm" disabled={!lessonRef || lessonRef.lesson.slides.length === 0} onClick={() => setPreview(true)}>
          <IconPlay size={14} /> Preview
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => setPublish(true)}>
          <IconSend size={14} /> Publish
        </button>
      </header>

      <div className={`workspace${selection.view === 'settings' ? ' is-settings' : ''}`}>
        <Outline course={course} editor={editor} selection={selection} onSelect={setSelection} />

        {selection.view === 'settings' ? (
          <CourseSettings course={course} editor={editor} onDelete={() => void deleteCourse(course)} />
        ) : lessonRef ? (
          <>
            <SlideStrip
              lesson={lessonRef.lesson}
              editor={editor}
              activeSlideId={selection.slideId}
              assetBase={assetBase}
              onSelectSlide={(id) => setSelection({ ...selection, slideId: id, blockId: null })}
              onAddSlide={() => setPicker(true)}
            />
            <main className="stage-area" onPointerDown={(e) => e.target === e.currentTarget && selectBlock(null)}>
              {slide ? (
                <>
                  <EditorCanvas
                    slide={slide}
                    assetBase={assetBase}
                    selectedBlockId={selection.blockId}
                    onSelect={selectBlock}
                    onCommitFrame={(blockId, frame) =>
                      editor.update((d) => {
                        const b = draftBlock(d, lessonRef.lesson.id, slide.id, blockId)
                        if (b) b.frame = frame
                      })
                    }
                    onCommitCrop={(blockId, crop) =>
                      editor.update((d) => {
                        const b = draftBlock(d, lessonRef.lesson.id, slide.id, blockId)
                        if (b && b.type === 'image') b.crop = crop
                      })
                    }
                    onDropAvatar={(speaker, file) =>
                      void api.uploadImage(courseId, file).then((img) =>
                        editor.update((d) => {
                          const list = (d.characters ??= [])
                          const key = speaker.trim().toLowerCase()
                          const ch = list.find((c) => c.name.trim().toLowerCase() === key)
                          if (ch) ch.avatar = img.src
                          else list.push({ id: uid('ch'), name: speaker.trim(), avatar: img.src })
                        }),
                      )
                    }
                  />
                  <p className="stage-hint">
                    Drag to move · handles to resize · hold ⌥ to disable snapping · arrows nudge · ⌫ delete · ⌘D duplicate
                  </p>
                </>
              ) : (
                <div className="center-msg">
                  <p className="muted">This lesson has no slides.</p>
                  <button className="btn btn-primary" onClick={() => setPicker(true)}>
                    Add a slide
                  </button>
                </div>
              )}
            </main>
            <Inspector
              course={course}
              editor={editor}
              lessonRef={lessonRef}
              slide={slide}
              block={block}
              onSelectBlock={selectBlock}
            />
          </>
        ) : null}
      </div>

      {picker && lessonRef ? (
        <TemplatePicker
          onClose={() => setPicker(false)}
          onPick={(templateId) => {
            const s = createSlide(templateId)
            const lessonId = lessonRef.lesson.id
            const after = selection.view === 'slides' ? selection.slideId : null
            editor.update((d) => {
              const l = draftLesson(d, lessonId)
              if (!l) return
              const i = after ? l.slides.findIndex((x) => x.id === after) : -1
              l.slides.splice(i >= 0 ? i + 1 : l.slides.length, 0, s)
            })
            setSelection({ view: 'slides', lessonId, slideId: s.id, blockId: null })
            setPicker(false)
          }}
        />
      ) : null}

      {preview && lessonRef ? (
        <PreviewModal
          lesson={lessonRef.lesson}
          startIndex={selection.view === 'slides' ? lessonRef.lesson.slides.findIndex((s) => s.id === selection.slideId) : 0}
          assetBase={assetBase}
          onClose={() => setPreview(false)}
        />
      ) : null}

      {publish ? <PublishModal course={course} flush={() => editor.saveNow()} onClose={() => setPublish(false)} /> : null}
    </div>
    </SlideCharacters>
  )
}
