'use client'

import { useId } from 'react'

// Rounded-corner regular polygon path (used for the pentagon review node — 五角
// "pentagon" puns on 合格 "pass"). Corners are eased with quadratic curves.
function roundedPolygon(cx: number, cy: number, r: number, sides: number, rot: number, cr: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  const unit = (x: number, y: number): [number, number] => { const l = Math.hypot(x, y) || 1; return [x / l, y / l] }
  const f = (n: number) => n.toFixed(2)
  let d = ''
  for (let i = 0; i < sides; i++) {
    const V = pts[i], P = pts[(i - 1 + sides) % sides], N = pts[(i + 1) % sides]
    const tp = unit(P[0] - V[0], P[1] - V[1]), tn = unit(N[0] - V[0], N[1] - V[1])
    const A: [number, number] = [V[0] + tp[0] * cr, V[1] + tp[1] * cr]
    const B: [number, number] = [V[0] + tn[0] * cr, V[1] + tn[1] * cr]
    d += `${i === 0 ? 'M' : 'L'} ${f(A[0])} ${f(A[1])} Q ${f(V[0])} ${f(V[1])} ${f(B[0])} ${f(B[1])} `
  }
  return d + 'Z'
}

// Tube-map style station marker (SVG, theme-aware via CSS vars). `state`:
//   0 = locked, 1 = available, 2 = active (current), 3 = completed.
// `color` matches the gradient line at this station; `color2` (optional) is the
// next level's colour at an interchange (fill split top/bottom).
// `isReview` swaps the circle for a rounded pentagon (the level-end review node).
export default function CourseStation({
  size = 64, color, color2, state, isReview = false, pulseClass = 'course-node-pulse',
}: { size?: number; color: string; color2?: string; state: number; isReview?: boolean; pulseClass?: string }) {
  const c = size / 2
  const r = size * 0.22                    // circle radius (pentagon scales off this)
  const sw = Math.max(1, size * 0.016)     // ~1px ink outline
  const ink = 'var(--text)'
  const clip = useId()

  // A filled or outlined marker at radius `rad`. Pentagon for review nodes,
  // circle otherwise — pentagon runs a bit larger so it reads the same size.
  // Plain function (not a component) so it isn't re-created on each render.
  const shape = (rad: number, fill: string, stroke: string, strokeW: number, key?: string) =>
    isReview
      ? <path key={key} d={roundedPolygon(c, c, rad * 1.18, 5, -Math.PI / 2, rad * 1.18 * 0.3)}
          fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
      : <circle key={key} cx={c} cy={c} r={rad} fill={fill} stroke={stroke} strokeWidth={strokeW} />

  if (state === 0) { // locked — transparent, dim outline
    return <svg width={size} height={size} aria-hidden>{shape(r, 'none', 'var(--text-disabled)', sw)}</svg>
  }

  if (state === 3) { // completed — solid fill (matches line), bg casing ring + check
    const u = r / 14
    return (
      <svg width={size} height={size} aria-hidden>
        {shape(r, color, 'var(--dash-bg)', 2, 'base')}
        {color2 && (
          <>
            <clipPath id={clip}><rect x={0} y={c} width={size} height={c} /></clipPath>
            <g clipPath={`url(#${clip})`}>{shape(r, color2, 'none', 0, 'half')}</g>
            {shape(r, 'none', 'var(--dash-bg)', 2, 'ring')}
          </>
        )}
        <path d={`M ${c - 6 * u} ${c + 0.5 * u} L ${c - 1.5 * u} ${c + 5 * u} L ${c + 6.5 * u} ${c - 4.5 * u}`}
          fill="none" stroke="#fff" strokeWidth={size * 0.045} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (state === 2) { // active / current — bigger outline + colour centre (mascot stands here)
    const ro = size * 0.30
    const dotR = size * 0.14
    return (
      <svg width={size} height={size} aria-hidden className={pulseClass}>
        {shape(ro, 'none', ink, sw)}
        {color2
          ? (<>
              {shape(dotR, color, 'none', 0, 'dot')}
              <clipPath id={clip}><rect x={0} y={c} width={size} height={c} /></clipPath>
              <g clipPath={`url(#${clip})`}>{shape(dotR, color2, 'none', 0, 'dot2')}</g>
            </>)
          : shape(dotR, color, 'none', 0, 'dot')}
      </svg>
    )
  }

  // available — transparent, ink outline (line shows through)
  return <svg width={size} height={size} aria-hidden>{shape(r, 'none', ink, sw)}</svg>
}
