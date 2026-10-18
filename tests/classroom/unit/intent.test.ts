import { panelIntent } from '@/lib/roleplay/intent'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const items = {
  rp: [{ id: 'cafe-abroad', en: 'Ordering at a café abroad', ja: '海外のカフェで注文' }, { id: 'izakaya-guests', en: 'Serving foreign guests at an izakaya', ja: '居酒屋で外国人のお客さんを接客' }, { id: 'work-intro', en: 'Introducing yourself to an overseas colleague', ja: '海外の同僚に自己紹介' }],
  course: [{ id: 'c1', en: 'Haruka in the UK: Part 1', ja: 'イギリスでのハルカ 第1章' }],
}
const I = (t: string, who: 'student' | 'tutor', p: 'picker' | 'roleplay' | null, mode: 'rp' | 'course' = 'rp') => panelIntent(t, who, p, items, mode)
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
// opening
ok('student: "Can you show me the role-plays?" opens', eq(I('Can you show me the role-plays?', 'student', null), { kind: 'open', mode: 'rp' }))
ok('student: "I want to try a role-play" opens', eq(I('I want to try a role-play.', 'student', null), { kind: 'open', mode: 'rp' }))
ok('student: ロールプレイを見せて opens', eq(I('ロールプレイを見せてください', 'student', null), { kind: 'open', mode: 'rp' }))
ok('tutor: "Sure! Let\'s look at some role-plays." opens', eq(I("Sure! Let's look at some role-plays.", 'tutor', null), { kind: 'open', mode: 'rp' }))
ok('tutor: "I\'ll show you the role-plays now." opens', eq(I("I'll show you the role-plays now.", 'tutor', null), { kind: 'open', mode: 'rp' }))
ok('tutor question never opens', I('Shall we look at some role-plays?', 'tutor', null) === null)
ok('"I love role-plays" alone doesn\'t open', I('I love role-plays.', 'student', null) === null)
// starting by name, from anywhere
ok('student: "Let\'s do the café role-play" starts it (panel closed)', eq(I("Let's do the café role-play.", 'student', null), { kind: 'start', id: 'cafe-abroad' }))
ok('student: "Let\'s do the izakaya one" starts it (picker open)', eq(I("Let's do the izakaya one.", 'student', 'picker'), { kind: 'start', id: 'izakaya-guests' }))
ok('tutor: "Great, let\'s start the izakaya one." starts it', eq(I("Great, let's start the izakaya one.", 'tutor', 'picker'), { kind: 'start', id: 'izakaya-guests' }))
ok('student: 居酒屋のやりたい starts it', eq(I('居酒屋のをやりたいです', 'student', 'picker'), { kind: 'start', id: 'izakaya-guests' }))
// picking and starting the selected one
ok('student: "the colleague one" picks', eq(I('Maybe the colleague one.', 'student', 'picker'), { kind: 'pick', id: 'work-intro' }))
ok('student: "the second one" picks', eq(I('The second one, please.', 'student', 'picker'), { kind: 'pick', id: 'izakaya-guests' }))
ok('student: "Okay, let\'s start." starts the selected one', eq(I("Okay, let's start.", 'student', 'picker'), { kind: 'start', id: null }))
ok('student: "courses" switches mode', eq(I('Show me the courses.', 'student', 'picker'), { kind: 'mode', mode: 'course' }))
// closing
ok('student: "close it" closes', eq(I('Can you close it?', 'student', 'picker'), { kind: 'close' }))
ok('student: "Let\'s stop the role-play" closes a mission', eq(I("Let's stop the role-play.", 'student', 'roleplay'), { kind: 'close' }))
ok('student: 閉じて closes', eq(I('閉じてください', 'student', 'picker'), { kind: 'close' }))
ok('tutor: "I\'ll close the role-plays now." closes', eq(I("Okay, I'll close the role-plays now.", 'tutor', 'picker'), { kind: 'close' }))
ok('during a role-play, ordinary lines do nothing', I('Can I have two beers?', 'student', 'roleplay') === null && I("Let's do it!", 'student', 'roleplay') === null)
ok('nothing open: close does nothing', I('close it', 'student', null) === null)
ok('ja: 同僚 → work intro (not the café, which also has 海外)', eq(I('海外の同僚のをやりたい', 'student', 'picker'), { kind: 'start', id: 'work-intro' }))
ok('ja: カフェ picks the café', eq(I('カフェのにします', 'student', 'picker'), { kind: 'start', id: 'cafe-abroad' }))
// regressions from the live test
ok('student: "start from the first lesson" (nothing open) is not a role-play', panelIntent("Let's start from the first lesson.", 'student', null, items) === null)
ok('student: "the second one, let\'s start" (nothing open) is not a role-play', panelIntent("Let's start the second one.", 'student', null, items) === null)
ok('student: "Let\'s do the course" is not a role-play', panelIntent("Let's do the course.", 'student', null, items) === null)
ok('student: ordinal still works in the picker', JSON.stringify(panelIntent("Let's do the second one.", 'student', 'picker', items)) === JSON.stringify({ kind: 'start', id: 'izakaya-guests' }))
ok('student: "Let\'s do serving foreign guests" (nothing open) starts it', panelIntent("Let's do serving foreign guests at a bar.", 'student', null, items)?.kind === 'start')
console.log(bad ? bad + ' FAILED' : 'all passed')
ok('picker: "Actually, let\'s do free talk" closes it (live test)', JSON.stringify(panelIntent("Actually, let's do free talk", 'student', 'picker', items)) === JSON.stringify({ kind: 'close' }))
ok('picker: "can we just chat instead?" closes it', panelIntent('Can we just chat instead?', 'student', 'picker', items)?.kind === 'close')
ok('picker: "let\'s do something else" starts nothing', panelIntent("Let's do something else.", 'student', 'picker', items) === null)
ok('picker: "OK, let\'s do it" starts the highlighted one', JSON.stringify(panelIntent("OK, let's do it.", 'student', 'picker', items)) === JSON.stringify({ kind: 'start', id: null }))
ok('picker: "let\'s start" still starts', panelIntent("Let's start.", 'student', 'picker', items)?.kind === 'start')
ok('picker: tutor "Let\'s do free talk then." closes it', panelIntent("Sure, let's do free talk then.", 'tutor', 'picker', items)?.kind === 'close')
// the mission-complete screen
const D = (t: string, who: 'student' | 'tutor' = 'student') => panelIntent(t, who, 'done', items)?.kind ?? null
ok('done: "let\'s swap roles" → swap', D("Yes, let's swap roles!") === 'swap')
ok('done: "交代したい" → swap', D('交代したいです') === 'swap')
ok('done: "one more time" → again', D('Can we do it one more time?') === 'again')
ok('done: "もう一度" → again', D('もう一度やりたい') === 'again')
ok('done: "another scene" → next', D("Let's try another scene") === 'next')
ok('done: "free talk" → close', D("Let's just do free talk") === 'close')
ok('done: tutor statement "Let\'s swap roles" → swap', D("Great, let's swap roles. I'll be the customer.", 'tutor') === 'swap')
ok('done: tutor QUESTION "Would you like to swap roles?" → nothing', D('Would you like to swap roles or try again?', 'tutor') === null)
ok('done: plain chat → nothing', D('That was fun') === null)
ok('playing: "swap" does nothing mid-scene', panelIntent("Let's swap roles", 'student', 'roleplay', items) === null)
process.exit(bad ? 1 : 0)
