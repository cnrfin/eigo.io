import { FALLBACK_PICK, WELCOME_AT, cardReply, factsReady, heardPhrase, mergeAboutMe, quoteIsTheirs, sameFact, stillToAsk, validateWelcome, voicePhrase, waitsForGap, welcomeNext, welcomeStartStep, type WelcomeSnap } from '@/lib/classroom/welcome'
import { SCENES, roleplayInstruction, roleplayInstructionParts } from '@/lib/roleplay'
import { LEVEL_RULES, normalizeSettings, settingsToRules } from '@/lib/ai-tutor/settings'
let bad = 0
const ok = (n: string, c: boolean, x: unknown = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x))); if (!c) bad++ }

/* ---- the helper's answer: facts only with the student's own words behind them ---- */
const student = "I'm a nurse at a hospital in Osaka. I want to help patients from abroad. Next year I'd like to travel to Australia. I like cafés and 韓国ドラマ"
const scenes = SCENES.map((s) => ({ id: s.id, titleEn: s.title.en }))
const v = validateWelcome(
  {
    facts: {
      job: { value: 'Nurse at a hospital in Osaka', quote: "I'm a nurse at a hospital" },
      why: { value: 'Helping patients from abroad', quote: 'help patients from abroad' },
      goal: { value: 'Travel to Australia next year', quote: 'I would love to see kangaroos' },
      likes: { value: 'Cafés, Korean dramas', quote: '韓国ドラマ' },
    },
    scene: { id: 'cafe-abroad', name: 'café', reason_ja: 'オーストラリア旅行の前に、カフェで注文してみよう', reason_en: 'Practise ordering before your trip to Australia' },
  },
  student,
  scenes,
)
ok('facts backed by their words are kept', v.facts.job === 'Nurse at a hospital in Osaka' && v.facts.why === 'Helping patients from abroad')
ok('a fact whose quote they never said is dropped', v.facts.goal === undefined, v.facts)
ok('a Japanese quote counts', v.facts.likes === 'Cafés, Korean dramas')
ok('the role-play: from the list, its name from its title', v.pick?.sceneId === 'cafe-abroad' && v.pick.name === 'café' && v.pick.reasonJa.startsWith('オーストラリア'), v.pick)
const v2 = validateWelcome({ facts: { job: { value: '看護師', quote: 'nurse' } }, scene: { id: 'no-such-scene', name: 'x' } }, student, scenes)
ok('Japanese values and unknown scenes are dropped', !v2.facts.job && v2.pick === null, v2)
const v3 = validateWelcome({ scene: { id: 'izakaya-guests', name: 'pub', reason_ja: 'x', reason_en: 'お店で' } }, student, scenes)
ok('a name not in the title, or reasons in the wrong language, go', v3.pick?.sceneId === 'izakaya-guests' && v3.pick.name === '' && v3.pick.reasonJa === '' && v3.pick.reasonEn === '', v3.pick)
ok('garbage in: nothing out', JSON.stringify(validateWelcome('nope', student, scenes)) === JSON.stringify({ facts: {}, thin: [], pick: null }))
// the same thing twice counts once; a vague fact is flagged so the tutor digs deeper
const said2 = "I'm an English teacher. I wanted to learn English to meet new people. My goal is to meet new people. I like guitar"
const v4 = validateWelcome({ facts: { job: { value: 'English teacher', quote: "I'm an English teacher" }, why: { value: 'To meet new people', quote: 'to meet new people', vague: true }, goal: { value: 'Meet new people', quote: 'My goal is to meet new people' }, likes: { value: 'Guitar', quote: 'I like guitar' } } }, said2, scenes)
ok('a fact that repeats another is dropped', v4.facts.why === 'To meet new people' && v4.facts.goal === undefined, v4.facts)
ok('vague facts are flagged', JSON.stringify(v4.thin) === '["why"]', v4.thin)
ok('what to ask next: the missing goal, more about the reason', JSON.stringify(stillToAsk(v4)) === JSON.stringify({ missing: ['goal'], thin: ['why'] }), stillToAsk(v4))
ok('not ready for the card with a vague or missing fact', !factsReady(v4) && factsReady({ facts: { job: 'a', why: 'b c', goal: 'd e', likes: 'f' }, thin: [] }))
ok('same fact, different words', sameFact('To meet new people', 'meet new people') && !sameFact('Travel to Australia', 'Meet new people'))
ok('a short quote has to be exact', !quoteIsTheirs('a doctor', student) && quoteIsTheirs('a nurse', student))
ok('the fallback scene exists', SCENES.some((s) => s.id === FALLBACK_PICK.sceneId))

/* ---- About me: added to what's there, never replacing it ---- */
const f = { job: 'Nurse in Osaka', goal: 'Travel to Australia' }
ok('About me from nothing', mergeAboutMe('', f) === 'Work: Nurse in Osaka. Goal: Travel to Australia.')
ok('added after what they wrote', mergeAboutMe('I love dogs.', f) === 'I love dogs.\nWork: Nurse in Osaka. Goal: Travel to Australia.')
ok('saving twice adds nothing', mergeAboutMe(mergeAboutMe('I love dogs.', f), f) === mergeAboutMe('I love dogs.', f))
const long = 'x'.repeat(590)
ok('never over 600, never cuts theirs', mergeAboutMe(long, f).length <= 600 && mergeAboutMe(long, f).startsWith(long))

