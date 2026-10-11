'use client'

import { useEffect } from 'react'

/**
 * Tap-origin fill (the CUPS app's "shockwave" selection), for the web.
 *
 * Opt in with a `data-fill` attribute on any button whose background changes
 * when it's selected (pill tabs, durations, calendar days, time slots…). The
 * component itself is unchanged: when it's clicked, a layer painted in its
 * *previous* background sits over the new one and a circular hole grows from
 * the exact click point, so the new state spreads out from the finger.
 * Pure DOM + CSS (see `[data-fill]` in globals.css); React never sees it, and
 * nothing happens with reduced motion or when the background doesn't change.
 *
 * Mounted once in the app providers.
 */

function effectiveBg(el: Element | null): string {
  for (let n = el; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor
    if (c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c)) return c
  }
  return getComputedStyle(document.body).backgroundColor
}

export default function TapFill() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let armed: HTMLElement | null = null

    const down = (e: PointerEvent) => {
      if (reduce.matches || e.button !== 0) return
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-fill]')
      armed = null
      if (!el || (el as HTMLButtonElement).disabled) return
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative' // anchor the layer, without moving absolutely-placed buttons
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      el.style.setProperty('--tf-x', `${x}px`)
      el.style.setProperty('--tf-y', `${y}px`)
      el.style.setProperty('--tf-max', `${Math.ceil(Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y))) + 2}px`)
      el.style.setProperty('--tf-old', effectiveBg(el))
      armed = el
    }

    // Capture phase: runs before React's click handler re-renders the button,
    // so the old colour covers it from the very first frame of the new state.
    const click = (e: MouseEvent) => {
      const el = armed
      armed = null
      if (!el || !el.contains(e.target as Node)) return
      el.classList.remove('tf-run')
      void el.offsetWidth // restart the animation
      el.classList.add('tf-run')
    }
    const end = (e: AnimationEvent) => {
      if (e.animationName === 'tf-reveal') (e.target as HTMLElement).classList.remove('tf-run')
    }

    document.addEventListener('pointerdown', down, true)
    document.addEventListener('click', click, true)
    document.addEventListener('animationend', end, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('animationend', end, true)
    }
  }, [])
  return null
}
