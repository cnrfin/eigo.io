/**
 * Drawing on slides and on the whiteboard (ported from the mockup's ink engine).
 *
 * Tools: select (click / shift-click / marquee, drag to move, Delete to remove,
 * a colour recolours the selection), pen, highlighter, line (Shift snaps to
 * 45°), shape (rectangle / ellipse, Shift for square / circle), text, eraser.
 * Undo keeps 60 steps per surface; Clear empties the surface.
 *
 * Everything is in slide-stage coordinates (1280 × 960), so a drawing lands in
 * the same place whatever size or zoom each person's slide is at.
 * Each surface (a slide id, or 'board' for the lesson's whiteboard) has its own
 * list of items. Every change is reported as an op, which the classroom sends
 * to the other person and saves; remote ops are applied with applyRemote().
 *
 * Plain DOM + canvas, no React: pointer moves must not cause re-renders.
 * One engine per classroom keeps the drawings; the slide area attaches its
 * elements with attach() and lets go with detach() (e.g. leaving and rejoining).
 */

export type Pt = [number, number]
export type InkKind = 'pen' | 'hl' | 'line' | 'rect' | 'ellipse' | 'text'
export type InkItem = {
  id: string
  kind: InkKind
  color: string
  pts?: Pt[]
  a?: Pt
  b?: Pt
  x?: number
  y?: number
  text?: string
}
export type Tool = 'select' | 'pen' | 'hl' | 'line' | 'shape' | 'text' | 'eraser'

export type InkOp =
  | { op: 'add'; surface: string; item: InkItem } // a new item (pen strokes start here)
  | { op: 'pts'; surface: string; id: string; pts: Pt[] } // more points for a pen / highlighter stroke
  | { op: 'set'; surface: string; items: InkItem[] } // items changed (moved, recoloured, finished, text typed)
  | { op: 'del'; surface: string; ids: string[] }
  | { op: 'all'; surface: string; items: InkItem[] } // the whole surface replaced (undo, clear)

type Opts = {
  /** the select tool should leave slide clicks alone (e.g. words, buttons) */
  isSlideTarget?: (t: Element) => boolean
}

const W = 1280
const H = 960
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
const width = (s: InkItem) => (s.kind === 'hl' ? 28 : 5)
const clone = (a: InkItem[]): InkItem[] => JSON.parse(JSON.stringify(a))

