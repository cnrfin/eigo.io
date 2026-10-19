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
  // the welcome call's end screen (a 1-minute call, so it ends quickly): replaces the classroom at 0:00
  const join = { bookingId: 'b1', role: 'student', ai: true, aiWelcome: true, roomUrl: null, roomKey: null,
    window: { start: iso(30000), end: iso(-1 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-61 * 60000), noShowAt: iso(-14 * 60000) },
    durationMinutes: 1, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
    me: { name: 'Aiko' }, other: { name: 'Emma' }, uiLang: 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
    open: null, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  g.RP_SCENES = [require(REPO + '/src/lib/roleplay/scenes/travel/cafe-abroad.json')]
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 0 }]
  g.aiSessionResponse = { sessionId: 'live_1', sdp: 'v=0 answer', endsAt: new Date(Date.now() + 40_000).toISOString() }
  g.welcomeAbout = { facts: { job: 'Nurse in Osaka', goal: 'Travel to Australia' }, pick: null }
  await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const fetched = (part) => g.log.filter((l) => l.startsWith('fetch POST') && l.includes(part))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  await say('ai', "Hi Aiko! Welcome to eigo. What do you do?", 100); await T.tick(1500)
  await say('you', "I'm a nurse in Osaka and I'd like to travel to Australia.", 2000); await T.tick(2500)
  check('two facts: no card yet (it waits for more, or 1:30)', !T.$('.wlc-row') && fetched('"op":"about"').length >= 1)
  // the call runs out
  await T.tick(36_000)
  check('the goodbye note came (the only time note)', ctx().filter((l) => l.includes('"kind":"time"')).length === 1)
  await T.tick(3000)
  check('the welcome end screen replaces the classroom (not the lesson-complete screen)', !!T.$('.wle') && !T.$('.leftScreen'), T.$('body').innerHTML.slice(0, 200))
  check('it greets them by name', txt('.wle h2') === 'おつかれさまでした、Aikoさん！', txt('.wle h2'))
  check('speaking time and phrases saved; no role-play level (none played)', document.querySelectorAll('.wle-st').length === 2 && txt('.wle-st .n').length >= 4, txt('.wle-stats'))
  check('About me not saved yet: 確認する', txt('.wle-me').startsWith('あなたについて、まだ保存していません') && !!T.$('.wle-me .wlc-b'))
  check('what to try next: a course (はじめる / 予約) ', txt('.wle-nx b').includes('イギリスでのハルカ') && T.$('.wle-nx a.pri')?.getAttribute('href') === '/dashboard?ai=start' && T.$('.wle-nx a.sec')?.getAttribute('href') === '/dashboard?tab=booking', txt('.wle-nx'))
  check('see plans and the dashboard', [...document.querySelectorAll('.wle-b a')].map((a) => a.getAttribute('href')).join(' ') === '/plans /dashboard')
  await T.click(T.$('.wle-me .wlc-b')); await T.tick(100)
  check('確認する: the About-you card, with their facts', document.querySelectorAll('.wle .wlc-row').length === 2)
  await T.click(T.$('.wle .aic .wlc-b.pri')); await T.tick(200)
  check('saving it from the end screen', fetched('"op":"save"').length === 1 && txt('.wle-me').startsWith('「About me」に保存しました'), txt('.wle-me'))
  await T.tick(1600)
  check('the card closes', !T.$('.wle .wlc-row'))
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
