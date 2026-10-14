'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Squircle } from '@squircle-js/react'
import { useTheme } from '@/context/ThemeContext'
import SquircleCard from '@/components/ui/SquircleCard'
import RiveIcon, { type RiveIconHandle } from '@/components/ui/RiveIcon'
import AiAvatar from '@/components/ai/AiAvatar'
import { AiStartModal, prefetchAiStart, useAiProfile } from '@/components/ai/AiStart'
import { useAuth } from '@/context/AuthContext'
import { newMood } from '@/lib/ai-tutor/avatar-mood'

type Locale = 'ja' | 'en'

export type HomeViewLesson = {
  id: string
  date: string
  startTime: string
  durationMinutes: number
  status: string
  googleEventId: string | null
  wherebyRoomUrl: string | null
  wherebyMeetingId: string | null
  hasSummary?: boolean
  /** AI tutor lessons always open in the eigo classroom */
  lessonKind?: 'human' | 'ai'
}

interface HomeViewProps {
  locale: Locale
  greeting: string
  firstName: string
  subStatus: 'loading' | 'none' | 'active' | 'past_due'
  trialCompleted: boolean | null
  lessons: HomeViewLesson[]
  loadingLessons: boolean
  wherebyUrl: string | null
  isAdmin: boolean
  /** pilot: lessons open in the eigo classroom (/classroom/[id]) instead of the Whereby link */
  classroomEnabled?: boolean
  onBook: () => void
  onReviewPhrases: () => void
  onTakeTests: () => void
  /** pilot: "Talk to AI tutor" (start an AI lesson now) replaces "Take Tests" */
  aiEnabled?: boolean
  /** not known yet whether the AI button or Tests goes here (first visit): show a placeholder */
  aiPending?: boolean
  /** the AI modal's "schedule one instead": booking with the AI tutor chosen */
  onBookAi?: () => void
  onViewPlans: () => void
  onCancelLesson: (lesson: HomeViewLesson) => void
  onRescheduleLesson: (lesson: HomeViewLesson) => void
  news: HomeNews[]
  loadingNews: boolean
  readNewsIds: Set<string>
  onOpenNews: (id: string) => void
}

export type HomeNews = { id: string; date: string; title: string; posterAvatar?: string }

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--hairline)',
  boxShadow: 'var(--card-shadow)',
}
const panelStyle: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--hairline)',
  boxShadow: 'var(--card-shadow)',
}

