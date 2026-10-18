import type { CSSProperties } from 'react'

/**
 * iOS-style progressive blur for a scroll edge: content behind gets more blurred towards
 * the edge, instead of fading to the background colour.
 *
 * Web has no single "variable blur", so it stacks a few backdrop-filter layers, each
 * stronger than the last and masked to its own band, which blends into a smooth ramp.
 * A light tint (the page background) on top keeps text above it readable.
 * Place it inside a positioned element (absolute, full width, pointer-events off).
 */
export default function ProgressiveBlur({
  edge = 'top',
  height,
  tint = 0.6,
  maxBlur = 16,
  steps = 6,
  className,
  style,
}: {
  /** which edge is the most blurred */
  edge?: 'top' | 'bottom'
  height: number | string
  /** 0..1: how strongly the page background tints the edge */
  tint?: number
  /** blur (px) of the strongest layer */
  maxBlur?: number
  /** how many blur layers (fewer is cheaper over long scrolling lists; 6 is the smoothest ramp) */
  steps?: number
  className?: string
  style?: CSSProperties
}) {
  // N layers, blur doubling each step up to maxBlur
  const N = Math.max(2, Math.round(steps))
  const dir = edge === 'top' ? 'to top' : 'to bottom' // gradient runs from the soft side to the edge
  const band = 100 / (N + 1)
  const layers = Array.from({ length: N }, (_, i) => {
    const blur = maxBlur / 2 ** (N - 1 - i)
    const a = i * band
    const mask = `linear-gradient(${dir}, transparent ${a}%, #000 ${a + band}%, #000 ${a + 2 * band}%, transparent ${Math.min(100, a + 3 * band)}%)`
    // the strongest layer stays on all the way to the edge
    const lastMask = `linear-gradient(${dir}, transparent ${a}%, #000 ${a + band}%)`
    const m = i === N - 1 ? lastMask : mask
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          maskImage: m,
          WebkitMaskImage: m,
        }}
      />
    )
  })
  return (
    <div
      aria-hidden
      className={className}
      style={{ position: 'absolute', left: 0, right: 0, [edge]: 0, height, pointerEvents: 'none', ...style }}
    >
      {layers}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${edge === 'top' ? 'to bottom' : 'to top'}, color-mix(in srgb, var(--dash-bg) ${Math.round(tint * 100)}%, transparent) 0%, transparent 100%)`,
        }}
      />
    </div>
  )
}
