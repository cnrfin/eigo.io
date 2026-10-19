'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Card } from '@/lib/ai-tutor/cards'
import type { ScreenAction } from '@/lib/ai-tutor/actions'
import type { Scene } from '@/lib/roleplay/types'
import type { Facts, FactsRead, WelcomePick } from '@/lib/classroom/welcome'
import type { SceneSummary } from '@/lib/roleplay/types'
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
  activity?: Record<string, unknown>
  chat: ChatMsg[]
  serverNow: string
  /** AI tutor lesson: no Whereby room; the tutor is a GPT-Live voice session */
  ai?: boolean
  /** AI lessons: the AI tutor avatar's colour (ORB_COLORS id) and whether it has rosy cheeks */
  aiColor?: string | null
  aiBlush?: boolean
  /** the student's free 5-minute welcome call */
  aiWelcome?: boolean
  /** AI lessons: the English level the student gave (ai-tutor/settings.ts ENGLISH_LEVELS; '' = not given) */
  aiLevel?: string
  /** AI lessons: a role-play chosen when booking; it opens as the lesson starts (null on a rejoin) */
  roleplay?: { sceneId: string; level: 0 | 1 | 2 } | null
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

/** AI lesson: exchange the browser's WebRTC offer for OpenAI's answer (our server creates the session). */
export async function startAiSession(
  bookingId: string,
  sdp: string,
): Promise<{ ok: true; sessionId: string; sdp: string; endsAt: string } | { ok: false; reason: string }> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-session`, { method: 'POST', body: JSON.stringify({ sdp }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, reason: j.reason ?? j.error ?? 'error' }
    return { ok: true, sessionId: j.sessionId, sdp: j.sdp, endsAt: j.endsAt }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** AI lesson: save the transcript (and close the session record). Uses keepalive so it survives page unload. */
export async function saveAiTranscript(bookingId: string, sessionId: string, lines: { from: 'student' | 'tutor'; text: string; t: number }[], final: boolean) {
  try {
    await call(`/api/classroom/${bookingId}/ai-transcript`, { method: 'POST', body: JSON.stringify({ sessionId, lines, final }), keepalive: true })
  } catch {
    /* best effort */
  }
}

export type SlideRef = { courseId: string; lessonId: string; slideId: string }

/** Something the student did in an AI lesson that the AI tutor should react to. */
/** AI lessons: a correction or "How do I say…?" card for the AI tutor's last turn, or (mode 'prepare') prepared after a student turn (null = none). */
export async function aiAssist(
  bookingId: string,
  body: { sessionId: string; lines: { from: 'student' | 'tutor'; text: string }[]; mode?: 'prepare' },
): Promise<Card | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-assist`, { method: 'POST', body: JSON.stringify(body) })
    return r.ok ? (((await r.json()).card as Card | null) ?? null) : null
  } catch {
    return null
  }
}

