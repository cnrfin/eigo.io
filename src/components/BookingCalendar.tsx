'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'
import { useAuth } from '@/context/AuthContext'
import AiAvatar from '@/components/ai/AiAvatar'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import CourseSheet, { type CatalogEntry, type RoleplayChoice } from '@/components/booking/CourseSheet'
import { aiRoleplays } from '@/lib/classroom/client'
import { LEVEL_NAMES, type SceneSummary } from '@/lib/roleplay/types'
import { AI_LENGTHS, aiMinutesFor } from '@/lib/ai-tutor/settings'
import { aiLengthsFor, priceAiLessons, type MinuteSnapshot } from '@/lib/minutes-core'
import { AiStartCard, useAiStartState } from '@/components/ai/AiStart'
import '@/components/booking/tutor-picker.css'

/** Course picker when booking (classroom pilot). Off until the courses are finished: set to true to bring it back. */
const COURSE_BOOKING_ENABLED = true

type SelectedBooking = { date: string; time: string; dayLabel: string }

export type BookingResultDetail = { date: string; time: string; success: boolean; reason?: string }
export type BookingResult = { success: boolean; message: string; details?: BookingResultDetail[] }


export default function BookingCalendar({ selectedDuration, onBookingComplete, rescheduleLesson, hasSubscription = false, testMode = false, classroomEnabled = false, aiEnabled = false, minutesRemaining = null, aiMinutes = null, initialTutor = 'human', aiOnly = false }: { selectedDuration?: number; onBookingComplete?: (result?: BookingResult) => void; rescheduleLesson?: { id: string; googleEventId: string | null }; hasSubscription?: boolean; /** test account (user_permissions.booking_test_mode): every duration and every time of day */ testMode?: boolean; /** classroom pilot: a course can be added to the booking */ classroomEnabled?: boolean; /** AI tutor pilot: Connor / AI tutor picker */ aiEnabled?: boolean; /** plan minutes left this month (usage bar); null hides it */ minutesRemaining?: number | null; /** which tutor is chosen first */ initialTutor?: 'human' | 'ai'; /** AI pilot: plan + AI + top-up minutes an AI lesson can draw on */ aiMinutes?: MinuteSnapshot | null; /** AI plan: AI tutor lessons only (no teacher pill) */ aiOnly?: boolean }) {
  const { t, locale } = useLanguage()
  const { session } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const { theme } = useTheme()
  const selectedStyle = pillTabStyle(true, theme === 'dark' ? 'dark' : 'light') // shared selected treatment (radius comes from each element)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [pickedDuration, setDuration] = useState(selectedDuration || (initialTutor === 'ai' ? 15 : hasSubscription ? 30 : 15))
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  // Who teaches: Connor (Whereby) or the AI tutor (pilot). Rescheduling keeps the original kind.
  const [tutor, setTutor] = useState<'human' | 'ai'>(aiOnly ? 'ai' : initialTutor)
  const isAi = aiEnabled && !rescheduleLesson && tutor === 'ai'
  // AI lengths: 15 / 30, plus a shorter one that uses up the month's last minutes (they don't roll over)
  const aiSnapshot: MinuteSnapshot | null = testMode ? null : (aiMinutes ?? (minutesRemaining != null ? { planLeft: minutesRemaining, aiLeft: 0, topups: [] } : null))
  const aiOptions = aiLengthsFor(aiSnapshot)
  const aiDurations = aiOptions.length ? aiOptions : [...AI_LENGTHS]
  const duration = isAi && !aiDurations.includes(pickedDuration) ? aiDurations[0] : pickedDuration
  // AI pilot: what "start now" can do (lengths, lesson in progress, a teacher lesson soon)
  const { state: aiStart } = useAiStartState(aiEnabled && !rescheduleLesson)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState<{
    success: boolean
    message: string
    details?: { date: string; time: string; success: boolean; reason?: string }[]
  } | null>(null)

  // Multi-slot selection
  const [selectedBookings, setSelectedBookings] = useState<SelectedBooking[]>([])

  // Recurring booking
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [recurringWeeks, setRecurringWeeks] = useState(4)

  // Course for the booking (classroom pilot). Free talk when none is chosen.
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [courseId, setCourseId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [catalogTick, setCatalogTick] = useState(0)
  const accessToken = session?.access_token
  // the name the student gave their AI tutor (settings), shown on the AI pill; "AI tutor" until they name it
  const [aiTutorName, setAiTutorName] = useState('')
  const [aiOrbColor, setAiOrbColor] = useState<string | null>(null)
  const [aiBlush, setAiBlush] = useState(true)
  useEffect(() => {
    if (!aiEnabled || !accessToken) return
    let alive = true
    fetch('/api/ai-tutor/settings', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = typeof d?.settings?.tutorName === 'string' ? d.settings.tutorName.trim() : ''
        if (alive && n) setAiTutorName(n)
        if (alive && typeof d?.settings?.orbColor === 'string') setAiOrbColor(d.settings.orbColor)
        if (alive && typeof d?.settings?.blush === 'boolean') setAiBlush(d.settings.blush)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [aiEnabled, accessToken])
  useEffect(() => {
    if (!COURSE_BOOKING_ENABLED || !classroomEnabled || !accessToken) return
    let alive = true
    fetch('/api/slide-courses/catalog', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : { courses: [] }))
      .then((d) => { if (alive) setCatalog(d.courses ?? []) })
      .catch(() => {})
    return () => { alive = false }
  }, [classroomEnabled, accessToken, catalogTick])
  // Role-plays (AI lessons only, phase 3c): chosen instead of a course; the lesson opens straight into it
  const [rpList, setRpList] = useState<SceneSummary[] | null>(null)
  const [rpPick, setRpPick] = useState<RoleplayChoice | null>(null)
  useEffect(() => {
    if (!aiEnabled || !accessToken) return
    let alive = true
    void aiRoleplays().then((l) => { if (alive) setRpList(l) })
    return () => { alive = false }
  }, [aiEnabled, accessToken, catalogTick])
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const rpOn = isAi && !!rpList?.length
  const roleplay = rpOn && rpPick ? (rpList ?? []).find((x) => x.id === rpPick.sceneId) ?? null : null
  const coursesOn = COURSE_BOOKING_ENABLED && classroomEnabled && catalog.length > 0 && !rescheduleLesson
  const course = coursesOn && courseId && !roleplay ? catalog.find((c) => c.id === courseId) ?? null : null

  // Teacher profile
  const [teacherName, setTeacherName] = useState('')
  const [teacherAvatar, setTeacherAvatar] = useState('')
  const teacherFetched = useRef(false)
  useEffect(() => {
    if (teacherFetched.current) return
    teacherFetched.current = true
    fetch('/api/teacher')
      .then(r => r.json())
      .then(d => { setTeacherName(d.name || ''); setTeacherAvatar(d.avatarUrl || '') })
      .catch(() => {})
  }, [])

  // Detect user's timezone
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const shortTz = useMemo(() => {
    const now = new Date()
    return now.toLocaleTimeString('en-US', { timeZone: userTimezone, timeZoneName: 'short' }).split(' ').pop() || userTimezone
  }, [userTimezone])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const monthName = currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  const days = useMemo(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) arr.push(null)
    for (let i = 1; i <= daysInMonth; i++) arr.push(i)
    return arr
  }, [firstDayOfMonth, daysInMonth])

  const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')]

  const fetchSlots = useCallback(async (day: number) => {
    setLoadingSlots(true)
    setAvailableSlots([])
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    try {
      // The token lets the server recognise test accounts (all slots); normal users get the usual availability.
      const res = await fetch(`/api/calendar/available?date=${dateStr}&duration=${duration}&tz=${encodeURIComponent(userTimezone)}${isAi ? '&kind=ai' : ''}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
      const data = await res.json()
      setAvailableSlots(data.slots || [])
    } catch {
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [year, month, duration, userTimezone, session?.access_token, isAi])

  useEffect(() => {
    if (selectedDay) fetchSlots(selectedDay)
  }, [duration, selectedDay, fetchSlots])

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null) }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }
  const isPast = (day: number) => {
    const date = new Date(year, month, day)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return date < today
  }

  const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const getDayLabel = (day: number) => {
    const d = new Date(year, month, day)
    return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  const handleSelectDay = (day: number | null) => {
    if (!day) return
    setSelectedDay(day)
    setBookingResult(null)
    fetchSlots(day)
  }

  const toggleSlot = (time: string) => {
    if (!selectedDay) return
    const dateStr = getDateStr(selectedDay)
    const exists = selectedBookings.find(b => b.date === dateStr && b.time === time)
    if (exists) {
      setSelectedBookings(prev => prev.filter(b => !(b.date === dateStr && b.time === time)))
    } else {
      // Don't allow selecting a slot that overlaps with existing selections
      if (isSlotBlocked(time)) return
      setSelectedBookings(prev => [...prev, { date: dateStr, time, dayLabel: getDayLabel(selectedDay) }])
    }
    setBookingResult(null)
  }

  const isSlotSelected = (time: string) => {
    if (!selectedDay) return false
    const dateStr = getDateStr(selectedDay)
    return selectedBookings.some(b => b.date === dateStr && b.time === time)
  }

  // Check if a slot is blocked by an already-selected booking's duration.
  // A slot is blocked if it would overlap with any selected booking.
  // Selected slots themselves are not considered "blocked" (so they can be toggled off).
  const isSlotBlocked = (time: string) => {
    if (!selectedDay) return false
    const dateStr = getDateStr(selectedDay)
    // If this slot is itself selected, it's not blocked (user can deselect it)
    if (selectedBookings.some(b => b.date === dateStr && b.time === time)) return false

    const [slotH, slotM] = time.split(':').map(Number)
    const slotStart = slotH * 60 + slotM
    const slotEnd = slotStart + duration

    return selectedBookings.some(b => {
      if (b.date !== dateStr) return false
      const [bH, bM] = b.time.split(':').map(Number)
      const bookingStart = bH * 60 + bM
      const bookingEnd = bookingStart + duration
      // Two ranges overlap if one starts before the other ends
      return slotStart < bookingEnd && slotEnd > bookingStart
    })
  }

  const removeBooking = (index: number) => {
    setSelectedBookings(prev => prev.filter((_, i) => i !== index))
  }

  // Generate recurring dates (same day of week, for N weeks)
  const generateRecurringDates = (baseDate: string, weeks: number): string[] => {
    const dates: string[] = [baseDate]
    const base = new Date(baseDate)
    for (let w = 1; w < weeks; w++) {
      const next = new Date(base.getTime() + w * 7 * 24 * 60 * 60 * 1000)
      dates.push(next.toISOString().split('T')[0])
    }
    return dates
  }

  // Every lesson that will be booked (weekly copies included), in date order.
  // The server gives them consecutive course lessons in this order too.
  const expandBookings = (list: SelectedBooking[]) => {
    const all = recurringEnabled
      ? list.flatMap((b) => generateRecurringDates(b.date, recurringWeeks).map((d) => ({ date: d, time: b.time, dayLabel: b.dayLabel })))
      : [...list]
    return all.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }
  const lessonAt = (i: number) => (course ? course.queue[i] ?? course.lessonCount : 0)
  const lessonOf = (b: SelectedBooking) => {
    const i = expandBookings(selectedBookings).findIndex((x) => x.date === b.date && x.time === b.time)
    return lessonAt(i)
  }
  const lessonRange = () => {
    const n = expandBookings(selectedBookings).length
    const a = lessonAt(0), z = lessonAt(Math.max(0, n - 1))
    return a === z ? `Lesson ${a}` : `Lesson ${a} 〜 ${z}`
  }

  // plan minutes for the current selection (weekly copies included)
  const lessonCount = recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length
  // AI lessons use AI minutes first, then plan minutes at 60%: the bar shows the plan-minute part
  const planMinutes = isAi
    ? (aiSnapshot ? (priceAiLessons(aiSnapshot, duration, lessonCount)?.plan ?? lessonCount * aiMinutesFor(duration)) : lessonCount * aiMinutesFor(duration))
    : lessonCount * duration
  const fullMinutes = lessonCount * duration

  const handleConfirmBooking = async () => {
    if (selectedBookings.length === 0 || !session) return
    setBooking(true)
    setBookingResult(null)

    // Build the full list of bookings (including recurring copies)
    const allBookings = expandBookings(selectedBookings)

    let successCount = 0
    let failCount = 0
    const isMultiBooking = allBookings.length > 1
    const bookedLessons: { lessonDate: string; lessonTime: string; durationMinutes: number }[] = []
    const bookingDetails: { date: string; time: string; success: boolean; reason?: string }[] = []

    for (const b of allBookings) {
      try {
        // Use reschedule endpoint if rescheduling (only for the first booking)
        if (rescheduleLesson && successCount === 0 && failCount === 0) {
          const res = await fetch('/api/calendar/reschedule', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              oldBookingId: rescheduleLesson.id,
              oldGoogleEventId: rescheduleLesson.googleEventId,
              date: b.date,
              time: b.time,
              duration,
              timezone: userTimezone,
            }),
          })
          if (res.ok) {
            successCount++
            bookingDetails.push({ date: b.date, time: b.time, success: true })
          } else {
            const data = await res.json().catch(() => ({}))
            failCount++
            bookingDetails.push({ date: b.date, time: b.time, success: false, reason: data.error })
          }
        } else {
          const res = await fetch('/api/calendar/book', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              date: b.date,
              time: b.time,
              duration,
              timezone: userTimezone,
              skipAdminEmail: isMultiBooking,
              ...(course ? { slideCourseId: course.id } : {}),
              ...(isAi ? { lessonKind: 'ai' } : {}),
              ...(isAi && roleplay && rpPick ? { roleplay: rpPick } : {}),
            }),
          })
          if (res.ok) {
            successCount++
            bookingDetails.push({ date: b.date, time: b.time, success: true })
            if (isMultiBooking) {
              bookedLessons.push({ lessonDate: b.date, lessonTime: b.time, durationMinutes: duration })
            }
          } else {
            const data = await res.json().catch(() => ({}))
            failCount++
            bookingDetails.push({ date: b.date, time: b.time, success: false, reason: data.error })
          }
        }
      } catch {
        failCount++
        bookingDetails.push({ date: b.date, time: b.time, success: false, reason: 'Network error' })
      }
    }

    // Send a single batch admin email for multi-bookings
    if (isMultiBooking && bookedLessons.length > 0) {
      try {
        await fetch('/api/calendar/book-notify-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ lessons: bookedLessons }),
        })
      } catch {
        // Non-blocking — booking already succeeded
      }
    }

    let result: BookingResult
    if (failCount === 0) {
      const msg = rescheduleLesson
        ? (locale === 'ja' ? 'レッスンの日時を変更しました ✓' : 'Lesson rescheduled ✓')
        : (locale === 'ja'
            ? `${successCount}件のレッスンを予約しました ✓`
            : `${successCount} lesson${successCount > 1 ? 's' : ''} booked ✓`)
      result = { success: true, message: msg, details: isMultiBooking ? bookingDetails : undefined }
    } else {
      const msg = locale === 'ja'
        ? `${successCount}件成功、${failCount}件失敗`
        : `${successCount} booked, ${failCount} unavailable`
      result = { success: false, message: msg, details: bookingDetails }
    }
    setBookingResult(result)

    setSelectedBookings([])
    if (course) { setCourseId(null); setCatalogTick((x) => x + 1) } // the student's lesson queue has moved on
    if (roleplay) setRpPick(null)
    if (selectedDay) fetchSlots(selectedDay)
    onBookingComplete?.(result)
    setBooking(false)
  }

  return (
    <div>
      {/* Reschedule banner */}
      {rescheduleLesson && (
        <SquircleBox cornerRadius={12} className="mb-6 p-4 text-center" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            {locale === 'ja' ? 'レッスンの日時を変更しています - 新しい時間を選択してください' : 'Rescheduling lesson — pick a new time'}
          </p>
        </SquircleBox>
      )}

      {/* AI tutor pilot: Connor / AI tutor pills. The picture grows into the selected pill. */}
      {aiEnabled && !rescheduleLesson ? (
        <div className="tp-row" role="radiogroup" aria-label={locale === 'ja' ? '講師を選ぶ' : 'Choose your tutor'}>
          {(aiOnly ? (['ai'] as const) : (['human', 'ai'] as const)).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={tutor === k}
              className={`tp-pill${tutor === k ? ' on' : ''}`}
              onClick={() => {
                if (tutor === k) return
                // AI lessons: 15 or 30 minutes, or what's left this month (longer voice sessions lose context and tire students)
                if (k === 'ai' && !aiDurations.includes(duration)) setDuration(aiDurations[0])
                setTutor(k)
                setSelectedBookings([])
                setBookingResult(null)
              }}
            >
              <span className="tp-pic" aria-hidden>
                {k === 'ai' ? (
                  <span className="tp-ai">
                    <AiAvatar color={aiOrbColor} blush={aiBlush} />
                  </span>
                ) : teacherAvatar ? (
                  <img src={teacherAvatar} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="tp-initial">{(teacherName || 'C').charAt(0)}</span>
                )}
              </span>
              {k === 'ai' ? aiTutorName || (locale === 'ja' ? 'AIチューター' : 'AI tutor') : (teacherName.split(' ')[0] || 'Connor')}
              {k === 'ai' && !aiOnly && <span className="tp-off">40% OFF</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2.5 mb-5" style={{ minHeight: '2.25rem' }}>
          {teacherAvatar ? (
            <img
              src={teacherAvatar}
              alt={teacherName}
              className="w-9 h-9 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full shrink-0"
              style={{ background: teacherName ? 'var(--accent)' : 'var(--surface-hover)' }}
            >
              {teacherName && (
                <div className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold" style={{ color: 'var(--selected-text)' }}>
                  {teacherName.charAt(0)}
                </div>
              )}
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {teacherName
              ? (locale === 'ja' ? `${teacherName.split(' ')[0]} とレッスンを予約` : `Book a lesson with ${teacherName.split(' ')[0]}`)
              : ''}
          </p>
        </div>
      )}

      {/* Duration selector */}
      <div className="flex gap-2 mb-3 justify-center">
        {(isAi ? aiDurations : [15, 30, 45, 60, 75]).map((d) => {
          const locked = isAi ? !aiOptions.length : !hasSubscription && !testMode && d !== 15
          return (
            <Squircle key={d} asChild cornerRadius={8} cornerSmoothing={0.8}>
              <button
                data-fill
                onClick={() => { if (!locked) { setDuration(d); setSelectedBookings([]); setBookingResult(null) } }}
                disabled={locked}
                className="px-5 py-2.5 text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.97] disabled:hover:scale-100 disabled:active:scale-100"
                style={{
                  background: duration === d ? 'var(--text)' : 'var(--panel)',
                  color: locked ? 'var(--text-disabled)' : duration === d ? 'var(--selected-text)' : 'var(--text-secondary)',
                  border: duration === d ? '1px solid transparent' : '1px solid var(--hairline)',
                  boxShadow: duration === d ? 'none' : 'var(--card-shadow)',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.5 : 1,
                }}
                title={locked ? (locale === 'ja' ? 'プランの登録が必要です' : 'Subscription required') : undefined}
              >
                {d} min
              </button>
            </Squircle>
          )
        })}
      </div>

      {/* Timezone indicator */}
      <div className="text-center text-xs mb-5" style={{ color: 'var(--text-subtle)' }}>
        {shortTz}
      </div>

      {/* Plan minutes: what this booking uses. AI lessons use 60%; the dashed outline shows the same booking with Connor. */}
      {minutesRemaining != null && (
        <div className={`tp-meter${isAi ? ' ai' : ''}`}>
          <div className="tp-lbl">
            <span>{locale === 'ja' ? <>今月の残り <b>{minutesRemaining}分</b></> : <><b>{minutesRemaining} min</b> left this month</>}</span>
            <span>
              {locale === 'ja'
                ? <>この予約で <b>{planMinutes}分</b> 使用 · 予約後 <b>{Math.max(0, minutesRemaining - planMinutes)}分</b></>
                : <>This booking uses <b>{planMinutes} min</b> · after: <b>{Math.max(0, minutesRemaining - planMinutes)} min</b></>}
            </span>
          </div>
          <div className="tp-track">
            <span className="tp-ghost" style={{ width: `${Math.min(100, (fullMinutes / Math.max(1, minutesRemaining)) * 100)}%` }} />
            <span className="tp-use" style={{ width: `${Math.min(100, (planMinutes / Math.max(1, minutesRemaining)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* AI pilot: start now (the length above), or book a time below */}
      {isAi && (
        <div className="mb-6">
          <AiStartCard compact locale={locale === 'ja' ? 'ja' : 'en'} profile={{ name: aiTutorName, color: aiOrbColor, blush: aiBlush }} state={aiStart} duration={duration} />
          <p className="text-xs mt-5 mb-1 text-center" style={{ color: 'var(--text-muted)' }}>
            {locale === 'ja' ? 'または日時を予約' : 'Or book a time'}
          </p>
        </div>
      )}

      {/* Two-column layout: Calendar + Time slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* LEFT: Calendar */}
        <div>
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} aria-label={locale === 'ja' ? '前の月' : 'Previous month'} className="w-7 h-7 grid place-items-center transition-all duration-[120ms] ease-out hover:opacity-80 hover:scale-110 active:scale-90" style={{ color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <span className="font-medium text-base" style={{ color: 'var(--text)' }}>{monthName}</span>
            <button onClick={nextMonth} aria-label={locale === 'ja' ? '次の月' : 'Next month'} className="w-7 h-7 grid place-items-center transition-all duration-[120ms] ease-out hover:opacity-80 hover:scale-110 active:scale-90" style={{ color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((name) => (
              <div key={name} className="text-center text-xs py-1" style={{ color: 'var(--text-subtle)' }}>{name}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const hasSelection = day !== null && selectedBookings.some(b => b.date === getDateStr(day))
              return (
                <Squircle key={i} asChild cornerRadius={8} cornerSmoothing={0.8}>
                  <button
                    disabled={day === null || isPast(day)}
                    data-fill
                    onClick={() => handleSelectDay(day)}
                    className="aspect-square flex items-center justify-center text-sm transition-all duration-[120ms] ease-out relative hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:active:scale-100"
                    style={{
                      border: '1px solid transparent',
                      ...(day !== null && selectedDay === day
                        ? selectedStyle
                        : {
                            background: day !== null && isToday(day) ? 'var(--surface)' : 'transparent',
                            color: day === null ? 'transparent'
                              : isPast(day) ? 'var(--text-disabled)'
                              : isToday(day) ? 'var(--accent)'
                              : 'var(--text-secondary)',
                          }),
                      fontWeight: (day !== null && selectedDay === day) || (day !== null && isToday(day)) ? 600 : 400,
                    }}
                  >
                    {day}
                    {hasSelection && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </button>
                </Squircle>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Time slots */}
        <div>
          {!selectedDay ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
                {locale === 'ja' ? '日付を選択してください' : 'Select a date'}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('availableSlots')}</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                {locale === 'ja' ? '複数の時間を選択できます' : 'Select multiple times'}
              </p>
              {loadingSlots ? (
                <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading...</div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-4" style={{ color: 'var(--text-subtle)' }}>
                  {locale === 'ja' ? '予約可能な時間がありません' : 'No available slots'}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {availableSlots.map((time) => {
                    const selected = isSlotSelected(time)
                    const blocked = isSlotBlocked(time)
                    return (
                      <Squircle key={time} asChild cornerRadius={8} cornerSmoothing={0.8}>
                        <button
                          data-fill
                          onClick={() => toggleSlot(time)}
                          disabled={blocked}
                          className="px-2 py-2.5 text-sm transition-all duration-[120ms] ease-out hover:scale-[1.02] active:scale-[0.97] disabled:hover:scale-100 disabled:active:scale-100"
                          style={{
                            ...(selected
                              ? { ...selectedStyle, boxShadow: 'none' }
                              : {
                                  background: 'var(--panel)',
                                  color: blocked ? 'var(--text-disabled)' : 'var(--text-secondary)',
                                  border: '1px solid var(--hairline)',
                                  boxShadow: 'var(--card-shadow)',
                                }),
                            opacity: blocked ? 0.4 : 1,
                          }}
                        >
                          {time}
                        </button>
                      </Squircle>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected bookings summary */}
      {selectedBookings.length > 0 && (
        <div className="mb-4">
          <div className={coursesOn ? 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start' : ''}>
          {selectedBookings.length > 0 ? (
          <div>
          <h3 className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {locale === 'ja' ? `${selectedBookings.length}件選択中` : `${selectedBookings.length} selected`}
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedBookings.map((b, i) => (
              <Squircle key={`${b.date}-${b.time}`} asChild cornerRadius={6} cornerSmoothing={0.8}>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                  style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
                >
                  {b.dayLabel} {b.time}
                  {course && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>· L{lessonOf(b)}</span>}
                  <button onClick={() => removeBooking(i)} className="hover:opacity-70" style={{ color: 'var(--text-muted)' }}>✕</button>
                </span>
              </Squircle>
            ))}
          </div>

          {/* Recurring option */}
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              role="switch"
              aria-checked={recurringEnabled}
              onClick={() => setRecurringEnabled(!recurringEnabled)}
              className="relative rounded-full transition-colors duration-200 shrink-0"
              style={{ width: '36px', height: '20px', background: recurringEnabled ? 'var(--accent)' : 'var(--surface-hover)' }}
            >
              <span
                className={`absolute rounded-full transition-transform duration-200 shadow-sm ${recurringEnabled ? '' : 'toggle-handle-off'}`}
                style={{
                  width: '16px', height: '16px', top: '2px', left: '2px',
                  ...(recurringEnabled ? { background: '#fff' } : {}),
                  transform: recurringEnabled ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {locale === 'ja' ? '毎週繰り返す' : 'Repeat weekly'}
            </span>
            {recurringEnabled && (
              <Squircle asChild cornerRadius={8} cornerSmoothing={0.8}>
                <select
                  value={recurringWeeks}
                  onChange={(e) => setRecurringWeeks(parseInt(e.target.value))}
                  className="text-sm px-3 py-1.5"
                  style={{ background: 'var(--surface)', color: 'var(--text)', border: 'none' }}
                >
                  {[2, 3, 4, 6, 8, 12].map(w => (
                    <option key={w} value={w}>
                      {locale === 'ja' ? `${w}週間` : `${w} weeks`}
                    </option>
                  ))}
                </select>
              </Squircle>
            )}
          </div>
          </div>
          ) : <div className="hidden md:block" />}

          {/* Course (classroom pilot) or, for AI lessons, a role-play: optional, free talk when none is chosen */}
          {(coursesOn || rpOn) && (
            <div>
              <h3 className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {rpOn ? (locale === 'ja' ? 'コース・ロールプレイ' : 'Course or role-play') : locale === 'ja' ? 'コース' : 'Course'}
              </h3>
              {roleplay && rpPick ? (
                <div className="cs-picked">
                  <button type="button" className="cs-pmain" onClick={() => setSheetOpen(true)} aria-label={locale === 'ja' ? 'ロールプレイを変更' : 'Change role-play'}>
                    {roleplay.image ? <img src={roleplay.image} alt="" /> : <span className="cs-ph" />}
                    <span style={{ minWidth: 0 }}>
                      <b style={{ color: 'var(--text)' }}>{locale === 'ja' ? roleplay.title.ja : roleplay.title.en}</b>
                      <span><span className="cs-rpk">{locale === 'ja' ? 'ロールプレイ' : 'Role-play'}</span>{LEVEL_NAMES[rpPick.level][locale === 'ja' ? 'ja' : 'en']}</span>
                    </span>
                  </button>
                  <button type="button" className="cs-x" onClick={() => setRpPick(null)} aria-label={locale === 'ja' ? 'ロールプレイを外す' : 'Remove role-play'}>✕</button>
                </div>
              ) : course ? (
                <div className="cs-picked">
                  <button type="button" className="cs-pmain" onClick={() => setSheetOpen(true)} aria-label={locale === 'ja' ? 'コースを変更' : 'Change course'}>
                    {course.scenes[0] ? <img src={course.scenes[0]} alt="" /> : <span className="cs-ph" />}
                    <span style={{ minWidth: 0 }}>
                      <b style={{ color: 'var(--text)' }}>{locale === 'ja' ? course.titleJa : course.title}</b>
                      <span>{lessonRange()}</span>
                    </span>
                  </button>
                  <button type="button" className="cs-x" onClick={() => setCourseId(null)} aria-label={locale === 'ja' ? 'コースを外す' : 'Remove course'}>✕</button>
                </div>
              ) : (
                <button type="button" className="cs-add" onClick={() => setSheetOpen(true)}>
                  <span className="cs-plus">＋</span>
                  {rpOn ? (
                    <span>
                      <b className="block font-semibold" style={{ color: 'var(--text)' }}>{locale === 'ja' ? 'コース・ロールプレイを選ぶ' : 'Choose a course or role-play'}</b>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{locale === 'ja' ? '空欄のままならフリートーク' : 'Leave blank for free talk'}</span>
                    </span>
                  ) : (
                    <span>
                      <b className="block font-semibold" style={{ color: 'var(--text)' }}>{locale === 'ja' ? 'コースを追加' : 'Add a course'}</b>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {locale === 'ja' ? '選ばない場合は、フリートークなどのレッスンになります' : 'Without a course, the lesson is free talk or similar'}
                      </span>
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
          </div>

          {selectedBookings.length > 0 && (<>
          {/* Booking result message */}
          {bookingResult && (
            <div className="mb-4">
              <p className="text-center text-sm font-medium mb-2" style={{ color: bookingResult.success ? 'var(--success)' : bookingResult.details ? 'var(--text)' : 'var(--danger)' }}>
                {bookingResult.message}
              </p>
              {bookingResult.details && bookingResult.details.length > 0 && (
                <SquircleBox cornerRadius={10} className="p-3 space-y-1.5" style={{ background: 'var(--surface-hover)' }}>
                  {bookingResult.details.map((d, i) => {
                    const dt = new Date(`${d.date}T${d.time}:00`)
                    const label = dt.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-2 text-sm">
                          <span style={{ fontSize: '14px' }}>{d.success ? '✅' : '❌'}</span>
                          <span style={{ color: 'var(--text)' }}>{label} · {d.time}</span>
                        </div>
                        {!d.success && d.reason && (
                          <p className="text-xs ml-6" style={{ color: 'var(--text-muted)' }}>
                            {d.reason === 'This time slot is no longer available'
                              ? (locale === 'ja' ? 'この時間は予約できません' : 'Time unavailable')
                              : d.reason?.includes('Not enough minutes')
                                ? (locale === 'ja' ? '残り時間が足りません' : 'Not enough minutes')
                                : (locale === 'ja' ? '予約できませんでした' : 'Could not book')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </SquircleBox>
              )}
            </div>
          )}

          {!bookingResult?.success && (
            <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
              <button
                onClick={handleConfirmBooking}
                disabled={booking}
                className="w-full py-3 font-medium transition-all duration-[120ms] ease-out disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100 disabled:active:scale-100"
                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
              >
                {booking
                  ? <span className="spinner-sm" />
                  : locale === 'ja'
                    ? `${recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length}件のレッスンを予約する`
                    : `Book ${recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length} lesson${(recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length) > 1 ? 's' : ''}`
                }
                {!booking && minutesRemaining != null && (
                  <span className="block text-xs font-normal opacity-80 mt-0.5">
                    {locale === 'ja' ? `プランから${planMinutes}分使用` : `Uses ${planMinutes} plan minutes`}
                  </span>
                )}
              </button>
            </Squircle>
          )}
          </>)}
        </div>
      )}

      {sheetOpen && (coursesOn || rpOn) && (
        <CourseSheet
          courses={coursesOn ? catalog : []}
          initialId={courseId}
          lang={locale === 'ja' ? 'ja' : 'en'}
          onChoose={(id) => { setCourseId(id); setRpPick(null); setSheetOpen(false) }}
          onClose={closeSheet}
          roleplays={rpOn ? rpList : null}
          initialRoleplay={roleplay ? rpPick : null}
          onChooseRoleplay={(c) => { setRpPick(c); setCourseId(null); setSheetOpen(false) }}
        />
      )}
    </div>
  )
}
