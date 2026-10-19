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
  // the free 5-minute welcome talk, led by the tutor: the classroom follows what it says (lib/classroom/welcome.ts)
  const join = { bookingId: 'b1', role: 'student', ai: true, aiWelcome: true, roomUrl: null, roomKey: null,
    window: { start: iso(30000), end: iso(-5 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-65 * 60000), noShowAt: iso(-14 * 60000) },
    durationMinutes: 5, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
    me: { name: 'Aiko' }, other: { name: 'Emma' }, uiLang: 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
    open: null, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  const base = REPO + '/src/lib/roleplay/scenes/'
  g.RP_SCENES = [require(base + 'travel/cafe-abroad.json'), require(base + 'service/salon-massage.json'), require(base + 'business/work-intro.json')]
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 0 }]
  g.aiSessionResponse = { sessionId: 'live_1', sdp: 'v=0 answer', endsAt: new Date(Date.now() + 300_000).toISOString() }
  g.TICK = []
  g.turnResponse = (b) => ({ move: 'stay', slide: null, action: b.screen ? { kind: 'open_course', courseId: 'c_greatbritain' } : { kind: 'none' }, quote: 'open the course', ticks: b.roleplay ? g.TICK.filter((t) => !b.roleplay.done.includes(t.id)) : [] })
  g.welcomeAbout = { facts: { job: 'Aromatherapist in Tokyo', likes: 'Netflix, cafés', why: 'Talking with customers' }, thin: [] }
  await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const posts = (k) => ctx().filter((l) => l.includes(`"kind":"${k}"`))
  const fetched = (part) => g.log.filter((l) => l.startsWith('fetch POST') && l.includes(part))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  await say('ai', "Hi Aiko! I'm Emma, your AI tutor. Where are you from, and what do you do?", 100); await T.tick(1500)
  // 1) the rails: no courses, no whiteboard, no role-play list
  check('the top bar says ウェルカムトーク', txt('#crumb') === 'ウェルカムトーク', txt('#crumb'))
  check('no whiteboard or panel button', document.querySelectorAll('header .sq.tog').length === 1)
  await say('you', 'Could we open the course?', 3000); await T.tick(800)
  await say('ai', "I'll open the course now.", 4000); await T.tick(1500)
  check('a course never opens (by the student, the tutor or the judge)', fetched('/ai-open').length === 0 && !g.log.some((l) => l.includes('/ai-turn') && l.includes('"screen"')))
  // 2) getting to know them: the helper reads it quietly; nothing appears, the tutor isn't interrupted
  await say('you', "I'm from Tokyo. I'm an aromatherapist. I like Netflix and cafés, and I study English to talk with customers.", 7000); await T.tick(2400)
  check('the helper picks out the facts, quietly (for the end screen)', fetched('"op":"about"').length >= 1 && !T.$('.wlc-row'))
  check('no notes to the tutor while it leads', posts('welcome').length === 0, posts('welcome'))
  // 3) the tutor suggests a role-play: its card appears
  await say('ai', 'Thanks! Since you work with customers, here is a role-play for you. In the classroom, you can open things just by asking. Please say: "Let\'s do the massage salon role-play."', 12000); await T.tick(1200)
  check('the card shows the scene the tutor named, with the phrase', txt('.wlc-st b').startsWith('マッサージ') && txt('.wlc-p') === "Let's do the massage salon role-play", txt('.aic'))
  await say('you', "Let's do the massage", 15000); await T.tick(2500)
  check('half the phrase opens nothing', !T.$('.apn-mission') && document.querySelectorAll('.wlc-p span.on').length >= 4, txt('.wlc-p'))
  await say('you', ' salon role-play', 17600); await T.tick(800)
  check('the whole phrase: not while they might still be talking…', !T.$('.apn-mission'))
  await say('ai', 'Great!', 18600); await T.tick(2000)
  check('…then it opens, at 初級', !!T.$('.apn-mission') && txt('.apn-lvl') === '初級', txt('.panelBox'))
  check('the tutor gets the scene', posts('roleplay').length === 1 && posts('roleplay')[0].includes('"sceneId":"salon-massage"') && posts('roleplay')[0].includes('"level":0'))
  // 4) the scene, then mission complete (welcome version)
  const tasks = g.RP_SCENES[1].roles[0].levels[0].tasks
  g.TICK = tasks.map((t) => ({ id: t.id, said: t.hints[2] }))
  await say('ai', 'Hi, I would like a massage.', 25000); await T.tick(200)
  await say('you', tasks.map((t) => t.hints[2]).join(' '), 26000); await T.tick(3800)
  await say('ai', "Thank you! That's the end of the role-play!", 32000); await T.tick(1200)
  check('mission complete, without swap / again / next', !!T.$('.apn-done') && !T.$('.apn-acts'))
  const dn = posts('roleplay_done').pop() || ''
  check('the results go to the tutor', dn.includes('"welcome":true') && dn.includes('"canSwap":false'), dn)
  check('progress recorded through the welcome route', fetched('"op":"record"').length === 1)
  await say('ai', 'Well done! Any questions about the role-play?', 34000); await T.tick(300)
  await say('you', 'No, it was clear.', 35000); await T.tick(1500)
  check('mission complete stays while they talk about it', !!T.$('.apn-done'))
  // 5) the tutor moves on to the voice command: its card
  await say('ai', 'Now let\'s try a voice command. In your lessons, just say "Open the course", and a course lesson opens. Try it now!', 38000); await T.tick(800)
  check('the voice command card ("Open the course"), the mission screen gone', txt('.wlc-tip .wlc-q') === '“Open the course”' && !T.$('.panelBox .apn'), txt('.aic'))
  await say('you', 'Open the course', 41000); await T.tick(1800)
  check('"Open the course": a preview of a course\'s first slide (nothing really opens)', T.$('.app')?.classList.contains('wl-preview') && txt('#crumb').includes('プレビュー') && fetched('/ai-open').length === 0, txt('#crumb'))
  check('…ticked, and the card is a single row', !!T.$('.wlc-tip.done') && !!T.$('.aic.wlc.compact'))
  // 6) the Q&A: the preview goes
  await say('ai', 'That is what a course lesson looks like. Do you have any questions about eigo?', 45000); await T.tick(800)
  check('the Q&A: the preview and the card go', !T.$('.app.wl-preview') && !T.$('.wlc-tip'))
  check('the tutor led it all: no reminders were needed', posts('welcome').length === 0, posts('welcome'))
  check('no time notes but the goodbye', posts('time').length === 0)
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
