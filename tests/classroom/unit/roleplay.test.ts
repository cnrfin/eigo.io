import { SCENES, sceneById, roleplayInstruction, roleplayInstructionParts, nextLevel, tasksFor, roleOf } from '@/lib/roleplay'
import { computeLayout } from '@/lib/classroom/layout'
import { existsSync } from 'fs'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const ids = new Set<string>()
for (const s of SCENES) {
  const where = s.id
  ok(`${where}: unique id`, !ids.has(s.id)); ids.add(s.id)
  ok(`${where}: picture exists (or none yet)`, !s.image || existsSync(process.cwd() + '/public' + s.image), s.image)
  ok(`${where}: two roles a/b`, s.roles.length === 2 && s.roles.map((r) => r.id).sort().join() === 'a,b')
  ok(`${where}: student role exists`, s.roles.some((r) => r.id === s.studentRole))
  for (const r of s.roles) {
    ok(`${where}/${r.id}: three levels`, r.levels.length === 3)
    r.levels.forEach((L, i) => {
      const tag = `${where}/${r.id}/L${i}`
      ok(`${tag}: 3–5 tasks`, L.tasks.length >= 3 && L.tasks.length <= 5, L.tasks.length)
      ok(`${tag}: unique task ids`, new Set(L.tasks.map((t) => t.id)).size === L.tasks.length)
      ok(`${tag}: every task has 3 hints, ja + en titles`, L.tasks.every((t) => t.hints.length === 3 && t.hints.every((h) => h.trim()) && t.title.ja && t.title.en))
      ok(`${tag}: tutor notes`, L.tutor.length > 20)
      if (L.twist) {
        ok(`${tag}: twist after an existing task`, L.tasks.some((t) => t.id === L.twist!.after))
        ok(`${tag}: twist task id is new`, !L.tasks.some((t) => t.id === L.twist!.task.id))
        ok(`${tag}: twist only at 上級`, i === 2)
      }
      // the last hint is a full sentence
      ok(`${tag}: full-sentence hints end with punctuation`, L.tasks.every((t) => /[.!?]$/.test(t.hints[2].trim())), L.tasks.map((t) => t.hints[2]))
    })
  }
}
const cafe = sceneById('cafe-abroad')!
ok('levels: 0 cleared → 初級, 1 → 中級, 2 → 上級, 3 → 上級', [0, 1, 2, 3].map(nextLevel).join() === '0,1,2,2')
const L2 = roleOf(cafe, 'a').levels[2]
ok('twist task goes in right after its trigger task (wifi)', tasksFor(L2, true).map((t) => t.id).join() === 'order,here,wifi,solve,pay', tasksFor(L2, true).map((t) => t.id))
{
  const iz = sceneById('izakaya-guests')!
  const L = roleOf(iz, 'a').levels[2]
  ok('a twist after an earlier task goes right after it (izakaya: after "recommend")', tasksFor(L, true).map((t) => t.id).join() === 'seat,recommend,allergy,order,bill', tasksFor(L, true).map((t) => t.id))
}
const ins = roleplayInstruction(cafe, 'a', 2)
ok('instruction names both characters, the tasks, the twist and the menu', /You play: Barista/.test(ins) && /1\. Order a drink your way/.test(ins) && /Twist: after the student has done "Ask about Wi-Fi"/.test(ins) && /Flat white ¥500/.test(ins), ins)
ok('instruction length is reasonable', ins.length < 2700, ins.length)
const parts = SCENES.flatMap((sc) => (['a', 'b'] as const).flatMap((r) => ([0, 1, 2] as const).flatMap((lv) => [false, true].flatMap((ready) => roleplayInstructionParts(sc, r, lv, ready).map((p) => ({ id: `${sc.id} ${r} ${lv}${ready ? ' ready' : ''}`, n: p.length, cut: p.endsWith('…') }))))))
const tooLong = parts.filter((p) => p.n > 1800 || p.cut)
ok('every part sent is at most 1800 characters (none cut off)', parts.length > 0 && tooLong.length === 0, tooLong.slice(0, 3))
const swapped = roleplayInstruction(cafe, 'b', 0)
ok('swapped roles: the AI tutor plays the customer', /The student plays: Barista/.test(swapped) && /You play: Customer/.test(swapped))
const lay = computeLayout(1200, 700, { showSlide: true, square: true })!
ok('panel layout: square flush left, tiles fill the rest', lay.mode === 'panel' && lay.slide!.x === 0 && lay.slide!.w === 700 && lay.slide!.h === 700 && lay.other.x === 712 && lay.other.w === 488, lay)
const narrow = computeLayout(800, 700, { showSlide: true, square: true })!
ok('panel layout: leaves at least 160px for the tiles', narrow.slide!.w === 800 - 12 - 160 && narrow.other.w === 160, narrow)
process.exit(bad ? 1 : 0)
