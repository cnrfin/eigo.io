/**
 * Seed Level 2 (Vowels) of the Pronunciation course, on the Level 1 template:
 *   intro (concept) + mechanics (concept)
 *   3 blocks: HVPT discrimination (word in 4 voices) -> shadow grid (8 cards)
 *   challenge (one random pair per block + sentences) -> graded breakdown
 *
 * Vowels are accent-sensitive, so every spoken word/sentence is generated in
 * BOTH a UK voice (audioAssetId, courses/pron/<word>.mp3) and a US voice
 * (audioAssetIdUs, courses/pron/us/<word>.mp3). The lessons API serves whichever
 * matches the learner's grading accent. HVPT discrimination stays multi-accent.
 *
 * Additive + idempotent: ensures the course/level, rebuilds each lesson by slug,
 * and reuses audio across runs (ensure() skips regeneration). Re-run until "done".
 *
 *   node --env-file=.env.local scripts/seed-pron-vowels.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Trim the trailing breath ElevenLabs leaves on female-voice clips: reverse,
// strip the now-leading quiet (< -40dB), reverse back. Falls back to the
// original buffer if ffmpeg fails.
function trimTail(buf) {
  const d = mkdtempSync(join(tmpdir(), 'tr-'))
  try {
    const i = join(d, 'i.mp3'), o = join(d, 'o.mp3')
    writeFileSync(i, buf)
    const r = spawnSync('ffmpeg', ['-y', '-i', i, '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.04,areverse', '-c:a', 'libmp3lame', '-q:a', '4', o], { stdio: ['ignore', 'ignore', 'pipe'] })
    return r.status === 0 ? readFileSync(o) : buf
  } catch { return buf } finally { rmSync(d, { recursive: true, force: true }) }
}

const BUCKET = 'test-assets'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta', UK_M = 'fNYuJl2dBlX9V7NxmjnV', US_F = 'uYXf8XasLslADfZ2MB4u', US_M = 'UgBBYS2sOqTuMpoF3BR0'
const VOICES = [['UK-Female', UK_F], ['UK-Male', UK_M], ['US-Female', US_F], ['US-Male', US_M]]
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function tts(text, voiceId = UK_F, model = 'eleven_v3') {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error('ElevenLabs ' + res.status)
  const buf = Buffer.from(await res.arrayBuffer())
  return (voiceId === UK_F || voiceId === US_F) ? trimTail(buf) : buf
}
async function uploadInsert(path, buffer, transcript) {
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (upErr) throw new Error('upload ' + path + ': ' + upErr.message)
  const { data, error } = await sb.from('assets').insert({ type: 'audio', storage_path: path, transcript, alt_text: '' }).select('id').single()
  if (error) throw new Error('asset ' + path + ': ' + error.message)
  return data.id
}
async function ensure(path, make, transcript) {
  const { data } = await sb.from('assets').select('id').eq('storage_path', path).maybeSingle()
  if (data) return data.id
  return uploadInsert(path, await make(), transcript)
}
const slug = (w) => w.replace(/[^a-z]/gi, '').toLowerCase()
// US-only respellings fed to TTS (the stored transcript stays the real word):
//   "live" (verb /lɪv/) gets read as "live show" /laɪv/.
//   "cub" gets read /kjub/ ("kyub") by the US voice; "kub" forces /kʌb/.
// The UK voice reads plain "cub" correctly, so it is NOT respelled.
const SAY_US = { live: 'liv', cub: 'kub' }
const genUKF = (word) => ensure(`courses/pron/${slug(word)}.mp3`, () => tts(word, UK_F), word)
const genUSF = (word) => ensure(`courses/pron/us/${slug(word)}.mp3`, () => tts(SAY_US[slug(word)] ?? word, US_F), word)
const genSentence = (text, id) => ensure(`courses/pron/${id}.mp3`, () => tts(text, UK_F), text)
const genSentenceUS = (text, id) => ensure(`courses/pron/us/${id}.mp3`, () => tts(text, US_F), text)
async function genVoiceSet(word) {
  const ids = []
  for (const [folder, vid] of VOICES) ids.push(await ensure(`courses/pron/hvpt/${slug(word)}-${folder}.mp3`, () => tts(word, vid), word))
  return ids
}

// ── ensure course + level ──────────────────────────────────
const course = (await sb.from('courses').select('id').eq('slug', 'pronunciation').maybeSingle()).data
if (!course) throw new Error('Pronunciation course not found — run the consonant seed first.')
let level = (await sb.from('course_levels').select('id').eq('course_id', course.id).eq('order_index', 1).maybeSingle()).data
if (!level) level = (await sb.from('course_levels').insert({ course_id: course.id, order_index: 1, title: 'Vowels', title_ja: '母音' }).select('id').single()).data
const LEVEL_ID = level.id

// (The old "re-roll cub each run" block was removed: it deleted the good clip on
// every seed run and regenerated plain "cub" = "kyub". The SAY respelling above
// now makes generation come out clean, so the clip is left in place like any other.)

// Remove the retired "bird vowel" lesson (replaced by Walk & Work).
const retired = (await sb.from('lessons').select('id').eq('slug', 'pron-vowel-er').maybeSingle()).data
if (retired) { await sb.from('lesson_screens').delete().eq('lesson_id', retired.id); await sb.from('lessons').delete().eq('id', retired.id) }

// ── builders ───────────────────────────────────────────────
const concept = (content) => ({ type: 'concept', audio: null, content })
const disc = (voices, correct, other, explanation, explanation_ja, correctSecond = false) => ({
  type: 'question', audio: null, content: {
    question_type: 'single_choice', prompt: 'Which word did you hear?', prompt_ja: 'どちらの単語が聞こえましたか？', voices,
    options: correctSecond ? [{ content: other, is_correct: false }, { content: correct, is_correct: true }] : [{ content: correct, is_correct: true }, { content: other, is_correct: false }],
    explanation, explanation_ja,
  },
})
const grid = (words, prompt, prompt_ja, A, AUS, sounds) => ({ type: 'question', audio: null, content: { question_type: 'shadow', prompt, prompt_ja, ...(sounds ? { sounds } : {}), words: words.map(w => ({ word: w, audioAssetId: A[w], audioAssetIdUs: AUS[w] })) } })
const node = (word, sound, label, A, AUS) => ({ referenceText: word, displayText: word, targetLabel: sound ? `the ${label} sound` : 'clear vowels', ...(sound ? { targetSound: sound } : {}), audioAssetId: A[word], audioAssetIdUs: AUS[word] })


// sound_sorter (the bin game): ~10 ears-only rounds built from the lesson's own
// shadow words — no new audio. Order is FIXED here so the constraints are
// verifiable: 5/5 balance, never the same side three times in a row, and each
// round comes from a different minimal pair (spread across all blocks).
const SORTER_PATTERN = ['A', 'B', 'B', 'A', 'B', 'A', 'A', 'B', 'A', 'B']
function sorterScreen(def, A, AUS) {
  const pairs = def.blocks.flatMap(b => b.pairs)
  const rounds = SORTER_PATTERN.map((side, i) => {
    const p = pairs[i % pairs.length]
    const w = side === 'A' ? p[0] : p[1]
    return { word: w, sound: side === 'A' ? def.soundA.code : def.soundB.code, audioAssetId: A[w], audioAssetIdUs: AUS[w] }
  })
  // self-check: balance + no 3-run + every round has audio
  const sides = SORTER_PATTERN.join('')
  if (/AAA|BBB/.test(sides)) throw new Error('sorter: 3-in-a-row pattern')
  if (sides.replace(/B/g, '').length !== 5) throw new Error('sorter: unbalanced pattern')
  for (const r of rounds) if (!r.audioAssetId || !r.audioAssetIdUs) throw new Error('sorter: missing audio for ' + r.word)
  return { type: 'question', audio: null, content: {
    question_type: 'sound_sorter',
    prompt: 'Ears only: throw each word into the right box.',
    prompt_ja: '耳だけで勝負。聞こえた単語を正しい箱へ。',
    left: { sound: def.soundA.code, label: def.soundA.label },
    right: { sound: def.soundB.code, label: def.soundB.label },
    words: rounds,
    explanation: `Every round was one of this lesson's pairs. Replay the missed ones and listen for ${def.soundA.label} against ${def.soundB.label}.`,
    explanation_ja: 'すべてこのレッスンのペアの単語でした。間違えたものを聞き直して、2つの音の違いに耳を慣らしましょう。',
  } }
}

async function buildLesson(def) {
  const old = (await sb.from('lessons').select('id').eq('slug', def.slug).maybeSingle()).data
  if (old) { await sb.from('lesson_screens').delete().eq('lesson_id', old.id); await sb.from('lessons').delete().eq('id', old.id) }
  // audio: UK + US for every word
  const A = {}, AUS = {}
  const words = [...new Set(def.blocks.flatMap(b => b.pairs.flat()))]
  for (const w of words) { A[w] = await genUKF(w); AUS[w] = await genUSF(w) }
  const voices = {}
  for (const b of def.blocks) if (b.disc) voices[b.disc.playWord] = await genVoiceSet(b.disc.playWord)
  const sentLabel = def.soundA ? `${def.soundA.label} and ${def.soundB.label}` : 'clear vowels'
  const sents = []
  for (let i = 0; i < def.sentences.length; i++) {
    const text = def.sentences[i]
    sents.push({ referenceText: text, displayText: text, targetLabel: sentLabel, audioAssetId: await genSentence(text, `${def.slug}-s${i + 1}`), audioAssetIdUs: await genSentenceUS(text, `${def.slug}-s${i + 1}`) })
  }
  // lesson + screens
  const { data: lesson } = await sb.from('lessons').insert({ level_id: LEVEL_ID, order_index: def.order, slug: def.slug, title: def.title, title_ja: def.title_ja, free: false, estimated_minutes: 10 }).select('id').single()
  const screens = [concept(def.intro), concept(def.mechanics)]
  for (const b of def.blocks) {
    if (b.disc) screens.push(disc(voices[b.disc.playWord], b.disc.correct, b.disc.other, b.disc.expl, b.disc.explJa, b.disc.correctSecond))
    screens.push(grid(b.pairs.flat(), b.label, b.label_ja, A, AUS, def.soundA && def.soundB ? [def.soundA.code, def.soundB.code] : undefined))
  }
  // automaticity step: the bin game, right before the challenge (skipped by
  // single-sound lessons like clusters, which have no A/B contrast to sort)
  if (def.soundA && def.soundB) screens.push(sorterScreen(def, A, AUS))
  screens.push({
    type: 'question', audio: null, content: {
      question_type: 'challenge', accent: 'en-US', prompt: 'Say each word to walk Teri to the finish!', prompt_ja: '単語を言って、テリをゴールまで連れて行こう！',
      positions: def.blocks.map(b => ({ pairs: b.pairs.map(([a, bw]) => [node(a, def.soundA?.code, def.soundA?.label, A, AUS), node(bw, def.soundB?.code, def.soundB?.label, A, AUS)]) })),
      sentences: sents,
    },
  })
  const rows = screens.map((s, i) => ({ lesson_id: lesson.id, order_index: i, type: s.type, content: s.content, audio_asset_id: s.audio }))
  const { error } = await sb.from('lesson_screens').insert(rows)
  if (error) throw new Error('screens: ' + error.message)
  console.log(`✓ ${def.slug}: ${screens.length} screens (UK+US audio)`)
}

// ── lessons ────────────────────────────────────────────────
const LESSONS = [
  {
    slug: 'pron-vowel-ee-ih', order: 0, title: 'Long & Short "ee"', title_ja: '長い「イー」と短い「イ」',
    soundA: { code: 'ee', label: 'long "ee"' }, soundB: { code: 'ih', label: 'short "i"' },
    intro: {
      title: 'Why "sheep" and "ship" sound the same', title_ja: '「sheep」と「ship」が同じに聞こえる理由',
      body: `Japanese has one sound, い, sitting right between English /iː/ (the long "ee" in *sheep*) and /ɪ/ (the short "i" in *ship*). So both words reach for い, and they come out almost the same.

The fix is not just "make one longer." The two vowels are made in different ways: one is tight and high, the other is relaxed and a touch lower. Length helps, but the shape of your mouth is what really separates them.

This lesson trains the two apart, in common words and quick pairs.`,
      body_ja: `日本語には、英語の /iː/（*sheep* の長い「イー」）と /ɪ/（*ship* の短い「イ」）のちょうど中間にある「い」が一つだけあります。だからどちらの単語も「い」になってしまい、ほとんど同じに聞こえます。

直し方は「片方をのばすだけ」ではありません。この2つの母音は作り方がちがいます。一方は口を張って高く、もう一方は力を抜いて少し低め。長さも大事ですが、本当に分けるのは口の形です。

このレッスンでは、よく使う単語と短いペアで、この2つを練習します。`,
    },
    mechanics: {
      title: 'Tight and long, or relaxed and short', title_ja: '「張って長く」か「ゆるめて短く」か',
      body: `The difference is tension and length, together.

• *ee* (/iː/): spread your lips like a small smile, push your tongue high and forward, and hold the sound. Tight and long: *sheep*, *seat*, *feet*.
• *i* (/ɪ/): let everything relax, drop your tongue a little, and cut the sound short. Loose and quick: *ship*, *sit*, *fit*.

A quick test: say "ee" with a smile and hold it, then relax your face and shorten it to "i." Feel your lips and tongue let go.

Before each word, check: tight and long, or relaxed and short?`,
      body_ja: `ちがいは、力の入れ方と長さ、その両方です。

• *ee*（/iː/）：口を軽くほほえむように横に開き、舌を高く前に押し出して、音をのばします。張って長め。*sheep*、*seat*、*feet*。
• *i*（/ɪ/）：ぜんぶの力を抜いて、舌を少し下げ、音を短く切ります。ゆるく、すばやく。*ship*、*sit*、*fit*。

かんたんな確認：ほほえみながら「イー」とのばし、次に顔の力を抜いて短く「イ」。唇と舌がゆるむのを感じましょう。

単語の前に確認。「張って長く」か「ゆるめて短く」か。`,
    },
    blocks: [
      { label: 'Everyday pairs', label_ja: 'よく使うペア',
        disc: { playWord: 'sheep', correct: 'sheep', other: 'ship', expl: `It was *sheep*, the long "ee": lips smiling, tongue high, held long. *Ship* is short and relaxed.`, explJa: `正解は *sheep*、長い「イー」です。口を横に、舌を高く、長めに。*ship* は短くゆるい音。` },
        pairs: [['sheep', 'ship'], ['seat', 'sit'], ['feet', 'fit'], ['heel', 'hill']] },
      { label: 'More pairs', label_ja: 'もっとペア',
        disc: { playWord: 'leave', correct: 'leave', other: 'live', correctSecond: true, expl: `It was *leave*, the long "ee" sound, held long. *Live* is short and relaxed.`, explJa: `正解は *leave*、長い「イー」をのばします。*live* は短くゆるい音。` },
        pairs: [['leave', 'live'], ['beat', 'bit'], ['green', 'grin'], ['cheap', 'chip']] },
      { label: 'Sharpen your ear', label_ja: '耳をすませて',
        disc: { playWord: 'reach', correct: 'reach', other: 'rich', expl: `It was *reach*, the long "ee." *Rich* is the short, relaxed "i."`, explJa: `正解は *reach*、長い「イー」です。*rich* は短くゆるい「イ」。` },
        pairs: [['reach', 'rich'], ['peak', 'pick'], ['deep', 'dip'], ['week', 'wick']] },
    ],
    sentences: ['The sheep is on a big ship.', 'Please sit on this green seat.', 'I feel a bit weak this week.'],
  },
  {
    slug: 'pron-vowel-oo-uh', order: 1, title: 'Long & Short "oo"', title_ja: '長い「ウー」と短い「ウ」',
    soundA: { code: 'oo', label: 'long "oo"' }, soundB: { code: 'uh', label: 'short "oo"' },
    intro: {
      title: 'Why "fool" and "full" sound the same', title_ja: '「fool」と「full」が同じに聞こえる理由',
      body: `English has two "oo" vowels. /uː/ is the long one in *fool*, *pool*, *food*. /ʊ/ is the short one in *full*, *pull*, *foot*. Japanese う sits between them, so both words turn into the same う.

As with the "ee" pair, length is only half of it. The long /uː/ has tight, pushed-forward lips; the short /ʊ/ is relaxed and barely rounded.

This lesson trains the two apart. (English has fewer of these pairs, so a few words here are less common, but the contrast is the same.)`,
      body_ja: `英語には「ウー」の母音が2つあります。/uː/ は *fool*、*pool*、*food* の長い音。/ʊ/ は *full*、*pull*、*foot* の短い音。日本語の「う」はその中間なので、どちらも同じ「う」になってしまいます。

「イー」のペアと同じで、長さは半分にすぎません。長い /uː/ は唇をしっかり前に突き出し、短い /ʊ/ は力を抜いて軽く丸めるだけです。

このレッスンでその2つを分けて練習します。（このペアは英語に多くないので、少しめずらしい単語もありますが、対比は同じです。）`,
    },
    mechanics: {
      title: 'Pushed forward, or relaxed', title_ja: '「前に突き出す」か「ゆるめる」か',
      body: `Both are made at the back, with the lips.

• *oo* (/uː/): round your lips tight and push them forward, like the start of a whistle, and hold it long: *fool*, *pool*, *Luke*.
• *short oo* (/ʊ/): let your lips relax, barely rounded, and keep it short: *full*, *pull*, *look*.

A quick test: push your lips forward for a long "oo," then relax them and shorten it. The long one feels tense at the front; the short one feels loose.

Before each word, check: pushed forward and long, or relaxed and short?`,
      body_ja: `どちらも口の奥と唇で作る音です。

• *oo*（/uː/）：唇をしっかり丸めて前に突き出し、口笛の出だしのように、長くのばします。*fool*、*pool*、*Luke*。
• *短いoo*（/ʊ/）：唇の力を抜いて軽く丸めるだけで、短く出します。*full*、*pull*、*look*。

かんたんな確認：唇を前に出して長く「ウー」、次に力を抜いて短く。長い方は前が張り、短い方はゆるみます。

単語の前に確認。「前に突き出して長く」か「ゆるめて短く」か。`,
    },
    blocks: [
      { label: 'Everyday pairs', label_ja: 'よく使うペア',
        disc: { playWord: 'fool', correct: 'fool', other: 'full', expl: `It was *fool*, the long "oo": lips pushed forward, held long. *Full* is short and relaxed.`, explJa: `正解は *fool*、長い「ウー」です。唇を前に出して長めに。*full* は短くゆるい音。` },
        pairs: [['fool', 'full'], ['pool', 'pull'], ['Luke', 'look'], ['food', 'foot']] },
      { label: 'More pairs', label_ja: 'もっとペア',
        disc: { playWord: 'boot', correct: 'boot', other: 'book', correctSecond: true, expl: `It was *boot*, the long "oo." *Book* is the short, relaxed one.`, explJa: `正解は *boot*、長い「ウー」です。*book* は短くゆるい音。` },
        pairs: [['boot', 'book'], ['suit', 'soot'], ['who’d', 'hood'], ['cooed', 'could']] },
      { label: 'Sharpen your ear', label_ja: '耳をすませて',
        disc: { playWord: 'nuke', correct: 'nuke', other: 'nook', expl: `It was *nuke*, the long "oo." *Nook* is short and relaxed.`, explJa: `正解は *nuke*、長い「ウー」です。*nook* は短くゆるい音。` },
        pairs: [['wooed', 'wood'], ['stewed', 'stood'], ['nuke', 'nook'], ['kook', 'cook']] },
    ],
    sentences: ['The cook took a good book.', 'Luke put his foot in the pool.', 'Choose the blue suit, not the wool.'],
  },
  {
    slug: 'pron-vowel-ae-ah', order: 2, title: 'Cat & Cut', title_ja: '「cat」と「cut」',
    soundA: { code: 'ae', label: '"a" in cat' }, soundB: { code: 'ah', label: '"u" in cut' },
    intro: {
      title: 'Why "cat" and "cut" sound the same', title_ja: '「cat」と「cut」が同じに聞こえる理由',
      body: `Japanese has one ア. English splits that space into several sounds, and two of them sit very close: /æ/, the wide "a" in *cat*, and /ʌ/, the short "u" in *cut*. Reach for ア and they both come out the same.

They are made with the mouth in different positions: one wide and bright, the other relaxed and central.

This lesson trains the two apart.`,
      body_ja: `日本語の「ア」は一つ。英語はその範囲をいくつかの音に分けていて、そのうち2つがとても近い場所にあります。*cat* の広い「ア」/æ/ と、*cut* の短い「ア」/ʌ/ です。「ア」で済ませると、どちらも同じになってしまいます。

この2つは口の形がちがいます。一方は横に広く明るい音、もう一方は力を抜いた中ほどの音です。

このレッスンでその2つを分けて練習します。`,
    },
    mechanics: {
      title: 'Wide and bright, or relaxed and central', title_ja: '「広く明るい」か「ゆるめて中ほど」か',
      body: `The mouth shape is the key.

• *a* (/æ/): open wide and spread your lips to the sides, tongue low and forward. A bright, flat "a": *cat*, *hat*, *map*.
• *u* (/ʌ/): relax everything, mouth half open, tongue in the middle. A short, plain "uh": *cut*, *hut*, *cup*.

A quick test: smile-stretch into *cat*, then drop the smile and relax into *cut*. The first feels wide; the second feels loose and central.

Before each word, check: wide and bright, or relaxed and central?`,
      body_ja: `かぎは口の形です。

• *a*（/æ/）：口を大きく開けて唇を横に広げ、舌は低く前に。明るく平たい「ア」。*cat*、*hat*、*map*。
• *u*（/ʌ/）：ぜんぶの力を抜いて口を半分開け、舌は中ほどに。短くそっけない「ア」。*cut*、*hut*、*cup*。

かんたんな確認：横に広げて *cat*、次に力を抜いて *cut*。最初は広く、次はゆるく中ほどに感じます。

単語の前に確認。「広く明るい」か「ゆるめて中ほど」か。`,
    },
    blocks: [
      { label: 'Everyday pairs', label_ja: 'よく使うペア',
        disc: { playWord: 'cat', correct: 'cat', other: 'cut', expl: `It was *cat*, the wide "a": lips spread, mouth open. *Cut* is the relaxed, central "u."`, explJa: `正解は *cat*、広い「ア」です。唇を横に、口を開けて。*cut* は力を抜いた中ほどの音。` },
        pairs: [['cat', 'cut'], ['hat', 'hut'], ['cap', 'cup'], ['ran', 'run']] },
      { label: 'More pairs', label_ja: 'もっとペア',
        disc: { playWord: 'bad', correct: 'bad', other: 'bud', correctSecond: true, expl: `It was *bad*, the wide "a." *Bud* is the relaxed, central "u."`, explJa: `正解は *bad*、広い「ア」です。*bud* は力を抜いた中ほどの音。` },
        pairs: [['bad', 'bud'], ['cab', 'cub'], ['fan', 'fun'], ['bat', 'but']] },
      { label: 'Sharpen your ear', label_ja: '耳をすませて',
        disc: { playWord: 'track', correct: 'track', other: 'truck', expl: `It was *track*, the wide "a." *Truck* is the relaxed "u."`, explJa: `正解は *track*、広い「ア」です。*truck* は力を抜いた「ア」。` },
        pairs: [['track', 'truck'], ['ban', 'bun'], ['match', 'much'], ['ankle', 'uncle']] },
    ],
    sentences: ['The cat ran up to my uncle.', 'Run and grab a fun cup.', 'A bad bug jumped on the rug.'],
  },
  {
    slug: 'pron-vowel-eh-ae', order: 3, title: 'Bed & Bad', title_ja: '「bed」と「bad」',
    soundA: { code: 'eh', label: '"e" in bed' }, soundB: { code: 'ae', label: '"a" in cat' },
    intro: {
      title: 'Why "bed" and "bad" sound the same', title_ja: '「bed」と「bad」が同じに聞こえる理由',
      body: `Japanese エ and the start of ア are close to two English sounds that English keeps apart: /ɛ/, the "e" in *bed*, and /æ/, the wide "a" in *bad*. Many learners land somewhere between, so the two words blur.

The difference is how far the mouth opens, and how wide the lips spread.

This lesson trains the two apart. (You met /æ/ in "Cat & Cut"; here you sharpen it against /ɛ/.)`,
      body_ja: `日本語の「エ」と「ア」の入り口は、英語が区別する2つの音に近いです。*bed* の「エ」/ɛ/ と、*bad* の広い「ア」/æ/。多くの学習者はその中間に着地してしまい、2つの単語が混ざります。

ちがいは、口をどれだけ開けるか、唇をどれだけ横に広げるかです。

このレッスンでその2つを分けて練習します。（/æ/ は「Cat & Cut」で出てきました。ここでは /ɛ/ と並べて磨きます。）`,
    },
    mechanics: {
      title: 'Half open, or wide open', title_ja: '「半分開ける」か「大きく開ける」か',
      body: `Both are bright front vowels; the jaw is what moves.

• *e* (/ɛ/): open your mouth only a little, lips slightly spread, like the "e" in *red*: *bed*, *pen*, *men*.
• *a* (/æ/): open wider and spread your lips more, dropping your jaw: *bad*, *pan*, *man*.

A quick test: say *bed*, then *bad*, and feel your jaw drop lower for *bad*. If they sound the same, open wider on the "a."

Before each word, check: half open (e), or wide open (a)?`,
      body_ja: `どちらも明るい前寄りの母音で、動くのはあごです。

• *e*（/ɛ/）：口を少しだけ開け、唇を軽く横に。*red* の「エ」のように。*bed*、*pen*、*men*。
• *a*（/æ/）：もっと大きく開け、唇をより横に広げ、あごを下げます。*bad*、*pan*、*man*。

かんたんな確認：*bed* と言ってから *bad*。*bad* であごが下がるのを感じましょう。同じに聞こえたら、「ア」でもっと大きく開けます。

単語の前に確認。「半分開ける（e）」か「大きく開ける（a）」か。`,
    },
    blocks: [
      { label: 'Everyday pairs', label_ja: 'よく使うペア',
        disc: { playWord: 'bed', correct: 'bed', other: 'bad', expl: `It was *bed*, the "e": mouth only a little open. *Bad* opens wider for the "a."`, explJa: `正解は *bed*、「エ」です。口は少しだけ開けます。*bad* はもっと開けた「ア」。` },
        pairs: [['bed', 'bad'], ['pen', 'pan'], ['men', 'man'], ['bet', 'bat']] },
      { label: 'More pairs', label_ja: 'もっとペア',
        disc: { playWord: 'said', correct: 'said', other: 'sad', correctSecond: true, expl: `It was *said*, the "e." *Sad* opens wider for the "a."`, explJa: `正解は *said*、「エ」です。*sad* はもっと開けた「ア」。` },
        pairs: [['said', 'sad'], ['beg', 'bag'], ['set', 'sat'], ['lend', 'land']] },
      { label: 'Sharpen your ear', label_ja: '耳をすませて',
        disc: { playWord: 'guess', correct: 'guess', other: 'gas', expl: `It was *guess*, the "e." *Gas* opens wider for the "a."`, explJa: `正解は *guess*、「エ」です。*gas* はもっと開けた「ア」。` },
        pairs: [['guess', 'gas'], ['head', 'had'], ['send', 'sand'], ['dead', 'dad']] },
    ],
    sentences: ['I said the red pen is bad.', 'Ten men sat on the sand.', 'Send the bag to my dad.'],
  },
  {
    slug: 'pron-vowel-walk-work', order: 4, title: 'Walk & Work', title_ja: '「walk」と「work」',
    soundA: { code: 'aw', label: '"aw" in walk' }, soundB: { code: 'er', label: '"er" in work' },
    intro: {
      title: 'Why "walk" and "work" sound the same', title_ja: '「walk」と「work」が同じに聞こえる理由',
      body: `Both *walk* and *work* turn into the same ウォーク in Japanese, but in English they are two different vowels. *Walk* has /ɔː/, a rounded, open "aw" made at the back. *Work* has /ɜː/, a long, even sound made right in the middle of the mouth, with no Japanese equivalent.

One note on accents: the *work* vowel has no "r" in British English, while in American English the tongue curls for an "r" colour. The challenge grades against the American model, so match it when you record. Also, many American speakers say words like *walk* and *saw* with the lips less rounded, closer to "ah" — either way the sound stays long and at the back, completely different from the central "er" of *work*.

This lesson trains the two apart.`,
      body_ja: `*walk* も *work* も、日本語ではどちらも「ウォーク」になってしまいますが、英語ではまったく別の母音です。*walk* は /ɔː/、口の奥で作る丸く開いた「オー」。*work* は /ɜː/、口のちょうど真ん中で作る長く一定の音で、日本語にはありません。

アクセントについて一つ。*work* の母音は、イギリス英語では「r」がなく、アメリカ英語では舌を巻いて「r」の色がつきます。チャレンジはアメリカ英語のお手本で採点するので、録音のときはそちらに合わせましょう。もう一つ。アメリカ英語では *walk* や *saw* の唇の丸めが弱く、「アー」に近くなることがあります。それでも音は長く口の奥のまま。*work* の真ん中の「アー」とはまったく別です。

このレッスンでその2つを分けて練習します。`,
    },
    mechanics: {
      title: 'Rounded and back, or even and central', title_ja: '「丸めて奥」か「一定で中ほど」か',
      body: `The two sit in different places.

• *aw* (/ɔː/): round your lips, pull your tongue back, and drop your jaw, like a long "aw" in *saw*. There is no "r": *walk*, *short*, *born*.
• *er* (/ɜː/ or /ɝ/): relax your mouth in the middle, not rounded, and hold a long, even sound. American curls the tongue for an "r" colour; British leaves the "r" out: *work*, *word*, *turn*.

A quick test: round your lips low for *walk*, then unround and centre your tongue for *work*. The first feels rounded and back; the second feels flat and central.

Before each word, check: rounded "aw," or even "er"?`,
      body_ja: `2つは口の中の場所がちがいます。

• *aw*（/ɔː/）：唇を丸め、舌を奥に引き、あごを下げます。*saw* の長い「オー」のように。「r」はつけません。*walk*、*short*、*born*。
• *er*（/ɜː/ または /ɝ/）：口を真ん中でリラックスさせ、丸めずに、長く一定にのばします。アメリカ式は舌を巻いて「r」の色を、イギリス式は「r」を出しません。*work*、*word*、*turn*。

かんたんな確認：唇を丸めて低く *walk*、次に丸めをやめて舌を中ほどに *work*。最初は丸く奥、次は平らで中ほどに感じます。

単語の前に確認。「丸めた『オー』」か「一定の『アー』」か。`,
    },
    blocks: [
      { label: 'Everyday pairs', label_ja: 'よく使うペア',
        disc: { playWord: 'walk', correct: 'walk', other: 'work', expl: `It was *walk*, the rounded "aw": lips rounded, tongue back. *Work* is the even, central "er."`, explJa: `正解は *walk*、丸めた「オー」です。唇を丸め、舌を奥に。*work* は一定で中ほどの「アー」。` },
        pairs: [['walk', 'work'], ['ward', 'word'], ['short', 'shirt'], ['born', 'burn']] },
      { label: 'More pairs', label_ja: 'もっとペア',
        disc: { playWord: 'warm', correct: 'warm', other: 'worm', correctSecond: true, expl: `It was *warm*, the rounded "aw." *Worm* is the even, central "er."`, explJa: `正解は *warm*、丸めた「オー」です。*worm* は一定で中ほどの「アー」。` },
        pairs: [['warm', 'worm'], ['torn', 'turn'], ['four', 'fur'], ['caught', 'curt']] },
      { label: 'Sharpen your ear', label_ja: '耳をすませて',
        disc: { playWord: 'saw', correct: 'saw', other: 'sir', expl: `It was *saw*, the rounded "aw." *Sir* is the even, central "er."`, explJa: `正解は *saw*、丸めた「オー」です。*sir* は一定で中ほどの「アー」。` },
        pairs: [['saw', 'sir'], ['wall', 'whirl'], ['port', 'pert'], ['hall', 'hurl']] },
    ],
    sentences: ['I walk to work every morning.', 'The warm worm turned in the dirt.', 'He saw the short shirt fall.'],
  },
  {
    slug: 'pron-vowel-diphthongs', order: 5, title: 'Smooth Diphthongs', title_ja: 'なめらかな二重母音',
    // no soundA/soundB: production lesson, graded on the whole word (one smooth glide)
    intro: {
      title: 'One glide, not two beats', title_ja: '2拍ではなく、ひとつの滑り',
      body: `A diphthong is one vowel that glides from one sound to another inside a single beat: *day* (/eɪ/), *go* (/oʊ/), *time* (/aɪ/). Japanese tends to do one of two things with them: split the glide into two full beats (*time* as "ta-i-mu"), or flatten it into one long level sound (*cake* as ケーキ, *go* as ゴー), losing the glide entirely. Both sound off.

The fix is to glide smoothly and keep it to one beat: start at the first sound and slide into the second without stopping.

This lesson trains three of the most common glides.`,
      body_ja: `二重母音は、1拍のなかで一つの音から別の音へ滑る母音です。*day*（/eɪ/）、*go*（/oʊ/）、*time*（/aɪ/）。日本語ではこの滑りが、2拍に割れる（*time* が「タ・イ・ム」）か、平らな長い音になる（*cake* が「ケーキ」、*go* が「ゴー」）かのどちらかになりがちです。どちらも英語らしく聞こえません。

直し方は、なめらかに滑らせて1拍におさめること。最初の音から始めて、止まらずに次の音へすべり込みます。

このレッスンでは、いちばんよく使う3つの滑りを練習します。`,
    },
    mechanics: {
      title: 'Slide, do not step', title_ja: 'すべらせる、区切らない',
      body: `Keep each one to a single, smooth beat.

• /eɪ/ (the "ay" in *day*): start on "e" and glide up to "ee," one beat: *name*, *late*, *rain*.
• /oʊ/ (the "oh" in *go*): start on "o" and round into "oo," one beat: *home*, *boat*, *snow*.
• /aɪ/ (the "eye" in *time*): start open on "ah" and glide to "ee," one beat: *nice*, *ride*, *light*.

A good check: clap once for the whole word. If you clapped twice on *day*, you split the glide.`,
      body_ja: `それぞれを、なめらかな1拍におさめます。

• /eɪ/（*day* の「エイ」）：「エ」から始めて「イ」へすべり上げ、1拍で。*name*、*late*、*rain*。
• /oʊ/（*go* の「オウ」）：「オ」から始めて「ウ」へ丸め、1拍で。*home*、*boat*、*snow*。
• /aɪ/（*time* の「アイ」）：開いた「ア」から始めて「イ」へすべり、1拍で。*nice*、*ride*、*light*。

よい確認：語ぜんたいで手を1回たたく。*day* で2回たたいたら、滑りを割っています。`,
    },
    blocks: [
      { label: 'The "ay" sound /eɪ/', label_ja: '「エイ」/eɪ/', pairs: [['day', 'name'], ['late', 'rain'], ['play', 'wait'], ['cake', 'train']] },
      { label: 'The "oh" sound /oʊ/', label_ja: '「オウ」/oʊ/', pairs: [['go', 'home'], ['boat', 'snow'], ['road', 'phone'], ['coat', 'nose']] },
      { label: 'The "eye" sound /aɪ/', label_ja: '「アイ」/aɪ/', pairs: [['time', 'nice'], ['ride', 'light'], ['five', 'sky'], ['white', 'smile']] },
    ],
    sentences: ['Wait for the train today.', 'I drove the old boat home.', 'I like the bright night sky.'],
  },
]

for (const def of LESSONS) await buildLesson(def)
console.log('done')
