'use client'

import { useEffect, useRef } from 'react'
import { orbColor, orbSwatch } from '@/lib/ai-tutor/orb-colors'
import { FACES, type AvatarMood, type Face, type FaceSpec } from '@/lib/ai-tutor/avatar-mood'

/**
 * The AI tutor's avatar: a glass pebble in the student's two-tone colour, with a kaomoji face
 * (design: mockups/ai-avatar-faces.html). The face sits on the pebble's curve; when the head turns
 * (some expressions, listening, looking at the slide), the pebble turns with it. The eyes look around
 * on their own, the mouth moves with the voice, and it blinks.
 *
 * Every avatar on the page is drawn by ONE shared WebGL context (the body) and copied into its own 2D
 * canvas, where the face is drawn as vector strokes (browsers allow only ~16 WebGL contexts per page).
 * `level` (0..1, e.g. the AI tutor's voice level) and `mood` (expression, listening, slide) are refs read
 * every frame. Reduced motion: drawn once, calm. No WebGL: a CSS pebble with the same face.
 */

type Ref<T> = { current: T }
type Pose = { yaw: number; pitch: number; roll: number; gx: number; gy: number }
type Entry = {
  el: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  pal: { light: number[]; deep: number[]; accent: number[] }
  level?: Ref<number>
  mood?: Ref<AvatarMood>
  blush: boolean
  seed: number
  size: number
  smooth: number
  clock: number
  h: Pose
  glance: { until: number; next: number; x: number; y: number }
  blinkAt: number
  active: number
  gl: boolean
}

const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p;gl_Position=vec4(p,0.,1.);}'
const FS = `precision highp float;varying vec2 uv;uniform float t;uniform float lv;uniform float res;uniform vec3 ca;uniform vec3 cb;uniform vec3 cc;
uniform float amt;uniform float yaw;uniform float pitch;uniform float roll;
vec3 m3(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 pm(vec4 x){return m4(((x*34.)+1.)*x);}vec4 ti(vec4 r){return 1.79284291400159-.85373472095314*r;}
float sn(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=m3(i);vec4 p=pm(pm(pm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 nm=ti(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float soft(vec3 p){return sn(p)*.75+sn(p*1.7+3.1)*.25;}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
// the pebble: a slightly flat, lumpy 3D stone; its outline is where the turned stone meets the screen plane
float sdf(vec2 p){
  float cr=cos(roll),sr=sin(roll);p=mat2(cr,sr,-sr,cr)*p;
  float a=atan(p.y,p.x),r=length(p);
  vec3 d=vec3(cos(a),sin(a),0.);float cp=cos(pitch),sp=sin(pitch),cy=cos(yaw),sy=sin(yaw);
  d=vec3(d.x,d.y*cp-d.z*sp,d.y*sp+d.z*cp);d=vec3(d.x*cy-d.z*sy,d.y,d.x*sy+d.z*cy);
  float e=1./sqrt(d.x*d.x+d.y*d.y/.86+d.z*d.z/.5);
  float l=.05*sin(2.*atan(d.y,d.x)+.6)*(1.-d.z*d.z)+.035*sin(3.*atan(d.y,d.x)+1.)+.06*d.x*d.z-.04*d.y*d.z;
  return r-(.84*e+l+lv*.03*sin(4.*a+t*3.));
}
float height(vec2 p){float d=sdf(p);float e=clamp(-d/.55,0.,1.);return sqrt(1.-(1.-e)*(1.-e));}
void main(){
  float d=sdf(uv);float aa=2.5/res;float mask=1.-smoothstep(-aa,aa,d);
  if(mask<=0.){gl_FragColor=vec4(0.);return;}
  float e=.004;float h=height(uv);
  vec3 n=normalize(vec3((height(uv-vec2(e,0.))-height(uv+vec2(e,0.)))/(2.*e)*.55,(height(uv-vec2(0.,e))-height(uv+vec2(0.,e)))/(2.*e)*.55,1.));
  n=normalize(mix(vec3(0.,0.,1.),n,.9));
  float edge=1.-clamp(h,0.,1.);
  vec3 q=ry(t*.18-yaw*1.2)*rx(.35+.15*sin(t*.2)+pitch*1.2)*vec3(uv*.95,h);
  vec3 inner=mix(ca,cb,smoothstep(-.9,.9,-uv.y+.3*soft(q*.7+t*.05)));
  float blob=smoothstep(-.05-amt,.75-amt,soft(q*.42+vec3(3.1,t*.06,1.7))+.1*sn(q*.8-t*.04));
  inner=mix(inner,cc,blob*.85);
  float caustic=pow(max(0.,soft(q*1.2+vec3(0.,t*.2,0.))),2.)*(.35+lv*.9);
  vec3 col=inner+caustic*vec3(1.,1.,.96);
  float rim=smoothstep(.55,1.,edge);col=mix(col,vec3(.95,1.,.98),rim*(.5+lv*.25));
  col+=pow(max(0.,dot(n,normalize(vec3(-.45,.6,.65)))),30.)*.7;
  col+=pow(max(0.,dot(n,normalize(vec3(.5,-.55,.4)))),8.)*.12;
  gl_FragColor=vec4(min(col,1.)*mask,mask);
}`