function segDist([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
function norm(a: Pt, b: Pt, sq: boolean): [Pt, Pt] {
  let w = b[0] - a[0], h = b[1] - a[1]
  if (sq) {
    const m = Math.max(Math.abs(w), Math.abs(h))
    w = Math.sign(w || 1) * m
    h = Math.sign(h || 1) * m
  }
  return [a, [a[0] + w, a[1] + h]]
}
function snapAngle(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1], r = Math.hypot(dx, dy)
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  return [a[0] + r * Math.cos(ang), a[1] + r * Math.sin(ang)]
}

export class InkEngine {
  tool: Tool = 'select'
  shape: 'rect' | 'ellipse' = 'rect'
  color = '#00a89f'
  /** the toolbar listens so it shows the right tool when it's changed from elsewhere */
  onToolChange: ((t: Tool) => void) | null = null
  /** a change made here: the classroom sends it and saves the surface */
  onOp: ((op: InkOp, items: InkItem[]) => void) | null = null
  private surfaces = new Map<string, InkItem[]>()
  private history = new Map<string, string[]>()
  private key = ''
  private sel = new Set<string>()
  private drawing: (InkItem & { o?: Pt }) | { erasing: true } | null = null
  private pending: Pt[] = []
  private flushT = 0
  private drag: { last: Pt; moved: boolean } | null = null
  private marquee: [Pt, Pt] | null = null
  private textEls = new Map<string, HTMLDivElement>()
  private ctx: CanvasRenderingContext2D | null = null
  private stage!: HTMLElement
  private canvas!: HTMLCanvasElement
  private textLayer!: HTMLElement
  private box!: HTMLElement
  private off: (() => void)[] = []
  private raf = 0

  constructor(private opts: Opts = {}) {}

  /** subscribe to local changes (one subscriber: the classroom); returns unsubscribe */
  handleOps(fn: (op: InkOp, items: InkItem[]) => void) {
    this.onOp = fn
    return () => {
      if (this.onOp === fn) this.onOp = null
    }
  }
  /** subscribe to tool changes (the toolbar); returns unsubscribe */
  handleToolChange(fn: (t: Tool) => void) {
    this.onToolChange = fn
    return () => {
      if (this.onToolChange === fn) this.onToolChange = null
    }
  }

  attach(els: { stage: HTMLElement; canvas: HTMLCanvasElement; textLayer: HTMLElement; box: HTMLElement }) {
    this.detach()
    Object.assign(this, els)
    this.ctx = els.canvas.getContext('2d')
    this.listen()
    this.setTool(this.tool)
    this.renderTexts()
  }

  detach() {
    this.off.forEach((f) => f())
    this.off = []
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.flushT)
    this.flushT = 0
    this.drawing = null
    this.drag = null
    this.marquee = null
    this.textEls.forEach((d) => d.remove())
    this.textEls.clear()
    this.ctx = null
  }

  get surface() {
    return this.key
  }

  /* ---------- surfaces ---------- */
  loadAll(all: Record<string, InkItem[]>) {
    for (const [k, v] of Object.entries(all)) if (Array.isArray(v)) this.surfaces.set(k, v)
    this.redraw()
  }
  setSurface(key: string) {
    if (key === this.key) return
    if (this.ctx) this.cancel()
    this.key = key
    this.sel.clear()
    this.renderTexts()
  }
  private items(k = this.key) {
    let a = this.surfaces.get(k)
    if (!a) this.surfaces.set(k, (a = []))
    return a
  }
  private snap() {
    const h = this.history.get(this.key) ?? []
    h.push(JSON.stringify(this.items()))
    if (h.length > 60) h.shift()
    this.history.set(this.key, h)
  }
  private emit(op: InkOp) {
    this.onOp?.(op, clone(this.items(op.surface)))
  }

  /* ---------- tools ---------- */
  setTool(t: Tool) {
    this.tool = t
    this.onToolChange?.(t)
    if (!this.box) return
    this.box.className = this.box.className.replace(/\btool-\w+/g, '').trim() + ' tool-' + t
    if (t !== 'select') this.sel.clear()
    this.renderTexts()
  }
  setShape(s: 'rect' | 'ellipse') {
    this.shape = s
    this.setTool('shape')
  }
  /** a colour with items selected recolours them; otherwise it picks the pen */
  setColor(c: string) {
    this.color = c
    if (this.sel.size) {
      this.snap()
      const changed = this.items().filter((s) => this.sel.has(s.id))
      changed.forEach((s) => (s.color = c))
      this.emit({ op: 'set', surface: this.key, items: clone(changed) })
      this.renderTexts()
      return 'recoloured' as const
    }
    if (this.tool === 'select' || this.tool === 'eraser') this.setTool('pen')
    return 'tool' as const
  }
  undo() {
    const h = this.history.get(this.key)
    if (!h?.length) return false
    this.surfaces.set(this.key, JSON.parse(h.pop()!))
    this.sel.clear()
    this.renderTexts()
    this.emit({ op: 'all', surface: this.key, items: clone(this.items()) })
    return true
  }
  clear() {
    if (!this.items().length) return false
    this.snap()
    this.surfaces.set(this.key, [])
    this.sel.clear()
    this.renderTexts()
    this.emit({ op: 'all', surface: this.key, items: [] })
    return true
  }
  deleteSelection() {
    if (!this.sel.size) return false
    this.snap()
    const ids = [...this.sel]
    this.surfaces.set(this.key, this.items().filter((s) => !this.sel.has(s.id)))
    this.sel.clear()
    this.renderTexts()
    this.emit({ op: 'del', surface: this.key, ids })
    return true
  }
  hasSelection() {
    return this.sel.size > 0
  }
  /** a pinch started: drop the stroke in progress */
  cancel() {
    if (this.drawing && 'id' in this.drawing) {
      const id = this.drawing.id
      const a = this.items()
      const i = a.findIndex((s) => s.id === id)
      if (i >= 0) {
        a.splice(i, 1)
        this.emit({ op: 'del', surface: this.key, ids: [id] })
      }
    }
    this.drawing = null
    this.pending = []
    this.redraw()
  }

  /* ---------- remote changes ---------- */
  applyRemote(op: InkOp) {
    const a = this.items(op.surface)
    if (op.op === 'add') {
      if (!a.some((s) => s.id === op.item.id)) a.push(op.item)
    } else if (op.op === 'pts') {
      const s = a.find((x) => x.id === op.id)
      if (s?.pts) s.pts.push(...op.pts)
    } else if (op.op === 'set') {
      for (const it of op.items) {
        const i = a.findIndex((x) => x.id === it.id)
        if (i >= 0) a[i] = it
        else a.push(it)
      }
    } else if (op.op === 'del') {
      this.surfaces.set(op.surface, a.filter((s) => !op.ids.includes(s.id)))
      op.ids.forEach((id) => this.sel.delete(id))
    } else if (op.op === 'all') {
      this.surfaces.set(op.surface, op.items)
      this.sel.clear()
    }
    if (op.surface !== this.key) return
    // keep a text box the user is typing in; re-render the rest
    if (op.op === 'pts') this.redrawSoon()
    else this.renderTexts()
  }

  /* ---------- geometry ---------- */
  private pt(e: { clientX: number; clientY: number }): Pt {
    const r = this.canvas.getBoundingClientRect()
    const s = r.width / W || 1
    return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]
  }
  private bbox(s: InkItem) {
    if (s.kind === 'text') {
      const d = this.textEls.get(s.id)
      return { x: s.x!, y: s.y!, w: d?.offsetWidth || 40, h: d?.offsetHeight || 40 }
    }
    const P = s.kind === 'pen' || s.kind === 'hl' ? s.pts! : [s.a!, s.b!]
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    for (const [x, y] of P) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
    const m = width(s) / 2
    return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m }
  }
  private hit(s: InkItem, p: Pt, tol = 8) {
    if (s.kind === 'pen' || s.kind === 'hl') {
      const P = s.pts!
      if (P.length === 1) return Math.hypot(p[0] - P[0][0], p[1] - P[0][1]) < width(s) / 2 + tol
      for (let i = 1; i < P.length; i++) if (segDist(p, P[i - 1], P[i]) < width(s) / 2 + tol) return true
      return false
    }
    if (s.kind === 'line') return segDist(p, s.a!, s.b!) < width(s) / 2 + tol
    const b = this.bbox(s)
    return p[0] >= b.x - tol && p[0] <= b.x + b.w + tol && p[1] >= b.y - tol && p[1] <= b.y + b.h + tol
  }
  private topHit(p: Pt) {
    const a = this.items()
    for (let i = a.length - 1; i >= 0; i--) if (this.hit(a[i], p)) return a[i]
    return null
  }

  /* ---------- drawing ---------- */
  private paint(s: InkItem) {
    const c = this.ctx
    if (s.kind === 'text' || !c) return
    c.save()
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.strokeStyle = s.color
    c.lineWidth = width(s)
    if (s.kind === 'hl') {
      c.globalAlpha = 0.32
      c.globalCompositeOperation = 'multiply'
    }
    c.beginPath()
    if (s.kind === 'pen' || s.kind === 'hl') s.pts!.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    else if (s.kind === 'line') {
      c.moveTo(...s.a!)
      c.lineTo(...s.b!)
    } else if (s.kind === 'rect') {
      const x = Math.min(s.a![0], s.b![0]), y = Math.min(s.a![1], s.b![1])
      const w = Math.abs(s.b![0] - s.a![0]), h = Math.abs(s.b![1] - s.a![1])
      if (c.roundRect) c.roundRect(x, y, w, h, 6)
      else c.rect(x, y, w, h)
    } else if (s.kind === 'ellipse') {
      c.ellipse((s.a![0] + s.b![0]) / 2, (s.a![1] + s.b![1]) / 2, Math.abs(s.b![0] - s.a![0]) / 2 || 0.5, Math.abs(s.b![1] - s.a![1]) / 2 || 0.5, 0, 0, Math.PI * 2)
    }
    c.stroke()
    c.restore()
  }
  redraw() {
    const c = this.ctx
    if (!c) return
    c.clearRect(0, 0, W, H)
    const a = this.items()
    for (const s of a) this.paint(s)
    for (const id of [...this.sel]) {
      const s = a.find((x) => x.id === id)
      if (!s) {
        this.sel.delete(id)
        continue
      }
      const b = this.bbox(s)
      c.save()
      c.strokeStyle = '#00a89f'
      c.lineWidth = 2
      c.setLineDash([8, 6])
      c.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12)
      c.restore()
    }
    if (this.marquee) {
      const [a0, b0] = this.marquee
      c.save()
      c.fillStyle = 'rgba(0,168,159,.08)'
      c.strokeStyle = '#00a89f'
      c.lineWidth = 1.5
      c.setLineDash([6, 5])
      const x = Math.min(a0[0], b0[0]), y = Math.min(a0[1], b0[1]), w = Math.abs(b0[0] - a0[0]), h = Math.abs(b0[1] - a0[1])
      c.fillRect(x, y, w, h)
      c.strokeRect(x, y, w, h)
      c.restore()
    }
    this.textEls.forEach((d, id) => d.classList.toggle('sel', this.sel.has(id)))
  }
  private redrawSoon() {
    cancelAnimationFrame(this.raf)
    this.raf = requestAnimationFrame(() => this.redraw())
  }

  /** text items are real elements (selectable, editable) over the canvas */
  renderTexts(focusId?: string) {
    if (!this.textLayer || !this.ctx) return
    const active = document.activeElement
    const editing = active instanceof HTMLElement && active.classList.contains('inktext') ? (active.dataset.id ?? null) : null
    const keep = new Set<string>()
    for (const s of this.items()) {
      if (s.kind !== 'text') continue
      keep.add(s.id)
      let d = this.textEls.get(s.id)
      if (!d) {
        d = document.createElement('div')
        d.className = 'inktext'
        d.dataset.id = s.id
        d.spellcheck = false
        const el = d
        d.addEventListener('input', () => {
          const it = this.items().find((x) => x.id === s.id)
          if (!it) return
          it.text = el.textContent ?? ''
          this.emit({ op: 'set', surface: this.key, items: [clone([it])[0]] })
        })
        d.addEventListener('dblclick', () => {
          el.contentEditable = 'true'
          el.focus()
        })
        d.addEventListener('blur', () => {
          el.contentEditable = String(this.tool === 'text')
          const it = this.items().find((x) => x.id === s.id)
          if (it && !(it.text ?? '').trim()) {
            this.surfaces.set(this.key, this.items().filter((x) => x.id !== s.id))
            this.emit({ op: 'del', surface: this.key, ids: [s.id] })
            this.renderTexts()
          }
        })
        this.textLayer.appendChild(d)
        this.textEls.set(s.id, d)
      }
      d.contentEditable = String(this.tool === 'text')
      d.style.left = s.x + 'px'
      d.style.top = s.y + 'px'
      d.style.color = s.color
      if (editing !== s.id && d.textContent !== (s.text ?? '')) d.textContent = s.text ?? ''
    }
    for (const [id, d] of this.textEls)
      if (!keep.has(id)) {
        d.remove()
        this.textEls.delete(id)
      }
    if (focusId) this.textEls.get(focusId)?.focus() // synchronously, inside the tap (see the text tool)
    this.redrawSoon()
  }

  private flushPts() {
    if (!this.drawing || !('id' in this.drawing) || !this.pending.length) return
    this.emit({ op: 'pts', surface: this.key, id: this.drawing.id, pts: this.pending })
    this.pending = []
  }

  /* ---------- pointer handling ---------- */
  private listen() {
    const cv = this.canvas
    const on = <K extends keyof WindowEventMap>(t: EventTarget, type: K | string, fn: (e: never) => void, o?: AddEventListenerOptions | boolean) => {
      t.addEventListener(type, fn as EventListener, o)
      this.off.push(() => t.removeEventListener(type, fn as EventListener, o))
    }

    on(cv, 'pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return
      const p = this.pt(e)
      const t = this.tool
      if (t === 'pen' || t === 'hl') {
        this.snap()
        const color = t === 'hl' && this.color === '#151414' ? '#e0a030' : this.color
        const it: InkItem = { id: uid(), kind: t, color, pts: [p] }
        this.items().push(it)
        this.drawing = it
        this.emit({ op: 'add', surface: this.key, item: clone([it])[0] })
      } else if (t === 'line') {
        this.snap()
        const it: InkItem = { id: uid(), kind: 'line', color: this.color, a: p, b: p }
        this.items().push(it)
        this.drawing = it
      } else if (t === 'shape') {
        this.snap()
        const it = { id: uid(), kind: this.shape, color: this.color, a: p, b: p, o: p } as InkItem & { o: Pt }
        this.items().push(it)
        this.drawing = it
      } else if (t === 'eraser') {
        this.snap()
        this.erase(p)
        this.drawing = { erasing: true }
      } else if (t === 'text') {
        this.snap()
        const it: InkItem = { id: uid(), kind: 'text', text: '', x: p[0], y: p[1] - 20, color: this.color }
        this.items().push(it)
        this.renderTexts(it.id)
        // Phones only open the keyboard when focus happens inside the tap itself,
        // so: stop the tap from moving focus back to the page, and focus the new
        // box again when the finger lifts (that's still part of the gesture).
        e.preventDefault()
        const el = this.textEls.get(it.id)
        const refocus = () => el?.focus()
        window.addEventListener('pointerup', refocus, { once: true })
        window.addEventListener('touchend', refocus, { once: true })
        return
      } else return
      cv.setPointerCapture?.(e.pointerId)
    })

    on(cv, 'pointermove', (e: PointerEvent) => {
      const d = this.drawing
      if (!d) return
      const p = this.pt(e)
      if ('erasing' in d) return this.erase(p)
      if (d.kind === 'line') d.b = e.shiftKey ? snapAngle(d.a!, p) : p
      else if (d.kind === 'rect' || d.kind === 'ellipse') [d.a, d.b] = norm(d.o!, p, e.shiftKey)
      else {
        const q = d.pts![d.pts!.length - 1]
        d.pts!.push(p)
        this.pending.push(p)
        if (!this.flushT) this.flushT = window.setTimeout(() => ((this.flushT = 0), this.flushPts()), 33)
        if (d.kind === 'pen' && this.ctx) {
          // draw just the new segment while drawing; full redraw on the next change
          const c = this.ctx
          c.save()
          c.lineCap = 'round'
          c.lineJoin = 'round'
          c.strokeStyle = d.color
          c.lineWidth = width(d)
          c.beginPath()
          c.moveTo(q[0], q[1])
          c.lineTo(p[0], p[1])
          c.stroke()
          c.restore()
          return
        }
      }
      this.redraw()
    })

    const finish = () => {
      const d = this.drawing
      this.drawing = null
      if (!d || 'erasing' in d) return
      const a = this.items()
      const drop = () => {
        const i = a.findIndex((s) => s.id === d.id)
        if (i >= 0) a.splice(i, 1)
      }
      if (d.kind === 'rect' || d.kind === 'ellipse') {
        delete d.o
        if (Math.abs(d.b![0] - d.a![0]) < 4 && Math.abs(d.b![1] - d.a![1]) < 4) {
          drop()
          return this.redraw()
        }
      }
      if (d.kind === 'line' && Math.hypot(d.b![0] - d.a![0], d.b![1] - d.a![1]) < 4) {
        drop()
        return this.redraw()
      }
      window.clearTimeout(this.flushT)
      this.flushT = 0
      this.pending = []
      this.emit({ op: 'set', surface: this.key, items: clone([d as InkItem]) })
      this.redraw()
    }
    on(cv, 'pointerup', finish)
    on(cv, 'pointercancel', finish)

    // select tool: the canvas lets clicks through to the slide, so listen on the
    // stage and only take the pointer when it lands on something drawn (or empty board)
    on(
      this.stage,
      'pointerdown',
      (e: PointerEvent) => {
        if (this.tool !== 'select' || e.button !== 0) return
        const p = this.pt(e)
        const h = this.topHit(p)
        const target = e.target as Element
        if (h && !(target.closest?.('.inktext') && (target as HTMLElement).isContentEditable)) {
          e.preventDefault()
          e.stopPropagation()
          if (e.shiftKey) {
            if (this.sel.has(h.id)) this.sel.delete(h.id)
            else this.sel.add(h.id)
          } else if (!this.sel.has(h.id)) {
            this.sel.clear()
            this.sel.add(h.id)
          }
          this.drag = { last: p, moved: false }
          this.redraw()
          return
        }
        if (target.closest?.('button,video,audio,a,input,textarea,.es-media,.es-audio,.es-tf,.es-match,.zoomChip')) return
        if (this.opts.isSlideTarget?.(target)) return
        if (e.pointerType === 'touch') return // touch drags pan / pinch the slide instead
        if (!e.shiftKey) this.sel.clear()
        this.marquee = [p, p]
        this.redraw()
      },
      true,
    )
    on(window, 'pointermove', (e: PointerEvent) => {
      if (this.tool !== 'select' || (!this.drag && !this.marquee)) return
      const p = this.pt(e)
      if (this.drag) {
        const dx = p[0] - this.drag.last[0], dy = p[1] - this.drag.last[1]
        if (!this.drag.moved) {
          this.snap()
          this.drag.moved = true
        }
        for (const s of this.items()) {
          if (!this.sel.has(s.id)) continue
          if (s.kind === 'text') {
            s.x! += dx
            s.y! += dy
          } else if (s.pts) s.pts = s.pts.map(([x, y]) => [x + dx, y + dy] as Pt)
          else {
            s.a = [s.a![0] + dx, s.a![1] + dy]
            s.b = [s.b![0] + dx, s.b![1] + dy]
          }
        }
        this.drag.last = p
        this.renderTexts()
      } else if (this.marquee) {
        this.marquee[1] = p
        this.redraw()
      }
    })
    on(window, 'pointerup', () => {
      if (this.drag?.moved) {
        const moved = this.items().filter((s) => this.sel.has(s.id))
        this.emit({ op: 'set', surface: this.key, items: clone(moved) })
      }
      this.drag = null
      if (this.marquee) {
        const [a0, b0] = this.marquee
        const x = Math.min(a0[0], b0[0]), y = Math.min(a0[1], b0[1]), w = Math.abs(b0[0] - a0[0]), h = Math.abs(b0[1] - a0[1])
        if (w > 4 || h > 4)
          for (const s of this.items()) {
            const b = this.bbox(s)
            if (b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y) this.sel.add(s.id)
          }
        this.marquee = null
        this.redraw()
      }
    })
  }

  private erase(p: Pt) {
    const a = this.items()
    const ids: string[] = []
    for (let i = a.length - 1; i >= 0; i--)
      if (a[i].kind !== 'text' && this.hit(a[i], p, 14)) {
        ids.push(a[i].id)
        a.splice(i, 1)
      }
    if (ids.length) {
      this.redraw()
      this.emit({ op: 'del', surface: this.key, ids })
    }
  }
}
