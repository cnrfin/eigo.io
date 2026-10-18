import { validateTicks, openTasks, ticksPrompt } from '@/lib/roleplay/ticks'
import cafe from '@/lib/roleplay/scenes/travel/cafe-abroad.json'
import type { Scene } from '@/lib/roleplay/types'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const sc = cafe as unknown as Scene
const role = sc.studentRole
const L1 = sc.roles.find((r) => r.id === role)!.levels[1]
const ids = L1.tasks.map((t) => t.id)
const lines = [{ from: 'tutor' as const, text: 'Hi there! What can I get for you today?' }, { from: 'student' as const, text: 'Can I have one coffee hot?' }, { from: 'tutor' as const, text: 'Sure! What size would you like?' }]
ok('a tick backed by the student\'s words', JSON.stringify(validateTicks({ done: [{ id: ids[0], said: 'Can I have one coffee hot' }] }, ids, lines)) === JSON.stringify([{ id: ids[0], said: 'Can I have one coffee hot' }]))
ok('words only the tutor said don\'t tick', validateTicks({ done: [{ id: ids[1], said: 'What size would you like' }] }, ids, lines).length === 0)
ok('made-up words don\'t tick', validateTicks({ done: [{ id: ids[1], said: 'Regular, please' }] }, ids, lines).length === 0)
ok('a task not on the list doesn\'t tick', validateTicks({ done: [{ id: 'dance', said: 'Can I have one coffee hot' }] }, ids, lines).length === 0)
ok('the same task twice ticks once', validateTicks({ done: [{ id: ids[0], said: 'Can I have one coffee hot' }, { id: ids[0], said: 'one coffee' }] }, ids, lines).length === 1)
ok('garbage → nothing', validateTicks('x', ids, lines).length === 0 && validateTicks({ done: 'x' }, ids, lines).length === 0)
ok('open tasks skip the done ones', openTasks(sc, role, 1, false, [ids[0]]).every((t) => t.id !== ids[0]))
const lvl2 = sc.roles.find((r) => r.id === role)!.levels[2]
if (lvl2.twist) ok('the twist task appears once twisted', openTasks(sc, role, 2, true, []).some((t) => t.id === lvl2.twist!.task.id) && !openTasks(sc, role, 2, false, []).some((t) => t.id === lvl2.twist!.task.id))
ok('the prompt lists only open tasks', !ticksPrompt(sc, role, 1, openTasks(sc, role, 1, false, [ids[0]]), lines).user.includes(`"${ids[0]}"`))
console.log(bad ? bad + ' FAILED' : 'all passed')