/** AI panel: the role-play list with the student's progress (lib/roleplay/progress.ts). */
export async function aiRoleplays(): Promise<SceneSummary[]> {
  try {
    const r = await call('/api/roleplay')
    return r.ok ? (((await r.json()).scenes as SceneSummary[]) ?? []) : []
  } catch {
    return []
  }
}
/** AI panel: one role-play in full, when it starts. */
export async function aiRoleplayScene(id: string): Promise<Scene | null> {
  try {
    const r = await call(`/api/roleplay?scene=${encodeURIComponent(id)}`)
    return r.ok ? (((await r.json()).scene as Scene) ?? null) : null
  } catch {
    return null
  }
}
/** AI panel: a role-play mission completed (moves the level on). */
export async function recordRoleplay(sceneId: string, role: 'a' | 'b', level: 0 | 1 | 2): Promise<number | null> {
  try {
    const r = await call('/api/roleplay', { method: 'POST', body: JSON.stringify({ sceneId, role, level }) })
    return r.ok ? Number((await r.json()).cleared) : null
  } catch {
    return null
  }
}
/** AI panel: the courses for the in-lesson picker (the same catalog as the dashboard picker). */
export type PanelCourse = { id: string; title: string; titleJa: string; level: string; description: string; descriptionJa: string; image: string | null; lessonCount: number; doneCount: number }
export async function aiCourses(): Promise<PanelCourse[]> {
  try {
    const r = await call('/api/slide-courses/catalog')
    if (!r.ok) return []
    const list = ((await r.json()).courses ?? []) as Record<string, unknown>[]
    return list.map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ''),
      titleJa: String(c.titleJa ?? c.title ?? ''),
      level: String(c.level ?? ''),
      description: String(c.description ?? ''),
      descriptionJa: String(c.descriptionJa ?? c.description ?? ''),
      image: Array.isArray(c.scenes) && c.scenes.length ? String(c.scenes[0]) : null,
      lessonCount: Number(c.lessonCount) || 0,
      doneCount: Number(c.doneCount) || 0,
    }))
  } catch {
    return []
  }
}

export type StudentAction =
  | { kind: 'chat'; text: string }
  | { kind: 'lookup'; term: string; meaning: string }
  | { kind: 'save'; term: string }
  | { kind: 'activity'; text: string }
  | { kind: 'media'; text: string }
  | { kind: 'start'; slide?: SlideRef | null; roleplay?: string }
  | { kind: 'resume'; slide?: SlideRef | null }
  | ({ kind: 'slide'; review?: { returnTo: number } } & SlideRef)
  | { kind: 'lesson'; courseId: string; lessonId: string }
  | { kind: 'not_yet'; missing: string[] }
  | { kind: 'nudge'; where?: 'slides' | 'free' | 'roleplay' | 'welcome' }
  /** the lesson was started again from slide 1 */
  | { kind: 'restarted' }
  /** left: seconds on the classroom clock (it can end a little before the server's end) */
  | { kind: 'time'; left?: number }
  | { kind: 'view'; what: 'closed' | 'board_on' | 'board_off' | 'open_failed' }
  /** a card on the student's screen: its phrase was saved to the word list, or they picked a version */
  | { kind: 'card'; what: 'saved' | 'chose'; text: string; style?: string }
  /** a role-play starts on the AI panel (the server sends the AI tutor the scene, its character and the tasks) */
  | { kind: 'roleplay'; sceneId: string; role: 'a' | 'b'; level: 0 | 1 | 2 }
  /** every task on the student's list is ticked: the AI tutor brings the scene to an end */
  | { kind: 'roleplay_tasks_done' }
  /** the mission-complete screen is up: spoken feedback, then swap / again / another */
  | { kind: 'roleplay_done'; sceneId: string; role: 'a' | 'b'; done: { task: string; said: string }[]; missed: string[]; canSwap: boolean; phrases?: string[]; welcome?: boolean }
  /** the AI panel: the picker opened, or the student closed it */
  | { kind: 'panel'; what: 'picker' | 'closed' | 'course' }
  /** the welcome call (lib/classroom/welcome.ts): a new step on its rails */
  | WelcomeAction

export type WelcomeAction =
  /** the welcome talk: the role-play chosen for them (the tutor suggests it), and time reminders (wrap the scene up /
   *  move on to the voice command) */
  | { kind: 'welcome'; step: 'pick'; sceneId: string }
  | { kind: 'welcome'; step: 'wrap' | 'command' }

