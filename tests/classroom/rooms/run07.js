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
  check('lobby is audio only (no camera picker or camera button)', document.querySelectorAll('.lobby label.dev').length === 2 && document.querySelectorAll('.lobby .lbtn').length === 1 && !!T.$('.lobby .lnote') && !T.$('.lobby video'), T.$('.lobby')?.textContent.slice(0, 200))
  await T.click(T.$('#joinBtn')); await T.tick(150)
  check('calling screen while connecting', !!T.$('.ai-calling:not(.out)') && T.$('.ai-calling').textContent.includes('呼び出し'))
  check('AI room rendered (no Whereby)', !!T.$('.app.ai-lesson') && !g.log.some((l) => l.includes('joinRoom')))
  check('AI layout: slide + floating tutor, no camera tiles', !!T.$('.layout .slot.slideBox') && document.querySelectorAll('.layout .slot.tile').length === 0 && !!T.$('.layout .slot.ai-float') && ['slide-side', 'slide-top'].includes(T.$('.app').dataset.mode), T.$('.app').dataset.mode)
  check('the tutor is placed, with a glow in its colour', T.$('.ai-float').style.width !== '' && !!T.$('.ai-float .ai-glow') && T.$('.ai-float').style.getPropertyValue('--tc').startsWith('rgb('), T.$('.ai-float').getAttribute('style'))
  check('the mic button carries the level ring', !!T.$('.controls .cbtn.mic-ring'))
  check('drawing toolbar + whiteboard button', !!T.$('.tbtn') && !!T.$('header .sq.tog'))
  const post = g.log.find((l) => l.includes('/ai-session'))
  check('offer sent to our server', !!post && post.includes('v=0 offer'), post)
  check('status connecting', T.$('.ai-status')?.textContent.includes('接続'), T.$('.ai-status')?.textContent)
  await emit({ type: 'session.started', session: { id: 'live_1' } })
  check('greeting requested on start', g.log.some((l) => l.includes('/ai-context') && l.includes('"kind":"start"')))
  check('still calling until the AI tutor speaks', !!T.$('.ai-calling:not(.out)'))
  await emit({ type: 'session.output_transcript.delta', delta: 'Hi Aiko! ', start_ms: 100, end_ms: 400 })
  check('calling screen waits for the intro reveal', !!T.$('.ai-calling:not(.out)'))
  await T.tick(1150)
  check('room shown once the AI tutor speaks and the reveal is over', !!T.$('.ai-calling.out'))
  check('live after session.started', !T.$('.ai-float').classList.contains('idle'))
  check('clock start + joined events posted', g.log.some((l) => l.includes('/event') && l.includes('"start"')) && g.log.some((l) => l.includes('student_joined')))
  check('start sends the slide on screen to the server', g.log.some((l) => l.includes('/ai-context') && l.includes('"kind":"start"') && l.includes('"slideId":"' + L1.slides[0].id + '"')), g.log.filter((l) => l.includes('ai-context')).join(' | '))
  // tutor asks to show slide 3
  await emit({ type: 'response.event', delegation_id: 'd0', event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'next_slide', arguments: '{}', call_id: 'call_0' } } })
  await emit({ type: 'response.event', delegation_id: 'd1', event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'next_slide', arguments: '{}', call_id: 'call_1' } } })
  check('slide moved to 3', T.$('.snav .n')?.textContent.trim().startsWith('3 /'), T.$('.snav .n')?.textContent)
  check('state saved for slide 3', true)
  const out = sent.find((e) => e.type === 'response.item.create' && e.item.call_id === 'call_1')
  check('tool result returned', out && out.item.call_id === 'call_1' && /slide 3/.test(out.item.output), JSON.stringify(out))
  check('response.create sent', sent.some((e) => e.type === 'response.create'))
  await T.tick(60)
  check('new slide sent to the server (content comes from the server)', g.log.some((l) => l.includes('/ai-context') && l.includes('"kind":"slide"') && l.includes(L1.slides[2].id)))
  // the student asks to see slide 1 again
  const tool = async (name, args, id) => { await emit({ type: 'response.event', delegation_id: 'r' + id, event: { type: 'response.output_item.done', item: { type: 'function_call', name, arguments: JSON.stringify(args), call_id: id } } }); await T.tick(60); return sent.filter((e) => e.type === 'response.item.create' && e.item.call_id === id).pop()?.item.output ?? '' }
  const fwd = await tool('go_back_to_slide', { slide: 8 }, 'gb0')
  check('cannot jump forward with go_back_to_slide', /Not a slide you can go back to/.test(fwd) && T.$('.snav .n').textContent.trim().startsWith('3 /'), fwd)
  const back = await tool('go_back_to_slide', { slide: 1 }, 'gb1')
  check('goes back to slide 1 on request', T.$('.snav .n').textContent.trim().startsWith('1 /') && /Showing slide 1/.test(back), back)
  check('review slide sent with where to return', g.log.some((l) => l.includes('"kind":"slide"') && l.includes('"review":{"returnTo":3}')))
  await tool('return_to_lesson', {}, 'gb2')
  check('returns to slide 3', T.$('.snav .n').textContent.trim().startsWith('3 /'), T.$('.snav .n').textContent)
  // write_in_chat
  await emit({ type: 'response.event', delegation_id: 'd2', event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'write_in_chat', arguments: '{"text":"to settle in = 慣れる"}', call_id: 'call_2' } } })
  const msgPost = g.log.find((l) => l.includes('/messages') && l.includes('asTutor'))
  check('tutor chat message posted as tutor', !!msgPost, g.log.filter((l) => l.includes('/messages')).join(' | '))
  // transcripts
  await emit({ type: 'session.input_transcript.delta', delta: 'I live in ', start_ms: 1000, end_ms: 1500 })
  await emit({ type: 'session.input_transcript.delta', delta: 'Osaka.', start_ms: 1500, end_ms: 1900 })
  await emit({ type: 'session.output_transcript.delta', delta: 'Lovely!', start_ms: 2100, end_ms: 2500 })
  // student chat → server instruction
  const ta = T.$('.chat textarea')
  await act(async () => {
    Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value').set.call(ta, 'What does settle mean?')
    ta.dispatchEvent(new w.Event('input', { bubbles: true }))
  })
  await act(async () => { T.$('.chat form.compose').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })) })
  await T.tick(80)
  const ctxPosts = () => g.log.filter((l) => l.includes('/ai-context'))
  check('chat message sent to the AI tutor', ctxPosts().some((l) => l.includes('"kind":"chat"') && l.includes('settle') && l.includes('live_1')), ctxPosts().join(' | '))
  // the AI tutor says it's moving on: the slide changes at once
  const nOf = () => parseInt(T.$('.snav .n').textContent, 10)
  await T.tick(3000)
  // a slip right after the slide appears (student hasn't spoken yet): held, AI tutor asked to let them try
  await emit({ type: 'response.event', delegation_id: 'x1', event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'next_slide', arguments: '{}', call_id: 'x1' } } })
  const held = nOf()
  await T.tick(2700)
  await emit({ type: 'session.output_transcript.delta', delta: "Here it is. Okay, next slide!", start_ms: 9000, end_ms: 9600 })
  check('slip right after a new slide is held', nOf() === held, held + ' -> ' + nOf())
  await T.tick(500) // (notes wait until the tutor has finished its sentence)
  await T.tick(1300) // (notes to the tutor wait for a pause in its speech)
  check('AI tutor asked to let the student try first', ctxPosts().some((l) => l.includes('"kind":"not_yet"')))
  // the student answers, then the AI tutor says it's moving on: instant
  await emit({ type: 'session.input_transcript.delta', delta: 'My landlady lives downstairs.', start_ms: 12000, end_ms: 13000 })
  await T.tick(1200)
  const turnsBefore = g.log.filter((l) => l.includes('/ai-turn')).length
  await emit({ type: 'session.output_transcript.delta', delta: "Perfect. Let's move on to the next slide.", start_ms: 16000, end_ms: 16600 })
  check('cue moves at once after the student has spoken', nOf() === held + 1 && g.log.filter((l) => l.includes('/ai-turn')).length === turnsBefore, held + ' -> ' + nOf())
  const turnBody = JSON.parse(g.log.filter((l) => l.includes('/ai-turn')).pop().split(' /api/classroom/b1/ai-turn ')[1])
  check('turn check only sends this slide\'s conversation', turnBody.lines.every((l) => !/settle/.test(l.text)) && turnBody.lines.length >= 1, JSON.stringify(turnBody.lines))
  // "I can't see it": the safety-net check moves it
  await T.tick(2700)
  g.turnResponse = { move: 'next', slide: null }
  const beforeSee = nOf()
  await emit({ type: 'session.input_transcript.delta', delta: "Sorry, I can't see the next slide.", start_ms: 20000, end_ms: 21000 })
  await T.tick(1300)
  g.turnResponse = null
  check('safety-net check moves the slide ("I can\'t see it")', nOf() === beforeSee + 1, beforeSee + ' -> ' + nOf())
  // a stray "let's move on" from the AI tutor right after a new slide: the safety-net check must not skip the slide
  await T.tick(2700)
  g.turnResponse = { move: 'next', slide: null }
  const beforeStray = nOf()
  await emit({ type: 'session.output_transcript.delta', delta: "Alright, let's move on to", start_ms: 22000, end_ms: 22500 })
  await T.tick(1300)
  g.turnResponse = null
  check('a stray "let\'s move on" before the student speaks doesn\'t skip the new slide', nOf() === beforeStray, beforeStray + ' -> ' + nOf())
  // the student's own buttons
  await T.tick(2700)
  const beforeBtn = nOf()
  await T.click(T.$('.snav button[aria-label="Next slide"]'))
  check('student Next button moves the slide', nOf() === beforeBtn + 1)
  await T.click(T.$('.snav button[aria-label="Previous slide"]'))
  check('student Back button goes back', nOf() === beforeBtn)
  await T.tick(60)
  // true/false activity on slide 17
  for (let k = 0; nOf() < 17 && k < 30; k++) await emit({ type: 'response.event', delegation_id: 'n' + k, event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'next_slide', arguments: '{}', call_id: 'n' + k } } })
  await T.tick(60)
  const tfBtn = [...document.querySelectorAll('.es-tf-row.is-current button')][0]
  check('true/false buttons on slide 17', !!tfBtn)
  if (tfBtn) { await T.click(tfBtn); await T.tick(1700) }
  check('activity answer sent to the AI tutor', ctxPosts().some((l) => l.includes('"kind":"activity"') && l.includes('True or false, statement 1')), ctxPosts().join(' | '))
  await T.tick(10500)
  check('silence nudge asks the AI tutor to lead', ctxPosts().filter((l) => l.includes('"kind":"nudge"')).length === 1, ctxPosts().join(' | '))
  // after a turn, the server's check says go back to slide 2
  await T.tick(3100)
  g.turnResponse = { move: 'back', slide: 2 }
  await emit({ type: 'session.input_transcript.delta', delta: 'Can we look at the vocabulary again?', start_ms: 20000, end_ms: 21000 })
  await T.tick(1300)
  g.turnResponse = null
  check('turn check moves the slide (back to 2)', nOf() === 2 && g.log.some((l) => l.includes('/ai-turn')), nOf())
  // report a problem: one tap sends
  await T.click(T.$('.rwrap .sq'))
  check('report popover opens with 4 options', document.querySelectorAll('.rpop .ropt').length === 4)
  await T.click(document.querySelectorAll('.rpop .ropt')[0]); await T.tick(80)
  const rep = g.log.find((l) => l.includes('/ai-report'))
  check('one tap sends the report with the slide and recent conversation', !!rep && rep.includes('"reason":"slide"') && rep.includes('"slideNo"') && rep.includes('recent') && !T.$('.rpop'), rep)
  await T.click(T.$('.rwrap .sq'))
  await T.click(document.querySelectorAll('.rpop .ropt')[3])
  check('その他 shows a one-line box', !!T.$('.rpop .rfield input'))
  await T.click(T.$('.rwrap .sq')); await T.tick(30)
  // the AI tutor opens a course lesson
  await emit({ type: 'response.event', delegation_id: 'd9', event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'open_lesson', arguments: '{"course_id":"c_greatbritain","lesson_id":""}', call_id: 'call_9' } } })
  await T.tick(100)
  const openOut = sent.find((e) => e.type === 'response.item.create' && e.item.call_id === 'call_9')
  check('open_lesson resolved by the server', g.log.some((l) => l.includes('/ai-open') && l.includes('"lessonId":""')) && /Opened Great Britain, lesson 2/.test(openOut?.item.output ?? ''), openOut?.item.output)
  const sessionsBefore = g.log.filter((l) => l.includes('/ai-session')).length
  await T.tick(600)
  const L2 = g.COURSE.units[0].lessons[1]
  check('no reconnect when a lesson opens', g.log.filter((l) => l.includes('/ai-session')).length === sessionsBefore && !!T.$('.ai-calling.out'))
  const ctx2 = ctxPosts()
  const iLesson = ctx2.findIndex((l) => l.includes('"kind":"lesson"') && l.includes(L2.id))
  const iSlide = ctx2.findIndex((l) => l.includes('"kind":"slide"') && l.includes(L2.slides[0].id))
  check('lesson note sent, then the first slide', iLesson >= 0 && iSlide > iLesson, iLesson + ' ' + iSlide)
  check('new lesson on screen', T.$('#crumb').textContent.includes(L2.title), T.$('#crumb').textContent)
  await emit({ type: 'session.output_transcript.delta', delta: 'Here we go. ', start_ms: 100, end_ms: 400 })
  // the AI tutor plays the video on lesson 2, slide 3
  for (let k = 0; nOf() < 3 && k < 5; k++) await emit({ type: 'response.event', delegation_id: 'v' + k, event: { type: 'response.output_item.done', item: { type: 'function_call', name: 'next_slide', arguments: '{}', call_id: 'v' + k } } })
  await T.tick(100)
  const playsBefore = g.plays
  await emit({ type: 'session.output_transcript.delta', delta: 'Shall I press play?', start_ms: 30000, end_ms: 30500 })
  await T.tick(1100)
  check('a question does not start the clip', g.plays === playsBefore)
  await emit({ type: 'session.input_transcript.delta', delta: 'Yes please.', start_ms: 31000, end_ms: 31500 })
  await emit({ type: 'session.output_transcript.delta', delta: "Great, I'll press play now.", start_ms: 32000, end_ms: 32600 })
  await T.tick(300)
  check('waits until the AI tutor finishes', g.plays === playsBefore)
  await T.tick(900)
  check('then plays the slide video', g.plays === playsBefore + 1 && g.lastPlayed === 'VIDEO', g.plays - playsBefore)
  // start the lesson again: slide 1, then the next cue goes to slide 2 (not back to where they were)
  const nBeforeRestart = nOf()
  await emit({ type: 'session.input_transcript.delta', delta: 'Can we start again from the beginning?', start_ms: 36000, end_ms: 36400 })
  await emit({ type: 'session.output_transcript.delta', delta: "Sure. Let's start this lesson again from the beginning.", start_ms: 37000, end_ms: 37600 })
  await T.tick(200)
  check('restart: slide 1', nOf() === 1, nBeforeRestart + ' -> ' + nOf())
  await T.tick(2600)
  await emit({ type: 'session.input_transcript.delta', delta: 'Okay.', start_ms: 38000, end_ms: 38200 })
  await T.tick(2600)
  await emit({ type: 'session.output_transcript.delta', delta: "Great, let's move on to the next slide.", start_ms: 39000, end_ms: 39600 })
  await T.tick(200)
  check('after a restart the next slide is 2', nOf() === 2, nOf())
  // the screen follows what the AI tutor says (no tool call needed)
  const say = async (text, t0) => { await emit({ type: 'session.output_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 600 }); await T.tick(700) }
  await say('Shall I open the whiteboard?', 40000)
  check('a question does not open the whiteboard', !T.$('.app.ai-lesson.wb'))
  await emit({ type: 'session.input_transcript.delta', delta: 'Yes please.', start_ms: 41000, end_ms: 41400 })
  await say("Sure, I'll open the whiteboard now.", 42000)
  check('"I\'ll open the whiteboard now" opens it', !!T.$('.app.ai-lesson.wb'))
  await T.tick(1300) // (notes to the tutor wait for a pause in its speech)
  check('the AI tutor is told the board is up', ctxPosts().some((l) => l.includes('"what":"board_on"')))
  await emit({ type: 'session.input_transcript.delta', delta: 'Can we close it?', start_ms: 43000, end_ms: 43400 })
  await say("Of course. I'll close the whiteboard now.", 44000)
  check('"I\'ll close the whiteboard now" closes it', !T.$('.app.ai-lesson.wb'))
  await emit({ type: 'session.input_transcript.delta', delta: 'I just want to chat.', start_ms: 45000, end_ms: 45400 })
  await say("No problem. I'll close the course now.", 46000)
  await T.tick(100)
  await T.tick(1300) // (notes to the tutor wait for a pause in its speech)
  check('"I\'ll close the course now" switches to free talk', !!T.$('.app.ai-lesson.no-course') && ctxPosts().some((l) => l.includes('"what":"closed"')))
  const opensBefore = g.log.filter((l) => l.includes('/ai-open')).length
  await emit({ type: 'session.input_transcript.delta', delta: 'Actually, the course again please.', start_ms: 47000, end_ms: 47400 })
  await say("Okay, I'll open the course now.", 48000)
  await T.tick(300)
  check('"I\'ll open the course now" opens the current course', g.log.filter((l) => l.includes('/ai-open')).length === opensBefore + 1 && g.log.some((l) => l.includes('/ai-open') && l.includes('"courseId":""')) && !T.$('.app.ai-lesson.no-course'))
  const txt = (sel) => (T.$(sel)?.textContent || '').trim()
  // cards: prepared after the student's turn, so the complete card appears the moment the AI tutor says the correction
  const heardS = async (text, t0) => { await emit({ type: 'session.input_transcript.delta', delta: text, start_ms: t0, end_ms: t0 + 400 }) }
  const assists = (mode) => g.log.filter((l) => l.includes('/ai-assist') && (mode === 'prepare' ? l.includes('"mode":"prepare"') : !l.includes('"mode":"prepare"'))).length
  g.prepResponse = { card: { kind: 'correction', was: 'one coffee hot', now: 'Could I get a hot coffee, please?', ja: 'ホットコーヒーをいただけますか', why: '注文の定番' } }
  const prep0 = assists('prepare')
  await heardS('Can I have one coffee hot?', 50000)
  await T.tick(800)
  check('card prepared after the student stops', assists('prepare') === prep0 + 1, prep0 + ' -> ' + assists('prepare'))
  await emit({ type: 'session.output_transcript.delta', delta: 'Good try! A more natural way is: Could I get a hot ', start_ms: 51000, end_ms: 51400 })
  check('no card before the sentence is complete', !T.$('.aic'))
  await emit({ type: 'session.output_transcript.delta', delta: 'coffee, please?', start_ms: 51400, end_ms: 51800 })
  check('complete card appears as the AI tutor says it', txt('.aic-now') === 'Could I get a hot coffee, please?' && txt('.aic-why') === '注文の定番', txt('.aic'))
  check('the struck-through line is the helper\'s short version', txt('.aic-was') === 'one coffee hot', txt('.aic-was'))
  await emit({ type: 'session.output_transcript.delta', delta: ' Try it.', start_ms: 51800, end_ms: 52000 })
  await T.tick(1500)
  check('no second helper call when the prepared card fits', assists('turn') === 0, assists('turn'))
  g.prepResponse = null
  check('new words highlighted', [...document.querySelectorAll('.aic-now mark')].map((m) => m.textContent).join(' ').includes('Could'), T.$('.aic-now')?.innerHTML)
  await heardS('Could I get a hot coffee please', 52000)
  await T.tick(60)
  check('said it: ticked', !!T.$('.aic-said'))
  await T.tick(1000)
  check('saved to the word list as a tutor phrase', g.log.some((l) => l.includes('/words') && l.includes('"source":"tutor"') && l.includes('tutor:') && l.includes('ホットコーヒー')), g.log.filter((l) => l.includes('/words')).join(' | '))
  check('the AI tutor is not told about the saving', !ctxPosts().some((l) => l.includes('"what":"saved"')))
  check('card gone, undo pill', !T.$('.aic') && !!T.$('.aic-undo'))
  check('word list counts it', txt('[data-words-btn] .badge') === '1', txt('[data-words-btn] .badge'))
  await T.click(T.$('.aic-undo button')); await T.tick(60)
  check('undo removes it', g.log.some((l) => l.includes('/words') && l.includes('DELETE') && l.includes('tutor%3A')) && !T.$('.aic-undo'), g.log.filter((l) => l.includes('DELETE')).join(' | '))
  const nAssist = assists('turn'), nPrep = assists('prepare')
  await heardS('I like tea.', 53000)
  await emit({ type: 'session.output_transcript.delta', delta: 'Nice! What kind of tea?', start_ms: 54000, end_ms: 54500 })
  await T.tick(1500)
  check('no card helper call for an ordinary turn (only the quiet preparation)', assists('turn') === nAssist && assists('prepare') === nPrep + 1, [nAssist, assists('turn'), nPrep, assists('prepare')].join(','))
  // "How do I say…?": pick a version by voice; closing it saves nothing
  g.assistResponse = { card: { kind: 'say', heard: '窓側の席がいいです', options: [{ style: 'normal', text: 'Could I sit by the window?' }, { style: 'polite', text: 'Is it okay if I take the window seat?' }] } }
  await heardS('窓側の席がいいです', 55000)
  await emit({ type: 'session.output_transcript.delta', delta: 'In English you can say: Could I sit by the window?', start_ms: 56000, end_ms: 56600 })
  check('say card: no prepared card, so it waits for the helper and appears complete', txt('.aic-now') === 'Could I sit by the window?' && document.querySelectorAll('.aic-alt').length === 2, txt('.aic'))
  await T.tick(1500)
  check('say card shown', txt('.aic-now') === 'Could I sit by the window?' && document.querySelectorAll('.aic-alt').length === 2 && txt('.aic-heard').includes('窓側'), txt('.aic'))
  await heardS('The polite one please', 57000)
  await T.tick(60)
  check('voice picks the polite version', txt('.aic-now') === 'Is it okay if I take the window seat?' && txt('.aic-alt.on') === 'ていねい' && ctxPosts().some((l) => l.includes('"what":"chose"') && l.includes('"style":"polite"')))
  // switching version restarts the 7-second wait: 5 s + switch + 5 s = no save yet
  const postsNow = () => g.log.filter((l) => l.includes('/words') && l.includes('POST')).length
  const p0 = postsNow()
  await T.tick(5000)
  await T.click([...document.querySelectorAll('.aic-alt')].find((b) => b.textContent === 'ふつう')); await T.tick(5000)
  check('switching version restarts the auto-save wait', !!T.$('.aic') && postsNow() === p0)
  await T.click([...document.querySelectorAll('.aic-alt')].find((b) => b.textContent === 'ていねい')); await T.tick(60)
  const wordPosts = g.log.filter((l) => l.includes('/words') && l.includes('POST')).length
  await T.click(T.$('.aic-x')); await T.tick(60)
  check('closing the card saves nothing', !T.$('.aic') && g.log.filter((l) => l.includes('/words') && l.includes('POST')).length === wordPosts)
  // a slow helper: no card for up to 3 s, then the card without its reason line, which is added when it comes
  g.assistResponse = { card: { kind: 'correction', was: 'I go', now: 'Yesterday I went to the park.', ja: '昨日公園に行きました', why: '過去なので went' } }
  g.assistDelay = 5000
  await heardS('Yesterday I go to the park.', 58000)
  await emit({ type: 'session.output_transcript.delta', delta: 'Nice! A more natural way is: Yesterday I went to the park.', start_ms: 59000, end_ms: 59600 })
  await T.tick(1200)
  check('slow helper: nothing shown yet', !T.$('.aic'))
  await T.tick(2200)
  check('after 3 s the card shows anyway', txt('.aic-now') === 'Yesterday I went to the park.' && !T.$('.aic-why'), txt('.aic'))
  await T.tick(2200)
  check('the reason line is added when it arrives', txt('.aic-why') === '過去なので went', txt('.aic'))
  g.assistDelay = 0
  await T.click(T.$('.aic-x')); await T.tick(60)
  g.assistResponse = null
  // the AI tutor shows the whiteboard, goes back to the slides, then closes the lesson (free talk) (older sessions: tools)
  const wbOut = await tool('show_whiteboard', { on: true }, 'wb1')
  check('show_whiteboard: board on screen', !!T.$('.app.ai-lesson.wb') && /whiteboard is on/.test(wbOut), wbOut)
  const wbOff = await tool('show_whiteboard', { on: false }, 'wb2')
  check('show_whiteboard off: back to the slides', !T.$('.app.ai-lesson.wb') && /Back to the slides/.test(wbOff), wbOff)
  const closeOut = await tool('close_lesson', {}, 'cl1')
  await T.tick(100)
  check('close_lesson: free talk, course closed on the server', /free talk now/.test(closeOut) && !!T.$('.app.ai-lesson.no-course') && g.log.some((l) => l.includes('/state') && l.includes('"courseId":null')), closeOut)
  const closeAgain = await tool('close_lesson', {}, 'cl2')
  check('close_lesson again: already free talk', /already free talk/.test(closeAgain), closeAgain)
  // reopen it for the rest of the test
  await tool('open_lesson', { course_id: 'c_greatbritain', lesson_id: '' }, 'reopen')
  await T.tick(300)
  // an early close (time left) keeps the student in the lesson and reconnects
  const before2 = g.log.filter((l) => l.includes('/ai-session')).length
  await emit({ type: 'session.closed', reason: 'connection_lost' })
  await T.tick(1800)
  check('early close does not end the lesson', !g.log.some((l) => l.includes('/event') && l.includes('"end"')) && !!T.$('.app.ai-lesson'))
  check('reconnects by itself', g.log.filter((l) => l.includes('/ai-session')).length === before2 + 1)
  await emit({ type: 'session.started', session: { id: 'live_3' } })
  await emit({ type: 'session.output_transcript.delta', delta: 'Welcome back. ', start_ms: 100, end_ms: 400 })
  // the clock reaching 00:00 ends the lesson by itself (no session.closed needed)
  const realNow = Date.now
  Date.now = () => realNow() + 29 * 60000 + 30_000
  await T.tick(1300)
  check('00:00 ends the lesson on its own', g.log.some((l) => l.includes('/event') && l.includes('"end"')) && sent.some((e) => e.type === 'session.close'))
  await emit({ type: 'session.closed', reason: 'expired', usage: { seconds: 1800 } })
  await T.tick(80)
  const trs = g.log.filter((l) => l.includes('/ai-transcript'))
  const tr = trs[trs.length - 1]
  check('final transcript saved', !!tr && tr.includes('"final":true') && tr.includes('Welcome back.') && trs.some((l) => l.includes('I live in Osaka.') && l.includes('Lovely!')), trs.join(' | '))
  check('end event posted', g.log.some((l) => l.includes('/event') && l.includes('"end"')))
  await T.tick(1700)
  check('left screen shown', !!T.$('.leftScreen.on') || !T.$('.app.ai-lesson'), document.body.innerHTML.slice(0, 200))
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
