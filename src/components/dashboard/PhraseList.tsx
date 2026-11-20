'use client'

/**
 * The Phrases tab, in the app's style: a card that starts today's review, then every
 * saved phrase on its own card with a ring for how well it's remembered (FSRS
 * stability towards mastered). Clicking a card shows its example and explanation;
 * the ⋯ menu deletes it, with a few seconds to undo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import SquircleBox from '@/components/ui/SquircleBox'
import { memoryStrength, type FsrsFields } from '@/lib/fsrs'
import { formatNextReview } from '@/lib/srs'

type Sort = 'recent' | 'az' | 'memory'
const UNDO_MS = 4000
const PAGE = 30
const EASE = [0.22, 1, 0.36, 1] as const

export type ListCard = Partial<FsrsFields> & {
  id: string
  next_review_at: string
  created_at?: string | null
  phrase: {
    phrase_en: string
    translation_ja: string
    example_en?: string | null
    explanation_en?: string | null
    explanation_ja?: string | null
  } | null
}

function Ring({ value }: { value: number }) {
  const r = 12.25, c = 2 * Math.PI * r
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--inset)" strokeWidth="3.5" />
      {value > 0 && <circle cx="15" cy="15" r={r} fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />}
    </svg>
  )
}

type MenuPos = { right: number; top?: number; bottom?: number }

/**
 * A small popover menu, closed by Esc, a click elsewhere, scrolling or resizing.
 * It's drawn in a portal at the button's position: the cards are squircles, which
 * clip anything inside them that spills past their edge.
 */
function Menu({ label, items }: { label: string; items: { label: string; danger?: boolean; onSelect: () => void }[] }) {
  const [pos, setPos] = useState<MenuPos | null>(null)
  const open = pos !== null
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) close()
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); btn.current?.focus() } }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])
  const toggle = () => {
    if (open || !btn.current) { setPos(null); return }
    const r = btn.current.getBoundingClientRect()
    const right = window.innerWidth - r.right
    // opens upwards when there isn't room below
    setPos(r.bottom + 8 + items.length * 44 + 12 > window.innerHeight ? { right, bottom: window.innerHeight - r.top + 6 } : { right, top: r.bottom + 6 })
  }
  return (
    <div className="shrink-0">
      <button
        ref={btn}
        onClick={(e) => { e.stopPropagation(); toggle() }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-[transform,opacity] duration-[120ms] ease-out hover:opacity-70 active:scale-90"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {pos && (
          <motion.div
            ref={menu}
            role="menu"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE }}
            className={`fixed z-50 min-w-[180px] p-1.5 rounded-2xl ${pos.top !== undefined ? 'origin-top-right' : 'origin-bottom-right'}`}
            style={{ ...pos, background: 'var(--surface)', boxShadow: '0 12px 34px rgba(0,0,0,0.28)' }}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setPos(null); it.onSelect() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: it.danger ? 'var(--danger)' : 'var(--text)' }}
              >
                {it.danger && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                )}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  )
}

function SortPill({ sort, setSort, ja }: { sort: Sort; setSort: (s: Sort) => void; ja: boolean }) {
  const labels: Record<Sort, string> = ja ? { recent: '最近', az: 'A–Z', memory: '記憶' } : { recent: 'Recent', az: 'A–Z', memory: 'Memory' }
  return (
    <label className="relative h-9 rounded-full flex items-center text-[15px] font-medium" style={{ background: 'var(--card)', color: 'var(--text)' }}>
      <span className="sr-only">{ja ? '並び替え' : 'Sort by'}</span>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as Sort)}
        className="appearance-none bg-transparent h-full pl-3.5 pr-8 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ color: 'inherit' }}
      >
        {(['recent', 'az', 'memory'] as Sort[]).map((k) => <option key={k} value={k}>{labels[k]}</option>)}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="absolute right-3 pointer-events-none"><path d="M6 9l6 6 6-6" /></svg>
    </label>
  )
}

