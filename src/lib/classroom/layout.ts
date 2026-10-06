/**
 * Classroom layout engine (ported from mockups/classroom-mockup.html).
 *
 *  - Slide is 4:3, video tiles 16:9 (they may grow to 3:4 portrait on tall
 *    screens), 12px gaps. Everything keeps its shape; only sizes change.
 *  - side:    slide left, the two videos stacked on the right
 *  - stacked: slide on top, the two videos side by side underneath (or
 *             stacked full width on tall phones, if that gives bigger videos)
 *  - videos:  free talk, no slide: the two videos as big as they fit
 *
 * Pure function: the caller measures the area and places the elements.
 */

export type Rect = { x: number; y: number; w: number; h: number }
export type LayoutMode = 'side' | 'stacked' | 'videos'
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
    chatOpen: boolean
    /** height / width of the slide area: 3/4 for slides, the shape of a shared screen while sharing */
    ratio?: number
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
