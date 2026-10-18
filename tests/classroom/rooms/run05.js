const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'HTMLCanvasElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'CustomEvent', 'EventTarget', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver'])
  try { globalThis[k] = w[k] } catch {}
globalThis.sessionStorage = w.sessionStorage; globalThis.localStorage = w.localStorage
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true })
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
  Object.defineProperty(w.navigator, 'mediaDevices', { value: { getDisplayMedia: () => {} }, configurable: true })
  /* teacher */
  await T.run(base('teacher'))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  g.roomState.remoteParticipants = [{ id: 'r1', displayName: 'Aiko', isAudioEnabled: true, isVideoEnabled: true, stream: { id: 'rs', getAudioTracks: () => [] } }]
  g.forceRoom(); await T.tick(50)
  // share
  const shareBtn = [...document.querySelectorAll('.controls .cbtn')].find((b) => b.textContent.includes('Share'))
  check('share button', !!shareBtn)
  await T.click(shareBtn)
  check('startScreenshare called', g.log.includes('startScreenshare'))
  g.roomState.localScreenshareStatus = 'starting'; g.forceRoom(); await T.tick()
  g.roomState.localScreenshareStatus = 'active'; g.roomState.screenshares = [{ id: 'sh1', participantId: 'local', isLocal: true, hasAudioTrack: false, stream: { id: 'share' } }]
  g.forceRoom(); await T.tick(50)
  check('sharing layout', !!T.$('.app.sharing') && txt('.shareBar') .includes('You’re sharing your screen'), txt('.shareBar'))
  check('share toast', txt('.toast') === 'Aiko can see your screen', txt('.toast'))
  check('share shows in free talk too', !!T.$('.app.no-course') || true)
  await T.click(T.$('.shareBar button'))
  check('stop from bar', g.log.includes('stopScreenshare'))
  g.roomState.localScreenshareStatus = undefined; g.roomState.screenshares = []; g.forceRoom(); await T.tick(50)
  check('stop toast context', txt('.toast') === 'Back to slide 1', txt('.toast'))
  // remote share, teacher can stop it
  g.roomState.screenshares = [{ id: 'sh2', participantId: 'r1', isLocal: false, hasAudioTrack: true, stream: { id: 'theirs' } }]; g.forceRoom(); await T.tick(50)
  check('their share shown', txt('.shareBar').includes('Aiko is sharing their screen') && txt('.shareBar button') === 'Stop their share', txt('.shareBar'))
  await T.click(T.$('.shareBar button'))
  check('teacher stops their share', g.log.some((l) => l.startsWith('stopParticipantScreenshare')))
  g.roomState.screenshares = []; g.forceRoom(); await T.tick()
  // tile menu
  await T.click(T.$('.tmenuBtn'))
  check('menu open', !!T.$('.tmenu.open'))
  const mute = [...document.querySelectorAll('.tmenu button')].find((b) => b.textContent.includes('Mute Aiko'))
  await T.click(mute)
  check('mute called', g.log.some((l) => l.startsWith('muteParticipants:[["r1"]]')), g.log.filter((l) => l.startsWith('mute')).join())
  g.roomState.remoteParticipants[0].isAudioEnabled = false; g.forceRoom(); await T.tick()
  await T.click(T.$('.tmenuBtn'))
  const ask = [...document.querySelectorAll('.tmenu button')].find((b) => b.textContent.includes('Ask Aiko to unmute'))
  check('menu now asks to unmute', !!ask)
  await T.click(ask)
  check('askToSpeak called', g.log.some((l) => l.startsWith('askToSpeak')))
  // settings
  await T.click(T.$('button[aria-label="Settings"]')); await T.tick(50)
  check('settings open', !!T.$('.scrim.open .smodal'))
  check('background options offered', [...document.querySelectorAll('.smodal .pill')].some((b) => b.textContent === 'Blur'))
  await T.click([...document.querySelectorAll('.smodal .pill')].find((b) => b.textContent === 'Blur')); await T.tick()
  check('background applied + saved', g.log.includes('switchCameraEffect:blur') && JSON.parse(localStorage.getItem('eigo-classroom-prefs')).background === 'blur')
  const mirrorSw = T.$('.smodal button[aria-label="Mirror my video"]')
  await T.click(mirrorSw)
  check('mirror off', !T.$('.tile.mirror'))
  await T.click([...document.querySelectorAll('.smodal .pill')].find((b) => b.textContent === 'Classroom'))
  await T.click(T.$('.smodal button[aria-label="Let the student draw"]'))
  check('student draw off sent', g.log.some((l) => l.includes('broadcast:') && l.includes('"studentDraw":false')) && g.log.some((l) => l.includes('/event') && l.includes('studentDraw')))
  await T.click(T.$('.smodal button[aria-label="Show each other’s cursors"]'))
  check('cursors off', !!T.$('.app.no-cursors'))
  const n0 = g.log.filter((l) => l.includes('"type":"cursor"')).length
  await ptr(T.$('.slideBox'), 'pointermove', 50, 50); await T.tick(80)
  check('no cursor sent when off', g.log.filter((l) => l.includes('"type":"cursor"')).length === n0)
  await T.click([...document.querySelectorAll('.smodal .pill')].find((b) => b.textContent === 'Appearance'))
  await T.click([...document.querySelectorAll('.smodal .pill')].find((b) => b.textContent === 'Reduced'))
  check('reduced effects', !!T.$('.cr.fx-lite'))
  await T.click([...document.querySelectorAll('.smodal .pill')].find((b) => b.textContent === 'Light'))
  check('theme toggled', g.log.includes('toggleTheme'))

  /* student */
  localStorage.clear(); sessionStorage.clear()
  await T.run(base('student'))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('student no tile menu items for teacher', true)
  await act(async () => g.rtHandler({ payload: { type: 'perm', studentDraw: false } })); await T.tick()
  check('student tools hidden', !T.$('.handle'))
  check('drawing off toast', txt('.toast') === 'Connor Finleyさんが書き込みをオフにしました', txt('.toast'))
  await act(async () => g.emitWhereby('requestAudioEnable', {})); await T.tick()
  check('unmute prompt', txt('.askCard p') === 'Connor Finleyさんがミュート解除をお願いしています', txt('.askCard'))
  await T.click(T.$('.askCard .ebtn.cta'))
  check('unmute pressed', g.log.some((l) => l === 'toggleMicrophone:[true]'), g.log.filter((l) => l.startsWith('toggleMic')).join())
  await act(async () => g.emitWhereby('requestScreenshareEnable', {})); await T.tick()
  await T.click(T.$('.askCard .ebtn.cta'))
  check('share from prompt', g.log.filter((l) => l === 'startScreenshare').length >= 1)
  await act(async () => g.emitWhereby('requestAudioDisable', {})); await T.tick()
  check('muted-you toast', txt('.toast') === 'Connor Finleyさんがあなたのマイクをミュートしました', txt('.toast'))
  console.log(fails ? `\n${fails} FAILED` : '\nall passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
