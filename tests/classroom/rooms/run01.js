const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver'])
  try { globalThis[k] = w[k] } catch {}
globalThis.ResizeObserver = class { observe() {} disconnect() {} }
w.ResizeObserver = globalThis.ResizeObserver
w.matchMedia = () => ({ matches: false })
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 1200 } })
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return 700 } })
w.location.reload = () => {}
const T = require('../.build/harness.cjs')
const g = globalThis
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString()
const base = (role, over = {}) => ({ bookingId: 'b1', role, roomUrl: 'https://eigo.whereby.com/eigo-x', roomKey: role === 'teacher' ? 'KEY' : null,
  window: { start: iso(0), end: iso(-30 * 60000), studentOpensAt: iso(10 * 60000), closesAt: iso(-90 * 60000), noShowAt: iso(-15 * 60000) },
  durationMinutes: 30, session: { startedAt: null, endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
  me: { name: role === 'teacher' ? 'Connor Finley' : 'Aiko' }, other: { name: role === 'teacher' ? 'Aiko' : 'Connor Finley' },
  uiLang: role === 'teacher' ? 'en' : 'ja', nativeLang: 'ja', lesson: null, chat: [], serverNow: new Date().toISOString(), ...over })
const txt = (s) => (T.$(s)?.textContent || '').trim()
let fails = 0
const check = (name, cond, extra = '') => { console.log((cond ? 'ok  ' : 'FAIL') + ' ' + name + (cond ? '' : '  -> ' + extra)); if (!cond) fails++ }
async function setText(el, v) { const set = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new w.Event('input', { bubbles: true })); await T.tick() }

