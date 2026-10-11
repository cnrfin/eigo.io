'use client'

import { useEffect, useRef } from 'react'
import { orbColor } from '@/lib/ai-tutor/orb-colors'

/**
 * The AI tutor's avatar: a glass ball with a soft gradient inside, a bright rim and
 * light that drifts across it (design: mockups/ai-orb-shaders.html, "Glass").
 *
 * Every orb on the page is drawn by ONE shared WebGL context and copied into its own
 * 2D canvas (browsers allow only ~16 WebGL contexts per page). Pass `level` (a ref the
 * caller keeps at 0..1, e.g. the AI tutor's voice level) to make it react while it talks.
 * Reduced motion: drawn once, no animation. No WebGL: a CSS gradient stands in.
 */

type Level = { current: number }
type Entry = { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D; light: number[]; deep: number[]; level?: Level; seed: number; size: number; smooth: number; clock: number }

const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p;gl_Position=vec4(p,0.,1.);}'
const FS = `precision highp float;varying vec2 uv;uniform float t;uniform float lv;uniform float res;uniform vec3 ca;uniform vec3 cb;
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
void main(){float r=length(uv);float mask=1.-smoothstep(1.-2./res,1.,r);if(mask<=0.){gl_FragColor=vec4(0.);return;}
vec3 n=vec3(uv,sqrt(max(0.,1.-r*r)));float edge=1.-n.z;vec3 q=ry(t*.18)*rx(.35+.15*sin(t*.2))*n;
vec3 inner=mix(ca,cb,smoothstep(-.9,.9,-n.y+.3*soft(q*.7+t*.05)));
float caustic=pow(max(0.,soft(q*1.2+vec3(0.,t*.2,0.))),2.)*(.35+lv*.9);
vec3 col=inner+caustic*vec3(1.,1.,.96);
float rim=smoothstep(.6,1.,edge);col=mix(col,vec3(.95,1.,.98),rim*(.5+lv*.25));
col+=pow(max(0.,dot(n,normalize(vec3(-.45,.6,.65)))),30.)*.7;
col+=pow(max(0.,dot(n,normalize(vec3(.5,-.55,.4)))),8.)*.12;
gl_FragColor=vec4(min(col,1.)*mask,mask);}`

const MAX = 512
const entries = new Set<Entry>()
let gl: WebGLRenderingContext | null = null
let glc: HTMLCanvasElement | null = null
let u: { t: WebGLUniformLocation | null; lv: WebGLUniformLocation | null; res: WebGLUniformLocation | null; ca: WebGLUniformLocation | null; cb: WebGLUniformLocation | null } | null = null
let failed = false
let raf = 0
let last = 0

// default size: fill the parent's width (zero specificity, so any class can override it)
let styled = false
function addBaseStyle() {
  if (styled || typeof document === 'undefined') return
  styled = true
  const st = document.createElement('style')
  st.textContent = ':where(canvas[data-orb]){width:100%;height:auto}'
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
  u = { t: gl.getUniformLocation(pr, 't'), lv: gl.getUniformLocation(pr, 'lv'), res: gl.getUniformLocation(pr, 'res'), ca: gl.getUniformLocation(pr, 'ca'), cb: gl.getUniformLocation(pr, 'cb') }
  gl.clearColor(0, 0, 0, 0)
  return true
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function draw(e: Entry) {
  if (!gl || !glc || !u || !e.size) return
  gl.viewport(0, 0, e.size, e.size)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniform1f(u.t, e.clock + e.seed)
  gl.uniform1f(u.lv, e.smooth)
  gl.uniform1f(u.res, e.size)
  gl.uniform3fv(u.ca, e.light)
  gl.uniform3fv(u.cb, e.deep)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  e.ctx.clearRect(0, 0, e.size, e.size)
  e.ctx.drawImage(glc, 0, glc.height - e.size, e.size, e.size, 0, 0, e.size, e.size)
}

function tick(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
  last = now
  for (const e of entries) {
    const target = Math.min(1, Math.max(0, e.level?.current ?? 0))
    e.smooth += (target - e.smooth) * (target > e.smooth ? 0.12 : 0.05)
    // the pattern's clock runs faster while speaking (up to 2.6x), never jumps
    e.clock += dt * (1 + e.smooth * 1.6)
    e.el.style.transform = e.smooth > 0.01 ? `scale(${1 + e.smooth * 0.05})` : ''
    draw(e)
  }
  raf = entries.size ? requestAnimationFrame(tick) : 0
  if (!raf) last = 0
}

function start() {
  if (!raf && !reducedMotion()) raf = requestAnimationFrame(tick)
}

export default function AiOrb({
  color,
  level,
  className,
  title,
}: {
  /** palette id from ORB_COLORS (default sage) */
  color?: string | null
  /** 0..1, e.g. the AI tutor's voice level; read every frame */
  level?: Level
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
    if (!ctx || !setup()) {
      el.dataset.fallback = '1'
      return
    }
    const e: Entry = { el, ctx, light: [...pal.light], deep: [...pal.deep], level, seed: Math.random() * 50, size: 0, smooth: 0, clock: 0 }
    entry.current = e
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const size = Math.max(8, Math.min(MAX, Math.round(el.clientWidth * dpr)))
      if (size !== e.size) {
        e.size = el.width = el.height = size
        draw(e)
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
    // colour and level are applied below without re-registering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const e = entry.current
    if (!e) return
    e.light = [...pal.light]
    e.deep = [...pal.deep]
    e.level = level
    draw(e)
  }, [pal, level])

  const [lr, lg, lb] = pal.light.map((v) => Math.round(v * 255))
  const [dr, dg, db] = pal.deep.map((v) => Math.round(v * 255))
  return (
    <canvas
      ref={ref}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{
        display: 'block',
        aspectRatio: '1',
        borderRadius: '50%',
        transition: 'transform .12s linear',
        // shown only if WebGL is unavailable (canvas stays transparent otherwise)
        background: `radial-gradient(circle at 38% 30%, #fff 0, rgb(${lr},${lg},${lb}) 30%, rgb(${dr},${dg},${db}) 100%)`,
      }}
      data-orb=""
    />
  )
}
