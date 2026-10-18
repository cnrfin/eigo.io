/**
 * Classroom layout engine (ported from mockups/classroom-mockup.html).
 *
 *  - Slide is 4:3, video tiles 16:9 (they may grow to 3:4 portrait on tall
 *    screens), 12px gaps. Everything keeps its shape; only sizes change.
 *  - side:    slide left, the two videos stacked on the right
 *  - stacked: slide on top, the two videos side by side underneath (or
 *             stacked full width on tall phones, if that gives bigger videos)
 *  - videos:  free talk, no slide: the two videos as big as they fit
 *  - panel:   the AI panel (role-plays, pickers): a square flush left, as tall as the room allows, and the
 *             two videos stacked in whatever width is left (at least 160px)
 *
 * Pure function: the caller measures the area and places the elements.
 */

export type Rect = { x: number; y: number; w: number; h: number }
export type LayoutMode = 'side' | 'stacked' | 'videos' | 'panel'
export type LayoutResult = {
  mode: LayoutMode
  slide: Rect | null
  other: Rect
  me: Rect
  /** how far the bottom controls move up to sit 28px under the content (0 in free talk) */
  lift: number
}

const VR = 9 / 16 // video height / width
const G = 12

export function computeLayout(
  W: number,
  H: number,
  opts: {
    showSlide: boolean
    /** forces the stacked layout (the side panel used to take width; it now floats over the edge, so nothing passes it) */
    chatOpen?: boolean
    /** height / width of the slide area: 3/4 for slides, the shape of a shared screen while sharing */
    ratio?: number
    /** the AI panel: a square main slot flush left (see 'panel' above) */
    square?: boolean
  },
): LayoutResult | null {
  if (!W || !H) return null
  const SR = Math.min(1.2, Math.max(0.4, opts.ratio ?? 3 / 4))
  let r: Omit<LayoutResult, 'lift'>

  if (!opts.showSlide) {
    const vr = Math.min((W - G) / 2, H / VR)
    const vc = Math.min(W, (H - G) / (2 * VR))
    if (vr >= vc) {
      const v = vr, vh = v * VR, x0 = (W - 2 * v - G) / 2, y0 = (H - vh) / 2
      r = { mode: 'videos', slide: null, other: { x: x0, y: y0, w: v, h: vh }, me: { x: x0 + v + G, y: y0, w: v, h: vh } }
    } else {
      const v = vc, vh = v * VR, x0 = (W - v) / 2, y0 = (H - 2 * vh - G) / 2
      r = { mode: 'videos', slide: null, other: { x: x0, y: y0, w: v, h: vh }, me: { x: x0, y: y0 + vh + G, w: v, h: vh } }
    }
    return { ...r, lift: 0 }
  }

  if (opts.square) {
    const MIN_TILE = 160
    const s = Math.max(0, Math.min(H, W - G - MIN_TILE))
    const tw = W - s - G
    const th = (s - G) / 2
    const y0 = (H - s) / 2
    r = {
      mode: 'panel',
      slide: { x: 0, y: y0, w: s, h: s },
      other: { x: s + G, y: y0, w: tw, h: th },
      me: { x: s + G, y: y0 + th + G, w: tw, h: th },
    }
    return { ...r, lift: Math.max(0, H - (y0 + s) - 28) }
  }

  const sA = Math.min(H / SR, (W - G + G / (2 * VR)) / (1 + SR / (2 * VR)))
  const sB = Math.min(W, (H - G + (G * VR) / 2) / (SR + VR / 2))
  const useA = !opts.chatOpen && sA >= sB

  if (useA) {
    const s = sA, sh = s * SR, v = (sh - G) / (2 * VR), vh = v * VR, tw = s + G + v, x0 = (W - tw) / 2, y0 = (H - sh) / 2
    r = {
      mode: 'side',
      slide: { x: x0, y: y0, w: s, h: sh },
      other: { x: x0 + s + G, y: y0, w: v, h: vh },
      me: { x: x0 + s + G, y: y0 + vh + G, w: v, h: vh },
    }
  } else {
    const s = sB, sh = s * SR, R = H - sh - G
    const w1 = (s - G) / 2, h1 = Math.min(R, (w1 * 4) / 3)
    const w2 = s, h2 = Math.min((R - G) / 2, w2 * 0.75)
    const col = h2 >= w2 * 0.48 && w2 * h2 > w1 * h1
    if (col) {
      const th = sh + G + 2 * h2 + G, x0 = (W - s) / 2, y0 = (H - th) / 2
      r = {
        mode: 'stacked',
        slide: { x: x0, y: y0, w: s, h: sh },
        other: { x: x0, y: y0 + sh + G, w: w2, h: h2 },
        me: { x: x0, y: y0 + sh + G + h2 + G, w: w2, h: h2 },
      }
    } else {
      const th = sh + G + h1, x0 = (W - s) / 2, y0 = (H - th) / 2
      r = {
        mode: 'stacked',
        slide: { x: x0, y: y0, w: s, h: sh },
        other: { x: x0, y: y0 + sh + G, w: w1, h: h1 },
        me: { x: x0 + w1 + G, y: y0 + sh + G, w: w1, h: h1 },
      }
    }
  }

  // Keep the controls close to the content: close the gap under it, leaving 28px.
  let bottom = 0
  for (const b of [r.slide, r.other, r.me]) if (b) bottom = Math.max(bottom, b.y + b.h)
  const lift = Math.max(0, H - bottom - 28)
  return { ...r, lift }
}