/* ---- what they say to the cards ---- */
for (const s of ["Yes, that's right", 'yeah', 'はい、合ってます', 'Looks good!', 'OK']) ok(`card: "${s}" saves`, cardReply(s) === 'yes')
for (const s of ['Actually, I work in marketing', "No, I'm not a nurse", '仕事は違います', 'I learn English to talk to new people. And my goal is to make friends']) ok(`card: "${s}" corrects`, cardReply(s) === 'fix')
for (const s of ['Hmm', 'uh, mm', '']) ok(`card: "${s}" does nothing`, cardReply(s) === null)
const phrase = voicePhrase('café')
ok('the phrase', phrase === "Let's do the café role-play" && voicePhrase('') === "Let's do the role-play")
const h1 = heardPhrase("let's do the cafe", phrase)
ok('words light up as they are said (accents ignored)', h1.lit.slice(0, 4).every(Boolean) && !h1.lit[4] && h1.go, h1)
ok('the whole phrase opens it', heardPhrase("Let's do the café role-play", phrase).go)
ok('"OK" / "はい" opens it', heardPhrase('OK!', phrase).go && heardPhrase('はい、お願いします', phrase).go)
ok('"I\'m not sure" does not', !heardPhrase("I'm not sure", phrase).go)
ok('a question does not', !heardPhrase('What is a role-play?', phrase).go)

/* ---- the director ---- */
const snap = (o: Partial<WelcomeSnap>): WelcomeSnap => ({ step: 'about', elapsed: 30, left: 270, stepAge: 10, facts: {}, thin: [], cardDone: false, cardDoneAge: 0, cardIdle: 0, wrapSent: false, feedback: false, tutorQuiet: 0, ...o })
const to = (o: Partial<WelcomeSnap>) => JSON.stringify(welcomeNext(snap(o)))
const four = { job: 'a', why: 'b', goal: 'c', likes: 'd' }
ok('about: waits while there is little to show', welcomeNext(snap({ facts: { job: 'x' } })) === null)
ok('about: never before 1:15, even with everything', welcomeNext(snap({ elapsed: 50, facts: four })) === null)
ok('about: all four, none vague, after 1:15 → the card', to({ elapsed: WELCOME_AT.cardMin, facts: four }) === '{"to":"card"}')
ok('about: a vague fact keeps the tutor asking', welcomeNext(snap({ elapsed: 80, facts: four, thin: ['why'] })) === null)
ok('about: by 1:50 the card with what there is', to({ elapsed: WELCOME_AT.cardBy, facts: { job: 'a' }, thin: ['job'] }) === '{"to":"card"}')
ok('about: by 1:50 with nothing, straight to the role-play', to({ elapsed: WELCOME_AT.cardBy }) === '{"to":"suggest"}')
ok('card: stays up while they talk (only idle time counts)', welcomeNext(snap({ step: 'card', stepAge: 40, cardIdle: 5 })) === null)
ok('card: idle for 20 s → ends, not saved', to({ step: 'card', stepAge: 30, cardIdle: WELCOME_AT.cardIdle }) === '{"do":"skipCard"}')
ok('card: never longer than 75 s', to({ step: 'card', stepAge: WELCOME_AT.cardMax, cardIdle: 1 }) === '{"do":"skipCard"}')
ok('card: saved or not, it shows how it ended, then the role-play', welcomeNext(snap({ step: 'card', cardDone: true, cardDoneAge: 1 })) === null && to({ step: 'card', cardDone: true, cardDoneAge: WELCOME_AT.savedHold }) === '{"to":"suggest"}')
ok('suggest: opens by itself after 25 s', to({ step: 'suggest', stepAge: WELCOME_AT.autoOpen }) === '{"do":"open"}' && welcomeNext(snap({ step: 'suggest', stepAge: 20 })) === null)
ok('roleplay: asks the tutor to end it near 3:35, once', to({ step: 'roleplay', elapsed: WELCOME_AT.wrapScene }) === '{"do":"wrap"}' && welcomeNext(snap({ step: 'roleplay', elapsed: WELCOME_AT.wrapScene + 5, wrapSent: true })) === null)
ok('roleplay: ends it at 4:00', to({ step: 'roleplay', elapsed: WELCOME_AT.endScene, wrapSent: true }) === '{"do":"endScene"}')
ok('done: waits for the feedback', welcomeNext(snap({ step: 'done', stepAge: 5, feedback: true, tutorQuiet: 4 })) === null && welcomeNext(snap({ step: 'done', stepAge: 10, feedback: true, tutorQuiet: 1 })) === null)
ok('done: after the feedback and a pause → the tips', to({ step: 'done', stepAge: 10, feedback: true, tutorQuiet: 3 }) === '{"to":"tips"}')
ok('done: at the latest after 25 s, or with 45 s left', to({ step: 'done', stepAge: 25 }) === '{"to":"tips"}' && to({ step: 'done', stepAge: 2, left: 40 }) === '{"to":"tips"}')
ok('tips: until the goodbye', welcomeNext(snap({ step: 'tips', stepAge: 10, left: 60 })) === null && to({ step: 'tips', stepAge: 10, left: 20 }) === '{"to":"free"}' && to({ step: 'tips', stepAge: 30 }) === '{"to":"free"}')
ok('very late: skip to the tips', to({ step: 'suggest', elapsed: WELCOME_AT.late }) === '{"to":"tips"}' && to({ step: 'about', elapsed: WELCOME_AT.late }) === '{"to":"tips"}')
ok('free: stays', welcomeNext(snap({ step: 'free' })) === null)
ok('everything waits for a gap between turns, except ending a scene', waitsForGap({ to: 'card' }) && waitsForGap({ do: 'open' }) && !waitsForGap({ do: 'endScene' }))
ok('joining part-way through', welcomeStartStep(0) === 'about' && welcomeStartStep(120) === 'suggest' && welcomeStartStep(230) === 'free')

/* ---- their English level ---- */
ok('level: kept when valid, empty otherwise', normalizeSettings({ level: 'starter' }).level === 'starter' && normalizeSettings({ level: 'genius' }).level === '' && normalizeSettings({}).level === '')
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
