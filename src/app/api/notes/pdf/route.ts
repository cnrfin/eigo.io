import { NextRequest, NextResponse } from 'next/server'
import { adminClient, fetchNotes, noteFileStem, userFromRequest, type LessonNote } from '@/lib/lesson-notes'
import { renderNotesPdf } from '@/lib/notes-pdf'

export const runtime = 'nodejs'

/**
 * GET /api/notes/pdf?id=<note id>  — one note as a PDF
 * GET /api/notes/pdf               — all of the student's notes, one per page
 * Japanese is set in Noto Sans JP (public/fonts, static Regular cut), subset per file.
 */
export async function GET(request: NextRequest) {
  const user = await userFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const locale = url.searchParams.get('locale') === 'ja' ? 'ja' : 'en'
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  let notes: LessonNote[]
  try {
    notes = await fetchNotes(adminClient(), user.id, id ? [id] : undefined)
  } catch (e) {
    console.error('notes pdf fetch failed:', e)
    return NextResponse.json({ error: 'Could not load notes' }, { status: 500 })
  }
  if (!notes.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const bytes = await renderNotesPdf(notes, locale, await loadFont(url.origin))
  const name = `${noteFileStem(id ? notes[0] : undefined)}.pdf`
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

// The font is a public asset; fetch it once per server instance.
let fontBytes: Promise<ArrayBuffer> | null = null
function loadFont(origin: string) {
  fontBytes ??= fetch(new URL('/fonts/NotoSansJP-Regular.ttf', origin)).then((r) => {
    if (!r.ok) throw new Error(`font ${r.status}`)
    return r.arrayBuffer()
  }).catch((e) => { fontBytes = null; throw e })
  return fontBytes
}