export default function PhraseList({ cards, today, locale, onStart, onRemove, headerRight }: {
  cards: ListCard[]
  /** how many are in today's batch */
  today: number
  locale: string
  onStart: () => void
  onRemove: (id: string) => void
  headerRight?: React.ReactNode
}) {
  const ja = locale === 'ja'
  const [sort, setSort] = useState<Sort>('recent')
  const [open, setOpen] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE)
  // deleted but still undoable: hidden now, removed for real after UNDO_MS
  const [undo, setUndo] = useState<{ id: string; text: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const removeRef = useRef(onRemove)
  useEffect(() => { removeRef.current = onRemove }, [onRemove])

  // leaving the tab commits a delete still waiting on Undo
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const pendingId = useRef<string | null>(null)
  useEffect(() => () => { if (pendingId.current) removeRef.current(pendingId.current) }, [])

  const commit = () => {
    if (timer.current) clearTimeout(timer.current)
    if (pendingId.current) removeRef.current(pendingId.current)
    pendingId.current = null
  }
  const remove = (c: ListCard) => {
    commit() // one undo at a time
    pendingId.current = c.id
    setUndo({ id: c.id, text: c.phrase?.phrase_en ?? '' })
    timer.current = setTimeout(() => { commit(); setUndo(null) }, UNDO_MS)
  }
  const restore = () => {
    if (timer.current) clearTimeout(timer.current)
    pendingId.current = null
    setUndo(null)
  }

  const shown = useMemo(() => {
    const list = cards.filter((c) => c.phrase && c.id !== undo?.id)
    if (sort === 'az') return list.sort((a, b) => a.phrase!.phrase_en.localeCompare(b.phrase!.phrase_en, 'en', { sensitivity: 'base' }))
    if (sort === 'memory') return list.sort((a, b) => memoryStrength(a) - memoryStrength(b))
    return list.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0))
  }, [cards, sort, undo])

  const minutes = Math.max(1, Math.round((today * 20) / 60))

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <h1 className="flex-1 text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text)' }}>{ja ? 'フレーズ' : 'Phrases'}</h1>
        {headerRight}
        <SortPill sort={sort} setSort={(s) => { setSort(s); setVisible(PAGE) }} ja={ja} />
      </div>

      {today > 0 && (
        <SquircleBox cornerRadius={22} className="mb-3.5 p-4 sm:py-[18px] sm:pl-[22px] sm:pr-[18px] flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4" style={{ background: 'var(--card)' }}>
          <div className="flex-1">
            <p className="text-[17px] sm:text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
              {ja ? `今日の復習: ${today}個のフレーズ` : `${today} phrase${today === 1 ? '' : 's'} to review today`}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {ja ? `約${minutes}分 · 意味・文の完成・組み立て` : `About ${minutes} minute${minutes === 1 ? '' : 's'} · meaning, sentences and build it`}
            </p>
          </div>
          <button
            onClick={onStart}
            className="h-12 w-full sm:w-auto px-7 rounded-full text-base font-semibold shrink-0 transition-transform duration-[120ms] ease-out active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
          >
            {ja ? '復習をはじめる' : 'Start review'}
          </button>
        </SquircleBox>
      )}

      <AnimatePresence>
        {undo && (
          <motion.div
            key="undo"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
            role="status"
          >
            <div className="mb-2 h-12 px-4 rounded-[20px] flex items-center gap-3" style={{ background: 'var(--inset)' }}>
              <p className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                {ja ? 'フレーズを削除しました' : 'Phrase deleted'}
              </p>
              <button onClick={restore} className="h-8 px-3.5 rounded-full text-sm font-semibold transition-transform duration-[120ms] ease-out active:scale-95" style={{ background: 'var(--card)', color: 'var(--text)' }}>
                {ja ? '元に戻す' : 'Undo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        {shown.slice(0, visible).map((c) => {
          const p = c.phrase!
          const isOpen = open === c.id
          const explanation = ja ? p.explanation_ja || p.explanation_en : p.explanation_en || p.explanation_ja
          return (
            <motion.div key={c.id} layout="position" transition={{ duration: 0.3, ease: EASE }}>
              <SquircleBox cornerRadius={20} style={{ background: 'var(--card)' }}>
                <div className="flex items-center gap-3.5 pl-4 pr-2 py-3.5">
                  <button
                    onClick={() => setOpen(isOpen ? null : c.id)}
                    aria-expanded={isOpen}
                    className="flex-1 min-w-0 flex items-center gap-3.5 text-left"
                  >
                    <Ring value={memoryStrength(c)} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[16.5px] font-medium" style={{ color: 'var(--text)' }}>{p.phrase_en}</span>
                      {!!p.translation_ja && <span lang="ja" className="block mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{p.translation_ja}</span>}
                    </span>
                  </button>
                  <Menu
                    label={ja ? `${p.phrase_en}のメニュー` : `Options for ${p.phrase_en}`}
                    items={[{ label: ja ? 'フレーズを削除' : 'Delete phrase', danger: true, onSelect: () => remove(c) }]}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="pl-[60px] pr-5 pb-4 space-y-1.5">
                        {!!p.example_en && <p className="text-[15px] italic" style={{ color: 'var(--text-secondary)' }}>“{p.example_en}”</p>}
                        {!!explanation && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{explanation}</p>}
                        <p className="pt-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                          {ja ? '次の復習: ' : 'Next review: '}{formatNextReview(c.next_review_at, locale)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SquircleBox>
            </motion.div>
          )
        })}
      </div>

      {shown.length > visible && (
        <button
          onClick={() => setVisible((v) => v + PAGE)}
          className="w-full mt-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          {ja ? `さらに表示（残り${shown.length - visible}件）` : `Show more (${shown.length - visible} remaining)`}
        </button>
      )}
    </div>
  )
}
