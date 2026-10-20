'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  aiAssist,
  aiCourses,
  aiCourseTitles,
  aiOpenLesson,
  aiRoleplays,
  aiRoleplayScene,
  aiTurn,
  postEvent,
  recordRoleplay,
  sendAiReport,
  saveAiTranscript,
  sendAiAction,
  startAiSession,
  fetchCourse,
  welcomeAbout,
  welcomeRecord,
  welcomeSave,
  welcomeScene,
  type LoadedCourse,
  type PanelCourse,
  type SlideRef,
  type StudentAction,
} from '@/lib/classroom/client'
import type { Lesson, Slide } from '@/lib/slides/types'
import { useAudioLevel, useVolDot } from './audio'
import AiAvatar from '@/components/ai/AiAvatar'
import { faceForText, newMood } from '@/lib/ai-tutor/avatar-mood'
import { INTRO_FAIL_MS, INTRO_REVEAL_MS, introFailed, introLive, newIntro, pickIntro, type AvatarIntro } from '@/lib/ai-tutor/avatar-intro'
import ChatPanel from './ChatPanel'
import WordList, { WordsButton } from './WordList'
import AiCards, { type HearFn, type ShownCard } from './AiCards'
import { PanelPicker, RoleplayDone, RoleplayMission, newMission, type Mission, type PanelState } from './AiPanel'
import { LEVEL_NAMES, otherRole, tasksFor, roleOf, type LevelIndex, type RoleId, type Scene } from '@/lib/roleplay/types'
import {
  FACT_KEYS,
  TUTOR_COMMAND,
  TUTOR_QA,
  WELCOME_AT,
  FALLBACK_PICK,
  ROLEPLAY_PHRASE,
  SAYS_ROLEPLAY,
  TUTOR_SETS_SCENE,
  commandSaid,
  factCount,
  heardPhrase,
  waitsForGap,
  welcomeNext,
  welcomeStartStep,
  type FactKey,
  type Facts,
  type WelcomeMove,
  type WelcomePick,
  type WelcomeStep,
} from '@/lib/classroom/welcome'
import { CommandCard, SuggestCard, WelcomeEnd, type NextUp } from './WelcomeCards'
import { normText } from '@/lib/ai-tutor/actions'
import { panelIntent, type PanelIntent } from '@/lib/roleplay/intent'
import type { SceneSummary } from '@/lib/roleplay/types'
import { shrinkInto } from './save-fly'
import { cueCard, cueSentence, fitDraft, lastExchange, letters, mergeCard, mistakeFor, tutorItemId, type Card, type SayStyle } from '@/lib/ai-tutor/cards'
import { hasJapanese, sameWords, words as wordsOf } from '@/lib/ai-tutor/voice-match'
import { Ico } from './Icons'
import SlideStage from './SlideStage'
import Toolbar from './Toolbar'
import { computeAiLayout, type Rect } from '@/lib/classroom/layout'
import { orbColor } from '@/lib/ai-tutor/orb-colors'
import { courseNamed, type CourseName } from '@/lib/ai-tutor/course-names'
import { studentClosesCourse, studentOpensCourse, tutorClosesCourse } from '@/lib/classroom/course-commands'
import type { ScreenAction } from '@/lib/ai-tutor/actions'
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
type Line = { from: 'student' | 'tutor'; text: string; t: number; end?: number }
type Status = 'connecting' | 'live' | 'dropped' | 'failed' | 'too_early' | 'ended'
/** the welcome call's About-you card: waiting for an answer, saved, or ended without saving */
type WAbout = 'ask' | 'saved' | 'skipped'

function findLesson(p: Props): Lesson | null {
  if (!p.loaded || !p.open) return null
  for (const u of p.loaded.course.units) for (const l of u.lessons) if (l.id === p.open.lessonId) return l
  return null
}

