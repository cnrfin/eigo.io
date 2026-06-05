'use client'

import type { CSSProperties, ReactNode } from 'react'
import SquircleBox from './SquircleBox'

interface SquircleCardProps {
  radius?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
  /** Stretch the card (and its squircle layers) to fill the parent's height —
   *  e.g. equal-height cards in a grid row. */
  fullHeight?: boolean
}

// Squircle container that keeps the design's hairline border + soft shadow,
// neither of which survive @squircle-js's clip-path alone:
//   - shadow: drop-shadow() on an outer wrapper so it follows the squircle
//   - border: a 1px squircle of --hairline behind the --card fill
export default function SquircleCard({ radius = 20, className, style, children, fullHeight = false }: SquircleCardProps) {
  // NB: @squircle-js rewrites inline width/height on its element (measured /
  // default values are spread AFTER the user style), so the stretch has to be
  // done with classes — inline `height: '100%'` would be silently discarded.
  const h = fullHeight ? 'h-full' : undefined
  return (
    <div className={h} style={{ filter: 'drop-shadow(var(--card-shadow))' }}>
      {/* Border layer: hairline painted OVER the card colour, so when the
          hairline is transparent (borderless light mode) the 1px rim matches
          the card instead of letting the page bg bleed through as a line. */}
      <SquircleBox cornerRadius={radius} className={h} style={{ background: 'linear-gradient(var(--hairline), var(--hairline)), var(--card)', padding: 1 }}>
        <SquircleBox cornerRadius={radius - 1} className={fullHeight ? `h-full ${className ?? ''}` : className} style={{ background: 'var(--card)', ...style }}>
          {children}
        </SquircleBox>
      </SquircleBox>
    </div>
  )
}
