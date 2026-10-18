const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'HTMLCanvasElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'CustomEvent', 'EventTarget', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver'])
  try { globalThis[k] = w[k] } catch {}
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
  /* teacher */
  await T.run(base('teacher', { ink: { [L1.slides[0].id]: [{ id: 'old1', kind: 'text', color: '#e55050', x: 100, y: 100, text: 'Saved earlier' }] } }))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('saved drawing restored', txt('.inktext') === 'Saved earlier', T.$('#textLayer')?.innerHTML)
  check('toolbar handle', !!T.$('.handle') && !!T.$('.toolbar'))
  await T.click(T.$('.handle'))
  check('drawer opens', !!T.$('.app.tb-open'))
  await key('p')
  check('pen tool', T.$('.slideBox').className.includes('tool-pen') && !!T.$('.tbtn.on[aria-label="Pen (P)"]'), T.$('.slideBox').className)
  await stroke([[100, 100], [120, 110], [140, 130], [160, 150]])
  const ops = bc().filter((b) => b.type === 'ink').map((b) => b.op)
  check('stroke add/pts/set sent', ops[0]?.op === 'add' && ops.some((o) => o.op === 'pts') && ops[ops.length - 1].op === 'set' && ops[ops.length - 1].items[0].pts.length === 4, JSON.stringify(ops).slice(0, 300))
  check('stroke on slide surface', ops.every((o) => o.surface === L1.slides[0].id))
  await T.tick(900)
  const saves = g.log.filter((l) => l.includes('/ink'))
  check('surface saved', saves.length === 1 && saves[0].includes('Saved earlier') && saves[0].includes('"kind":"pen"'), saves.join('\n').slice(0, 300))
  // undo
  await key('z', { metaKey: true })
  check('undo sends whole surface', bc().filter((b) => b.type === 'ink').pop().op.op === 'all')
  // text tool
  await key('t')
  await ptr(T.$('#ink'), 'pointerdown', 300, 300); await T.tick(50)
  const tx = document.querySelectorAll('.inktext')[1]
  check('text box created + editable', !!tx && tx.contentEditable === 'true', tx?.outerHTML)
  if (tx) { tx.textContent = 'Hello'; await act(async () => tx.dispatchEvent(new w.Event('input', { bubbles: true }))); await T.tick() }
  check('typed text sent', bc().some((b) => b.type === 'ink' && b.op.op === 'set' && b.op.items[0].text === 'Hello'))
  // eraser
  await key('p'); await stroke([[500, 500], [520, 520]])
  const before = bc().length
  await key('e'); await stroke([[510, 510], [511, 511]])
  check('eraser deletes', bc().slice(before).some((b) => b.type === 'ink' && b.op.op === 'del'))
  // cursor
  await ptr(T.$('.slideBox'), 'pointermove', 200, 150); await T.tick(80)
  check('cursor sent', bc().some((b) => b.type === 'cursor' && b.x === 200 && b.y === 150 && b.surface === L1.slides[0].id), JSON.stringify(bc().filter((b) => b.type === 'cursor').slice(-1)))
  await act(async () => g.rtHandler({ payload: { type: 'cursor', x: 640, y: 480, surface: L1.slides[0].id } })); await T.tick()
  check('remote cursor shown', T.$('.rcursor').classList.contains('on') && T.$('.rcursor').style.transform.startsWith('translate(640.0px,480.0px)'), T.$('.rcursor').style.transform)
  check('cursor label', txt('.rcursor span') === 'Aiko')
  await act(async () => g.rtHandler({ payload: { type: 'cursor', hide: true } })); await T.tick()
  check('remote cursor hidden', !T.$('.rcursor').classList.contains('on'))
  // remote ink
  await act(async () => g.rtHandler({ payload: { type: 'ink', op: { op: 'set', surface: L1.slides[0].id, items: [{ id: 'r1', kind: 'text', color: '#151414', x: 50, y: 50, text: 'From Aiko' }] } } })); await T.tick(50)
  check('remote text shown', [...document.querySelectorAll('.inktext')].some((d) => d.textContent === 'From Aiko'))
  // whiteboard
  await T.click(T.$('.handle')); await key('v')
  await T.click(T.$('#wbBtn')); await T.tick(50)
  check('whiteboard on', !!T.$('.app.wb') && T.$('#wbBtn').classList.contains('on'))
  check('wb broadcast + saved', bc().some((b) => b.type === 'wb' && b.on) && g.log.some((l) => l.includes('/event') && l.includes('whiteboard') && l.includes('true')))
  check('wb toast', txt('.toast') === 'Whiteboard on for you and Aiko', txt('.toast'))
  check('wb opens pen', T.$('.slideBox').className.includes('tool-pen') && !!T.$('.app.tb-open'))
  check('board texts hidden from slide', ![...document.querySelectorAll('.inktext')].some((d) => d.textContent === 'From Aiko'))
  await stroke([[10, 10], [30, 30]])
  check('board surface', bc().filter((b) => b.type === 'ink').pop().op.surface === 'board')
  await key('ArrowRight'); await T.tick(50)
  check('next slide closes board', !T.$('.app.wb') && txt('.snav .n') === `2 / ${L1.slides.length}`)
  await key('ArrowLeft'); await T.tick(50)
  check('back on slide 1 drawings return', [...document.querySelectorAll('.inktext')].some((d) => d.textContent === 'From Aiko'))
  // free talk + whiteboard
  await T.click(T.$('#closeCourse')); await T.tick(50)
  check('free talk hides tools', !!T.$('.app.no-course:not(.wb)'))
  await key('w'); await T.tick(50)
  check('W opens board in free talk', !!T.$('.app.no-course.wb') && T.$('.app').dataset.mode !== 'videos', T.$('.app').dataset.mode)
  await key('w'); await T.tick(50)
  check('W closes board → videos', T.$('.app').dataset.mode === 'videos' && txt('.toast') === 'Whiteboard off', txt('.toast'))

  /* student */
  await T.run(base('student'))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('student has tools', !!T.$('.handle') && getComputedStyle(T.$('.handle')).display !== 'none')
  await T.click(T.$('.handle')); await key('p')
  await stroke([[50, 50], [60, 60]])
  check('student can draw', bc().some((b) => b.type === 'ink' && b.op.op === 'set'))
  await act(async () => g.rtHandler({ payload: { type: 'wb', on: true } })); await T.tick()
  check('student follows board', !!T.$('.app.wb'))
  await act(async () => g.rtHandler({ payload: { type: 'open', open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1.slides[2].id } } })); await T.tick(50)
  check('teacher slide change closes board for student', !T.$('.app.wb') && txt('.snav .n') === `3 / ${L1.slides.length}`)
  // leave & rejoin keeps drawings
  await T.click(T.$('.leaveSq')); await T.click(T.$('.ebtn.danger'))
  await T.click(T.$('.leftScreen .ebtn.cta')); await T.tick(80)
  await act(async () => g.rtHandler({ payload: { type: 'open', open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1.slides[0].id } } })); await T.tick(50)
  check('engine survives rejoin', !!T.$('#ink') && T.$('.slideBox').className.includes('tool-'), T.$('.slideBox')?.className)
  console.log(fails ? `\n${fails} FAILED` : '\nall passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
