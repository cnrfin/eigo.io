import { google } from 'googleapis'

function getAuthClient() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

function getCalendar() {
  const auth = getAuthClient()
  return google.calendar({ version: 'v3', auth })
}

function getCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID!
}

/**
 * Teaching windows in JST (Asia/Tokyo):
 *   Default: 06:00-09:00 and 16:00-02:00
 *   Configurable via site_settings.time_windows
 *
 * Slots are always generated in JST, then converted to the user's timezone for display.
 * Bookings are always stored as JST on Google Calendar.
 */

export type TimeWindow = { open: number; close: number }

const DEFAULT_WINDOWS: TimeWindow[] = [
  { open: 6, close: 9 },
  { open: 16, close: 2 },
]

/**
 * Generate all possible JST slot start times for a single time window.
 * close < open means the window wraps past midnight.
 * Slots are spaced by `incrementMinutes` (defaults to 15).
 */
function generateWindowSlots(window: TimeWindow, incrementMinutes: number = 15): string[] {
  const slots: string[] = []
  const addSlots = (startHour: number, endHour: number) => {
    for (let totalMin = startHour * 60; totalMin < endHour * 60; totalMin += incrementMinutes) {
      const h = Math.floor(totalMin / 60) % 24
      const m = totalMin % 60
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  if (window.close > window.open) {
    // Same-day window (e.g. 06:00-09:00)
    addSlots(window.open, window.close)
  } else {
    // Overnight window (e.g. 16:00-02:00)
    addSlots(window.open, 24)
    addSlots(0, window.close)
  }
  return slots
}

/**
 * Generate all slots across multiple time windows.
 * Increment matches the lesson duration so slots don't overlap.
 */
function generateAllSlots(windows: TimeWindow[], incrementMinutes: number = 15): string[] {
  const allSlots: string[] = []
  for (const w of windows) {
    allSlots.push(...generateWindowSlots(w, incrementMinutes))
  }
  return allSlots
}

/**
 * Check if a given hour falls within any of the time windows.
 * Returns the window it belongs to, or null.
 */
function findWindow(hour: number, windows: TimeWindow[]): TimeWindow | null {
  for (const w of windows) {
    if (w.close > w.open) {
      // Same-day: hour must be >= open and < close
      if (hour >= w.open && hour < w.close) return w
    } else {
      // Overnight: hour >= open OR hour < close
      if (hour >= w.open || hour < w.close) return w
    }
  }
  return null
}

/**
 * Get the continuous closing hour for a window (for overflow checks).
 * e.g. close=2 with open=16 → 26 (2 + 24)
 */
function getContinuousClosing(window: TimeWindow): number {
  if (window.close > window.open) return window.close
  return window.close + 24
}

// Static fallback (15-min default increment)
const ALL_SLOTS_JST = generateAllSlots(DEFAULT_WINDOWS, 15)

/**
 * Convert a JST datetime to a specific timezone and return the local HH:MM and date
 */
function jstToTimezone(jstDate: string, jstTime: string, timezone: string): { localTime: string; localDate: string } {
  // Create a Date object from JST
  const dt = new Date(`${jstDate}T${jstTime}:00+09:00`)

  // Format in the target timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(dt)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''

  const localTime = `${get('hour')}:${get('minute')}`
  const localDate = `${get('year')}-${get('month')}-${get('day')}`

  return { localTime, localDate }
}

/**
 * Convert a user's local time back to JST for storage/booking
 */
function timezoneToJst(localDate: string, localTime: string, timezone: string): { jstDate: string; jstTime: string } {
  // Strategy: treat localDate + localTime as if UTC, then compute the offset
  // between the user's timezone and UTC at that instant, and adjust.
  // This avoids day-of-month arithmetic that breaks at month boundaries.

  const refUtc = new Date(`${localDate}T${localTime}:00Z`)

  const targetFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const jstFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })

  // What does the user's timezone show for this UTC instant?
  const userParts = targetFormatter.formatToParts(refUtc)
  const g = (type: string) => userParts.find(p => p.type === type)?.value || ''
  // Reconstruct the shown datetime as a UTC timestamp for comparison
  const userShownUtc = new Date(`${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}Z`)

  // The requested local datetime as a UTC timestamp (for subtraction only)
  const requestedUtc = new Date(`${localDate}T${localTime}:00Z`)

  // Difference = how far off the shown time is from what was requested
  const diffMs = requestedUtc.getTime() - userShownUtc.getTime()

  // Adjust the reference UTC by this difference to get the true UTC instant
  const correctedUtc = new Date(refUtc.getTime() + diffMs)

  // Now format in JST
  const jstParts = jstFormatter.formatToParts(correctedUtc)
  const jstGet = (type: string) => jstParts.find(p => p.type === type)?.value || ''

  const jstDate = `${jstGet('year')}-${jstGet('month')}-${jstGet('day')}`
  const jstTime = `${jstGet('hour')}:${jstGet('minute')}`

  return { jstDate, jstTime }
}

/**
 * Get busy times from Google Calendar for a date range
 */
export async function getBusyTimes(dateStart: string, dateEnd: string): Promise<{ start: string; end: string }[]> {
  const calendar = getCalendar()

  const timeMin = `${dateStart}T00:00:00Z`
  const timeMax = `${dateEnd}T23:59:59Z`

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: getCalendarId() }],
    },
  })

  const busy = response.data.calendars?.[getCalendarId()]?.busy || []
  return busy.map((b) => ({
    start: b.start || '',
    end: b.end || '',
  }))
}

/**
 * Generate available time slots for a given date (in the user's timezone),
 * converted from JST teaching windows.
 *
 * @param userDate - The date the user selected, in YYYY-MM-DD (their local date)
 * @param durationMinutes - Lesson duration
 * @param timezone - User's IANA timezone (e.g. 'Europe/London', 'Asia/Tokyo')
 * @returns Array of HH:MM strings in the user's local timezone
 */
