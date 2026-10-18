const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return this.classList?.contains('slideBox') ? parseFloat(this.style.width) || 0 : 1200 } })
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return 700 } })
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'HTMLCanvasElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'CustomEvent', 'EventTarget', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver', 'NodeFilter', 'Range', 'Text', 'MessageEvent'])
  try { globalThis[k] = w[k] } catch {}
globalThis.sessionStorage = w.sessionStorage; globalThis.localStorage = w.localStorage
globalThis.CSS = { escape: (s) => s, highlights: { set() {}, delete() {} } }
globalThis.Highlight = class {}
globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([]) } disconnect() {} }
w.ResizeObserver = globalThis.ResizeObserver
w.matchMedia = () => ({ matches: false })
w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) }) }
globalThis.plays = 0
w.HTMLMediaElement.prototype.play = function () { globalThis.plays++; globalThis.lastPlayed = this.tagName; return Promise.resolve() }
w.HTMLMediaElement.prototype.pause = () => {}
// ---- WebRTC mocks ----
const sent = []
let channel = null
class FakeChannel extends w.EventTarget { constructor(label) { super(); this.label = label; this.readyState = 'open' } send(d) { sent.push(JSON.parse(d)) } close() { this.readyState = 'closed' } }
class FakePC extends w.EventTarget {
  constructor() { super(); this.iceGatheringState = 'complete'; this.localDescription = null; globalThis.pcCount = (globalThis.pcCount || 0) + 1 }
  addTrack() {}
  createDataChannel(l) { channel = new FakeChannel(l); return channel }
  async createOffer() { return { type: 'offer', sdp: 'v=0 offer' } }
  async setLocalDescription(d) { this.localDescription = d }
  async setRemoteDescription(d) { this.remote = d }
  close() {}
}
globalThis.RTCPeerConnection = FakePC
const fakeTrack = { id: 'a1', enabled: true, readyState: 'live', stop() {}, kind: 'audio' }
globalThis.MediaStream = class { constructor(t = [fakeTrack]) { this.t = t } getAudioTracks() { return this.t } getVideoTracks() { return [] } getTracks() { return this.t } }
const md = { getUserMedia: async () => new globalThis.MediaStream() }
Object.defineProperty(w.navigator, 'mediaDevices', { value: md, configurable: true })
try { Object.defineProperty(globalThis.navigator, 'mediaDevices', { value: md, configurable: true }) } catch {}
const g = globalThis
g.COURSE = require(REPO + '/tests/classroom/fixtures/course-c_greatbritain.json')
const T = require('../.build/harness.cjs')
const { act } = require('react')
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString()
const L1 = g.COURSE.units[0].lessons[0]
let fails = 0
const check = (n, c, x = '') => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + n + (c ? '' : '  -> ' + x)); if (!c) fails++ }
const emit = async (ev) => { await act(async () => { channel.dispatchEvent(new w.MessageEvent('message', { data: JSON.stringify(ev) })) }); await T.tick(30) }
;(async () => {
  const join = { bookingId: 'b1', role: 'student', ai: true, roomUrl: null, roomKey: null,
    window: { start: iso(60000), end: iso(-29 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-89 * 60000), noShowAt: iso(-14 * 60000) },
    durationMinutes: 30, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
    me: { name: 'Aiko' }, other: { name: 'Emma' }, uiLang: 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
    open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: null }, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  const base = REPO + '/src/lib/roleplay/scenes/'
  g.RP_SCENES = ['cafe-abroad', 'izakaya-guests', 'work-intro'].map((id) => require(base + ({ 'cafe-abroad': 'travel/', 'izakaya-guests': 'service/', 'work-intro': 'business/' })[id] + id + '.json'))
  g.RP_LIST = g.RP_SCENES.map((sc, i) => ({ id: sc.id, category: sc.category, title: sc.title, summary: sc.summary, image: sc.image, role: sc.roles[0].name, otherRole: sc.roles[1].name, tasks: [], hasProp: !!sc.prop, cleared: i === 0 ? 1 : 0, next: i === 0 ? 1 : 0 }))
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 3 }]
  await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  await emit({ type: 'session.output_transcript.delta', delta: 'Hi Aiko! ', start_ms: 100, end_ms: 400 })
  await T.tick(1300)
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  const panelBtn = () => T.$(`header .sq.tog[title="ロールプレイとコース"]`)
  check('no panel yet', !T.$('.panelBox .apn'))
  const isFree = () => !!T.$('.app.no-course')
  const states = () => g.log.filter((l) => l.includes('/state'))
  const closedNotes = () => ctx().filter((l) => l.includes('"what":"closed"')).length
  check('the booked course is open at the start', !isFree() && !!T.$('.snav .closeCourse'))
  // 1) the live test: the student's request is split by the tutor's reply ("could we close this" | tutor | "course")
  await emit({ type: 'session.input_transcript.delta', delta: 'Uh, by the way Tom, could we close this', start_ms: 3000, end_ms: 4600 })
  await emit({ type: 'session.output_transcript.delta', delta: "Sure! I'll close", start_ms: 4700, end_ms: 5200 })
  check('not closed on half a sentence', !isFree())
  await emit({ type: 'session.input_transcript.delta', delta: ' course', start_ms: 4700, end_ms: 5000 })
  await T.tick(300)
  check('the student\'s "could we close this… course" closes it at once', isFree(), T.$('.app').className)
  check('the close is saved (state: no course)', states().some((l) => l.includes('"courseId":null')), states())
  check('the AI tutor is told it\'s closed (once)', closedNotes() === 1, closedNotes())
  await emit({ type: 'session.output_transcript.delta', delta: ' the course now.', start_ms: 5200, end_ms: 5700 })
  await T.tick(800)
  check('the tutor\'s "I\'ll close the course now" after that does nothing more', closedNotes() === 1, closedNotes())
  // 2) the tutor's own sentence split by the student talking over it
  await say('ai', "I'll open the course now.", 9000); await T.tick(900)
  check('reopened for the next check', !isFree(), T.$('.app').className)
  await T.tick(2600)
  await emit({ type: 'session.output_transcript.delta', delta: "Okay. I'll close", start_ms: 14000, end_ms: 14500 })
  await emit({ type: 'session.input_transcript.delta', delta: 'Mm', start_ms: 14400, end_ms: 14600 })
  await emit({ type: 'session.output_transcript.delta', delta: ' the course now.', start_ms: 14550, end_ms: 15000 })
  await T.tick(800)
  check('"I\'ll close | the course now" (split by the student) still closes it', isFree(), T.$('.app').className)
  // 3) a natural confirmation counts too
  await say('ai', "I'll open the course now.", 20000); await T.tick(900)
  await T.tick(2600)
  await say('ai', "Alright, we're out of the course now.", 26000); await T.tick(800)
  check('"we\'re out of the course now" closes it', isFree())
  // 4) the ✕ button
  await say('ai', "I'll open the course now.", 32000); await T.tick(900)
  check('reopened', !isFree() && !!T.$('.snav .closeCourse'))
  const before = closedNotes()
  await T.click(T.$('.snav .closeCourse')); await T.tick(100)
  check('✕ closes it and tells the AI tutor', isFree() && closedNotes() === before + 1 && !T.$('.snav .closeCourse'))
  // 5) things that must NOT close it
  await say('ai', "I'll open the course now.", 40000); await T.tick(900)
  await T.tick(2600)
  await say('you', "I like this course.", 45000); await T.tick(300)
  await say('ai', 'Shall I close the course?', 47000); await T.tick(800)
  await say('you', "No, don't close the course.", 50000); await T.tick(300)
  check('"I like this course" / "Shall I close…?" / "don\'t close it" leave it open', !isFree())
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
