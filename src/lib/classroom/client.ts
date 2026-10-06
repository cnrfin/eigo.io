'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Course } from '@/lib/slides/types'
import type { InkItem, InkOp } from '@/components/classroom/ink'

/** Browser-side helpers for the classroom: API calls and the lesson's Realtime channel. */

export type ChatMsg = {
  id: string
  from: 'teacher' | 'student'
  text?: string
  file?: { path: string; name: string; size: number; type: string }
  at: string
}

export type SessionInfo = {
  startedAt: string | null
  endedAt: string | null
  studentJoinedAt: string | null
  recordingStoppedAt: string | null
  usedCourse?: boolean
}

/** What's on the slide area: a course lesson on a slide, or null for free talk. */
export type OpenLesson = { courseId: string; lessonId: string; slideId: string | null }

export type JoinInfo = {
  bookingId: string
  role: 'teacher' | 'student'
  roomUrl: string
  roomKey: string | null
  window: { start: string; end: string; studentOpensAt: string; closesAt: string; noShowAt: string }
  durationMinutes: number
  session: SessionInfo
  me: { name: string }
  other: { name: string }
  uiLang: 'ja' | 'en'
  nativeLang: string
  lesson: { courseTitle: string; lessonTitle: string; number: number } | null
  open: OpenLesson | null
  whiteboard: boolean
  studentDraw?: boolean
  ink: Record<string, InkItem[]>
  chat: ChatMsg[]
  serverNow: string
}

export type JoinDenied = {
  reason: 'not_found' | 'cancelled' | 'too_early' | 'ended' | 'no_room' | 'signed_out' | 'error'
  window?: JoinInfo['window'] | null
  uiLang?: 'ja' | 'en'
}

async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function call(path: string, init: RequestInit = {}) {
  const t = await token()
  return fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
}

export async function fetchJoin(bookingId: string): Promise<{ ok: true; info: JoinInfo } | { ok: false; denied: JoinDenied }> {
  try {
    if (!(await token())) return { ok: false, denied: { reason: 'signed_out' } }
    const r = await call(`/api/classroom/${bookingId}/join`)
    const body = await r.json().catch(() => ({}))
    if (r.ok) return { ok: true, info: body as JoinInfo }
    if (r.status === 401) return { ok: false, denied: { reason: 'signed_out' } }
    if (body?.reason) return { ok: false, denied: body as JoinDenied }
    return { ok: false, denied: { reason: 'error' } }
  } catch {
    return { ok: false, denied: { reason: 'error' } }
  }
}

export async function postEvent(
  bookingId: string,
  type: 'student_joined' | 'start' | 'recording_stopped' | 'end' | 'whiteboard' | 'studentDraw',
  extra?: { on: boolean },
): Promise<SessionInfo | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/event`, { method: 'POST', body: JSON.stringify({ type, ...extra }) })
    if (!r.ok) return null
    return (await r.json()).session as SessionInfo
  } catch {
    return null
  }
}

export async function postMessage(bookingId: string, text: string): Promise<ChatMsg | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/messages`, { method: 'POST', body: JSON.stringify({ text }) })
    if (!r.ok) return null
    return (await r.json()).message as ChatMsg
  } catch {
    return null
  }
}

export async function postRating(bookingId: string, stars: number, comment?: string): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/rating`, {
      method: 'POST',
      body: JSON.stringify(comment === undefined ? { stars } : { stars, comment }),
    })
    return r.ok
  } catch {
    return false
  }
}

export async function downloadChat(bookingId: string) {
  const r = await call(`/api/classroom/${bookingId}/chat`)
  if (!r.ok) return
  const blob = await r.blob()
  const name = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '')?.[1] || 'eigo-lesson-chat.txt'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export type LoadedCourse = { course: Course; version: number; assetBase: string }

export async function fetchCourse(bookingId: string, courseId: string): Promise<LoadedCourse | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/course?courseId=${encodeURIComponent(courseId)}`)
    return r.ok ? ((await r.json()) as LoadedCourse) : null
  } catch {
    return null
  }
}

export type LibraryCourse = {
  id: string
  title: string
  level: string
  units: { title: string; lessons: { id: string; title: string; slides: number }[] }[]
}
export type LibraryProgress = Record<string, { lessonId: string | null; slideId: string | null; completed: string[] }>

export async function fetchLibrary(bookingId: string): Promise<{ courses: LibraryCourse[]; progress: LibraryProgress } | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/library`)
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

export async function putInk(bookingId: string, surface: string, items: InkItem[], keepalive = false): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ink`, {
      method: 'PUT',
      body: JSON.stringify({ surface, items }),
      keepalive,
    })
    return r.ok
  } catch {
    return false
  }
}

export async function postState(bookingId: string, open: OpenLesson | null): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/state`, {
      method: 'POST',
      body: JSON.stringify(open ?? { courseId: null }),
    })
    return r.ok
  } catch {
    return false
  }
}

/* ---------- Realtime: private channel classroom:<bookingId> ----------
   Authorised by the realtime.messages policies in supabase/add-classroom.sql
   (only the booking's student and the admin). Broadcast only: anything that
   must survive a refresh is also saved through the API. */

export type ClassroomEvent =
  | { type: 'chat'; message: ChatMsg }
  | { type: 'ended' }
  | { type: 'open'; open: OpenLesson | null }
  | { type: 'media'; blockId: string; action: 'play' | 'pause' | 'ended'; time: number }
  | { type: 'hello' }
  | { type: 'ink'; op: InkOp }
  | { type: 'cursor'; x: number; y: number; surface: string }
  | { type: 'cursor'; hide: true }
  | { type: 'wb'; on: boolean }
  | { type: 'perm'; studentDraw: boolean }

export function useClassroomChannel(bookingId: string, onEvent: (e: ClassroomEvent) => void) {
  const handler = useRef(onEvent)
  useEffect(() => {
    handler.current = onEvent
  })
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let cancelled = false
    let channel: RealtimeChannel | null = null
    ;(async () => {
      const t = await token()
      if (cancelled || !t) return
      await supabase.realtime.setAuth(t)
      channel = supabase.channel(`classroom:${bookingId}`, { config: { private: true, broadcast: { self: false } } })
      channel.on('broadcast', { event: 'cr' }, ({ payload }) => handler.current(payload as ClassroomEvent))
      channel.subscribe()
      channelRef.current = channel
    })()
    return () => {
      cancelled = true
      channelRef.current = null
      if (channel) supabase.removeChannel(channel)
    }
  }, [bookingId])

  // stable, so callers can use it in effect / callback dependencies
  return useCallback((e: ClassroomEvent) => {
    channelRef.current?.send({ type: 'broadcast', event: 'cr', payload: e })
  }, [])
}
