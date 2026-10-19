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
    open: null, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  const base = REPO + '/src/lib/roleplay/scenes/'
  g.RP_SCENES = ['cafe-abroad', 'izakaya-guests', 'work-intro'].map((id) => require(base + ({ 'cafe-abroad': 'travel/', 'izakaya-guests': 'service/', 'work-intro': 'business/' })[id] + id + '.json'))
  g.RP_LIST = g.RP_SCENES.map((sc, i) => ({ id: sc.id, category: sc.category, title: sc.title, summary: sc.summary, image: sc.image, role: sc.roles[0].name, otherRole: sc.roles[1].name, tasks: [], hasProp: !!sc.prop, cleared: i === 0 ? 1 : 0, next: i === 0 ? 1 : 0 }))
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 3 }]
  await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  // (no greeting yet: the tutor is silent after connecting)
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  const panelBtn = () => T.$(`header .sq.tog[title="ロールプレイとコース"]`)
  const posts = (k) => ctx().filter((l) => l.includes(`"kind":"${k}"`))
  const kicks = () => sent.filter((e) => e.type === 'response.create').length
  const calling = () => !!T.$('.ai-calling:not(.out)')
  // 1) connected, but the tutor says nothing: the calling screen stays, and it's asked to greet
  check('connected and silent: still on the calling screen', calling())
  await T.tick(2000)
  check('not too soon: the greeting gets time to start by itself (an early prompt restarted it)', kicks() === 0)
  // a reply being put together (response.created): still no prompt
  await emit({ type: 'response.event', event: { type: 'response.created' } })
  await T.tick(2500)
  check('no prompt while a reply is being prepared', kicks() === 0, kicks())
  await emit({ type: 'response.event', event: { type: 'response.done' } })
  await T.tick(1500)
  check('the tutor is asked to speak (once the greeting note is in and nothing came)', kicks() === 1 && posts('start').length === 1, kicks())
  await emit({ type: 'session.output_transcript.delta', delta: 'Hey Connor! ', start_ms: 3000, end_ms: 3400 })
  check('the reveal starts with its first words', calling())
  await T.tick(1400)
  check('…and then the room shows', !calling())
  await T.tick(4500)
  check('no second prompt once it has spoken', kicks() === 1, kicks())
  // 2) the tutor jumps into a role-play by itself: nothing starts
  await say('ai', "Let's do a quick cafe role-play. I'll be the barista.", 4000); await T.tick(900)
  check('the tutor can\'t start a role-play by itself (nothing on screen)', !T.$('.panelBox .apn') && posts('roleplay').length === 0)
  await say('ai', "I'll open the course now.", 6000); await T.tick(900)
  check('…nor open a course before the student has said anything', !g.log.some((l) => l.includes('/ai-open')))
  // 3) free talk silence: the reminder doesn't mention slides, and doesn't loop on the tutor's own speech
  await T.tick(9500)
  const n1 = posts('nudge')
  check('free-talk reminder (where: free)', n1.length === 1 && n1[0].includes('"where":"free"'), n1)
  await say('ai', 'So, what did you do this weekend?', 20000); await T.tick(10000)
  check('the tutor talking doesn\'t re-arm the reminder (no loop)', posts('nudge').length === 1, posts('nudge').length)
  // 4) the student asks for role-plays; the tutor suggests one: only the student's choice starts it
  await say('you', 'Could we do a role play?', 32000); await T.tick(300)
  check('the student asks: the list is up', !!T.$('.apn-pick'))
  await say('ai', "Let's do the cafe one.", 33000); await T.tick(900)
  check('the tutor\'s pick alone doesn\'t start it (the student hasn\'t chosen yet)', !!T.$('.apn-pick') && posts('roleplay').length === 0)
  // 5) waiting on the list: no reminder, however long
  await T.tick(12000)
  check('no reminder while the student is choosing', posts('nudge').length === 1, posts('nudge').length)
  await say('you', 'The cafe one please.', 47000); await T.tick(300)
  await say('ai', "Great, let's start the cafe one.", 48000); await T.tick(900)
  check('once the student has chosen, it starts', !!T.$('.apn-mission'))
  // 6) the end: mission complete, the student says "mm" and then nothing: no reminder, no slides talk, nothing moves
  g.TICK = []
  await say('ai', "Here you go. That's the end of the role-play!", 52000); await T.tick(400)
  check('mission complete', !!T.$('.apn-done'))
  await say('you', 'Mm', 53000); await T.tick(200)
  await say('ai', 'Nice job! Would you like to swap roles, try it again, or try another scene?', 54000); await T.tick(15000)
  check('a long silence on the question: no reminder, still waiting', !!T.$('.apn-done') && posts('nudge').length === 1, posts('nudge').length)
  check('"mm" never becomes a correction card', !T.$('.aic'))
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
