'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  SlideActivity,
  SlideCanvas,
  SlideCharacters,
  SlideMediaSync,
  SlideVocabSave,
  type ActivityApi,
  type MediaSyncApi,
  type SlideMode,
  type VocabSaveApi,
} from '@/lib/slides'
import type { Character, Slide } from '@/lib/slides/types'
import { Ico } from './Icons'
import type { InkEngine } from './ink'
import type { LookupEngine } from './lookup'

/**
 * The slide area: the 1280×960 slide scaled to the box the layout gives it,
 * with local zoom (each person zooms on their own screen):
 *  - touch: pinch to zoom; with the select tool, drag to pan when zoomed and
 *    double-tap to zoom in / out (with a drawing tool one finger draws)
 *  - desktop: Ctrl/⌘ + wheel or trackpad pinch; wheel pans when zoomed
 * Video and audio blocks are kept in sync between teacher and student.
 * On top of the slide: the lesson whiteboard, the drawing layer (ink.ts) and
 * the other person's live cursor, all in 1280×960 stage coordinates.
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
  /** word lookup on the slide's text */
  lookup: LookupEngine
  /** the + buttons in vocabulary tables (student only; null = faded preview) */
  vocabApi: VocabSaveApi | null
  /** true / false and matching answers, shared by both people */
  activityApi: ActivityApi | null
  remoteMedia: MediaEvent | null
  /** a play / pause made here, to send to the other person */
  onLocalMedia: (e: Omit<MediaEvent, 'n'>) => void
  zoomLabel: string
  /** the layout engine positions this box */
  setBox: (el: HTMLDivElement | null) => void
  ink: InkEngine
  /** 'board' for the whiteboard, else the slide id ('' = nothing to draw on) */
  surface: string
  /** remote cursor updates arrive here: event 'cursor', detail {x, y} or null */
  bus: EventTarget
  otherName: string
  boardLabel: string
  /** my pointer over the slide, for the other person's cursor (null = left the slide) */
  onCursor: (p: { x: number; y: number } | null) => void
  /** a screen share fills this box (mine or the other person's) */
  share: { stream: MediaStream; local: boolean; audio: boolean; label: string; stopLabel: string | null } | null
  onStopShare: () => void
  /** height / width of the shared screen, so the layout can give it its shape */
  onShareRatio: (r: number) => void
}

const STAGE_W = 1280
const STAGE_H = 960

