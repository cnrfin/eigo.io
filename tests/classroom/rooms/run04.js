const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'HTMLCanvasElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'CustomEvent', 'EventTarget', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver'])
  try { globalThis[k] = w[k] } catch {}
globalThis.sessionStorage = w.sessionStorage
globalThis.CSS = { escape: (s) => s }
globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([]) } disconnect() {} }
w.ResizeObserver = globalThis.ResizeObserver
w.matchMedia = () => ({ matches: false })
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return this.classList?.contains('slideBox') ? parseFloat(this.style.width) || 0 : 1200 } })
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return 700 } })
const paints = { strokes: 0 }
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: (t, k) => (k === 'stroke' ? () => paints.strokes++ : k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) })
}
w.HTMLMediaElement.prototype.play = () => Promise.resolve()
w.HTMLMediaElement.prototype.pause = () => {}
const g = globalThis
g.COURSE = require(REPO + '/tests/classroom/fixtures/course-c_greatbritain.json')
const T = require('../.build/harness.cjs')
const { act } = require('react')
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString()
const L1 = g.COURSE.units[0].lessons[0]
const base = (role, over = {}) => ({ bookingId: 'b1', role, roomUrl: 'https://eigo.whereby.com/eigo-x', roomKey: role === 'teacher' ? 'KEY' : null,
  window: { start: iso(0), end: iso(-30 * 60000), studentOpensAt: iso(10 * 60000), closesAt: iso(-90 * 60000), noShowAt: iso(-15 * 60000) },
  durationMinutes: 30, session: { startedAt: iso(60000), endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
  me: { name: role === 'teacher' ? 'Connor Finley' : 'Aiko' }, other: { name: role === 'teacher' ? 'Aiko' : 'Connor Finley' },
  uiLang: role === 'teacher' ? 'en' : 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
  open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: null }, chat: [], serverNow: new Date().toISOString(), ...over })
const txt = (s) => (T.$(s)?.textContent || '').trim()
let fails = 0
const check = (name, cond, extra = '') => { console.log((cond ? 'ok  ' : 'FAIL') + ' ' + name + (cond ? '' : '  -> ' + extra)); if (!cond) fails++ }
const bc = () => g.log.filter((l) => l.startsWith('broadcast:')).map((l) => JSON.parse(l.slice(10)))
const key = async (k, o = {}) => { await act(async () => { w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, ...o })) }); await T.tick() }
const ptr = async (el, type, x, y) => { await act(async () => { const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); Object.defineProperty(e, 'pointerId', { value: 1 }); Object.defineProperty(e, 'pointerType', { value: 'mouse' }); el.dispatchEvent(e) }) }
const stroke = async (pts) => { const cv = T.$('#ink'); await ptr(cv, 'pointerdown', ...pts[0]); for (const p of pts.slice(1)) { await ptr(cv, 'pointermove', ...p); await T.tick(40) } await ptr(cv, 'pointerup', ...pts[pts.length - 1]); await T.tick() }
;(async () => {
  // first visit: check screen, then join stores the flag
  await T.run(base('student'))
  check('lobby first time', !!T.$('.lobby.on'))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('flag stored', !!sessionStorage.getItem('eigo-classroom-joined:b1'), JSON.stringify(Object.keys(sessionStorage)))
  // "refresh": mount again
  await T.run(base('student'))
  check('refresh skips the check', !T.$('.lobby') && !!T.$('.app'), document.body.innerHTML.slice(0, 120))
  check('joins automatically', g.log.includes('joinRoom'))
  // text tool focus is synchronous
  await T.click(T.$('.handle')); await key('t')
  await ptr(T.$('#ink'), 'pointerdown', 300, 300)
  const tx = document.querySelector('.inktext')
  check('text box editable at once', !!tx && tx.contentEditable === 'true')
  // leaving clears it
  await T.click(T.$('.leaveSq')); await T.click(T.$('.ebtn.danger'))
  check('leaving clears flag', !sessionStorage.getItem('eigo-classroom-joined:b1'))
  await T.run(base('student'))
  check('after leaving, check shows again', !!T.$('.lobby.on'))
  console.log(fails ? `\n${fails} FAILED` : '\nall passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
