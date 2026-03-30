'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'

type SelectedBooking = { date: string; time: string; dayLabel: string }

export type BookingResultDetail = { date: string; time: string; success: boolean; reason?: string }
export type BookingResult = { success: boolean; message: string; details?: BookingResultDetail[] }

export default function BookingCalendar({ selectedDuration, onBookingComplete, rescheduleLesson, hasSubscription = false }: { selectedDuration?: number; onBookingComplete?: (result?: BookingResult) => void; rescheduleLesson?: { id: string; googleEventId: string | null }; hasSubscription?: boolean }) {
  const { t, locale } = useLanguage()
  const { session } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [duration, setDuration] = useState(selectedDuration || (hasSubscription ? 30 : 15))
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
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
      const res = await fetch(`/api/calendar/available?date=${dateStr}&duration=${duration}&tz=${encodeURIComponent(userTimezone)}`)
      const data = await res.json()
      setAvailableSlots(data.slots || [])
    } catch {
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [year, month, duration, userTimezone])

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

  const handleConfirmBooking = async () => {
    if (selectedBookings.length === 0 || !session) return
    setBooking(true)
    setBookingResult(null)

    // Build the full list of bookings (including recurring copies)
    let allBookings = [...selectedBookings]
    if (recurringEnabled) {
      const expanded: SelectedBooking[] = []
      for (const b of selectedBookings) {
        const dates = generateRecurringDates(b.date, recurringWeeks)
        for (const d of dates) {
          expanded.push({ date: d, time: b.time, dayLabel: b.dayLabel })
        }
      }
      allBookings = expanded
    }

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

      {/* Teacher profile */}
      <div className="flex flex-col items-center mb-6">
        {teacherAvatar ? (
          <img
            src={teacherAvatar}
            alt={teacherName}
            className="w-16 h-16 rounded-full object-cover mb-3"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full mb-3"
            style={{ background: teacherName ? 'var(--accent)' : 'var(--surface-hover)' }}
          >
            {teacherName && (
              <div className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold" style={{ color: 'var(--selected-text)' }}>
                {teacherName.charAt(0)}
              </div>
            )}
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-muted)', minHeight: '1.25rem' }}>
          {teacherName
            ? (locale === 'ja' ? `${teacherName.split(' ')[0]} とレッスンを予約` : `Book a lesson with ${teacherName.split(' ')[0]}`)
            : ''}
        </p>
      </div>

      {/* Duration selector */}
      <div className="flex gap-2 mb-6 justify-center">
        {[15, 30, 45, 60].map((d) => {
          const locked = !hasSubscription && d !== 15
          return (
            <Squircle key={d} asChild cornerRadius={8} cornerSmoothing={0.8}>
              <button
                onClick={() => { if (!locked) { setDuration(d); setSelectedBookings([]); setBookingResult(null) } }}
                disabled={locked}
                className="px-5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: duration === d ? 'var(--selected-bg)' : 'var(--surface)',
                  color: locked ? 'var(--text-disabled)' : duration === d ? 'var(--selected-text)' : 'var(--text-secondary)',
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
      <div className="text-center text-sm mb-4" style={{ color: 'var(--text-subtle)' }}>
        {shortTz}
      </div>

      {/* Two-column layout: Calendar + Time slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* LEFT: Calendar */}
        <div>
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-base transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
              ←
            </button>
            <span className="font-medium text-base" style={{ color: 'var(--text)' }}>{monthName}</span>
            <button onClick={nextMonth} className="text-base transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
              →
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
                    onClick={() => handleSelectDay(day)}
                    className="aspect-square flex items-center justify-center text-sm transition-all relative"
                    style={{
                      background: day !== null && selectedDay === day
                        ? 'var(--selected-bg)'
                        : day !== null && isToday(day)
                        ? 'var(--surface)'
                        : 'transparent',
                      color: day === null ? 'transparent'
                        : isPast(day) ? 'var(--text-disabled)'
                        : selectedDay === day ? 'var(--selected-text)'
                        : isToday(day) ? 'var(--accent)'
                        : 'var(--text-secondary)',
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
                {locale === 'ja' ? '← 日付を選択してください' : '← Select a date'}
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
                          onClick={() => toggleSlot(time)}
                          disabled={blocked}
                          className="px-2 py-2.5 text-sm transition-colors"
                          style={{
                            background: selected ? 'var(--accent)' : blocked ? 'var(--surface)' : 'var(--surface)',
                            color: selected ? 'var(--selected-text)' : blocked ? 'var(--text-disabled)' : 'var(--text-secondary)',
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
                className="w-full py-3 font-medium transition-colors disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
              >
                {booking
                  ? <span className="spinner-sm" />
                  : locale === 'ja'
                    ? `${recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length}件のレッスンを予約する`
                    : `Book ${recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length} lesson${(recurringEnabled ? selectedBookings.length * recurringWeeks : selectedBookings.length) > 1 ? 's' : ''}`
                }
              </button>
            </Squircle>
          )}
        </div>
      )}
    </div>
  )
}
