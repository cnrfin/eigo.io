import { FALLBACK_PICK, TUTOR_COMMAND, TUTOR_QA, WELCOME_AT, commandSaid, factsReady, heardPhrase, mergeAboutMe, quoteIsTheirs, sameFact, stillToAsk, suggestedPhrase, validateWelcome, voicePhrase, waitsForGap, welcomeNext, welcomeStartStep, type WelcomeSnap } from '@/lib/classroom/welcome'
import { SCENES, roleplayInstruction, roleplayInstructionParts } from '@/lib/roleplay'
import { BEGINNER_JA, LEVEL_RULES, normalizeSettings, settingsToRules } from '@/lib/ai-tutor/settings'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }

/* ---- the helper's answer: facts only with the student's own words behind them ---- */
const student = "I'm a nurse at a hospital in Osaka. I want to help patients from abroad. Next year I'd like to travel to Australia. I like cafés and 韓国ドラマ"
const scenes = SCENES.map((s) => ({ id: s.id, titleEn: s.title.en }))
const v = validateWelcome(
  {
    facts: {
      job: { value: 'Nurse at a hospital in Osaka', quote: "I'm a nurse at a hospital" },
      why: { value: 'Helping patients from abroad', quote: 'I would love to see kangaroos' },
      likes: { value: 'Cafés, Korean dramas', quote: '韓国ドラマ' },
    },
    scene: { id: 'cafe-abroad', name: 'café', reason_ja: 'オーストラリア旅行の前に、カフェで注文してみよう', reason_en: 'Practise ordering before your trip to Australia' },
  },
  student,
  scenes,
)
ok('facts backed by their words are kept', v.facts.job === 'Nurse at a hospital in Osaka')
ok('a fact whose quote they never said is dropped', v.facts.why === undefined, v.facts)
ok('a Japanese quote counts', v.facts.likes === 'Cafés, Korean dramas')
ok('the role-play: from the list, its name from its title', v.pick?.sceneId === 'cafe-abroad' && v.pick.name === 'café' && v.pick.reasonJa.startsWith('オーストラリア'), v.pick)
const v2 = validateWelcome({ facts: { job: { value: '看護師', quote: 'nurse' } }, scene: { id: 'no-such-scene', name: 'x' } }, student, scenes)
ok('Japanese values and unknown scenes are dropped', !v2.facts.job && v2.pick === null, v2)
const v3 = validateWelcome({ scene: { id: 'izakaya-guests', name: 'pub', reason_ja: 'x', reason_en: 'お店で' } }, student, scenes)
ok('a name not in the title, or reasons in the wrong language, go', v3.pick?.sceneId === 'izakaya-guests' && v3.pick.name === '' && v3.pick.reasonJa === '' && v3.pick.reasonEn === '', v3.pick)
ok('garbage in: nothing out', JSON.stringify(validateWelcome('nope', student, scenes)) === JSON.stringify({ facts: {}, thin: [], pick: null }))
// the same thing twice counts once; a vague fact is flagged so the tutor digs deeper
const said2 = "I'm from Kobe. I like meeting new people. I want to learn English to meet new people."
const v4 = validateWelcome({ facts: { job: { value: 'From Kobe', quote: "I'm from Kobe" }, likes: { value: 'Meeting new people', quote: 'I like meeting new people' }, why: { value: 'To meet new people', quote: 'to meet new people', vague: true } } }, said2, scenes)
ok('a fact that repeats another is dropped', v4.facts.likes === 'Meeting new people' && v4.facts.why === undefined, v4.facts)
const v5 = validateWelcome({ facts: { job: { value: 'From Kobe', quote: "I'm from Kobe", vague: true } } }, said2, scenes)
ok('vague facts are flagged', JSON.stringify(v5.thin) === '["job"]', v5.thin)
ok('what to ask next: what\'s missing, and the vague one', JSON.stringify(stillToAsk(v5)) === JSON.stringify({ missing: ['likes', 'why'], thin: ['job'] }), stillToAsk(v5))
ok('not ready for the card with a vague or missing fact', !factsReady(v5) && factsReady({ facts: { job: 'a', why: 'b c', likes: 'f' }, thin: [] }))
ok('same fact, different words', sameFact('To meet new people', 'meet new people') && !sameFact('Travel to Australia', 'Meet new people'))
ok('a short quote has to be exact', !quoteIsTheirs('a doctor', student) && quoteIsTheirs('a nurse', student))
ok('the fallback scene exists', SCENES.some((s) => s.id === FALLBACK_PICK.sceneId))

