import { courseNamed, normName } from '@/lib/ai-tutor/course-names'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const C = [
  { id: 'c1', names: ['Haruka in the UK: Part 1', 'イギリスでのハルカ 第1章'] },
  { id: 'c2', names: ['Haruka in the UK: Part 2', 'イギリスでのハルカ 第2章'] },
  { id: 'c3', names: ['Haruka in the UK: Part 3'] },
]
ok('norm', normName('Haruka in the UK: Part 1') === ' haruka in the uk part 1 ', normName('Haruka in the UK: Part 1'))
ok('"part one" → Part 1', courseNamed("I'll open Haruka in the UK, part one now.", C)?.id === 'c1')
ok('"part one, once more"', courseNamed("Okay, sorry, that's my mistake. I'll open Haruka in the UK, part one, once more.", C)?.id === 'c1')
ok('"Part 2"', courseNamed("I'll open Haruka in the UK Part 2 now.", C)?.id === 'c2')
ok('"part three"', courseNamed("Let me open Haruka in the U.K. part three.", C)?.id === 'c3' || courseNamed("Let me open Haruka in the UK part three.", C)?.id === 'c3')
ok('just the main name → first', courseNamed("I'll open Haruka in the UK now.", C)?.id === 'c1')
ok('Japanese name', courseNamed('イギリスでのハルカ 第2章を開きます', C)?.id === 'c2')
ok('no course', courseNamed("I'll open the whiteboard now.", C) === undefined)
console.log(bad ? bad + ' FAILED' : 'all passed')
