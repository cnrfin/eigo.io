/**
 * Word lookup on slides (ported from the mockup).
 *
 * Mouse: hover highlights a word, click looks it up, drag across words for a phrase.
 * Touch: tap a word; long-press then drag for a phrase. Pinch, pan and
 * double-tap zoom still work: a tap on a word never zooms, and a moving
 * finger never looks anything up.
 *
 * Only English slide text can be looked up (not the vocabulary tables, which
 * have their own save buttons, Japanese text, teacher-only blocks or buttons).
 * Highlights use the CSS Custom Highlight API, so React's DOM is never touched.
 * Saved words are painted teal wherever they appear on the slide.
 */

const ROOTS =
  '.es-block-text,.es-block-heading,.es-bubble,.es-block-list,.es-block-callout:not(.is-tutor),.es-block-phrases,.es-tf-q,.es-header-title'
const SKIP = '.es-vocab-table,.es-jp,.es-vocab-ja,.es-sr-only,.es-tutor-tag,.is-tutor,button,.es-match,.es-tf-why,.es-eyebrow'
const isWordCh = (c: string) => /[A-Za-z0-9'’-]/.test(c)

type Hl = { set: (name: string, h: unknown) => void; delete: (name: string) => void }
function registry(): Hl | null {
  const c = (globalThis as unknown as { CSS?: { highlights?: Hl } }).CSS
  return c?.highlights && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function' ? c.highlights : null
}
function highlight(...ranges: Range[]) {
  const H = (globalThis as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight
  return new H(...ranges)
}

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y)
    return p && { node: p.offsetNode, offset: p.offset }
  }
  if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y)
    return r && { node: r.startContainer, offset: r.startOffset }
  }
  return null
}

export type LookupRequest = { term: string; sentence: string; rect: DOMRect }

export class LookupEngine {
  /** a phrase drag (long-press) is in progress: the slide must not pan */
  phraseActive = false
  /** time of the last tap used for a lookup: the slide must not treat it as a double-tap */
  tapUsedAt = 0
  private host: HTMLElement | null = null
  private stage: HTMLElement | null = null
  private off: (() => void)[] = []
  private lk: {
    id: number
    touch: boolean
    x: number
    y: number
    anchor: Range
    phrase: boolean
    t0: number
    timer: number
    range?: Range
  } | null = null
  private savedTerms: string[] = []

  private opts: { enabled: () => boolean; onLookup: (r: LookupRequest) => void; onTooLong: () => void } = {
    enabled: () => false,
    onLookup: () => {},
    onTooLong: () => {},
  }

  /** the classroom plugs in its handlers (returns a function that unplugs them) */
  handle(h: { enabled: () => boolean; onLookup: (r: LookupRequest) => void; onTooLong: () => void }) {
    this.opts = h
    return () => {
      if (this.opts === h) this.opts = { enabled: () => false, onLookup: () => {}, onTooLong: () => {} }
    }
  }

  attach(stage: HTMLElement, host: HTMLElement) {
    this.detach()
    this.stage = stage
    this.host = host
    this.listen()
  }
  detach() {
    this.off.forEach((f) => f())
    this.off = []
    this.clearSelection()
    registry()?.delete('lk-hover')
  }

  clearSelection() {
    registry()?.delete('lk-sel')
  }

  /** Is there a word under this point? (lets the drawing layer leave clicks on words alone) */
  wordAt(x: number, y: number) {
    return !!this.wordRangeAt(x, y)
  }

  private eligible(node: Node | null) {
    const el = node && (node.nodeType === 3 ? node.parentElement : (node as Element))
    if (!el || !this.host || !this.host.contains(el)) return false
    return !!el.closest(ROOTS) && !el.closest(SKIP)
  }