/* ---------- the welcome call (lib/classroom/welcome.ts, /api/classroom/[id]/ai-welcome) ---------- */
async function welcomeCall<T>(bookingId: string, body: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-welcome`, { method: 'POST', body: JSON.stringify(body) })
    return r.ok ? ((await r.json()) as T) : fallback
  } catch {
    return fallback
  }
}
/** what the student has said about themselves so far, and a role-play for them */
export const welcomeAbout = (bookingId: string, sessionId: string, lines: { from: 'student' | 'tutor'; text: string }[]) =>
  welcomeCall<FactsRead & { pick: WelcomePick | null }>(bookingId, { op: 'about', sessionId, lines }, { facts: {}, thin: [], pick: null }).then((r) => ({ ...r, thin: Array.isArray(r.thin) ? r.thin : [] }))
/** confirmed: added to About me (null = not saved) */
export const welcomeSave = (bookingId: string, facts: Facts) =>
  welcomeCall<{ aboutMe?: string } | null>(bookingId, { op: 'save', facts }, null).then((r) => (r && typeof r.aboutMe === 'string' ? r.aboutMe : null))
export const welcomeScenes = (bookingId: string) =>
  welcomeCall<{ scenes?: { id: string; en: string; ja: string }[] }>(bookingId, { op: 'scenes' }, {}).then((r) => r.scenes ?? [])
export const welcomeScene = (bookingId: string, sceneId: string) =>
  welcomeCall<{ scene?: Scene }>(bookingId, { op: 'scene', sceneId }, {}).then((r) => r.scene ?? null)
export const welcomeRecord = (bookingId: string, sceneId: string) =>
  welcomeCall<{ cleared?: number }>(bookingId, { op: 'record', sceneId }, {}).then((r) => (typeof r.cleared === 'number' ? r.cleared : null))

/** AI lessons: tell the AI tutor about a student action. Our server turns it into a fixed-template
 *  instruction on the live session (the browser can't send instructions itself). */
export async function sendAiAction(bookingId: string, sessionId: string, action: StudentAction): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-context`, { method: 'POST', body: JSON.stringify({ sessionId, action }) })
    return r.ok
  } catch {
    return false
  }
}

/** AI lessons: the published courses' ids and titles (to recognise "I'll open <course> now"). */
export async function aiCourseTitles(): Promise<{ id: string; title: string; titleJa: string }[]> {
  try {
    const r = await call('/api/slide-courses/catalog', { method: 'GET' })
    const d = await r.json().catch(() => ({}))
    return Array.isArray(d.courses) ? d.courses.map((c: { id: string; title: string; titleJa: string }) => ({ id: c.id, title: c.title, titleJa: c.titleJa })) : []
  } catch {
    return []
  }
}

/** AI lessons: open a course lesson. courseId "" = the student's current course; lessonId "" = where they left off,
 *  "#N" = lesson N of the course. (The server resolves both.) */
export async function aiOpenLesson(bookingId: string, courseId: string, lessonId: string): Promise<{ open: OpenLesson; title: string } | { error: string }> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-open`, { method: 'POST', body: JSON.stringify({ courseId, lessonId }) })
    const d = await r.json().catch(() => ({}))
    return r.ok ? d : { error: d.error || 'Could not open the lesson.' }
  } catch {
    return { error: 'Could not open the lesson.' }
  }
}

export type AiTurn = {
  move: 'stay' | 'next' | 'back' | 'return'
  slide: number | null
  /** the action judge (lib/ai-tutor/actions.ts): a screen change, already checked on the server */
  action?: ScreenAction
  quote?: string
  /** a role-play: the student's tasks done now, with their words (lib/roleplay/ticks.ts) */
  ticks?: { id: string; said: string }[]
}

/** AI lessons: should the slide change after this turn? (a small fast model on our server decides) */
export async function aiTurn(
  bookingId: string,
  body: {
    sessionId: string
    /** the slide check (with a course open) */
    courseId?: string
    lessonId?: string
    slideId?: string
    furthest?: number
    reviewing?: boolean
    lines?: { from: 'student' | 'tutor'; text: string }[]
    /** the action judge */
    screen?: { view: 'free' | 'course' | 'picker' | 'roleplay'; board: boolean; pickerMode?: 'rp' | 'course'; roleplay?: string; wrappingUp?: boolean }
    courses?: { id: string; title: string }[]
    scenes?: { id: string; title: string }[]
    recent?: { from: 'student' | 'tutor'; text: string }[]
    /** a role-play being played: which tasks are done now */
    roleplay?: { sceneId: string; role: 'a' | 'b'; level: 0 | 1 | 2; twisted: boolean; done: string[]; lines?: { from: 'student' | 'tutor'; text: string }[] }
  },
): Promise<AiTurn> {
  const none: AiTurn = { move: 'stay', slide: null, action: { kind: 'none' }, quote: '' }
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-turn`, { method: 'POST', body: JSON.stringify(body) })
    if (!r.ok) return none
    return { ...none, ...(await r.json()) }
  } catch {
    return none
  }
}

