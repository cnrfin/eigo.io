import { FALLBACK_PICK, WELCOME_AT, cardReply, heardPhrase, mergeAboutMe, quoteIsTheirs, validateWelcome, voicePhrase, welcomeNext, welcomeStartStep, type WelcomeSnap } from '@/lib/classroom/welcome'
import { SCENES } from '@/lib/roleplay'
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
ok('garbage in: nothing out', JSON.stringify(validateWelcome('nope', student, scenes)) === JSON.stringify({ facts: {}, pick: null }))
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
for (const s of ['Actually, I work in marketing', "No, I'm not a nurse", '仕事は違います']) ok(`card: "${s}" corrects`, cardReply(s) === 'fix')
for (const s of ['yesterday I went out', 'Hmm', '']) ok(`card: "${s}" does nothing`, cardReply(s) === null)
const phrase = voicePhrase('café')
ok('the phrase', phrase === "Let's do the café role-play" && voicePhrase('') === "Let's do the role-play")
const h1 = heardPhrase("let's do the cafe", phrase)
ok('words light up as they are said (accents ignored)', h1.lit.slice(0, 4).every(Boolean) && !h1.lit[4] && h1.go, h1)
ok('the whole phrase opens it', heardPhrase("Let's do the café role-play", phrase).go)
ok('"OK" / "はい" opens it', heardPhrase('OK!', phrase).go && heardPhrase('はい、お願いします', phrase).go)
ok('"I\'m not sure" does not', !heardPhrase("I'm not sure", phrase).go)
ok('a question does not', !heardPhrase('What is a role-play?', phrase).go)

/* ---- the director ---- */
const snap = (o: Partial<WelcomeSnap>): WelcomeSnap => ({ step: 'about', elapsed: 30, left: 270, stepAge: 10, facts: {}, cardDone: false, cardDoneAge: 0, wrapSent: false, feedback: false, tutorQuiet: 0, ...o })
const to = (o: Partial<WelcomeSnap>) => JSON.stringify(welcomeNext(snap(o)))
ok('about: waits while there is little to show', welcomeNext(snap({ facts: { job: 'x' } })) === null)
ok('about: three facts → the card at once', to({ facts: { job: 'a', why: 'b', likes: 'c' } }) === '{"to":"card"}')
ok('about: by 1:30 the card with what there is', to({ elapsed: WELCOME_AT.cardBy, facts: { job: 'a' } }) === '{"to":"card"}')
ok('about: by 1:30 with nothing, straight to the role-play', to({ elapsed: WELCOME_AT.cardBy }) === '{"to":"suggest"}')
ok('card: waits for the answer', welcomeNext(snap({ step: 'card', stepAge: 10 })) === null)
ok('card: saved → a moment for the saved line, then the role-play', welcomeNext(snap({ step: 'card', cardDone: true, cardDoneAge: 0.5 })) === null && to({ step: 'card', cardDone: true, cardDoneAge: 1.5 }) === '{"to":"suggest"}')
ok('card: no answer in 25 s → moves on', to({ step: 'card', stepAge: WELCOME_AT.cardWait }) === '{"to":"suggest"}')
ok('suggest: opens by itself after 25 s', to({ step: 'suggest', stepAge: WELCOME_AT.autoOpen }) === '{"do":"open"}' && welcomeNext(snap({ step: 'suggest', stepAge: 20 })) === null)
ok('roleplay: asks the tutor to end it near 3:35, once', to({ step: 'roleplay', elapsed: WELCOME_AT.wrapScene }) === '{"do":"wrap"}' && welcomeNext(snap({ step: 'roleplay', elapsed: WELCOME_AT.wrapScene + 5, wrapSent: true })) === null)
ok('roleplay: ends it at 4:00', to({ step: 'roleplay', elapsed: WELCOME_AT.endScene, wrapSent: true }) === '{"do":"endScene"}')
ok('done: waits for the feedback', welcomeNext(snap({ step: 'done', stepAge: 5, feedback: true, tutorQuiet: 4 })) === null && welcomeNext(snap({ step: 'done', stepAge: 10, feedback: true, tutorQuiet: 1 })) === null)
ok('done: after the feedback and a pause → the tips', to({ step: 'done', stepAge: 10, feedback: true, tutorQuiet: 3 }) === '{"to":"tips"}')
ok('done: at the latest after 25 s, or with 45 s left', to({ step: 'done', stepAge: 25 }) === '{"to":"tips"}' && to({ step: 'done', stepAge: 2, left: 40 }) === '{"to":"tips"}')
ok('tips: until the goodbye', welcomeNext(snap({ step: 'tips', stepAge: 10, left: 60 })) === null && to({ step: 'tips', stepAge: 10, left: 20 }) === '{"to":"free"}' && to({ step: 'tips', stepAge: 30 }) === '{"to":"free"}')
ok('very late: skip to the tips', to({ step: 'suggest', elapsed: WELCOME_AT.late }) === '{"to":"tips"}' && to({ step: 'about', elapsed: WELCOME_AT.late }) === '{"to":"tips"}')
ok('free: stays', welcomeNext(snap({ step: 'free' })) === null)
ok('joining part-way through', welcomeStartStep(0) === 'about' && welcomeStartStep(120) === 'suggest' && welcomeStartStep(230) === 'free')
console.log(bad ? bad + ' FAILED' : 'all passed')
