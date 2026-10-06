'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocalMedia } from '@whereby.com/browser-sdk/react'
import {
  downloadChat,
  postMessage,
  postRating,
  useClassroomChannel,
  type ChatMsg,
  type JoinInfo,
  type SessionInfo,
} from '@/lib/classroom/client'
import { makeT, type ClassroomT } from '@/lib/classroom/i18n'
import { audioContext } from './audio'
import { Ico, Star } from './Icons'
import Lobby from './Lobby'
import Room, { type TileMsg } from './Room'

/**
 * Lobby → room → "left / lesson complete" screen, plus the state that must
 * survive leaving and rejoining (chat, lesson clock, toasts).
 */

type Phase = { name: 'lobby' } | { name: 'room'; key: number } | { name: 'left'; ended: boolean }

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
}: {
  info: JoinInfo
  t: ClassroomT
  ended: boolean
  session: SessionInfo
  clockOffset: number
  onRejoin: () => void
}) {
  const L = info.durationMinutes * 60
  const startedMs = session.startedAt ? new Date(session.startedAt).getTime() : null
  const [nowMs] = useState(() => Date.now() + clockOffset)
  const elapsed = startedMs ? (nowMs - startedMs) / 1000 : 0
  // The lesson counts as complete when its time is up, or the teacher ended it.
  const done = ended || (!!startedMs && elapsed >= L)
  const isStudent = info.role === 'student'

  if (done) {
    // Layout B (no course words). Layout F, with saved words and Review Now, arrives with course slides.
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
  const localMedia = useLocalMedia({ audio: true, video: true })
  const [phase, setPhase] = useState<Phase>({ name: 'lobby' })
  const [session, setSession] = useState<SessionInfo>(info.session)
  const [messages, setMessages] = useState<ChatMsg[]>(info.chat)
  const [chatOpen, setChatOpenRaw] = useState(false)
  const [unread, setUnread] = useState(0)
  const [speakerId, setSpeakerId] = useState('default')
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

  const chatOpenRef = useRef(chatOpen)
  const phaseRef = useRef(phase.name)
  useEffect(() => {
    chatOpenRef.current = chatOpen
    phaseRef.current = phase.name
  })
  const send = useClassroomChannel(info.bookingId, (e) => {
    if (e.type === 'chat') {
      setMessages((p) => (p.some((m) => m.id === e.message.id) ? p : [...p, e.message]))
      popTile('other', e.message)
      if (!chatOpenRef.current) setUnread((n) => n + 1)
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

  const onLeave = useCallback(
    ({ ended }: { ended: boolean }) => {
      if (ended && info.role === 'teacher') send({ type: 'ended' })
      setPhase({ name: 'left', ended })
    },
    [info.role, send],
  )

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
        />
      )}
      <Toast toast={toastState} />
    </>
  )
}
