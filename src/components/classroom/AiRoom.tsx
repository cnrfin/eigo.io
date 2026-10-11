'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { aiOpenLesson, postEvent, saveAiTranscript, sendAiAction, startAiSession, type SlideRef, type StudentAction } from '@/lib/classroom/client'
import type { Lesson } from '@/lib/slides/types'
import { useVolDot } from './audio'
import ChatPanel from './ChatPanel'
import { Ico } from './Icons'
import SlideStage from './SlideStage'
import Toolbar from './Toolbar'
import { computeLayout, type Rect } from '@/lib/classroom/layout'
import type { RoomProps } from './Room'

/**
 * The classroom for an AI tutor lesson (bookings.lesson_kind = 'ai').
 *
 * Same slides, chat, word lookup and activities as a lesson with Connor, but
 * the "teacher" is an OpenAI GPT-Live voice session:
 *  - our server creates the session from this browser's WebRTC offer
 *    (/api/classroom/[id]/ai-session), so the tutor's instructions never pass
 *    through the browser;
 *  - the tutor moves slides and writes in the chat through tool calls, which
 *    this component carries out with the classroom's existing functions;
 *  - every slide change is sent back as quiet context ("on screen now");
 *  - both sides' transcript is collected and saved for the lesson summary;
 *  - the server hangs the session up at the booked end (cron), and this page
 *    also wraps up at that time. No Whereby, no recording.
 */

type Props = RoomProps & { sendTutorMessage: (text: string) => Promise<boolean> }
type Line = { from: 'student' | 'tutor'; text: string; t: number }
type Status = 'connecting' | 'live' | 'dropped' | 'failed' | 'too_early' | 'ended'

function findLesson(p: Props): Lesson | null {
  if (!p.loaded || !p.open) return null
  for (const u of p.loaded.course.units) for (const l of u.lessons) if (l.id === p.open.lessonId) return l
  return null
}

const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

