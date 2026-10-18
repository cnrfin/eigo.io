import { propHit, propKeys } from '@/lib/roleplay/prop'
import { normText } from '@/lib/ai-tutor/actions'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }
const H = (said: string) => normText(said)
// the cases from the travel batch review
ok('"10:15" lights on "the 10:15 train"', propHit(H('Is there a seat on the 10:15 train?'), { name: 'Oxford 10:15', key: '10:15' }))
ok('"10:15" doesn\'t light on "10:45"', !propHit(H('The 10:45 one, please.'), { name: 'Oxford 10:15', key: '10:15' }))
ok('"off-peak" lights on "off-peak ticket"', propHit(H('An off-peak ticket, please.'), { name: 'Off-peak return', key: 'off-peak' }))
ok('"off-peak" doesn\'t light on "turn off"', !propHit(H('Please turn off your phone.'), { name: 'Off-peak return', key: 'off-peak' }))
ok('"check-in" and "check-out" are told apart', propHit(H('What time is check-in?'), { name: 'Check-in', key: 'check-in' }) && !propHit(H('What time is check-in?'), { name: 'Check-out', key: 'check-out' }))
ok('"Wi-Fi" lights on "Wi-Fi" and on "wifi"', propHit(H('Is there Wi-Fi?'), { name: 'Wi-Fi', key: 'Wi-Fi' }) && propHit(H('do you have wifi'), { name: 'Wi-Fi', key: 'Wi-Fi' }))
ok('"T-shirt" lights on "this T-shirt"', propHit(H('Do you have this T-shirt in medium?'), { name: 'T-shirt', key: 'T-shirt' }))
ok('"SP 101" lights on "SP 101" and "SP101"', propHit(H('Is SP 101 on time?'), { name: 'SP 101', key: 'SP 101' }) && propHit(H('SP101 to Bangkok'), { name: 'SP 101', key: 'SP 101' }))
ok('"side entrance" doesn\'t light on "Riverside"', !propHit(H('The Riverside entrance is closed.'), { name: 'Side entrance', key: 'side entrance' }))
ok('"side entrance" lights on "the side entrance"', propHit(H('Use the side entrance.'), { name: 'Side entrance', key: 'side entrance' }))
ok('"colour|color" matches both spellings', propHit(H('What color is it?'), { name: 'Colour', key: 'colour|color' }) && propHit(H('Another colour?'), { name: 'Colour', key: 'colour|color' }))
ok('no key: the first word of the name (whole word)', propHit(H('A latte please'), { name: 'Latte · oat milk +¥50' }) && !propHit(H('lattes'), { name: 'Latte' }))
ok('a too-short key is ignored', propKeys({ name: 'x', key: 'a' }).length === 0)
console.log(bad ? bad + ' FAILED' : 'all passed')
process.exit(bad ? 1 : 0)
