'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocalMedia } from '@whereby.com/browser-sdk/react'
import {
  downloadChat,
  fetchCourse,
  postMessage,
  fetchSavedWords,
  lookupWord,
  postEvent,
  postState,
  putActivity,
  putInk,
  removeWord,
  saveWord,
  postRating,
  useClassroomChannel,
  type ChatMsg,
  type JoinInfo,
  type LoadedCourse,
  type OpenLesson,
  type SaveWordInput,
  type SavedWord,
  type SessionInfo,
  type WordInfo,
} from '@/lib/classroom/client'
import type { ActivityApi, VocabSaveApi } from '@/lib/slides'
import type { VocabItem } from '@/lib/slides/types'
import { makeT, type ClassroomT } from '@/lib/classroom/i18n'
import { audioContext } from './audio'
import { Ico, Star } from './Icons'
import Lobby from './Lobby'
import Room, { type TileMsg } from './Room'
import type { MediaEvent } from './SlideStage'
import { InkEngine, type InkItem } from './ink'
import { isLowPower, usePrefs } from './prefs'
import { LookupEngine, type LookupRequest } from './lookup'
import WordPopup, { type PopupState } from './WordPopup'

/**
 * Lobby → room → "left / lesson complete" screen, plus the state that must
 * survive leaving and rejoining (chat, lesson clock, toasts).
 */

type Phase = { name: 'lobby' } | { name: 'room'; key: number } | { name: 'left'; ended: boolean }

/* After the pre-join check, a refresh of the same tab goes straight back into
   the room with the same camera / mic choices (sessionStorage: this tab only,
   gone when the tab closes). Leaving the lesson clears it. */
type SavedJoin = { camOn: boolean; micOn: boolean; cam?: string; mic?: string; speaker?: string }
const joinKey = (id: string) => `eigo-classroom-joined:${id}`
function readJoin(id: string): SavedJoin | null {
  try {
    const v = sessionStorage.getItem(joinKey(id))
    return v ? (JSON.parse(v) as SavedJoin) : null
  } catch {
    return null
  }
}
function writeJoin(id: string, v: SavedJoin | null) {
  try {
    if (v) sessionStorage.setItem(joinKey(id), JSON.stringify(v))
    else sessionStorage.removeItem(joinKey(id))
  } catch {
    /* private mode etc.: just show the check again next time */
  }
}

