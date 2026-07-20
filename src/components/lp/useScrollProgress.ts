'use client'

import { useEffect, useState } from 'react'

/* Scroll-linked progress 0..1 over the first ~0.7 viewport heights.
   Drives the hero text + bento parallax. */
export default function useScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const fn = () => setP(Math.min(1, window.scrollY / (window.innerHeight * 0.7)))
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return p
}
