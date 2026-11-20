'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import SquircleBox from '@/components/ui/SquircleBox'
import SkeletonCard from '@/components/ui/SkeletonCard'
import DownloadMenu, { saveFile, type DownloadOption } from '@/components/ui/DownloadMenu'
import {
  formatNoteDate, noteFileStem, noteLabel, noteTitle, notesToText, type LessonNote,
} from '@/lib/lesson-notes'

const JA_TEXT = 'whitespace-pre-line [word-break:auto-phrase] [line-break:strict]'

/**
 * Notes tab: lesson notes the teacher saved to the student, as a grid of tiles.
 * A tile opens the note in a reader; both offer .PDF / .TXT downloads.
 */
export default function NotesView({
  token,
  locale,
  onUnreadChange,
}: {
  token: string
  locale: string
  onUnreadChange?: (unread: number) => void
}) {
  const ja = locale === 'ja'
  const [notes, setNotes] = useState<LessonNote[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/notes', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setNotes(data.notes ?? [])
    } catch {
      setError(true)
      setNotes((n) => n ?? [])
    }
  }, [token])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (notes) onUnreadChange?.(notes.filter((n) => !n.seen_at).length)
  }, [notes, onUnreadChange])

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!notes || !term) return notes ?? []
    return notes.filter((n) => `${noteLabel(n)} ${noteTitle(n)} ${n.body}`.toLowerCase().includes(term))
  }, [notes, query])

  const open = notes?.find((n) => n.id === openId) ?? null
  const openNote = (n: LessonNote) => {
    setOpenId(n.id)
    if (!n.seen_at) {
      setNotes((all) => all?.map((x) => (x.id === n.id ? { ...x, seen_at: new Date().toISOString() } : x)) ?? all)
      fetch('/api/notes', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
  }

  const [busy, setBusy] = useState(false)
  const downloadPdf = async (note?: LessonNote) => {
    setBusy(true)
    try {
      const q = new URLSearchParams({ locale })
      if (note) q.set('id', note.id)
      const res = await fetch(`/api/notes/pdf?${q}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(String(res.status))
      saveFile(await res.blob(), `${noteFileStem(note)}.pdf`)
    } catch {
      alertDownloadFailed(ja)
    } finally {
      setBusy(false)
    }
  }
  const options = (note?: LessonNote): DownloadOption[] => [
    { label: '.PDF', sub: ja ? '印刷・保存用' : 'To print or keep', onSelect: () => downloadPdf(note) },
    {
      label: '.TXT',
      sub: ja ? '編集できるテキスト' : 'Plain text you can edit',
      onSelect: () => saveFile(notesToText(note ? [note] : (notes ?? []), locale), `${noteFileStem(note)}.txt`),
    },
  ]

  const title = ja ? 'ノート' : 'Notes'

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="flex-1 text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
        {!!notes?.length && <DownloadMenu label={ja ? 'ダウンロード' : 'Download'} options={options()} busy={busy && !open} />}
      </div>

      {notes === null ? (
        <SkeletonCard rows={4} />
      ) : notes.length === 0 ? (
        <SquircleBox cornerRadius={22} className="p-8 text-center" style={{ background: 'var(--card)' }}>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            {error ? (ja ? 'ノートを読み込めませんでした' : "Couldn't load your notes") : (ja ? 'まだノートはありません' : 'No notes yet')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-subtle)' }}>
            {error
              ? (ja ? 'しばらくしてからもう一度お試しください。' : 'Please try again in a moment.')
              : (ja ? '先生がレッスンのノートを保存すると、ここに表示されます。' : 'When your teacher saves notes from a lesson, they appear here.')}
          </p>
          {error && (
            <button onClick={load} className="mt-4 text-sm font-medium transition-opacity hover:opacity-80" style={{ color: 'var(--accent)' }}>
              {ja ? '再読み込み' : 'Try again'}
            </button>
          )}
        </SquircleBox>
      ) : (
        <>
          <label className="mb-5 h-11 px-4 rounded-full flex items-center gap-2.5 focus-within:ring-[1.5px] focus-within:ring-[var(--accent)]" style={{ background: 'var(--card)', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ja ? 'ノートを検索' : 'Search notes'}
              aria-label={ja ? 'ノートを検索' : 'Search notes'}
              className="flex-1 min-w-0 bg-transparent outline-none text-base"
              style={{ color: 'var(--text)' }}
            />
          </label>

          {shown.length === 0 ? (
            <p className="px-1 text-[15px]" style={{ color: 'var(--text-muted)' }}>{ja ? '一致するノートはありません。' : 'No notes match your search.'}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
              {shown.map((n) => (
                <NoteTile key={n.id} note={n} locale={locale} onOpen={() => openNote(n)} />
              ))}
            </div>
          )}
        </>
      )}

      <NoteReader note={open} locale={locale} onClose={() => setOpenId(null)} menu={open ? <DownloadMenu
        label={ja ? 'ダウンロード' : 'Download'}
        options={options(open)}
        busy={busy}
        placement="above"
        surface="var(--surface)"
      /> : null} />
    </div>
  )
}

function alertDownloadFailed(ja: boolean) {
  window.alert(ja ? 'ダウンロードできませんでした。もう一度お試しください。' : "Couldn't download. Please try again.")
}

// The tile's few lines of text: the teacher's own notes when the note has a "Notes" section
// (Engoo lessons save the lesson first and the notes after it), never the dashed heading underlines.
function notePreview(body: string) {
  const at = body.lastIndexOf('\nNotes\n-----\n')
  const own = at >= 0 ? body.slice(at + 13) : body
  const lines = own.split('\n').map((l) => l.trim()).filter((l) => l && !/^-+$/.test(l))
  return (lines.length ? lines : body.split('\n').filter((l) => l.trim() && !/^\s*-+\s*$/.test(l))).slice(0, 3).join(' ')
}

function NoteTile({ note, locale, onOpen }: { note: LessonNote; locale: string; onOpen: () => void }) {
  const preview = notePreview(note.body)
  return (
    <button
      onClick={onOpen}
      className="group block min-w-0 text-left transition-transform duration-[120ms] ease-out active:scale-[0.97] focus-visible:outline-none"
      aria-label={`${noteLabel(note)} ${noteTitle(note)}`}
    >
      <SquircleBox
        cornerRadius={22}
        className="relative aspect-square p-4 sm:p-5 flex flex-col transition-colors duration-150 group-hover:bg-[var(--surface)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent)]"
        style={{ background: 'var(--card)' }}
      >
        {!note.seen_at && <span className="absolute top-5 right-5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} aria-label={locale === 'ja' ? '未読' : 'New'} />}
        <span className="text-[13px] truncate pr-4" style={{ color: 'var(--text-muted)' }}>{noteLabel(note)}</span>
        <span className="mt-1 text-[17px] sm:text-[19px] leading-[1.3] font-semibold line-clamp-2 tracking-[-0.01em]" style={{ color: 'var(--text)' }}>{noteTitle(note)}</span>
        <span
          lang="ja"
          className="hidden sm:block mt-3 text-[13.5px] leading-[1.6] h-[4.8em] overflow-hidden [word-break:auto-phrase] [line-break:strict] [mask-image:linear-gradient(#000_25%,transparent)]"
          style={{ color: 'var(--text-muted)' }}
        >
          {preview}
        </span>
        <span className="mt-auto flex items-center justify-between min-h-6">
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatNoteDate(note.date, locale)}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            className="hidden [@media(hover:hover)]:block opacity-0 translate-y-0.5 transition-[opacity,transform] duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100"
            style={{ color: 'var(--text-secondary)' }}>
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </span>
      </SquircleBox>
    </button>
  )
}

function NoteReader({ note, locale, onClose, menu }: { note: LessonNote | null; locale: string; onClose: () => void; menu: React.ReactNode }) {
  const ja = locale === 'ja'
  const closeRef = useRef<HTMLButtonElement>(null)
  // which note was just copied (so the tick doesn't carry over to the next note)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copied = !!note && copiedId === note.id

  useEffect(() => {
    if (!note) return
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [note, onClose])

  const copy = () => {
    if (!note) return
    const id = note.id
    navigator.clipboard?.writeText(note.body).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
    }).catch(() => {})
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {note && (
        <motion.div
          key="note-reader"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6"
          style={{ background: 'var(--overlay)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-reader-title"
            className="w-full sm:max-w-[680px] max-h-[92vh] sm:max-h-[calc(100vh-48px)] flex flex-col rounded-t-[28px] sm:rounded-[28px] overflow-visible"
            style={{ background: 'var(--card)' }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-start gap-3 pl-7 pr-5 pt-6 pb-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{noteLabel(note)}</p>
                <h2 id="note-reader-title" className="mt-0.5 text-2xl font-semibold tracking-[-0.02em] leading-tight" style={{ color: 'var(--text)' }}>{noteTitle(note)}</h2>
              </div>
              <ReaderButton onClick={copy} label={copied ? (ja ? 'コピーしました' : 'Copied') : (ja ? 'コピー' : 'Copy')}>
                {copied
                  ? <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2" />
                  : <><rect x="9" y="9" width="11" height="11" rx="3" /><path d="M5 15V7a3 3 0 0 1 3-3h7" /></>}
              </ReaderButton>
              <ReaderButton onClick={onClose} label={ja ? '閉じる' : 'Close'} buttonRef={closeRef}>
                <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" />
              </ReaderButton>
            </div>
            <div lang="ja" className={`overflow-y-auto px-7 pb-6 text-[17px] leading-[1.85] ${JA_TEXT}`} style={{ color: 'var(--text-secondary)' }}>
              {note.body}
            </div>
            <div className="flex items-center gap-2 pl-7 pr-5 pt-3.5 pb-5 border-t" style={{ borderColor: 'var(--divider)' }}>
              <span className="flex-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatNoteDate(note.date, locale)}</span>
              {menu}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ReaderButton({ onClick, label, children, buttonRef }: {
  onClick: () => void; label: string; children: React.ReactNode; buttonRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-transform duration-[120ms] ease-out active:scale-90 hover:bg-[var(--surface-hover)]"
      style={{ background: 'var(--surface)', color: 'var(--text)' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
    </button>
  )
}