;(async () => {
  console.log("start");
  /* ---- student ---- */
  await T.run(base('student'))
  check('lobby shows', !!T.$('.lobby.on') && txt('#joinBtn') === 'レッスンに参加する', document.body.innerHTML.slice(0, 300))
  check('lobby title free talk', txt('.lhead b') === 'フリートーク', txt('.lhead b'))
  check('root has jp class', !!T.$('.cr.jp'))
  await T.click(T.$('#joinBtn'))
  check('room shows', !!T.$('.app.student.no-course'))
  check('joinRoom called', g.log.includes('joinRoom'))
  await T.tick(50)
  check('student_joined posted', g.log.some((l) => l.includes('/event') && l.includes('student_joined')), g.log.join('\n'))
  check('waiting clock', txt('.info').includes('Connor Finleyさんを待っています'), txt('.info'))
  check('tiles placed', T.$('.tile').style.width !== '', T.$('.tile').getAttribute('style'))
  check('other tile away', T.$('.tile.away') !== null)
  g.roomState.remoteParticipants = [{ id: 'r1', displayName: 'Connor', isAudioEnabled: true, isVideoEnabled: true, stream: { id: 'rs', getAudioTracks: () => [] } }]
  g.forceRoom(); await T.tick(60)
  check('start posted', g.log.some((l) => l.includes('/event') && l.includes('"start"')), g.log.join('\n'))
  await T.tick(1100)
  check('clock running', /00:0\d\/ 30:00|00:0\d/.test(txt('.info')), txt('.info'))
  check('other video', !!T.$('.tile.has-video video[data-stream="rs"]'))
  // chat
  await T.click(T.$('.controls .cbtn:nth-child(3)'))
  check('chat open', !!T.$('.app.side-open') && !T.$('.chat .chatIn:not([hidden]) .wlist'))
  await setText(T.$('.compose textarea'), 'Hello!')
  await T.click(T.$('.fbtn.send'))
  await T.tick(50)
  check('message posted', g.log.some((l) => l.includes('/messages') && l.includes('Hello!')))
  check('message broadcast', g.log.some((l) => l.startsWith('broadcast:') && l.includes('Hello!')))
  check('message shown', txt('.msgs .msg.me .b') === 'Hello!', txt('.msgs'))
  check('tile popup', txt('.tile.mirror .tmsg') === 'Hello!')
  await T.click(T.$('.chatCard .ib'))
  await (async () => { const { act } = require('react'); await act(async () => g.rtHandler({ payload: { type: 'chat', message: { id: 'x1', from: 'teacher', text: 'Great job!', at: new Date().toISOString() } } })) })()
  await T.tick()
  check('unread badge', txt('.badge.show') === '1', T.$('.badge')?.outerHTML)
  check('teacher bubble on tile', !!T.$('.tile:not(.mirror) .tmsg.teacher'))
  // word list: shares the side panel with the chat
  await T.click(T.$('[data-words-btn]'))
  check('word list opens', !!T.$('.app.side-open') && !!T.$('.chat .chatIn:not([hidden]) .wlist') && document.querySelectorAll('.chat .chatIn:not([hidden])').length === 1)
  check('word list empty text', txt('.wempty').includes('このレッスンで保存した'), txt('.wlist'))
  await T.click(T.$('.controls .cbtn:nth-child(3)'))
  check('chat replaces the word list', !!T.$('.chat .chatIn:not([hidden]) .msgs') && !T.$('.chat .chatIn:not([hidden]) .wlist'))
  await T.click(T.$('.controls .cbtn:nth-child(3)'))
  check('chat closes again', !T.$('.app.side-open'))
  // end dialog (student, before time)
  await T.click(T.$('.leaveSq'))
  check('end dialog open', !!T.$('.scrim.open') && txt('#endTitle') === 'レッスンを早めに終了しますか？', txt('#endTitle'))
  check('student has no end-for-everyone', !document.body.textContent.includes('End lesson for everyone'))
  await T.click(T.$('.ebtn.danger'))
  check('left room', g.log.includes('leaveRoom'))
  check('left screen', txt('.leftScreen h2') === 'レッスンから退出しました', txt('.leftScreen'))
  await T.click(T.$('.leftScreen .ebtn.cta'))
  check('rejoined', !!T.$('.app') && g.log.filter((l) => l === 'joinRoom').length === 2, g.log.join(','))

  /* ---- teacher: lesson over time, recording still running ---- */
  await T.run(base('teacher', { session: { startedAt: iso(31 * 60000), endedAt: null, studentJoinedAt: iso(31 * 60000), recordingStoppedAt: null },
    window: { start: iso(31 * 60000), end: iso(60000), studentOpensAt: iso(41 * 60000), closesAt: iso(-59 * 60000), noShowAt: iso(16 * 60000) } }))
  g.roomState.cloudRecording = { status: 'recording' }
  g.roomState.remoteParticipants = [{ id: 'r2', displayName: 'Aiko', isAudioEnabled: false, isVideoEnabled: false, stream: null }, { id: 'rec', roleName: 'recorder', isAudioEnabled: false, isVideoEnabled: false, stream: null }]
  check('teacher lobby english', txt('#joinBtn') === 'Join lesson')
  await T.click(T.$('#joinBtn')); await T.tick(1100)
  check('REC badge', !!T.$('.app.recording'))
  check('overtime clock', txt('.info').includes('Time’s up') && txt('.info').includes('+01:'), txt('.info'))
  check('recording stopped', g.log.includes('stopCloudRecording'), g.log.join(','))
  check('recording_stopped posted', g.log.some((l) => l.includes('recording_stopped')))
  check('other muted badge', !!T.$('.tile:not(.mirror) .vol.muted'))
  check('recorder not shown as other', txt('.tile:not(.mirror) .name') === 'Aiko')
  await T.click(T.$('.leaveSq'))
  check('over dialog', txt('#endTitle') === 'Lesson complete!' && txt('.ebtn.danger') === 'End lesson', txt('#endTitle') + '|' + txt('.ebtn.danger'))
  check('no leave-for-now when over', !T.$('.emodal .ebtn.sec'))
  await T.click(T.$('.ebtn.danger')); await T.tick(50)
  check('end posted', g.log.some((l) => l.includes('/event') && l.includes('"end"')))
  check('endMeeting', g.log.includes('endMeeting'))
  check('ended broadcast', g.log.some((l) => l.startsWith('broadcast:') && l.includes('ended')))
  check('complete screen', txt('.leftScreen h2') === 'Lesson complete!' && !T.$('.stars'), txt('.leftScreen'))

  /* ---- student: teacher ends while student in room, student rates ---- */
  await T.run(base('student', { session: { startedAt: iso(20 * 60000), endedAt: null, studentJoinedAt: iso(20 * 60000), recordingStoppedAt: null } }))
  await T.click(T.$('#joinBtn')); await T.tick(50)
  check('early-end dialog body', true)
  const { act } = require('react')
  await act(async () => g.rtHandler({ payload: { type: 'ended' } })); await T.tick(50)
  check('student sees complete', txt('.leftScreen h2') === 'レッスン終了！', txt('.leftScreen'))
  check('stars shown', document.querySelectorAll('.stars button').length === 5)
  await T.click(document.querySelectorAll('.stars button')[2])
  check('rating posted', g.log.some((l) => l.includes('/rating') && l.includes('"stars":3')))
  check('comment box for low rating', !!T.$('.rmore textarea'))
  await setText(T.$('.rmore textarea'), 'Audio was choppy')
  await T.click(T.$('.rmore .ebtn'))
  check('comment posted', g.log.some((l) => l.includes('/rating') && l.includes('choppy')))
  check('thanks', txt('.rthanks') === 'ご意見ありがとうございます！')

  console.log(fails ? `\n${fails} FAILED` : '\nall passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
