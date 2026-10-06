import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CONTENT_TOP, STAGE_H, STAGE_W, SlideRenderer, resolveAsset, type Block, type Frame, type ImageBlock, type ImageCrop, type Slide } from '@slides'
import { clamp } from '../model'

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const MIN = 3 // minimum block size, %
const SNAP = 0.9 // snap distance, %

/** A spacing marker: a measured gap between two blocks, in % of the stage. */
interface GapMark {
  axis: 'v' | 'h' // v = vertical gap (between a block above and below)
  from: number
  to: number
  at: number // position on the other axis
}

interface Guides {
  v: number[]
  h: number[]
  gaps: GapMark[]
}

const NO_GUIDES: Guides = { v: [], h: [], gaps: [] }
const EPS = 0.05
const overlapX = (a: Frame, b: Frame) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS
const overlapY = (a: Frame, b: Frame) => a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
const midX = (a: Frame, b: Frame) => (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2
const midY = (a: Frame, b: Frame) => (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2

interface RefGap {
  g: number
  mark: GapMark
}

/** Every gap between two neighbouring blocks, per axis. Moving a block can snap to these sizes. */
function collectGaps(frames: Frame[]): { v: RefGap[]; h: RefGap[] } {
  const v: RefGap[] = []
  const h: RefGap[] = []
  for (const a of frames)
    for (const b of frames) {
      if (a === b) continue
      if (overlapX(a, b)) {
        const g = b.y - (a.y + a.h)
        if (g > 0.1 && g < 50) v.push({ g, mark: { axis: 'v', from: a.y + a.h, to: b.y, at: midX(a, b) } })
      }
      if (overlapY(a, b)) {
        const g = b.x - (a.x + a.w)
        if (g > 0.1 && g < 50) h.push({ g, mark: { axis: 'h', from: a.x + a.w, to: b.x, at: midY(a, b) } })
      }
    }
  return { v, h }
}

/**
 * Snap a moving frame so its gap to a neighbour equals an existing gap on the
 * slide, or so it sits evenly between two neighbours. Returns the new position
 * on that axis, how far it moved, and the markers to draw.
 */
function snapSpacing(
  f: Frame,
  others: Frame[],
  refs: RefGap[],
  axis: 'v' | 'h',
): { pos: number; dist: number; marks: GapMark[] } | null {
  const isV = axis === 'v'
  const start = (o: Frame) => (isV ? o.y : o.x)
  const size = (o: Frame) => (isV ? o.h : o.w)
  const end = (o: Frame) => start(o) + size(o)
  const at = (a: Frame, b: Frame) => (isV ? midX(a, b) : midY(a, b))
  const place = (pos: number): Frame => (isV ? { ...f, y: pos } : { ...f, x: pos })
  const cur = start(f)
  const near = others.filter((o) => (isV ? overlapX(o, f) : overlapY(o, f)))
  const centre = cur + size(f) / 2
  const before = near.filter((o) => start(o) + size(o) / 2 < centre)
  const after = near.filter((o) => start(o) + size(o) / 2 >= centre)
  let best: { pos: number; dist: number; marks: GapMark[] } | null = null
  const consider = (pos: number, marks: (moved: Frame) => GapMark[]) => {
    const dist = Math.abs(pos - cur)
    if (dist < SNAP && (!best || dist < best.dist)) best = { pos, dist, marks: marks(place(pos)) }
  }
  for (const o of before)
    for (const r of refs)
      consider(end(o) + r.g, (m) => [{ axis, from: end(o), to: start(m), at: at(o, m) }, r.mark])
  for (const o of after)
    for (const r of refs)
      consider(start(o) - r.g - size(f), (m) => [{ axis, from: end(m), to: start(o), at: at(o, m) }, r.mark])
  // Even spacing between a neighbour before and one after.
  for (const a of before)
    for (const b of after) {
      const pos = (end(a) + start(b) - size(f)) / 2
      if (pos > end(a))
        consider(pos, (m) => [
          { axis, from: end(a), to: start(m), at: at(a, m) },
          { axis, from: end(m), to: start(b), at: at(b, m) },
        ])
    }
  return best
}

const round = (v: number) => Math.round(v * 2) / 2

/** Snap a set of candidate edges to the nearest guide; returns offset to apply. */
function snapAxis(edges: number[], targets: number[]): { offset: number; hit: number | null } {
  let best: { offset: number; hit: number | null } = { offset: 0, hit: null }
  let bestDist = SNAP
  for (const e of edges)
    for (const t of targets) {
      const d = Math.abs(t - e)
      if (d < bestDist) {
        bestDist = d
        best = { offset: t - e, hit: t }
      }
    }
  return best
}

export function EditorCanvas({
  slide,
  assetBase,
  selectedBlockId,
  onSelect,
  onCommitFrame,
  onDropAvatar,
  onCommitCrop,
}: {
  slide: Slide
  assetBase: string
  selectedBlockId: string | null
  onSelect: (blockId: string | null) => void
  onCommitFrame: (blockId: string, frame: Frame) => void
  /** An image file was dropped on a dialogue avatar circle. */
  onDropAvatar?: (speaker: string, file: File) => void
  /** The picture inside an image block was moved or zoomed (double-click crop mode). */
  onCommitCrop?: (blockId: string, crop: ImageCrop) => void
}) {
  const [avatarTarget, setAvatarTarget] = useState<string | null>(null)
  /** The dialogue avatar (speaker name) under the pointer, if any. */
  const speakerAt = (x: number, y: number) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const sp = (el as HTMLElement).closest?.('[data-speaker]') as HTMLElement | null
      if (sp && wrapRef.current?.contains(sp)) return sp.dataset.speaker ?? null
    }
    return null
  }
  const wrapRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; frame: Frame } | null>(null)
  const [guides, setGuides] = useState<Guides>(NO_GUIDES)
  const [overflowIds, setOverflowIds] = useState<string[]>([])

  // Crop mode: double-click a filled image to move/zoom the picture inside its frame.
  const [crop, setCrop] = useState<{ id: string; c: ImageCrop; nat: { w: number; h: number } | null } | null>(null)
  const cropRef = useRef(crop)
  cropRef.current = crop
  const cropStart = useRef<string>('')

  function enterCrop(b: ImageBlock) {
    const c = b.crop ?? { x: 50, y: 50, zoom: 1 }
    cropStart.current = JSON.stringify(c)
    setCrop({ id: b.id, c, nat: null })
    const img = new Image()
    img.onload = () => setCrop((cur) => (cur && cur.id === b.id ? { ...cur, nat: { w: img.naturalWidth, h: img.naturalHeight } } : cur))
    img.src = resolveAsset(b.src, assetBase)
  }
  function exitCrop() {
    const cur = cropRef.current
    if (!cur) return
    setCrop(null)
    if (JSON.stringify(cur.c) !== cropStart.current) onCommitCrop?.(cur.id, cur.c)
  }
  // Leave crop mode on Esc/Enter, when the block is deselected, or when the slide changes.
  useEffect(() => {
    if (!crop) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        exitCrop()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop?.id])
  useEffect(() => {
    if (crop && selectedBlockId !== crop.id) exitCrop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlockId])
  useEffect(() => () => exitCrop(), [slide.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // Scroll to zoom (needs a non-passive listener so the page doesn't scroll).
  useEffect(() => {
    const root = wrapRef.current
    if (!crop || !root) return
    const onWheel = (e: WheelEvent) => {
      const hitEl = (e.target as HTMLElement).closest?.('.hit.is-cropping')
      if (!hitEl) return
      e.preventDefault()
      setCrop((cur) => {
        if (!cur) return cur
        const zoom = clamp(Math.round(cur.c.zoom * Math.exp(-e.deltaY * 0.0015) * 100) / 100, 1, 5)
        return { ...cur, c: { ...cur.c, zoom } }
      })
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [crop?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Size of the whole picture as a % of the frame, for the current crop. */
  function cropGeometry(b: Block, c: ImageCrop, nat: { w: number; h: number }) {
    const W = (b.frame.w / 100) * STAGE_W
    const H = (b.frame.h / 100) * STAGE_H
    const s = Math.max(W / nat.w, H / nat.h) * c.zoom
    const dw = ((nat.w * s) / W) * 100
    const dh = ((nat.h * s) / H) * 100
    return { dw, dh, left: ((100 - dw) * c.x) / 100, top: ((100 - dh) * c.y) / 100 }
  }

  function beginPan(e: ReactPointerEvent, b: Block) {
    if (e.button !== 0 || !crop?.nat) return
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, c: crop.c }
    const g = cropGeometry(b, crop.c, crop.nat)
    const slackX = ((100 - g.dw) / 100) * rect.width // ≤ 0 px
    const slackY = ((100 - g.dh) / 100) * rect.height
    const onMove = (ev: PointerEvent) => {
      const x = Math.abs(slackX) < 0.5 ? start.c.x : clamp(start.c.x + ((ev.clientX - start.x) * 100) / slackX, 0, 100)
      const y = Math.abs(slackY) < 0.5 ? start.c.y : clamp(start.c.y + ((ev.clientY - start.y) * 100) / slackY, 0, 100)
      setCrop((cur) => (cur ? { ...cur, c: { ...cur.c, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } } : cur))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const display: Slide = {
    ...slide,
    blocks: slide.blocks.map((b) => {
      if (drag && b.id === drag.id) return { ...b, frame: drag.frame } as Block
      if (crop && b.id === crop.id && b.type === 'image') return { ...b, crop: crop.c }
      return b
    }),
  }

  // Flag blocks whose content doesn't fit their frame.
  useLayoutEffect(() => {
    const root = wrapRef.current
    if (!root) return
    const raf = requestAnimationFrame(() => {
      const ids: string[] = []
      root.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
        const inner = el.querySelector<HTMLElement>(':scope > :not(.es-tutor-tag)')
        if (inner && inner.scrollHeight > inner.clientHeight + 2) ids.push(el.dataset.blockId!)
      })
      setOverflowIds((prev) => (prev.join() === ids.join() ? prev : ids))
    })
    return () => cancelAnimationFrame(raf)
  })

  function begin(e: ReactPointerEvent, block: Block, handle: Handle | 'move') {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    onSelect(block.id)
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, f: { ...block.frame } }
    const others = slide.blocks.filter((b) => b.id !== block.id)
    const vTargets = [0, 5, 50, 95, 100, ...others.flatMap((b) => [b.frame.x, b.frame.x + b.frame.w, b.frame.x + b.frame.w / 2])]
    const hTargets = [0, 5, 50, 95, 100, CONTENT_TOP, ...others.flatMap((b) => [b.frame.y, b.frame.y + b.frame.h, b.frame.y + b.frame.h / 2])]
    const otherFrames = others.map((b) => b.frame)
    const refGaps = collectGaps(otherFrames)
    let moved = false
    let current = start.f

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - start.x) / rect.width) * 100
      const dy = ((ev.clientY - start.y) / rect.height) * 100
      if (!moved && Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) < 3) return
      moved = true
      const free = ev.altKey // hold Alt/Option to disable snapping
      let { x, y, w, h } = start.f
      const g: Guides = { v: [], h: [], gaps: [] }

      if (handle === 'move') {
        x = round(start.f.x + dx)
        y = round(start.f.y + dy)
        if (!free) {
          // Horizontal: edge/centre alignment or equal spacing, whichever is closer.
          const sx = snapAxis([x, x + w / 2, x + w], vTargets)
          const spx = snapSpacing({ x, y, w, h }, otherFrames, refGaps.h, 'h')
          if (spx && (sx.hit == null || spx.dist < Math.abs(sx.offset))) {
            x = spx.pos
            g.gaps.push(...spx.marks)
          } else {
            x += sx.offset
            if (sx.hit != null) g.v.push(sx.hit)
          }
          // Vertical, using the snapped x so overlaps are right.
          const sy = snapAxis([y, y + h / 2, y + h], hTargets)
          const spy = snapSpacing({ x, y, w, h }, otherFrames, refGaps.v, 'v')
          if (spy && (sy.hit == null || spy.dist < Math.abs(sy.offset))) {
            y = spy.pos
            g.gaps.push(...spy.marks)
          } else {
            y += sy.offset
            if (sy.hit != null) g.h.push(sy.hit)
          }
        }
        x = clamp(x, 0, 100 - w)
        y = clamp(y, 0, 100 - h)
      } else {
        let left = start.f.x
        let top = start.f.y
        let right = start.f.x + start.f.w
        let bottom = start.f.y + start.f.h
        if (handle.includes('w')) left = round(left + dx)
        if (handle.includes('e')) right = round(right + dx)
        if (handle.includes('n')) top = round(top + dy)
        if (handle.includes('s')) bottom = round(bottom + dy)
        if (!free) {
          const snapEdge = (v: number, targets: number[], axis: 'v' | 'h') => {
            const s = snapAxis([v], targets)
            if (s.hit != null) g[axis].push(s.hit)
            return v + s.offset
          }
          if (handle.includes('w')) left = snapEdge(left, vTargets, 'v')
          if (handle.includes('e')) right = snapEdge(right, vTargets, 'v')
          if (handle.includes('n')) top = snapEdge(top, hTargets, 'h')
          if (handle.includes('s')) bottom = snapEdge(bottom, hTargets, 'h')
        }
        left = clamp(left, 0, right - MIN)
        top = clamp(top, 0, bottom - MIN)
        right = clamp(right, left + MIN, 100)
        bottom = clamp(bottom, top + MIN, 100)
        x = left
        y = top
        w = right - left
        h = bottom - top
      }
      current = { x, y, w, h }
      setGuides(g)
      setDrag({ id: block.id, frame: current })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setGuides(NO_GUIDES)
      setDrag(null)
      if (moved) onCommitFrame(block.id, current)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const overlay = (
    <div
      className="canvas-overlay"
      onPointerDown={() => {
        exitCrop()
        onSelect(null)
      }}
    >
      {display.blocks.map((b) => {
        const selected = b.id === selectedBlockId
        const overflow = overflowIds.includes(b.id)
        const cropping = crop?.id === b.id && b.type === 'image' ? crop : null
        const geo = cropping?.nat ? cropGeometry(b, cropping.c, cropping.nat) : null
        return (
          <div
            key={b.id}
            className={`hit${selected ? ' is-selected' : ''}${overflow ? ' is-overflow' : ''}${cropping ? ' is-cropping' : ''}`}
            style={{ left: `${b.frame.x}%`, top: `${b.frame.y}%`, width: `${b.frame.w}%`, height: `${b.frame.h}%` }}
            onPointerDown={(e) => {
              if (cropping) return beginPan(e, b)
              if (crop) exitCrop()
              begin(e, b, 'move')
            }}
            onDoubleClick={() => {
              if (cropping) return exitCrop()
              if (b.type === 'image' && b.src && b.fit === 'cover') return enterCrop(b)
              window.dispatchEvent(new CustomEvent('studio:focus-inspector'))
            }}
            onDragOver={(e) => {
              if (b.type !== 'dialogue' || !onDropAvatar) return
              const sp = speakerAt(e.clientX, e.clientY)
              setAvatarTarget(sp)
              if (sp) e.preventDefault()
            }}
            onDragLeave={() => setAvatarTarget(null)}
            onDrop={(e) => {
              const sp = speakerAt(e.clientX, e.clientY)
              setAvatarTarget(null)
              const file = e.dataTransfer.files[0]
              if (!sp || !file || !onDropAvatar) return
              e.preventDefault()
              onDropAvatar(sp, file)
            }}
          >
            {avatarTarget && b.type === 'dialogue' ? <span className="hit-badge hit-badge-ok">Drop to set {avatarTarget}’s picture</span> : null}
            {overflow ? <span className="hit-badge">Text overflows</span> : null}
            {cropping && b.type === 'image' ? (
              <>
                {geo ? (
                  <img
                    className="crop-ghost"
                    src={resolveAsset(b.src, assetBase)}
                    alt=""
                    draggable={false}
                    style={{ left: `${geo.left}%`, top: `${geo.top}%`, width: `${geo.dw}%`, height: `${geo.dh}%` }}
                  />
                ) : null}
                <span className="hit-badge hit-badge-ok crop-badge">
                  Drag to move · scroll to zoom ({Math.round(cropping.c.zoom * 100)}%) · Esc or double-click to finish
                </span>
              </>
            ) : null}
            {selected && !cropping
              ? HANDLES.map((h) => (
                  <span key={h} className={`handle handle-${h}`} onPointerDown={(e) => begin(e, b, h)} />
                ))
              : null}
          </div>
        )
      })}
      {guides.v.map((v, i) => (
        <span key={`v${i}`} className="guide guide-v" style={{ left: `${v}%` }} />
      ))}
      {guides.h.map((h, i) => (
        <span key={`h${i}`} className="guide guide-h" style={{ top: `${h}%` }} />
      ))}
      {guides.gaps.map((m, i) =>
        m.axis === 'v' ? (
          <span key={`g${i}`} className="gap-mark gap-mark-v" style={{ left: `${m.at}%`, top: `${m.from}%`, height: `${m.to - m.from}%` }}>
            <span className="gap-label">{Math.round((m.to - m.from) * (STAGE_H / 100))}</span>
          </span>
        ) : (
          <span key={`g${i}`} className="gap-mark gap-mark-h" style={{ top: `${m.at}%`, left: `${m.from}%`, width: `${m.to - m.from}%` }}>
            <span className="gap-label">{Math.round((m.to - m.from) * (STAGE_W / 100))}</span>
          </span>
        ),
      )}
    </div>
  )

  return (
    <div ref={wrapRef} className="editor-canvas">
      <SlideRenderer slide={display} mode="editor" assetBase={assetBase} overlay={overlay} />
    </div>
  )
}
