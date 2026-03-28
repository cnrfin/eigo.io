#!/usr/bin/env node
/**
 * One-time script: Replace a student's 15-min trial bookings with 30-min lessons
 * at the same date/time.
 *
 * What it does for each booking:
 *   1. Cancels the old 15-min booking (status → cancelled)
 *   2. Deletes the old Google Calendar event
 *   3. Deletes the old Whereby room
 *   4. Creates a new Whereby room (30 min + 1hr buffer)
 *   5. Creates a new Google Calendar event (30 min)
 *   6. Inserts a new confirmed 30-min booking in Supabase
 *
 * Usage:
 *   node scripts/rebook-15-to-30.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_CALENDAR_ID,
 *   WHEREBY_API_KEY
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

// ── Load .env.local ──
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let val = trimmed.slice(eqIdx + 1).trim()
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  process.env[key] = val
}

// ── Config ──
const STUDENT_EMAIL = 'kie.kubota@gmail.com'
const OLD_DURATION = 15
const NEW_DURATION = 30
const DRY_RUN = process.argv.includes('--dry-run')

// ── Clients ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const calendarAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
})
const calendar = google.calendar({ version: 'v3', auth: calendarAuth })
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID

const WHEREBY_API = 'https://api.whereby.dev/v1'
const WHEREBY_KEY = process.env.WHEREBY_API_KEY

// ── Helpers ──

async function createWherebyRoom(endDate) {
  const res = await fetch(`${WHEREBY_API}/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHEREBY_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endDate,
      roomNamePrefix: 'eigo',
      roomMode: 'normal',
      fields: ['hostRoomUrl'],
      recording: { type: 'cloud', startTrigger: 'automatic-2nd-participant', destination: { provider: 'whereby' } },
    }),
  })
  if (!res.ok) {
    // Retry without recording
    const retry = await fetch(`${WHEREBY_API}/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHEREBY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endDate,
        roomNamePrefix: 'eigo',
        roomMode: 'normal',
        fields: ['hostRoomUrl'],
      }),
    })
    if (!retry.ok) throw new Error(`Whereby create failed: ${retry.status}`)
    return retry.json()
  }
  return res.json()
}

async function deleteWherebyRoom(meetingId) {
  const res = await fetch(`${WHEREBY_API}/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${WHEREBY_KEY}` },
  })
  if (!res.ok && res.status !== 404) {
    console.warn(`  ⚠ Whereby delete failed: ${res.status}`)
  }
}

async function deleteGoogleEvent(eventId) {
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId })
  } catch (err) {
    if (err.code !== 404) console.warn(`  ⚠ Google Calendar delete failed:`, err.message)
  }
}

async function createGoogleEvent({ date, time, durationMinutes, studentName, location }) {
  const startDateTime = `${date}T${time}:00+09:00`
  const endDate = new Date(new Date(startDateTime).getTime() + durationMinutes * 60 * 1000)

  const event = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `Eigo.io Lesson - ${studentName}`,
      description: `${durationMinutes} minute English lesson`,
      location: location || undefined,
      source: { title: 'Eigo.io', url: 'https://eigo.io' },
      start: { dateTime: startDateTime, timeZone: 'Asia/Tokyo' },
      end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Tokyo' },
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }] },
    },
  })
  return event.data
}

// ── Main ──

async function main() {
  console.log(`\n🔍 Looking up ${STUDENT_EMAIL}...\n`)

  // Find user
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('email', STUDENT_EMAIL)
    .single()

  if (profileErr || !profile) {
    console.error('❌ Student not found:', profileErr?.message)
    process.exit(1)
  }

  console.log(`Found: ${profile.display_name || profile.email} (${profile.id})`)

  // Fetch confirmed 15-min bookings
  const { data: bookings, error: bookErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', profile.id)
    .eq('duration_minutes', OLD_DURATION)
    .eq('status', 'confirmed')
    .order('date', { ascending: true })

  if (bookErr) {
    console.error('❌ Failed to fetch bookings:', bookErr.message)
    process.exit(1)
  }

  if (!bookings || bookings.length === 0) {
    console.log('✅ No confirmed 15-min bookings found. Nothing to do.')
    process.exit(0)
  }

  console.log(`\nFound ${bookings.length} confirmed ${OLD_DURATION}-min bookings:\n`)
  for (const b of bookings) {
    console.log(`  📅 ${b.date} at ${b.start_time} (${b.duration_minutes}min) — ID: ${b.id}`)
  }

  if (DRY_RUN) {
    console.log('\n🏁 DRY RUN — no changes made. Remove --dry-run to execute.\n')
    process.exit(0)
  }

  console.log(`\n⏳ Replacing each with a ${NEW_DURATION}-min booking...\n`)

  for (const booking of bookings) {
    console.log(`─── ${booking.date} ${booking.start_time} ───`)

    // 1. Cancel old booking in DB
    const { error: cancelErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)

    if (cancelErr) {
      console.error(`  ❌ DB cancel failed:`, cancelErr.message)
      continue
    }
    console.log(`  ✓ Old booking cancelled in DB`)

    // 2. Delete old Google Calendar event
    if (booking.google_event_id) {
      await deleteGoogleEvent(booking.google_event_id)
      console.log(`  ✓ Old Google Calendar event deleted`)
    }

    // 3. Delete old Whereby room
    if (booking.whereby_meeting_id) {
      await deleteWherebyRoom(booking.whereby_meeting_id)
      console.log(`  ✓ Old Whereby room deleted`)
    }

    // 4. Create new Whereby room (30 min + 1hr buffer)
    const lessonEnd = new Date(`${booking.date}T${booking.start_time}+09:00`)
    lessonEnd.setMinutes(lessonEnd.getMinutes() + NEW_DURATION + 60)

    let wherebyMeetingId = null, wherebyRoomUrl = null, wherebyHostUrl = null
    try {
      const room = await createWherebyRoom(lessonEnd.toISOString())
      wherebyMeetingId = room.meetingId
      const displayName = profile.display_name || STUDENT_EMAIL.split('@')[0]
      wherebyRoomUrl = `${room.roomUrl}?displayName=${encodeURIComponent(displayName)}`
      wherebyHostUrl = room.hostRoomUrl
      console.log(`  ✓ New Whereby room created`)
    } catch (err) {
      console.warn(`  ⚠ Whereby room creation failed:`, err.message)
    }

    // 5. Create new Google Calendar event
    let googleEventId = null
    try {
      const event = await createGoogleEvent({
        date: booking.date,
        time: booking.start_time,
        durationMinutes: NEW_DURATION,
        studentName: profile.display_name || STUDENT_EMAIL,
        location: wherebyRoomUrl,
      })
      googleEventId = event.id
      console.log(`  ✓ New Google Calendar event created`)
    } catch (err) {
      console.error(`  ❌ Google Calendar create failed:`, err.message)
      continue
    }

    // 6. Insert new booking
    const { error: insertErr } = await supabase.from('bookings').insert({
      user_id: profile.id,
      date: booking.date,
      start_time: booking.start_time,
      duration_minutes: NEW_DURATION,
      google_event_id: googleEventId,
      whereby_meeting_id: wherebyMeetingId,
      whereby_room_url: wherebyRoomUrl,
      whereby_host_url: wherebyHostUrl,
      status: 'confirmed',
    })

    if (insertErr) {
      console.error(`  ❌ DB insert failed:`, insertErr.message)
    } else {
      console.log(`  ✓ New ${NEW_DURATION}-min booking created`)
    }

    console.log()
  }

  console.log('✅ Done! All bookings have been replaced.\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
