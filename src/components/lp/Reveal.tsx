'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type ElementType } from 'react'

/* Blur-in-on-scroll wrapper. Adds `.in` (see .v3-reveal in globals.css) the
   first time the element enters the viewport, so its content sharpens and rises
   into place. `delay` staggers grouped elements. */
export default function Reveal({ children, delay = 0, as = 'div', className = '', style }: {
  children: ReactNode
  delay?: number
  as?: ElementType
  className?: string
  style?: CSSProperties
}) {
  // `as` is always a plain intrinsic tag (div, h2 or p in practice). TypeScript
  // can't distribute props across the open ElementType union, so ref/className/
  // style collapse to `never` and the build fails; pinning it to 'div' types the
  // props as HTMLAttributes, which covers every tag used here. Runtime is
  // unchanged — React still receives whatever tag string was passed.
  const Tag = as as 'div'
  const ref = useRef<HTMLDivElement | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // If the element is already scrolled past (above the viewport) at mount —
    // e.g. a restored scroll position on back-navigation — the observer never
    // fires for it, which would leave the content invisible. Reveal it straight
    // away so nothing above the fold stays blank.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (el.getBoundingClientRect().bottom <= 0) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`v3-reveal${seen ? ' in' : ''} ${className}`} style={{ transitionDelay: `${delay}s`, ...style }}>
      {children}
    </Tag>
  )
}
