'use client'

import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* Scroll-driven morph (PROTOTYPE) — WebGL / R3F, GL_POINTS.
   Each particle carries a DEPTH (0 far → 1 near) that drives how far it travels
   in, its entry size, its blur (DOF) and a drift — so squares come in on
   separate parallax planes, blur in, and settle into the flag. Bento cards
   travel + recolour fast. Assembled, the flag ripples with fake-3D depth.
   Driven by a scroll ref (0→1), reversible. */

const TEAL = '#00c2b8' // brand accent
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453123; return s - Math.floor(s) }
// Raw sRGB 0..1 (NOT THREE.Color — that converts to linear and renders dark in
// a RawShaderMaterial that writes straight to the sRGB framebuffer).
const srgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]
const TEAL_RGB = srgb(TEAL)

function drawUnionJack(o: CanvasRenderingContext2D, w: number, h: number) {
  o.clearRect(0, 0, w, h)
  o.fillStyle = TEAL; o.fillRect(0, 0, w, h)
  o.strokeStyle = '#ffffff'; o.lineWidth = h * 0.16
  o.beginPath(); o.moveTo(0, 0); o.lineTo(w, h); o.moveTo(w, 0); o.lineTo(0, h); o.stroke()
  o.strokeStyle = TEAL; o.lineWidth = h * 0.05
  o.beginPath(); o.moveTo(0, 0); o.lineTo(w, h); o.moveTo(w, 0); o.lineTo(0, h); o.stroke()
  o.strokeStyle = '#ffffff'; o.lineWidth = h * 0.30
  o.beginPath(); o.moveTo(w / 2, 0); o.lineTo(w / 2, h); o.moveTo(0, h / 2); o.lineTo(w, h / 2); o.stroke()
  o.strokeStyle = TEAL; o.lineWidth = h * 0.17
  o.beginPath(); o.moveTo(w / 2, 0); o.lineTo(w / 2, h); o.moveTo(0, h / 2); o.lineTo(w, h / 2); o.stroke()
}

const VERT = /* glsl */`
  precision highp float;
  attribute vec3 position;
  attribute vec2 aRest;
  attribute vec2 aFlag;
  attribute vec3 aColor;
  attribute vec4 aParams; // restSizePx, threshold, isCard(2), cornerFrac
  attribute vec2 aUV;
  attribute float aDepth;  // 0 far → 1 near
  uniform float uAsm;
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uDotSize;
  uniform vec2 uResolution;
  uniform vec3 uTeal;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vSoft;
  varying float vCorner;
  varying float vAlpha;
  varying float vPS;
  void main() {
    float th = aParams.y;
    float isCard = step(1.5, aParams.z);
    float lp = clamp((uAsm - th) / 0.3, 0.0, 1.0);
    float e = lp * lp * (3.0 - 2.0 * lp); // smoothstep ease

    vec2 center = mix(aRest, aFlag, e);
    // drift on its own plane while still travelling in (parallax life)
    float drift = 1.0 - e;
    center += vec2(sin(uTime * 0.8 + aDepth * 30.0), cos(uTime * 0.7 + aDepth * 21.0)) * 18.0 * aDepth * drift;

    // cloth wave once settled
    float f = clamp(uWaveAmp / 16.0, 0.0, 1.0);
    float waveS = sin(aUV.x * 6.0 + uTime * 2.0) * 0.7 + sin(aUV.y * 3.0 - uTime * 1.2) * 0.3;
    center.y += waveS * uWaveAmp * (0.25 + aUV.x) * e;

    float sizePx = mix(aParams.x, uDotSize, e);
    sizePx *= mix(1.0, 1.0 + 0.24 * waveS, f * e);                 // crests bigger → depth
    float shade = mix(1.0, 0.66 + 0.34 * (waveS * 0.5 + 0.5), f * e);

    vCorner = mix(aParams.w, 0.0, e);
    vColor = mix(aColor, uTeal, clamp(lp * 3.0, 0.0, 1.0)) * shade;
    vSoft = (1.0 - isCard) * smoothstep(0.28, 1.0, aDepth) * (1.0 - e); // blur seed decoupled from size → some big squares stay sharp
    vAlpha = smoothstep(0.0, 0.05, lp);
    vec2 clip = vec2(center.x / uResolution.x * 2.0 - 1.0, 1.0 - center.y / uResolution.y * 2.0);
    gl_Position = vec4(clip, 0.0, 1.0);
    float ps = max(1.0, sizePx * uPixelRatio);
    gl_PointSize = ps;
    vPS = ps;
  }
`