/* ---- About me: added to what's there, never replacing it ---- */
const f = { job: 'Nurse in Osaka', why: 'Travel to Australia' }
ok('About me from nothing', mergeAboutMe('', f) === 'From & work: Nurse in Osaka. Why English: Travel to Australia.')
ok('added after what they wrote', mergeAboutMe('I love dogs.', f) === 'I love dogs.\nFrom & work: Nurse in Osaka. Why English: Travel to Australia.')
ok('saving new facts replaces the old saved lines, keeps theirs', mergeAboutMe('I love dogs. Work: Teacher. Goal: Fun chats.', f) === 'I love dogs.\nFrom & work: Nurse in Osaka. Why English: Travel to Australia.', mergeAboutMe('I love dogs. Work: Teacher. Goal: Fun chats.', f))
ok('saving twice adds nothing', mergeAboutMe(mergeAboutMe('I love dogs.', f), f) === mergeAboutMe('I love dogs.', f))
const long = 'x'.repeat(590)
ok('never over 600, never cuts theirs', mergeAboutMe(long, f).length <= 600 && mergeAboutMe(long, f).startsWith(long))

/* ---- what the tutor says: the classroom follows it ---- */
ok('the phrase the tutor teaches, in quotes', suggestedPhrase('It matches your work. Please say: "Let\'s do the massage salon role-play."') === "Let's do the massage salon role-play")
ok('…or without quotes', suggestedPhrase("So please say: Let's do the hotel role-play.") === "Let's do the hotel role-play")
ok('no phrase, no card', suggestedPhrase('Do you like role-plays?') === null && suggestedPhrase('We did a "role-play" last time.') === null)
ok('the tutor moving on to the voice command', TUTOR_COMMAND.test('Now let\'s try a voice command. In your lessons, just say "Open the course".'))
ok('the tutor opening the Q&A', TUTOR_QA.test('Do you have any questions about eigo?') && !TUTOR_QA.test('Any questions about the role-play?'))
for (const s2 of ['Open the course', 'open the course please', 'コースを開いて']) ok(`command: "${s2}"`, commandSaid(s2))
for (const s2 of ['What is a course?', 'I like coffee', '']) ok(`not a command: "${s2}"`, !commandSaid(s2))
const phrase = "Let's do the massage salon role-play"
ok('the phrase: words light up as they are said, but half of it opens nothing', heardPhrase("let's do the massage", phrase).lit.slice(0, 4).every(Boolean) && !heardPhrase("let's do the massage", phrase).whole)
ok('the whole phrase opens it ("role play" / "roleplay" both count)', heardPhrase("Let's do the massage salon role play", phrase).whole && heardPhrase("let's do the massage salon roleplay", phrase).whole)
ok('one word missed in a long phrase is fine', heardPhrase("Let's do massage salon role-play", phrase).whole)
ok('"OK" or "let\'s do it" no longer opens it', !heardPhrase('OK', phrase).whole && !heardPhrase("let's do it", phrase).whole)