  private wordRangeAt(x: number, y: number): Range | null {
    const c = caretAt(x, y)
    if (!c || c.node.nodeType !== 3 || !this.eligible(c.node)) return null
    const t = (c.node as Text).data
    let s = c.offset, e = c.offset
    if (s >= t.length || !isWordCh(t[s])) s = e = Math.max(0, c.offset - 1)
    if (!isWordCh(t[s] || '')) return null
    while (s > 0 && isWordCh(t[s - 1])) s--
    while (e < t.length && isWordCh(t[e])) e++
    while (e > s && /['’-]/.test(t[e - 1])) e--
    while (s < e && /['’-]/.test(t[s])) s++
    if (e <= s) return null
    const r = document.createRange()
    r.setStart(c.node, s)
    r.setEnd(c.node, e)
    const rc = r.getBoundingClientRect()
    // the caret snapped to a word from blank space
    if (x < rc.left - 4 || x > rc.right + 4 || y < rc.top - 4 || y > rc.bottom + 4) return null
    return r
  }

  private sentenceOf(r: Range) {
    const start = r.startContainer.parentElement
    const el = start?.closest('.es-li-text,.es-bubble,.es-p,p,.es-tf-q,.es-callout-body,.es-pill') ?? start
    const txt = (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const w = r.toString()
    return txt.split(/(?<=[.!?])\s+/).find((p) => p.includes(w)) ?? txt
  }

  private snap(r: Range) {
    const s = r.startContainer, e = r.endContainer
    if (s.nodeType === 3) {
      let o = r.startOffset
      while (o > 0 && isWordCh((s as Text).data[o - 1])) o--
      r.setStart(s, o)
    }
    if (e.nodeType === 3) {
      let o = r.endOffset
      while (o < (e as Text).data.length && isWordCh((e as Text).data[o])) o++
      r.setEnd(e, o)
    }
  }

  private open(range: Range) {
    const term = range.toString().replace(/\s+/g, ' ').trim()
    if (!term) return
    if (term.split(' ').length > 6) {
      this.clearSelection()
      return this.opts.onTooLong()
    }
    registry()?.set('lk-sel', highlight(range))
    this.opts.onLookup({ term, sentence: this.sentenceOf(range), rect: range.getBoundingClientRect() })
  }

  /** Paint every saved word / phrase teal on the current slide. */
  setSaved(terms: string[]) {
    this.savedTerms = [...new Set(terms.map((t) => t.toLowerCase().replace(/^(a|an|the|to)\s+/, '').trim()).filter((t) => t.length > 1))]
    this.paintSaved()
  }
  paintSaved() {
    const hl = registry()
    if (!hl || !this.host) return
    const ranges: Range[] = []
    if (this.savedTerms.length) {
      const w = document.createTreeWalker(this.host, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = w.nextNode())) {
        if (!this.eligible(n)) continue
        const t = (n as Text).data.toLowerCase()
        for (const term of this.savedTerms) {
          let i = 0
          while ((i = t.indexOf(term, i)) >= 0) {
            const a = t[i - 1], b = t[i + term.length]
            const plural = b === 's' && !isWordCh(t[i + term.length + 1] || '')
            if (!(a && isWordCh(a)) && (!(b && /[a-z0-9]/.test(b)) || plural)) {
              const r = document.createRange()
              r.setStart(n, i)
              r.setEnd(n, i + term.length + (plural ? 1 : 0))
              ranges.push(r)
            }
            i += term.length
          }
        }
      }
    }
    if (ranges.length) hl.set('lk-saved', highlight(...ranges))
    else hl.delete('lk-saved')
  }

  private listen() {
    const stage = this.stage!
    const on = (t: EventTarget, type: string, fn: (e: never) => void, o?: AddEventListenerOptions | boolean) => {
      t.addEventListener(type, fn as EventListener, o)
      this.off.push(() => t.removeEventListener(type, fn as EventListener, o))
    }
    let hovRaf = 0
    on(stage, 'pointermove', (e: PointerEvent) => {
      const hl = registry()
      if (e.pointerType !== 'mouse' || this.lk || !hl) return
      cancelAnimationFrame(hovRaf)
      hovRaf = requestAnimationFrame(() => {
        const r = this.opts.enabled() ? this.wordRangeAt(e.clientX, e.clientY) : null
        if (r) {
          hl.set('lk-hover', highlight(r))
          stage.style.cursor = 'pointer'
        } else {
          hl.delete('lk-hover')
          stage.style.cursor = ''
        }
      })
    })
    on(stage, 'pointerleave', () => {
      registry()?.delete('lk-hover')
      stage.style.cursor = ''
    })
    on(stage, 'pointerdown', (e: PointerEvent) => {
      if (!this.opts.enabled() || e.button !== 0) return
      const target = e.target as Element
      if (target.closest?.('button,video,audio,a,.inktext')) return
      const r = this.wordRangeAt(e.clientX, e.clientY)
      if (!r) return
      if (e.pointerType === 'mouse') e.preventDefault() // no native text selection while dragging a phrase
      const lk = { id: e.pointerId, touch: e.pointerType !== 'mouse', x: e.clientX, y: e.clientY, anchor: r, phrase: false, t0: Date.now(), timer: 0 }
      this.lk = lk
      if (lk.touch)
        lk.timer = window.setTimeout(() => {
          if (this.lk !== lk) return
          lk.phrase = true
          this.phraseActive = true
          navigator.vibrate?.(10)
          registry()?.set('lk-sel', highlight(r))
        }, 450)
    })
    on(window, 'pointermove', (e: PointerEvent) => {
      const lk = this.lk
      if (!lk || e.pointerId !== lk.id) return
      const moved = Math.hypot(e.clientX - lk.x, e.clientY - lk.y)
      if (lk.touch && !lk.phrase) {
        if (moved > 8) this.cancel() // it's a pan, not a lookup
        return
      }
      if (!lk.touch && !lk.phrase && moved > 6) lk.phrase = true
      if (!lk.phrase) return
      const c = caretAt(e.clientX, e.clientY)
      if (!c || c.node.nodeType !== 3 || !this.eligible(c.node)) return
      try {
        const r = document.createRange(), a = lk.anchor
        if (a.comparePoint(c.node, c.offset) < 0) {
          r.setStart(c.node, c.offset)
          r.setEnd(a.endContainer, a.endOffset)
        } else {
          r.setStart(a.startContainer, a.startOffset)
          r.setEnd(c.node, c.offset)
        }
        this.snap(r)
        lk.range = r
        registry()?.set('lk-sel', highlight(r))
      } catch {
        /* points in different blocks: keep the last good range */
      }
    })
    on(
      window,
      'pointerup',
      (e: PointerEvent) => {
        const lk = this.lk
        if (!lk || e.pointerId !== lk.id) return
        window.clearTimeout(lk.timer)
        this.lk = null
        this.phraseActive = false
        if (lk.phrase) {
          this.open(lk.range && lk.range.toString().trim() ? lk.range : lk.anchor)
          if (lk.touch) this.tapUsedAt = Date.now()
          return
        }
        if (lk.touch && Date.now() - lk.t0 > 450) return
        this.open(lk.anchor)
        if (lk.touch) this.tapUsedAt = Date.now()
      },
      true,
    )
    on(window, 'pointercancel', () => this.cancel())
  }

  /** a second finger came down (pinch) or the finger moved: not a lookup */
  cancel() {
    if (this.lk) window.clearTimeout(this.lk.timer)
    this.lk = null
    this.phraseActive = false
  }
}
