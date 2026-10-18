import { allowedActions, checkEvidence, validateDecision, actionPrompt, namesLesson, type Screen } from '@/lib/ai-tutor/actions'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const free: Screen = { view: 'free', board: false }
const course: Screen = { view: 'course', board: false, course: { id: 'c_greatbritain', title: 'Haruka in the UK: Part 1', lesson: 2, slideNo: 4, total: 23, furthest: 4, reviewing: false } }
const picker: Screen = { view: 'picker', board: false, pickerMode: 'rp' }
const rp: Screen = { view: 'roleplay', board: false, roleplay: 'Ordering at a café abroad' }
const lists = { courses: [{ id: 'c_greatbritain', title: 'Haruka in the UK: Part 1' }, { id: 'c_gbintermediate', title: 'Haruka in the UK: Part 2' }], scenes: [{ id: 'cafe-abroad', title: 'Ordering at a café abroad' }, { id: 'izakaya-guests', title: 'Serving foreign guests at an izakaya' }] }
const L = (...p: [('s' | 't'), string][]) => p.map(([f, text]) => ({ from: f === 's' ? 'student' as const : 'tutor' as const, text }))
const V = (raw: object, screen: Screen, lines: ReturnType<typeof L>) => validateDecision(raw, screen, lists, lines).action

