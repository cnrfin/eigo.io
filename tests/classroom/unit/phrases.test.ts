import { phrasesToSave } from '@/lib/roleplay/phrases'
import iz from '@/lib/roleplay/scenes/service/izakaya-guests.json'
import type { Scene } from '@/lib/roleplay/types'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const sc = iz as unknown as Scene
const role = sc.studentRole
const tasks = sc.roles.find((r) => r.id === role)!.levels[0].tasks
console.log('tasks:', tasks.map((t) => t.id + ' = ' + t.hints[2]).join(' | '))
const none = phrasesToSave(sc, role, 0, false, {})
ok('nothing said: the first 3 model phrases', none.length === Math.min(3, tasks.length) && none[0].term === tasks[0].hints[2], none)
ok('each has its Japanese task name', none.every((p) => p.ja.length > 0))
const allSaidExactly = Object.fromEntries(tasks.map((t) => [t.id, t.hints[2]]))
ok('said every model phrase word for word: nothing to save', phrasesToSave(sc, role, 0, false, allSaidExactly).length === 0)
const missedLast = Object.fromEntries(tasks.slice(0, -1).map((t) => [t.id, t.hints[2]]))
ok('a missed task comes first', phrasesToSave(sc, role, 0, false, missedLast)[0]?.term === tasks[tasks.length - 1].hints[2], phrasesToSave(sc, role, 0, false, missedLast))
const rough = { ...allSaidExactly, [tasks[1].id]: 'yes ok' }
ok('a loosely said task is offered', phrasesToSave(sc, role, 0, false, rough).some((p) => p.term === tasks[1].hints[2]))
console.log(bad ? bad + ' FAILED' : 'all passed')