/** AI lessons: one-tap problem report (flag button). */
export async function sendAiReport(
  bookingId: string,
  body: { reason: 'slide' | 'audio' | 'content' | 'other'; note?: string; sessionId?: string | null; courseId?: string; lessonId?: string; slideId?: string; slideNo?: number; recent?: string },
): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/ai-report`, { method: 'POST', body: JSON.stringify(body) })
    return r.ok
  } catch {
    return false
  }
}

/** Teacher: mark the booking as a no-show (or undo it). */
export async function markNoShow(bookingId: string, on: boolean): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/no-show`, { method: 'POST', body: JSON.stringify({ on }) })
    return r.ok
  } catch {
    return false
  }
}

export async function postMessage(bookingId: string, text: string, asTutor = false): Promise<ChatMsg | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/messages`, { method: 'POST', body: JSON.stringify(asTutor ? { text, asTutor } : { text }) })
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

export type WordInfo = { term: string; pos: string; ja: string; meaning: string; example: string }

export async function lookupWord(bookingId: string, term: string, sentence: string): Promise<WordInfo | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/lookup`, { method: 'POST', body: JSON.stringify({ term, sentence }) })
    return r.ok ? ((await r.json()) as WordInfo) : null
  } catch {
    return null
  }
}

export async function translateMessage(bookingId: string, messageId: string): Promise<string | null> {
  try {
    const r = await call(`/api/classroom/${bookingId}/translate`, { method: 'POST', body: JSON.stringify({ messageId }) })
    return r.ok ? ((await r.json()).translation as string) : null
  } catch {
    return null
  }
}

export type WordSource = 'course' | 'lookup' | 'chat' | 'tutor'
export type SavedWord = {
  itemId: string
  term: string
  source: WordSource
  courseId: string | null
  /** Japanese meaning, when we have one */
  ja?: string
  /** the lesson it was saved in, and when (the word list shows this lesson's words, newest first) */
  bookingId?: string | null
  at?: string
}
export type SaveWordInput = {
  source: WordSource
  courseId?: string | null
  itemId: string
  term: string
  pos?: string
  meaning?: string
  ja?: string
  example?: string
}

export async function fetchSavedWords(bookingId: string): Promise<SavedWord[]> {
  try {
    const r = await call(`/api/classroom/${bookingId}/words`)
    return r.ok ? ((await r.json()).saved as SavedWord[]) : []
  } catch {
    return []
  }
}

export async function saveWord(bookingId: string, w: SaveWordInput): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/words`, { method: 'POST', body: JSON.stringify(w) })
    return r.ok
  } catch {
    return false
  }
}

export async function removeWord(bookingId: string, itemId: string): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/words?itemId=${encodeURIComponent(itemId)}`, { method: 'DELETE' })
    return r.ok
  } catch {
    return false
  }
}

export async function putActivity(bookingId: string, blockId: string, state: unknown): Promise<boolean> {
  try {
    const r = await call(`/api/classroom/${bookingId}/activity`, { method: 'PUT', body: JSON.stringify({ blockId, state }) })
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
  | { type: 'act'; blockId: string; state: unknown }

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
