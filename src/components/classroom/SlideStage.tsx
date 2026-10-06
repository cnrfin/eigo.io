'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { SlideCanvas, SlideCharacters, SlideMediaSync, type MediaSyncApi, type SlideMode } from '@/lib/slides'
import type { Character, Slide } from '@/lib/slides/types'
import { Ico } from './Icons'

/**
 * The slide area: the 1280×960 slide scaled to the box the layout gives it,
 * with local zoom (each person zooms on their own screen):
 *  - touch: pinch to zoom, drag to pan when zoomed, double-tap to zoom in/out
 *  - desktop: Ctrl/⌘ + wheel or trackpad pinch; wheel pans when zoomed
 * Video and audio blocks are kept in sync between teacher and student.
 */

export type MediaEvent = { blockId: string; action: 'play' | 'pause' | 'ended'; time: number; n: number }
export type SlideStageHandle = { resetZoom: () => void }

type Props = {
  slide: Slide | null
  mode: SlideMode
  assetBase: string
  characters: Character[] | undefined
  className: string
  /** a play / pause from the other person, to apply here */
  remoteMedia: MediaEvent | null
  /** a play / pause made here, to send to the other person */
  onLocalMedia: (e: Omit<MediaEvent, 'n'>) => void
  zoomLabel: string
  /** the layout engine positions this box */
  setBox: (el: HTMLDivElement | null) => void
}

const STAGE_W = 1280
const STAGE_H = 960

