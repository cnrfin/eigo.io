import type { Face } from './avatar-mood'

/**
 * The "calling…" animation at the start of an AI lesson (design: mockups/ai-avatar-connecting.html).
 * One of three plays at random (never the same one twice in a row; the welcome call always gets
 * "merge"). Each has a waiting loop, a reveal when the call connects, and an ending for when it fails.
 *
 * - merge: three glass dots bounce like "…"; on connect they melt into the pebble and the face swings round
 * - ring:  the pebble dozes and shakes like a ringing phone, with ripples; on connect it wakes with a hop
 * - peek:  turned away, it peeks round now and then; on connect it spins to face you
 *
 * AiRoom owns the state (a ref); AiAvatar reads introPose() every frame.
 * Testing: add ?intro=merge|ring|peek to the classroom URL to force one.
 */

export type IntroKind = 'merge' | 'ring' | 'peek'
export const INTROS: IntroKind[] = ['merge', 'ring', 'peek']

export type AvatarIntro = {
  kind: IntroKind
  phase: 'wait' | 'live' | 'failed'
  /** performance.now() when the phase started */
  t0: number
  /** seconds spent waiting, kept when the phase changes */
  wEnd: number
  /** peek: the head's turn when the call connected or failed */
  y0: number
  r0: number
}

/** how long the reveal takes: the calling screen stays up at least this long after connecting */
export const INTRO_REVEAL_MS = 1100
/** how long the "couldn't connect" ending plays before the calling screen fades */
export const INTRO_FAIL_MS = 700

export const newIntro = (kind: IntroKind, now: number): AvatarIntro => ({ kind, phase: 'wait', t0: now, wEnd: 0, y0: 2.55, r0: 0 })

function leave(i: AvatarIntro, phase: 'live' | 'failed', now: number) {
  if (i.phase !== 'wait') return
  i.wEnd = (now - i.t0) / 1000
  i.phase = phase
  i.t0 = now
}
export const introLive = (i: AvatarIntro, now: number) => leave(i, 'live', now)
export const introFailed = (i: AvatarIntro, now: number) => leave(i, 'failed', now)

const LAST = 'eigo:aiIntro'
/** Which intro to play: forced by ?intro=, "merge" for the welcome call, else random but not the last one. */
export function pickIntro(welcome: boolean): IntroKind {
  let forced: string | null = null
  let last: string | null = null
  try {
    forced = new URLSearchParams(location.search).get('intro')
    last = localStorage.getItem(LAST)
  } catch {
    /* no window / storage: random */
  }
  let kind: IntroKind
  if (forced && (INTROS as string[]).includes(forced)) kind = forced as IntroKind
  else if (welcome) kind = 'merge'
  else {
    const pool = INTROS.filter((k) => k !== last)
    kind = pool[Math.floor(Math.random() * pool.length)]
  }
  try {
    localStorage.setItem(LAST, kind)
  } catch {
    /* ignore */
  }
  return kind
}

/** What the intro does to the avatar this frame. Sizes are shares of the avatar's normal body size. */
export type IntroPose = {
  /** merge: the three dots (x, y, radius in the body's -1..1 space), how much they melt together, and body vs dots (0..1) */
  dots: [number, number, number][]
  k: number
  m: number
  /** how deep the glass looks: small for the dots, 0.55 for the pebble */
  hs: number
  yaw: number
  pitch: number
  /** degrees */
  roll: number
  /** squash and stretch (x, y) */
  st: [number, number]
  zoom: number
  /** + = down */
  offY: number
  face: Face | null
  gaze: [number, number] | null
  /** 0 hides the face */
  faceA: number
  /** ripples behind the body: radius, opacity */
  rings: [number, number][]
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => {
  x = clamp(x)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3)
const bump = (x: number, a: number, b: number, r: number) => (x < a || x > b ? 0 : Math.min(ease((x - a) / r), ease((b - x) / r)))
const NO_DOTS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
]
// the mockup draws the finished pebble at 82% of its canvas; here 1 = the avatar's normal size
const Z = 1 / 0.82

const base = (): IntroPose => ({
  dots: NO_DOTS,
  k: 0.05,
  m: 1,
  hs: 0.55,
  yaw: 0,
  pitch: 0,
  roll: 0,
  st: [1, 1],
  zoom: 1,
  offY: 0,
  face: null,
  gaze: null,
  faceA: 1,
  rings: [],
})

function mergeWait(w: number, P: IntroPose) {
  P.m = 0
  P.faceA = 0
  P.yaw = -2.4
  P.hs = 0.13
  P.dots = [0, 1, 2].map((i) => {
    let b = Math.max(0, Math.sin(w * 5.7 - i * 0.9))
    b *= b
    return [(i - 1) * 0.36, 0.13 * b, 0.12 + 0.012 * b] as [number, number, number]
  })
}