/* ---- the director: only time limits and fallbacks (the tutor moves it on) ---- */
const snap = (o: Partial<WelcomeSnap>): WelcomeSnap => ({ step: 'about', elapsed: 30, left: 270, stepAge: 10, suggestSent: false, wrapSent: false, commandAge: null, ...o })
const to = (o: Partial<WelcomeSnap>) => JSON.stringify(welcomeNext(snap(o)))
ok('about: the tutor leads; nothing from the classroom', welcomeNext(snap({ elapsed: 90 })) === null)
ok('about: no role-play by 1:45 → one reminder', to({ elapsed: WELCOME_AT.suggestBy }) === '{"do":"promptSuggest"}' && welcomeNext(snap({ elapsed: 120, suggestSent: true })) === null)
ok('suggest: opens by itself after 30 s', to({ step: 'suggest', stepAge: WELCOME_AT.autoOpen }) === '{"do":"open"}' && welcomeNext(snap({ step: 'suggest', stepAge: 20 })) === null)
ok('roleplay: asked to wrap up at 3:15, once; ended at 3:45', to({ step: 'roleplay', elapsed: WELCOME_AT.wrapScene }) === '{"do":"wrap"}' && welcomeNext(snap({ step: 'roleplay', elapsed: 200, wrapSent: true })) === null && to({ step: 'roleplay', elapsed: WELCOME_AT.endScene, wrapSent: true }) === '{"do":"endScene"}')
ok('done: the tutor moves on itself; a reminder only after 45 s or with 70 s left', welcomeNext(snap({ step: 'done', stepAge: 30 })) === null && to({ step: 'done', stepAge: 45 }) === '{"to":"command","prompt":true}' && to({ step: 'done', stepAge: 5, left: 70 }) === '{"to":"command","prompt":true}')
ok('command: Q&A 20 s after they said it, or at the latest', welcomeNext(snap({ step: 'command', stepAge: 15, commandAge: 10 })) === null && to({ step: 'command', commandAge: 20 }) === '{"to":"qa"}' && to({ step: 'command', stepAge: 50 }) === '{"to":"qa"}' && to({ step: 'command', left: 40 }) === '{"to":"qa"}')
ok('qa: until the goodbye', welcomeNext(snap({ step: 'qa', left: 10 })) === null)
ok('everything waits for a gap between turns, except ending a scene', waitsForGap({ to: 'command' }) && waitsForGap({ do: 'open' }) && !waitsForGap({ do: 'endScene' }))
ok('joining part-way through', welcomeStartStep(0) === 'about' && welcomeStartStep(200) === 'command' && welcomeStartStep(260) === 'qa')

/* ---- the welcome brief: English only, the plan, real corrections ---- */

/* ---- their English level ---- */
ok('level: kept when valid, empty otherwise', normalizeSettings({ level: 'starter' }).level === 'starter' && normalizeSettings({ level: 'genius' }).level === '' && normalizeSettings({}).level === '')
ok('beginners: English, Japanese only if they ask', /only if they ask/.test(BEGINNER_JA) && /Never say things twice in two languages/.test(BEGINNER_JA))
ok('level: the first rule for the tutor', settingsToRules(normalizeSettings({ level: 'starter' }))[0] === LEVEL_RULES.starter && !settingsToRules(normalizeSettings({})).some((r) => Object.values(LEVEL_RULES).includes(r)))

/* ---- role-plays: the tutor sets the scene first; every start note fits GPT-Live's 500-token limit ---- */
const cafe = SCENES.find((s) => s.id === 'cafe-abroad')!
ok('role-play: set the scene, ask if ready, then start', /set the scene/.test(roleplayInstruction(cafe, 'a', 0)) && /ask if they're ready/.test(roleplayInstruction(cafe, 'a', 0)))
// (appendInstructions sends at most 1800 characters: anything past that, the rules at the end, would be lost)
let worst = { n: 0, id: '' }
for (const sc of SCENES) for (const r of ['a', 'b'] as const) for (const lv of [0, 1, 2] as const) for (const part of roleplayInstructionParts(sc, r, lv)) if (part.length > worst.n) worst = { n: part.length, id: `${sc.id} ${r} ${lv}` }
ok('every part of every role-play start note fits in one note (1800 characters, nothing cut off)', worst.n < 1800, worst)
ok('the rules always arrive whole (the last part)', SCENES.every((sc) => roleplayInstructionParts(sc, 'a', 2).at(-1)!.endsWith('only then give your feedback.')))
console.log(bad ? bad + ' FAILED' : 'all passed')