export default function AiRoom(props: Props) {
  const { info, t, setSession, clockOffset, onLeave } = props
  const [status, setStatus] = useState<Status>('connecting')
  const [speaking, setSpeaking] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  /** the AI tutor has started talking: until then the student sees 'Calling your AI tutor…' */
  const [tutorReady, setTutorReady] = useState(false)

  const pc = useRef<RTCPeerConnection | null>(null)
  const dc = useRef<RTCDataChannel | null>(null)
  const mic = useRef<MediaStream | null>(null)
  const audioEl = useRef<HTMLAudioElement | null>(null)
  const sessionId = useRef<string | null>(null)
  const endsAt = useRef<number>(new Date(info.window.end).getTime())
  const lines = useRef<Line[]>([])
  const lastEnd = useRef<{ student: number; tutor: number }>({ student: -1e9, tutor: -1e9 })
  const closing = useRef(false)
  const sessionsStarted = useRef(0)
  /** connection generation: events from a replaced connection are ignored */
  const gen = useRef(0)
  /** the slide whose content the AI tutor was last given */
  const lastSent = useRef<string | null>(null)
  const lastSpeech = useRef(Date.now())
  const nudged = useRef(false)

  /* ---------- slides ---------- */
  const lesson = findLesson(props)
  const slides = useMemo(() => lesson?.slides ?? [], [lesson])
  const idxRaw = slides.findIndex((x) => x.id === props.open?.slideId)
  const idx = idxRaw >= 0 ? idxRaw : 0
  const slide = slides[idx] ?? null
  const live = useRef({ slides, idx })
  useEffect(() => {
    live.current = { slides, idx }
  }, [slides, idx])
  const openNow = useRef(props.open)
  useEffect(() => {
    openNow.current = props.open
  }, [props.open])
  /** what's on screen, for the server to send the AI tutor (null in free talk) */
  const slideRef = useCallback((): SlideRef | null => {
    const o = openNow.current
    if (!o) return null
    const { slides: S, idx: i } = live.current
    const slideId = o.slideId ?? S[i]?.id
    return slideId ? { courseId: o.courseId, lessonId: o.lessonId, slideId } : null
  }, [])

  const sendEvent = useCallback((ev: Record<string, unknown>) => {
    const ch = dc.current
    if (ch && ch.readyState === 'open') ch.send(JSON.stringify(ev))
  }, [])
  const context = useCallback(
    (content: string) => sendEvent({ type: 'session.thinking.append', delegation_id: null, content: content.slice(0, 1500) }),
    [sendEvent],
  )
  /** A student action the AI tutor should react to: our server sends it as an instruction. */
  const act = useCallback(
    async (a: StudentAction) => {
      const sid = sessionId.current
      if (!sid || closing.current) return
      const ok = await sendAiAction(info.bookingId, sid, a)
      // fallback: at least let the AI tutor know quietly
      if (!ok && a.kind === 'chat') context(`The student wrote in the chat: "${a.text.slice(0, 400)}"`)
    },
    [info.bookingId, context],
  )

  /* ---------- transcript ---------- */
  const addText = useCallback((from: Line['from'], delta: string, startMs: number, endMs: number) => {
    if (!delta) return
    lastSpeech.current = Date.now()
    nudged.current = false
    const L = lines.current
    const last = L[L.length - 1]
    if (last && last.from === from && startMs - lastEnd.current[from] < 2500) last.text += delta
    else L.push({ from, text: delta.replace(/^\s+/, ''), t: startMs })
    lastEnd.current[from] = endMs
  }, [])
  const flush = useCallback(
    (final: boolean) => {
      return sessionId.current ? saveAiTranscript(info.bookingId, sessionId.current, lines.current, final) : Promise.resolve()
    },
    [info.bookingId],
  )

  /* ---------- tool calls from the tutor ---------- */
  const { onGo, sendTutorMessage, onOpenLesson } = props
  /** the furthest slide taught, and whether the student is looking back at an earlier one */
  const furthest = useRef(0)
  const review = useRef(false)
  const renewRef = useRef<() => void>(() => {})
  const [renewing, setRenewing] = useState(false)
  const runTool = useCallback(
    async (name: string, argsJson: string): Promise<string> => {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(argsJson || '{}')
      } catch {
        /* empty */
      }
      const { slides: S, idx: i } = live.current
      const goTo = (n: number) => {
        if (!S.length) return 'There are no slides in this lesson (free talk).'
        const k = Math.min(S.length, Math.max(1, Math.round(n))) - 1
        onGo(S[k].id)
        return `Showing slide ${k + 1} of ${S.length}.`
      }
      switch (name) {
        case 'go_to_slide':
          return goTo(Number(args.slide) || 1)
        case 'next_slide':
          // while looking back, "next" means back to where the lesson was
          if (review.current) {
            review.current = false
            return goTo(furthest.current + 1)
          }
          return i + 1 >= S.length ? 'Already on the last slide.' : goTo(i + 2)
        case 'go_back_to_slide': {
          const n = Math.round(Number(args.slide) || 0)
          if (n < 1 || n - 1 > furthest.current) return `You can only go back to slides already covered (1 to ${furthest.current + 1}).`
          if (n - 1 === i) return `Slide ${n} is already on screen.`
          if (!review.current) furthest.current = Math.max(furthest.current, i)
          review.current = true
          return goTo(n) + ` When the student is ready, call return_to_lesson to go back to slide ${furthest.current + 1}.`
        }
        case 'return_to_lesson':
          if (!review.current) return 'You are already on the lesson slide.'
          review.current = false
          return goTo(furthest.current + 1)
        case 'open_lesson': {
          const res = await aiOpenLesson(info.bookingId, String(args.course_id ?? ''), String(args.lesson_id ?? ''))
          if ('error' in res) return res.error
          onOpenLesson(res.open)
          // let the AI tutor finish its sentence, then renew the session so it gets the lesson plan
          setTimeout(() => renewRef.current(), 2500)
          return `Opened ${res.title}. The call reconnects in a moment with this lesson's plan.`
        }
        case 'write_in_chat': {
          const text = String(args.text ?? '').slice(0, 200).trim()
          if (!text) return 'Nothing to write.'
          return (await sendTutorMessage(text)) ? 'Written in the chat.' : 'Could not write in the chat.'
        }
        default:
          return `Unknown tool ${name}.`
      }
    },
    [onGo, sendTutorMessage, onOpenLesson, info.bookingId],
  )

  /* ---------- connect ---------- */
  const handleEvent = useCallback(
    async (ev: { type: string; [k: string]: unknown }) => {
      switch (ev.type) {
        case 'session.started': {
          setStatus('live')
          setRenewing(false)
          lastSpeech.current = Date.now()
          nudged.current = false
          // GPT-Live waits for the caller unless told to greet: ask it to open the lesson now,
          // together with the slide on screen (its content reaches the AI tutor only this way)
          {
            const ref = slideRef()
            lastSent.current = ref?.slideId ?? null
            void act({ kind: sessionsStarted.current++ ? 'resume' : 'start', slide: ref })
          }
          postEvent(info.bookingId, 'student_joined')
          postEvent(info.bookingId, 'start').then((s) => s && setSession(s))
          break
        }
        case 'session.input_transcript.delta':
          addText('student', String(ev.delta ?? ''), Number(ev.start_ms) || 0, Number(ev.end_ms) || 0)
          break
        case 'session.output_transcript.delta':
          setTutorReady(true)
          addText('tutor', String(ev.delta ?? ''), Number(ev.start_ms) || 0, Number(ev.end_ms) || 0)
          break
        case 'response.event': {
          const inner = ev.event as { type?: string; item?: { type?: string; name?: string; arguments?: string; call_id?: string } }
          if (inner?.type === 'response.output_item.done' && inner.item?.type === 'function_call' && inner.item.call_id) {
            const output = await runTool(inner.item.name ?? '', inner.item.arguments ?? '{}')
            sendEvent({ type: 'response.item.create', item: { type: 'function_call_output', call_id: inner.item.call_id, output } })
            sendEvent({ type: 'response.create' })
          }
          break
        }
        case 'session.closed': {
          // Only the booked end ends the lesson. A session that closes earlier (a network
          // problem, a provider hiccup) leaves the student in the room with a Reconnect button.
          const timeLeft = endsAt.current - (Date.now() + clockOffset)
          if (timeLeft <= 60_000) {
            closing.current = true
            flush(true)
            setStatus((s) => (s === 'live' ? 'ended' : s))
          } else {
            flush(false)
            setStatus((s) => (s === 'live' ? 'dropped' : s))
          }
          break
        }
        case 'error': {
          const err = ev.error as { message?: string } | undefined
          console.warn('AI tutor error', err?.message)
          break
        }
      }
    },
    [info.bookingId, setSession, act, slideRef, addText, runTool, sendEvent, flush, clockOffset],
  )
  const handleRef = useRef(handleEvent)
  useEffect(() => {
    handleRef.current = handleEvent
  }, [handleEvent])

  const teardown = useCallback(() => {
    dc.current?.close()
    pc.current?.close()
    mic.current?.getTracks().forEach((tr) => tr.stop())
    dc.current = null
    pc.current = null
    mic.current = null
  }, [])

  const connect = useCallback(async () => {
    const mine = ++gen.current
    teardown()
    closing.current = false
    setStatus('connecting')
    try {
      const conn = new RTCPeerConnection()
      pc.current = conn
      conn.addEventListener('track', (e) => {
        const ms = new MediaStream([e.track])
        setRemoteStream(ms)
        if (audioEl.current) {
          audioEl.current.srcObject = ms
          audioEl.current.play().catch(() => {})
        }
      })
      const deviceId = props.localMedia.state.currentMicrophoneDeviceId
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
      })
      mic.current = stream
      setMicStream(stream)
      stream.getAudioTracks().forEach((tr) => {
        tr.enabled = micOn
        conn.addTrack(tr, stream)
      })
      const ch = conn.createDataChannel('oai-events')
      dc.current = ch
      ch.addEventListener('message', ({ data }) => {
        if (gen.current !== mine) return // an older connection (e.g. the one replaced when a lesson was opened)
        try {
          handleRef.current(JSON.parse(String(data)))
        } catch {
          /* ignore */
        }
      })
      ch.addEventListener('close', () => {
        if (dc.current !== ch) return
        if (!closing.current) {
          flush(false)
          setStatus(Date.now() >= endsAt.current - 15_000 ? 'ended' : 'dropped')
        }
      })

      const offer = await conn.createOffer()
      await conn.setLocalDescription(offer)
      if (conn.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const done = () => {
            if (conn.iceGatheringState === 'complete') {
              conn.removeEventListener('icegatheringstatechange', done)
              resolve()
            }
          }
          conn.addEventListener('icegatheringstatechange', done)
          setTimeout(resolve, 4000) // send what we have
        })
      }
      const res = await startAiSession(info.bookingId, conn.localDescription?.sdp ?? '')
      if (!res.ok) {
        teardown()
        setStatus(res.reason === 'too_early' ? 'too_early' : res.reason === 'ended' ? 'ended' : 'failed')
        return
      }
      sessionId.current = res.sessionId
      endsAt.current = new Date(res.endsAt).getTime()
      lines.current = []
      await conn.setRemoteDescription({ type: 'answer', sdp: res.sdp })
    } catch (e) {
      console.warn('AI tutor connect failed', e)
      teardown()
      setStatus('failed')
    }
    // micOn is read once at connect time; the toggle below updates live tracks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.bookingId, props.localMedia.state.currentMicrophoneDeviceId, teardown, flush])

  /* a new lesson was opened: save the transcript, then start a fresh session (it reads the new lesson plan and the recent conversation) */
  useEffect(() => {
    renewRef.current = async () => {
      if (closing.current) return
      setRenewing(true)
      setTutorReady(false)
      closing.current = true
      gen.current++ // ignore everything the old session still sends (including its session.closed)
      sendEvent({ type: 'session.close' })
      await flush(false)
      void connect()
    }
  }, [sendEvent, flush, connect])

  /* a dropped connection with time left: reconnect by itself (a few times), the button stays as a fallback */
  const autoTries = useRef(0)
  useEffect(() => {
    if (status !== 'dropped' || autoTries.current >= 3) return
    if (endsAt.current - (Date.now() + clockOffset) < 60_000) return
    autoTries.current++
    setTutorReady(false)
    const id = setTimeout(() => void connect(), 1500)
    return () => clearTimeout(id)
  }, [status, connect, clockOffset])

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const id = setTimeout(() => void connect(), 0)
    return () => clearTimeout(id)
  }, [connect])
  useEffect(() => () => teardown(), [teardown])

  // save the transcript every minute, and on leaving the page
  useEffect(() => {
    const id = setInterval(() => flush(false), 60_000)
    const onHide = () => flush(false)
    window.addEventListener('pagehide', onHide)
    return () => {
      clearInterval(id)
      window.removeEventListener('pagehide', onHide)
    }
  }, [flush])

  /* ---------- slide changes → the new slide's content and checklist for the AI tutor ---------- */
  const lessonKey = props.open?.lessonId ?? ''
  useEffect(() => {
    // a different lesson: start tracking from where it opened
    furthest.current = live.current.idx
    review.current = false
  }, [lessonKey])
  useEffect(() => {
    if (!review.current) furthest.current = Math.max(furthest.current, idx)
    else if (idx >= furthest.current) review.current = false
  }, [idx])
  useEffect(() => {
    if (status !== 'live' || !slide || lastSent.current === slide.id) return
    lastSent.current = slide.id
    const ref = slideRef()
    const looking = review.current && idx < furthest.current
    if (ref) void act({ kind: 'slide', ...ref, slideId: slide.id, ...(looking ? { review: { returnTo: furthest.current + 1 } } : {}) })
  }, [status, slide, idx, slideRef, act])

  /* ---------- the student's chat messages → context (the tutor can't see the chat) ---------- */
  const seenMsgs = useRef(props.messages.length)
  useEffect(() => {
    const fresh = props.messages.slice(seenMsgs.current)
    seenMsgs.current = props.messages.length
    if (status !== 'live') return
    for (const m of fresh) if (m.from === 'student' && m.text) void act({ kind: 'chat', text: m.text })
  }, [props.messages, status, act])

  /* ---------- lookups, saved words and activity answers (from the classroom bus) ---------- */
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])
  const pendingActs = useRef<string[]>([])
  const actTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      const a = (e as CustomEvent<StudentAction>).detail
      if (!a || statusRef.current !== 'live') return
      if (a.kind === 'activity') {
        // quick taps (e.g. a few wrong matches) go as one update
        pendingActs.current.push(a.text)
        if (actTimer.current) clearTimeout(actTimer.current)
        actTimer.current = setTimeout(() => {
          const text = pendingActs.current.slice(-4).join(' ')
          pendingActs.current = []
          void act({ kind: 'activity', text })
        }, 1500)
      } else void act(a)
    }
    props.bus.addEventListener('student-action', on)
    return () => {
      props.bus.removeEventListener('student-action', on)
      if (actTimer.current) clearTimeout(actTimer.current)
    }
  }, [props.bus, act])

  /* audio/video on the slide: tell the AI tutor when it has finished, so it can ask about it */
  const { onLocalMedia } = props
  const onMedia = useCallback(
    (m: Parameters<typeof onLocalMedia>[0]) => {
      onLocalMedia(m)
      if (m.action === 'ended' && statusRef.current === 'live') void act({ kind: 'media', text: 'the audio/video on the slide just finished playing. Ask the student about it now.' })
    },
    [onLocalMedia, act],
  )

  /* ---------- clock + time notes ---------- */
  const [now, setNow] = useState(() => Date.now() + clockOffset)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 1000)
    return () => clearInterval(id)
  }, [clockOffset])
  const left = Math.max(0, (endsAt.current - now) / 1000)
  const noted = useRef<Set<string>>(new Set())
  const timeUp = useRef(false)
  useEffect(() => {
    if (status !== 'live') return
    // the server picks the wording from the booked end; the AI tutor keeps teaching until ~20 s before
    const note = (k: string) => {
      if (noted.current.has(k)) return
      noted.current.add(k)
      void act({ kind: 'time' })
    }
    if (left <= 300 && left > 120) note('5')
    if (left <= 120 && left > 60) note('2')
    if (left <= 60 && left > 25) note('1')
    if (left <= 25) note('0')
    if (left <= 0 && !timeUp.current) {
      // the server's sweep hangs up too; this just ends it cleanly on our side
      timeUp.current = true
      setTimeout(() => {
        if (closing.current) return
        closing.current = true
        sendEvent({ type: 'session.close' })
        flush(true)
        setStatus('ended')
      }, 15_000)
    }
  }, [left, status, act, sendEvent, flush])

  useEffect(() => {
    if (speaking) setTutorReady(true)
  }, [speaking])
  useEffect(() => {
    if (status !== 'live' || tutorReady) return
    const id = setTimeout(() => setTutorReady(true), 12_000)
    return () => clearTimeout(id)
  }, [status, tutorReady])

  /* ---------- quiet for a while → remind the AI tutor to lead ---------- */
  // GPT-Live sometimes waits after a slide is finished; nudge it once per silence
  useEffect(() => {
    if (status !== 'live' || !tutorReady || left <= 30 || nudged.current) return
    if (Date.now() - lastSpeech.current < 9000) return
    nudged.current = true
    void act({ kind: 'nudge' })
  }, [now, left, status, tutorReady, act])

  useEffect(() => {
    if (status === 'ended') {
      postEvent(info.bookingId, 'end')
      const id = setTimeout(() => onLeave({ ended: true }), 1500)
      return () => clearTimeout(id)
    }
  }, [status, info.bookingId, onLeave])

  /* ---------- tutor speaking indicator ---------- */
  const tutorDot = useVolDot(remoteStream, false)
  const myDot = useVolDot(micStream, !micOn)
  useEffect(() => {
    if (!remoteStream) return
    let raf = 0
    let last = false
    const tick = () => {
      const on = !!tutorDot.current?.classList.contains('live')
      if (on !== last) {
        last = on
        setSpeaking(on)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [remoteStream, tutorDot])

  const toggleMic = () => {
    const next = !micOn
    setMicOn(next)
    mic.current?.getAudioTracks().forEach((tr) => (tr.enabled = next))
  }
  const leave = () => {
    closing.current = true
    sendEvent({ type: 'session.close' })
    flush(false)
    setTimeout(() => {
      teardown()
      onLeave({ ended: false })
    }, 300)
  }

  const freeTalk = !slides.length

  /* ---------- layout: the same slide + tiles layout as a lesson with Connor ---------- */
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<HTMLDivElement | null>(null)
  const slideBoxRef = useRef<HTMLDivElement | null>(null)
  const otherRef = useRef<HTMLDivElement | null>(null)
  const meRef = useRef<HTMLDivElement | null>(null)
  const showSlide = !freeTalk || props.whiteboard
  const rects = useRef(new Map<HTMLElement, Rect>())
  const place = useCallback((el: HTMLElement | null, r: Rect | null) => {
    if (!el) return
    if (!r) {
      el.style.display = 'none'
      return
    }
    el.style.display = ''
    const o = rects.current.get(el)
    rects.current.set(el, r)
    if (o && o.x === r.x && o.y === r.y && o.w === r.w && o.h === r.h) return
    Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' })
  }, [])
  const doLayout = useCallback(() => {
    const box = layoutRef.current
    if (!box) return
    const res = computeLayout(box.clientWidth, box.clientHeight, { showSlide, chatOpen: props.chatOpen, ratio: 3 / 4 })
    if (!res) return
    place(slideBoxRef.current, res.slide)
    place(otherRef.current, res.other)
    place(meRef.current, res.me)
    if (appRef.current) {
      appRef.current.dataset.mode = res.mode
      appRef.current.style.setProperty('--lift', res.lift.toFixed(1) + 'px')
    }
  }, [place, props.chatOpen, showSlide])
  useLayoutEffect(() => {
    const box = layoutRef.current
    if (!box) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(doLayout)
    })
    ro.observe(box)
    doLayout()
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [doLayout])

  /* ---------- drawing + whiteboard (the student's own; the AI tutor can't see them) ---------- */
  const [tbOpen, setTbOpen] = useState(false)
  const surface = props.whiteboard ? 'board' : (slide?.id ?? '')
  const { closeLookup, setWhiteboard, whiteboard, ink } = props
  useEffect(() => {
    closeLookup()
  }, [surface, closeLookup])
  const toggleWhiteboard = useCallback(() => {
    const on = !whiteboard
    setWhiteboard(on)
    if (on) {
      setTbOpen(true)
      if (ink.tool === 'select') ink.setTool('pen')
    } else if (freeTalk) setTbOpen(false)
  }, [whiteboard, setWhiteboard, ink, freeTalk])

  const statusText =
    status === 'connecting'
      ? t('aiConnecting')
      : status === 'dropped'
        ? t('aiDropped')
        : status === 'failed'
          ? t('aiFailed')
          : status === 'too_early'
            ? t('aiTooEarly')
            : status === 'ended'
              ? t('aiTimeUp')
              : speaking
                ? t('aiSpeaking')
                : t('aiListening')

  return (
    <div
      ref={appRef}
      className={`app ai-lesson student${freeTalk ? ' no-course' : ''}${props.whiteboard ? ' wb' : ''}${props.prefs.cursors ? '' : ' no-cursors'}${tbOpen ? ' tb-open' : ''}${props.chatOpen ? ' chat-open' : ''}`}
    >
      <audio ref={audioEl} autoPlay playsInline />
      <div className={`ai-calling${(status === 'connecting' || status === 'live') && !tutorReady ? '' : ' out'}`} role="status" aria-hidden={tutorReady}>
        <div className="ai-orb" aria-hidden>
          <span className="ai-ring" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 10v4M9 7v10M13 5v14M17 8v8M21 11v2" />
          </svg>
        </div>
        {renewing ? t('aiOpening') : t('aiCalling')}
      </div>
      <header className="top">
        <div className="logo">
          eigo<b>.</b>io
        </div>
        <div className="ttl">
          {!freeTalk && props.loaded && <span className="course">{props.loaded.course.title}</span>}
          <span id="crumb">{freeTalk ? t('aiFreeTalk') : lesson ? lesson.title : '…'}</span>
        </div>
        <div className="spacer" />
        <div className="navwrap">
          <div className="snav">
            <button disabled aria-label="Previous slide">
              <Ico name="left" />
            </button>
            <span className="n">{slides.length ? `${idx + 1} / ${slides.length}` : '–'}</span>
            <button disabled aria-label="Next slide">
              <Ico name="right" />
            </button>
          </div>
        </div>
        <button className={`sq tog${props.whiteboard ? ' on' : ''}`} title={t('whiteboardTitle')} aria-pressed={props.whiteboard} onClick={toggleWhiteboard}>
          <Ico name="board" />
        </button>
        <div className={`info${left <= 120 ? ' warn' : ''}`}>{status === 'live' ? mmss(left) : '–'}</div>
        <button className="sq leaveSq" title={t('end')} onClick={leave}>
          <Ico name="leave" />
          <span>{t('end')}</span>
        </button>
      </header>

      <div className="body">
        <section className="stageArea">
          <div className="layout" ref={layoutRef}>
            <SlideStage
              setBox={(el) => {
                slideBoxRef.current = el
              }}
              className="slot slideBox tool-select"
              slide={slide}
              mode="student"
              assetBase={props.loaded?.assetBase ?? ''}
              characters={props.loaded?.course.characters}
              remoteMedia={props.remoteMedia}
              onLocalMedia={onMedia}
              zoomLabel={t('backToWholeSlide')}
              ink={props.ink}
              surface={surface}
              bus={props.bus}
              otherName={info.other.name}
              boardLabel={t('whiteboard')}
              onCursor={props.onCursor}
              lookup={props.lookup}
              vocabApi={props.vocabApi}
              activityApi={props.activityApi}
              share={null}
              onStopShare={() => {}}
              onShareRatio={() => {}}
            />
            <div className={`slot tile ai-tile${speaking ? ' speaking' : ''}${status !== 'live' ? ' idle' : ''}`} ref={otherRef}>
              <div className="face">
                <div className="ai-orb" aria-hidden>
                  <span className="ai-ring" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 10v4M9 7v10M13 5v14M17 8v8M21 11v2" />
                  </svg>
                </div>
              </div>
              <span className="vol" ref={tutorDot}>
                <i />
              </span>
              {status !== 'live' && (
                <div className="ai-status" role="status">
                  {status === 'connecting' && <span className="spin" />}
                  {statusText}
                  {(status === 'dropped' || status === 'failed') && (
                    <button className="ebtn cta" onClick={() => void connect()}>
                      {t('aiReconnect')}
                    </button>
                  )}
                </div>
              )}
              <span className="name">{info.other.name}</span>
            </div>
            <div className={"slot tile camoff"} ref={meRef}>
              <div className="face">
                <div className="avatar" style={{ background: '#fae1d8' }}>
                  {(info.me.name || '?').trim().charAt(0).toUpperCase()}
                </div>
              </div>
              <span className={`vol${micOn ? '' : ' muted'}`} ref={myDot}>
                <i />
                <span className="mut" title={t('muted')}>
                  <Ico name="micoff" />
                </span>
              </span>
              <span className="name">
                {info.me.name} {t('you')}
              </span>
            </div>
          </div>

          <Toolbar t={t} ink={props.ink} open={tbOpen} setOpen={setTbOpen} toast={props.toast} enabled={!!surface} />

          <nav className="controls">
            <button className={`cbtn ${micOn ? 'on' : 'off'}`} aria-pressed={micOn} onClick={toggleMic}>
              <span className="cface">
                <Ico name={micOn ? 'mic' : 'micoff'} />
              </span>
              <span className="lbl">{t('mic')}</span>
            </button>
            <button className={`cbtn${props.chatOpen ? ' on' : ''}`} aria-pressed={props.chatOpen} onClick={() => props.setChatOpen(!props.chatOpen)}>
              <span className="cface">
                <Ico name="chat" />
              </span>
              <span className={`badge${props.unread > 0 ? ' show' : ''}`}>{props.unread || ''}</span>
              <span className="lbl">{t('chat')}</span>
            </button>
          </nav>
        </section>

        <aside className="chat">
          <ChatPanel
            t={t}
            role="student"
            otherName={info.other.name}
            messages={props.messages}
            startedLabel={null}
            onSend={props.sendMessage}
            bookingId={info.bookingId}
            savedIds={props.savedIds}
            onSaveWord={props.onSaveWord}
            onClose={() => props.setChatOpen(false)}
          />
        </aside>
      </div>
    </div>
  )
}
