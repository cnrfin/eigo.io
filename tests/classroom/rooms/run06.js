const REPO = require('path').resolve(__dirname, '../../..')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://eigo.io/classroom/b1', pretendToBeVisual: true })
const w = dom.window
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLVideoElement', 'HTMLMediaElement', 'HTMLCanvasElement', 'Node', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'CustomEvent', 'EventTarget', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver', 'NodeFilter', 'Range', 'Text'])
  try { globalThis[k] = w[k] } catch {}
globalThis.sessionStorage = w.sessionStorage; globalThis.localStorage = w.localStorage
const hls = new Map()
globalThis.CSS = { escape: (s) => s, highlights: { set: (k, v) => hls.set(k, v), delete: (k) => hls.delete(k) } }
globalThis.Highlight = class { constructor(...r) { this.ranges = r } }
w.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 2000, top: 0, bottom: 2000, width: 2000, height: 2000 })
let caretTarget = null
w.document.caretRangeFromPoint = () => { if (!caretTarget) return null; const r = w.document.createRange(); r.setStart(caretTarget.node, caretTarget.offset); return r }
globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([]) } disconnect() {} }
w.ResizeObserver = globalThis.ResizeObserver
w.matchMedia = () => ({ matches: false })
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return this.classList?.contains('slideBox') ? parseFloat(this.style.width) || 0 : 1200 } })
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return 700 } })
const paints = { strokes: 0 }
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: (t, k) => (k === 'stroke' ? () => paints.strokes++ : k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) })
}
w.HTMLMediaElement.prototype.play = () => Promise.resolve()
w.HTMLMediaElement.prototype.pause = () => {}
const g = globalThis
g.COURSE = require(REPO + '/studio/data/courses/c_greatbritain/course.json')
const T = require('../.build/harness.cjs')
const { act } = require('react')
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString()
const L1 = g.COURSE.units[0].lessons[0]
const base = (role, over = {}) => ({ bookingId: 'b1', role, roomUrl: 'https://eigo.whereby.com/eigo-x', roomKey: role === 'teacher' ? 'KEY' : null,
  window: { start: iso(0), end: iso(-30 * 60000), studentOpensAt: iso(10 * 60000), closesAt: iso(-90 * 60000), noShowAt: iso(-15 * 60000) },
  durationMinutes: 30, session: { startedAt: iso(60000), endedAt: null, studentJoinedAt: null, recordingStoppedAt: null },
  me: { name: role === 'teacher' ? 'Connor Finley' : 'Aiko' }, other: { name: role === 'teacher' ? 'Aiko' : 'Connor Finley' },
  uiLang: role === 'teacher' ? 'en' : 'ja', nativeLang: 'ja', lesson: null, whiteboard: false, ink: {},
  open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: null }, chat: [], serverNow: new Date().toISOString(), ...over })
