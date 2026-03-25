import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!

/**
 * Create an OAuth2 client using the student's refresh token
 */
function getStudentOAuthClient(refreshToken: string) {
  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

/**
 * Fetch the student's Google Calendar refresh token from the profiles table
 */
async function getStudentRefreshToken(userId: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('profiles')
    .select('google_calendar_refresh_token, google_calendar_connected')
    .eq('id', userId)
    .single()

  if (!data?.google_calendar_connected || !data?.google_calendar_refresh_token) {
    return null
  }

  return data.google_calendar_refresh_token
}

/**
 * Create an event on the student's Google Calendar.
 * Returns the event ID if successful, or null if the student hasn't connected their calendar.
 */
export async function createStudentCalendarEvent({
  userId,
  title,
  description,
  startDateTime,
  endDateTime,
  location,
}: {
  userId: string
  title: string
  description: string
  startDateTime: string  // ISO with timezone, e.g. '2026-03-27T14:00:00+09:00'
  endDateTime: string
  location?: string
}): Promise<string | null> {
  const refreshToken = await getStudentRefreshToken(userId)
  if (!refreshToken) return null

  try {
    const auth = getStudentOAuthClient(refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description,
        location: location || undefined,
        start: {
          dateTime: startDateTime,
          timeZone: 'Asia/Tokyo',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Asia/Tokyo',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    })

    return event.data.id || null
  } catch (err) {
    console.error(`Failed to create student calendar event for user ${userId}:`, err)
    return null
  }
}

/**
 * Delete an event from the student's Google Calendar.
 */
export async function deleteStudentCalendarEvent({
  userId,
  eventId,
}: {
  userId: string
  eventId: string
}): Promise<boolean> {
  const refreshToken = await getStudentRefreshToken(userId)
  if (!refreshToken) return false

  try {
    const auth = getStudentOAuthClient(refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })

    return true
  } catch (err) {
    console.error(`Failed to delete student calendar event for user ${userId}:`, err)
    return false
  }
}

/**
 * Create multiple events on the student's Google Calendar (for recurring bookings).
 * Returns an array of event IDs (null for any that failed).
 */
export async function createStudentCalendarEvents({
  userId,
  events,
}: {
  userId: string
  events: {
    title: string
    description: string
    startDateTime: string
    endDateTime: string
    location?: string
  }[]
}): Promise<(string | null)[]> {
  const refreshToken = await getStudentRefreshToken(userId)
  if (!refreshToken) return events.map(() => null)

  const auth = getStudentOAuthClient(refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const results: (string | null)[] = []

  for (const ev of events) {
    try {
      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: ev.title,
          description: ev.description,
          location: ev.location || undefined,
          start: {
            dateTime: ev.startDateTime,
            timeZone: 'Asia/Tokyo',
          },
          end: {
            dateTime: ev.endDateTime,
            timeZone: 'Asia/Tokyo',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        },
      })
      results.push(event.data.id || null)
    } catch (err) {
      console.error(`Failed to create student calendar event:`, err)
      results.push(null)
    }
  }

  return results
}

/**
 * Delete multiple events from the student's Google Calendar.
 */
export async function deleteStudentCalendarEvents({
  userId,
  eventIds,
}: {
  userId: string
  eventIds: string[]
}): Promise<void> {
  const refreshToken = await getStudentRefreshToken(userId)
  if (!refreshToken) return

  const auth = getStudentOAuthClient(refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  for (const eventId of eventIds) {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      })
    } catch (err) {
      console.error(`Failed to delete student calendar event ${eventId}:`, err)
    }
  }
}
