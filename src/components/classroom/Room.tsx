'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRoomConnection, VideoView, type UseLocalMediaResult } from '@whereby.com/browser-sdk/react'
import type { ChatMsg, JoinInfo, LoadedCourse, OpenLesson, SessionInfo } from '@/lib/classroom/client'
import { postEvent } from '@/lib/classroom/client'
import { SlideCanvas } from '@/lib/slides'
import type { Lesson } from '@/lib/slides/types'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { computeLayout, type Rect } from '@/lib/classroom/layout'
import { useVolDot } from './audio'
import ChatPanel from './ChatPanel'
import { Ico } from './Icons'
import Library from './Library'
import SlideStage, { type MediaEvent, type SlideStageHandle } from './SlideStage'
import Toolbar from './Toolbar'
import type { InkEngine } from './ink'
import Settings from './Settings'
import type { Prefs } from './prefs'

/**
 * The live room: top bar with slide controls, the slide and the two video
 * tiles (or just the videos in free talk), bottom controls, chat, lesson
 * clock, End dialog, Library.
 *
 * Slides: only the teacher moves through them (buttons, thumbnails, arrow
 * keys); the student always sees the teacher's slide. Teacher view (N) shows
 * the teacher's own copy with answers and teacher-only blocks.
 *
 * Clock: starts the first time both people are in (server keeps started_at,
 * so a refresh doesn't reset it), keeps running if someone leaves, shows
 * overtime when the booked length is reached; the room stays open.
 * Recording: Whereby starts it when the 2nd person joins; the teacher's client
 * stops it at the booked end time.
 */

export type TileMsg = { id: string; from: 'teacher' | 'student'; text: string; out?: boolean }

type Props = {
  info: JoinInfo
  t: ClassroomT
  localMedia: UseLocalMediaResult
  speakerId: string
  session: SessionInfo
  setSession: (s: SessionInfo) => void
  clockOffset: number
  messages: ChatMsg[]
  sendMessage: (text: string) => Promise<boolean>
  chatOpen: boolean
  setChatOpen: (o: boolean) => void
  unread: number
  tileMsgs: { other: TileMsg | null; me: TileMsg | null }
  toast: (msg: string, kind?: 'ok' | 'bad') => void
  onLeave: (opts: { ended: boolean }) => void
  endSignal: number
  open: OpenLesson | null
  loaded: LoadedCourse | null
  teacherView: boolean
  setTeacherView: (v: boolean) => void
  onGo: (slideId: string) => void
  onOpenLesson: (o: OpenLesson) => void
  onCloseCourse: () => void
  remoteMedia: MediaEvent | null
  onLocalMedia: (e: Omit<MediaEvent, 'n'>) => void
  ink: InkEngine
  bus: EventTarget
  whiteboard: boolean
  setWhiteboard: (on: boolean) => void
  onCursor: (p: { x: number; y: number } | null) => void
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  setSpeakerId: (id: string) => void
  studentDraw: boolean
  setStudentDraw: (on: boolean) => void
}

function findLesson(loaded: LoadedCourse | null, open: OpenLesson | null): { lesson: Lesson; number: number } | null {
  if (!loaded || !open) return null
  let n = 0
  for (const u of loaded.course.units)
    for (const l of u.lessons) {
      n++
      if (l.id === open.lessonId) return { lesson: l, number: n }
    }
  return null
}

const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

const isRecorder = (p: { isAudioRecorder?: boolean; roleName?: unknown }) =>
  !!p.isAudioRecorder || ['recorder', 'streamer'].includes(String(p.roleName))