const SlideStage = forwardRef<SlideStageHandle, Props>(function SlideStage(props, ref) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const chipRef = useRef<HTMLButtonElement | null>(null)
  const base = useRef(1)
  const zoom = useRef({ z: 1, x: 0, y: 0 })
  const [zoomed, setZoomed] = useState(false)

  const apply = useCallback(() => {
    const s = base.current * zoom.current.z
    const st = stageRef.current
    if (st) st.style.transform = `translate(${zoom.current.x}px,${zoom.current.y}px) scale(${s})`
    const on = zoom.current.z > 1.02
    setZoomed(on)
    const span = chipRef.current?.querySelector('span')
    if (span) span.textContent = Math.round(zoom.current.z * 100) + '%'
  }, [])
  const clamp = useCallback(() => {
    const z = zoom.current
    const bw = STAGE_W * base.current
    const bh = STAGE_H * base.current
    z.z = Math.min(4, Math.max(1, z.z))
    z.x = Math.min(0, Math.max(bw - bw * z.z, z.x))
    z.y = Math.min(0, Math.max(bh - bh * z.z, z.y))
  }, [])
  const animateOnce = useCallback(() => {
    const box = boxRef.current
    if (!box) return
    box.classList.add('zoomAnim')
    window.setTimeout(() => box.classList.remove('zoomAnim'), 320)
  }, [])
  const zoomAt = useCallback(
    (nz: number, px: number, py: number) => {
      const z = zoom.current
      const k = Math.min(4, Math.max(1, nz)) / z.z
      z.x = px - (px - z.x) * k
      z.y = py - (py - z.y) * k
      z.z *= k
      clamp()
      apply()
    },
    [apply, clamp],
  )
  const resetZoom = useCallback(() => {
    boxRef.current?.classList.remove('gesturing')
    if (zoom.current.z > 1.02) animateOnce()
    zoom.current = { z: 1, x: 0, y: 0 }
    apply()
  }, [animateOnce, apply])
  useImperativeHandle(ref, () => ({ resetZoom }), [resetZoom])

  // fit the stage to the box (the layout engine sets the box size)
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const fit = () => {
      if (!box.clientWidth) return
      base.current = box.clientWidth / STAGE_W
      clamp()
      apply()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [apply, clamp])

  // a new slide always starts at 100%
  const slideId = props.slide?.id
  useEffect(() => {
    zoom.current = { z: 1, x: 0, y: 0 }
    apply()
  }, [slideId, apply])

  // gestures
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const touches = new Map<number, [number, number]>()
    let pinch: { d: number; z: number; m: [number, number]; x: number; y: number } | null = null
    let pan: { p: [number, number]; x: number; y: number } | null = null
    let lastTap = 0
    let settleT = 0
    const pt = (e: { clientX: number; clientY: number }): [number, number] => {
      const r = box.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const interactive = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('button,video,audio,a,input,textarea,.es-tf,.es-match,.zoomChip')

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || (e.target instanceof Element && e.target.closest('.zoomChip'))) return
      touches.set(e.pointerId, pt(e))
      if (touches.size === 2) {
        const [a, b] = [...touches.values()]
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: zoom.current.z, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], x: zoom.current.x, y: zoom.current.y }
        pan = null
        box.classList.add('gesturing')
        e.preventDefault()
      } else if (touches.size === 1 && zoom.current.z > 1.02 && !interactive(e.target)) {
        pan = { p: pt(e), x: zoom.current.x, y: zoom.current.y }
        box.classList.add('gesturing')
      }
    }
    const move = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, pt(e))
      if (pinch && touches.size >= 2) {
        const [a, b] = [...touches.values()]
        const d = Math.hypot(a[0] - b[0], a[1] - b[1])
        const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const nz = Math.min(4, Math.max(1, (pinch.z * d) / pinch.d))
        const k = nz / pinch.z
        zoom.current = { z: nz, x: m[0] - (pinch.m[0] - pinch.x) * k, y: m[1] - (pinch.m[1] - pinch.y) * k }
        clamp()
        apply()
      } else if (pan) {
        const p = pt(e)
        zoom.current.x = pan.x + p[0] - pan.p[0]
        zoom.current.y = pan.y + p[1] - pan.p[1]
        clamp()
        apply()
      }
    }
    const up = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
      if (touches.size) return
      const moved = !!pan && (Math.abs(zoom.current.x - pan.x) > 3 || Math.abs(zoom.current.y - pan.y) > 3)
      pan = null
      box.classList.remove('gesturing')
      const now = Date.now()
      if (!moved && now - lastTap < 300 && !interactive(e.target)) {
        const p = pt(e)
        if (zoom.current.z > 1.02) resetZoom()
        else {
          animateOnce()
          zoomAt(2.5, p[0], p[1])
        }
        lastTap = 0
      } else lastTap = now
    }
    const settle = () => {
      window.clearTimeout(settleT)
      settleT = window.setTimeout(() => box.classList.remove('gesturing'), 140)
    }
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const p = pt(e)
        box.classList.add('gesturing')
        zoomAt(zoom.current.z * Math.exp(-e.deltaY * 0.01), p[0], p[1])
        settle()
      } else if (zoom.current.z > 1.02) {
        e.preventDefault()
        box.classList.add('gesturing')
        zoom.current.x -= e.deltaX
        zoom.current.y -= e.deltaY
        clamp()
        apply()
        settle()
      }
    }
    box.addEventListener('pointerdown', down, true)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    box.addEventListener('wheel', wheel, { passive: false })
    return () => {
      box.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      box.removeEventListener('wheel', wheel)
      window.clearTimeout(settleT)
    }
  }, [animateOnce, apply, clamp, resetZoom, zoomAt])

  /* ---------- media sync ---------- */
  const suppress = useRef(new Map<string, number>())
  const { onLocalMedia } = props
  const mediaApi = useMemo<MediaSyncApi>(
    () => ({
      onEvent: (blockId, action, time) => {
        if ((suppress.current.get(blockId) ?? 0) > Date.now()) return // our own echo of a remote event
        onLocalMedia({ blockId, action, time })
      },
    }),
    [onLocalMedia],
  )
  const remote = props.remoteMedia
  useEffect(() => {
    if (!remote) return
    const el = stageRef.current?.querySelector<HTMLMediaElement>(
      `[data-block-id="${CSS.escape(remote.blockId)}"] video, [data-block-id="${CSS.escape(remote.blockId)}"] audio`,
    )
    if (!el) return
    suppress.current.set(remote.blockId, Date.now() + 800)
    if (Math.abs(el.currentTime - remote.time) > 0.6 && Number.isFinite(remote.time)) el.currentTime = remote.time
    if (remote.action === 'play') void el.play().catch(() => undefined)
    else el.pause()
  }, [remote])

  return (
    <div
      className={props.className}
      ref={(el) => {
        boxRef.current = el
        props.setBox(el)
      }}
    >
      <div className="stage" ref={stageRef}>
        <div id="slideHost">
          {props.slide && (
            <SlideCharacters characters={props.characters} assetBase={props.assetBase}>
              <SlideMediaSync value={mediaApi}>
                <SlideCanvas slide={props.slide} mode={props.mode} assetBase={props.assetBase} />
              </SlideMediaSync>
            </SlideCharacters>
          )}
        </div>
      </div>
      <button className={`zoomChip${zoomed ? ' on' : ''}`} ref={chipRef} title={props.zoomLabel} onClick={resetZoom}>
        <Ico name="fit" />
        <span>100%</span>
      </button>
    </div>
  )
})

export default SlideStage
