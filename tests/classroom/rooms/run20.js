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
  // the free 5-minute welcome call (lib/classroom/welcome.ts): its own rails, step by step
  const join = { bookingId: 'b1', role: 'student', ai: true, aiWelcome: true, roomUrl: null, roomKey: null,
    window: { start: iso(30000), end: iso(-5 * 60000), studentOpensAt: iso(11 * 60000), closesAt: iso(-65 * 60000), noShowAt: iso(-14 * 60000) },
    durationMinutes: 5, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
    me: { name: 'Aiko' }, other: { name: 'Emma' }, uiLang: 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
    open: null, chat: [], serverNow: new Date().toISOString() }
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  g.RP_SCENES = [require(REPO + '/src/lib/roleplay/scenes/travel/cafe-abroad.json')]
  g.CATALOG = [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', titleJa: 'イギリスでのハルカ 第1章', level: 'A2', description: 'x', descriptionJa: 'x', scenes: ['https://cdn/x.jpg'], lessonCount: 12, doneCount: 0 }]
  g.TICK = []
  g.turnResponse = (b) => ({ move: 'stay', slide: null, action: b.screen ? { kind: 'open_course', courseId: 'c_greatbritain' } : { kind: 'none' }, quote: 'open the course', ticks: b.roleplay ? g.TICK.filter((t) => !b.roleplay.done.includes(t.id)) : [] })
  const facts = { job: 'Nurse at a hospital in Osaka', why: 'Helping patients from abroad', likes: 'Cafés, Korean dramas' }
  g.welcomeAbout = (b) => ({ facts: b.lines.some((l) => /marketing/.test(l.text)) ? { ...facts, job: 'Marketing at a travel company' } : facts, pick: { sceneId: 'cafe-abroad', name: 'café', reasonJa: 'オーストラリア旅行の前に、カフェで注文してみよう', reasonEn: 'Practise ordering before your trip' } })
  await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  const ctx = () => g.log.filter((l) => l.includes('/ai-context'))
  const posts = (k) => ctx().filter((l) => l.includes(`"kind":"${k}"`))
  const welcomeNotes = (step) => posts('welcome').filter((l) => l.includes(`"step":"${step}"`))
  const fetched = (part) => g.log.filter((l) => l.startsWith('fetch POST') && l.includes(part))
  const say = async (from, text, t0) => emit({ type: from === 'you' ? 'session.input_transcript.delta' : 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 500 })
  await say('ai', "Hi Aiko! Welcome to eigo. I'm Emma, your AI tutor.", 100); await T.tick(1500)
  // 1) the rails: no courses, no whiteboard, no role-play list
  check('the top bar says ウェルカムトーク', txt('#crumb') === 'ウェルカムトーク', txt('#crumb'))
  check('no whiteboard or panel button', !T.$(`header .sq.tog[title="ロールプレイとコース"]`) && !document.querySelector('header .sq.tog [href="#i-board"]') && document.querySelectorAll('header .sq.tog').length === 1, document.querySelectorAll('header .sq.tog').length)
  check('no time notes but the goodbye (the welcome call has steps instead)', posts('time').length === 0, posts('time'))
  await say('you', 'Could we open the course?', 3000); await T.tick(800)
  await say('ai', "I'll open the course now.", 4000); await T.tick(1500)
  check('a course never opens (by the student, the tutor or the judge)', fetched('/ai-open').length === 0 && !T.$('.slideBox .slide'), fetched('/ai-open'))
  check('the action judge isn\'t asked (no screen sent)', !g.log.some((l) => l.includes('/ai-turn') && l.includes('"screen"')))
  // 2) getting to know them: the helper reads what they say
  await say('ai', 'So, what do you do, Aiko?', 6000); await T.tick(200)
  await say('you', "I'm a nurse at a hospital in Osaka. I want to help patients from abroad. I like cafés and Korean dramas.", 7000); await T.tick(2400)
  check('the helper is asked about them', fetched('/ai-welcome').some((l) => l.includes('"op":"about"')), fetched('/ai-welcome'))
  await T.tick(1200)
  // 3) three facts: the About-you card, and the tutor is told
  check('the About-you card, one row per fact', document.querySelectorAll('.wlc-row').length === 3 && txt('.wlc-row .wlc-v') === 'Nurse at a hospital in Osaka', txt('.wlc-rows'))
  check('the tutor gets the card note, with the facts', welcomeNotes('card').length === 1 && welcomeNotes('card')[0].includes('Nurse at a hospital'), welcomeNotes('card'))
  check('the tutor floats above the card (float mode)', T.$('.app').dataset.mode === 'float')
  // a spoken correction changes the line
  await say('ai', 'Does that look right?', 12000); await T.tick(200)
  await say('you', 'Actually, I work in marketing at a travel company.', 13000); await T.tick(2400)
  check('a correction: the helper reads it again and the line changes', txt('.wlc-row .wlc-v') === 'Marketing at a travel company', txt('.wlc-rows'))
  check('not saved by a correction', fetched('"op":"save"').length === 0)
  await say('ai', 'Got it, marketing. Is that right now?', 16000); await T.tick(200)
  await say('you', "Yes, that's right.", 17000); await T.tick(300)
  const sv = fetched('"op":"save"')
  check('"yes" saves it to About me, with the corrected line', sv.length === 1 && sv[0].includes('Marketing at a travel company'), sv)
  check('the card says it is saved', txt('.wlc-done') === '「About me」に保存しました')
  // 4) the role-play for them, opened by voice
  await T.tick(2600)
  check('the suggestion card: the scene, why, and the phrase to say', !!T.$('.wlc-say') && txt('.wlc-st b').startsWith('海外のカフェで注文') && txt('.wlc-st > span').startsWith('オーストラリア') && txt('.wlc-p') === "Let's do the café role-play", txt('.aic'))
  const sg = welcomeNotes('suggest')
  check('the tutor is told to teach the phrase (and that it was saved)', sg.length === 1 && sg[0].includes("Let's do the café role-play") && sg[0].includes('"saved":true'), sg)
  await say('you', 'OK', 22000); await T.tick(300)
  check('an "OK" before the tutor has spoken doesn\'t count', !T.$('.apn-mission'))
  await say('ai', "You can open things just by asking. Say: Let's do the café role-play.", 23000); await T.tick(200)
  await say('you', "Let's do the café", 24000); await T.tick(100)
  check('the words light up as they are heard', document.querySelectorAll('.wlc-p span.on').length >= 4, txt('.wlc-p'))
  await T.tick(900)
  check('…and the role-play opens at 初級', !!T.$('.apn-mission') && txt('.apn-lvl') === '初級' && document.querySelectorAll('.apn-goal').length === 3, txt('.panelBox'))
  check('the tutor gets the scene', posts('roleplay').length === 1 && posts('roleplay')[0].includes('"level":0'))
  // 5) the scene; then mission complete, welcome version
  g.TICK = [{ id: 'order', said: 'A coffee please' }, { id: 'size', said: 'Regular please' }, { id: 'pay', said: 'Card please' }]
  await say('ai', 'Hi! What can I get you?', 27000); await T.tick(200)
  await say('you', 'A coffee please. Regular please. Card please.', 28000); await T.tick(3800)
  check('ticks come from the turn check (role-play only)', document.querySelectorAll('.apn-goal.done').length === 3 && g.log.some((l) => l.includes('/ai-turn') && l.includes('"roleplay"')))
  await say('ai', "Here you go! That's the end of the role-play!", 31000); await T.tick(800)
  check('mission complete, without swap / again / next', !!T.$('.apn-done') && !T.$('.apn-acts') && txt('.apn-next') === 'まもなく次へ', T.$('.panelBox')?.innerHTML.slice(0, 200))
  const dn = posts('roleplay_done').pop() || ''
  check('the results go to the tutor (no swap offered)', dn.includes('"canSwap":false') && dn.includes('"welcome":true'), dn)
  check('progress recorded through the welcome route', fetched('"op":"record"').length === 1)
  await say('you', "Let's swap roles", 33000); await T.tick(400)
  check('"swap roles" does nothing in the welcome call', posts('roleplay').length === 1 && !!T.$('.apn-done'))
  await say('ai', 'Great job! A more natural way is: Could I get a regular coffee, please?', 34000); await T.tick(300)
  check('the feedback appears on the screen', document.querySelectorAll('.apn-fbl').length === 2, txt('.apn-fb'))
  // 6) after the feedback and a pause: the tips (where courses come up); the panel goes
  await T.tick(3000)
  check('not before 8 s on mission complete', !T.$('.wlc-tip'))
  await T.tick(3500)
  check('then the tips card: three things to say in lessons', document.querySelectorAll('.wlc-tip').length === 3 && txt('.wlc-tip .wlc-q') === '“Open the course”' && !T.$('.panelBox .apn'), txt('.aic'))
  check('the tutor is told to mention them', welcomeNotes('tips').length === 1)
  await say('you', 'Open the course', 41000); await T.tick(1500)
  check('saying one now still opens nothing', fetched('/ai-open').length === 0 && !T.$('.slideBox .slide'))
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
