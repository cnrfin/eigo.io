'use client'

import { useEffect, useState } from 'react'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico, type IconName } from './Icons'
import type { InkEngine, Tool } from './ink'

/**
 * The drawing tools: a frosted drawer on the left of the slide, opened from a
 * small handle and closed with the notch. Both the teacher and the student
 * can draw (the student just can't change slides).
 * Keys: V select · P pen · H highlighter · L line · R / O shape · T text ·
 * E eraser · ⌘/Ctrl+Z undo · Delete removes the selection.
 */

const COLORS: { c: string; swatch: string }[] = [
  { c: '#00a89f', swatch: '#00a89f' },
  { c: '#e55050', swatch: '#e55050' },
  { c: '#e0a030', swatch: '#e0a030' },
  { c: '#151414', swatch: '#888' },
]

export default function Toolbar({
  t,
  ink,
  open,
  setOpen,
  toast,
  enabled,
}: {
  t: ClassroomT
  ink: InkEngine
  open: boolean
  setOpen: (o: boolean) => void
  toast: (msg: string, kind?: 'ok' | 'bad') => void
  /** false when there's nothing to draw on (free talk without the whiteboard) */
  enabled: boolean
}) {
  const [tool, setToolState] = useState<Tool>(ink.tool)
  const [shape, setShapeState] = useState(ink.shape)
  const [color, setColorState] = useState(ink.color)

  const pick = (tl: Tool) => ink.setTool(tl)
  const pickShape = (s: 'rect' | 'ellipse') => {
    setShapeState(s)
    ink.setShape(s)
  }
  const pickColor = (c: string) => {
    setColorState(c)
    ink.setColor(c)
  }

  useEffect(() => ink.handleToolChange(setToolState), [ink])

  // closing the drawer goes back to the select tool, so the slide can be used normally
  useEffect(() => {
    if (!open && ink.tool !== 'select') ink.setTool('select')
  }, [open, ink])

  useEffect(() => {
    if (!enabled) return
    const k = (e: KeyboardEvent) => {
      const el = e.target as Element | null
      if (el?.closest?.('input,textarea,select,[contenteditable="true"]')) return
      if (document.querySelector('.cr .scrim.open')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        ink.undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === 'Backspace' || e.key === 'Delete') && ink.deleteSelection()) {
        e.preventDefault()
        return
      }
      const ch = e.key.toLowerCase()
      if (ch === 'r' || ch === 'o') {
        setOpen(true)
        pickShape(ch === 'r' ? 'rect' : 'ellipse')
        return
      }
      const map: Record<string, Tool> = { v: 'select', p: 'pen', h: 'hl', l: 'line', t: 'text', e: 'eraser' }
      if (map[ch]) {
        setOpen(true)
        pick(map[ch])
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
    // pick / pickShape only touch the engine and local state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ink, setOpen])

  const btn = (tl: Tool, icon: IconName, tip: string) => (
    <button className={`tbtn${tool === tl ? ' on' : ''}`} onClick={() => pick(tl)} aria-label={tip}>
      <Ico name={icon} />
      <span className="tip">{tip}</span>
    </button>
  )

  return (
    <>
      <button className="handle" title={t('showTools')} aria-label={t('showTools')} onClick={() => setOpen(true)}>
        <i />
      </button>
      <div className={`toolbar${tool === 'shape' ? ' shape-open' : ''}`} aria-hidden={!open}>
        {btn('select', 'cursor', t('toolSelect'))}
        {btn('pen', 'pen', t('toolPen'))}
        {btn('hl', 'hl', t('toolHl'))}
        {btn('line', 'line', t('toolLine'))}
        <div className="shapeWrap">
          <button className={`tbtn${tool === 'shape' ? ' on' : ''}`} onClick={() => pickShape(shape)} aria-label={t('toolShape')}>
            <Ico name={shape} />
            <span className="tip">{t('toolShape')}</span>
          </button>
          <div className="flyout">
            <button className={`tbtn${shape === 'rect' ? ' on' : ''}`} title={t('shapeRect')} onClick={() => pickShape('rect')}>
              <Ico name="rect" />
            </button>
            <button className={`tbtn${shape === 'ellipse' ? ' on' : ''}`} title={t('shapeEllipse')} onClick={() => pickShape('ellipse')}>
              <Ico name="ellipse" />
            </button>
          </div>
        </div>
        {btn('text', 'text', t('toolText'))}
        {btn('eraser', 'eraser', t('toolEraser'))}
        <div className="tsep" />
        {COLORS.map(({ c, swatch }) => (
          <button
            key={c}
            className={`swatch${color === c ? ' on' : ''}`}
            style={{ color: swatch }}
            onClick={() => pickColor(c)}
            aria-label={c}
          >
            <i style={{ background: c }} />
          </button>
        ))}
        <div className="tsep" />
        <button className="tbtn" onClick={() => ink.undo()} aria-label={t('undo')}>
          <Ico name="undo" />
          <span className="tip">{t('undo')}</span>
        </button>
        <button
          className="tbtn"
          onClick={() => {
            if (ink.clear()) toast(t('drawingsCleared'))
          }}
          aria-label={t('clearDrawings')}
        >
          <Ico name="trash" />
          <span className="tip">{t('clearDrawings')}</span>
        </button>
        <button className="notch" title={t('hideTools')} aria-label={t('hideTools')} onClick={() => setOpen(false)}>
          <Ico name="left" />
        </button>
      </div>
    </>
  )
}