// 1. possible now
ok('free talk: can open a course / role-plays, never close a course', allowedActions(free).includes('open_course') && allowedActions(free).includes('open_roleplays') && !allowedActions(free).includes('close_course'))
ok('course: can close, no panel actions, no slide moves (slide check owns them)', allowedActions(course).includes('close_course') && !allowedActions(course).includes('open_roleplays') && !allowedActions(course).includes('start_roleplay') && !allowedActions(course).includes('next'))
ok('picker: can close or start, not open the list again', allowedActions(picker).includes('close_panel') && allowedActions(picker).includes('start_roleplay') && !allowedActions(picker).includes('open_roleplays'))
ok('role-play: only close it (and the whiteboard)', JSON.stringify(allowedActions(rp)) === JSON.stringify(['none', 'board_on', 'close_panel']))
ok('wrapping up: nothing at all', JSON.stringify(allowedActions({ ...course, wrappingUp: true })) === JSON.stringify(['none']))
ok('close_course in free talk is refused', V({ action: 'close_course', quote: 'close the course' }, free, L(['s', 'Can you close the course?'])).kind === 'none')
ok('start_roleplay with a made-up id is refused', V({ action: 'start_roleplay', id: 'karaoke', quote: "let's do karaoke" }, free, L(['s', "Let's do karaoke"])).kind === 'none')
ok('open_course with a made-up id is refused', V({ action: 'open_course', id: 'c_fake', quote: 'open the course' }, free, L(['s', 'Open the course please'])).kind === 'none')
ok('unknown action is refused', V({ action: 'delete_everything', quote: 'yes' }, free, L(['s', 'yes'])).kind === 'none')
ok('with a course open, open_course needs a different course or a lesson', V({ action: 'open_course', id: null, quote: 'open the course' }, course, L(['s', 'open the course'])).kind === 'none')
// 2. proof
ok('the live case: "open it up" after the student asked → open', V({ action: 'open_course', id: null, quote: 'could we open the course again' }, free, L(['t', 'Oh nice, what did you cook?'], ['s', "Uh, I'd love to tell you, but Tom, could we open the course again"], ['t', "Of course. I'll open it up for you."])).kind === 'open_course')
ok('a made-up quote is refused', V({ action: 'close_course', quote: 'please close the course' }, course, L(['s', 'I like this course a lot'])).kind === 'none')
ok('a tutor question alone is refused', V({ action: 'close_course', quote: 'Shall I close the course' }, course, L(['t', 'Shall I close the course?'])).kind === 'none')
ok('the student accepting the offer counts', V({ action: 'close_course', quote: 'Yes please' }, course, L(['t', 'Shall I close the course?'], ['s', 'Yes please.'])).kind === 'close_course')
ok('a tutor statement counts', V({ action: 'close_course', quote: "I'll close the course now" }, course, L(['t', "Sure. I'll close the course now."])).kind === 'close_course')
ok('Japanese request', V({ action: 'close_panel', quote: 'やっぱりフリートークで' }, picker, L(['s', 'やっぱりフリートークでお願いします'])).kind === 'close_panel')
ok('named role-play', JSON.stringify(V({ action: 'start_roleplay', id: 'izakaya-guests', quote: "let's do the izakaya one" }, picker, L(['s', "Hmm, let's do the izakaya one."]))) === JSON.stringify({ kind: 'start_roleplay', sceneId: 'izakaya-guests' }))
ok('open a named course + lesson', JSON.stringify(V({ action: 'open_course', id: 'c_gbintermediate', lesson: 3, quote: 'lesson 3 of part 2' }, free, L(['s', 'Can we do lesson 3 of part 2?']))) === JSON.stringify({ kind: 'open_course', courseId: 'c_gbintermediate', lesson: 3 }))
ok('quote matching ignores punctuation and case', checkEvidence('could we OPEN the course, again', L(['s', 'Could we open the course again?'])))
ok('a one-letter quote is refused', !checkEvidence('a', L(['s', 'a'])))
ok('garbage from the model is refused', validateDecision('nonsense', free, lists, L(['s', 'hi'])).action.kind === 'none' && validateDecision(null, free, lists, []).action.kind === 'none')
// the prompt only offers what's possible
const p = actionPrompt(course, lists, L(['s', 'hi']))
ok('prompt for a course offers close/open, not role-plays', p.system.includes('"close_course"') && !p.system.includes('"start_roleplay"') && !p.user.includes('ROLE-PLAYS'))
// the live test: "start the course again from the beginning" during lesson 2 must not open lesson 1
ok('live: "start the course again from the beginning" → no lesson switch', V({ action: 'open_course', id: 'c_greatbritain', lesson: 1, quote: 'I want to start the course again from the beginning' }, course, L(['s', 'oh, sorry I can I want to start the course again from the beginning'])).kind === 'none')
ok('…nor without an id', V({ action: 'open_course', id: null, lesson: 1, quote: 'start the course again from the beginning' }, course, L(['s', 'I want to start the course again from the beginning'])).kind === 'none')
ok('naming lesson 3 switches', JSON.stringify(V({ action: 'open_course', id: null, lesson: 3, quote: 'can we do lesson 3' }, course, L(['s', 'Actually, can we do lesson 3 instead?']))) === JSON.stringify({ kind: 'open_course', courseId: null, lesson: 3 }))
ok('the lesson already on screen: nothing', V({ action: 'open_course', id: null, lesson: 2, quote: 'lesson 2' }, course, L(['s', 'Is this lesson 2?'])).kind === 'none')
ok('a different course still works', V({ action: 'open_course', id: 'c_gbintermediate', lesson: null, quote: "let's do part 2" }, course, L(['s', "Let's do part 2 instead."])).kind === 'open_course')
ok('in free talk "from the beginning" may open the course (no number needed)', V({ action: 'open_course', id: null, lesson: null, quote: 'do the course from the beginning' }, free, L(['s', 'Can we do the course from the beginning?'])).kind === 'open_course')
for (const [q, n] of [['lesson 3', 3], ['lesson three', 3], ['the third lesson', 3], ['レッスン3', 3], ['第３課', 3], ['lesson no. 2', 2]] as const) ok(`names lesson ${n}: "${q}"`, namesLesson(q, n))
for (const [q, n] of [['from the beginning', 1], ['the first slide', 1], ['lesson 13', 3], ['3 slides', 3]] as const) ok(`doesn't name lesson ${n}: "${q}"`, !namesLesson(q, n))
ok('the prompt says restarts are not the judge\'s', actionPrompt(course, lists, L(['s', 'hi'])).system.includes('from the beginning'))
ok('the tutor alone can\'t start a role-play (its words as the quote)', V({ action: 'start_roleplay', id: 'cafe-abroad', quote: "Let's do a quick cafe role-play" }, free, L(['s', 'Hey Tom'], ['t', "Hey Connor! Let's do a quick cafe role-play."])).kind === 'none')
ok('…nor open a course', V({ action: 'open_course', id: null, quote: "I'll open the course now" }, free, L(['s', 'Hi'], ['t', "I'll open the course now."])).kind === 'none')
ok('the student asking still works', V({ action: 'start_roleplay', id: 'cafe-abroad', quote: 'can we do the cafe one' }, free, L(['s', 'Can we do the cafe one?'])).kind === 'start_roleplay')
ok('closing can still follow the tutor\'s statement', V({ action: 'close_course', quote: "I'll close the course now" }, course, L(['t', "Sure. I'll close the course now."])).kind === 'close_course')
console.log(bad ? bad + ' FAILED' : 'all passed')
process.exit(bad ? 1 : 0)
