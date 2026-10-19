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
  await T.run(join)
  await T.click(T.$('#joinBtn')); await T.tick(150)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  await emit({ type: 'session.output_transcript.delta', delta: 'Hi Aiko! ', start_ms: 100, end_ms: 400 })
  await T.tick(1300)
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  const student = (text, t0) => emit({ type: 'session.input_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 400 })
  const tutor = (text, t0) => emit({ type: 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 600 })
  const nextSlide = (id) => emit({ type: 'response.event', delegation_id: id, event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'next_slide', arguments: '{}', call_id: id } } })
  const slideNotes = () => g.log.filter((l) => l.includes('/ai-context') && l.includes('"kind":"slide"'))
  const saved = (term) => g.log.some((l) => l.includes('/words') && l.includes('POST') && l.includes(term))
  const prepares = () => g.log.filter((l) => l.includes('/ai-assist') && l.includes('"mode":"prepare"')).length
  const fix = (was, now, ja) => ({ card: { kind: 'correction', was, now, ja, why: 'x' } })

  // ---- a course lesson, corrections "after each activity" (the default): the slide-change moment ----
  check('course open', !!T.$('.layout .slot.slideBox') && !T.$('.app.ai-lesson.no-course'))
  g.prepResponse = fix('I go to London', 'I went to London last year.', '去年ロンドンに行きました')
  await student('I go to London last year.', 2000); await T.tick(800)
  await tutor('Oh nice! What did you do there?', 3000); await T.tick(2200)
  check('course: a mistake the tutor let pass is no card', !T.$('.aic'))
  check('course: …and isn\'t saved yet (kept for the slide change)', !saved('I went to London last year.'))
  const notes0 = slideNotes().length
  await nextSlide('s1'); await T.tick(1500)
  const n1 = slideNotes()[notes0] || ''
  check('the next slide note carries it as fix: { was, now }', n1.includes('"fix":{"was":"I go to London last year.","now":"I went to London last year."}'), n1)
  check('no card before the tutor says it', !T.$('.aic'))
  await tutor('Before we go on: a more natural way is: I went to London last year. Can you say it?', 5000); await T.tick(200)
  check('the card appears when the tutor says "A more natural way is: <now>"', txt('.aic-now') === 'I went to London last year.', txt('.aic'))
  await student('I went to London last year.', 6000); await T.tick(1500)
  check('said it: saved', saved('I went to London last year.') && !T.$('.aic'))
  await tutor('Perfect! So, tell me about your family.', 6600); await T.tick(300)
  g.prepResponse = fix('She have two brother', 'She has two brothers.', '彼女には兄弟が二人います')
  await student('She have two brother.', 7000); await T.tick(800)
  await tutor('Great! Are they older or younger?', 8000); await T.tick(2200)
  check('course: the second mistake is kept too', !saved('She has two brothers.') && !T.$('.aic'))
  const notes1 = slideNotes().length
  await nextSlide('s2'); await T.tick(1500)
  const n2 = slideNotes()[notes1] || ''
  check('a second slide change within 2 minutes: no fix in its note', !!n2 && !n2.includes('"fix"'), n2)
  check('…and the leftover mistake is saved to the word list', saved('She has two brothers.'))

  // ---- free talk ----
  await student('I just want to chat now.', 9000)
  await tutor("No problem. I'll close the course now.", 10000); await T.tick(1500)
  check('free talk', !!T.$('.app.ai-lesson.no-course'))
  g.prepResponse = fix('one coffee hot', 'Could I get a hot coffee, please?', 'ホットコーヒーをいただけますか')
  await student('Can I have one coffee hot?', 11000); await T.tick(800)
  await tutor('Good try! A more natural way is: Could I get a hot coffee, please? Try it.', 12000); await T.tick(200)
  check('free talk: the card appears as the tutor says it', txt('.aic-now') === 'Could I get a hot coffee, please?', txt('.aic'))
  await T.tick(10000)
  check('10 s of silence: the card stays up, nothing saved', txt('.aic-now') === 'Could I get a hot coffee, please?' && !saved('Could I get a hot coffee'))
  await T.tick(20500)
  check('30 s: saved anyway', saved('Could I get a hot coffee') && !T.$('.aic'))

  g.prepResponse = fix('I go to park', 'I went to the park yesterday.', '昨日公園に行きました')
  await student('I go to park yesterday with my dog.', 43000); await T.tick(800)
  await tutor('A more natural way is: I went to the park yesterday. Can you say it?', 44000); await T.tick(200)
  check('the park card', txt('.aic-now') === 'I went to the park yesterday.', txt('.aic'))
  const p0 = prepares()
  await student('I go to park yesterday.', 45000); await T.tick(1500)
  check('their try at the card is never prepared (checked) again', prepares() === p0, [p0, prepares()])
  check('a try that isn\'t the phrase: the card stays, not ticked', !!T.$('.aic') && !T.$('.aic-said') && !saved('I went to the park yesterday.'))
  await tutor('Almost! Nice try.', 46000); await T.tick(700)
  check('the tutor reacts: not saved straight away', !!T.$('.aic') && !saved('I went to the park yesterday.'))
  await T.tick(1000)
  check('…saved about 1.2 s later', saved('I went to the park yesterday.') && !T.$('.aic'))
  await T.tick(1000)

  g.prepResponse = fix('I go to the park', 'I went to the park yesterday.', '昨日公園に行きました')
  await student('I go to the park yesterday again.', 48000); await T.tick(800)
  await tutor('A more natural way is: I went to the park yesterday.', 49000); await T.tick(3500)
  check('the same phrase said again later: no second card', !T.$('.aic'), txt('.aic'))

  const words0 = g.log.filter((l) => l.includes('/words') && l.includes('POST')).length
  g.prepResponse = fix('I live here since', 'I have lived here for three years.', 'ここに三年住んでいます')
  await student('I live here since three years.', 53000); await T.tick(800)
  await tutor('Oh, nice! Do you like it?', 54000); await T.tick(2200)
  check('free talk: a mistake the tutor didn\'t correct is saved quietly (no card)', saved('I have lived here for three years.') && !T.$('.aic'), g.log.filter((l) => l.includes('/words') && l.includes('POST')).slice(words0).join(' | '))

  // a pause split the word ("aroma" … "therapist"): the tutor's "correction" is what they said, so no card and nothing saved
  const words1 = g.log.filter((l) => l.includes('/words') && l.includes('POST')).length
  g.prepResponse = fix("I'm an aroma", "I'm an aromatherapist.", '私はアロマセラピストです')
  await student("Hi Tom, I'm from Tokyo and I'm an aroma", 60000); await T.tick(800)
  await student('therapist', 63000); await T.tick(800)
  await tutor("A more natural way is: I'm an aromatherapist. Can you try that?", 64000); await T.tick(3000)
  const newWords = g.log.filter((l) => l.includes('/words') && l.includes('POST')).slice(words1)
  check('a word split by a pause: no card', !T.$('.aic'), txt('.aic'))
  check('…and nothing saved to the word list', newWords.length === 0, newWords.join(' | '))
  g.prepResponse = null

  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