const MAX = 512
const AMOUNT = 0.22
const INK = '#2c2b30'
const BLUSH = 'rgba(236,150,166,.6)'
/** the face's resting centre on the pebble, as a share of the avatar's size (a little left of centre) */
const FACE_X = -0.035
const FACE_Y = 0.02
const SPHERE = 44

const entries = new Set<Entry>()
let gl: WebGLRenderingContext | null = null
let glc: HTMLCanvasElement | null = null
type U = Record<'t' | 'lv' | 'res' | 'ca' | 'cb' | 'cc' | 'amt' | 'yaw' | 'pitch' | 'roll', WebGLUniformLocation | null>
let u: U | null = null
let failed = false
let raf = 0
let last = 0

// default size: fill the parent's width (zero specificity, so any class can override it)
let styled = false
function addBaseStyle() {
  if (styled || typeof document === 'undefined') return
  styled = true
  const st = document.createElement('style')
  st.textContent = ':where(canvas[data-avatar]){width:100%;height:auto}'
  document.head.appendChild(st)
}

function setup(): boolean {
  if (gl) return true
  if (failed || typeof document === 'undefined') return false
  glc = document.createElement('canvas')
  glc.width = glc.height = MAX
  gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true })
  if (!gl) {
    failed = true
    return false
  }
  const sh = (type: number, src: string) => {
    const s = gl!.createShader(type)!
    gl!.shaderSource(s, src)
    gl!.compileShader(s)
    return s
  }
  const pr = gl.createProgram()!
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
    failed = true
    gl = null
    return false
  }
  gl.useProgram(pr)
  const b = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, b)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(pr, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const names = ['t', 'lv', 'res', 'ca', 'cb', 'cc', 'amt', 'yaw', 'pitch', 'roll'] as const
  u = Object.fromEntries(names.map((n) => [n, gl!.getUniformLocation(pr, n)])) as U
  gl.clearColor(0, 0, 0, 0)
  return true
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- the face: features placed on a sphere that turns with the head ---------- */

function proj(x: number, y: number, h: Pose): [number, number] {
  const z = Math.sqrt(Math.max(1, SPHERE * SPHERE - x * x - y * y))
  const x1 = x * Math.cos(h.yaw) + z * Math.sin(h.yaw)
  const z1 = -x * Math.sin(h.yaw) + z * Math.cos(h.yaw)
  return [x1, y * Math.cos(h.pitch) - z1 * Math.sin(h.pitch)]
}
/** draw a feature in its own coordinates at (x, y), stretched like the sphere is at that point */
function at(c: CanvasRenderingContext2D, x: number, y: number, h: Pose, draw: () => void) {
  const e = 0.5
  const P = proj(x, y, h)
  const X = proj(x + e, y, h)
  const Y = proj(x, y + e, h)
  c.save()
  c.transform((X[0] - P[0]) / e, (X[1] - P[1]) / e, (Y[0] - P[0]) / e, (Y[1] - P[1]) / e, P[0], P[1])
  draw()
  c.restore()
}

function eye(c: CanvasRenderingContext2D, t: FaceSpec['eyes'][number], blink: boolean) {
  c.beginPath()
  if (blink && (t === 'dot' || t === 'ring')) {
    c.moveTo(-3.5, 0)
    c.lineTo(3.5, 0)
    c.stroke()
    return
  }
  switch (t) {
    case 'dot':
      c.arc(0, 0, 2.9, 0, 7)
      c.fill()
      return
    case 'caret':
      c.moveTo(-4.5, 2.5)
      c.lineTo(0, -2.5)
      c.lineTo(4.5, 2.5)
      break
    case 'chevL':
      c.moveTo(-4, -3.5)
      c.lineTo(3.5, 0)
      c.lineTo(-4, 3.5)
      break
    case 'chevR':
      c.moveTo(4, -3.5)
      c.lineTo(-3.5, 0)
      c.lineTo(4, 3.5)
      break
    case 'line':
      c.moveTo(-4, 0)
      c.lineTo(4, 0)
      break
    case 'bar':
      c.moveTo(-5, -1.5)
      c.lineTo(5, -1.5)
      break
    case 'ring':
      c.lineWidth = 2.2
      c.arc(0, -1, 3.2, 0, 7)
      c.stroke()
      c.lineWidth = 2.6
      return
  }
  c.stroke()
}

function mouth(c: CanvasRenderingContext2D, t: FaceSpec['mouth']) {
  c.beginPath()
  switch (t) {
    case 'w': // a round ω, like a sideways 3
      c.arc(-2.5, 0, 2.5, Math.PI, 0, true)
      c.arc(2.5, 0, 2.5, Math.PI, 0, true)
      break
    case 'tri':
      c.moveTo(-4.5, -1)
      c.lineTo(4.5, -1)
      c.lineTo(0, 5)
      c.closePath()
      break
    case 'triF':
      c.moveTo(-5, -1)
      c.lineTo(5, -1)
      c.lineTo(0, 6)
      c.closePath()
      c.fill()
      break
    case 'o':
      c.ellipse(0, 1.5, 2.4, 2.8, 0, 0, 7)
      break
    case 'O':
      c.ellipse(0, 2, 3.4, 4.2, 0, 0, 7)
      break
    case 'line':
      c.moveTo(-3.5, 1.5)
      c.lineTo(3.5, 1.5)
      break
    case 'under':
      c.moveTo(-3.5, 3.5)
      c.lineTo(3.5, 3.5)
      break
    case 'wave':
      c.moveTo(-5, 1.5)
      c.quadraticCurveTo(-2.5, -1, 0, 1.5)
      c.quadraticCurveTo(2.5, 4, 5, 1.5)
      break
    case 'eps':
      c.moveTo(2, -1)
      c.quadraticCurveTo(-3.5, -1, -1, 1.8)
      c.quadraticCurveTo(-3.5, 4.6, 2, 4.6)
      break
  }
  c.stroke()
}

function extra(c: CanvasRenderingContext2D, x: FaceSpec['extra'], h: Pose, real: number) {
  if (!x) return
  const P = proj(27, -17, { ...h, yaw: h.yaw * 0.6, pitch: h.pitch * 0.6 })
  const bob = Math.sin(real * 3) * 0.6
  c.save()
  c.translate(P[0], P[1] + bob)
  if (x === 'drop') {
    c.fillStyle = 'rgba(96,160,235,.95)'
    c.beginPath()
    c.moveTo(0, -5)
    c.bezierCurveTo(4, 0, 4, 4, 0, 4)
    c.bezierCurveTo(-4, 4, -4, 0, 0, -5)
    c.fill()
  } else {
    c.fillStyle = INK
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = '700 13px system-ui,sans-serif'
    c.fillText(x, 2, -2)
  }
  c.restore()
}

function drawFace(e: Entry, f: FaceSpec, open: boolean, blink: boolean, real: number) {
  const c = e.ctx
  const S = e.size
  const h = e.h
  c.save()
  c.translate(S / 2 + FACE_X * S, S / 2 + FACE_Y * S)
  c.rotate((h.roll * Math.PI) / 180)
  c.scale(S / 100, S / 100)
  c.strokeStyle = c.fillStyle = INK
  c.lineWidth = 2.6
  c.lineCap = 'round'
  c.lineJoin = 'round'
  if (e.blush) {
    c.fillStyle = BLUSH
    for (const s of [-1, 1])
      at(c, s * 21, 5, h, () => {
        c.beginPath()
        c.ellipse(0, 0, 5.4, 3.5, 0, 0, 7)
        c.fill()
      })
    c.fillStyle = INK
  }
  at(c, -12 + h.gx, -3 + h.gy, h, () => eye(c, f.eyes[0], blink))
  at(c, 12 + h.gx, -3 + h.gy, h, () => eye(c, f.eyes[1], blink))
  at(c, 0, 5, h, () => mouth(c, open ? f.open : f.mouth))
  extra(c, f.extra, h, real)
  c.restore()
}

/* ---------- per frame ---------- */

function update(e: Entry, now: number) {
  const real = now / 1000
  const target = Math.min(1, Math.max(0, e.level?.current ?? 0))
  e.smooth += (target - e.smooth) * (target > e.smooth ? 0.25 : 0.12)
  const talking = e.smooth > 0.08
  const m = e.mood?.current
  let id: Face = 'calm'
  if (m && now < m.until) id = m.face
  else if (m?.listening) id = 'listen'
  if (talking || id !== 'calm') e.active = now
  else if (m && now - e.active > 15_000) id = 'waiting'
  const f = FACES[id]
  const slide = !!m && now < m.slideUntil
  // head: still at rest; turns only for some expressions, the slide, listening nods and talking
  let yaw = f.pose?.[0] ?? 0
  let pitch = f.pose?.[1] ?? 0
  if (slide) {
    yaw = 0.26
    pitch = 0.03
  }
  if (talking) pitch += e.smooth * 0.05 * Math.sin(real * 6.3)
  if (id === 'listen') pitch -= Math.max(0, Math.sin(real * 2.2)) ** 6 * 0.12
  // eyes: their own gaze, plus a quick glance now and then while calm
  let gaze = f.gaze ?? [0, 0]
  if (slide) gaze = [3.6, -0.6]
  else if (id === 'calm' && !talking) {
    const g = e.glance
    if (real > g.next) {
      const a = Math.random() * 6.28
      g.x = Math.cos(a) * 2.6
      g.y = Math.sin(a) * 1.6
      g.until = real + 0.7 + Math.random() * 0.8
      g.next = g.until + 2.5 + Math.random() * 3.5
    }
    if (real < g.until) gaze = [g.x, g.y]
  }
  const h = e.h
  h.yaw += (yaw - h.yaw) * 0.1
  h.pitch += (pitch - h.pitch) * 0.1
  h.roll += ((f.roll ?? 0) - h.roll) * 0.12
  h.gx += (gaze[0] - h.gx) * 0.3
  h.gy += (gaze[1] - h.gy) * 0.3
  // a blink every few seconds (not when the eyes are already closed shapes)
  if (real > e.blinkAt + 0.16) e.blinkAt = real + 2.8 + Math.random() * 2.4
  const blink = real > e.blinkAt && real < e.blinkAt + 0.16
  return { f, open: talking && e.smooth > 0.45, blink, real }
}

function draw(e: Entry, now: number) {
  if (!e.size) return
  const { f, open, blink, real } = update(e, now)
  e.ctx.clearRect(0, 0, e.size, e.size)
  if (e.gl && gl && glc && u) {
    gl.viewport(0, 0, e.size, e.size)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(u.t, e.clock + e.seed)
    gl.uniform1f(u.lv, e.smooth)
    gl.uniform1f(u.res, e.size)
    gl.uniform3fv(u.ca, e.pal.light)
    gl.uniform3fv(u.cb, e.pal.deep)
    gl.uniform3fv(u.cc, e.pal.accent)
    gl.uniform1f(u.amt, AMOUNT)
    gl.uniform1f(u.yaw, e.h.yaw)
    gl.uniform1f(u.pitch, e.h.pitch)
    gl.uniform1f(u.roll, (e.h.roll * Math.PI) / 180)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    e.ctx.drawImage(glc, 0, glc.height - e.size, e.size, e.size, 0, 0, e.size, e.size)
  }
  drawFace(e, f, open, blink, real)
}

function tick(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
  last = now
  for (const e of entries) {
    // the glass's inner light drifts faster while speaking (up to 2.6x), never jumps
    e.clock += dt * (1 + e.smooth * 1.6)
    e.el.style.transform = e.smooth > 0.01 ? `scale(${1 + e.smooth * 0.03})` : ''
    draw(e, now)
  }
  raf = entries.size ? requestAnimationFrame(tick) : 0
  if (!raf) last = 0
}

function start() {
  if (!raf && !reducedMotion()) raf = requestAnimationFrame(tick)
}

export default function AiAvatar({
  color,
  level,
  mood,
  blush = true,
  className,
  title,
}: {
  /** palette id from ORB_COLORS (default Sea glass) */
  color?: string | null
  /** 0..1, e.g. the AI tutor's voice level; read every frame */
  level?: Ref<number>
  /** expression, listening and slide cues from the classroom; read every frame */
  mood?: Ref<AvatarMood>
  /** rosy cheeks (AI tutor settings) */
  blush?: boolean
  className?: string
  title?: string
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const entry = useRef<Entry | null>(null)
  const pal = orbColor(color)

  // register with the shared renderer; size the canvas to its box
  useEffect(() => {
    const el = ref.current
    if (!el) return
    addBaseStyle()
    const ctx = el.getContext('2d')
    if (!ctx) return
    const hasGl = setup()
    if (!hasGl) {
      // no WebGL: a flat pebble behind the face
      el.style.background = orbSwatch(pal)
      el.style.borderRadius = '52% 48% 50% 50% / 50% 52% 48% 50%'
    }
    const e: Entry = {
      el,
      ctx,
      pal: { light: [...pal.light], deep: [...pal.deep], accent: [...pal.accent] },
      level,
      mood,
      blush,
      seed: Math.random() * 50,
      size: 0,
      smooth: 0,
      clock: 0,
      h: { yaw: 0, pitch: 0, roll: 0, gx: 0, gy: 0 },
      glance: { until: 0, next: 2 + Math.random() * 3, x: 0, y: 0 },
      blinkAt: 1 + Math.random() * 3,
      active: performance.now(),
      gl: hasGl,
    }
    entry.current = e
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const size = Math.max(8, Math.min(MAX, Math.round(el.clientWidth * dpr)))
      if (size !== e.size) {
        e.size = el.width = el.height = size
        draw(e, performance.now())
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    entries.add(e)
    start()
    return () => {
      ro.disconnect()
      entries.delete(e)
      entry.current = null
    }
    // colour, level, mood and blush are applied below without re-registering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const e = entry.current
    if (!e) return
    e.pal = { light: [...pal.light], deep: [...pal.deep], accent: [...pal.accent] }
    e.level = level
    e.mood = mood
    e.blush = blush
    if (!e.gl) e.el.style.background = orbSwatch(pal)
    draw(e, performance.now())
  }, [pal, level, mood, blush])

  return (
    <canvas
      ref={ref}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', aspectRatio: '1', transition: 'transform .12s linear' }}
      data-avatar=""
    />
  )
}