/* ---------------- the AI classroom: no camera tiles, the AI tutor floats ---------------- */

export type AiLayoutMode = 'float' | 'panel-side' | 'panel-top' | 'slide-side' | 'slide-top'
export type AiLayoutResult = {
  mode: AiLayoutMode
  /** the panel or the slide (null = nothing open) */
  main: Rect | null
  /** the AI tutor: a square; its name sits under it */
  tutor: Rect
  lift: number
}

/**
 * The AI classroom (design: mockups/ai-classroom-layout.html).
 *  - nothing open: the tutor in the middle (up to 210px)
 *  - the panel: a square flush left (up to 4:5 when width is tight), the tutor centred in the space on the right;
 *    in a tall window the panel goes on top, full width, and the tutor underneath
 *  - a slide (or the whiteboard): its own shape, on the left with the tutor on the right when that costs the
 *    slide (almost) nothing; otherwise centred on top with a smaller tutor underneath
 */
export function computeAiLayout(W: number, H: number, opts: { main: 'none' | 'panel' | 'slide'; ratio?: number }): AiLayoutResult | null {
  if (!W || !H) return null
  const NAME = 30 // room for the name under the tutor
  const sq = (cx: number, cy: number, s: number): Rect => ({ x: cx - s / 2, y: cy - s / 2 - NAME / 2, w: s, h: s })
  const done = (mode: AiLayoutMode, main: Rect | null, tutor: Rect): AiLayoutResult => {
    let bottom = tutor.y + tutor.h + NAME
    if (main) bottom = Math.max(bottom, main.y + main.h)
    return { mode, main, tutor, lift: main ? Math.max(0, H - bottom - 28) : 0 }
  }

  if (opts.main === 'none') {
    const s = Math.max(72, Math.min(W * 0.3, H * 0.38, 210))
    return done('float', null, sq(W / 2, H / 2, s))
  }

  if (opts.main === 'panel') {
    if (W / H >= 0.95) {
      const mw = Math.max(0, Math.min(H, W - G - 140))
      const mh = Math.min(H, mw * 1.25)
      const rw = W - mw - G
      const s = Math.max(72, Math.min(rw * 0.62, H * 0.42, 240))
      return done('panel-side', { x: 0, y: 0, w: mw, h: mh }, sq(mw + G + rw / 2, H / 2, s))
    }
    const minT = Math.max(96, Math.min(160, H * 0.2))
    const mh = Math.max(0, Math.min(H - minT - NAME - G * 2, W * 1.25))
    const left = H - mh
    const s = Math.max(72, Math.min(left * 0.6 - NAME / 2, W * 0.5, 220))
    return done('panel-top', { x: 0, y: 0, w: W, h: mh }, sq(W / 2, mh + left / 2, s))
  }

  const SR = Math.min(1.2, Math.max(0.4, opts.ratio ?? 3 / 4))
  const band = Math.max(130, Math.min(190, H * 0.27))
  const sideW = Math.max(0, Math.min(H / SR, W - G - 200))
  const topW = Math.max(0, Math.min(W, (H - band) / SR))
  if (sideW >= topW * 0.95) {
    const mh = sideW * SR
    const rw = W - sideW - G
    const s = Math.max(80, Math.min(rw * 0.6, H * 0.36, 190))
    return done('slide-side', { x: 0, y: (H - mh) / 2, w: sideW, h: mh }, sq(sideW + G + rw / 2, H / 2, s))
  }
  const mh = topW * SR
  const left = H - mh
  const s = Math.max(72, Math.min(left * 0.62 - NAME / 2, 150))
  return done('slide-top', { x: (W - topW) / 2, y: 0, w: topW, h: mh }, sq(W / 2, mh + left / 2, s))
}