function ringWait(w: number, P: IntroPose, still = false) {
  P.zoom = 0.6 * Z
  P.face = 'waiting'
  P.pitch = -0.14
  P.gaze = [-1.5, 2]
  const cyc = w % 1.8
  const shake = !still && cyc < 0.55 ? Math.sin((Math.PI * cyc) / 0.55) : 0
  P.roll = 8 * Math.sin(w * 42) * shake
  P.yaw = 0.06 * Math.sin(w * 42) * shake
  for (const j of [0, 0.22]) {
    const a = cyc - j
    if (a >= 0 && a < 1.3) P.rings.push([(0.25 + 0.24 * easeOut(a / 1.3)) * Z, 0.45 * (1 - a / 1.3)])
  }
}

function peekWait(w: number, P: IntroPose, i: AvatarIntro) {
  const pk = bump(w % 3.2, 1.1, 2.3, 0.35)
  P.yaw = 2.55 - 1.4 * pk + 0.1 * Math.sin(w * 1.4)
  P.pitch = 0.04 * Math.sin(w * 1.1)
  P.roll = 3 * Math.sin(w * 1.4)
  P.gaze = [-3.4 * pk, 0.6 * pk]
  i.y0 = P.yaw
  i.r0 = P.roll
}

/** The pose for this frame, or null once the reveal is over (the avatar is back to normal). */
export function introPose(i: AvatarIntro, now: number): IntroPose | null {
  const s = Math.max(0, (now - i.t0) / 1000)
  const P = base()
  if (i.phase === 'wait') {
    if (i.kind === 'merge') mergeWait(s, P)
    else if (i.kind === 'ring') ringWait(s, P)
    else peekWait(s, P, i)
    return P
  }

  if (i.phase === 'failed') {
    // settle quietly; the calling screen fades and the tile shows the reconnect button
    const g = ease(s / 0.6)
    if (i.kind === 'merge') {
      mergeWait(i.wEnd, P)
      P.dots = P.dots.map(([x, y, r], n) => [x, y * (1 - g) - 0.12 * g, r * (1 - easeOut((s - n * 0.06) / 0.5))] as [number, number, number])
    } else if (i.kind === 'ring') {
      ringWait(i.wEnd, P, true)
      P.rings = P.rings.map(([r, a]) => [r, a * clamp(1 - s / 0.3)] as [number, number])
      P.face = 'oops'
      P.gaze = [3, 0.8]
    } else {
      P.yaw = i.y0 * (1 - 0.55 * g)
      P.roll = i.r0 * (1 - g)
      P.face = 'oops'
      P.gaze = [-2, 0.8]
    }
    return P
  }

  // connected
  const c = s
  if (c > 2.2) return null
  const talkFace: Face = c < 2 ? (i.kind === 'peek' ? 'delighted' : 'happy') : 'calm'
  if (i.kind === 'merge') {
    const g = ease(c / 0.45)
    P.dots = [0, 1, 2].map((n) => [(n - 1) * 0.36 * (1 - g), 0, 0.12 + 0.1 * g] as [number, number, number])
    P.k = 0.05 + 0.25 * g
    const u = c - 0.4
    P.m = u < 0 ? 0 : 1 - Math.exp(-9 * u)
    P.hs = 0.13 + (0.55 - 0.13) * P.m
    const sq = u < 0 ? 0 : Math.exp(-5 * u) * Math.sin(9 * u) * 0.07
    P.st = [1 + sq, 1 - sq]
    const v = c - 0.45
    P.yaw = v < 0 ? -2.4 : -2.4 * Math.exp(-4 * v) * Math.cos(5 * v)
    P.pitch = v < 0 ? 0 : 0.2 * Math.exp(-3 * v) * Math.sin(6 * v)
    P.faceA = clamp((c - 0.5) / 0.25)
    P.face = talkFace
    if (P.m > 0.999) {
      P.m = 1
      P.dots = NO_DOTS
    }
  } else if (i.kind === 'ring') {
    ringWait(i.wEnd + c, P)
    P.rings = P.rings.map(([r, a]) => [r, a * clamp(1 - c / 0.3)] as [number, number])
    P.roll *= clamp(1 - c / 0.15)
    P.yaw *= clamp(1 - c / 0.15)
    P.zoom = (0.82 - 0.22 * Math.exp(-6 * c) * Math.cos(7 * c)) * Z
    P.offY = c < 0.42 ? -Math.sin((Math.PI * c) / 0.42) * 0.07 * Z : 0
    const u = c - 0.42
    const sq = c < 0.42 ? -0.05 * Math.sin((Math.PI * c) / 0.42) : 0.1 * Math.exp(-7 * u) * Math.sin(12 * u)
    P.st = [1 + sq, 1 - sq]
    P.pitch = -0.14 * Math.exp(-6 * c) + (c < 0.42 ? 0.08 * Math.sin((Math.PI * c) / 0.42) : 0)
    P.gaze = [-1.5 * Math.exp(-8 * c), 2 * Math.exp(-8 * c)]
    P.face = c < 0.65 ? 'surprised' : talkFace
  } else {
    P.yaw = i.y0 * Math.exp(-4 * c) * Math.cos(4.5 * c)
    P.roll = i.r0 * Math.exp(-5 * c)
    P.pitch = 0.12 * Math.exp(-3 * c) * Math.sin(5 * c)
    P.offY = c < 0.5 ? -Math.sin((Math.PI * c) / 0.5) * 0.03 * Z : 0
    P.gaze = null
    P.face = talkFace
  }
  return P
}
