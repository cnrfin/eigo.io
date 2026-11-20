'use client'

/**
 * Whether the mascots should use Rive's WebGL2 runtime here, or fall back to the
 * canvas one.
 *
 * WebGL2 draws the rigs properly (feathered shading, soft edges), so it's used
 * wherever it works. Two cases fall back to canvas, which draws the characters
 * slightly rougher but always draws them:
 *
 *  - The browser can't create a WebGL2 context at all (hardware acceleration
 *    off, or an earlier GPU crash has disabled WebGL for the session).
 *  - Chrome 158+ on a Mac with Intel graphics. There Chrome's ANGLE/Metal shader
 *    compiler hits an internal error on the Rive Renderer's pixel-local-storage
 *    shaders (seen Nov 2026 on Intel UHD 630, Chrome 158.0.8127): the GPU process
 *    crashes, the context is lost and Chrome disables WebGL for the whole
 *    session, on every site. Newer Rive (webgl2 2.52) crashes the same way, so
 *    WebGL is never tried there. Revisit when Chrome ships a fix.
 *
 * The check runs once per page load; the throwaway probe context is released at
 * once so it doesn't count towards the browser's context limit.
 */
import { useSyncExternalStore } from 'react'

let cached: boolean | null = null

function chromeMajor(): number {
  const m = /Chrome\/(\d+)/.exec(navigator.userAgent)
  return m ? Number(m[1]) : 0
}

function probe(): boolean {
  if (cached !== null) return cached
  let ok = false
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (gl) {
      ok = true
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
      const intelMetal = /Intel/i.test(renderer) && /Metal/i.test(renderer)
      if (intelMetal && chromeMajor() >= 158) ok = false
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    ok = false
  }
  cached = ok
  return ok
}

const subscribe = () => () => {}

/** true / false in the browser; null during server render (draw nothing yet) */
export function useWebGL2(): boolean | null {
  return useSyncExternalStore(subscribe, probe, () => null)
}