function initialOf(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

export default function Room(props: Props) {
  const { info, t, localMedia, session, setSession, clockOffset, toast } = props
  const isTeacher = info.role === 'teacher'

  /* ---------- Whereby connection ---------- */
  const opts = useMemo(
    () => ({ localMedia, displayName: info.me.name, roomKey: info.roomKey ?? undefined, externalId: info.role }),
    // joinRoom() captures these once; they never change for this room
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const { state, actions, events } = useRoomConnection(info.roomUrl, opts)
  const [connectError, setConnectError] = useState(false)
  const joinedOnce = useRef(false)

  useEffect(() => {
    if (joinedOnce.current) return
    joinedOnce.current = true
    actions.joinRoom().catch(() => setConnectError(true))
  }, [actions])

  const connected = state.connectionStatus === 'connected'
  const other = state.remoteParticipants.find((p) => !isRecorder(p)) ?? null
  const otherPresent = !!other
  const me = state.localParticipant
  const myStream = localMedia.state.localStream ?? me?.stream ?? null
  const micOn = me ? me.isAudioEnabled : localMedia.state.isMicrophoneEnabled
  const camOn = me ? me.isVideoEnabled : localMedia.state.isCameraEnabled
  const recording = state.cloudRecording?.status === 'recording'

  /* ---------- the teacher ended the lesson / we were removed ---------- */
  const { onLeave } = props
  useEffect(() => {
    if (state.connectionStatus === 'kicked') onLeave({ ended: true })
  }, [state.connectionStatus, onLeave])
  useEffect(() => {
    if (props.endSignal) {
      actions.leaveRoom()
      onLeave({ ended: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.endSignal])

  /* ---------- student joined (no-show bookkeeping) + lesson clock start ---------- */
  const sentJoined = useRef(false)
  useEffect(() => {
    if (!connected || sentJoined.current || isTeacher) return
    sentJoined.current = true
    postEvent(info.bookingId, 'student_joined')
  }, [connected, isTeacher, info.bookingId])

  const startingRef = useRef(false)
  useEffect(() => {
    if (!connected || !otherPresent || session.startedAt || startingRef.current) return
    startingRef.current = true
    postEvent(info.bookingId, 'start').then((s) => {
      startingRef.current = false
      if (s) setSession(s)
    })
  }, [connected, otherPresent, session.startedAt, info.bookingId, setSession])

  /* ---------- join / leave toasts (only for the other person) ---------- */
  const settled = useRef(false)
  const prevOther = useRef<string | null>(null)
  useEffect(() => {
    if (!connected) return
    const id = setTimeout(() => (settled.current = true), 2500)
    return () => clearTimeout(id)
  }, [connected])
  useEffect(() => {
    const now = other?.id ?? null
    if (settled.current && now !== prevOther.current) {
      if (now && !prevOther.current) toast(t('joinedToast', { name: info.other.name }), 'ok')
      else if (!now && prevOther.current) toast(t('leftToast', { name: info.other.name }))
    }
    prevOther.current = now
  }, [other?.id, toast, t, info.other.name])

  /* ---------- connection trouble ---------- */
  const [netTrouble, setNetTrouble] = useState(false)
  useEffect(() => {
    if (!events) return
    const bad = () => setNetTrouble(true)
    const ok = () => {
      setNetTrouble((was) => {
        if (was) toast(t('reconnected'), 'ok')
        return false
      })
    }
    events.on('signalTrouble', bad)
    events.on('signalOk', ok)
    return () => {
      events.off('signalTrouble', bad)
      events.off('signalOk', ok)
    }
  }, [events, toast, t])
  const reconnecting = netTrouble || state.connectionStatus === 'reconnecting'

  /* ---------- clock ---------- */
  const [now, setNow] = useState(() => Date.now() + clockOffset)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 1000)
    return () => clearInterval(id)
  }, [clockOffset])
  const L = info.durationMinutes * 60
  const startedMs = session.startedAt ? new Date(session.startedAt).getTime() : null
  const elapsed = startedMs ? (now - startedMs) / 1000 : 0
  const over = !!startedMs && elapsed >= L
  const bookedEnd = new Date(info.window.end).getTime()

  /* ---------- recording: teacher stops it at the booked end ---------- */
  const reportedStop = useRef(!!session.recordingStoppedAt)
  const lastStopTry = useRef(0)
  useEffect(() => {
    if (!isTeacher || !recording || now < bookedEnd) return
    if (Date.now() - lastStopTry.current < 10_000) return // retry at most every 10 s
    lastStopTry.current = Date.now()
    actions.stopCloudRecording()
    if (!reportedStop.current) {
      reportedStop.current = true
      postEvent(info.bookingId, 'recording_stopped')
    }
  }, [isTeacher, recording, now, bookedEnd, actions, info.bookingId])

  /* ---------- layout ---------- */
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<HTMLDivElement | null>(null)
  const otherRef = useRef<HTMLDivElement | null>(null)
  const meRef = useRef<HTMLDivElement | null>(null)
  const slideBoxRef = useRef<HTMLDivElement | null>(null)
  const stageApi = useRef<SlideStageHandle | null>(null)
  /* screen share: mine, or the other person's (Whereby sends it) */
  const shares = state.screenshares ?? []
  const myShare = shares.find((x) => x.isLocal && x.stream) ?? null
  const theirShare = shares.find((x) => !x.isLocal && x.stream) ?? null
  const activeShare = myShare ?? theirShare
  const sharing = !!activeShare
  const [shareRatio, setShareRatio] = useState(9 / 16)
  const showSlide = !!props.open || props.whiteboard || sharing
  const rects = useRef(new Map<HTMLElement, Rect>())
  const place = useCallback((el: HTMLElement | null, r: Rect | null, animate: boolean) => {
    if (!el || !r) return
    const o = rects.current.get(el)
    rects.current.set(el, r)
    if (o && o.x === r.x && o.y === r.y && o.w === r.w && o.h === r.h) return
    Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' })
    if (!animate || !o) return
    // FLIP: jump to the new box, then animate a GPU-only transform from the old one
    el.classList.remove('flip')
    el.style.transform = `translate(${o.x - r.x}px,${o.y - r.y}px) scale(${o.w / r.w},${o.h / r.h})`
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.classList.add('flip')
        el.style.transform = ''
        el.addEventListener('transitionend', () => el.classList.remove('flip'), { once: true })
      }),
    )
  }, [])
  const doLayout = useCallback(
    (animate: boolean) => {
      const box = layoutRef.current
      if (!box) return
      const res = computeLayout(box.clientWidth, box.clientHeight, {
        showSlide,
        chatOpen: props.chatOpen,
        ratio: sharing ? shareRatio : 3 / 4,
      })
      if (!res) return
      place(slideBoxRef.current, res.slide, animate)
      place(otherRef.current, res.other, animate)
      place(meRef.current, res.me, animate)
      if (appRef.current) {
        appRef.current.dataset.mode = res.mode
        appRef.current.style.setProperty('--lift', res.lift.toFixed(1) + 'px')
      }
    },
    [place, props.chatOpen, showSlide, sharing, shareRatio],
  )
  useLayoutEffect(() => {
    const box = layoutRef.current
    if (!box) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => doLayout(false))
    })
    ro.observe(box)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [doLayout])
  const firstLayout = useRef(true)
  useLayoutEffect(() => {
    doLayout(!firstLayout.current)
    firstLayout.current = false
  }, [props.chatOpen, showSlide, sharing, shareRatio, doLayout])

  /* ---------- slides ---------- */
  const found = findLesson(props.loaded, props.open)
  const lessonSlides = found?.lesson.slides
  const slides = useMemo(() => lessonSlides ?? [], [lessonSlides])
  const idxRaw = slides.findIndex((x) => x.id === props.open?.slideId)
  const idx = idxRaw >= 0 ? idxRaw : 0
  const slide = slides[idx] ?? null
  const mode = isTeacher && props.teacherView ? 'teacher' : 'student'
  const { onGo } = props
  const go = useCallback(
    (i: number) => {
      if (!isTeacher || i < 0 || i >= slides.length) return
      stageApi.current?.resetZoom()
      onGo(slides[i].id)
    },
    [isTeacher, slides, onGo],
  )
  const [stripOpen, setStripOpen] = useState(false)
  const [stripBuilt, setStripBuilt] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  useEffect(() => {
    if (!stripOpen) return
    const close = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.navwrap')) setStripOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [stripOpen])
  // keyboard: ← → move slides, N toggles teacher view (teacher only)
  const { setTeacherView, teacherView } = props
  useEffect(() => {
    if (!isTeacher) return
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]')) return
      if (document.querySelector('.cr .scrim.open')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') go(idx + 1)
      else if (e.key === 'ArrowLeft') go(idx - 1)
      else if (e.key.toLowerCase() === 'n' && props.open) setTeacherView(!teacherView)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [isTeacher, go, idx, setTeacherView, teacherView, props.open, props.whiteboard])

  /* ---------- drawing + whiteboard ---------- */
  const [tbOpen, setTbOpen] = useState(false)
  const surface = props.whiteboard ? 'board' : (slide?.id ?? '')
  const { setWhiteboard, whiteboard, ink } = props
  const toggleWhiteboard = useCallback(() => {
    const on = !whiteboard
    setWhiteboard(on)
    if (on) {
      // opening the board: get the pen out
      setTbOpen(true)
      if (ink.tool === 'select') ink.setTool('pen')
    } else if (!props.open) setTbOpen(false)
  }, [whiteboard, setWhiteboard, ink, props.open])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable="true"]')) return
      if (document.querySelector('.cr .scrim.open') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'w') toggleWhiteboard()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [toggleWhiteboard])

  /* ---------- speaker choice for the other person's audio ---------- */
  const otherVideo = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = otherVideo.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null
    if (el?.setSinkId && props.speakerId) el.setSinkId(props.speakerId === 'default' ? '' : props.speakerId).catch(() => {})
  }, [props.speakerId, other?.stream])

  /* ---------- audio dots ---------- */
  const otherMuted = !other || !other.isAudioEnabled
  const volOther = useVolDot(other?.stream, otherMuted)
  const volMe = useVolDot(myStream, !micOn)

  /* ---------- screen sharing ---------- */
  const canShare = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
  const toggleShare = () => {
    if (myShare) return actions.stopScreenshare()
    if (!canShare) return toast(t('shareUnsupported'), 'bad')
    actions.startScreenshare()
  }
  const prevShareStatus = useRef(state.localScreenshareStatus)
  useEffect(() => {
    const was = prevShareStatus.current
    const now = state.localScreenshareStatus
    prevShareStatus.current = now
    if (now === 'active' && was !== 'active') {
      toast(t('canSeeScreen', { name: info.other.name }), 'ok')
      setTbOpen(false)
      stageApi.current?.resetZoom()
    } else if (was === 'active' && now !== 'active') {
      const n = slides.length ? idx + 1 : 0
      toast(props.whiteboard ? t('backToBoard') : props.open && n ? t('backToSlide', { n }) : t('shareStopped'))
    } else if (now === 'error' && was === 'starting') {
      toast(t('shareFailed'), 'bad')
    }
  }, [state.localScreenshareStatus, toast, t, info.other.name, props.whiteboard, props.open, slides.length, idx])

  /* ---------- the other person's tile: menu, pop-out ---------- */
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)
  const menuBtn = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!menuAt) return
    const close = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.tmenu,.tmenuBtn')) setMenuAt(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAt(null)
    document.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
    }
  }, [menuAt])
  const openMenu = () => {
    const r = menuBtn.current?.getBoundingClientRect()
    if (!r) return
    setMenuAt(menuAt ? null : { x: Math.min(window.innerWidth - 248, r.left), y: r.bottom + 6 })
  }
  const canPip = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled
  const [popped, setPopped] = useState(false)
  useEffect(() => {
    const el = otherVideo.current
    if (!el) return
    const on = () => setPopped(true)
    const off = () => setPopped(false)
    el.addEventListener('enterpictureinpicture', on)
    el.addEventListener('leavepictureinpicture', off)
    return () => {
      el.removeEventListener('enterpictureinpicture', on)
      el.removeEventListener('leavepictureinpicture', off)
    }
  }, [other?.stream])
  const popOut = async () => {
    setMenuAt(null)
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await otherVideo.current?.requestPictureInPicture()
    } catch {
      /* the browser refused (e.g. no video yet) */
    }
  }
  useEffect(
    () => () => {
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {})
    },
    [],
  )

  /* ---------- requests from the teacher (student side) ---------- */
  const [ask, setAsk] = useState<'unmute' | 'share' | null>(null)
  useEffect(() => {
    if (!events) return
    const audio = (e: { type: string }) => {
      if (e.type === 'requestAudioDisable') toast(t('mutedYou', { name: info.other.name }))
      else setAsk('unmute')
    }
    const screen = (e: { type: string }) => {
      if (e.type === 'requestScreenshareEnable') setAsk('share')
    }
    events.on('requestAudioEnable', audio)
    events.on('requestAudioDisable', audio)
    events.on('requestScreenshareEnable', screen)
    return () => {
      events.off('requestAudioEnable', audio)
      events.off('requestAudioDisable', audio)
      events.off('requestScreenshareEnable', screen)
    }
  }, [events, toast, t, info.other.name])

  /* ---------- settings ---------- */
  const [setOpen, setSetOpen] = useState(false)
  const { prefs } = props
  const applyBackground = useCallback(
    async (id: string) => {
      try {
        if (id) await actions.switchCameraEffect(id)
        else await actions.clearCameraEffect()
        return true
      } catch {
        toast(t('bgFailed'), 'bad')
        return false
      }
    },
    [actions, toast, t],
  )
  const applyDenoise = useCallback(
    async (on: boolean) => {
      try {
        if (on) await actions.enableAudioDenoiser()
        else await actions.disableAudioDenoiser()
        return true
      } catch {
        return false
      }
    },
    [actions],
  )
  // re-apply this device's choices once connected (background, noise reduction, HD, low data)
  const appliedPrefs = useRef(false)
  useEffect(() => {
    if (!connected || appliedPrefs.current) return
    appliedPrefs.current = true
    if (prefs.background) void applyBackground(prefs.background)
    if (prefs.denoise) void applyDenoise(true)
    if (!prefs.hd) actions.toggleHdMode(false)
    if (prefs.lowData) actions.toggleLowDataMode(true)
  }, [connected, prefs, applyBackground, applyDenoise, actions])

  /* ---------- student drawing permission ---------- */
  const canDraw = isTeacher || props.studentDraw
  useEffect(() => {
    if (canDraw) return
    setTbOpen(false)
    if (ink.tool !== 'select') ink.setTool('select')
  }, [canDraw, ink])

  /* ---------- End dialog ---------- */
  const [endOpen, setEndOpen] = useState(false)
  const endAll = async () => {
    setEndOpen(false)
    if (isTeacher) {
      await postEvent(info.bookingId, 'end')
      actions.endMeeting()
      props.onLeave({ ended: true })
    } else {
      actions.leaveRoom()
      props.onLeave({ ended: false })
    }
  }
  const leaveForNow = () => {
    setEndOpen(false)
    actions.leaveRoom()
    props.onLeave({ ended: false })
  }
  useEffect(() => {
    if (!endOpen) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setEndOpen(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [endOpen])

  /* ---------- render ---------- */
  const clockClass = !startedMs ? ' wait' : over ? ' over' : L - elapsed <= 300 ? ' warn' : ''
  const otherTileClass = `slot tile${popped ? ' is-popped' : ''}${otherPresent ? '' : ' away'}${other && other.stream && other.isVideoEnabled ? ' has-video' : ''}${other && !other.isVideoEnabled ? ' camoff' : ''}`
  const meTileClass = `slot tile${prefs.mirror ? ' mirror' : ''}${myStream ? ' has-video' : ''}${camOn ? '' : ' camoff'}`
  const otherStatus = startedMs
    ? t('otherLeftClockRuns', { name: info.other.name })
    : t('waitingToJoin', { name: info.other.name })
  const startedLabel = startedMs
    ? t('lessonStartedAt', {
        time: new Date(startedMs).toLocaleTimeString(info.uiLang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' }),
      })
    : null

  if (connectError) {
    return (
      <div className="leftScreen on">
        <div className="card">
          <div className="eico">
            <Ico name="leave" />
          </div>
          <h2>{t('errorTitle')}</h2>
          <p>{t('connectFailed')}</p>
          <div className="ebtns">
            <button className="ebtn cta" onClick={() => window.location.reload()}>
              {t('tryAgain')}
            </button>
            <a className="ebtn ghost" href="/dashboard">
              {t('backDashboard')}
            </a>
          </div>
        </div>
      </div>
    )
  }

  const left = Math.ceil((L - elapsed) / 60)
  const late = elapsed - L

  return (
    <>
      <div
        ref={appRef}
        className={`app${props.open ? '' : ' no-course'}${props.whiteboard ? ' wb' : ''}${sharing ? ' sharing' : ''}${prefs.cursors ? '' : ' no-cursors'}${canDraw ? '' : ' no-draw'}${tbOpen ? ' tb-open' : ''}${isTeacher ? '' : ' student'}${props.chatOpen ? ' chat-open' : ''}${recording ? ' recording' : ''}`}
      >
        <header className="top">
          <div className="logo">
            eigo<b>.</b>io
          </div>
          <div className="ttl">
            {props.open && props.loaded && <span className="course">{props.loaded.course.title}</span>}
            <span id="crumb">
              {!props.open ? t('freeTalk') : found ? `Lesson ${found.number}: ${found.lesson.title}` : info.lesson ? `Lesson ${info.lesson.number}: ${info.lesson.lessonTitle}` : '…'}
            </span>
          </div>
          <div className="spacer" />
          <div className="navwrap">
            <div className="snav">
              <button title="Previous (←)" disabled={!isTeacher || idx === 0} onClick={() => go(idx - 1)} aria-label="Previous slide">
                <Ico name="left" />
              </button>
              <span className="n">{slides.length ? `${idx + 1} / ${slides.length}` : '–'}</span>
              <button title="Next (→)" disabled={!isTeacher || idx >= slides.length - 1} onClick={() => go(idx + 1)} aria-label="Next slide">
                <Ico name="right" />
              </button>
              <button
                className={`teachOnly${stripOpen ? ' on' : ''}`}
                id="gridBtn"
                title="All slides"
                onClick={(e) => {
                  e.stopPropagation()
                  setStripBuilt(true)
                  setStripOpen(!stripOpen)
                }}
              >
                <Ico name="grid" />
              </button>
              <button className="teachOnly" id="closeCourse" title="Close the course (free talk)" onClick={props.onCloseCourse}>
                <Ico name="x" />
              </button>
            </div>
            <div className={`strip${stripOpen ? ' open' : ''}`}>
              {stripBuilt &&
                props.loaded &&
                slides.map((sl, i) => (
                  <button
                    key={sl.id}
                    className={`thumb${i === idx ? ' cur' : ''}`}
                    onClick={() => {
                      go(i)
                      setStripOpen(false)
                    }}
                  >
                    <div className="mini">
                      <SlideCanvas slide={sl} mode="editor" assetBase={props.loaded!.assetBase} />
                    </div>
                    <span>{i + 1}</span>
                  </button>
                ))}
            </div>
          </div>
          <button
            className={`sq tog teachOnly${props.teacherView ? ' on' : ''}`}
            id="notesBtn"
            title="Teacher view: show answers and teacher-only blocks (N)"
            aria-pressed={props.teacherView}
            onClick={() => props.setTeacherView(!props.teacherView)}
          >
            <Ico name="notes" />
          </button>
          <button
            className={`sq tog${props.whiteboard ? ' on' : ''}`}
            id="wbBtn"
            title={t('whiteboardTitle')}
            aria-pressed={props.whiteboard}
            onClick={toggleWhiteboard}
          >
            <Ico name="board" />
          </button>
          <button className="sq" title={t('settings')} aria-label={t('settings')} onClick={() => setSetOpen(true)}>
            <Ico name="gear" />
          </button>
          <div className={`info${clockClass}`}>
            <span className="rec" title={t('recTitle')}>
              <i />
              REC
            </span>
            <span>
              {!startedMs ? (
                t('waitingFor', { name: info.other.name })
              ) : !over ? (
                <>
                  {mmss(elapsed)}
                  <span className="tot">/ {mmss(L)}</span>
                </>
              ) : (
                <>
                  {t('timesUp')}
                  <span className="tot">+{mmss(late)}</span>
                </>
              )}
            </span>
          </div>
          <button className="sq leaveSq" title={t('endTitle')} onClick={() => setEndOpen(true)}>
            <Ico name="leave" />
            <span>{t('end')}</span>
          </button>
        </header>

        <div className="body">
          <section className="stageArea">
            <div className="layout" ref={layoutRef}>
              <SlideStage
                ref={stageApi}
                setBox={(el) => {
                  slideBoxRef.current = el
                }}
                className="slot slideBox tool-select"
                slide={slide}
                mode={mode}
                assetBase={props.loaded?.assetBase ?? ''}
                characters={props.loaded?.course.characters}
                remoteMedia={props.remoteMedia}
                onLocalMedia={props.onLocalMedia}
                zoomLabel={t('backToWholeSlide')}
                ink={props.ink}
                surface={surface}
                bus={props.bus}
                otherName={info.other.name.split(/\s+/)[0]}
                boardLabel={t('whiteboard')}
                onCursor={props.onCursor}
                share={
                  activeShare?.stream
                    ? {
                        stream: activeShare.stream,
                        local: !!myShare,
                        audio: !myShare && activeShare.hasAudioTrack,
                        label: myShare ? t('youAreSharing') : t('otherSharing', { name: info.other.name }),
                        stopLabel: myShare ? t('stopSharing') : isTeacher ? t('stopTheirShare') : null,
                      }
                    : null
                }
                onStopShare={() => (myShare ? actions.stopScreenshare() : other && actions.stopParticipantScreenshare(other.id))}
                onShareRatio={setShareRatio}
              />
              <div className={otherTileClass} ref={otherRef}>
                <div className="face">
                  {other?.stream && (
                    <VideoView
                      stream={other.stream}
                      playsInline
                      ref={(el) => {
                        otherVideo.current = el
                      }}
                    />
                  )}
                  <div className="avatar" style={{ background: isTeacher ? '#fae1d8' : '#dff5f2' }}>
                    {initialOf(info.other.name)}
                  </div>
                </div>
                <span className={`vol${otherMuted && otherPresent ? ' muted' : ''}`} ref={volOther}>
                  <i />
                  <span className="mut" title={t('muted')}>
                    <Ico name="micoff" />
                  </span>
                </span>
                <span className="status">{otherStatus}</span>
                {otherPresent && (isTeacher || canPip) && (
                  <button
                    className="tmenuBtn"
                    ref={menuBtn}
                    title={t('tileOptions')}
                    aria-haspopup="menu"
                    aria-expanded={!!menuAt}
                    onClick={(e) => {
                      e.stopPropagation()
                      openMenu()
                    }}
                  >
                    <Ico name="more" />
                  </button>
                )}
                <div className="popped">
                  <span>{t('poppedOut', { name: info.other.name })}</span>
                  <button onClick={popOut}>{t('bringBack')}</button>
                </div>
                <span className="name">{info.other.name}</span>
                {props.tileMsgs.other && (
                  <div className={`tmsg ${props.tileMsgs.other.from}${props.tileMsgs.other.out ? ' out' : ''}`}>
                    {props.tileMsgs.other.text}
                  </div>
                )}
              </div>
              <div className={meTileClass} ref={meRef}>
                <div className="face">
                  {myStream && <VideoView stream={myStream} muted playsInline />}
                  <div className="avatar" style={{ background: isTeacher ? '#dff5f2' : '#fae1d8' }}>
                    {initialOf(info.me.name)}
                  </div>
                </div>
                <span className={`vol${micOn ? '' : ' muted'}`} ref={volMe}>
                  <i />
                  <span className="mut" title={t('muted')}>
                    <Ico name="micoff" />
                  </span>
                </span>
                <span className="name">
                  {info.me.name} {t('you')}
                </span>
                {props.tileMsgs.me && (
                  <div className={`tmsg ${props.tileMsgs.me.from}${props.tileMsgs.me.out ? ' out' : ''}`}>
                    {props.tileMsgs.me.text}
                  </div>
                )}
              </div>
            </div>

            {canDraw && <Toolbar t={t} ink={props.ink} open={tbOpen} setOpen={setTbOpen} toast={toast} enabled={!!surface && !sharing} />}

            <div className={`netBanner${reconnecting ? ' on' : ''}`}>
              <span className="spin" />
              {t('reconnecting')}
            </div>

            <nav className="controls">
              <button
                className={`cbtn ${camOn ? 'on' : 'off'}`}
                aria-pressed={camOn}
                onClick={() => actions.toggleCamera(!camOn)}
              >
                <span className="cface">
                  <Ico name={camOn ? 'cam' : 'camoff'} />
                </span>
                <span className="lbl">{t('cam')}</span>
              </button>
              <button
                className={`cbtn ${micOn ? 'on' : 'off'}`}
                aria-pressed={micOn}
                onClick={() => actions.toggleMicrophone(!micOn)}
              >
                <span className="cface">
                  <Ico name={micOn ? 'mic' : 'micoff'} />
                </span>
                <span className="lbl">{t('mic')}</span>
              </button>
              {canShare && (
                <button className={`cbtn${myShare ? ' on' : ''}`} aria-pressed={!!myShare} onClick={toggleShare}>
                  <span className="cface">
                    <Ico name="share" />
                  </span>
                  <span className="lbl">{t('share')}</span>
                </button>
              )}
              <button
                className={`cbtn${props.chatOpen ? ' on' : ''}`}
                aria-pressed={props.chatOpen}
                onClick={() => props.setChatOpen(!props.chatOpen)}
              >
                <span className="cface">
                  <Ico name="chat" />
                </span>
                <span className={`badge${props.unread > 0 ? ' show' : ''}`}>{props.unread || ''}</span>
                <span className="lbl">{t('chat')}</span>
              </button>
              {isTeacher && (
                <button className="cbtn teachOnly" onClick={() => setLibOpen(true)}>
                  <span className="cface">
                    <Ico name="book" />
                  </span>
                  <span className="lbl">Library</span>
                </button>
              )}
            </nav>
          </section>

          <aside className="chat">
            <ChatPanel
              t={t}
              role={info.role}
              otherName={info.other.name}
              messages={props.messages}
              startedLabel={startedLabel}
              onSend={props.sendMessage}
              onClose={() => props.setChatOpen(false)}
            />
          </aside>
        </div>
      </div>

      <div className={`tmenu${menuAt ? ' open' : ''}`} role="menu" style={menuAt ? { left: menuAt.x, top: menuAt.y } : undefined}>
        {isTeacher && other && (
          <>
            <button
              role="menuitem"
              onClick={() => {
                setMenuAt(null)
                if (other.isAudioEnabled) {
                  actions.muteParticipants([other.id])
                  toast(t('youMuted', { name: info.other.name }))
                } else {
                  actions.askToSpeak(other.id)
                  toast(t('askedUnmute', { name: info.other.name }))
                }
              }}
            >
              <Ico name={other.isAudioEnabled ? 'micoff' : 'mic'} />
              <span>{other.isAudioEnabled ? t('muteName', { name: info.other.name }) : t('askUnmuteName', { name: info.other.name })}</span>
            </button>
            <button
              role="menuitem"
              disabled={!!theirShare}
              onClick={() => {
                setMenuAt(null)
                actions.askToTurnOnScreenshare(other.id)
                toast(t('askedShare', { name: info.other.name }))
              }}
            >
              <Ico name="share" />
              <span>{t('askShareName', { name: info.other.name })}</span>
            </button>
            <button
              role="menuitem"
              disabled={!theirShare}
              onClick={() => {
                setMenuAt(null)
                actions.stopParticipantScreenshare(other.id)
              }}
            >
              <Ico name="x" />
              <span>{t('stopShareName', { name: info.other.name })}</span>
            </button>
          </>
        )}
        {canPip && (
          <button role="menuitem" onClick={popOut}>
            <Ico name="popout" />
            <span>{t('popOut')}</span>
          </button>
        )}
      </div>

      {ask && (
        <div className="askCard" role="alertdialog">
          <p>{ask === 'unmute' ? t('askUnmutePrompt', { name: info.other.name }) : t('askSharePrompt', { name: info.other.name })}</p>
          <div>
            <button className="ebtn ghost" onClick={() => setAsk(null)}>
              {t('notNow')}
            </button>
            <button
              className="ebtn cta"
              onClick={() => {
                if (ask === 'unmute') actions.toggleMicrophone(true)
                else toggleShare()
                setAsk(null)
              }}
            >
              {ask === 'unmute' ? t('unmute') : t('share')}
            </button>
          </div>
        </div>
      )}

      <Settings
        t={t}
        open={setOpen}
        onClose={() => setSetOpen(false)}
        isTeacher={isTeacher}
        otherName={info.other.name}
        localMedia={localMedia}
        speakerId={props.speakerId}
        setSpeakerId={props.setSpeakerId}
        prefs={prefs}
        setPrefs={props.setPrefs}
        studentDraw={props.studentDraw}
        setStudentDraw={props.setStudentDraw}
        applyBackground={applyBackground}
        applyDenoise={applyDenoise}
        applyHd={(on) => actions.toggleHdMode(on)}
        applyLowData={(on) => actions.toggleLowDataMode(on)}
      />

      {isTeacher && (
        <Library
          bookingId={info.bookingId}
          open={libOpen}
          current={props.open}
          onClose={() => setLibOpen(false)}
          onOpenLesson={props.onOpenLesson}
        />
      )}

      {/* End dialog: one wording before time is up, one after; same options */}
      <div
        className={`scrim${endOpen ? ' open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setEndOpen(false)}
      >
        <div className={`modal emodal${over ? ' over' : ''}`} role="dialog" aria-modal="true" aria-labelledby="endTitle">
          <div className="eico">
            <Ico name={over ? 'check' : 'leave'} />
          </div>
          <h2 id="endTitle">{!startedMs ? t('leaveRoomQ') : !over ? t('endEarlyQ') : t('lessonComplete')}</h2>
          <p>
            {!startedMs
              ? t('notStartedBody', { name: info.other.name })
              : !over
                ? `${left === 1 ? t('minutesLeftOne', { len: info.durationMinutes }) : t('minutesLeftMany', { n: left, len: info.durationMinutes })} ${
                    isTeacher ? t('teacherEndHint', { name: info.other.name }) : t('studentRejoinHint')
                  }`
                : t('wrapUp')}
          </p>
          {startedMs && !over && (
            <>
              <div className="meter">
                <i style={{ width: Math.min(100, (elapsed / L) * 100) + '%' }} />
              </div>
              <div className="mlab">
                <span>{mmss(elapsed)}</span>
                <span>{mmss(L)}</span>
              </div>
            </>
          )}
          <div className="ebtns">
            {/* Before the lesson has started nobody can "end" it: the teacher can only leave. */}
            <button className="ebtn danger" onClick={startedMs ? endAll : leaveForNow}>
              {!startedMs
                ? isTeacher
                  ? t('leaveForNow')
                  : t('leaveLesson')
                : over
                  ? t('endLesson')
                  : isTeacher
                    ? t('endForEveryone')
                    : t('leaveLesson')}
            </button>
            {isTeacher && startedMs && !over && (
              <button className="ebtn sec" onClick={leaveForNow}>
                {t('leaveForNow')}
              </button>
            )}
            <button className="ebtn ghost" onClick={() => setEndOpen(false)}>
              {t('stay')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
