'use client'

import { useEffect, useRef } from 'react'

/**
 * Audio levels for the tile dots and the lobby meter. One shared AudioContext;
 * values are written straight to the DOM from a rAF loop (no React renders),
 * and only when they change. Browsers start the context suspended until the
 * first tap or click, so we resume it on the next pointerdown.
 */

let ctx: AudioContext | null = null
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const resume = () => ctx?.state === 'suspended' && ctx.resume().catch(() => {})
    window.addEventListener('pointerdown', resume, { capture: true })
    window.addEventListener('keydown', resume, { capture: true })
  }
  return ctx
}

/** roughly −55 dB → 0, −15 dB → 1 */
function levelOf(an: AnalyserNode, buf: Float32Array<ArrayBuffer>) {
  an.getFloatTimeDomainData(buf)
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  const rms = Math.sqrt(s / buf.length)
  return Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-6) + 55) / 40))
}

/** Calls onLevel(0..1) every frame (smoothed) while the stream has audio. */
export function useAudioLevel(stream: MediaStream | null | undefined, onLevel: (v: number) => void) {
  const cb = useRef(onLevel)
  cb.current = onLevel
  const trackId = stream?.getAudioTracks()[0]?.id

  useEffect(() => {
    const track = stream?.getAudioTracks()[0]
    const ac = audioContext()
    if (!track || !ac) {
      cb.current(0)
      return
    }
    let src: MediaStreamAudioSourceNode | null = null
    let an: AnalyserNode | null = null
    try {
      src = ac.createMediaStreamSource(new MediaStream([track]))
      an = ac.createAnalyser()
      an.fftSize = 512
      src.connect(an)
    } catch {
      return
    }
    const buf = new Float32Array(an.fftSize)
    let v = 0
    let raf = 0
    const tick = () => {
      const target = track.enabled && track.readyState === 'live' ? levelOf(an!, buf) : 0
      v += (target - v) * (target > v ? 0.5 : 0.15)
      cb.current(v)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      try {
        src?.disconnect()
      } catch {}
    }
    // re-run when the audio track itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])
}

/** The small dot in a tile's top-right corner: grey, teal and bigger with the voice, muted badge when the mic is off. */
export function useVolDot(stream: MediaStream | null | undefined, muted: boolean) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const last = useRef({ live: false, sc: '' })
  useAudioLevel(muted ? null : stream, (v) => {
    const el = ref.current
    if (!el) return
    const live = !muted && v > 0.08
    const sc = (1 + Math.min(1, v) * 0.8).toFixed(2)
    if (last.current.live !== live) {
      el.classList.toggle('live', live)
      last.current.live = live
    }
    if (last.current.sc !== sc) {
      ;(el.firstElementChild as HTMLElement | null)?.style.setProperty('transform', `scale(${sc})`)
      last.current.sc = sc
    }
  })
  return ref
}
