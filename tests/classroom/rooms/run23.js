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
  // what happened in real welcome calls, replayed (lib/classroom/welcome.ts, AiRoom's welcome talk)
  const join = { bookingId: 'b1', role: 'student', ai: true, aiWelcome: true, roomUrl: null, roomKey: null,
    window: { start: iso(30000), end: iso(-5 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-65 * 60000), noShowAt: iso(-14 * 60000) },
    durationMinutes: 5, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
    me: { name: 'Aiko' }, other: { name: 'Emma' }, uiLang: 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
    open: null, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  const base = REPO + '/src/lib/roleplay/scenes/'
  g.RP_SCENES = [require(base + 'travel/cafe-abroad.json'), require(base + 'service/salon-massage.json'), require(base + 'business/work-intro.json')]
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 0 }]
  g.TICK = []
  g.turnResponse = (b) => ({ move: 'stay', slide: null, action: { kind: 'none' }, quote: '', ticks: b.roleplay ? g.TICK.filter((t) => !b.roleplay.done.includes(t.id)) : [] })
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const posts = (k) => ctx().filter((l) => l.includes(`"kind":"${k}"`))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  const creates = () => sent.filter((e) => e.type === 'response.create').length
  // a new call: greeting, their introduction (the helper picks the role-play for them in the background)
  let root = null
  const call = async (sceneId) => {
    if (root) await act(async () => root.unmount())
    sessionStorage.clear(); localStorage.clear() // (a rejoin after a refresh skips the lobby)
    g.aiSessionResponse = { sessionId: 'live_1', sdp: 'v=0 answer', endsAt: new Date(Date.now() + 245_000).toISOString() }
    g.welcomeAbout = { facts: { job: 'Nurse in Tokyo', likes: 'Coffee', why: 'Travel' }, thin: [], pick: { sceneId, name: '', reasonJa: '', reasonEn: '' } }
    g.TICK = []
    ;({ root } = await T.run(join))
    await T.click(T.$('#joinBtn')); await T.tick(150)
    await emit({ type: 'session.started', session: { id: 'live_1' } })
    await say('ai', "Hi Aiko! I'm Emma, your AI tutor. Where are you from, and what do you do?", 100); await T.tick(1500)
    await say('you', "I'm from Tokyo. I'm a nurse. I like coffee, and I study English for travel.", 3000); await T.tick(2400)
    await T.tick(1500)
  }
  // the scene to its end (every task ticked), then the voice command: the classroom is at the command step
  const playToCommand = async (sc, t0) => {
    const tasks = sc.roles.find((r) => r.id === sc.studentRole).levels[0].tasks
    g.TICK = tasks.map((t) => ({ id: t.id, said: t.hints[2] }))
    await say('you', 'Yes.', t0); await T.tick(300)
    await say('ai', 'Hello, welcome!', t0 + 1000); await T.tick(200)
    await say('you', tasks.map((t) => t.hints[2]).join(' '), t0 + 2000); await T.tick(3800)
    await say('ai', "Thank you! That's the end of the role-play!", t0 + 8000); await T.tick(1200)
    await say('ai', 'Well done! Any questions about the role-play?', t0 + 10000); await T.tick(300)
    await say('you', 'No, it was clear.', t0 + 11000); await T.tick(1500)
    await say('ai', 'Now let\'s try a voice command. In your lessons, just say "Open the course", and a course lesson opens. Try it now!', t0 + 14000); await T.tick(800)
  }

  // A. the student's phrase never reached the transcript: the tutor's next turn (setting the scene) opens it
  await call('cafe-abroad')
  await say('ai', "That's very clear, thank you. Now I have a short role-play for you. In the classroom, you can open things just by asking. Please say, Let's do a role-play.", 12000); await T.tick(1500)
  check('A: the suggestion card', txt('.wlc-p') === "Let's do a role-play" && !!T.$('.wlc-st b'), txt('.aic'))
  check('A: the READY note (the scene, ready: true)', posts('roleplay').length === 1 && posts('roleplay')[0].includes('"ready":true') && posts('roleplay')[0].includes('"sceneId":"cafe-abroad"'), posts('roleplay').join(' | '))
  check('A: nothing opens yet', !T.$('.apn-mission'))
  await T.tick(1500)
  await say('ai', "Good morning. We're in a busy café abroad, and I'm the barista at the counter. You're the customer. Your tasks are on the screen. Are you ready?", 16000); await T.tick(300)
  check('A: no student line, but the tutor\'s next turn opens the role-play (mission view)', !!T.$('.apn-mission'), txt('.panelBox'))
  check('A: the suggestion card is gone (the step is the role-play)', !T.$('.wlc-p'))
  await T.tick(1500)
  check('A: no second role-play note (the tutor already has the scene)', posts('roleplay').length === 1, posts('roleplay').join(' | '))
  // G. the live session's events go with the transcript save
  await act(async () => { window.dispatchEvent(new w.Event('pagehide')) }); await T.tick(100)
  const saves = g.log.filter((l) => l.startsWith('fetch POST') && l.includes('/ai-transcript'))
  const evs = saves.flatMap((l) => JSON.parse(l.slice(l.indexOf('{'))).events ?? [])
  check('G: the transcript save carries an "events" array with welcome:roleplay', saves.length > 0 && saves.every((l) => Array.isArray(JSON.parse(l.slice(l.indexOf('{'))).events)) && evs.some((e) => /\bwelcome:roleplay$/.test(e)), evs.join(' | '))

  // D. "Open the course" and the tutor says nothing: it's asked to answer
  await playToCommand(g.RP_SCENES[0], 20000)
  check('D: the voice command step', txt('.wlc-tip .wlc-q') === '“Open the course”', txt('.aic'))
  const c0 = creates()
  await say('you', 'Open the course', 40000); await T.tick(4200)
  check('D: the tutor silent after "Open the course": a response.create within about 4 s', creates() > c0, [c0, creates()])
  // E. still nobody speaks: the silence note says where it is (they've said the command: "command_said")
  await T.tick(5000)
  const nudge = posts('nudge').pop() || ''
  check('E: the silence note carries "step":"command_said"', nudge.includes('"step":"command_said"'), posts('nudge').join(' | '))

  // B. the tutor was cut off while teaching the phrase, then set the scene
  await call('salon-massage')
  await say('ai', "Great! That makes sense. Okay, let's do a short role-play. In the classroom, you can open things", 12000); await T.tick(1500)
  check('B: the card for the cut-off teaching', txt('.wlc-p') === "Let's do a role-play", txt('.aic'))
  await T.tick(1500)
  await say('ai', "We're in a relaxation salon near a busy shopping street in Tokyo. You're the staff and I'm a tourist. Your tasks are on the screen. Are you ready?", 16000); await T.tick(300)
  check('B: the panel opens', !!T.$('.apn-mission'), txt('.panelBox'))
  // D, the other way: the tutor answers "Open the course" by itself, so nothing is sent
  await playToCommand(g.RP_SCENES[1], 20000)
  const c1 = creates()
  await say('you', 'Open the course', 40000); await T.tick(1000)
  await say('ai', 'Great, you did it!', 41000); await T.tick(4000)
  check('D: the tutor talks first: no response.create', creates() === c1, [c1, creates()])

  // C. not too early: "Go ahead, just say it!" is still the teaching
  await call('cafe-abroad')
  await say('ai', "Now I have a short role-play for you. In the classroom, you can open things just by asking. Please say, Let's do a role-play.", 12000); await T.tick(1500)
  check('C: the card', txt('.wlc-p') === "Let's do a role-play", txt('.aic'))
  await T.tick(4000)
  await say('ai', 'Go ahead, just say it!', 18000); await T.tick(1500)
  check('C: "Go ahead, just say it!" opens nothing', !T.$('.apn-mission'))
  await say('you', "Let's do a role-play", 21000); await T.tick(500)
  await say('ai', 'Great!', 22000); await T.tick(2200)
  check('C: the student says it: it opens', !!T.$('.apn-mission'), txt('.panelBox'))

  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
