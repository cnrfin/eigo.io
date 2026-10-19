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
  await emit({ type: 'session.output_transcript.delta', delta: 'Hi Aiko! ', start_ms: 100, end_ms: 400 })
  await T.tick(1300)
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  const panelBtn = () => T.$(`header .sq.tog[title="ロールプレイとコース"]`)
  check('free talk: the panel button is in the top bar', !!panelBtn())
  check('no panel yet', !T.$('.panelBox .apn'))
  check('nothing open: the tutor floats in the middle', T.$('.app').dataset.mode === 'float', T.$('.app').dataset.mode)
  const posts = (k) => ctx().filter((l) => l.includes(`"kind":"${k}"`))
  const goals = () => [...document.querySelectorAll('.apn-goal')]
  const ticked = () => document.querySelectorAll('.apn-goal.done').length
  // the turn check ticks whatever g.TICK says (only when it's asked about a role-play)
  g.TICK = []
  g.turnResponse = (b) => ({ move: 'stay', slide: null, action: { kind: 'none' }, quote: '', ticks: b.roleplay ? g.TICK.filter((t) => !b.roleplay.done.includes(t.id)) : [] })
  // 1) start the café role-play (中級): 4 tasks, the prop button
  await say('you', "Let's do the cafe one.", 1000); await T.tick(500)
  check('the mission is on screen (4 tasks, 中級)', !!T.$('.apn-mission') && goals().length === 4 && txt('.apn-lvl') === '中級', txt('.apn-mission'))
  check('the menu button is top right', txt('.apn-propbtn') === 'メニューを見る')
  await T.click(T.$('.apn-propbtn')); await T.tick(60)
  check('the menu opens over the checklist, and the button says close', !!T.$('.apn-prop.open') && txt('.apn-propbtn') === 'メニューを閉じる')
  await T.click(T.$('.apn-propbtn')); await T.tick(60)
  // 2) the tutor starts; the student is silent: hints after 6 s and 12 s, one step further each time
  await say('ai', 'Hi there! Welcome to Corner Café. What can I get for you today?', 3000); await T.tick(1200)
  check('no hint straight away', !T.$('.apn-hbox'))
  await T.tick(6200)
  check('after a silence: hint 1 (what to do, in Japanese)', txt('.apn-hv') === '飲み物を注文しましょう', txt('.apn-hbox'))
  await T.tick(6200)
  check('then hint 2 (a sentence starter)', txt('.apn-hv') === 'Could I get a …?', txt('.apn-hbox'))
  // 3) the student orders: the hint goes, the task is ticked with their words
  g.TICK = [{ id: 'order', said: 'Can I have a hot coffee' }]
  await say('you', 'Um, can I have a hot coffee?', 20000); await T.tick(1500)
  check('talking hides the hint', !T.$('.apn-hbox'))
  check('"order" is ticked, with what they said', ticked() === 1 && txt('.apn-goal.done .apn-said').includes('Can I have a hot coffee'), txt('.apn-goals'))
  // 4) "hint" asks for one straight away
  await say('ai', 'Sure! What size would you like?', 23000); await T.tick(300)
  await say('you', 'Hint please', 24000); await T.tick(300)
  check('"hint please" shows a hint at once', !!T.$('.apn-hbox') && txt('.apn-hv') === txt('.apn-hv'), txt('.apn-hbox'))
  // 5) the rest of the tasks: every task done → the tutor is told to end the scene
  g.TICK = [{ id: 'order', said: 'Can I have a hot coffee' }, { id: 'size', said: 'Regular please' }, { id: 'wifi', said: 'Is there wifi' }, { id: 'pay', said: 'Card please' }]
  await say('you', 'Regular please. Is there wifi? Card please.', 26000); await T.tick(1500)
  check('all 4 ticked', ticked() === 4, ticked())
  check('the tutor is told every task is done', posts('roleplay_tasks_done').length === 1)
  // 6) the tutor ends the scene: mission complete, progress recorded, feedback asked for
  g.RP_LIST[0].next = 2 // (what the refreshed list will say after this play)
  await say('ai', "Here you go, enjoy! That's the end of the role-play!", 30000); await T.tick(400)
  check('mission complete on screen', !!T.$('.apn-done') && txt('.apn-done .apn-k').includes('ミッションクリア'), T.$('.panelBox')?.innerHTML.slice(0, 120))
  check('progress recorded (POST /api/roleplay)', g.log.some((l) => l.startsWith('fetch POST') && l.includes('/api/roleplay ')), g.log.filter((l) => l.includes('/api/roleplay')))
  await T.tick(1300) // (notes to the tutor wait for a pause in its speech)
  const dn = posts('roleplay_done').pop() || ''
  check('the tutor gets the results and is asked for feedback (with swap)', dn.includes('"canSwap":true') && dn.includes('Regular please'), dn)
  check('the summary: each task with what they said', document.querySelectorAll('.apn-sr').length === 4 && txt('.apn-sr .apn-said').length > 3, txt('.apn-sum'))
  await say('ai', 'Great job! You asked about the Wi-Fi clearly. A more natural way is: Could I get a hot coffee? Would you like to swap roles?', 33000); await T.tick(300)
  check('the tutor\'s comments appear as it says them, without its corrections or questions', txt('.apn-fbx').includes('You asked about the Wi-Fi clearly') && !txt('.apn-fbx').includes('natural way') && !txt('.apn-fbx').includes('swap roles'), txt('.apn-fbx'))
  check('swap / again / next scene buttons', [...document.querySelectorAll('.apn-acts .apn-btn')].map((b) => b.textContent).join('|') === 'もう一度|役割を交代|次のシーン', [...document.querySelectorAll('.apn-acts .apn-btn')].map((b) => b.textContent))
  // 7) "let's swap roles": the student plays the barista
  g.TICK = [] // (the new play starts with nothing done)
  await say('you', "Yes, let's swap roles", 36000); await T.tick(500)
  await T.tick(1300) // (notes to the tutor wait for a pause in its speech)
  const rp = posts('roleplay').pop() || ''
  check('swapped: the student is now the barista (role b)', !!T.$('.apn-mission') && txt('.apn-muted').startsWith('あなた：店員') && rp.includes('"role":"b"') && ticked() === 0, txt('.apn-muted'))
  // 8) the twist (上級): after "wifi" is done, a new task appears marked 予想外
  await T.click(T.$('.apn-end')); await T.tick(100)
  await say('you', "Let's do the cafe one.", 40000); await T.tick(500)
  check('上級 this time (progress moved on)', txt('.apn-lvl') === '上級' && goals().length === 4, txt('.apn-lvl'))
  g.TICK = [{ id: 'order', said: 'latte with oat milk' }, { id: 'here', said: 'For here' }, { id: 'wifi', said: 'do you have wifi' }]
  await say('ai', 'Morning! What can I get started for you?', 42000); await T.tick(200)
  await say('you', "A latte with oat milk, for here. Oh, and do you have wifi?", 43000); await T.tick(3200)
  check('after "wifi": the twist\'s task appears, marked 予想外', goals().length === 5 && !!T.$('.apn-goal.twist') && txt('.apn-tw') === '予想外', txt('.apn-goals'))
  check('and the hint/mission keeps going (not complete yet)', !T.$('.apn-done') && posts('roleplay_tasks_done').length === 1)
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
