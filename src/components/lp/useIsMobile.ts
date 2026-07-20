'use client'

import { useEffect, useState } from 'react'

/* Small SSR-safe media-query hook for the v3 landing. Defaults to false on the
   server / first paint, then syncs on mount so layout can branch for mobile. */
export function useIsMobile(maxWidth = 640): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [maxWidth])
  return mobile
}
