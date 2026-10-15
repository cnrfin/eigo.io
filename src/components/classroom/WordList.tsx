'use client'

import { useEffect, useRef } from 'react'
import type { SavedWord } from '@/lib/classroom/client'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico } from './Icons'
import { flashRow, flashSaved } from './save-fly'

/**
 * The word list (design: mockups/ai-panel.html): the words and phrases the student saved in this lesson,
 * newest first. It shares the side panel with the chat (one at a time). The review happens after the
 * lesson, so there's nothing else here. A word saved while the list is open flashes once as it arrives.
 */
export default function WordList({
  t,
  words,
  tutorName,
  hidden,
  onRemove,
  onClose,
}: {
  t: ClassroomT
  /** this lesson's words, newest first */
  words: SavedWord[]
  /** the AI tutor's name, shown for phrases it saved */
  tutorName?: string
  hidden: boolean
  onRemove: (w: SavedWord) => void
  onClose: () => void
}) {
  const list = useRef<HTMLDivElement | null>(null)
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const prev = seen.current
    seen.current = new Set(words.map((w) => w.itemId))
    if (!prev || hidden) return
    for (const w of words)
      if (!prev.has(w.itemId)) flashRow(list.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(w.itemId)}"]`) ?? null)
  }, [words, hidden])

  const label = (w: SavedWord) =>
    w.source === 'tutor' ? tutorName || 'AI' : w.source === 'course' ? t('srcCourse') : w.source === 'chat' ? t('srcChat') : t('srcLookup')

  return (
    <div className="chatIn" hidden={hidden}>
      <div className="chatCard wlist">
        <header>
          <h3>
            {t('wordsTitle')}
            {words.length > 0 && <span className="wn">{words.length}</span>}
          </h3>
          <button className="ib" title={t('closeWords')} aria-label={t('closeWords')} onClick={onClose}>
            <Ico name="x" style={{ width: 18, height: 18 }} />
          </button>
        </header>
        {words.length ? (
          <div className="wrows" ref={list}>
            {words.map((w) => (
              <div className="wr" key={w.itemId} data-id={w.itemId}>
                <div className="wt">
                  <b>{w.term}</b>
                  {w.ja && <span>{w.ja}</span>}
                </div>
                <span className={`wsrc${w.source === 'tutor' ? ' ai' : ''}`}>{label(w)}</span>
                <button className="wx" title={t('removeShort')} aria-label={`${t('removeShort')}: ${w.term}`} onClick={() => onRemove(w)}>
                  <Ico name="x" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="wempty">{t('wordsEmpty')}</p>
        )}
      </div>
    </div>
  )
}

/** The word-bank button in the bottom controls: flashes and squashes when a word is saved. */
export function WordsButton({ t, on, count, onClick }: { t: ClassroomT; on: boolean; count: number; onClick: () => void }) {
  const face = useRef<HTMLSpanElement | null>(null)
  const last = useRef(count)
  useEffect(() => {
    if (count > last.current) flashSaved(face.current)
    last.current = count
  }, [count])
  return (
    <button className={`cbtn${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick} data-words-btn="">
      <span className="cface" ref={face}>
        <Ico name="words" />
      </span>
      <span className={`badge soft${count > 0 ? ' show' : ''}`}>{count || ''}</span>
      <span className="lbl">{t('words')}</span>
    </button>
  )
}