// a clear spoken cue changes the slide at once ("…let's move on to the next slide")
const NEXT_CUE = /\bnext (slide|page)\b/i
const NOT_YET = /\bbefore (we|you) (move|go)\b/i
/** saying goodbye: from then on the slide on screen stays put ("see you next time" mustn't move it on) */
const GOODBYE =
  /\b(?:good ?bye|bye(?: for now)?|see you(?:\s+(?:next time|next week|soon|later|again|tomorrow|then)\b|\s*[.!]|\s*$)|take care|until next time|have a (?:good|great|nice|lovely) (?:day|evening|night|week|weekend)|that'?s (?:all|it) for today|thanks?(?: you)? (?:so much )?for (?:today|the lesson|your time))|またね|さようなら|ありがとうございました|お疲れ様でした|おつかれさまでした/i
/** a goodbye this close to the end means the lesson is wrapping up */
const GOODBYE_WINDOW_S = 300
/** the AI tutor ends a role-play scene */
const END_RP = /\bthat'?s the end of the role[- ]?play\b[.!]?/i
// "…I'll press play now" (not a question): the classroom plays the slide's clip once the AI tutor stops talking
const PLAY_CUE = /\b(press(ing)? play|play (it|the clip|the video|the audio|this clip|this video)|playing (it|the clip|the video) now)\b/i
const RETURN_CUE = /\b(carry on|continue|get back|go back) (with|to) (the|our) lesson\b/i
// "Let's start this lesson again from the beginning": slide 1, then carry on 1, 2, 3… (not a quick look back)
const RESTART_CUE = /\b(?:I'll|I will|let me|let's|let us|we'll)\s+(?:start|begin)\s+(?:the|this|our)?\s*(?:lesson|course)?\s*(?:again|over|from\s+(?:the\s+)?(?:beginning|start|top|first slide|slide (?:one|1)))\b|\bstart(?:ing)?\s+(?:the\s+lesson\s+)?(?:again|over)\s+from\s+(?:the\s+)?(?:beginning|start|top)\b/i
// The classroom changes what's on screen when the AI tutor SAYS it will (voice models often say "I'll open it"
// without calling a tool, so tools alone made students ask twice). Statements only, never questions.
const OPEN_CUE = /\b(?:I'll|I will|let me|let's|let us|we'll)\s+(?:open|bring up|pull up|put up|start|jump (?:back )?into|go back to|get back to|continue(?: with)?)\s+(?:the|your|our|that|this)?\s*(?:course|lesson)\b/i
const OPEN_VERB = /\b(?:I'll|I will|let me|let's|let us|we'll)\s+(?:open|bring up|pull up|put up|start)\b/i
const LESSON_NO = /\blesson\s+(\d{1,2})\b/i
const BOARD_ON_CUE = /\b(?:I'll|I will|let me|let's|let us|we'll)\s+(?:open|bring up|pull up|put up|show|switch to|use)\s+(?:the|a|our)?\s*whiteboard\b/i
const BOARD_OFF_CUE = /\b(?:I'll|I will|let me|let's|let us|we'll)\s+(?:close|hide|put away)\s+(?:the|our)?\s*whiteboard\b|\b(?:go|switch|head|get)\s+back\s+to\s+the\s+(?:slides?|lesson)\b/i

const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

/** The first of these that gives a card, or null when none does (or after ms). */
function firstCard(ps: Promise<Card | null>[], ms: number): Promise<Card | null> {
  return new Promise((resolve) => {
    let left = ps.length
    const none = () => --left === 0 && resolve(null)
    for (const p of ps) p.then((c) => (c ? resolve(c) : none()), none)
    setTimeout(() => resolve(null), Math.max(0, ms))
  })
}

export default function AiRoom(props: Props) {
  const { info, t, setSession, clockOffset, onLeave } = props
  const [status, setStatus] = useState<Status>('connecting')
  const [speaking, setSpeaking] = useState(false)
  const speakingRef = useRef(false)
  useEffect(() => {
    speakingRef.current = speaking
  }, [speaking])
  const [micOn, setMicOn] = useState(true)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  /** the AI tutor has started talking: until then the student sees 'Calling your AI tutor…' */
  const [tutorReady, setTutorReady] = useState(false)
  /** the "calling…" animation on the calling screen: which one, and where it is (read by AiAvatar every frame) */
  const intro = useRef<AvatarIntro | null>(null)
  /** its reveal has finished (the calling screen waits for it, so the face is never cut off mid-turn) */
  const [introDone, setIntroDone] = useState(true)
  /** its "couldn't connect" ending is still playing */
  const [introHold, setIntroHold] = useState(false)

  const pc = useRef<RTCPeerConnection | null>(null)
  const dc = useRef<RTCDataChannel | null>(null)
  const mic = useRef<MediaStream | null>(null)
  const audioEl = useRef<HTMLAudioElement | null>(null)
  const sessionId = useRef<string | null>(null)
  const endsAt = useRef<number>(new Date(info.window.end).getTime())
  const lines = useRef<Line[]>([])
  /* ---------- the avatar's expression (read by AiAvatar every frame) ---------- */
  const mood = useRef(newMood())
  const tutorSaid = useRef('')
  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // the AI tutor's words, as they arrive: the sentence being spoken picks the face (held ~2.5 s)
  /** captions: what the AI tutor is saying, above it (beginners by default; the 字幕 button) */
  const capRef = useRef<HTMLDivElement | null>(null)
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showCaption = useCallback((text: string) => {
    const el = capRef.current
    if (!el) return
    // the last sentence or two of what it's saying now
    const parts = text.trim().split(/(?<=[.!?。？！])\s+/)
    let cap = parts.pop() ?? ''
    while (parts.length && cap.length < 70) cap = `${parts.pop()} ${cap}`
    el.textContent = cap.length > 160 ? '…' + cap.slice(-159) : cap
    el.classList.add('on')
    if (capTimer.current) clearTimeout(capTimer.current)
    capTimer.current = setTimeout(() => el.classList.remove('on'), 3500)
  }, [])
  useEffect(() => () => void (capTimer.current && clearTimeout(capTimer.current)), [])
  const feelTutor = useCallback((delta: string) => {
    tutorSaid.current = (tutorSaid.current + delta).slice(-240)
    const sentence = tutorSaid.current.split(/(?<=[.!?])\s+/).pop() ?? ''
    const face = faceForText(sentence)
    if (face) {
      mood.current.face = face
      mood.current.until = performance.now() + 2500
    }
  }, [])
  // the student speaking: listen (nods, eyes on them) until a moment after they stop
  const feelStudent = useCallback(() => {
    mood.current.listening = true
    mood.current.until = 0
    tutorSaid.current = ''
    if (listenTimer.current) clearTimeout(listenTimer.current)
    listenTimer.current = setTimeout(() => (mood.current.listening = false), 1200)
  }, [])
  useEffect(() => () => void (listenTimer.current && clearTimeout(listenTimer.current)), [])
  const lastEnd = useRef<{ student: number; tutor: number }>({ student: -1e9, tutor: -1e9 })
  const closing = useRef(false)
  const sessionsStarted = useRef(0)
  /** connection generation: events from a replaced connection are ignored */
  const gen = useRef(0)
  /** the slide whose content the AI tutor was last given */
  const lastSent = useRef<string | null>(null)
  const lastSpeech = useRef(Date.now())
  /** called on every transcript fragment (set up below, where the slide controls live) */
  /** start a new transcript line (a new slide just appeared) */
  const breakLine = useRef(false)
  /** when each side last said something (wall clock) */
  const lastSaid = useRef({ student: 0, tutor: 0 })
  const speakIfSilent = useRef<(noteAt: number, still?: () => boolean, wait?: number) => void>(() => {})
  /** the AI tutor is putting a reply together (response.created … response.done): never ask it to speak then */
  const responding = useRef(false)
  /** starts a role-play (set further down, once the panel exists) */
  const beginRoleplayRef = useRef<(scene: Scene, role: RoleId, level: LevelIndex) => void>(() => {})
  /**
   * Each side's current stretch of speech, joined by audio timing. The transcript starts a new line whenever the
   * other side talks, so a student's "could we close this… course" over the tutor's "Sure! I'll close… the course
   * now" came out as four broken lines and neither command was recognised. Commands are read from these instead.
   */
  const runs = useRef({ student: { text: '', n: 0 }, tutor: { text: '', n: 0 } })
  const speechHook = useRef<(from: Line['from'], line: Line) => void>(() => {})
  /** what's on screen follows what the AI tutor says (open/close the course, the whiteboard); set up further down */
  /** when a spoken cue last opened a course (older sessions may also call open_lesson for the same thing) */
  const cueOpened = useRef<{ at: number; courseId: string } | null>(null)
  /** the AI tutor's current stretch of speech; run = which stretch (the same sentence said again later counts again) */
  const viewCue = useRef<(line: Line, run: number) => void>(() => {})
  const nudged = useRef(false)
  /** the free 5-minute welcome call: its own rails (lib/classroom/welcome.ts), set up further down */
  const welcome = !!info.aiWelcome
  const welcomeHear = useRef<(said: string) => void>(() => {})
  const welcomeTutor = useRef<(sentence: string) => void>(() => {})
  const wStepRef = useRef<WelcomeStep | null>(null)

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
      // A note that arrives while the AI tutor is talking makes it start its sentence again ("Hi Hi Connor",
      // "That's the end of the role That's the end…"), so every note waits until it has finished (up to 6 s).
      // Not the first one: it's what the tutor waits for before saying anything.
      if (a.kind !== 'start' && a.kind !== 'resume') {
        const until = Date.now() + 6000
        // (a real pause: 1.2 s without a word from it; shorter gaps come mid-sentence)
        while (Date.now() < until && !closing.current && (speakingRef.current || responding.current || Date.now() - lastSaid.current.tutor < 1200))
          await new Promise((r) => setTimeout(r, 200))
      }
      const sid = sessionId.current
      if (!sid || closing.current) return false
      const ok = await sendAiAction(info.bookingId, sid, a)
      // fallback: at least let the AI tutor know quietly
      if (!ok && a.kind === 'chat') context(`The student wrote in the chat: "${a.text.slice(0, 400)}"`)
      return ok
    },
    [info.bookingId, context],
  )

  /* ---------- transcript ---------- */
  const addText = useCallback((from: Line['from'], delta: string, startMs: number, endMs: number) => {
    if (!delta) return
    lastSpeech.current = Date.now()
    lastSaid.current[from] = Date.now()
    // the silence reminder re-arms only when the student speaks (the tutor talking to itself mustn't loop it)
    if (from === 'student') nudged.current = false
    const L = lines.current
    const last = L[L.length - 1]
    if (last && last.from === from && startMs - lastEnd.current[from] < 2500 && !breakLine.current) last.text += delta
    else L.push({ from, text: delta.replace(/^\s+/, ''), t: startMs })
    L[L.length - 1].end = Math.max(L[L.length - 1].end ?? 0, endMs)
    breakLine.current = false
    const run = runs.current[from]
    // one stretch: the tutor's speech is continuous within a reply (a new reply starts after a pause), the student
    // may pause mid-sentence ("could we close this… course")
    if (run.text && startMs - lastEnd.current[from] < (from === 'tutor' ? 800 : 1500))
      run.text += /[.!?。？！]$/.test(run.text) && !/^\s/.test(delta) ? ` ${delta}` : delta
    else {
      run.text = delta.replace(/^\s+/, '')
      run.n++
    }
    lastEnd.current[from] = endMs
    speechHook.current(from, L[L.length - 1])
    cardHook.current(from)
    if (from === 'tutor') showCaption(run.text)
  }, [showCaption])
  /** what happened in the live session (responses, errors, the welcome talk's steps), sent with each save for the logs */
  const evLog = useRef<string[]>([])
  const evAt = useRef(Date.now())
  const logEv = useCallback((e: string) => {
    if (evLog.current.length < 300) evLog.current.push(`${Math.round((Date.now() - evAt.current) / 100) / 10} ${e}`)
  }, [])
  const flush = useCallback(
    (final: boolean) => {
      const events = evLog.current
      evLog.current = []
      return sessionId.current ? saveAiTranscript(info.bookingId, sessionId.current, lines.current, final, events) : Promise.resolve()
    },
    [info.bookingId],
  )

  /* ---------- cards: corrections and "How do I say…?" (lib/ai-tutor/cards.ts) ---------- */
  const [shown, setShown] = useState<ShownCard | null>(null)
  /** the card listens to what the student says from when it appears ("save it", the phrase…) */
  const cardHear = useRef<HearFn | null>(null)
  /** the card stays until the student's try is over: the classroom tells it then */
  const cardTried = useRef<(() => void) | null>(null)
  /** the AI panel listens too: "show me the role-plays", "let's do the café one", "close it" (lib/roleplay/intent.ts) */
  const panelSaid = useRef<(who: 'student' | 'tutor', text: string) => PanelIntent | null>(() => null)
  const panelDo = useRef<(i: PanelIntent) => void>(() => {})
  const panelHeard = useRef('')
  /** closing the course (free talk): by the student's words, the AI tutor's, or the ✕ button. False if none is open. */
  const closeCourseNow = useRef<() => boolean>(() => false)
  /** the action judge: what the screen is now (for the request) and how to apply an action (set further down) */
  const screenNow = useRef<
    () => {
      screen: NonNullable<Parameters<typeof aiTurn>[1]['screen']>
      courses: { id: string; title: string }[]
      scenes: { id: string; title: string }[]
      roleplay?: NonNullable<Parameters<typeof aiTurn>[1]['roleplay']> & { token: number }
    }
  >(() => ({
    screen: { view: 'free', board: false },
    courses: [],
    scenes: [],
  }))
  const judgeDo = useRef<(a: ScreenAction, quote: string, asked: number) => void>(() => {})
  /* role-plays (phase 3b): ticks from the turn check, the end of the scene, hints */
  const rpToken = useRef(0) // which play (a new one, again or swapped, gets a new token)
  const rpFrom = useRef(0) // the transcript line the play started at
  const allDoneSent = useRef(false)
  const hintAskAt = useRef(0)
  const tickDo = useRef<(ticks: { id: string; said: string }[], token: number) => void>(() => {})
  /** the quick tick check, right after each of the student's lines in a role-play (one at a time) */
  const quickTicks = useRef<() => void>(() => {})
  const rpTickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rpTicking = useRef(false)
  const rpTickAgain = useRef(false)
  const completeRp = useRef<() => void>(() => {})
  const hintAsk = useRef<() => void>(() => {})
  const rpPlaying = useRef(false)
  /** a role-play's mistakes, collected while they play (no cards then): the helper's card for each of their lines */
  const rpFixes = useRef(new Map<Line, { text: string; card: Promise<Card | null> }>())
  /** the ones on the results screen (their cards don't pop up again when the tutor goes through them) */
  const rpFixShown = useRef<{ was: string; now: string }[]>([])
  const [rpFixList, setRpFixList] = useState<{ was: string; now: string }[]>([])
  /** what the student had said in the play when its tasks were last checked (each line is checked once) */
  const rpTickedSig = useRef('')
  const rpStudentSig = () => {
    const mine = lines.current.slice(rpFrom.current).filter((l) => l.from === 'student')
    return `${rpToken.current}:${mine.length}:${mine.reduce((n, l) => n + l.text.length, 0)}`
  }
  /** the play in progress or just ended (late ticks still count for it) */
  const rpCur = useRef<{ token: number; scene: Scene; role: RoleId; level: LevelIndex } | null>(null)
  const missionRef = useRef<Mission>(newMission())
  /** the role-play list or the mission-complete screen is up: the student is choosing */
  const waitingForChoice = useRef(false)
  /** when the role-play list appeared, and whether it's up now */
  const pickerAt = useRef(0)
  const pickerShown = useRef(false)
  /** when the mission-complete screen appeared (the student's answer has to come after it) */
  const doneAt = useRef(0)
  /** when the screen last changed (course, panel, whiteboard), and the transcript line it changed at */
  const screenAt = useRef({ line: 0, t: 0 })
  const lastJudged = useRef(0)
  const openCourseNow = useRef<(courseId: string, lesson: string) => void>(() => {})
  const opening = useRef(false)
  /** course titles, to recognise "I'll open Haruka in the UK now" (loaded below) */
  const titles = useRef<CourseName[]>([])
  const heardOpen = useRef('')
  const heardClose = useRef('')
  const heardHint = useRef('')
  const [undo, setUndo] = useState<{ id: number; itemId: string; term: string; already: boolean } | null>(null)
  const cardFrom = useRef(0)
  const cardSeq = useRef(0)
  const shownRef = useRef<ShownCard | null>(null)
  /*
   * Corrections (one card from one place: the AI tutor saying the sentence). The tutor corrects in its reply (free
   * talk, the welcome talk's questions, slide tasks); a mistake it lets pass is saved quietly, or, in course lessons
   * with corrections "after each activity", kept for a correction moment when the slide changes (at most one, every
   * 2 minutes). Role-plays: at the end. Their try at a card is never checked again.
   */
  const missedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleMissed = useRef<() => void>(() => {})
  /** the student's lines already dealt with: a card was made for them, or their mistake was saved or kept */
  const handled = useRef(new Set<Line>())
  /** course lessons: the current slide's mistakes, for the moment at the next slide */
  const slideFixes = useRef<Extract<Card, { kind: 'correction' }>[]>([])
  /** the moment's card: it appears when the tutor says it */
  const momentCard = useRef<Extract<Card, { kind: 'correction' }> | null>(null)
  const lastMoment = useRef(0)
  /** phrases already shown as a card in this lesson: never the same card twice */
  const cardTerms = useRef(new Set<string>())
  const { onSaveWord, onRemoveWord, savedIds } = props
  const savedRef = useRef(savedIds)
  const sideRef = useRef(props.side)
  useEffect(() => {
    shownRef.current = shown
    savedRef.current = savedIds
    sideRef.current = props.side
  })
  const saveTerm = useCallback(
    (term: string, ja: string) => {
      const itemId = tutorItemId(term)
      const already = savedRef.current.has(itemId)
      // (the AI tutor isn't told: it should react to how the student said it, not to the saving)
      if (!already) onSaveWord({ source: 'tutor', itemId, term, ja }, { quiet: true })
      return { itemId, already }
    },
    [onSaveWord],
  )
  /** the card shrinks into the word-bank button (or, with the word list open, into its new top row), then it's saved */
  const saveFromCard = useCallback(
    (el: HTMLElement, term: string, ja: string) => {
      let target: HTMLElement | DOMRect | null = document.querySelector<HTMLElement>('[data-words-btn] .cface')
      if (sideRef.current === 'words') {
        const list = document.querySelector<HTMLElement>('.wlist .wrows') ?? document.querySelector<HTMLElement>('.wlist .wempty')
        const r = list?.getBoundingClientRect()
        const row = list?.querySelector<HTMLElement>('.wr')?.getBoundingClientRect()
        if (r) target = new DOMRect(r.left + 8, r.top, r.width - 16, row?.height ?? 52)
      }
      const id = shownRef.current?.id ?? 0
      const finish = () => {
        setShown((c) => (c?.id === id ? null : c))
        const r = saveTerm(term, ja)
        setUndo({ id: ++cardSeq.current, itemId: r.itemId, term, already: r.already })
      }
      if (target) shrinkInto(el, target, { radius: sideRef.current === 'words' ? 12 : 14, onDone: finish })
      else finish()
    },
    [saveTerm],
  )
  /** the tutor line an instant card came from (so the end-of-turn check doesn't make a second one) */
  const cardFor = useRef<Line | null>(null)
  const showCard = useCallback(
    (c: ShownCard['card'], from?: number) => {
      // the welcome call's suggestion and tips: the tutor says phrases to say ("you can say …"), never cards
      if (wStepRef.current === 'suggest' || wStepRef.current === 'command' || wStepRef.current === 'qa') return 0
      // a role-play: no cards while they play (its mistakes come on the results screen), and none for a mistake the
      // results already show (the tutor goes through those in its feedback)
      if (rpPlaying.current) return 0
      if (c.kind === 'correction' && rpFixShown.current.some((f) => sameWords(f.now, c.now))) return 0
      // never the same phrase twice (the tutor saying it again, or a second way of reaching it)
      const term = normText(c.kind === 'correction' ? c.now : (c.options[0]?.text ?? ''))
      if (term && cardTerms.current.has(term)) return 0
      if (term) cardTerms.current.add(term)
      // a card that was still up gets saved as it goes (it was going to be saved anyway)
      const prev = shownRef.current?.card
      if (prev) saveTerm(prev.kind === 'correction' ? prev.now : prev.options[0].text, prev.kind === 'correction' ? prev.ja : prev.heard)
      cardFrom.current = from ?? lines.current.length
      setUndo(null)
      const id = ++cardSeq.current
      setShown({ id, card: c })
      return id
    },
    [saveTerm],
  )
  /** prepared after each student turn: the card the AI tutor may need next (so it can appear complete at once) */
  const prep = useRef<{ line: Line; text: string; card: Promise<Card | null> } | null>(null)
  const prepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prepare = useCallback(() => {
    if (prepTimer.current) clearTimeout(prepTimer.current)
    prepTimer.current = null
    const sid = sessionId.current
    const L = lines.current
    // the student's turn that just ended (the AI tutor may already have started its reply)
    let k = L.length - 1
    while (k >= 0 && L[k].from === 'tutor') k--
    const line = L[k]
    if (!sid || closing.current || !line) return
    const text = line.text.trim()
    if (!(hasJapanese(text) || wordsOf(text).length >= 3)) return
    // their try at a card's sentence: never checked (correcting the try again broke the flow)
    if (shownRef.current && k >= cardFrom.current) {
      handled.current.add(line)
      return
    }
    // the welcome talk: corrections only in its questions (and the role-play's, for its results)
    if (welcome && wStepRef.current !== 'about' && !rpPlaying.current) return
    if (prep.current?.line === line && prep.current.text === text) return
    const recent = L.slice(Math.max(0, k - 3), k + 1).map((l) => ({ from: l.from, text: l.text }))
    prep.current = { line, text, card: aiAssist(info.bookingId, { sessionId: sid, lines: recent, mode: 'prepare' }) }
    // in a role-play: kept for the results screen (a line that grew is prepared again and replaces its entry)
    if (rpPlaying.current) rpFixes.current.set(line, prep.current)
  }, [info.bookingId, welcome])
  /**
   * The AI tutor has just said the corrected / English sentence. Show the card complete: at once when the
   * prepared card is about that sentence; otherwise as soon as the helper has the details (it's asked now),
   * and after 0.8 s at the latest (then without the reason line, added when it comes: at 3 s, the card often
   * came after the student's try).
   */
  const cueNow = useCallback(
    (line: Line) => {
      const sid = sessionId.current
      if (!sid || closing.current || cardFor.current === line || rpPlaying.current) return
      const L = lines.current
      // the correction moment at a slide change: its card is ready
      const mc = momentCard.current
      if (mc && normText(line.text).includes(normText(mc.now).split(' ').slice(0, 5).join(' '))) {
        momentCard.current = null
        cardFor.current = line
        showCard(mc, L.length)
        return
      }
      const i = L.lastIndexOf(line)
      // what they said before it, however the transcript split it ("I'm an aroma" + "therapist" when they paused):
      // if it already had the tutor's sentence, there was nothing to correct (no card, and nothing saved)
      const cs = cueSentence(line.text)
      const before = L.slice(Math.max(0, i - 6), i).filter((l) => l.from === 'student')
      if (cs && !cs.say && letters(before.map((l) => l.text).join(' ')).includes(letters(cs.sentence))) {
        cardFor.current = line
        for (const l of before) handled.current.add(l)
        return
      }
      const recent = L.slice(Math.max(0, i - 5), i + 1).map((l) => ({ from: l.from, text: l.text }))
      const ex = lastExchange(recent)
      // the student's line the correction is about: not always the last one (role-play feedback; "mm")
      const wider = L.slice(Math.max(0, i - 14), i).map((l) => ({ from: l.from, text: l.text }))
      const mistake = hasJapanese(ex.student) ? ex.student : mistakeFor(wider, ex.tutor) || ex.student
      const local = cueCard(mistake, ex.tutor)
      // the tutor dealt with it (a card, or nothing to correct): never saved again quietly
      if (cs) for (const l of before) handled.current.add(l)
      if (!local) return
      cardFor.current = line
      const from = L.length // the student's attempt starts after this
      const studentLine = i > 0 && L[i - 1].from === 'student' ? L[i - 1] : null
      // the prepared card: for the line just before, or the line the mistake is in (a pause can split it)
      const p = prep.current
      const prepared = p && (p.line === studentLine || (mistake && p.text.includes(mistake.trim()))) ? p.card : Promise.resolve(null)
      const fromPrep = prepared.then((c) => fitDraft(local, c))
      let late: Promise<Card | null> | null = null
      const helper = () => (late ??= aiAssist(info.bookingId, { sessionId: sid, lines: recent }))
      const show = (c: Card, complete: boolean) => {
        if (closing.current || cardFor.current !== line) return
        const id = showCard(c, from)
        if (!complete) void helper().then((h) => h && setShown((cur) => (cur?.id === id ? { id, card: mergeCard(cur.card, h) } : cur)))
      }
      const started = Date.now()
      void (async () => {
        // the prepared card is usually ready already
        const quick = await Promise.race([fromPrep, new Promise<undefined>((r) => setTimeout(() => r(undefined), 150))])
        if (quick) return show(quick, true)
        const full = await firstCard([fromPrep, helper().then((h) => fitDraft(local, h))], 800 - (Date.now() - started))
        show(full ?? local, !!full)
      })()
    },
    [info.bookingId, showCard],
  )
  const cardHook = useRef<(from: Line['from']) => void>(() => {})
  useEffect(() => {
    cardHook.current = (from) => {
      if (from === 'student') {
        // prepare a moment after the student stops (and at once if the AI tutor starts first)
        if (prepTimer.current) clearTimeout(prepTimer.current)
        prepTimer.current = setTimeout(prepare, 700)
      }
      // (the student's last line is prepared first, so the results screen has its mistake too)
      if (from === 'tutor' && prepTimer.current) prepare()
      if (from === 'tutor' && rpPlaying.current && END_RP.test(runs.current.tutor.text)) {
        completeRp.current()
      }
      if (from === 'tutor') {
        if (prepTimer.current) prepare()
        // the card appears as soon as the AI tutor has said the sentence; otherwise the helper looks after the turn
        const last = lines.current[lines.current.length - 1]
        if (last?.from === 'tutor') cueNow(last)
        // once its reply is over: a mistake it didn't correct is saved quietly, or kept for the slide's moment
        if (missedTimer.current) clearTimeout(missedTimer.current)
        missedTimer.current = setTimeout(() => settleMissed.current(), 1800)
        // the student has had their try at the card and the tutor is reacting: the card can go now
        if (shownRef.current && lines.current.slice(cardFrom.current).some((l) => l.from === 'student')) cardTried.current?.()
      }
      if (from === 'student') {
        // the student's own words act at once (each command once per sentence; the same command said again later,
        // after a tap, still counts). Read from their whole stretch of speech, however the transcript split it.
        const run = runs.current.student
        const parts = run.text.split(/(?<=[.!?。？！])\s*/).filter(Boolean)
        const said = parts[parts.length - 1] ?? ''
        const at = `${run.n}:${parts.length}`
        const freeNow = !live.current.slides.length
        // a role-play: their tasks are checked as soon as they've finished their line (not after the tutor's reply)
        if (rpPlaying.current) {
          if (rpTickTimer.current) clearTimeout(rpTickTimer.current)
          rpTickTimer.current = setTimeout(() => quickTicks.current(), 700)
        }
        // a role-play: "ヒント" / "hint" brings the next hint at once
        if (rpPlaying.current && /ヒント|\bhints?\b/i.test(said) && heardHint.current !== at) {
          heardHint.current = at
          hintAsk.current()
        }
        if (welcome) {
          // the welcome call: no courses, no role-play list; only its own cards listen
          welcomeHear.current(said)
        } else if (studentClosesCourse(said) && !freeNow) {
          if (heardClose.current !== at && closeCourseNow.current()) heardClose.current = at
        } else if (freeNow && studentOpensCourse(said) && heardOpen.current !== at) {
          // free talk: "could we open the course again?" opens it at once (by name if they say one)
          heardOpen.current = at
          const n = LESSON_NO.exec(said)?.[1]
          openCourseNow.current(courseNamed(said, titles.current)?.id ?? '', n ? `#${n}` : '')
        } else {
          // the panel (role-plays): also "let's do free talk", which closes it when no course is open
          const intent = panelSaid.current('student', said)
          const key = intent ? `${at}:${JSON.stringify(intent)}` : ''
          if (intent && key !== panelHeard.current) {
            panelHeard.current = key
            panelDo.current(intent)
          }
        }
      }
      if (from === 'student' && shownRef.current) {
        cardHear.current?.(
          lines.current
            .slice(cardFrom.current)
            .filter((l) => l.from === 'student')
            .map((l) => l.text)
            .join(' '),
        )
      }
    }
    settleMissed.current = () => {
      if (closing.current || rpPlaying.current) return
      const L = lines.current
      let k = L.length - 1
      while (k >= 0 && L[k].from === 'tutor') k--
      const st = L[k]
      const p = prep.current
      if (!st || k === L.length - 1 || handled.current.has(st) || !p || p.line !== st) return
      handled.current.add(st)
      const keep = !welcome && live.current.slides.length > 0 && (info.aiCorrections ?? 'end_of_activity') === 'end_of_activity'
      void p.card.then((c) => {
        if (!c || c.kind !== 'correction' || sameWords(c.now, st.text) || closing.current) return
        if (keep) slideFixes.current.push({ ...c, was: st.text.trim() })
        else saveTerm(c.now, c.ja)
      })
    }
    return () => {
      if (missedTimer.current) clearTimeout(missedTimer.current)
      if (prepTimer.current) clearTimeout(prepTimer.current)
    }
  }, [cueNow, prepare, welcome, saveTerm, info.aiCorrections])
  useEffect(() => {
    if (!undo) return
    const id = setTimeout(() => setUndo((u) => (u?.id === undo.id ? null : u)), 4000)
    return () => clearTimeout(id)
  }, [undo])
  const onChose = useCallback((style: SayStyle, text: string) => void act({ kind: 'card', what: 'chose', text, style }), [act])

  /* ---------- slides: changed by the classroom itself ---------- */
  // GPT-Live's tool calls were slow and unreliable for this, so the AI tutor just says it's moving on:
  // a clear spoken cue moves the slide at once, and after each turn a small model double-checks.
  const { onGo, sendTutorMessage, onOpenLesson, onCloseCourse } = props
  /** the open course a close was already sent for (said and tapped, or said twice): don't close/tell twice */
  const closedOpen = useRef<unknown>(null)
  const shownOpen = props.open
  useEffect(() => {
    closeCourseNow.current = () => {
      if (shownOpen && closedOpen.current === shownOpen) return true
      if (!live.current.slides.length || closing.current) return false
      closedOpen.current = shownOpen
      onCloseCourse()
      void act({ kind: 'view', what: 'closed' })
      return true
    }
  })
  /** the furthest slide taught (0-based), and whether the student is looking back at an earlier one */
  const furthest = useRef(0)
  const review = useRef(false)
  const lastMove = useRef(0)
  /** wrapping up (a goodbye in the last few minutes, or the last ~30 s): no more automatic slide changes */
  const wrapUp = useRef(false)
  // Per slide: where its conversation starts (the turn check only reads this slide's conversation)
  const slideStart = useRef(0)
  const slideShownAt = useRef(Date.now())
  const seenSlide = useRef('')
  const heldFor = useRef('')
  const moveSlide = useCallback(
    (kind: 'next' | 'back' | 'return' | 'restart', n?: number): string => {
      const { slides: S, idx: i } = live.current
      if (!S.length) return 'There are no slides in this lesson (free talk).'
      const show = (k: number) => {
        lastMove.current = Date.now()
        mood.current.slideUntil = performance.now() + 1600 // glance at the new slide
        slideStart.current = lines.current.length
        slideShownAt.current = Date.now()
        seenSlide.current = S[k].id
        breakLine.current = true
        onGo(S[k].id)
        return `Showing slide ${k + 1} of ${S.length}.`
      }
      if (kind === 'next') {
        if (review.current) {
          review.current = false
          return show(Math.min(S.length - 1, furthest.current))
        }
        return i + 1 >= S.length ? 'Already on the last slide.' : show(i + 1)
      }
      if (kind === 'restart') {
        // start the lesson over: slide 1, and the lesson carries on from there (1, 2, 3…), not back to where they were
        review.current = false
        furthest.current = 0
        // tell the AI tutor plainly: a slide-1 note alone looked like "looking back", and it asked what to look at
        void act({ kind: 'restarted' })
        if (i === 0) {
          slideStart.current = lines.current.length
          slideShownAt.current = Date.now()
          return 'Back at the start of the lesson.'
        }
        return show(0)
      }
      if (kind === 'return') {
        if (!review.current) return 'Already on the lesson slide.'
        review.current = false
        return show(Math.min(S.length - 1, furthest.current))
      }
      const k = Math.round(n ?? 0) - 1
      if (k < 0 || k > furthest.current || k === i) return 'Not a slide you can go back to.'
      furthest.current = Math.max(furthest.current, i)
      review.current = true
      return show(k)
    },
    [onGo, act],
  )

  /* ---------- the AI tutor plays the slide's clip ---------- */
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playedOn = useRef('')
  const firstClip = () =>
    document.querySelector<HTMLMediaElement>('.ai-lesson .slideBox [data-block-id] video, .ai-lesson .slideBox [data-block-id] audio')
  const playClip = useCallback(() => {
    const el = firstClip()
    if (!el) return
    if (el.ended) el.currentTime = 0
    el.muted = false // autoplaying clips start muted
    void el.play().catch(() => undefined)
  }, [])
  const cued = useRef<Line | null>(null)
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checking = useRef(false)
  const turnAgain = useRef(false)
  const checkedSig = useRef('')
  /** keep per-slide tracking right when the slide changed some other way (student buttons, a new lesson) */
  const syncSlide = useCallback(() => {
    const ref = slideRef()
    if (ref && seenSlide.current !== ref.slideId) {
      seenSlide.current = ref.slideId
      slideStart.current = lines.current.length
      slideShownAt.current = Date.now()
      breakLine.current = true
    }
    return ref
  }, [slideRef])
  /**
   * After each pause: the slide check (with a course open) and the action judge (lib/ai-tutor/actions.ts: course,
   * role-plays, whiteboard), in one request. Both are safety nets behind the instant spoken commands.
   */
  const checkTurn = useCallback(async () => {
    const sid = sessionId.current
    if (checking.current) {
      turnAgain.current = true // one is running: look again as soon as it's back (don't drop this turn)
      return
    }
    if (!sid || closing.current || wrapUp.current) return
    const ref = syncSlide()
    const L = lines.current
    const slideLines = ref ? L.slice(slideStart.current) : []
    // the judge only sees what was said since the screen last changed (never an old, already-handled request)
    const recent = L.slice(Math.max(screenAt.current.line, L.length - 10))
    if (!slideLines.length && !recent.length) return
    // just after a slide move or a screen change: look again once it has settled (don't drop this turn)
    const wait = Math.max(lastMove.current, screenAt.current.t) + 2500 - Date.now()
    if (wait > 0) {
      if (turnTimer.current) clearTimeout(turnTimer.current)
      turnTimer.current = setTimeout(() => void checkTurnRef.current(), wait + 50)
      return
    }
    const shot = screenNow.current()
    // role-play ticks only when the student has said something the quick check hasn't looked at (it checked each
    // line twice before, which doubled the cost)
    const rpSig = shot.roleplay ? rpStudentSig() : ''
    const rp = shot.roleplay && rpSig !== rpTickedSig.current ? shot.roleplay : null
    // the welcome call: no slides and no action judge, only role-play ticks
    if (welcome && !rp) return
    const sig = `${L.length}:${L[L.length - 1]?.text.length ?? 0}:${ref?.slideId ?? '-'}:${shot.screen.view}:${shot.screen.board}`
    if (sig === checkedSig.current) return
    checkedSig.current = sig
    checking.current = true
    if (rp) rpTickedSig.current = rpSig
    const asked = Date.now()
    const plain = (x: Line[]) => x.map((l) => ({ from: l.from, text: l.text }))
    const r = await aiTurn(info.bookingId, {
      sessionId: sid,
      ...(ref ? { ...ref, furthest: furthest.current + 1, reviewing: review.current, lines: plain(slideLines.slice(-16)) } : {}),
      ...(welcome ? {} : { screen: shot.screen, courses: shot.courses, scenes: shot.scenes, recent: plain(recent) }),
      ...(rp ? { roleplay: { ...rp, lines: plain(L.slice(rpFrom.current).slice(-24)) } } : {}),
    })
    checking.current = false
    if (turnAgain.current) {
      turnAgain.current = false
      setTimeout(() => void checkTurnRef.current(), 50)
    }
    if (wrapUp.current || closing.current) return
    // role-play: the student's tasks done now (only for the play that was asked about)
    if (r.ticks?.length && rp) tickDo.current(r.ticks, rp.token)
    // the judge: a screen change (already checked on the server; checked again when applied)
    if (r.action && r.action.kind !== 'none') {
      judgeDo.current(r.action, r.quote ?? '', asked)
      return
    }
    // the slide moved some other way meanwhile: don't move it again
    if (!ref || lastMove.current > asked || slideRef()?.slideId !== ref.slideId) return
    if (r.move === 'next') {
      // same rule as the spoken cue: a stray "let's move on" right after a new slide appears mustn't skip it
      const studentSpoke = lines.current.slice(slideStart.current).some((l) => l.from === 'student')
      if (studentSpoke || Date.now() - slideShownAt.current > 20_000) moveSlide('next')
    } else if (r.move === 'return') moveSlide('return')
    else if (r.move === 'back' && r.slide) moveSlide('back', r.slide)
  }, [info.bookingId, slideRef, syncSlide, moveSlide, welcome])
  const checkTurnRef = useRef(checkTurn)
  useEffect(() => {
    checkTurnRef.current = checkTurn
  }, [checkTurn])
  useEffect(() => {
    speechHook.current = (from, line) => {
      // once either side says goodbye near the end, the slide on screen stays as it is
      // (not a goodbye in a role-play, said in character: "See you! Take care!" once froze the welcome talk's last
      // two minutes, and the classroom stopped following the tutor. In the welcome talk, only after its goodbye note)
      const inScene = rpPlaying.current || END_RP.test(line.text)
      // (nor a goodbye the tutor quotes or corrects: "A more natural way is: yeah, see you next time")
      const quoted = (x: string) => x.replace(/["“][^"”]*["”]/g, ' ').replace(/\b(?:natural way (?:is|would be)|you can say|you could say|we (?:usually )?say|try saying)\b[^.!?]*[.!?]?/gi, ' ')
      const early = welcome && !noted.current.has('0')
      if (!wrapUp.current && !inScene && !early && GOODBYE.test(quoted(line.text)) && endsAt.current - (Date.now() + clockOffset) <= GOODBYE_WINDOW_S * 1000) {
        wrapUp.current = true
        if (turnTimer.current) clearTimeout(turnTimer.current)
      }
      const ref = syncSlide()
      if (wrapUp.current) return
      if (from === 'tutor') viewCue.current({ ...line, text: runs.current.tutor.text }, runs.current.tutor.n)
      if (from === 'tutor' && ref) {
        const sentence = line.text.split(/(?<=[.!?])\s+/).find((x) => PLAY_CUE.test(x))
        const armed = playTimer.current !== null
        if ((armed || (sentence && !sentence.trim().endsWith('?'))) && playedOn.current !== line.text.slice(0, 40) + ref.slideId) {
          // wait until the AI tutor has finished its sentence, then play
          if (playTimer.current) clearTimeout(playTimer.current)
          playTimer.current = setTimeout(() => {
            playTimer.current = null
            playedOn.current = line.text.slice(0, 40) + ref.slideId
            playClip()
          }, 900)
        }
      }
      if (from === 'tutor' && ref && cued.current !== line && Date.now() - lastMove.current > 2500) {
        const said = line.text.split(/(?<=[.!?])\s+/).pop() ?? ''
        if (RESTART_CUE.test(said) && !said.trim().endsWith('?')) {
          cued.current = line
          moveSlide('restart')
          return
        }
        if (review.current && RETURN_CUE.test(line.text)) {
          cued.current = line
          moveSlide('return')
          return
        }
        if (NEXT_CUE.test(line.text) && !NOT_YET.test(line.text)) {
          cued.current = line
          // only guard against a slip right after the slide appeared, before the student has said anything
          const studentSpoke = lines.current.slice(slideStart.current).some((l) => l.from === 'student')
          if (studentSpoke || Date.now() - slideShownAt.current > 20_000) moveSlide('next')
          else if (heldFor.current !== ref.slideId) {
            heldFor.current = ref.slideId
            void act({ kind: 'not_yet', missing: ['the student has not had a turn on this slide yet: ask them to try it first'] })
          }
          return
        }
      }
      // after a short pause in the conversation, the safety-net check
      if (turnTimer.current) clearTimeout(turnTimer.current)
      turnTimer.current = setTimeout(() => void checkTurn(), 900)
    }
    return () => {
      if (turnTimer.current) clearTimeout(turnTimer.current)
    }
  }, [moveSlide, checkTurn, syncSlide, act, playClip, clockOffset, welcome])

  /* ---------- tool calls from the AI tutor (opening/closing a lesson, the whiteboard, writing in the chat) ---------- */
  // the whiteboard toggle is defined further down; the tool runner reaches it through these refs
  const whiteboardRef = useRef(props.whiteboard)
  const showBoard = useRef<(on: boolean) => void>(() => {})
  /** resolves once the "lesson opened" note has been sent, so slide notes come after it */
  const lessonNote = useRef<Promise<unknown>>(Promise.resolve())
  const runTool = useCallback(
    async (name: string, argsJson: string): Promise<string> => {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(argsJson || '{}')
      } catch {
        /* empty */
      }
      switch (name) {
        // older sessions may still have the slide tools
        case 'next_slide':
          return moveSlide('next')
        case 'go_back_to_slide':
          return moveSlide('back', Number(args.slide))
        case 'return_to_lesson':
          return moveSlide('return')
        case 'open_lesson': {
          // older sessions: skip if the spoken cue already opened this course
          const cue = cueOpened.current
          if (cue && Date.now() - cue.at < 15_000 && (!args.course_id || String(args.course_id) === cue.courseId)) return 'That course is already open on the screen.'
          const res = await aiOpenLesson(info.bookingId, String(args.course_id ?? ''), String(args.lesson_id ?? ''))
          if ('error' in res) return res.error
          // no reconnect: the lesson note goes first, then each slide's content as it appears
          lessonNote.current = act({ kind: 'lesson', courseId: res.open.courseId, lessonId: res.open.lessonId })
          onOpenLesson(res.open)
          return `Opened ${res.title}. It's on the student's screen now.`
        }
        case 'close_lesson': {
          if (!live.current.slides.length) return 'No course lesson is open: this is already free talk.'
          onCloseCourse()
          return 'Closed. This is free talk now: no slides on the screen. Their place in the course is kept.'
        }
        case 'show_whiteboard': {
          const on = args.on === true
          if (on === whiteboardRef.current) return on ? 'The whiteboard is already on screen.' : 'The whiteboard is already closed.'
          showBoard.current(on)
          return on
            ? "The whiteboard is on the student's screen now. You can't see what they draw: ask them to tell you or type it in the chat."
            : live.current.slides.length
              ? "Back to the slides: the student sees the same slide as before."
              : 'The whiteboard is closed (free talk).'
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
    [moveSlide, sendTutorMessage, onOpenLesson, onCloseCourse, info.bookingId, act],
  )

  /* ---------- connect ---------- */
  const handleEvent = useCallback(
    async (ev: { type: string; [k: string]: unknown }) => {
      // (the logs: every event but the transcript and audio deltas, with the response's status or the error)
      if (!/delta$/.test(ev.type) && !/delta$/.test(String((ev.event as { type?: string } | undefined)?.type ?? ''))) {
        const inner = ev.event as { type?: string; response?: { status?: string; status_details?: unknown } } | undefined
        const err = ev.error as { message?: string; code?: string } | undefined
        const st = inner?.response?.status
        logEv(
          `${ev.type}${inner?.type ? ':' + inner.type : ''}${st ? ' ' + st : ''}${st && st !== 'completed' && inner?.response?.status_details ? ' ' + JSON.stringify(inner.response.status_details).slice(0, 120) : ''}${err ? ' ' + (err.code ?? '') + ' ' + (err.message ?? '').slice(0, 120) : ''}`,
        )
      }
      switch (ev.type) {
        case 'session.started': {
          setStatus('live')
          lastSpeech.current = Date.now()
          nudged.current = false
          // GPT-Live waits for the caller unless told to greet: ask it to open the lesson now,
          // together with the slide on screen (its content reaches the AI tutor only this way)
          {
            const ref = slideRef()
            lastSent.current = ref?.slideId ?? null
            const first = !sessionsStarted.current++
            // a role-play chosen when booking: it opens straight away (after the greeting note, so the tutor
            // greets, then begins the scene in character)
            const booked = first && info.roleplay ? info.roleplay : null
            void (booked ? aiRoleplayScene(booked.sceneId) : Promise.resolve(null)).then((scene) => {
              // the note asks it to greet (or carry on); if it then says nothing, ask it to speak
              void act({ kind: first ? 'start' : 'resume', slide: ref, ...(scene ? { roleplay: scene.title.en } : {}) }).then((ok) => {
                // the greeting: give it time to start by itself (asking too soon restarted it: "Hel- Hi Connor…")
                if (ok && first) speakIfSilent.current(Date.now(), () => lastSaid.current.tutor === 0, 4000)
                if (scene && booked) beginRoleplayRef.current(scene, scene.studentRole, booked.level)
              })
            })
          }
          postEvent(info.bookingId, 'student_joined')
          postEvent(info.bookingId, 'start').then((s) => s && setSession(s))
          break
        }
        case 'session.input_transcript.delta':
          addText('student', String(ev.delta ?? ''), Number(ev.start_ms) || 0, Number(ev.end_ms) || 0)
          if (String(ev.delta ?? '').trim()) feelStudent()
          break
        case 'session.output_transcript.delta':
          setTutorReady(true)
          addText('tutor', String(ev.delta ?? ''), Number(ev.start_ms) || 0, Number(ev.end_ms) || 0)
          feelTutor(String(ev.delta ?? ''))
          break
        case 'response.event': {
          const inner = ev.event as { type?: string; item?: { type?: string; name?: string; arguments?: string; call_id?: string } }
          if (inner?.type === 'response.created') responding.current = true
          if (inner?.type === 'response.done' || inner?.type === 'response.cancelled') responding.current = false
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
    [info.bookingId, info.roleplay, setSession, act, slideRef, addText, runTool, sendEvent, flush, clockOffset, feelTutor, feelStudent, logEv],
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

  /* in the room before the AI tutor may start (only if the device clock is off): keep trying by itself */
  useEffect(() => {
    if (status !== 'too_early') return
    const id = setTimeout(() => void connect(), 15_000)
    return () => clearTimeout(id)
  }, [status, connect])

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
    if (status !== 'live' || !slide || lastSent.current === slide.id || wrapUp.current) return
    lastSent.current = slide.id
    const ref = slideRef()
    const looking = review.current && idx < furthest.current
    if (!ref) return
    const id = slide.id
    // the correction moment: one mistake from the slide before (the latest, so they still remember it), at most one
    // every 2 minutes; the others are saved quietly
    const pend = slideFixes.current
    slideFixes.current = []
    const pick = pend.length && !looking && Date.now() - lastMoment.current > 120_000 ? pend[pend.length - 1] : null
    for (const f of pend) if (f !== pick) saveTerm(f.now, f.ja)
    if (pick) {
      lastMoment.current = Date.now()
      momentCard.current = pick
    }
    void lessonNote.current
      .then(() =>
        act({
          kind: 'slide',
          ...ref,
          slideId: id,
          ...(looking ? { review: { returnTo: furthest.current + 1 } } : {}),
          ...(pick ? { fix: { was: pick.was, now: pick.now } } : {}),
        }),
      )
      .then((ok) => {
        // GPT-Live sometimes just waits after "let's move on to the next slide" (the note itself doesn't make it speak)
        if (ok) speakIfSilent.current(Date.now(), () => lastSent.current === id)
      })
  }, [status, slide, idx, slideRef, act, saveTerm])
  // After a note that should make the AI tutor speak (the greeting, a new slide): if it hasn't started shortly
  // after, ask it to. Never over the student or while its voice is playing; at most twice.
  useEffect(() => {
    speakIfSilent.current = (noteAt, still, wait = 1500) => {
      let tries = 0
      const kick = () => {
        if (closing.current || wrapUp.current || statusRef.current !== 'live' || (still && !still())) return
        // it's talking, or the student has spoken (the tutor answers them as usual)
        if (lastSaid.current.tutor > noteAt || lastSaid.current.student > noteAt) return
        if (speakingRef.current || responding.current) {
          if (++tries <= 4) setTimeout(kick, 1200) // its voice is still playing: look again shortly
          return
        }
        sendEvent({ type: 'response.create' })
        if (++tries <= 1) setTimeout(kick, 4000) // once more if it still says nothing
      }
      setTimeout(kick, wait)
    }
  })

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
      } else if (a.kind === 'lookup' || a.kind === 'save') {
        // quiet background only: reacting to every lookup broke up the lesson
        context(a.kind === 'lookup' ? `(Background, don't react) The student looked up "${a.term}".` : `(Background, don't react) The student saved "${a.term}" to their word bank.`)
      } else void act(a)
    }
    props.bus.addEventListener('student-action', on)
    return () => {
      props.bus.removeEventListener('student-action', on)
      if (actTimer.current) clearTimeout(actTimer.current)
    }
  }, [props.bus, act, context])

  /* audio/video on the slide: tell the AI tutor when it has finished, so it can ask about it */
  const { onLocalMedia } = props
  // While a clip plays, the student's mic is off to the AI tutor (so it doesn't hear the clip
  // through the speakers and react to it), and it's told to stay quiet.
  const micBeforeClip = useRef<boolean | null>(null)
  const onMedia = useCallback(
    (m: Parameters<typeof onLocalMedia>[0]) => {
      onLocalMedia(m)
      if (statusRef.current !== 'live') return
      const tracks = mic.current?.getAudioTracks() ?? []
      if (m.action === 'play') {
        if (micBeforeClip.current === null) micBeforeClip.current = tracks.some((tr) => tr.enabled)
        tracks.forEach((tr) => (tr.enabled = false))
        context('A clip is playing on the student\'s screen now. Stay quiet until you are told it has finished.')
      } else {
        if (micBeforeClip.current !== null) tracks.forEach((tr) => (tr.enabled = micBeforeClip.current!))
        micBeforeClip.current = null
        if (m.action === 'ended') void act({ kind: 'media', text: 'the audio/video on the slide just finished playing. Ask the student about it now.' })
      }
    },
    [onLocalMedia, act, context],
  )

  /* ---------- clock + time notes ---------- */
  const [now, setNow] = useState(() => Date.now() + clockOffset)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 1000)
    return () => clearInterval(id)
  }, [clockOffset])
  // The clock starts counting the moment the AI tutor first speaks. The server's end has ~20 s
  // spare for connecting; counting only from that end made the clock sit at the full length for
  // the first few seconds of the lesson. Never later than the server's end.
  const [clockEnd, setClockEnd] = useState<number | null>(null)
  useEffect(() => {
    if (!tutorReady || status !== 'live' || clockEnd !== null) return
    const id = setTimeout(() => setClockEnd(Math.min(endsAt.current, Date.now() + clockOffset + info.durationMinutes * 60_000)), 0)
    return () => clearTimeout(id)
  }, [tutorReady, status, clockEnd, clockOffset, info.durationMinutes])
  const left = Math.min(info.durationMinutes * 60, Math.max(0, ((clockEnd ?? endsAt.current) - now) / 1000))
  const noted = useRef<Set<string>>(new Set())
  const timeUp = useRef(false)
  useEffect(() => {
    if (status !== 'live') return
    // the server picks the wording from the booked end; the AI tutor keeps teaching until ~20 s before
    const note = (k: string) => {
      if (noted.current.has(k)) return
      noted.current.add(k)
      void act({ kind: 'time', left: Math.round(left) })
    }
    // (the welcome talk: a "keep going" reminder at 1:30 left, then the goodbye)
    if (!welcome) {
      if (left <= 300 && left > 120) note('5')
      if (left <= 120 && left > 60) note('2')
      if (left <= 60 && left > 25) note('1')
    }
    if (left <= 25) note('0')
    if (left <= 30) wrapUp.current = true
    // after the goodbye note, once both have said goodbye and the tutor has finished: end now. (It used to wait for
    // 0:00, and the goodbyes were often over 5-10 s before that: the student sat looking at a silent tutor.)
    const T0 = Date.now()
    const L0 = lines.current
    const lastLine = L0[L0.length - 1]
    // (by the transcript's timing only: the "is its voice still playing" signal can stay on, and the call then waited)
    const bye = (l: Line | undefined) => !!l && !END_RP.test(l.text) && GOODBYE.test(l.text)
    const quiet = T0 - lastSaid.current.tutor >= 1500 && T0 - lastSaid.current.student >= 1500
    const recent = L0.slice(-4)
    const byeDone =
      noted.current.has('0') &&
      // (never an in-character goodbye in a role-play: "See you! Take care!")
      !rpPlaying.current &&
      quiet &&
      // the tutor's goodbye last (with theirs before it, or 3 s of quiet), or theirs last after the tutor's: once the
      // student's "Bye bye" came last, and the call waited for 0:00
      ((lastLine?.from === 'tutor' && bye(lastLine) && (recent.some((l) => l.from === 'student' && bye(l)) || T0 - lastSaid.current.tutor >= 3000)) ||
        (lastLine?.from === 'student' && bye(lastLine) && recent.some((l) => l.from === 'tutor' && bye(l))))
    // 0:00 ends it at once: the end screen shows and the call closes quietly behind it (the server's sweep also hangs
    // up, as a backstop). The few seconds' grace for a goodbye still being said felt like a wait every time.
    if ((left <= 0 || byeDone) && !timeUp.current) {
      logEv(`end:${byeDone ? 'goodbyes' : 'time'} left=${Math.round(left)}`)
      timeUp.current = true
      closing.current = true
      gen.current++ // ignore anything the session still sends
      sendEvent({ type: 'session.close' })
      flush(true)
      setStatus('ended')
    }
  }, [left, now, status, act, sendEvent, flush, welcome, clockOffset, logEv])

  useEffect(() => {
    if (speaking) setTutorReady(true)
  }, [speaking])

  /* ---------- the calling screen's intro ---------- */
  // a new one each time the calling screen shows; a layout effect, so the avatar's first frame already has it
  useLayoutEffect(() => {
    if (status !== 'connecting' || tutorReady) return
    if (intro.current?.phase !== 'wait') intro.current = newIntro(pickIntro(!!info.aiWelcome), performance.now())
    setIntroDone(false)
  }, [status, tutorReady, info.aiWelcome])
  // connected: play the reveal; the calling screen stays until it's over (and the AI tutor has started talking)
  useEffect(() => {
    // the reveal plays when the AI tutor starts talking (not when the line connects), so the student enters the
    // room as it says hello, rather than to a tutor that's been waiting
    if (status !== 'live' || introDone || !tutorReady) return
    const i = intro.current
    if (i?.phase === 'wait') introLive(i, performance.now())
    const left = i?.phase === 'live' ? INTRO_REVEAL_MS - (performance.now() - i.t0) : 0
    const id = setTimeout(() => setIntroDone(true), Math.max(0, left))
    return () => clearTimeout(id)
  }, [status, introDone, tutorReady])
  // couldn't connect: a short ending before the calling screen fades and the tile shows Reconnect
  useEffect(() => {
    if (status !== 'failed' && status !== 'dropped' && status !== 'too_early') return
    const i = intro.current
    if (i?.phase !== 'wait') return
    introFailed(i, performance.now())
    setIntroHold(true)
    const id = setTimeout(() => setIntroHold(false), INTRO_FAIL_MS)
    return () => {
      clearTimeout(id)
      setIntroHold(false)
    }
  }, [status])
  const calling = ((status === 'connecting' || status === 'live') && !(tutorReady && introDone)) || introHold
  useEffect(() => {
    if (status !== 'live' || tutorReady) return
    const id = setTimeout(() => setTutorReady(true), 12_000)
    return () => clearTimeout(id)
  }, [status, tutorReady])

  /* ---------- quiet for a while → remind the AI tutor to lead ---------- */
  // GPT-Live sometimes waits after a slide is finished; nudge it once per silence
  useEffect(() => {
    if (status !== 'live' || !tutorReady || left <= 30 || nudged.current) return
    // waiting for the student's choice (the role-play list, or the mission-complete question): never hurry them
    if (waitingForChoice.current) return
    // the welcome call: its cards wait for an answer, and mission complete moves on by itself
    if (welcome && wStepRef.current === 'suggest') return
    // during a role-play the hints come first (6, 12, 18 s): the AI tutor is only reminded after 25 s
    // (the welcome call keeps the conversation going sooner: a first call shouldn't have long silences)
    if (Date.now() - lastSpeech.current < (rpPlaying.current ? 25_000 : welcome ? 7000 : 9000)) return
    nudged.current = true
    void act({
      kind: 'nudge',
      where: rpPlaying.current ? 'roleplay' : welcome ? 'welcome' : live.current.slides.length ? 'slides' : 'free',
      ...(welcome && wStepRef.current ? { step: wStepRef.current === 'command' && wSaidAt.current !== null ? 'command_said' : wStepRef.current } : {}),
    })
  }, [now, left, status, tutorReady, act, welcome])

  useEffect(() => {
    if (status === 'ended') {
      postEvent(info.bookingId, 'end')
      // the welcome call ends on its own screen (below); About me is saved (again, if anything changed)
      if (welcome) return void wSave.current()
      const id = setTimeout(() => onLeave({ ended: true }), 1500)
      return () => clearTimeout(id)
    }
  }, [status, info.bookingId, onLeave, welcome])

  /* ---------- tutor speaking indicator ---------- */
  const tutorDot = useVolDot(remoteStream, false)
  // the AI tutor's voice level drives its orb
  const voiceLevel = useRef(0)
  useAudioLevel(remoteStream, (v) => {
    voiceLevel.current = v
  })
  // no tile for the student: the mic button's ring grows with their voice
  const micBtn = useRef<HTMLButtonElement | null>(null)
  // (and when the student last spoke, by their mic's level: the transcript sometimes loses words said over the tutor)
  const micVoiceAt = useRef(0)
  const micLoudFrom = useRef(0)
  useAudioLevel(micOn ? micStream : null, (v) => {
    micBtn.current?.style.setProperty('--lv', v.toFixed(2))
    const T = Date.now()
    if (v < 0.35) micLoudFrom.current = 0
    else if (!micLoudFrom.current) micLoudFrom.current = T
    else if (T - micLoudFrom.current > 400) micVoiceAt.current = T
  })
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

  /* ---------- the AI panel (free talk only): the role-play / course picker and role-plays ---------- */
  const [panel, setPanel] = useState<PanelState | null>(null)
  // a course opening (by voice, tap or the AI tutor) puts the panel away: it's for free talk only
  if (panel && !freeTalk) setPanel(null)
  const panelOn = !!panel && freeTalk && !props.whiteboard
  const panelBoxRef = useRef<HTMLDivElement | null>(null)
  const [rpList, setRpList] = useState<SceneSummary[] | null>(null)
  const [courseList, setCourseList] = useState<PanelCourse[] | null>(null)
  const [mission, setMission] = useState<Mission>(newMission)
  /* the welcome talk's screen state (it's led by the tutor; the classroom follows further down) */
  const [wStep, setWStep] = useState<WelcomeStep | null>(null)
  const [wFacts, setWFacts] = useState<Facts>({})
  const [wAbout, setWAbout] = useState<WAbout>('ask')
  const [wScene, setWScene] = useState<Scene | null>(null)
  const [wPhrase, setWPhrase] = useState('')
  const [wLit, setWLit] = useState<boolean[]>([])
  const [wHeard, setWHeard] = useState(false)
  const [wCleared, setWCleared] = useState<number | null>(null)
  const [wNext, setWNext] = useState<NextUp[]>([])
  /** the voice command, tried out: said, and the course preview on screen (lesson 1, slide 1) */
  const [wSaid, setWSaid] = useState(false)
  const [wPreview, setWPreview] = useState<{ loaded: LoadedCourse; slide: Slide; title: string } | null>(null)
  /** the welcome card on screen (the same card as corrections, so the AI tutor floats above it) */
  const wCard: 'suggest' | 'command' | null = !welcome || status !== 'live' ? null : wStep === 'suggest' && wScene ? 'suggest' : wStep === 'command' ? 'command' : null
  const lang = info.uiLang === 'en' ? 'en' : 'ja'
  const openPicker = useCallback(
    (mode: 'rp' | 'course' = 'rp') => {
      if (whiteboardRef.current) showBoard.current(false)
      pickerAt.current = Date.now()
      setPanel({ view: 'picker', mode, rpSel: null, courseSel: null })
      void aiRoleplays().then(setRpList)
      void aiCourses().then(setCourseList)
      void act({ kind: 'panel', what: 'picker' })
    },
    [act],
  )
  const closePanel = useCallback(() => {
    setPanel(null)
    void act({ kind: 'panel', what: 'closed' })
  }, [act])
  /** a play of a scene: the first time, again, or with the roles swapped */
  const beginRoleplay = useCallback(
    (scene: Scene, role: RoleId, level: LevelIndex, told = false) => {
      rpToken.current++
      rpCur.current = { token: rpToken.current, scene, role, level }
      rpFrom.current = lines.current.length
      rpFixes.current = new Map()
      rpFixShown.current = []
      setRpFixList([])
      allDoneSent.current = false
      hintAskAt.current = 0
      setMission(newMission())
      setPanel({ view: 'roleplay', scene, role, level, phase: 'play' })
      // the tutor sets the scene first ("We're at a café… Ready?"): if it doesn't start talking, ask it to. (The
      // welcome talk told it the scene already, before it opened: it starts as soon as the student says the phrase.)
      if (told) speakIfSilent.current(Date.now())
      else void act({ kind: 'roleplay', sceneId: scene.id, role, level }).then((ok) => ok && speakIfSilent.current(Date.now()))
    },
    [act],
  )
  useEffect(() => {
    beginRoleplayRef.current = beginRoleplay
  }, [beginRoleplay])
  const startRoleplay = useCallback(
    async (s: SceneSummary) => {
      const scene = await aiRoleplayScene(s.id)
      if (!scene) return
      beginRoleplay(scene, scene.studentRole, s.next)
    },
    [beginRoleplay],
  )
  const openCourseFromPanel = useCallback(
    async (c: PanelCourse) => {
      const res = await aiOpenLesson(info.bookingId, c.id, '')
      if ('error' in res) {
        void act({ kind: 'view', what: 'open_failed' })
        return
      }
      cueOpened.current = { at: Date.now(), courseId: res.open.courseId }
      lessonNote.current = act({ kind: 'lesson', courseId: res.open.courseId, lessonId: res.open.lessonId })
      setPanel(null)
      onOpenLesson(res.open)
    },
    [act, info.bookingId, onOpenLesson],
  )
  // the role-play list is needed for voice ("let's do the café one") even before the panel opens
  useEffect(() => {
    if (freeTalk && rpList === null && !welcome) void aiRoleplays().then(setRpList)
  }, [freeTalk, rpList, welcome])
  // what's said → what the panel does (free talk only, while the AI tutor is connected)
  useEffect(() => {
    panelSaid.current = (who, text) => {
      if (!freeTalk || status !== 'live') return null
      const mode = panel?.view === 'picker' ? panel.mode : 'rp'
      const items = {
        rp: (rpList ?? []).map((x) => ({ id: x.id, en: x.title.en, ja: x.title.ja })),
        course: (courseList ?? []).map((c) => ({ id: c.id, en: c.title, ja: c.titleJa })),
      }
      const view = panel ? (panel.view === 'roleplay' && panel.phase === 'done' ? 'done' : panel.view) : null
      return panelIntent(text, who, view, items, mode)
    }
    panelDo.current = (i) => {
      if (i.kind === 'swap' || i.kind === 'again') {
        if (panel?.view !== 'roleplay' || panel.phase !== 'done') return
        if (i.kind === 'swap' && panel.role !== panel.scene.studentRole) return // swapped already: back to their own role is "again" in it
        return beginRoleplay(panel.scene, i.kind === 'swap' ? otherRole(panel.role) : panel.role, panel.level)
      }
      if (i.kind === 'next') return openPicker('rp')
      if (i.kind === 'open') return openPicker(i.mode)
      if (i.kind === 'close') return closePanel()
      if (i.kind === 'mode') return setPanel((p) => (p?.view === 'picker' ? { ...p, mode: i.mode } : p))
      if (i.kind === 'pick')
        return setPanel((p) => (p?.view === 'picker' ? (p.mode === 'course' ? { ...p, courseSel: i.id } : { ...p, rpSel: i.id }) : p))
      // start: a course (course mode), or a role-play by name or the one that's chosen
      if (panel?.view === 'picker' && panel.mode === 'course') {
        const c = courseList?.find((x) => x.id === (i.id ?? panel.courseSel)) ?? courseList?.[0]
        if (c) void openCourseFromPanel(c)
        return
      }
      const id = i.id ?? (panel?.view === 'picker' ? panel.rpSel : null)
      const sc = rpList?.find((x) => x.id === id) ?? (i.id ? null : rpList?.[0])
      if (sc) void startRoleplay(sc)
    }
  })

  /* ---------- layout: no camera tiles; the AI tutor floats beside or under the panel / slide (lib/classroom/layout.ts) ---------- */
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<HTMLDivElement | null>(null)
  const slideBoxRef = useRef<HTMLDivElement | null>(null)
  const otherRef = useRef<HTMLDivElement | null>(null)
  const showSlide = !freeTalk || props.whiteboard || !!wPreview
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
    // a card at the bottom (a correction, the welcome call's cards): the AI tutor floats above it
    // (over a slide or the panel, the room is shortened by the card instead, so it covers nothing)
    const card = Array.from(box.children).find((el) => el.classList.contains('aic')) as HTMLElement | undefined
    const ch = card?.offsetHeight ?? 0
    const main = panelOn ? 'panel' : showSlide ? 'slide' : 'none'
    const res = computeAiLayout(box.clientWidth, main !== 'none' && ch ? Math.max(120, box.clientHeight - ch - 22) : box.clientHeight, { main, ratio: 3 / 4, card: main === 'none' ? ch : 0 })
    if (!res) return
    place(slideBoxRef.current, panelOn ? null : res.main)
    place(panelBoxRef.current, panelOn ? res.main : null)
    place(otherRef.current, res.tutor)
    if (appRef.current) {
      appRef.current.dataset.mode = res.mode
      appRef.current.style.setProperty('--lift', res.lift.toFixed(1) + 'px')
    }
  }, [place, showSlide, panelOn])
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

  // a card appearing, changing size (the About-you rows fill in) or going: place the tutor again
  const cardKey = `${status === 'live' ? (shown?.id ?? '') : ''}:${wCard ?? ''}`
  useLayoutEffect(() => {
    const box = layoutRef.current
    const el = box ? (Array.from(box.children).find((x) => x.classList.contains('aic')) as HTMLElement | undefined) : undefined
    doLayout()
    if (!el) return
    const ro = new ResizeObserver(() => doLayout())
    ro.observe(el)
    return () => ro.disconnect()
  }, [cardKey, doLayout])

  /* ---------- drawing + whiteboard (the student's own; the AI tutor can't see them) ---------- */
  const [tbOpen, setTbOpen] = useState(false)
  const surface = props.whiteboard ? 'board' : ((wPreview?.slide ?? slide)?.id ?? '')
  const { closeLookup, setWhiteboard, whiteboard, ink } = props
  useEffect(() => {
    closeLookup()
  }, [surface, closeLookup])
  const setBoard = useCallback(
    (on: boolean) => {
      setWhiteboard(on)
      if (on) {
        setTbOpen(true)
        if (ink.tool === 'select') ink.setTool('pen')
      } else if (freeTalk) setTbOpen(false)
    },
    [setWhiteboard, ink, freeTalk],
  )
  const toggleWhiteboard = useCallback(() => setBoard(!whiteboard), [setBoard, whiteboard])
  useEffect(() => {
    whiteboardRef.current = whiteboard
    showBoard.current = setBoard
  }, [whiteboard, setBoard])

  /* ---------- role-plays (phase 3b): ticks, the twist, the end of the scene, hints ---------- */
  const playing = panel?.view === 'roleplay' && panel.phase === 'play' ? panel : null
  useEffect(() => {
    missionRef.current = mission
    rpPlaying.current = !!playing && panelOn
    waitingForChoice.current = panelOn && (panel?.view === 'picker' || (panel?.view === 'roleplay' && panel.phase === 'done'))
    pickerShown.current = panelOn && panel?.view === 'picker'
  })
  useEffect(() => {
    // ticks from the turn check: only for this play, only tasks on the list (checked on the server too)
    tickDo.current = (ticks, token) => {
      const cur = rpCur.current
      if (!cur || token !== rpToken.current || token !== cur.token) return
      setMission((m) => {
        const L = roleOf(cur.scene, cur.role).levels[cur.level]
        const done = { ...m.done }
        let added = false
        for (const x of ticks) {
          if (done[x.id]) continue
          done[x.id] = x.said
          added = true
        }
        if (!added) return m
        // 上級, some scenes: once the twist's trigger task is done, the twist's task joins the list
        const twisted = m.twisted || (!!L.twist && !!done[L.twist.after])
        return { ...m, done, twisted, hint: 0 }
      })
    }
    // the scene is over (the AI tutor said "That's the end of the role-play!", or every task was done a while ago)
    completeRp.current = () => {
      const cur = rpCur.current
      if (!playing || !cur || cur.token !== rpToken.current) return
      const token = cur.token
      const finishedAt = Date.now()
      doneAt.current = finishedAt
      setPanel((p) => (p?.view === 'roleplay' && p.phase === 'play' ? { ...p, phase: 'done', finishedAt } : p))
      const L = lines.current
      // one last look at the whole scene before the results: a task done in the last few seconds still counts
      // (before, a tick that came back a moment after the end was lost, and the feedback asked for what they'd said)
      const m0 = missionRef.current
      const sid = sessionId.current
      const plain = (x: Line[]) => x.map((l) => ({ from: l.from, text: l.text }))
      const left0 = tasksFor(roleOf(cur.scene, cur.role).levels[cur.level], m0.twisted).filter((x) => !m0.done[x.id]).length
      const last: Promise<{ id: string; said: string }[]> = sid && left0
        ? aiTurn(info.bookingId, {
            sessionId: sid,
            roleplay: { sceneId: cur.scene.id, role: cur.role, level: cur.level, twisted: m0.twisted, done: Object.keys(m0.done), lines: plain(L.slice(rpFrom.current).slice(-30)) },
          }).then((r) => r.ticks ?? [])
        : Promise.resolve([])
      // a tick that comes back after the results were sent still shows on the screen
      void last.then((ticks) => ticks.length && tickDo.current(ticks, token))
      // their mistakes in the scene: the helper's card for each of their lines, made while they played (usually ready)
      const fixes = Promise.all(
        [...rpFixes.current.entries()].map(([l, p]) =>
          p.card.then((c) => (c && c.kind === 'correction' && !sameWords(c.now, l.text) ? { was: l.text.trim(), now: c.now, ja: c.ja } : null)).catch(() => null),
        ),
      ).then((xs) => {
        const out: { was: string; now: string; ja: string }[] = []
        for (const x of xs) if (x && !out.some((o) => sameWords(o.now, x.now))) out.push(x)
        return out.slice(0, 3)
      })
      // (at most 3 s: waiting up to 8 s for a slow check left a long silence before the feedback. A tick that comes
      // later still shows on the screen; a mistake found later isn't listed)
      const within = <T,>(p: Promise<T>, empty: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(empty), 3000))])
      void Promise.all([within(last, []), within(fixes, [])]).then(([ticks, found]) => {
        if (rpToken.current !== token) return
        if (ticks.length) tickDo.current(ticks, token)
        // ✎ on the results screen, saved to their word list (as a card would have been), and told to the tutor
        rpFixShown.current = found.map((f) => ({ was: f.was, now: f.now }))
        setRpFixList(rpFixShown.current)
        for (const f of found) saveTerm(f.now, f.ja)
        const lv = roleOf(cur.scene, cur.role).levels[cur.level]
        const doneMap = { ...missionRef.current.done }
        for (const x of ticks) if (!doneMap[x.id]) doneMap[x.id] = x.said
        const twisted = missionRef.current.twisted || (!!lv.twist && !!doneMap[lv.twist.after])
        const tasks = tasksFor(lv, twisted)
        const done = tasks.filter((x) => doneMap[x.id])
        const missed = tasks.filter((x) => !doneMap[x.id])
        // progress: every task done, or all but one of a longer list (a missed tick shouldn't hold them back)
        if (missed.length === 0 || (missed.length === 1 && tasks.length >= 4)) {
          // the welcome call: through its own route (the student may not have the AI plan yet)
          if (welcome) void welcomeRecord(info.bookingId, cur.scene.id).then((n) => n !== null && setWCleared(n))
          else void recordRoleplay(cur.scene.id, cur.role, cur.level).then(() => void aiRoleplays().then(setRpList))
        }
        void act({
          kind: 'roleplay_done',
          sceneId: cur.scene.id,
          role: cur.role,
          done: done.map((x) => ({ task: x.title.en, said: doneMap[x.id] })),
          missed: missed.map((x) => x.title.en),
          canSwap: !welcome && cur.role === cur.scene.studentRole,
          welcome,
          fixes: rpFixShown.current,
        })
      })
    }
    quickTicks.current = () => {
      const cur = rpCur.current
      const sid = sessionId.current
      if (!cur || !rpPlaying.current || !sid || closing.current || cur.token !== rpToken.current) return
      if (rpTicking.current) {
        rpTickAgain.current = true
        return
      }
      rpTicking.current = true
      rpTickedSig.current = rpStudentSig()
      const m = missionRef.current
      const plain = (x: Line[]) => x.map((l) => ({ from: l.from, text: l.text }))
      void aiTurn(info.bookingId, {
        sessionId: sid,
        roleplay: { sceneId: cur.scene.id, role: cur.role, level: cur.level, twisted: m.twisted, done: Object.keys(m.done), lines: plain(lines.current.slice(rpFrom.current).slice(-24)) },
      }).then((r) => {
        rpTicking.current = false
        if (r.ticks?.length) tickDo.current(r.ticks, cur.token)
        if (rpTickAgain.current) {
          rpTickAgain.current = false
          quickTicks.current()
        }
      })
    }
    hintAsk.current = () => {
      hintAskAt.current = Date.now()
      setMission((m) => ({ ...m, hint: Math.min(3, m.hint + 1) }))
    }
  })
  // every task done: tell the AI tutor to end the scene; if it doesn't, the screen moves on by itself
  const allDone = !!playing && tasksFor(roleOf(playing.scene, playing.role).levels[playing.level], mission.twisted).every((x) => mission.done[x.id])
  useEffect(() => {
    if (!allDone || allDoneSent.current) return
    allDoneSent.current = true
    void act({ kind: 'roleplay_tasks_done' })
    const token = rpToken.current
    const id = setTimeout(() => {
      if (rpToken.current === token && rpPlaying.current) completeRp.current()
    }, 15_000)
    return () => clearTimeout(id)
  }, [allDone, act])
  // hints: on the student's turn (the AI tutor spoke last), after a silence of 6, 12 and 18 s; talking hides them
  useEffect(() => {
    if (!playing || !panelOn || speakingRef.current) return
    const { student, tutor } = lastSaid.current
    const since = Math.max(student, tutor, mission.startedAt, hintAskAt.current)
    if (student > tutor && student > hintAskAt.current) {
      if (mission.hint) setMission((m) => ({ ...m, hint: 0 }))
      return
    }
    if (tutor === 0) return // it hasn't started the scene yet
    const want = Math.min(3, mission.hint + (Date.now() - since >= 6000 ? 1 : 0))
    if (want > mission.hint) {
      hintAskAt.current = Date.now() // the next step counts from here
      setMission((m) => ({ ...m, hint: want }))
    }
  }, [now, playing, panelOn, mission.hint, mission.startedAt])

  /* ---------- the welcome talk (lib/classroom/welcome.ts): the tutor leads it; the classroom follows ---------- */
  const wStepAt = useRef(0)
  /** the transcript line the current step began at */
  const wFrom = useRef(0)
  const wFactsRef = useRef<Facts>({})
  const wAboutRef = useRef<WAbout>('ask')
  const wSceneRef = useRef<Scene | null>(null)
  const wPhraseRef = useRef('')
  /** when they finished saying the whole phrase (0 = not yet): the scene opens once they've stopped */
  const wHeardAt = useRef(0)
  const wAsking = useRef(false)
  const wAskAgain = useRef(false)
  const wAskTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** the role-play chosen for them (the helper, in the background), and whether its scene is being loaded */
  const wPick = useRef<WelcomePick | null>(null)
  const wLoading = useRef(false)
  const wReadySent = useRef(false)
  /** the transcript line where the tutor taught "Let's do a role-play" */
  const wTaughtLine = useRef(-1)
  const wTaughtAt = useRef(0)
  /** the student's lines already corrected (or checked), and the course preview loaded ahead */
  const wPreviewNext = useRef<Promise<{ loaded: LoadedCourse; slide: Slide; title: string } | null> | null>(null)
  const wSuggestSent = useRef(false)
  const wWrapSent = useRef(false)
  const wOpening = useRef(false)
  /** when they said the voice command (null = not yet) */
  const wSaidAt = useRef<number | null>(null)
  const wWaitAt = useRef(0)
  const wGo = useRef<(to: WelcomeStep) => void>(() => {})
  const wOpen = useRef<() => void>(() => {})
  const wSave = useRef<() => void>(() => {})
  const wSavedJson = useRef('')
  const wAsk = useRef<() => void>(() => {})
  const wLoadPick = useRef<() => void>(() => {})
  const wPrepare = useRef<() => Promise<Scene | null>>(() => Promise.resolve(null))
  const wSceneP = useRef<Promise<Scene | null> | null>(null)
  const wSendReady = useRef<() => void>(() => {})
  const setFacts = useCallback((f: Facts) => {
    wFactsRef.current = f
    setWFacts(f)
  }, [])
  const setAbout = useCallback((a: WAbout) => {
    wAboutRef.current = a
    setWAbout(a)
  }, [])
  useEffect(() => () => void (wAskTimer.current && clearTimeout(wAskTimer.current)), [])
  /** a gap between turns: neither of them is talking */
  const wGap = () => {
    const T = Date.now()
    return !speakingRef.current && !responding.current && T - lastSaid.current.tutor > 1000 && T - lastSaid.current.student > 1000
  }
  useEffect(() => {
    if (!welcome) return
    const studentSince = (k: number) =>
      lines.current
        .slice(k)
        .filter((l) => l.from === 'student')
        .map((l) => l.text)
        .join(' ')
    // the helper, quietly: what they've said about themselves, for the end screen (nothing is shown in the call)
    wAsk.current = () => {
      const sid = sessionId.current
      if (!sid || closing.current) return
      if (wAsking.current) {
        wAskAgain.current = true
        return
      }
      wAsking.current = true
      const recent = lines.current.slice(-24).map((l) => ({ from: l.from, text: l.text }))
      void welcomeAbout(info.bookingId, sid, recent).then((r) => {
        wAsking.current = false
        const next = { ...wFactsRef.current, ...r.facts }
        if (FACT_KEYS.some((k) => next[k] !== wFactsRef.current[k])) {
          setFacts(next)
          // (an answer read after the questions were over: saved too)
          if (wStepRef.current && wStepRef.current !== 'about') wSave.current()
        }
        // the role-play for them (until it's on screen)
        if (r.pick && !wSceneRef.current) wPick.current = r.pick
        // once they've said what they do (the pick goes by their job first): the scene is fixed and loaded, quietly
        if (r.pick && next.job && !wSceneP.current) void wPrepare.current()
        // all three questions answered: now the tutor gets the role-play (step 3). Never before: told about it during the
        // questions, "for later", it dropped the other two questions and went straight to the role-play
        if (wStepRef.current === 'about' && FACT_KEYS.every((k) => next[k])) wSendReady.current()
        if (wAskAgain.current) {
          wAskAgain.current = false
          wAsk.current()
        }
      })
    }
    // About me is saved by itself (so the tutor knows them next time, even if they close the tab without looking at
    // the end screen): once the questions are over, and again at the end if anything changed. They can check and edit
    // it on the end screen (or in their AI tutor settings); an edit is saved the same way
    wSave.current = () => {
      const f = wFactsRef.current
      const j = JSON.stringify(f)
      if (!factCount(f) || j === wSavedJson.current) return
      wSavedJson.current = j
      setAbout('saved')
      logEv('welcome:about-saved')
      void welcomeSave(info.bookingId, f).then((aboutMe) => {
        if (aboutMe !== null) return
        wSavedJson.current = ''
        setAbout('ask')
        props.toast(t('wlSaveFailed'), 'bad')
      })
    }
    // the role-play chosen for them, loaded when the phrase is said (by the tutor teaching it, or the student): its card
    /** the role-play for them: loaded, and the tutor told about it (for later), once */
    wPrepare.current = () => {
      if (!wSceneP.current)
        wSceneP.current = (async () => {
          const pick = wPick.current ?? FALLBACK_PICK
          let sc = await welcomeScene(info.bookingId, pick.sceneId)
          if (!sc && pick.sceneId !== FALLBACK_PICK.sceneId) sc = await welcomeScene(info.bookingId, FALLBACK_PICK.sceneId)
          if (!sc || (wStepRef.current !== 'about' && wStepRef.current !== null)) return null
          wSceneRef.current = sc
          return sc
        })()
      return wSceneP.current
    }
    /** step 3: the tutor is told to teach the phrase (once). The scene comes when they say it and it opens */
    wSendReady.current = () => {
      if (wReadySent.current) return
      wReadySent.current = true
      logEv('welcome:roleplay-time')
      void act({ kind: 'welcome', step: 'suggest' })
    }
    // the tutor teaches "Let's do a role-play": the card (the scene is usually ready already)
    wLoadPick.current = () => {
      if (wLoading.current) return
      wLoading.current = true
      // (if the questions note hasn't gone yet: the tutor started step 3 itself, or they said the phrase first)
      wSendReady.current()
      void wPrepare.current().then((sc) => {
        wLoading.current = false
        if (!sc || wStepRef.current !== 'about') return
        wPhraseRef.current = ROLEPLAY_PHRASE
        setWScene(sc)
        setWPhrase(ROLEPLAY_PHRASE)
        setWLit([])
        wGo.current('suggest')
      })
    }
    wOpen.current = () => {
      const sc = wSceneRef.current
      if (wOpening.current || (wStepRef.current !== 'suggest' && wStepRef.current !== 'about') || !sc) return
      wOpening.current = true
      wGo.current('roleplay')
      // (the scene note goes now, with the panel: the tutor says "Great!" and waits for it)
      beginRoleplay(sc, sc.studentRole, 0, false)
    }
    wGo.current = (to) => {
      if (wStepRef.current === to) return
      logEv(`welcome:${to}`)
      // the questions are over: what they said about themselves is saved now
      if (wStepRef.current === 'about') wSave.current()
      wStepRef.current = to
      wStepAt.current = Date.now()
      wFrom.current = lines.current.length
      setWStep(to)
      // a welcome card takes the card's place: a correction still up is saved as it goes
      if (to === 'suggest' || to === 'command') {
        const prev = shownRef.current?.card
        if (prev) saveTerm(prev.kind === 'correction' ? prev.now : prev.options[0].text, prev.kind === 'correction' ? prev.ja : prev.heard)
        setShown(null)
      }
      if (to === 'command') setPanel(null)
      // the course preview, loaded ahead (it lagged when it was only fetched once they'd said it)
      if ((to === 'done' || to === 'command') && !wPreviewNext.current) wPreviewNext.current = loadPreview()
      if (to === 'qa') {
        setPanel(null)
        setWPreview(null)
      }
    }
    welcomeHear.current = (said) => {
      const step = wStepRef.current
      if (step === 'about' || step === 'suggest') {
        // a moment after they stop, the helper looks at what they've said (for the end screen)
        if (wAskTimer.current) clearTimeout(wAskTimer.current)
        wAskTimer.current = setTimeout(() => wAsk.current(), 1500)
      }
      // they say it before the tutor has taught it: the one for them is loaded and opens
      if (step === 'about' && SAYS_ROLEPLAY.test(said)) {
        wHeardAt.current = Date.now()
        setWHeard(true)
        wLoadPick.current()
      }
      if (step === 'suggest' && wSceneRef.current && !wHeardAt.current) {
        // "Let's do a role-play": it opens once they've stopped. Also "Let's do a…" when the transcript cut the rest
        // off (it did, as the tutor started talking over them)
        const h = heardPhrase(studentSince(wFrom.current), wPhraseRef.current)
        setWLit(h.lit)
        if (h.whole || SAYS_ROLEPLAY.test(said) || (h.lit[0] && h.lit[1])) {
          logEv(`welcome:heard "${said.slice(-40)}"`)
          wHeardAt.current = Date.now()
          setWHeard(true)
        }
      }
      if (step === 'command' && wSaidAt.current === null && commandSaid(said)) {
        // "Open the course": the first slide of a course's first lesson, as a preview
        wSaidAt.current = Date.now()
        setWSaid(true)
        // it once said nothing after it (15 s, until the silence note): ask it to answer if it hasn't started
        speakIfSilent.current(Date.now(), () => wStepRef.current === 'command', 2500)
        void (wPreviewNext.current ?? (wPreviewNext.current = loadPreview())).then((p) => {
          if (p && wStepRef.current === 'command') setWPreview(p)
        })
      }
    }
    /** the first slide of a course's first lesson (a course picked at random), for the voice-command preview */
    function loadPreview() {
      return (async () => {
        const list = await aiCourses()
        const c = list[Math.floor(Math.random() * list.length)]
        const loaded = c ? await fetchCourse(info.bookingId, c.id) : null
        const sl = loaded?.course.units[0]?.lessons[0]?.slides[0]
        return c && loaded && sl ? { loaded, slide: sl, title: lang === 'ja' ? c.titleJa : c.title } : null
      })()
    }
    // the classroom follows the tutor's set sentences
    welcomeTutor.current = (sentence) => {
      const step = wStepRef.current
      // it teaches "Let's do a role-play": the card, with the role-play chosen for them
      const k = lines.current.length - 1
      if (step === 'about' && SAYS_ROLEPLAY.test(sentence)) {
        wTaughtLine.current = k
        wTaughtAt.current = Date.now()
        wLoadPick.current()
      }
      // it opens only once the student has said the phrase (welcomeHear). The one fallback: the tutor starts setting
      // the scene and their mic heard them speak after it taught the phrase (the transcript has lost their words,
      // said over the tutor's, more than once)
      else if (
        (step === 'suggest' || step === 'about') &&
        wReadySent.current &&
        wTaughtAt.current > 0 &&
        micVoiceAt.current > wTaughtAt.current &&
        TUTOR_SETS_SCENE.test(sentence)
      ) {
        logEv(`welcome:open-from-tutor "${sentence.slice(0, 60)}"`)
        wOpen.current()
      }
      // the voice command (also if it comes late, after it opened the questions); the Q&A only after it
      else if ((step === 'done' || step === 'qa') && TUTOR_COMMAND.test(sentence) && wSaidAt.current === null) wGo.current('command')
      else if (step === 'command' && TUTOR_QA.test(sentence)) wGo.current('qa')
    }
  })
  // mission complete: feedback and "any questions?" (the tutor moves on to the voice command itself)
  useEffect(() => {
    if (welcome && wStep === 'roleplay' && panel?.view === 'roleplay' && panel.phase === 'done') wGo.current('done')
  }, [welcome, wStep, panel])
  // every second: the phrase said (open the scene once they've stopped), and the time limits (lib/classroom/welcome.ts)
  useEffect(() => {
    if (!welcome || status !== 'live' || !tutorReady || clockEnd === null || closing.current) return
    const elapsed = info.durationMinutes * 60 - left
    const step = wStepRef.current
    if (!step) {
      wGo.current(welcomeStartStep(elapsed))
      return
    }
    const T = Date.now()
    if (step === 'suggest' && wHeardAt.current && T - lastSaid.current.student >= WELCOME_AT.phraseQuiet * 1000) {
      wOpen.current()
      return
    }
    const m: WelcomeMove = welcomeNext({
      step,
      elapsed,
      left,
      stepAge: (T - wStepAt.current) / 1000,
      suggestSent: wSuggestSent.current,
      wrapSent: wWrapSent.current,
      commandAge: wSaidAt.current === null ? null : (T - wSaidAt.current) / 1000,
    })
    if (!m) {
      wWaitAt.current = 0
      return
    }
    if (waitsForGap(m) && !wGap()) {
      if (!wWaitAt.current) wWaitAt.current = T
      if (T - wWaitAt.current < WELCOME_AT.quietMax * 1000) return
    }
    wWaitAt.current = 0
    if ('to' in m) {
      wGo.current(m.to)
      // (no "do the voice command" note any more: it twice arrived just as the tutor had started the voice command,
      // and once the preview was explained the tutor did the voice command all over again. If it's quiet in this step,
      // the silence note says what's next)
    } else if (m.do === 'promptSuggest') {
      wSuggestSent.current = true
      // time for the role-play even if the helper didn't hear all three answers: the role-play note (once), unless
      // it's already on it (a note as it taught the phrase made it start its sentence over)
      if (!/role[\s-]?play/i.test(runs.current.tutor.text)) wSendReady.current()
    } else if (m.do === 'open') wOpen.current()
    else if (m.do === 'wrap') {
      wWrapSent.current = true
      void act({ kind: 'welcome', step: 'wrap' })
    } else if (m.do === 'endScene') completeRp.current()
  }, [now, welcome, status, tutorReady, clockEnd, left, info.durationMinutes, act])
  // the end screen: what to try next (a course, and the next level of their role-play)
  const wEnded = welcome && status === 'ended'
  useEffect(() => {
    if (!wEnded) return
    let on = true
    void aiCourses().then((list) => {
      if (!on) return
      const out: NextUp[] = []
      const c = list.find((x) => x.doneCount === 0) ?? list[0]
      if (c)
        out.push({
          tag: t('wlCourseTag'),
          title: lang === 'ja' ? c.titleJa : c.title,
          sub: [t('wlLessonN', { n: Math.max(1, Math.min(c.lessonCount || 1, c.doneCount + 1)) }), c.level].filter(Boolean).join(' · '),
          image: c.image,
        })
      const sc = wSceneRef.current
      if (sc) out.push({ tag: t('rpKick'), title: sc.title[lang], sub: t('rpNext', { lv: LEVEL_NAMES[Math.min(2, wCleared ?? 0) as LevelIndex][lang] }), image: sc.image || null })
      setWNext(out)
    })
    return () => {
      on = false
    }
  }, [wEnded, wCleared, lang, t])

  /* ---------- the action judge (lib/ai-tutor/actions.ts): the catch-all behind the spoken commands ---------- */
  // the screen changed (course opened/closed, panel, whiteboard): the judge starts reading from here
  const screenKey = `${props.open?.courseId ?? ''}:${props.open?.lessonId ?? ''}:${panel?.view ?? ''}:${props.whiteboard}`
  useEffect(() => {
    screenAt.current = { line: lines.current.length, t: Date.now() }
  }, [screenKey])
  useEffect(() => {
    screenNow.current = () => ({
      screen: {
        view: panel ? (panel.view === 'picker' ? 'picker' : 'roleplay') : live.current.slides.length ? 'course' : 'free',
        board: whiteboardRef.current,
        pickerMode: panel?.view === 'picker' ? panel.mode : undefined,
        roleplay: panel?.view === 'roleplay' ? panel.scene.title.en : undefined,
        wrappingUp: wrapUp.current,
      },
      courses: titles.current.map((c) => ({ id: c.id, title: c.names[0] ?? c.id })),
      scenes: (rpList ?? []).map((x) => ({ id: x.id, title: x.title.en })),
      roleplay:
        panel?.view === 'roleplay' && panel.phase === 'play'
          ? { sceneId: panel.scene.id, role: panel.role, level: panel.level, twisted: mission.twisted, done: Object.keys(mission.done), token: rpToken.current }
          : undefined,
    })
    judgeDo.current = (a, quote, asked) => {
      // guardrails on arrival: the screen changed meanwhile (a command or a tap got there first), the lesson is
      // wrapping up, or the judge acted a moment ago → nothing
      // a slide moved meanwhile (a restart, the next slide): that request was already handled
      if (screenAt.current.t > asked || lastMove.current > asked || wrapUp.current || closing.current || Date.now() - lastJudged.current < 4000) return
      lastJudged.current = Date.now()
      console.info('[eigo] AI action', a.kind, JSON.stringify(quote))
      switch (a.kind) {
        case 'open_course':
          return openCourseNow.current(a.courseId ?? '', a.lesson ? `#${a.lesson}` : '')
        case 'close_course':
          return void closeCourseNow.current()
        case 'open_roleplays':
          return panelDo.current({ kind: 'open', mode: 'rp' })
        case 'start_roleplay':
          return panelDo.current({ kind: 'start', id: a.sceneId })
        case 'close_panel':
          return panelDo.current({ kind: 'close' })
        case 'board_on':
          if (!whiteboardRef.current) {
            showBoard.current(true)
            void act({ kind: 'view', what: 'board_on' })
          }
          return
        case 'board_off':
          if (whiteboardRef.current) {
            showBoard.current(false)
            void act({ kind: 'view', what: 'board_off' })
          }
          return
      }
    }
  })

  // course titles, to recognise "I'll open Haruka in the UK now"
  useEffect(() => {
    if (welcome) return // no courses in the welcome call
    void aiCourseTitles().then((list) => {
      titles.current = list.map((c) => ({ id: c.id, names: [c.title, c.titleJa].filter(Boolean) }))
    })
  }, [welcome])
  const acted = useRef(new Set<string>())
  const cuePending = useRef('')
  const cueUpto = useRef({ run: -1, idx: 0 })
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    // one sentence of the tutor's speech (idx = its number in this stretch; done = a later sentence has begun)
    const cueOne = (s: string, run: number, idx: number, done: boolean) => {
        // the transcript arrives word by word: "Would you like to swap roles" is a question once its "?" arrives.
        // A sentence that turns out to be a question cancels what it had started.
        if (s.trim().endsWith('?') && cuePending.current === `${run}:${idx}` && cueTimer.current) {
          clearTimeout(cueTimer.current)
          cueTimer.current = null
          cuePending.current = ''
        }
        // the welcome talk: the classroom follows the tutor's set sentences (its Q&A one is a question)
        if (welcome) return void (s && welcomeTutor.current(s))
        if (!s || s.trim().endsWith('?')) return
        const named = OPEN_VERB.test(s) ? courseNamed(s, titles.current) : undefined
        // opening or closing a course comes first: with the course list up, "I'll open Haruka in the UK now" opens it
        // (it isn't just picking it on the panel)
        const kind =
          OPEN_CUE.test(s) || named ? 'open' : tutorClosesCourse(s) ? 'close' : panelSaid.current('tutor', s) ? 'panel' : BOARD_ON_CUE.test(s) ? 'board_on' : BOARD_OFF_CUE.test(s) ? 'board_off' : null
        if (!kind) return
        const key = `${kind}:${run}:${idx}`
        if (acted.current.has(key)) return
        if (cueTimer.current) clearTimeout(cueTimer.current)
        const finished = done || /[.!。！]\s*$/.test(s)
        cuePending.current = `${run}:${idx}`
        cueTimer.current = setTimeout(() => {
          cueTimer.current = null
          cuePending.current = ''
          if (acted.current.has(key)) return
          // read the sentence again as it is now: never act on one that turned into a question
          const cur = runs.current.tutor
          if (cur.n === run) {
            const now = cur.text.split(/(?<=[.!?])\s+/)[idx - 1] ?? s
            if (now.trim().endsWith('?')) return
          }
          acted.current.add(key)
          const slidesOpen = live.current.slides.length > 0
          if (kind === 'panel') {
            // free talk only (panelSaid checks): with a course open, "role-play" on a slide never opens anything
            const i = panelSaid.current('tutor', s)
            // mission complete: the tutor's "let's swap roles / try again / another scene" only counts once the student
            // has answered its offer (or tapped); its own offer never moves on by itself
            if (i && (i.kind === 'swap' || i.kind === 'again' || i.kind === 'next') && lastSaid.current.student <= doneAt.current) return
            // the AI tutor never starts a role-play by itself: only from the list, once the student has chosen
            // (spoken since the list appeared). It can show the list only after the student has said something.
            if (i?.kind === 'start' && (!pickerShown.current || lastSaid.current.student <= pickerAt.current)) return
            if (i?.kind === 'open' && !lastSaid.current.student) return
            if (i) panelDo.current(i)
          } else if (kind === 'board_on' && !whiteboardRef.current) {
            showBoard.current(true)
            void act({ kind: 'view', what: 'board_on' })
          } else if (kind === 'board_off' && whiteboardRef.current) {
            showBoard.current(false)
            void act({ kind: 'view', what: 'board_off' })
          } else if (kind === 'close' && slidesOpen) {
            closeCourseNow.current()
          } else if (kind === 'open' && !lastSaid.current.student) {
            // the AI tutor never opens a course before the student has said anything (free talk starts with a chat)
          } else if (kind === 'open' && (!slidesOpen || (named && named.id !== props.open?.courseId))) {
            const n = LESSON_NO.exec(s)?.[1]
            openCourseNow.current(named?.id ?? '', n ? `#${n}` : '')
          }
        }, kind === 'panel' ? (finished ? 120 : 1500) : 500) // the panel: at once on a finished sentence, else wait for its end
    }
    viewCue.current = (line, run) => {
      // every sentence in this stretch that hasn't been read yet, and the one being said now (a chunk of transcript
      // can hold two sentences: "Great, let's swap roles. I'll be the customer.")
      const sentences = line.text.split(/(?<=[.!?])\s+/)
      const from = cueUpto.current.run === run ? Math.min(cueUpto.current.idx, sentences.length - 1) : 0
      for (let k = Math.max(0, from); k < sentences.length; k++) cueOne(sentences[k] ?? '', run, k + 1, k < sentences.length - 1)
      cueUpto.current = { run, idx: sentences.length - 1 }
    }
  }, [act, onCloseCourse, onOpenLesson, info.bookingId, props.open?.courseId, welcome])
  useEffect(() => () => void (cueTimer.current && clearTimeout(cueTimer.current)), [])
  // opening a course: by the student's words or the AI tutor's. One at a time: the tutor's "I'll open the course
  // now" right after the student asked doesn't open it again
  useEffect(() => {
    openCourseNow.current = (courseId, lesson) => {
      if (opening.current || closing.current) return
      opening.current = true
      void aiOpenLesson(info.bookingId, courseId, lesson)
        .then((res) => {
          if ('error' in res) {
            opening.current = false
            void act({ kind: 'view', what: 'open_failed' })
            return
          }
          cueOpened.current = { at: Date.now(), courseId: res.open.courseId }
          lessonNote.current = act({ kind: 'lesson', courseId: res.open.courseId, lessonId: res.open.lessonId })
          onOpenLesson(res.open) // the guard is released once it's on screen (below)
        })
        .catch(() => (opening.current = false))
    }
  })
  useEffect(() => {
    opening.current = false
  }, [props.open?.courseId, props.open?.lessonId])

  /* ---------- report a problem (flag button): one tap sends ---------- */
  const [reportOpen, setReportOpen] = useState(false)
  const [reportOther, setReportOther] = useState(false)
  const [reportNote, setReportNote] = useState('')
  const reportRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!reportOpen) return
    const away = (e: PointerEvent) => {
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) setReportOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setReportOpen(false)
    window.addEventListener('pointerdown', away, true)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away, true)
      window.removeEventListener('keydown', esc)
    }
  }, [reportOpen])
  const { toast } = props
  const report = useCallback(
    async (reason: 'slide' | 'audio' | 'content' | 'other', note = '') => {
      setReportOpen(false)
      setReportOther(false)
      setReportNote('')
      const ref = slideRef()
      const recent = lines.current
        .slice(-10)
        .map((l) => `${l.from === 'student' ? 'Student' : 'AI tutor'}: ${l.text}`)
        .join('\n')
      const ok = await sendAiReport(info.bookingId, {
        reason,
        note,
        sessionId: sessionId.current,
        ...(ref ? { courseId: ref.courseId, lessonId: ref.lessonId, slideId: ref.slideId, slideNo: live.current.idx + 1 } : {}),
        recent,
      })
      toast(ok ? t('reportSent') : t('reportFailed'), ok ? 'ok' : 'bad')
    },
    [info.bookingId, slideRef, toast, t],
  )

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

  const captionsOn = props.prefs.captions ?? (info.aiLevel === 'starter' || info.aiLevel === 'basic')
  const glowStyle = useMemo(() => {
    const p = orbColor(info.aiColor)
    const c = (v: readonly number[]) => v.map((x) => Math.round(x * 255)).join(' ')
    return { '--tc': `rgb(${c(p.accent)})`, '--tc2': `rgb(${c(p.deep)})` } as CSSProperties
  }, [info.aiColor])

  return (
    <div
      ref={appRef}
      className={`app ai-lesson student${freeTalk ? ' no-course' : ''}${wPreview ? ' wl-preview' : ''}${props.whiteboard ? ' wb' : ''}${props.prefs.cursors ? '' : ' no-cursors'}${tbOpen ? ' tb-open' : ''}${props.side ? ' side-open' : ''}`}
    >
      <audio ref={audioEl} autoPlay playsInline />
      <div className={`ai-calling${calling ? '' : ' out'}`} role="status" aria-hidden={!calling}>
        <AiAvatar className="ai-orb-calling" color={info.aiColor} blush={info.aiBlush !== false} level={voiceLevel} intro={intro} inset={0.64} />
        {t('aiCalling')}
      </div>
      <header className="top">
        <div className="logo">
          eigo<b>.</b>io
        </div>
        <div className="ttl">
          {!freeTalk && props.loaded && <span className="course">{props.loaded.course.title}</span>}
          <span id="crumb">{wPreview ? `${wPreview.title} · ${t('wlPreview')}` : welcome ? t('wlCrumb') : freeTalk ? t('aiFreeTalk') : lesson ? lesson.title : '…'}</span>
        </div>
        <div className="spacer" />
        <div className="navwrap">
          <div className="snav">
            {/* the student can always move the slide themselves too; the AI tutor gets the new slide's content */}
            <button disabled={!slides.length || idx === 0} onClick={() => moveSlide('back', idx)} aria-label="Previous slide">
              <Ico name="left" />
            </button>
            <span className="n">{slides.length ? `${idx + 1} / ${slides.length}` : '–'}</span>
            <button disabled={!slides.length || idx >= slides.length - 1} onClick={() => moveSlide('next')} aria-label="Next slide">
              <Ico name="right" />
            </button>
            {!freeTalk && (
              // the student can always close the course themselves (free talk), without asking the AI tutor
              <button className="closeCourse" title={t('closeCourse')} aria-label={t('closeCourse')} onClick={() => closeCourseNow.current()}>
                <Ico name="x" />
              </button>
            )}
          </div>
        </div>
        {!welcome && (
          <button className={`sq tog${props.whiteboard ? ' on' : ''}`} title={t('whiteboardTitle')} aria-pressed={props.whiteboard} onClick={toggleWhiteboard}>
            <Ico name="board" />
          </button>
        )}
        {freeTalk && !welcome && (
          <button
            className={`sq tog${panelOn ? ' on' : ''}`}
            title={t('panelTitle')}
            aria-label={t('panelTitle')}
            aria-pressed={panelOn}
            onClick={() => (panelOn ? closePanel() : panel && props.whiteboard ? setBoard(false) : openPicker('rp'))}
          >
            <Ico name="grid" />
          </button>
        )}
        <div className={`info${left <= 120 ? ' warn' : ''}`}>{status === 'live' ? mmss(left) : '–'}</div>
        <div className="rwrap" ref={reportRef}>
          <button
            className={`sq tog${reportOpen ? ' on' : ''}`}
            title={t('report')}
            aria-label={t('report')}
            aria-expanded={reportOpen}
            onClick={() => {
              setReportOther(false)
              setReportOpen((o) => !o)
            }}
          >
            <Ico name="flag" />
          </button>
          {reportOpen && (
            <div className="rpop" role="menu">
              <div className="rhead">{t('report')}</div>
              <button className="ropt" role="menuitem" onClick={() => void report('slide')}>
                <Ico name="right" />
                {t('reportSlide')}
              </button>
              <button className="ropt" role="menuitem" onClick={() => void report('audio')}>
                <Ico name="sound" />
                {t('reportAudio')}
              </button>
              <button className="ropt" role="menuitem" onClick={() => void report('content')}>
                <Ico name="warning" />
                {t('reportContent')}
              </button>
              {!reportOther ? (
                <button className="ropt" role="menuitem" onClick={() => setReportOther(true)}>
                  <Ico name="more" />
                  {t('reportOther')}
                </button>
              ) : (
                <form
                  className="rfield"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void report('other', reportNote.trim())
                  }}
                >
                  <input autoFocus value={reportNote} maxLength={300} placeholder={t('reportPlaceholder')} onChange={(e) => setReportNote(e.target.value)} />
                  <button type="submit" aria-label={t('send')}>
                    <Ico name="send" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
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
              slide={wPreview?.slide ?? slide}
              mode="student"
              assetBase={wPreview ? wPreview.loaded.assetBase : (props.loaded?.assetBase ?? '')}
              characters={wPreview ? wPreview.loaded.course.characters : props.loaded?.course.characters}
              decor={wPreview ? wPreview.loaded.course.decor : props.loaded?.course.decor}
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
            <div className="slot panelBox" ref={panelBoxRef} style={{ display: 'none' }}>
              {panelOn && panel?.view === 'picker' && (
                <PanelPicker
                  t={t}
                  lang={info.uiLang === 'en' ? 'en' : 'ja'}
                  mode={panel.mode}
                  setMode={(mode) => setPanel({ ...panel, mode })}
                  scenes={rpList}
                  courses={courseList}
                  rpSel={panel.rpSel}
                  courseSel={panel.courseSel}
                  onPick={(id) => setPanel(panel.mode === 'course' ? { ...panel, courseSel: id } : { ...panel, rpSel: id })}
                  onStartRoleplay={(sc) => !welcome && void startRoleplay(sc)}
                  onOpenCourse={(c) => !welcome && void openCourseFromPanel(c)}
                  preview={welcome}
                />
              )}
              {panelOn && panel?.view === 'roleplay' && panel.phase === 'play' && (
                <RoleplayMission
                  t={t}
                  lang={info.uiLang === 'en' ? 'en' : 'ja'}
                  scene={panel.scene}
                  role={panel.role}
                  level={panel.level}
                  tutorName={info.other.name}
                  mission={mission}
                  heard={normText(lines.current.slice(rpFrom.current).map((l) => l.text).join(' '))}
                  now={now}
                  onEnd={welcome ? () => completeRp.current() : closePanel}
                />
              )}
              {panelOn && panel?.view === 'roleplay' && panel.phase === 'done' && (
                <RoleplayDone
                  t={t}
                  lang={info.uiLang === 'en' ? 'en' : 'ja'}
                  scene={panel.scene}
                  role={panel.role}
                  level={panel.level}
                  mission={mission}
                  took={(panel.finishedAt ?? now) - mission.startedAt}
                  fixes={rpFixList}
                  onAgain={() => beginRoleplay(panel.scene, panel.role, panel.level)}
                  onSwap={panel.role === panel.scene.studentRole ? () => beginRoleplay(panel.scene, otherRole(panel.role), panel.level) : null}
                  onNext={() => openPicker('rp')}
                  onEnd={closePanel}
                  welcome={welcome}
                  // "looking at how you did…" only until the tutor starts its feedback
                  waiting={lastSaid.current.tutor < doneAt.current + 1500}
                />
              )}
            </div>
            <div className={`slot ai-float${speaking ? ' speaking' : ''}${status !== 'live' ? ' idle' : ''}`} ref={otherRef} style={glowStyle}>
              <span className="ai-glow" aria-hidden />
              <AiAvatar className="ai-orb-float" color={info.aiColor} blush={info.aiBlush !== false} level={voiceLevel} mood={mood} title={info.other.name} />
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
              {captionsOn && <div className="ai-cap" ref={capRef} aria-live="polite" />}
            </div>
            <AiCards t={t} shown={status === 'live' && !wCard ? shown : null} hearRef={cardHear} triedRef={cardTried} onSave={saveFromCard} onClose={() => setShown(null)} onChose={onChose} />
            {wCard === 'suggest' && wScene && (
              <SuggestCard
                t={t}
                lang={lang}
                title={wScene.title}
                level={LEVEL_NAMES[0][lang]}
                image={wScene.image}
                reason={wScene.summary[lang]}
                phrase={wPhrase}
                lit={wLit}
                heard={wHeard}
                onStart={() => wOpen.current()}
              />
            )}
            {wCard === 'command' && <CommandCard t={t} said={wSaid} compact={!!wPreview} />}
            {undo && !shown && !wCard && (
              <div className="aic-undo" role="status">
                <Ico name="check" />
                {undo.already ? t('cardAlready') : t('cardSaved')}
                {!undo.already && (
                  <button
                    onClick={() => {
                      onRemoveWord({ itemId: undo.itemId, term: undo.term, source: 'tutor', courseId: null }, { quiet: true })
                      setUndo(null)
                    }}
                  >
                    {t('cardUndo')}
                  </button>
                )}
              </div>
            )}
          </div>

          <Toolbar t={t} ink={props.ink} open={tbOpen} setOpen={setTbOpen} toast={props.toast} enabled={!!surface} />

          <nav className="controls">
            <button ref={micBtn} className={`cbtn mic-ring ${micOn ? 'on' : 'off'}`} aria-pressed={micOn} onClick={toggleMic}>
              <span className="cface">
                <Ico name={micOn ? 'mic' : 'micoff'} />
              </span>
              <span className="lbl">{t('mic')}</span>
            </button>
            <button className={`cbtn${props.side === 'chat' ? ' on' : ''}`} aria-pressed={props.side === 'chat'} onClick={() => props.setSide(props.side === 'chat' ? null : 'chat')}>
              <span className="cface">
                <Ico name="chat" />
              </span>
              <span className={`badge${props.unread > 0 ? ' show' : ''}`}>{props.unread || ''}</span>
              <span className="lbl">{t('chat')}</span>
            </button>
            <button className={`cbtn${captionsOn ? ' on' : ''}`} aria-pressed={captionsOn} onClick={() => props.setPrefs({ captions: !captionsOn })}>
              <span className="cface">
                <Ico name="text" />
              </span>
              <span className="lbl">{t('captions')}</span>
            </button>
            <WordsButton t={t} on={props.side === 'words'} count={props.lessonWords.length} onClick={() => props.setSide(props.side === 'words' ? null : 'words')} />
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
            onClose={() => props.setSide(null)}
            hidden={props.side === 'words'}
          />
          <WordList
            t={t}
            words={props.lessonWords}
            tutorName={info.other.name}
            hidden={props.side !== 'words'}
            onRemove={props.onRemoveWord}
            onClose={() => props.setSide(null)}
          />
        </aside>
      </div>
      {wEnded && (
        <WelcomeEnd
          t={t}
          // their first name only ("Connor Finley" → Connor; "山田 太郎" → 山田, which is how さん is used)
          name={info.me.name.trim().split(/[\s\u3000]+/)[0] || info.me.name}
          aiColor={info.aiColor}
          aiBlush={info.aiBlush}
          spokeMs={lines.current
            .filter((l) => l.from === 'student')
            // each line: its audio timing, or about 0.4 s a word when the timing is missing (never over 30 s)
            .reduce((a, l) => a + Math.min(30_000, Math.max((l.end ?? l.t) - l.t, wordsOf(l.text).length * 400)), 0)}
          phrases={props.lessonWords.map((w) => w.term)}
          // (no role-play level stat: "1/3" after one scene wasn't useful; the next level is under Try next)
          cleared={null}
          lang={lang}
          facts={wFacts}
          aboutSaved={wAbout === 'saved'}
          onEditAbout={(k: FactKey, v: string) => {
            setFacts({ ...wFactsRef.current, [k]: v })
            wSave.current()
          }}
          next={wNext}
        />
      )}
    </div>
  )
}