const SlideStage = forwardRef<SlideStageHandle, Props>(function SlideStage(props, ref) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const chipRef = useRef<HTMLButtonElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const cursorPos = useRef<[number, number] | null>(null)
  const base = useRef(1)
  const zoom = useRef({ z: 1, x: 0, y: 0 })
  const [zoomed, setZoomed] = useState(false)
  const { ink } = props

  const placeCursor = useCallback(() => {
    const el = cursorRef.current
    const p = cursorPos.current
    if (!el || !p) return
    // constant on-screen size whatever the slide's scale or zoom
    el.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) scale(${(1 / (base.current * zoom.current.z || 1)).toFixed(4)})`
  }, [])
  const apply = useCallback(() => {
    const s = base.current * zoom.current.z
    const st = stageRef.current
    if (st) st.style.transform = `translate(${zoom.current.x}px,${zoom.current.y}px) scale(${s})`
    setZoomed(zoom.current.z > 1.02)
    const span = chipRef.current?.querySelector('span')
    if (span) span.textContent = Math.round(zoom.current.z * 100) + '%'
    placeCursor()
  }, [placeCursor])
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

  // a new slide (or the whiteboard) always starts at 100%
  useEffect(() => {
    zoom.current = { z: 1, x: 0, y: 0 }
    apply()
  }, [props.surface, apply])

  /* ---------- drawing layer ---------- */
  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, textLayer = textRef.current, box = boxRef.current
    if (!stage || !canvas || !textLayer || !box) return
    ink.attach({ stage, canvas, textLayer, box })
    return () => ink.detach()
  }, [ink])
  useEffect(() => {
    ink.setSurface(props.surface)
  }, [ink, props.surface])

  /* ---------- word lookup ---------- */
  const { lookup } = props
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const stage = stageRef.current, host = hostRef.current
    if (!stage || !host) return
    lookup.attach(stage, host)
    const stopTargets = ink.handleSlideTargets((x, y) => lookup.wordAt(x, y))
    return () => {
      stopTargets()
      lookup.detach()
    }
  }, [lookup, ink])
  // saved words turn teal: repaint after each slide renders
  useEffect(() => {
    const id = requestAnimationFrame(() => lookup.paintSaved())
    lookup.clearSelection()
    return () => cancelAnimationFrame(id)
  }, [lookup, props.slide, props.mode])

  /* ---------- live cursors ---------- */
  const { onCursor, bus } = props
  useEffect(() => {
    const box = boxRef.current
    const stage = stageRef.current
    if (!box || !stage) return
    let last = 0
    let pendingT = 0
    let latest: { x: number; y: number } | null = null
    const send = () => {
      last = Date.now()
      pendingT = 0
      onCursor(latest)
    }
    const move = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      const s = r.width / STAGE_W || 1
      latest = { x: Math.round((e.clientX - r.left) / s), y: Math.round((e.clientY - r.top) / s) }
      if (Date.now() - last >= 50) send()
      else if (!pendingT) pendingT = window.setTimeout(send, 50)
    }
    const leave = () => {
      window.clearTimeout(pendingT)
      pendingT = 0
      latest = null
      onCursor(null)
    }
    box.addEventListener('pointermove', move)
    box.addEventListener('pointerleave', leave)
    return () => {
      box.removeEventListener('pointermove', move)
      box.removeEventListener('pointerleave', leave)
      window.clearTimeout(pendingT)
    }
  }, [onCursor])
  useEffect(() => {
    let hideT = 0
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number } | null>).detail
      const el = cursorRef.current
      if (!el) return
      window.clearTimeout(hideT)
      if (!d) {
        el.classList.remove('on')
        return
      }
      cursorPos.current = [d.x, d.y]
      placeCursor()
      el.classList.add('on')
      hideT = window.setTimeout(() => el.classList.remove('on'), 6000) // still for a while: fade it out
    }
    bus.addEventListener('cursor', on)
    return () => {
      bus.removeEventListener('cursor', on)
      window.clearTimeout(hideT)
    }
  }, [bus, placeCursor])

  /* ---------- gestures ---------- */
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
      t instanceof Element && !!t.closest('button,video,audio,a,input,textarea,.es-tf,.es-match,.zoomChip,.inktext')
    const selecting = () => ink.tool === 'select'

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || (e.target instanceof Element && e.target.closest('.zoomChip'))) return
      touches.set(e.pointerId, pt(e))
      if (touches.size === 2) {
        ink.cancel() // two fingers: it's a pinch, not a stroke
        lookup.cancel() // ...nor a lookup
        const [a, b] = [...touches.values()]
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: zoom.current.z, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], x: zoom.current.x, y: zoom.current.y }
        pan = null
        box.classList.add('gesturing')
        e.stopPropagation()
        e.preventDefault()
      } else if (touches.size === 1 && zoom.current.z > 1.02 && selecting() && !interactive(e.target)) {
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
      } else if (pan && !lookup.phraseActive) {
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
      if (now - lookup.tapUsedAt < 80) {
        lastTap = 0 // that tap looked up a word: never part of a double-tap zoom
        return
      }
      if (!moved && selecting() && now - lastTap < 300 && !interactive(e.target)) {
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
  }, [animateOnce, apply, clamp, resetZoom, zoomAt, ink, lookup])

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
        <div id="slideHost" ref={hostRef}>
          {props.slide && (
            <SlideCharacters characters={props.characters} assetBase={props.assetBase}>
              <SlideMediaSync value={mediaApi}>
                <SlideVocabSave value={props.vocabApi}>
                  <SlideActivity value={props.activityApi}>
                    <SlideCanvas slide={props.slide} mode={props.mode} assetBase={props.assetBase} />
                  </SlideActivity>
                </SlideVocabSave>
              </SlideMediaSync>
            </SlideCharacters>
          )}
        </div>
        <div className="board" />
        <canvas id="ink" ref={canvasRef} width={STAGE_W} height={STAGE_H} />
        <div id="textLayer" ref={textRef} />
        <div className="rcursor" ref={cursorRef} aria-hidden>
          <svg viewBox="0 0 24 24">
            <path d="M4 2.5v17l4.6-4.3 2.9 6.6 2.9-1.3-2.9-6.4 6.3-.3z" />
          </svg>
          <span>{props.otherName}</span>
        </div>
      </div>
      <ShareView share={props.share} onStop={props.onStopShare} onRatio={props.onShareRatio} />
      <button className={`zoomChip${zoomed ? ' on' : ''}`} ref={chipRef} title={props.zoomLabel} onClick={resetZoom}>
        <Ico name="fit" />
        <span>100%</span>
      </button>
      <div className="boardTag">
        <Ico name="board" />
        {props.boardLabel}
      </div>
    </div>
  )
})

function ShareView({
  share,
  onStop,
  onRatio,
}: {
  share: Props['share']
  onStop: () => void
  onRatio: (r: number) => void
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const stream = share?.stream ?? null
  // Only touch the video when the stream itself changes. (The room re-renders
  // every second for the clock; re-setting srcObject each time made the share
  // flash black.)
  useEffect(() => {
    const v = ref.current
    if (!v || v.srcObject === stream) return
    v.srcObject = stream
    if (stream) void v.play().catch(() => undefined)
  }, [stream])
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const fit = () => v.videoWidth && onRatio(v.videoHeight / v.videoWidth)
    v.addEventListener('loadedmetadata', fit)
    v.addEventListener('resize', fit)
    return () => {
      v.removeEventListener('loadedmetadata', fit)
      v.removeEventListener('resize', fit)
    }
  }, [onRatio])
  return (
    <div className="shareView">
      {/* my own share is muted here (no echo); theirs plays its audio if it has any */}
      <video ref={ref} autoPlay playsInline muted={!share?.audio} />
      {share && (
        <div className="shareBar">
          <span className="rec" />
          <span>{share.label}</span>
          {share.stopLabel && <button onClick={onStop}>{share.stopLabel}</button>}
        </div>
      )}
    </div>
  )
}

export default SlideStage
