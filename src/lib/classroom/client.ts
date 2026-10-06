'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
}

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
  type: 'student_joined' | 'start' | 'recording_stopped' | 'end',
): Promise<SessionInfo | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/event`, { method: 'POST', body: JSON.stringify({ type }) })
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

/* ---------- Realtime: private channel classroom:<bookingId> ----------
   Authorised by the realtime.messages policies in supabase/add-classroom.sql
   (only the booking's student and the admin). Broadcast only: anything that
   must survive a refresh is also saved through the API. */

export type ClassroomEvent =
  | { type: 'chat'; message: ChatMsg }
  | { type: 'ended' }

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

  return (e: ClassroomEvent) => {
    channelRef.current?.send({ type: 'broadcast', event: 'cr', payload: e })
  }
}
