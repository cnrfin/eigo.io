'use client'

import { useEffect, useRef } from 'react'
// WebGL2 build (Rive Renderer) draws the rig properly (feathered shading, the
// pupil "bite" without a seam), so it's used wherever WebGL2 works. Where it
// doesn't, or where it crashes the GPU (Chrome 158+ on Intel Macs), the canvas
// build draws a slightly rougher version instead of nothing (lib/riveRenderer).
import * as RiveGL from '@rive-app/react-webgl2'
import * as RiveCanvas from '@rive-app/react-canvas'
import { useWebGL2 } from '@/lib/riveRenderer'

const SM = 'State Machine 1'

// direction input mapping (from the rig): 0 = right, 1 = down, 2 = left, 3 = up
export type Dir = 0 | 1 | 2 | 3

/**
 * Course-map mascot. Driven by the rig's state-machine inputs:
 *   isMoving (bool) → walk cycle, direction (number) → which way she faces,
 *   notice (bool)   → a short alert/bounce when she arrives.
 * Purely presentational; the parent decides where she stands and when she walks.
 * `src` picks the character rig (teri / earl / …); all share the same rig
 * interface (State Machine 1 + isMoving/direction/notice), so they're drop-in.
 */
type Props = { size?: number; src?: string; moving: boolean; direction: Dir; notice: boolean; onReady?: () => void }

export default function CourseMascot(props: Props) {
  const gl = useWebGL2()
  if (gl === null) return <div style={{ width: props.size ?? 64, height: props.size ?? 64 }} />
  return gl ? <MascotGL {...props} /> : <MascotCanvas {...props} />
}

// both packages export the same API; typed against one so TypeScript doesn't mix their classes
function makeMascot(R: typeof RiveCanvas) {
  const { useRive, Layout, Fit, Alignment } = R
  return function Mascot({
    size = 64, src = '/rive/teri.riv', moving, direction, notice, onReady,
  }: Props) {
  const { rive, RiveComponent } = useRive({
    src, stateMachines: SM, autoplay: true,
    // Contain + centre so the whole artboard fits (no cropping).
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  }, {
    // Disable the built-in IntersectionObserver. Its first post-mount callback
    // is async and racy: if it reports "not intersecting" just as a walk starts,
    // useRive calls stopRendering() and the walk silently doesn't play — the
    // real cause of the intermittent ~1-in-8 misses. The mascot is one tiny,
    // always-on-screen canvas, so keeping its render loop always live is free.
    shouldUseIntersectionObserver: false,
  })

  // Read the inputs straight off the live rive instance every time we set them.
  // `useStateMachineInput` caches an input object that can go stale or null
  // across React 19 / StrictMode re-mounts, which silently swallows writes;
  // re-querying the running state machine is what actually drives the rig.
  const input = (name: string) =>
    rive?.stateMachineInputs(SM)?.find(i => i.name === name) ?? null

  // Latest prop values, read by the persistent rAF below without restarting it.
  const movingRef = useRef(moving)
  const directionRef = useRef(direction)
  useEffect(() => { movingRef.current = moving; directionRef.current = direction }, [moving, direction])

  // Tell the parent once the rig is loaded so it can start a queued walk only
  // when the inputs actually exist (an earlier walk would be silently dropped).
  useEffect(() => { if (rive) onReady?.() }, [rive, onReady])

  // Wake the runtime when a walk starts. The Rive render loop stops advancing
  // once the state machine settles into Idle (internal to the runtime). Setting
  // isMoving=true on a settled runtime is registered but not *processed* until
  // the loop resumes, which is the "cold start / a few clicks to warm up" lag.
  // play() resumes the loop so the idle→walk transition fires immediately.
  useEffect(() => {
    if (rive && moving) { try { rive.play() } catch { /* noop */ } }
  }, [moving, rive])

  // Keep the rig WARM. The intermittent misses came from the state machine
  // settling while idle: once it goes cold the runtime stops advancing, so the
  // first isMoving write after idle is racy and the walk silently drops. One
  // persistent rAF re-asserts both inputs every frame — always, not just while
  // moving — so the SM never settles and an idle→walk transition fires on the
  // very next frame. A single 124px canvas at 60fps is negligible.
  useEffect(() => {
    if (!rive) return
    let raf = 0
    const tick = () => {
      const im = input('isMoving'); if (im) im.value = movingRef.current
      const di = input('direction'); if (di) di.value = directionRef.current
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [rive]) // eslint-disable-line react-hooks/exhaustive-deps

  // notice (arrival bounce): mirror the prop directly so it is reliably set
  // BACK to false. The parent pulses it true on arrival and false when it ends
  // or when a new walk starts; the rig's notice layer only exits on false, so a
  // stuck-true notice would block the next walk animation.
  useEffect(() => {
    const i = input('notice')
    if (i) i.value = notice
  }, [notice, rive]) // eslint-disable-line react-hooks/exhaustive-deps

  return <RiveComponent style={{ width: size, height: size }} />
  }
}

const MascotGL = makeMascot(RiveGL as unknown as typeof RiveCanvas)
const MascotCanvas = makeMascot(RiveCanvas)