export async function getAvailableSlots(
  userDate: string,
  durationMinutes: number,
  timezone: string = 'Asia/Tokyo',
  siteSettings?: { time_windows?: TimeWindow[]; booking_buffer_hours?: number },
): Promise<string[]> {
  const windows = siteSettings?.time_windows ?? DEFAULT_WINDOWS
  const bufferHours = siteSettings?.booking_buffer_hours ?? 0
  // Always use 15-min increments — overlap prevention is handled on the frontend
  const slotsJst = generateAllSlots(windows, 15)

  // We need to check JST dates that could map to this user date.
  // A user date could span up to 2 JST dates depending on timezone offset.
  // Use plain calendar arithmetic to avoid UTC conversion bugs with toISOString().
  const [uy, um, ud] = userDate.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

  const jstDates = [
    fmt(new Date(uy, um - 1, ud - 1)),
    userDate,
    fmt(new Date(uy, um - 1, ud + 1)),
  ]

  // Fetch busy times for the full range
  const busyTimes = await getBusyTimes(jstDates[0], jstDates[2])

  // Generate all possible JST slots across these dates, convert to user's timezone,
  // and keep only those that fall on the user's requested date
  const userSlots: { localTime: string; jstDate: string; jstTime: string }[] = []

  for (const jstDate of jstDates) {
    for (const jstTime of slotsJst) {
      const [hours, minutes] = jstTime.split(':').map(Number)

      // Find which window this slot belongs to
      const window = findWindow(hours, windows)
      if (!window) continue

      // Check if the slot + duration stays within the window
      const contHours = hours < window.open ? hours + 24 : hours
      const maxHour = getContinuousClosing(window)
      const endMinutes = contHours * 60 + minutes + durationMinutes
      if (endMinutes > maxHour * 60) continue // overflow past window closing

      // For overnight windows: slots after midnight belong to the NEXT calendar day
      // e.g. the 00:30 slot in the "March 24 evening window" is actually March 25 00:30 JST
      let actualJstDate = jstDate
      if (window.close < window.open && hours < window.open) {
        const [y, m, d] = jstDate.split('-').map(Number)
        const next = new Date(y, m - 1, d + 1)
        actualJstDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
      }

      // Convert to user's timezone
      const { localTime, localDate } = jstToTimezone(actualJstDate, jstTime, timezone)

      // Only include slots that fall on the user's requested date
      if (localDate === userDate) {
        userSlots.push({ localTime, jstDate: actualJstDate, jstTime })
      }
    }
  }

  // Filter out busy slots
  const available = userSlots.filter(({ jstDate, jstTime }) => {
    const slotStart = new Date(`${jstDate}T${jstTime}:00+09:00`)
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)

    return !busyTimes.some((busy) => {
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)
      return slotStart < busyEnd && slotEnd > busyStart
    })
  })

  // Filter out past slots and slots within the booking buffer
  const now = new Date()
  const bufferMs = bufferHours * 60 * 60 * 1000
  const filtered = available.filter(({ jstDate, jstTime }) => {
    const slotTime = new Date(`${jstDate}T${jstTime}:00+09:00`)
    return slotTime.getTime() > now.getTime() + bufferMs
  })

  // Sort by local time and deduplicate
  const sorted = filtered
    .sort((a, b) => a.localTime.localeCompare(b.localTime))
    .filter((slot, i, arr) => i === 0 || slot.localTime !== arr[i - 1].localTime)

  return sorted.map(s => s.localTime)
}

/**
 * Create a booking event on Google Calendar
 * The time/date can come in the user's timezone — we convert to JST for storage
 */
export async function createBookingEvent(params: {
  date: string
  time: string
  durationMinutes: number
  studentEmail: string
  studentName?: string
  timezone?: string
  location?: string
}) {
  const calendar = getCalendar()
  const { date, time, durationMinutes, studentEmail, studentName, timezone = 'Asia/Tokyo', location } = params

  // Convert user's local time to JST
  const { jstDate, jstTime } = timezoneToJst(date, time, timezone)

  const startDateTime = `${jstDate}T${jstTime}:00+09:00`
  const startDate = new Date(startDateTime)
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

  const event = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary: `Eigo.io Lesson - ${studentName || studentEmail}`,
      description: `${durationMinutes} minute English lesson with ${studentEmail}`,
      location: location || undefined,
      source: {
        title: 'Eigo.io',
        url: 'https://eigo.io',
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    },
  })

  return { ...event.data, jstDate, jstTime }
}

/**
 * Get upcoming lessons for a specific student (by email)
 */
export async function getUpcomingLessons(studentEmail: string) {
  const calendar = getCalendar()
  const now = new Date().toISOString()

  const response = await calendar.events.list({
    calendarId: getCalendarId(),
    timeMin: now,
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime',
    q: studentEmail,
  })

  const events = response.data.items || []

  return events
    .filter((event) => {
      const desc = event.description || ''
      const summary = event.summary || ''
      return desc.includes(studentEmail) || summary.includes(studentEmail)
    })
    .map((event) => ({
      id: event.id || '',
      summary: event.summary || '',
      date: event.start?.dateTime?.split('T')[0] || '',
      startTime: event.start?.dateTime || '',
      endTime: event.end?.dateTime || '',
      status: event.status || 'confirmed',
    }))
}

/**
 * Delete/cancel a booking event
 */
export async function cancelBookingEvent(eventId: string) {
  const calendar = getCalendar()
  await calendar.events.delete({
    calendarId: getCalendarId(),
    eventId,
  })
}

export { timezoneToJst, jstToTimezone }
