import { mistakeFor, cueCard, isFiller } from '@/lib/ai-tutor/cards'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const S = (text: string) => ({ from: 'student' as const, text })
const T = (text: string) => ({ from: 'tutor' as const, text })
// the live test
const live = [S('The Wi-Fi password is on your receipt'), T('Perfect. So... how can I pay?'), S('And how would you like, uh, we accept cash or card'), T("Card's fine."), S('Okay, by card. So your order is one latte'), T("Thank you! That's the end of the role-play!"), S('Mm')]
const fb = 'Nice job. A more natural way is: "We accept cash or card. How would you like to pay?" Do you want to try again?'
ok('"Mm" is filler', isFiller('Mm') && isFiller('uh') && isFiller('Thank you') && isFiller('okay') && !isFiller('I cook it every week'))
ok('the correction is matched to the cash-or-card line, not "Mm"', mistakeFor(live, fb).includes('we accept cash or card'), mistakeFor(live, fb))
ok('and since they already said it, no card at all', cueCard(mistakeFor(live, fb), fb) === null, cueCard(mistakeFor(live, fb), fb))
ok('cueCard never takes "Mm" as the mistake', cueCard('Mm', 'A more natural way is: I cook it every week.') === null)
// normal case still works: the last line
const n = [T('Do you cook it every week?'), S('I cook it every time')]
const fb2 = 'A more natural way is: I cook it every week. Can you try that?'
ok('a normal correction still uses the last line', mistakeFor(n, fb2) === 'I cook it every time')
const card = cueCard(mistakeFor(n, fb2), fb2)
ok('…and makes the card', card?.kind === 'correction' && card.was === 'I cook it every time' && card.now === 'I cook it every week.', card)
// an earlier line wins when the last one is unrelated
const e = [S('Could I get a iced coffee'), T('Sure, what size?'), S('Large please'), T('Great.'), S('Thanks')]
const fb3 = 'You did well. A more natural way is: Could I get an iced coffee, please?'
ok('role-play feedback about an earlier line picks that line', mistakeFor(e, fb3) === 'Could I get a iced coffee', mistakeFor(e, fb3))
console.log(bad ? bad + ' FAILED' : 'all passed')