function Toast({ toast }: { toast: { msg: string; kind?: 'ok' | 'bad'; n: number } | null }) {
  return (
    <div className={`toast${toast ? ' show' : ''}`} key={toast?.n} role="status" aria-live="polite">
      {toast?.kind === 'ok' && (
        <span className="tick">
          <svg viewBox="0 0 24 24" width="13" height="13">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {toast?.kind === 'bad' && (
        <span className="tick bad">
          <svg viewBox="0 0 24 24" width="12" height="12">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span>{toast?.msg}</span>
    </div>
  )
}

function Rating({ t, bookingId }: { t: ClassroomT; bookingId: string }) {
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [stage, setStage] = useState<'idle' | 'low' | 'sent'>('idle')
  const shown = hover || stars
  return (
    <div id="leftCard" className={`card-rating${stage === 'low' ? ' low' : stage === 'sent' ? ' sent' : ''}`}>
      <p className="rq">{t('howWasClass')}</p>
      <div className="stars" role="radiogroup" aria-label={t('howWasClass')} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={stars === n}
            aria-label={n === 1 ? t('starLabel') : t('starsLabel', { n })}
            className={n <= shown ? 'lit' : ''}
            onMouseEnter={() => setHover(n)}
            onClick={() => {
              setStars(n)
              postRating(bookingId, n)
              setStage(n <= 3 ? 'low' : 'sent')
            }}
          >
            <Star />
          </button>
        ))}
      </div>
      {stage === 'low' && (
        <div className="rmore" style={{ display: 'flex' }}>
          <textarea rows={2} value={comment} autoFocus placeholder={t('improvePlaceholder')} onChange={(e) => setComment(e.target.value)} />
          <button
            className="ebtn sec"
            onClick={() => {
              postRating(bookingId, stars, comment)
              setStage('sent')
            }}
          >
            {t('send')}
          </button>
        </div>
      )}
      {stage === 'sent' && (
        <p className="rthanks" style={{ display: 'block' }}>
          {t('thanksFeedback')}
        </p>
      )}
    </div>
  )
}

function LeftScreen({
  info,
  t,
  ended,
  session,
  clockOffset,
  onRejoin,
  words,
}: {
  info: JoinInfo
  t: ClassroomT
  ended: boolean
  session: SessionInfo
  clockOffset: number
  onRejoin: () => void
  /** this lesson's words (course vocabulary + anything saved today) and which are saved */
  words: { term: string; saved: boolean }[]
}) {
  const L = info.durationMinutes * 60
  const startedMs = session.startedAt ? new Date(session.startedAt).getTime() : null
  const [nowMs] = useState(() => Date.now() + clockOffset)
  const elapsed = startedMs ? (nowMs - startedMs) / 1000 : 0
  // The lesson counts as complete when its time is up, or the teacher ended it.
  const done = ended || (!!startedMs && elapsed >= L)
  const isStudent = info.role === 'student'

  const savedN = words.filter((w) => w.saved).length
  if (done && isStudent && savedN > 0) {
    // Layout F: the student saved words in this lesson
    const show = [...words.filter((w) => w.saved), ...words.filter((w) => !w.saved)].slice(0, 6)
    return (
      <div className="leftScreen on done layF">
        <div className="card">
          <div className="eico">
            <Ico name="check" />
          </div>
          <h2>{t('lessonComplete')}</h2>
          <p>{t('wordsSaved', { n: words.length, m: savedN })}</p>
          <div className="wchips">
            {show.map((w) => (
              <span key={w.term} className={w.saved ? 'saved' : ''}>
                {w.term}
              </span>
            ))}
            {words.length > 6 && <span className="more">+{words.length - 6}</span>}
          </div>
          <div className="ebtns">
            <a className="ebtn cta" id="reviewBtn" href="/dashboard?tab=vocab">
              {t('reviewNow')}
            </a>
            <a className="ebtn ghost" id="dashBtn" href="/dashboard">
              {t('goDashboard')}
            </a>
          </div>
          <div className="bRate" style={{ display: 'block' }}>
            <Rating t={t} bookingId={info.bookingId} />
          </div>
          <div className="fFoot">
            <span />
            <button className="dlLink" onClick={() => downloadChat(info.bookingId)}>
              <Ico name="download" />
              {t('downloadChat')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    // Layout B: no words saved in this lesson
    return (
      <div className="leftScreen on done layB">
        <div className="card">
          <div className="eico">
            <Ico name="check" />
          </div>
          <h2>{t('lessonComplete')}</h2>
          <p>{isStudent ? t('reviewLater') : t('teacherEndedBody', { name: info.other.name })}</p>
          {isStudent && (
            <div className="bRate" style={{ display: 'block' }}>
              <Rating t={t} bookingId={info.bookingId} />
            </div>
          )}
          <div className="ebtns">
            <a className="ebtn ghost" id="dashBtn" href={isStudent ? '/dashboard' : '/admin'}>
              {t('goDashboard')}
            </a>
          </div>
          <button className="dlLink" id="dlLinkB" onClick={() => downloadChat(info.bookingId)}>
            <Ico name="download" />
            {t('downloadChat')}
          </button>
        </div>
      </div>
    )
  }

  const minsLeft = Math.ceil((L - elapsed) / 60)
  return (
    <div className="leftScreen on">
      <div className="card">
        <div className="eico">
          <Ico name="leave" />
        </div>
        <h2>{t('youLeft')}</h2>
        <p>{startedMs ? t('clockStillRunning', { n: minsLeft }) : t('roomStillOpen')}</p>
        <div className="ebtns">
          <button className="ebtn cta" onClick={onRejoin}>
            {t('rejoin')}
          </button>
          <a className="ebtn ghost" id="dashBtn" href={isStudent ? '/dashboard' : '/admin'}>
            {t('backDashboard')}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Classroom({ info }: { info: JoinInfo }) {
  const t = useMemo(() => makeT(info.uiLang), [info.uiLang])
  const [savedJoin] = useState(() => readJoin(info.bookingId))
  const localMedia = useLocalMedia({ audio: true, video: true })
  const [phase, setPhase] = useState<Phase>(() => (savedJoin ? { name: 'room', key: Date.now() } : { name: 'lobby' }))
  const [session, setSession] = useState<SessionInfo>(info.session)
  const [messages, setMessages] = useState<ChatMsg[]>(info.chat)
  const [chatOpen, setChatOpenRaw] = useState(false)
  const [unread, setUnread] = useState(0)
  const [speakerId, setSpeakerId] = useState(savedJoin?.speaker || 'default')
  const [endSignal, setEndSignal] = useState(0)
  const [clockOffset] = useState(() => new Date(info.serverNow).getTime() - Date.now())

  /* toasts */
  const [toastState, setToast] = useState<{ msg: string; kind?: 'ok' | 'bad'; n: number } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useCallback((msg: string, kind?: 'ok' | 'bad') => {
    setToast((p) => ({ msg, kind, n: (p?.n ?? 0) + 1 }))
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  /* the message also pops up over the sender's own video for a few seconds */
  const [tileMsgs, setTileMsgs] = useState<{ other: TileMsg | null; me: TileMsg | null }>({ other: null, me: null })
  const tileTimers = useRef<Record<'other' | 'me', ReturnType<typeof setTimeout>[]>>({ other: [], me: [] })
  const popTile = useCallback((side: 'other' | 'me', m: ChatMsg) => {
    const text = m.file ? `📎 ${m.file.name}` : (m.text ?? '')
    tileTimers.current[side].forEach(clearTimeout)
    setTileMsgs((p) => ({ ...p, [side]: { id: m.id, from: m.from, text } }))
    tileTimers.current[side] = [
      setTimeout(() => setTileMsgs((p) => (p[side]?.id === m.id ? { ...p, [side]: { ...p[side]!, out: true } } : p)), 4000),
      setTimeout(() => setTileMsgs((p) => (p[side]?.id === m.id ? { ...p, [side]: null } : p)), 4500),
    ]
  }, [])

  const setChatOpen = useCallback((o: boolean) => {
    setChatOpenRaw(o)
    if (o) setUnread(0)
  }, [])

  /* ---------- course lesson on the slide area (null = free talk) ---------- */
  const isTeacher = info.role === 'teacher'
  const [open, setOpen] = useState<OpenLesson | null>(info.open)
  const [courses, setCourses] = useState<Record<string, LoadedCourse>>({})
  const [teacherView, setTeacherView] = useState(true) // on by default for the teacher
  const [remoteMedia, setRemoteMedia] = useState<MediaEvent | null>(null)
  const [helloAt, setHelloAt] = useState(0)

  /* ---------- drawings, whiteboard, cursors ---------- */
  const [whiteboard, setWb] = useState(!!info.whiteboard)
  const [prefs, setPrefs] = usePrefs()

  /* ---------- words: lookups, the + in vocabulary tables, saving ---------- */
  const [saved, setSaved] = useState<Map<string, SavedWord>>(new Map())
  const [savedNow, setSavedNow] = useState<Map<string, string>>(new Map()) // itemId → term, saved in this lesson
  const [lessonsSeen, setLessonsSeen] = useState<Set<string>>(() => new Set(info.open ? [`${info.open.courseId}:${info.open.lessonId}`] : []))
  const markSeen = (o: OpenLesson | null) => {
    if (o) setLessonsSeen((p) => (p.has(`${o.courseId}:${o.lessonId}`) ? p : new Set(p).add(`${o.courseId}:${o.lessonId}`)))
  }
  const [popup, setPopup] = useState<(PopupState & { key?: SaveWordInput }) | null>(null)
  const [lookup] = useState(() => new LookupEngine())
  /* true / false and matching: shared answers */
  const [activity, setActivity] = useState<Record<string, unknown>>(info.activity ?? {})
  const [studentDraw, setStudentDrawState] = useState(info.studentDraw !== false)
  // visual effects: solid panels instead of frosted glass on 'reduced' (or a low-power device on 'auto')
  useEffect(() => {
    const root = document.querySelector('.cr')
    root?.classList.toggle('fx-lite', prefs.fx === 'lite' || (prefs.fx === 'auto' && isLowPower()))
  }, [prefs.fx])
  const [bus] = useState(() => new EventTarget())
  const [ink] = useState(() => {
    const e = new InkEngine()
    e.loadAll(info.ink ?? {})
    return e
  })
  const loading = useRef(new Set<string>())
  useEffect(() => {
    const id = open?.courseId
    if (!id || courses[id] || loading.current.has(id)) return
    loading.current.add(id)
    fetchCourse(info.bookingId, id).then((c) => {
      loading.current.delete(id)
      if (c) setCourses((p) => ({ ...p, [id]: c }))
      else toast(t('courseLoadFailed'), 'bad')
    })
  }, [open?.courseId, courses, info.bookingId, toast, t])

  const chatOpenRef = useRef(chatOpen)
  const phaseRef = useRef(phase.name)
  const openRef = useRef(open)
  const wbRef = useRef(whiteboard)
  const studentDrawRef = useRef(true)
  useEffect(() => {
    chatOpenRef.current = chatOpen
    phaseRef.current = phase.name
    openRef.current = open
    wbRef.current = whiteboard
    studentDrawRef.current = studentDraw
  })
  const send = useClassroomChannel(info.bookingId, (e) => {
    if (e.type === 'chat') {
      setMessages((p) => (p.some((m) => m.id === e.message.id) ? p : [...p, e.message]))
      popTile('other', e.message)
      if (!chatOpenRef.current) setUnread((n) => n + 1)
    } else if (e.type === 'open') {
      // the teacher moved to another slide, opened a lesson or closed the course
      if (!isTeacher) {
        setOpen(e.open)
        markSeen(e.open)
        if (e.open) setWb(false) // moving slides closes the whiteboard
      }
    } else if (e.type === 'ink') {
      ink.applyRemote(e.op)
    } else if (e.type === 'cursor') {
      const d = 'hide' in e || e.surface !== ink.surface ? null : { x: e.x, y: e.y }
      bus.dispatchEvent(new CustomEvent('cursor', { detail: d }))
    } else if (e.type === 'wb') {
      setWb(e.on)
    } else if (e.type === 'act') {
      setActivity((p) => ({ ...p, [e.blockId]: e.state }))
    } else if (e.type === 'perm') {
      if (!isTeacher) {
        setStudentDrawState(e.studentDraw)
        toast(e.studentDraw ? t('drawingOn') : t('drawingOff', { name: info.other.name }))
      }
    } else if (e.type === 'media') {
      setRemoteMedia({ blockId: e.blockId, action: e.action, time: e.time, n: Date.now() })
    } else if (e.type === 'hello') {
      // the student (re)connected: tell them what's on screen right now (effect below)
      if (isTeacher) setHelloAt(Date.now())
    } else if (e.type === 'ended') {
      // In the room: Room leaves and reports back. In the lobby: go straight to the end screen.
      if (phaseRef.current === 'room') setEndSignal(Date.now())
      else setPhase({ name: 'left', ended: true })
    }
  })

  const sendMessage = useCallback(
    async (text: string) => {
      const m = await postMessage(info.bookingId, text)
      if (!m) {
        toast(t('sendFailed'), 'bad')
        return false
      }
      setMessages((p) => [...p, m])
      popTile('me', m)
      send({ type: 'chat', message: m })
      return true
    },
    [info.bookingId, popTile, send, toast, t],
  )

  useEffect(() => {
    if (!helloAt) return
    send({ type: 'open', open: openRef.current })
    send({ type: 'wb', on: wbRef.current })
    if (!studentDrawRef.current) send({ type: 'perm', studentDraw: false })
  }, [helloAt, send])

  /* drawings: send each change at once, save each surface 800 ms after its last change */
  const inkTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const inkLatest = useRef(new Map<string, InkItem[]>())
  useEffect(() => {
    return ink.handleOps((op, items) => {
      send({ type: 'ink', op })
      inkLatest.current.set(op.surface, items)
      const prev = inkTimers.current.get(op.surface)
      if (prev) clearTimeout(prev)
      inkTimers.current.set(
        op.surface,
        setTimeout(() => {
          inkTimers.current.delete(op.surface)
          const latest = inkLatest.current.get(op.surface)
          inkLatest.current.delete(op.surface)
          if (latest) putInk(info.bookingId, op.surface, latest)
        }, 800),
      )
    })
  }, [send, info.bookingId, ink])
  useEffect(() => {
    // closing the tab: save what's still waiting
    const flush = () => {
      for (const [surface, items] of inkLatest.current) putInk(info.bookingId, surface, items, true)
      inkLatest.current.clear()
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [info.bookingId])

  const onCursor = useCallback(
    (p: { x: number; y: number } | null) => {
      if (!prefs.cursors) return // cursors off: don't send mine either
      send(p ? { type: 'cursor', x: p.x, y: p.y, surface: ink.surface } : { type: 'cursor', hide: true })
    },
    [send, ink, prefs.cursors],
  )
  /* the student's saved words (so slides can show them as saved) */
  useEffect(() => {
    if (isTeacher) return
    let live = true
    fetchSavedWords(info.bookingId).then((list) => {
      if (live) setSaved(new Map(list.map((w) => [w.itemId, w])))
    })
    return () => {
      live = false
    }
  }, [isTeacher, info.bookingId])
  useEffect(() => {
    lookup.setSaved([...saved.values()].map((w) => w.term))
  }, [saved, lookup])

  const lessonVocab = useCallback((): (VocabItem & { courseId: string })[] => {
    const o = openRef.current
    const c = o ? courses[o.courseId] : null
    const lesson = c?.course.units.flatMap((u) => u.lessons).find((l) => l.id === o!.lessonId)
    const out: (VocabItem & { courseId: string })[] = []
    for (const s of lesson?.slides ?? [])
      for (const b of s.blocks) if (b.type === 'vocab') for (const it of b.items) out.push({ ...it, courseId: c!.course.id })
    return out
  }, [courses])

  const toggleWord = useCallback(
    async (w: SaveWordInput) => {
      if (isTeacher) return
      const was = saved.has(w.itemId)
      const apply = (on: boolean) => {
        setSaved((p) => {
          const n = new Map(p)
          if (on) n.set(w.itemId, { itemId: w.itemId, term: w.term, source: w.source, courseId: w.courseId ?? null })
          else n.delete(w.itemId)
          return n
        })
        setSavedNow((p) => {
          const n = new Map(p)
          if (on) n.set(w.itemId, w.term)
          else n.delete(w.itemId)
          return n
        })
      }
      apply(!was) // optimistic
      const ok = was ? await removeWord(info.bookingId, w.itemId) : await saveWord(info.bookingId, w)
      if (!ok) {
        apply(was)
        toast(t('saveFailed'), 'bad')
        return
      }
      toast(was ? t('wordRemoved', { term: w.term }) : t('wordAdded', { term: w.term }), was ? undefined : 'ok')
    },
    [isTeacher, saved, info.bookingId, toast, t],
  )

  const vocabApi = useMemo<VocabSaveApi | null>(
    () =>
      isTeacher
        ? null
        : {
            isSaved: (it) => !!it.id && saved.has(it.id),
            toggle: (it) => {
              const o = openRef.current
              if (!it.id || !o) return
              toggleWord({ source: 'course', courseId: o.courseId, itemId: it.id, term: it.term, pos: it.pos, meaning: it.meaning, ja: it.ja, example: it.example })
            },
          },
    [isTeacher, saved, toggleWord],
  )

  const activityApi = useMemo<ActivityApi>(
    () => ({
      get: (id) => activity[id],
      set: (id, st) => {
        setActivity((p) => ({ ...p, [id]: st }))
        send({ type: 'act', blockId: id, state: st })
        putActivity(info.bookingId, id, st)
      },
      onResult: (_id, r) => toast(r.message, r.correct ? 'ok' : 'bad'),
    }),
    [activity, send, info.bookingId, toast],
  )

  /* word lookup: course vocabulary first (instant), otherwise ask the AI */
  const onLookup = useCallback(
    async (r: LookupRequest) => {
      const k = r.term.toLowerCase().replace(/[’]/g, "'").trim()
      const bare = k.replace(/^(a|an|the|to)\s+/, '')
      const hit = lessonVocab().find((it) => {
        const t2 = it.term.toLowerCase().replace(/[’]/g, "'")
        const tb = t2.replace(/^(a|an|the|to)\s+/, '')
        return t2 === k || tb === bare || tb + 's' === bare || tb + 'es' === bare
      })
      if (hit?.id) {
        const info2: WordInfo = { term: hit.term, pos: hit.pos ?? '', ja: hit.ja ?? '', meaning: hit.meaning ?? '', example: hit.example ?? '' }
        setPopup({
          term: r.term,
          rect: r.rect,
          status: 'ok',
          info: info2,
          key: { source: 'course', courseId: hit.courseId, itemId: hit.id, ...info2 },
        })
        return
      }
      setPopup({ term: r.term, rect: r.rect, status: 'loading' })
      const res = await lookupWord(info.bookingId, r.term, r.sentence)
      setPopup((p) => {
        if (!p || p.term !== r.term || p.rect !== r.rect) return p // closed or replaced meanwhile
        if (!res) return { ...p, status: 'error' }
        const itemId = 'lk:' + res.term.toLowerCase().slice(0, 120)
        return { ...p, status: 'ok', info: res, key: { source: 'lookup', itemId, ...res } }
      })
    },
    [lessonVocab, info.bookingId],
  )
  useEffect(
    () =>
      lookup.handle({
        // only with the select tool, on slides (not the whiteboard), when nothing is being shared
        enabled: () => ink.tool === 'select' && !!ink.surface && ink.surface !== 'board' && !document.querySelector('.cr .app.sharing'),
        onLookup: (r) => void onLookup(r),
        onTooLong: () => toast(t('tooManyWords')),
      }),
    [lookup, ink, onLookup, toast, t],
  )
  const closePopup = useCallback(() => {
    setPopup(null)
    lookup.clearSelection()
  }, [lookup])

  /* words for the lesson-complete screen */
  const completeWords = useMemo(() => {
    const out = new Map<string, { term: string; saved: boolean }>()
    for (const key of lessonsSeen) {
      const [cid, lid] = key.split(':')
      const lesson = courses[cid]?.course.units.flatMap((u) => u.lessons).find((l) => l.id === lid)
      for (const s of lesson?.slides ?? [])
        for (const b of s.blocks)
          if (b.type === 'vocab') for (const it of b.items) if (it.id) out.set(it.id, { term: it.term, saved: saved.has(it.id) })
    }
    for (const [id, term] of savedNow) out.set(id, { term, saved: saved.has(id) })
    return [...out.values()]
  }, [lessonsSeen, courses, saved, savedNow])

  const setStudentDraw = useCallback(
    (on: boolean) => {
      setStudentDrawState(on)
      send({ type: 'perm', studentDraw: on })
      postEvent(info.bookingId, 'studentDraw', { on })
    },
    [send, info.bookingId],
  )

  const setWhiteboard = useCallback(
    (on: boolean) => {
      setWb(on)
      send({ type: 'wb', on })
      postEvent(info.bookingId, 'whiteboard', { on })
      const o = openRef.current
      const lesson = o ? courses[o.courseId]?.course.units.flatMap((u) => u.lessons).find((l) => l.id === o.lessonId) : null
      const n = lesson && o ? Math.max(0, lesson.slides.findIndex((x) => x.id === o.slideId)) + 1 : 0
      toast(on ? t('wbOn', { name: info.other.name }) : n ? t('backToSlide', { n }) : t('wbOff'))
    },
    [send, info.bookingId, info.other.name, toast, t, courses],
  )

  // the student asks the teacher for the current slide whenever they enter the room
  useEffect(() => {
    if (phase.name !== 'room' || isTeacher) return
    const id = setTimeout(() => send({ type: 'hello' }), 1500)
    return () => clearTimeout(id)
  }, [phase, isTeacher, send])

  /* teacher: change what's open, tell the student at once, save it (debounced) */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const changeOpen = useCallback(
    (next: OpenLesson | null) => {
      setOpen(next)
      markSeen(next)
      send({ type: 'open', open: next })
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => postState(info.bookingId, next), next ? 400 : 0)
    },
    [send, info.bookingId],
  )
  const onGo = useCallback(
    (slideId: string) => {
      const o = openRef.current
      if (wbRef.current) setWb(false) // the server closes it with the slide change
      if (o) changeOpen({ ...o, slideId })
    },
    [changeOpen],
  )
  const onOpenLesson = useCallback(
    (o: OpenLesson) => {
      if (wbRef.current) setWb(false)
      changeOpen(o)
      toast(`Lesson opened for you and ${info.other.name}`, 'ok')
    },
    [changeOpen, toast, info.other.name],
  )
  const onCloseCourse = useCallback(() => {
    changeOpen(null)
    toast('Course closed. Add one any time from the Library')
  }, [changeOpen, toast])
  const onLocalMedia = useCallback((m: Omit<MediaEvent, 'n'>) => send({ type: 'media', ...m }), [send])

  const onLeave = useCallback(
    ({ ended }: { ended: boolean }) => {
      if (ended && info.role === 'teacher') send({ type: 'ended' })
      writeJoin(info.bookingId, null)
      setPhase({ name: 'left', ended })
    },
    [info.role, send, info.bookingId],
  )

  /* restore the camera / mic choices after a refresh (once the devices are known) */
  const { state: lm, actions: lma } = localMedia
  const restored = useRef(!savedJoin)
  useEffect(() => {
    if (restored.current || !savedJoin || !lm.localStream) return
    restored.current = true
    if (!savedJoin.camOn) lma.toggleCameraEnabled(false)
    if (!savedJoin.micOn) lma.toggleMicrophoneEnabled(false)
    if (savedJoin.cam && savedJoin.cam !== lm.currentCameraDeviceId && lm.cameraDevices.some((d) => d.deviceId === savedJoin.cam)) lma.setCameraDevice(savedJoin.cam)
    if (savedJoin.mic && savedJoin.mic !== lm.currentMicrophoneDeviceId && lm.microphoneDevices.some((d) => d.deviceId === savedJoin.mic))
      lma.setMicrophoneDevice(savedJoin.mic)
  }, [savedJoin, lm, lma])
  /* keep the saved choices up to date while in the room */
  useEffect(() => {
    if (phase.name !== 'room' || !restored.current) return
    writeJoin(info.bookingId, {
      camOn: lm.isCameraEnabled,
      micOn: lm.isMicrophoneEnabled,
      cam: lm.currentCameraDeviceId,
      mic: lm.currentMicrophoneDeviceId,
      speaker: speakerId,
    })
  }, [phase.name, lm.isCameraEnabled, lm.isMicrophoneEnabled, lm.currentCameraDeviceId, lm.currentMicrophoneDeviceId, speakerId, info.bookingId])

  const join = () => {
    audioContext()?.resume().catch(() => {})
    setPhase({ name: 'room', key: Date.now() })
  }

  // keyboard: Escape closes the chat on small screens
  useEffect(() => {
    if (phase.name !== 'room') return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpenRef.current && window.innerWidth <= 700) setChatOpen(false)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [phase.name, setChatOpen])

  return (
    <>
      {phase.name === 'lobby' && (
        <Lobby
          info={info}
          t={t}
          localMedia={localMedia}
          speakerId={speakerId}
          setSpeakerId={setSpeakerId}
          mirror={prefs.mirror}
          joining={false}
          onJoin={join}
        />
      )}
      {phase.name === 'room' && (
        <Room
          key={phase.key}
          info={info}
          t={t}
          localMedia={localMedia}
          speakerId={speakerId}
          session={session}
          setSession={setSession}
          clockOffset={clockOffset}
          messages={messages}
          sendMessage={sendMessage}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          unread={unread}
          tileMsgs={tileMsgs}
          toast={toast}
          onLeave={onLeave}
          endSignal={endSignal}
          open={open}
          loaded={open ? (courses[open.courseId] ?? null) : null}
          teacherView={teacherView}
          setTeacherView={setTeacherView}
          onGo={onGo}
          onOpenLesson={onOpenLesson}
          onCloseCourse={onCloseCourse}
          remoteMedia={remoteMedia}
          onLocalMedia={onLocalMedia}
          ink={ink}
          bus={bus}
          whiteboard={whiteboard}
          setWhiteboard={setWhiteboard}
          onCursor={onCursor}
          prefs={prefs}
          setPrefs={setPrefs}
          setSpeakerId={setSpeakerId}
          studentDraw={studentDraw}
          setStudentDraw={setStudentDraw}
          lookup={lookup}
          vocabApi={vocabApi}
          activityApi={activityApi}
          savedIds={saved}
          onSaveWord={toggleWord}
          closeLookup={closePopup}
        />
      )}
      {phase.name === 'left' && (
        <LeftScreen
          info={info}
          t={t}
          ended={phase.ended}
          session={session}
          clockOffset={clockOffset}
          onRejoin={() => setPhase({ name: 'room', key: Date.now() })}
          words={completeWords}
        />
      )}
      {phase.name === 'room' && (
        <WordPopup
          t={t}
          popup={popup}
          saved={!!popup?.key && saved.has(popup.key.itemId)}
          canSave={!isTeacher && !!popup?.key}
          onToggleSave={() => {
            if (popup?.key) toggleWord(popup.key)
            closePopup()
          }}
          onClose={closePopup}
        />
      )}
      <Toast toast={toastState} />
    </>
  )
}
