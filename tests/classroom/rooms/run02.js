const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver', 'CSS'])
  try { globalThis[k] = w[k] } catch {}
globalThis.CSS = { escape: (s) => s }
globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([]) } disconnect() {} }
w.ResizeObserver = globalThis.ResizeObserver
w.matchMedia = () => ({ matches: false })
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return this.classList?.contains('slideBox') ? parseFloat(this.style.width) || 0 : 1200 } })
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return 700 } })
const played = []
w.HTMLMediaElement.prototype.play = function () { played.push('play:' + this.closest('[data-block-id]')?.dataset.blockId); return Promise.resolve() }
w.HTMLMediaElement.prototype.pause = function () { played.push('pause') }
const g = globalThis
g.COURSE = require(REPO + '/studio/data/courses/c_greatbritain/course.json')
const T = require('../.build/harness.cjs')
const { act } = require('react')
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString()
const L1 = g.COURSE.units[0].lessons[0], L2 = g.COURSE.units[0].lessons[1]
const base = (role, over = {}) => ({ bookingId: 'b1', role, roomUrl: 'https://eigo.whereby.com/eigo-x', roomKey: role === 'teacher' ? 'KEY' : null,
  window: { start: iso(0), end: iso(-30 * 60000), studentOpensAt: iso(10 * 60000), closesAt: iso(-90 * 60000), noShowAt: iso(-15 * 60000) },
  durationMinutes: 30, session: { startedAt: iso(60000), endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
  me: { name: role === 'teacher' ? 'Connor Finley' : 'Aiko' }, other: { name: role === 'teacher' ? 'Aiko' : 'Connor Finley' },
  uiLang: role === 'teacher' ? 'en' : 'ja', nativeLang: 'ja', lesson: { courseTitle: 'Great Britain for Beginners', lessonTitle: L1.title, number: 1 },
  open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: null }, chat: [], serverNow: new Date().toISOString(), ...over })
