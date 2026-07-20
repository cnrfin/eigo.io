/* Shared bento layout (ported from bento-grid.html) — desktop 5×2 and mobile
   2×5, switched at 640px. Used by the interactive DOM grid (BentoGridV3). */

export const GAP = 12
export const MOBILE_BP = 640

// Resting colour of each card (≈ what the content layer shows) — the morph shell
// starts here and mixes to teal, so the crossfade is seamless.
export const PALETTE: Record<string, string> = {
  tl: '#00a89f',     // pronunciation (accent)
  t2: '#ffffff',     // review (white card)
  wide: '#39413f',   // IELTS (dark photo)
  center: '#ffffff', // trial (white card)
  r1: '#ffffff',     // review (white card)
  r2: '#e85d8a',     // level check (bold pink)
}
export const CARD_IDS = ['tl', 't2', 'wide', 'center', 'r1', 'r2']

export type CardCfg = { col: number; row: number; w: number; h: number; exp: { col: number; row: number; w: number; h: number } | null }
export type Layout = { cols: number; rows: number; maxW: number; cards: Record<string, CardCfg>; centerShrink: { col: number; row: number; w: number; h: number }; shrinkTriggers: string[] }

export const DESKTOP: Layout = {
  cols: 5, rows: 2, maxW: 900,
  cards: {
    tl: { col: 0, row: 0, w: 1, h: 1, exp: { col: 0, row: 0, w: 2, h: 2 } },
    t2: { col: 1, row: 0, w: 1, h: 1, exp: { col: 0, row: 0, w: 2, h: 2 } },
    wide: { col: 0, row: 1, w: 2, h: 1, exp: { col: 0, row: 0, w: 2, h: 2 } },
    center: { col: 2, row: 0, w: 2, h: 2, exp: null },
    r1: { col: 4, row: 0, w: 1, h: 1, exp: { col: 3, row: 0, w: 2, h: 2 } },
    r2: { col: 4, row: 1, w: 1, h: 1, exp: { col: 3, row: 0, w: 2, h: 2 } },
  },
  centerShrink: { col: 2, row: 0, w: 1, h: 2 },
  shrinkTriggers: ['r1', 'r2'],
}

// Mobile drops the two student-review cards and stacks the four feature cards
// as full-width (2-col) banners: pronunciation, IELTS, free trial, level check.
// Tapping a feature card expands it to a tall card that reveals its description
// (`exp`); the trial card just routes to booking.
export const MOBILE: Layout = {
  cols: 2, rows: 4, maxW: 460,
  cards: {
    tl: { col: 0, row: 0, w: 2, h: 1, exp: { col: 0, row: 0, w: 2, h: 2 } },
    wide: { col: 0, row: 1, w: 2, h: 1, exp: { col: 0, row: 1, w: 2, h: 2 } },
    center: { col: 0, row: 2, w: 2, h: 1, exp: null },
    r2: { col: 0, row: 3, w: 2, h: 1, exp: { col: 0, row: 2, w: 2, h: 2 } },
  },
  centerShrink: { col: 0, row: 2, w: 2, h: 1 },
  shrinkTriggers: [],
}

export const layoutFor = (vw: number): Layout => (vw <= MOBILE_BP ? MOBILE : DESKTOP)

export type Geom = { cell: number; gx: number; gy: number; gridW: number; gridH: number }
export function computeGeom(vw: number, vh: number, layout: Layout): Geom {
  const gridMaxW = Math.min(vw - 32, layout.maxW)
  const cellW = (gridMaxW - GAP * (layout.cols - 1)) / layout.cols
  // Also cap the cell by the available height so the whole grid fits its
  // container — this keeps the tall mobile 2×5 stack inside the viewport.
  const cellH = (vh * 0.94 - GAP * (layout.rows - 1)) / layout.rows
  const cell = Math.max(1, Math.min(cellW, cellH))
  const gridW = cell * layout.cols + GAP * (layout.cols - 1)
  const gridH = cell * layout.rows + GAP * (layout.rows - 1)
  return { cell, gx: (vw - gridW) / 2, gy: vh * 0.5 - gridH / 2, gridW, gridH } // centred in its container
}

export type Rect = { x: number; y: number; w: number; h: number }
export function rectOf(c: { col: number; row: number; w: number; h: number }, g: Geom): Rect {
  return {
    x: g.gx + c.col * (g.cell + GAP),
    y: g.gy + c.row * (g.cell + GAP),
    w: g.cell * c.w + GAP * (c.w - 1),
    h: g.cell * c.h + GAP * (c.h - 1),
  }
}
