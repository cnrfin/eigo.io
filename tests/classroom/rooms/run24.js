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
  // a real welcome call, replayed: the scene is sent during the questions, and goodbyes said in the role-play don't
  // start the wrap-up (the classroom stopped following the tutor for the call's last two minutes)
  const join = { bookingId: 'b1', role: 'student', ai: true, aiWelcome: true, roomUrl: null, roomKey: null,
    window: { start: iso(30000), end: iso(-5 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-65 * 60000), noShowAt: iso(-14 * 60000) },
    durationMinutes: 5, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
    me: { name: 'Aiko' }, other: { name: 'Emma' }, uiLang: 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
    open: null, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  const base = REPO + '/src/lib/roleplay/scenes/'
  g.RP_SCENES = [require(base + 'travel/cafe-abroad.json'), require(base + 'service/salon-massage.json'), require(base + 'business/work-intro.json')]
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 0 }]
  g.aiSessionResponse = { sessionId: 'live_1', sdp: 'v=0 answer', endsAt: new Date(Date.now() + 245_000).toISOString() }
  g.turnResponse = { move: 'stay', slide: null, action: { kind: 'none' }, quote: '', ticks: [] }
  g.welcomeAbout = { facts: { job: 'Aromatherapist' }, thin: [], pick: { sceneId: 'salon-massage', name: '', reasonJa: '', reasonEn: '' } }
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const posts = (k) => ctx().filter((l) => l.includes(`"kind":"${k}"`))
  const welcomeNote = (step) => posts('welcome').filter((l) => l.includes(`"step":"${step}"`))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  let { root } = await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  await say('ai', "Hi Aiko! I'm Tom, your AI tutor. Where are you from, and what do you do?", 100); await T.tick(1500)

  // 1. the questions: once the helper has their job and a pick, the scene goes to the tutor, for later
  await say('you', "Hi Tom. I'm from Tokyo", 3000); await T.tick(300)
  await say('you', 'My job is aroma therapist', 6000); await T.tick(2400)
  await T.tick(1500)
  const ready = posts('roleplay')
  check('1: the READY note is sent during the questions (salon, ready: true)', ready.length === 1 && ready[0].includes('"ready":true') && ready[0].includes('"sceneId":"salon-massage"'), ready.join(' | '))
  check('1: …before any role-play teaching (no card yet)', !T.$('.wlc-p'))

  // 2. the tutor teaches the phrase: only the card
  const ctx0 = ctx().length
  await say('ai', "Great! That's a good reason. Now, I have a short role-play for you. In the classroom, you can open things just by asking. Please say, let's do a role-play.", 12000); await T.tick(1500)
  check('2: the card shows', txt('.wlc-p') === "Let's do a role-play" && txt('.wlc-st b').startsWith('マッサージ'), txt('.aic'))
  const since = ctx().slice(ctx0)
  check('2: no new role-play or suggest note while it teaches the phrase', !since.some((l) => l.includes('"kind":"roleplay"') || (l.includes('"kind":"welcome"') && l.includes('"step":"suggest"'))), since.join(' | '))

  // 3. they say it: the panel opens
  await say('you', "Let's do a role-play", 16000); await T.tick(2500)
  check('3: the panel opens', !!T.$('.apn-mission'), txt('.panelBox'))

  // 4. goodbyes in the scene (in character, and with "That's the end of the role-play"): the results, no wrap-up
  await say('ai', 'Hello! I have a booking for a massage.', 20000); await T.tick(300)
  await say('you', 'Yeah. See you again next time', 22000); await T.tick(800)
  await say('ai', "See you! That's the end of the role-play. Great! I look forward to chatting again. Take care!", 24000); await T.tick(2500)
  check('4: the results show', !!T.$('.apn-done'), txt('.panelBox'))
  // 5. the classroom still follows the tutor: its voice command line moves on at once, with no note needed
  await say('ai', 'Now, let\'s try a voice command. In your lessons, just say, open the course, and a course lesson opens. Try it now!', 30000); await T.tick(800)
  check('5: the voice command step at once (its card, the panel closed)', txt('.wlc-tip .wlc-q') === '“Open the course”' && !T.$('.panelBox .apn'), txt('.aic'))
  check('5: …without a welcome command note', welcomeNote('command').length === 0, posts('welcome').join(' | '))
  await say('you', 'Open the course', 33000); await T.tick(1800)
  check('5: "Open the course": the preview', !!T.$('.app.wl-preview'), txt('#crumb'))
  await say('ai', 'Nice. So, on the screen now, you can see a course lesson slide.', 35000); await T.tick(800)
  await T.tick(8000)
  const nudge = posts('nudge').pop() || ''
  check('5: 8 s of silence: the nudge says the command was said ("command_said")', nudge.includes('"step":"command_said"'), posts('nudge').join(' | '))

  // 6. an ordinary lesson, a role-play in its last 5 minutes: an in-character "See you!" doesn't stop the classroom
  await act(async () => root.unmount())
  sessionStorage.clear(); localStorage.clear() // (a rejoin after a refresh skips the lobby)
  g.aiSessionResponse = null
  g.RP_LIST = g.RP_SCENES.map((sc, i) => ({ id: sc.id, category: sc.category, title: sc.title, summary: sc.summary, image: sc.image, role: sc.roles[0].name, otherRole: sc.roles[1].name, tasks: [], hasProp: !!sc.prop, cleared: 0, next: 0 }))
  const lesson = { ...join, aiWelcome: false, durationMinutes: 30, window: { start: iso(60000), end: iso(-29 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-89 * 60000), noShowAt: iso(-14 * 60000) } }
  ;({ root } = await T.run(lesson))
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  await say('ai', 'Hi Aiko! What would you like to do today?', 100); await T.tick(1500)
  const real = Date.now
  Date.now = () => real() + 25 * 60000 // the last 5 minutes
  await say('you', "Let's do the cafe one.", 2000); await T.tick(800)
  check('6: the role-play is on', !!T.$('.apn-mission'), txt('.panelBox'))
  await say('ai', 'Hi! What can I get for you?', 4000); await T.tick(300)
  await say('you', 'A coffee please.', 5000); await T.tick(800)
  await say('ai', 'Here you go. See you!', 7000); await T.tick(800)
  await say('ai', "That's the end of the role-play!", 10000); await T.tick(2500)
  check('6: the results', !!T.$('.apn-done'))
  await say('you', 'Could we open the course?', 14000); await T.tick(800)
  await say('ai', "Sure, I'll open the course now.", 15000); await T.tick(1500)
  const nOf = () => parseInt(T.$('.snav .n')?.textContent ?? '0', 10)
  check('6: the course opens', !!T.$('.snav .n') && nOf() === 1, T.$('.snav .n')?.textContent)
  // (a student turn on the slide first: a "next slide" before it is held as a slip)
  await say('you', 'Okay, I see a station.', 17000); await T.tick(800)
  await say('ai', "Okay, let's move on to the next slide.", 18000); await T.tick(800)
  check('6: …and "let\'s move on to the next slide" still moves it', nOf() === 2, nOf())
  Date.now = real

  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
