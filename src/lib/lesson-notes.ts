import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { verifySupabaseToken, type JwtUser } from '@/lib/supabase-jwt'

/** A note the teacher saved to the student from a course page (public.lesson_notes). */
export type LessonNote = {
  id: string
  course_id: string
  course_name: string
  lesson_id: string
  lesson_title: string
  body: string
  created_at: string
  updated_at: string
  seen_at: string | null
  /** The lesson date (booking date when the note belongs to a booking, else the day it was written), YYYY-MM-DD. */
  date: string
}

const SELECT = 'id, course_id, course_name, lesson_id, lesson_title, body, created_at, updated_at, seen_at, booking:bookings(date)'

type Row = Omit<LessonNote, 'date'> & { booking: { date: string } | { date: string }[] | null }

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function userFromRequest(request: NextRequest): Promise<JwtUser | null> {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  const verified = await verifySupabaseToken(header.slice(7))
  return verified.ok ? verified.user : null
}

/** The student's notes, newest lesson first. Pass ids to fetch only those. */
export async function fetchNotes(db: SupabaseClient, userId: string, ids?: string[]): Promise<LessonNote[]> {
  let q = db.from('lesson_notes').select(SELECT).eq('user_id', userId).neq('body', '')
  if (ids) q = q.in('id', ids)
  const { data, error } = await q
  if (error) throw error
  return ((data ?? []) as unknown as Row[])
    .map(({ booking, ...n }) => {
      const b = Array.isArray(booking) ? booking[0] : booking
      return { ...n, date: b?.date ?? n.created_at.slice(0, 10) }
    })
    .sort((a, b) => (a.date === b.date ? b.updated_at.localeCompare(a.updated_at) : b.date.localeCompare(a.date)))
}

/** "Lesson 3" from "lesson-3"; '' when the id has no number. */
export function lessonNumberLabel(lessonId: string): string {
  const m = /(\d+)$/.exec(lessonId)
  return m ? `Lesson ${m[1]}` : ''
}

/** Small grey label over the title, e.g. "IELTS · Lesson 3". */
export function noteLabel(n: Pick<LessonNote, 'course_name' | 'lesson_id'>): string {
  return [n.course_name, lessonNumberLabel(n.lesson_id)].filter(Boolean).join(' · ')
}

export function noteTitle(n: Pick<LessonNote, 'lesson_title' | 'lesson_id'>): string {
  return n.lesson_title || lessonNumberLabel(n.lesson_id) || 'Lesson notes'
}

export function formatNoteDate(date: string, locale: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return locale === 'ja'
    ? `${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Plain-text export of one or more notes. */
export function notesToText(notes: LessonNote[], locale: string): string {
  return notes
    .map((n) => {
      const head = [noteTitle(n), [noteLabel(n), formatNoteDate(n.date, locale)].filter(Boolean).join(' · ')]
      return `${head.join('\n')}\n\n${n.body.trim()}\n`
    })
    .join('\n\n')
}

/** ASCII-only file name stem, e.g. "eigo-notes-ielts-lesson-3". */
export function noteFileStem(n?: Pick<LessonNote, 'course_name' | 'lesson_id'>): string {
  if (!n) return 'eigo-notes'
  const part = [n.course_name, lessonNumberLabel(n.lesson_id)].filter(Boolean).join('-')
  const slug = part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug ? `eigo-notes-${slug}` : 'eigo-notes'
}