const txt = (s) => (T.$(s)?.textContent || '').trim()
let fails = 0
const check = (name, cond, extra = '') => { console.log((cond ? 'ok  ' : 'FAIL') + ' ' + name + (cond ? '' : '  -> ' + extra)); if (!cond) fails++ }
const bc = () => g.log.filter((l) => l.startsWith('broadcast:'))
const key = async (k) => { await act(async () => { w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k })) }); await T.tick() }
;(async () => {
  /* teacher */
  await T.run(base('teacher'))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('course loaded', g.log.some((l) => l.includes('/course?courseId=c_greatbritain')))
  check('slide shown', !!T.$('.slideBox .es-canvas'), T.$('.slideBox')?.innerHTML.slice(0, 200))
  check('not free talk', !T.$('.app.no-course'))
  check('slide box placed', parseFloat(T.$('.slideBox').style.width) > 300, T.$('.slideBox').getAttribute('style'))
  check('layout side', T.$('.app').dataset.mode === 'side', T.$('.app').dataset.mode)
  check('crumb', txt('#crumb') === 'Lesson 1: ' + L1.title && txt('.ttl .course') === 'Haruka in the UK: Part 1', txt('.ttl'))
  check('count', txt('.snav .n') === `1 / ${L1.slides.length}`, txt('.snav .n'))
  check('stage scaled', /scale\(0\.\d+\)/.test(T.$('.stage').style.transform), T.$('.stage').style.transform)
  await T.click(T.$('.snav button[aria-label="Next slide"]'))
  check('next → 2', txt('.snav .n') === `2 / ${L1.slides.length}`)
  check('open broadcast', bc().some((b) => b.includes(L1.slides[1].id)))
  await T.tick(500)
  check('state saved', g.log.some((l) => l.includes('/state') && l.includes(L1.slides[1].id)), g.log.filter((l) => l.includes('/state')).join('\n'))
  await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight')
  check('arrow keys → 6', txt('.snav .n') === `6 / ${L1.slides.length}`, txt('.snav .n'))
  check('teacher view shows tutor blocks', !!T.$('.slideBox .es-tutor-tag'))
  await T.click(T.$('#notesBtn'))
  check('teacher view off hides them', !T.$('.slideBox .es-tutor-tag'))
  await key('n')
  check('N toggles back', !!T.$('.slideBox .es-tutor-tag'))
  await T.click(T.$('#gridBtn'))
  check('strip open with thumbs', !!T.$('.strip.open') && document.querySelectorAll('.thumb').length === L1.slides.length)
  await T.click(document.querySelectorAll('.thumb')[10])
  check('thumb jumps to 11', txt('.snav .n') === `11 / ${L1.slides.length}` && !T.$('.strip.open'))
  // media: local play broadcasts
  await T.click(document.querySelectorAll('.thumb')[3]); 
  const mb = T.$('.slideBox [data-block-id="b_28fc258a2a41"] video, .slideBox [data-block-id="b_28fc258a2a41"] audio')
  check('media element on slide 4', !!mb)
  if (mb) { await act(async () => { mb.dispatchEvent(new w.Event('play')) }); await T.tick() }
  check('media play broadcast', bc().some((b) => b.includes('"type":"media"') && b.includes('b_28fc258a2a41') && b.includes('play')), bc().slice(-2).join('\n'))
  // library
  await T.click(T.$('.controls .cbtn.teachOnly'))
  await T.tick(50)
  check('library open', !!T.$('.scrim.open .clist .course'), T.$('.scrim.open')?.innerHTML.slice(0, 200))
  check('current lesson marked', txt('.lesson.now .go') === 'In class now')
  check('L2 continue', [...document.querySelectorAll('.lesson')].some((b) => b.textContent.includes(L2.title) && b.textContent.includes('Continue')))
  const l2btn = [...document.querySelectorAll('.lesson')].find((b) => b.textContent.includes(L2.title))
  await T.click(l2btn)
  check('lesson 2 opened at saved slide', txt('#crumb') === 'Lesson 2: ' + L2.title && txt('.snav .n') === `5 / ${L2.slides.length}`, txt('#crumb') + ' ' + txt('.snav .n'))
  check('opened toast', txt('.toast') === 'Lesson opened for you and Aiko')
  await T.click(T.$('#closeCourse')); await T.tick(50)
  check('closed → free talk', !!T.$('.app.no-course') && txt('#crumb') === 'Free conversation')
  check('close broadcast', bc().some((b) => b.includes('"open":null')))
  check('close saved', g.log.some((l) => l.includes('/state') && l.includes('"courseId":null')))
  check('videos layout', T.$('.app').dataset.mode === 'videos')

  /* student */
  await T.run(base('student'))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('student sees slide', !!T.$('.slideBox .es-canvas'))
  check('student nav disabled', T.$('.snav button[aria-label="Next slide"]').disabled)
  check('no tutor blocks for student', !T.$('.slideBox .es-tutor-tag'))
  check('no library for student', !T.$('.controls .cbtn.teachOnly'))
  await T.tick(1600)
  check('student says hello', bc().some((b) => b.includes('"type":"hello"')))
  await act(async () => g.rtHandler({ payload: { type: 'open', open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1.slides[3].id } } })); await T.tick(50)
  check('student follows to 4', txt('.snav .n') === `4 / ${L1.slides.length}`)
  await key('ArrowRight')
  check('student arrow does nothing', txt('.snav .n') === `4 / ${L1.slides.length}`)
  await act(async () => g.rtHandler({ payload: { type: 'media', blockId: 'b_28fc258a2a41', action: 'play', time: 0 } })); await T.tick(50)
  check('remote play applied', played.includes('play:b_28fc258a2a41'), played.join(','))
  const before = bc().length
  const mel = T.$('.slideBox [data-block-id="b_28fc258a2a41"] video, .slideBox [data-block-id="b_28fc258a2a41"] audio')
  await act(async () => { mel.dispatchEvent(new w.Event('play')) }); await T.tick()
  check('no echo of remote play', bc().length === before, bc().slice(before).join('\n'))
  await act(async () => g.rtHandler({ payload: { type: 'open', open: null } })); await T.tick(50)
  check('student back to free talk', !!T.$('.app.no-course'))
  console.log(fails ? `\n${fails} FAILED` : '\nall passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
