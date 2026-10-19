import { computeAiLayout } from '@/lib/classroom/layout'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const inside = (r: any, W: number, H: number) => r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= W + 0.5 && r.y + r.h <= H + 0.5
const over = (a: any, b: any) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1
for (const [W, H] of [[1400, 700], [1000, 540], [800, 540], [590, 540], [390, 640], [360, 560], [1900, 900]]) {
  for (const main of ['none', 'panel', 'slide'] as const) {
    const r = computeAiLayout(W, H, { main, ratio: 3 / 4 })!
    const tag = `${W}x${H} ${main} → ${r.mode}`
    ok(tag + ': tutor inside', inside({ ...r.tutor, h: r.tutor.h + 30 }, W, H), r.tutor)
    if (r.main) {
      ok(tag + ': main inside', inside(r.main, W, H), r.main)
      ok(tag + ': no overlap', !over(r.main, r.tutor), [r.main, r.tutor])
      if (main === 'slide') ok(tag + ': slide keeps 4:3', Math.abs(r.main.h / r.main.w - 0.75) < 0.01)
    }
    ok(tag + ': tutor ≥ 72', r.tutor.w >= 72, r.tutor.w)
  }
}
ok('wide slide: tutor on the right', computeAiLayout(1400, 700, { main: 'slide' })!.mode === 'slide-side')
ok('narrow slide: tutor underneath', computeAiLayout(590, 540, { main: 'slide' })!.mode === 'slide-top')
ok('tall panel: on top', computeAiLayout(390, 640, { main: 'panel' })!.mode === 'panel-top')
ok('nothing open: tutor ≤ 210', computeAiLayout(1900, 900, { main: 'none' })!.tutor.w <= 210)
// a card at the bottom (corrections, the welcome call's cards): the tutor floats above it, smaller
for (const [W, H, C] of [[1400, 700, 240], [1000, 540, 300], [390, 640, 330], [800, 480, 360]]) {
  const r = computeAiLayout(W, H, { main: 'none', card: C })!
  const free = computeAiLayout(W, H, { main: 'none' })!
  const top = H - C - 14
  ok(`${W}x${H} card ${C}: the tutor and its name clear the card`, r.tutor.y + r.tutor.h + 30 <= top + 1, [r.tutor, top])
  ok(`${W}x${H} card ${C}: smaller than without a card`, r.tutor.w <= free.tutor.w && r.tutor.w >= 56, [r.tutor.w, free.tutor.w])
  ok(`${W}x${H} card ${C}: centred`, Math.abs(r.tutor.x + r.tutor.w / 2 - W / 2) < 1)
}
ok('a card with a slide open: the tutor stays put', JSON.stringify(computeAiLayout(1400, 700, { main: 'slide', card: 260 })!.tutor) === JSON.stringify(computeAiLayout(1400, 700, { main: 'slide' })!.tutor))
console.log(bad ? bad + ' FAILED' : 'all passed')
