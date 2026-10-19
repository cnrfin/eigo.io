import { mergeTranscript } from '@/lib/classroom/transcript'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const a1 = 'Student: Hi\nTeacher: Hello!'
const a2 = a1 + '\nStudent: I like tea.'
// the first session: its marker is at the very start of the text
const s1 = mergeTranscript('', 'live_1', a1)
ok('first save: the marker at the very start', s1 === '[session live_1]\n' + a1, s1)
const s2 = mergeTranscript(s1, 'live_1', a2)
ok('a second save of the same session leaves it once, not twice', s2 === '[session live_1]\n' + a2, s2)
ok('…and saving it again changes nothing', mergeTranscript(s2, 'live_1', a2) === s2)
// a reconnect: a second session is added after the first, and its saves replace only its own text
const b1 = 'Student: Are you there?'
const b2 = b1 + '\nTeacher: Yes, sorry!'
const t1 = mergeTranscript(s2, 'live_2', b1)
ok('a second session is added after the first', t1 === s2 + '\n[session live_2]\n' + b1, t1)
const t2 = mergeTranscript(t1, 'live_2', b2)
ok('its next save replaces only its own text', t2 === s2 + '\n[session live_2]\n' + b2, t2)
ok('…and saving it again changes nothing', mergeTranscript(t2, 'live_2', b2) === t2, mergeTranscript(t2, 'live_2', b2))
ok('a session id that starts with another one\'s is a different session', mergeTranscript(t2, 'live_', 'Student: x').startsWith(t2))
ok('nothing to save: the text stays as it was', mergeTranscript(t2, 'live_2', '') === t2)
process.exit(bad ? 1 : 0)