const FRAG = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  varying float vSoft;
  varying float vCorner;
  varying float vAlpha;
  varying float vPS;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    // crisp rounded square (in focus)
    float r = vCorner * 2.0;
    vec2 q = abs(p) - (1.0 - r);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    float aa = clamp(3.0 / vPS, 0.008, 0.2);
    float sq = 1.0 - smoothstep(-aa, aa, d);
    // out-of-focus: a soft gaussian blob (no solid interior → reads as blurred)
    float g = exp(-dot(p, p) * 2.3);
    float blurAmt = clamp(vSoft * 2.2, 0.0, 1.0);
    float alpha = mix(sq, g * 0.8, blurAmt) * vAlpha;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

function Particles({ progressRef, anchor, boost = 1 }: { progressRef: MutableRefObject<number>; anchor: { cx: number; cy: number; w: number; h: number } | null; boost?: number }) {
  const { size } = useThree()
  const matRef = useRef<THREE.RawShaderMaterial | null>(null)

  const points = useMemo(() => {
    const w = size.width, h = size.height // canvas = full stage (particles enter from screen edges)
    const FW = 660, FH = 396
    const off = document.createElement('canvas')
    off.width = FW; off.height = FH
    const o = off.getContext('2d')!
    drawUnionJack(o, FW, FH)
    const px = o.getImageData(0, 0, FW, FH).data

    // Flag is sized + placed to match the bento slot (anchor), but the canvas
    // spans the whole stage so squares stream in from the full screen. `boost`
    // scales the flag up (used on mobile where the bento is narrow).
    const aw = anchor ? anchor.w : w, ah = anchor ? anchor.h : h
    const acx = anchor ? anchor.cx : w / 2
    const scale = boost * Math.min((aw * 0.32) / FW, (ah * 0.52) / FH) // flag size, matched to the bento
    // Flag forms directly below the title (≈44% of the viewport) — the cards
    // morph straight into this spot, so the swap is seamless (no drift).
    const ox = acx - (FW * scale) / 2, oy = h * 0.44 - (FH * scale) / 2
    const step = 12 // fewer squares
    const dot = Math.max(3, scale * step * 0.85)

    const flag: number[] = [], rest: number[] = [], col: number[] = [], par: number[] = [], uvs: number[] = [], dep: number[] = []
    for (let y = 0; y < FH; y += step) {
      for (let x = 0; x < FW; x += step) {
        const n = y * FW + x
        const i = n * 4
        if (px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232) continue
        const fx = ox + (x + step / 2) * scale, fy = oy + (y + step / 2) * scale
        const d = hash(n * 8 + 6)                 // size depth
        const bl = hash(n * 8 + 2)                // blur seed (decoupled from size)
        // ALWAYS enter from a window edge so the centre/flag area stays clear
        // until squares actually settle (no premature flag reveal).
        const margin = 0.08 * Math.max(w, h)
        const side = Math.floor(hash(n * 8 + 7) * 4)
        const t1 = hash(n * 8 + 1)
        const ex = side === 0 ? t1 * w : side === 1 ? w + margin : side === 2 ? t1 * w : -margin
        const ey = side === 0 ? -margin : side === 1 ? t1 * h : side === 2 ? h + margin : t1 * h
        flag.push(fx, fy)
        rest.push(ex, ey)
        col.push(TEAL_RGB[0], TEAL_RGB[1], TEAL_RGB[2])
        // entrySize (wide dynamic range), threshold (delayed + wider spread), dot, corner
        par.push((1.5 + Math.pow(d, 0.7) * 9.0) * dot, hash(n * 8 + 5) * 0.3, 0, 0)
        uvs.push(x / FW, y / FH)
        dep.push(bl) // aDepth now carries the (decoupled) blur seed
      }
    }
    // Card particles: each REAL bento card is built from a grid of squares that
    // EXACTLY cover it (in the card's colour). They're invisible (uCardsVis=0)
    // while the interactive DOM bento is shown, then revealed at the handoff —
    // identical to the DOM card, aligned — and disperse into the flag on the
    // same timeline as the fill. So the cards literally become flag particles.
    // No card particles in the canvas: the flag forms from the edge-fill squares.
    // The 6 DOM bento cards morph (each as ONE element — translate + squish into
    // an even square + recolour) into the flag in V3Client/BentoGridV3.
    const count = flag.length / 2

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aRest', new THREE.BufferAttribute(new Float32Array(rest), 2))
    geo.setAttribute('aFlag', new THREE.BufferAttribute(new Float32Array(flag), 2))
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(col), 3))
    geo.setAttribute('aParams', new THREE.BufferAttribute(new Float32Array(par), 4))
    geo.setAttribute('aUV', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    geo.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(dep), 1))

    const mat = new THREE.RawShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uAsm: { value: 0 },
        uTime: { value: 0 },
        uWaveAmp: { value: 0 },
        uDotSize: { value: dot },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTeal: { value: new THREE.Vector3(TEAL_RGB[0], TEAL_RGB[1], TEAL_RGB[2]) },
        uPixelRatio: { value: 1 },
      },
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    return pts
  }, [size.width, size.height, anchor, boost])

  useEffect(() => {
    matRef.current = points.material as THREE.RawShaderMaterial
    return () => { points.geometry.dispose(); (points.material as THREE.Material).dispose() }
  }, [points])

  useFrame(({ clock, gl }) => {
    const m = matRef.current
    if (!m) return
    const p = progressRef.current
    // linear assembly so the timeline is predictable; wave is keyed off the
    // assembly value (not raw scroll), so it starts right as the flag forms.
    const asm = clamp((p - 0.05) / 0.48)
    m.uniforms.uAsm.value = asm
    m.uniforms.uWaveAmp.value = 16 * clamp((asm - 0.6) / 0.18)
    m.uniforms.uTime.value = clock.elapsedTime
    m.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return <primitive object={points} />
}

type Anchor = { cx: number; cy: number; w: number; h: number }

function FlagMorph({ progressRef, anchorRef, boost = 1 }: { progressRef: MutableRefObject<number>; anchorRef?: RefObject<HTMLElement | null>; boost?: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  // Flag placement comes from the bento slot (anchorRef), measured relative to
  // this full-screen canvas — so the flag forms where the bento is while the
  // particles still fly in from the whole screen.
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  // Only run the render loop while the stage is on-screen AND something is
  // actually moving (mid-morph or the flag is waving). At the very top (progress
  // 0) or once scrolled past, the loop freezes — no idle GPU/CPU burn.
  const [active, setActive] = useState(true)

  useEffect(() => {
    const measure = () => {
      const host = hostRef.current, a = anchorRef?.current
      if (!host) return
      const hr = host.getBoundingClientRect()
      if (!a) { setAnchor(null); return }
      const ar = a.getBoundingClientRect()
      const next: Anchor = { cx: ar.left - hr.left + ar.width / 2, cy: ar.top - hr.top + ar.height / 2, w: ar.width, h: ar.height }
      setAnchor(prev => (prev && prev.cx === next.cx && prev.cy === next.cy && prev.w === next.w && prev.h === next.h ? prev : next))
    }
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    if (anchorRef?.current) ro.observe(anchorRef.current)
    if (hostRef.current) ro.observe(hostRef.current)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); ro.disconnect() }
  }, [anchorRef])

  useEffect(() => {
    const el = hostRef.current
    let visible = true
    const evaluate = () => {
      const a = visible && progressRef.current > 0.002
      setActive(prev => (prev === a ? prev : a))
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; evaluate() }, { threshold: 0 })
    if (el) io.observe(el)
    const onScroll = () => evaluate()
    window.addEventListener('scroll', onScroll, { passive: true })
    evaluate()
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [progressRef])

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas aria-hidden="true" frameloop={active ? 'always' : 'never'} gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }} dpr={[1, 1.5]} style={{ width: '100%', height: '100%', display: 'block' }}>
        <Particles progressRef={progressRef} anchor={anchor} boost={boost} />
      </Canvas>
    </div>
  )
}

// progressRef is a stable ref, so this never needs to re-render when the parent
// updates scroll state — keeps the WebGL subtree from reconciling every frame.
export default memo(FlagMorph)