// subtle scale up on hover, gentle press — tween (no spring overshoot/bounce)
const pressAnim = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.12, ease: 'easeOut' as const },
}
// larger / full-width buttons scale less so the press doesn't feel dramatic
const pressAnimLarge = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12, ease: 'easeOut' as const },
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
function lessonDate(l: HomeViewLesson) {
  return new Date(`${l.date}T${l.startTime}+09:00`)
}
function fmtDate(l: HomeViewLesson, locale: Locale) {
  const d = lessonDate(l)
  if (locale === 'ja') return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })} ${ordinal(d.getDate())}`
}
function fmtTime(l: HomeViewLesson, locale: Locale) {
  const d = lessonDate(l)
  const t = d.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase()
  return `${t} · ${l.durationMinutes}min`
}
function fmtCountdown(l: HomeViewLesson, locale: Locale) {
  const mins = (lessonDate(l).getTime() - new Date().getTime()) / 60000
  if (mins <= 0) return locale === 'ja' ? 'まもなく' : 'Now'
  const days = Math.round(mins / 1440)
  const hours = Math.round(mins / 60)
  if (days >= 1) return locale === 'ja' ? `${days}日後` : `In ${days}d`
  if (hours >= 1) return locale === 'ja' ? `${hours}時間後` : `In ${hours}h`
  return locale === 'ja' ? `${Math.floor(mins)}分後` : `In ${Math.floor(mins)}m`
}

// Two-colour mesh (Brilliant-style colour) that fades in and follows the cursor
// across the button on hover. [colourA, colourB] — stacked vertically around
// the pointer. Brighter on dark so it reads against the dark panel.
type MeshPair = readonly [string, string]
const MESH: Record<'blueGreen' | 'pinkPurple' | 'yellowOrange', MeshPair> = {
  blueGreen: ['rgba(150,194,240,0.55)', 'rgba(130,226,208,0.50)'],
  pinkPurple: ['rgba(245,194,212,0.55)', 'rgba(201,194,247,0.50)'],
  yellowOrange: ['rgba(250,224,165,0.60)', 'rgba(245,160,128,0.54)'],
}
const MESH_DARK: Record<'blueGreen' | 'pinkPurple' | 'yellowOrange', MeshPair> = {
  blueGreen: ['rgba(85,183,235,0.50)', 'rgba(94,234,228,0.45)'],
  pinkPurple: ['rgba(237,147,177,0.48)', 'rgba(167,159,236,0.48)'],
  yellowOrange: ['rgba(250,199,117,0.52)', 'rgba(238,128,58,0.48)'],
}

function ActionButton({ artboard, label, onClick, colors, flat = false, icon, onHover }: {
  artboard: string; label: string; onClick: () => void; colors: MeshPair
  /** Light mode: flat secondary-grey pill — no border, shadow or mesh hover. */
  flat?: boolean
  /** instead of the Rive icon (the AI tutor's avatar) */
  icon?: React.ReactNode
  onHover?: () => void
}) {
  const [a, b] = colors
  const iconRef = useRef<RiveIconHandle>(null)
  // Two blobs that orbit opposite each other around a fixed point (bottom-right).
  const grad = `radial-gradient(circle 70px at calc(86% + 20px * cos(var(--angle))) calc(78% + 14px * sin(var(--angle))), ${a}, transparent 70%), radial-gradient(circle 70px at calc(86% + 20px * cos(var(--angle) + 180deg)) calc(78% + 14px * sin(var(--angle) + 180deg)), ${b}, transparent 70%)`
  return (
    <motion.button
      {...pressAnim}
      onClick={onClick}
      onMouseEnter={() => (icon ? onHover?.() : iconRef.current?.fire())}
      className={`group relative overflow-hidden flex items-center justify-center py-3 rounded-full text-sm font-medium ${icon ? 'pl-2.5 pr-5' : 'px-5'}`}
      style={flat ? { background: 'var(--inset)', color: 'var(--text)' } : { ...panelStyle, color: 'var(--text)' }}
    >
      {!flat && (
        <span
          aria-hidden
          className="mesh-orbit absolute inset-0 opacity-0 translate-x-3 translate-y-3 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
          style={{ background: grad, filter: 'blur(10px)', transition: 'opacity 220ms ease-out, transform 320ms ease-out' }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon ?? <RiveIcon ref={iconRef} artboard={artboard} size={16} variant="muted" />}
        {label}
      </span>
    </motion.button>
  )
}

function HeroLesson({ lesson, locale, wherebyUrl, isAdmin, classroomEnabled, onCancel, onReschedule }: {
  lesson: HomeViewLesson; locale: Locale; wherebyUrl: string | null; isAdmin: boolean; classroomEnabled?: boolean
  onCancel: (l: HomeViewLesson) => void; onReschedule: (l: HomeViewLesson) => void
}) {
  const mins = (lessonDate(lesson).getTime() - new Date().getTime()) / 60000
  const canEnter = isAdmin || (mins <= 10 && mins > -lesson.durationMinutes)
  // Pilot users go to the eigo classroom (same tab; it enforces the 10-minute rule itself).
  const inClassroom = classroomEnabled || lesson.lessonKind === 'ai'
  const room = inClassroom ? `/classroom/${lesson.id}` : lesson.wherebyRoomUrl || wherebyUrl || '#'
  return (
    <SquircleCard radius={22} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
            {locale === 'ja' ? '次のレッスン' : 'Next lesson'}
            {lesson.lessonKind === 'ai' && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full normal-case tracking-normal" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>AI</span>
            )}
          </p>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--text)' }}>{fmtDate(lesson, locale)}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{fmtTime(lesson, locale)}</p>
        </div>
        <span className="text-sm font-medium shrink-0" style={{ color: 'var(--accent)' }}>{fmtCountdown(lesson, locale)}</span>
      </div>
      <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
        <motion.a
          {...pressAnimLarge}
          href={room}
          target={inClassroom ? undefined : '_blank'}
          rel={inClassroom ? undefined : 'noopener noreferrer'}
          className="block text-center mt-4 py-3 font-medium"
          style={{ background: 'var(--accent)', color: '#fff', opacity: canEnter ? 1 : 0.92 }}
        >
          {locale === 'ja' ? '教室に入る' : 'Enter Classroom'}
        </motion.a>
      </Squircle>
      <div className="flex items-center justify-center gap-4 mt-3">
        <button onClick={() => onReschedule(lesson)} className="text-xs font-medium transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          {locale === 'ja' ? '予約変更' : 'Reschedule'}
        </button>
        <span style={{ color: 'var(--hairline)' }}>·</span>
        <button onClick={() => onCancel(lesson)} className="text-xs font-medium transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          {locale === 'ja' ? 'キャンセル' : 'Cancel'}
        </button>
      </div>
    </SquircleCard>
  )
}

function UpcomingLesson({ lesson, locale, onCancel, onReschedule }: {
  lesson: HomeViewLesson; locale: Locale
  onCancel: (l: HomeViewLesson) => void; onReschedule: (l: HomeViewLesson) => void
}) {
  return (
    <SquircleCard radius={20} className="p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium" style={{ color: 'var(--text)' }}>{fmtDate(lesson, locale)}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{fmtTime(lesson, locale)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onReschedule(lesson)} className="text-sm font-medium px-2 transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          {locale === 'ja' ? '変更' : 'Reschedule'}
        </button>
        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
          <motion.button
            {...pressAnim}
            onClick={() => onCancel(lesson)}
            className="px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--text)', color: 'var(--dash-bg)' }}
          >
            {locale === 'ja' ? 'キャンセル' : 'Cancel'}
          </motion.button>
        </Squircle>
      </div>
    </SquircleCard>
  )
}

export default function HomeView(props: HomeViewProps) {
  const { locale, greeting, firstName, subStatus, trialCompleted, lessons, loadingLessons, wherebyUrl, isAdmin, classroomEnabled } = props
  const { theme } = useTheme()
  const mesh = theme === 'dark' ? MESH_DARK : MESH
  // pilot: the AI tutor's avatar on its button, and the start-now modal
  const ai = useAiProfile(!!props.aiEnabled)
  const aiMood = useRef(newMood())
  const [aiOpen, setAiOpen] = useState(false)
  // load what the modal needs (course to continue, lengths, minutes) in the background, so it opens complete
  const { session, user } = useAuth()
  useEffect(() => {
    if (!props.aiEnabled) return
    const id = setTimeout(() => void prefetchAiStart(session?.access_token, user?.id), 400)
    return () => clearTimeout(id)
  }, [props.aiEnabled, session?.access_token, user?.id])

  let lessonsSection: React.ReactNode = null
  if (lessons.length > 0) {
    // Cached or live lessons — render immediately, even mid-refresh.
    lessonsSection = (
      <div className="flex flex-col gap-3">
        <HeroLesson lesson={lessons[0]} locale={locale} wherebyUrl={wherebyUrl} isAdmin={isAdmin} classroomEnabled={classroomEnabled} onCancel={props.onCancelLesson} onReschedule={props.onRescheduleLesson} />
        {lessons.slice(1).map((l) => (
          <UpcomingLesson key={l.id} lesson={l} locale={locale} onCancel={props.onCancelLesson} onReschedule={props.onRescheduleLesson} />
        ))}
      </div>
    )
  } else if (loadingLessons) {
    // First-ever load (no cache yet) — skeleton in the hero card's shape so
    // the layout doesn't jump when the real lesson arrives.
    lessonsSection = (
      <div className="p-5 rounded-2xl animate-pulse" style={cardStyle} aria-hidden>
        <div className="h-3 w-24 rounded" style={{ background: 'var(--inset)' }} />
        <div className="h-6 w-48 rounded mt-3" style={{ background: 'var(--inset)' }} />
        <div className="h-4 w-32 rounded mt-2" style={{ background: 'var(--inset)' }} />
        <div className="h-10 w-full rounded-xl mt-5" style={{ background: 'var(--inset)' }} />
      </div>
    )
  } else if (subStatus === 'none' && trialCompleted !== null) {
    lessonsSection = (
      <div className="p-5 rounded-2xl text-center" style={cardStyle}>
        <p className="font-medium" style={{ color: 'var(--text)' }}>
          {!trialCompleted
            ? (locale === 'ja' ? 'まずは15分、無料体験から' : 'Start with a free 15-minute trial')
            : (locale === 'ja' ? 'プランを選んでレッスンを始めよう' : 'Choose a plan to start booking')}
        </p>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
          {!trialCompleted
            ? (locale === 'ja' ? '体験後48時間は、入会が最大45%オフ' : 'Subscribe within 48 hours for up to 45% off')
            : (locale === 'ja' ? 'プランはいつでも変更・解約できます' : 'Change or cancel your plan anytime')}
        </p>
        <motion.button
          {...pressAnimLarge}
          onClick={!trialCompleted ? props.onBook : props.onViewPlans}
          className="px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {!trialCompleted ? (locale === 'ja' ? '体験を予約' : 'Book trial') : (locale === 'ja' ? 'プランを見る' : 'View plans')}
        </motion.button>
      </div>
    )
  } else {
    lessonsSection = (
      <div className="p-6 rounded-2xl text-center" style={cardStyle}>
        <p className="font-medium" style={{ color: 'var(--text)' }}>{locale === 'ja' ? '予約済みのレッスンはありません' : 'No upcoming lessons'}</p>
        <motion.button
          {...pressAnimLarge}
          onClick={props.onBook}
          className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {locale === 'ja' ? 'レッスンを予約' : 'Book a lesson'}
        </motion.button>
      </div>
    )
  }

  return (
    <div className="pt-6 sm:pt-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>{greeting}</h1>
        {firstName && (
          <p className="text-xl sm:text-2xl mt-1.5" style={{ color: 'var(--text-muted)' }}>{firstName}{locale === 'ja' ? 'さん' : ''}</p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <ActionButton artboard="book" label={locale === 'ja' ? 'レッスン予約' : 'Book lesson'} onClick={props.onBook} colors={mesh.blueGreen} flat={theme !== 'dark'} />
        <ActionButton artboard="phrases" label={locale === 'ja' ? 'フレーズ復習' : 'Review Phrases'} onClick={props.onReviewPhrases} colors={mesh.pinkPurple} flat={theme !== 'dark'} />
        {props.aiPending ? (
          <span aria-hidden className="h-[46px] w-[170px] rounded-full animate-pulse" style={{ background: 'var(--inset)' }} />
        ) : props.aiEnabled ? (
          <ActionButton
            artboard="ai"
            label={locale === 'ja' ? 'AIチューターと話す' : 'Talk to AI tutor'}
            onClick={() => setAiOpen(true)}
            onHover={() => {
              aiMood.current.face = 'happy'
              aiMood.current.until = performance.now() + 1400
            }}
            icon={
              <span className="block w-[26px] -my-1" aria-hidden>
                {ai.ready ? <AiAvatar color={ai.color} blush={ai.blush} mood={aiMood} /> : <span className="block w-[26px] h-[26px] rounded-full animate-pulse" style={{ background: 'var(--inset)' }} />}
              </span>
            }
            colors={mesh.blueGreen}
            flat={theme !== 'dark'}
          />
        ) : (
          <ActionButton artboard="exam" label={locale === 'ja' ? 'テスト' : 'Take Tests'} onClick={props.onTakeTests} colors={mesh.yellowOrange} flat={theme !== 'dark'} />
        )}
      </div>
      {aiOpen && (
        <AiStartModal
          locale={locale}
          profile={ai}
          onClose={() => setAiOpen(false)}
          onSchedule={() => {
            setAiOpen(false)
            ;(props.onBookAi ?? props.onBook)()
          }}
        />
      )}

      <div className="max-w-xl mx-auto">
        {lessonsSection}

        {props.news.length === 0 && props.loadingNews && (
          <div className="mt-4 animate-pulse" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div className="h-3 w-10 rounded shrink-0" style={{ background: 'var(--inset)' }} />
                <div className="h-3.5 rounded flex-1" style={{ background: 'var(--inset)', maxWidth: `${75 - i * 12}%` }} />
              </div>
            ))}
          </div>
        )}

        {props.news.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium px-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>{locale === 'ja' ? 'お知らせ' : 'News'}</p>
            <div>
              {props.news.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => props.onOpenNews(item.id)}
                  className="w-full flex items-center gap-3 px-1 py-3 text-left transition-opacity hover:opacity-70"
                  style={{ borderBottom: '1px solid var(--divider)' }}
                >
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-subtle)' }}>{item.date}</span>
                  <span className="text-sm truncate flex-1" style={{ color: 'var(--text)' }}>{item.title}</span>
                  {!props.readNewsIds.has(item.id) && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
