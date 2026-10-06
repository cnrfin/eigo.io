import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Course } from '@slides'
import { ApiError, api } from './api'

const HISTORY_LIMIT = 150
const COALESCE_MS = 1200
const SAVE_DELAY_MS = 700

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

interface State {
  course: Course | null
  past: Course[]
  future: Course[]
  /** Increments on every content change; used to drive autosave. */
  version: number
  coalesceKey: string | null
  coalesceAt: number
}

type Action =
  | { type: 'load'; course: Course }
  | { type: 'update'; mutate: (draft: Course) => void; coalesce?: string }
  | { type: 'undo' }
  | { type: 'redo' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { course: action.course, past: [], future: [], version: 0, coalesceKey: null, coalesceAt: 0 }
    case 'update': {
      if (!state.course) return state
      const next = structuredClone(state.course)
      action.mutate(next)
      const now = Date.now()
      const merge =
        action.coalesce != null && action.coalesce === state.coalesceKey && now - state.coalesceAt < COALESCE_MS
      const past = merge ? state.past : [...state.past, state.course].slice(-HISTORY_LIMIT)
      return {
        course: next,
        past,
        future: [],
        version: state.version + 1,
        coalesceKey: action.coalesce ?? null,
        coalesceAt: now,
      }
    }
    case 'undo': {
      if (!state.course || state.past.length === 0) return state
      const prev = state.past[state.past.length - 1]
      return {
        course: prev,
        past: state.past.slice(0, -1),
        future: [state.course, ...state.future],
        version: state.version + 1,
        coalesceKey: null,
        coalesceAt: 0,
      }
    }
    case 'redo': {
      if (!state.course || state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        course: next,
        past: [...state.past, state.course],
        future: rest,
        version: state.version + 1,
        coalesceKey: null,
        coalesceAt: 0,
      }
    }
  }
}

export function useCourseEditor(courseId: string | null) {
  const [state, dispatch] = useReducer(reducer, {
    course: null,
    past: [],
    future: [],
    version: 0,
    coalesceKey: null,
    coalesceAt: 0,
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const savedVersion = useRef(0)
  /** updatedAt of the copy on disk this tab last loaded/saved (for conflict detection). */
  const baseUpdatedAt = useRef<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const latest = useRef<State>(state)
  latest.current = state

  // ---- load
  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoadError(null)
    api
      .getCourse(courseId)
      .then((c) => {
        if (cancelled) return
        savedVersion.current = 0
        baseUpdatedAt.current = c.updatedAt
        setSaveStatus('saved')
        dispatch({ type: 'load', course: c })
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [courseId, reloadKey])

  // ---- autosave (debounced)
  const saveNow = useCallback(async (keepalive = false) => {
    const { course, version } = latest.current
    if (!course || version === savedVersion.current) return
    setSaveStatus('saving')
    try {
      const r = await api.saveCourse(course, baseUpdatedAt.current, keepalive)
      baseUpdatedAt.current = r.updatedAt
      savedVersion.current = version
      setSaveError(null)
      setSaveStatus(latest.current.version === version ? 'saved' : 'unsaved')
    } catch (e) {
      setSaveError((e as Error).message)
      setSaveStatus('error')
      if (e instanceof ApiError && e.status === 409 && !keepalive) {
        // Someone else (another tab, or a regenerated file) changed the course.
        if (confirm('This course was changed outside this tab (for example, regenerated or edited elsewhere).\n\nReload the latest version? Edits made here since it changed will be discarded.')) {
          savedVersion.current = latest.current.version
          setReloadKey((k) => k + 1)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!state.course || state.version === savedVersion.current) return
    setSaveStatus('unsaved')
    const t = setTimeout(() => void saveNow(), SAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [state.version, state.course, saveNow])

  // flush on tab close / course switch
  useEffect(() => {
    const flush = () => void saveNow(true)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [saveNow, courseId])

  const update = useCallback((mutate: (draft: Course) => void, coalesce?: string) => {
    dispatch({ type: 'update', mutate, coalesce })
  }, [])

  return {
    course: state.course && state.course.id === courseId ? state.course : null,
    loadError,
    update,
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    saveStatus,
    saveError,
    saveNow,
  }
}

export type CourseEditor = ReturnType<typeof useCourseEditor>