const txt = (s) => (T.$(s)?.textContent || '').trim()
let fails = 0
const check = (name, cond, extra = '') => { console.log((cond ? 'ok  ' : 'FAIL') + ' ' + name + (cond ? '' : '  -> ' + extra)); if (!cond) fails++ }
const bc = () => g.log.filter((l) => l.startsWith('broadcast:')).map((l) => JSON.parse(l.slice(10)))
const key = async (k, o = {}) => { await act(async () => { w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, ...o })) }); await T.tick() }
const ptr = async (el, type, x, y) => { await act(async () => { const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); Object.defineProperty(e, 'pointerId', { value: 1 }); Object.defineProperty(e, 'pointerType', { value: 'mouse' }); el.dispatchEvent(e) }) }
const stroke = async (pts) => { const cv = T.$('#ink'); await ptr(cv, 'pointerdown', ...pts[0]); for (const p of pts.slice(1)) { await ptr(cv, 'pointermove', ...p); await T.tick(40) } await ptr(cv, 'pointerup', ...pts[pts.length - 1]); await T.tick() }
;(async () => {
  const L1slides = L1.slides
  const dlg = L1slides.findIndex((x) => x.blocks.some((b) => b.type === 'dialogue'))
  const tfi = L1slides.findIndex((x) => x.blocks.some((b) => b.type === 'truefalse'))
  const vci = L1slides.findIndex((x) => x.blocks.some((b) => b.type === 'vocab'))
  /* student */
  await T.run(base('student', { open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1slides[dlg].id } }))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  check('saved words loaded', g.log.some((l) => l.includes('GET /api/classroom/b1/words')))
  const bubble = T.$('.slideBox .es-bubble')
  const tn = (() => { const tw = document.createTreeWalker(bubble, 4); let n; while ((n = tw.nextNode())) if (/[A-Za-z]{4,}/.test(n.data) && !n.parentElement.closest('.es-sr-only')) return n })()
  const m = tn.data.match(/[A-Za-z]{4,}/); caretTarget = { node: tn, offset: m.index + 1 }
  const word = m[0]
  console.log('DBG', word, tn.parentElement.className, !!document.caretRangeFromPoint, typeof document.caretPositionFromPoint)
  await ptr(T.$('.slideBox .stage'), 'pointerdown', 10, 10); await ptr(T.$('.slideBox .stage'), 'pointerup', 10, 10); await T.tick(60)
  check('lookup sent', g.log.some((l) => l.includes('/lookup') && l.includes(word)), g.log.filter((l)=>l.includes('lookup')).join())
  check('popup shows result', txt('.lkPop .lk-h b') === word.toLowerCase() && txt('.lkPop .lk-ja') === 'テスト', T.$('.lkPop')?.textContent)
  check('selection highlighted', hls.has('lk-sel'))
  await T.click(T.$('.lkPop .lk-save')); await T.tick(50)
  check('word saved', g.log.some((l) => l.includes('POST /api/classroom/b1/words') && l.includes('"source":"lookup"') && l.includes('lk:' + word.toLowerCase())))
  check('saved toast', txt('.toast') === '「' + word.toLowerCase() + '」をフレーズに追加しました！', txt('.toast'))
  check('popup closed', !T.$('.lkPop'))
  check('saved word painted teal', hls.has('lk-saved'))
  // vocab + button
  await act(async () => g.rtHandler({ payload: { type: 'open', open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1slides[vci].id } } })); await T.tick(50)
  const plus = T.$('.slideBox .es-vsave')
  check('vocab + is live for the student', !!plus && !plus.classList.contains('is-preview'))
  await T.click(plus); await T.tick(50)
  check('vocab word saved from course', g.log.some((l) => l.includes('POST /api/classroom/b1/words') && l.includes('"source":"course"') && l.includes('"courseId":"c_greatbritain"')))
  check('vocab + shows saved', T.$('.slideBox .es-vsave').classList.contains('is-saved'))
  // true / false
  await act(async () => g.rtHandler({ payload: { type: 'open', open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1slides[tfi].id } } })); await T.tick(50)
  await T.click(T.$('.slideBox .es-tf-true')); await T.tick(50)
  check('answer synced', g.log.some((l) => l.startsWith('broadcast:') && l.includes('"type":"act"')) && g.log.some((l) => l.includes('/activity')))
  check('answer toast', /Correct|Not quite/.test(txt('.toast')), txt('.toast'))
  const blockId = T.$('.slideBox .es-block-truefalse').dataset.blockId
  await act(async () => g.rtHandler({ payload: { type: 'act', blockId, state: { answers: [true, false] } } })); await T.tick(50)
  check('remote answers shown', document.querySelectorAll('.slideBox .es-tf-row.is-done').length === 2)
  // chat translation
  await act(async () => g.rtHandler({ payload: { type: 'chat', message: { id: 'tm1', from: 'teacher', text: 'Great job!', at: new Date().toISOString() } } })); await T.tick()
  await T.click(T.$('.controls .cbtn[aria-pressed]:not([aria-pressed="true"]) .cface')?.closest('button')?.textContent.includes('チャット') ? T.$('.controls button:nth-child(3)') : [...document.querySelectorAll('.controls .cbtn')].find((b) => b.textContent.includes('チャット')))
  const trb = T.$('.msg.teacher .trBtn')
  check('translate button on teacher message', !!trb)
  await T.click(trb); await T.tick(50)
  check('translation shown', txt('.msg.teacher .tr').startsWith('よくできました！'), txt('.msg.teacher .tr'))
  await T.click(T.$('.msg.teacher .tr .trs')); await T.tick(50)
  check('chat phrase saved', g.log.some((l) => l.includes('POST /api/classroom/b1/words') && l.includes('"source":"chat"') && l.includes('chat:tm1')))
  // word list: this lesson's saves, newest first, with the count on the button
  check('words button counts this lesson', txt('[data-words-btn] .badge') === '3', txt('[data-words-btn] .badge'))
  await T.click(T.$('[data-words-btn]')); await T.tick(30)
  const rows = [...document.querySelectorAll('.wlist .wr')]
  check('word list rows', rows.length === 3 && rows[0].querySelector('.wsrc').textContent === 'チャット' && rows[2].querySelector('.wsrc').textContent === '検索', rows.map((r) => r.textContent).join(' | '))
  await T.click(rows[0].querySelector('.wx')); await T.tick(50)
  check('remove from word list', document.querySelectorAll('.wlist .wr').length === 2 && g.log.some((l) => l.includes('DELETE /api/classroom/b1/words') && l.includes('chat%3Atm1')), g.log.filter((l) => l.includes('DELETE')).join(' '))
  await T.click(T.$('.wlist .ib')); await T.tick(10)
  // complete screen F
  await act(async () => g.rtHandler({ payload: { type: 'ended' } })); await T.tick(80)
  check('layout F', !!T.$('.leftScreen.layF') && txt('#reviewBtn') === '今すぐ復習' && T.$('#reviewBtn').getAttribute('href') === '/dashboard?tab=vocab', T.$('.leftScreen')?.className)
  check('saved chips', document.querySelectorAll('.wchips span.saved').length >= 2, txt('.wchips'))
  check('words line', /\d+語・\d+語を保存/.test(txt('.leftScreen p')), txt('.leftScreen p'))

  /* teacher: lookups but no save */
  localStorage.clear(); sessionStorage.clear()
  await T.run(base('teacher', { open: { courseId: 'c_greatbritain', lessonId: L1.id, slideId: L1slides[dlg].id } }))
  await T.click(T.$('#joinBtn')); await T.tick(80)
  const b2 = T.$('.slideBox .es-bubble'); const tw2 = document.createTreeWalker(b2, 4); let n2; while ((n2 = tw2.nextNode())) if (/[A-Za-z]{4,}/.test(n2.data) && !n2.parentElement.closest('.es-sr-only')) break
  caretTarget = { node: n2, offset: n2.data.match(/[A-Za-z]{4,}/).index + 1 }
  await ptr(T.$('.slideBox .stage'), 'pointerdown', 10, 10); await ptr(T.$('.slideBox .stage'), 'pointerup', 10, 10); await T.tick(60)
  check('teacher popup without save', !!T.$('.lkPop .lk-h') && !T.$('.lkPop .lk-save'))
  check('teacher does not load the word list', !g.log.some((l) => l.includes('GET /api/classroom/b1/words')))
  // pen tool: no lookup
  await key('Escape'); await T.click(T.$('.handle')); await key('p')
  const nl = g.log.filter((l) => l.includes('/lookup')).length
  await ptr(T.$('.slideBox .stage'), 'pointerdown', 10, 10); await ptr(T.$('.slideBox .stage'), 'pointerup', 10, 10); await T.tick(60)
  check('no lookup with the pen', g.log.filter((l) => l.includes('/lookup')).length === nl)
  console.log(fails ? `\n${fails} FAILED` : '\nall passed')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
