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
g.COURSE = require(REPO + '/studio/data/courses/c_greatbritain/course.json')
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
  const turns = () => g.log.filter((l) => l.includes('/ai-turn')).length
  // the izakaya (初級: people, drinks, confirm). The tick check is slow (1.5 s) and only knows what's been said so far.
  g.turnDelay = 1500
  const ticksFor = (b) => {
    const said = (b.roleplay?.lines ?? []).filter((l) => l.from === 'student').map((l) => l.text).join(' ')
    const t = []
    if (/how many people/i.test(said)) t.push({ id: 'people', said: 'for how many people' })
    if (/anything to drink/i.test(said)) t.push({ id: 'drinks', said: 'Would you like anything to drink' })
    if (/so two draft beers/i.test(said)) t.push({ id: 'confirm', said: 'so two draft beers, and edamame, and two karaage' })
    return t.filter((x) => !b.roleplay.done.includes(x.id))
  }
  g.turnResponse = (b) => ({ move: 'stay', slide: null, action: { kind: 'none' }, quote: '', ticks: b.roleplay ? ticksFor(b) : [] })
  await say('you', "Let's do the izakaya one.", 1000); await T.tick(500)
  check('the izakaya mission (3 tasks)', document.querySelectorAll('.apn-goal').length === 3, txt('.apn-goals'))
  await T.tick(2600)
  await say('ai', "Hi! We'd like a table, please.", 4000); await T.tick(100)
  const t0 = turns()
  await say('you', 'Okay, for how many people?', 5000); await T.tick(1100) // the check for this is now running (1.5 s)
  // the student keeps talking while a check is running: that turn is checked straight after (not dropped)
  await say('ai', 'Two people.', 6000); await T.tick(100)
  await say('you', 'There is a table here. Would you like anything to drink?', 7000); await T.tick(4500)
  check('a turn during a running check is checked right after', turns() === t0 + 2 && document.querySelectorAll('.apn-goal.done').length === 2, [turns() - t0, document.querySelectorAll('.apn-goal.done').length])
  // the confirm, then the tutor ends AND gives feedback in one breath, before that tick is back
  await say('ai', 'Two draft beers, edamame and two karaage, please.', 12000); await T.tick(100)
  await say('you', 'Okay, so two draft beers, and edamame, and two karaage', 13000); await T.tick(100)
  await say('ai', "Great! That sounds perfect. That's the end of the role-play! You did well asking how many people. Would you like to swap roles, try it again, or try another scene?", 14000); await T.tick(300)
  check('mission complete', !!T.$('.apn-done'))
  check('the feedback said in the same breath shows (from after the end phrase)', document.querySelectorAll('.apn-fbl').length === 2 && txt('.apn-fb').startsWith('You did well'), txt('.apn-fb'))
  check('the tutor isn\'t given the results before the last check is back', posts('roleplay_done').length === 0)
  await T.tick(2500)
  const dn = posts('roleplay_done').pop() || ''
  check('the last check ticks "confirm": the results include it, nothing missed', dn.includes('so two draft beers') && dn.includes('"missed":[]'), dn)
  check('…and the screen shows all 3 ticked', document.querySelectorAll('.apn-ticks span.miss').length === 0 && document.querySelectorAll('.apn-ticks span').length === 3)
  check('progress recorded', g.log.some((l) => l.startsWith('fetch POST') && l.includes('/api/roleplay ')))
  // phrases to save
  const pr = [...document.querySelectorAll('.apn-pr')]
  check('phrases to keep are shown (up to 3)', pr.length >= 1 && pr.length <= 3 && txt('.apn-phr .apn-bl') === '覚えておきたいフレーズ', txt('.apn-phr'))
  check('the tutor is told about them', dn.includes('"phrases":['))
  const w0 = g.log.filter((l) => l.includes('/words') && l.startsWith('fetch POST')).length
  await T.click(pr[0].querySelector('.apn-prs')); await T.tick(200)
  check('saving a phrase saves it to the word list', g.log.filter((l) => l.includes('/words') && l.startsWith('fetch POST')).length === w0 + 1, g.log.filter((l) => l.includes('/words')).slice(-2))
  g.turnDelay = 0
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
