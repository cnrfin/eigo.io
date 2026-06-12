/**
 * Seed the remaining Level 1 consonant lessons of the Pronunciation course,
 * on the L-and-R template:
 *   understand (intro + mechanics)
 *   3 blocks: HVPT discrimination (word in 4 voices) -> shadow grid (8 cards = 4 pairs)
 *   challenge (random pair per block + a sentence) -> results breakdown
 *
 * Additive + idempotent: ensures the course/level exist and rebuilds each
 * lesson by slug. Audio is generated with ElevenLabs and reused across runs
 * (ensure() skips regeneration). Generation is heavy on a fresh DB, so re-run
 * until it prints "done" (each run resumes where it left off).
 *
 *   node --env-file=.env.local scripts/seed-pron-consonants.mjs
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
// Japanese voices (from src/lib/sayafterme/voices.ts) for the katakana_detox take.
const JA_F = 'MXKtCrra8fvlDUbfKUT1', JA_M = 'GKDaBI8TKSBJVhsCLD6n'
const VOICES = [['UK-Female', UK_F], ['UK-Male', UK_M], ['US-Female', US_F], ['US-Male', US_M]]
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function tts(text, voiceId = UK_F, model = 'eleven_v3') {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error('ElevenLabs ' + res.status)
  const buf = Buffer.from(await res.arrayBuffer())
  return (voiceId === UK_F || voiceId === US_F || voiceId === JA_F) ? trimTail(buf) : buf
}

// Per-word pronunciation override: "asked" gets a spurious extra vowel
// ("ask-ed"), so feed the respelling "askt" to the normal v3 voice.
// ("bass" is left as the plain word — every respelling attempt sounded worse
//  than the default reading.)
// "bow" is a heteronym and was read /boʊ/ (hair bow); "bough" is a homophone
// of the intended /baʊ/ (take a bow), so TTS that instead. Display text and
// asset transcripts stay "bow".
const RESPELL = { asked: 'askt', bow: 'bough' }
function ttsFor(word) {
  const key = word.toLowerCase()
  if (RESPELL[key]) return tts(RESPELL[key])
  return tts(word)
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
const slugify = (w) => w.replace(/[^a-z]/gi, '').toLowerCase()
const genUKF = (word) => ensure(`courses/pron/${slugify(word)}.mp3`, () => ttsFor(word), word)
const genUSF = (word) => ensure(`courses/pron/us/${slugify(word)}.mp3`, () => tts(RESPELL[word.toLowerCase()] ?? word, US_F), word)
const genSentence = (text, slug) => ensure(`courses/pron/${slug}.mp3`, () => tts(text), text)
const genSentenceUS = (text, slug) => ensure(`courses/pron/us/${slug}.mp3`, () => tts(text, US_F), text)
// Katakana take for katakana_detox: a Japanese voice confidently reading the
// loanword. Wrapped in 。 so the voice states it (no list/question intonation).
const genKana = (word, kana, voice) => ensure(`courses/pron/kana/${slugify(word)}.mp3`, () => tts(`${kana}。`, voice), kana)
async function genVoiceSet(word) {
  const ids = []
  for (const [folder, vid] of VOICES) ids.push(await ensure(`courses/pron/hvpt/${word.toLowerCase()}-${folder}.mp3`, () => tts(word, vid), word))
  return ids
}

// ── ensure course + level ──────────────────────────────────
let course = (await sb.from('courses').select('id').eq('slug', 'pronunciation').maybeSingle()).data
if (!course) {
  course = (await sb.from('courses').insert({
    slug: 'pronunciation', exam_slug: 'pronunciation', title: 'Pronunciation 101', title_ja: '発音 101',
    description: 'Learn the proper way to improve and fix common pronunciation mistakes made by Japanese speakers. Pronunciation graded at the end of each lesson.',
    description_ja: '日本人がつまずきやすい発音のミスを、正しいやり方でしっかり直そう。各レッスンの最後には、発音を採点します。', published: false, order_index: 3,
  }).select('id').single()).data
}
let level = (await sb.from('course_levels').select('id').eq('course_id', course.id).eq('order_index', 0).maybeSingle()).data
if (!level) level = (await sb.from('course_levels').insert({ course_id: course.id, order_index: 0, title: 'Tricky Consonants', title_ja: '苦手な子音' }).select('id').single()).data
const LEVEL_ID = level.id

// One-off audio repairs (bass/asked respell readings, bow /boʊ/→/baʊ/ via the
// RESPELL above) have all landed in the stored clips. If a clip ever needs
// regenerating, delete its asset row + storage object and re-run; ensure()
// rebuilds only what is missing.

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
// sound/label optional: clusters grade the whole word (no single target sound).
const node = (word, sound, label, A, AUS) => ({ referenceText: word, displayText: word, targetLabel: sound ? `the ${label} sound` : 'clear consonants', ...(sound ? { targetSound: sound } : {}), audioAssetId: A[word], audioAssetIdUs: AUS[word] })


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
  const sentLabel = def.soundA ? `${def.soundA.label} and ${def.soundB.label}` : 'clear consonants'
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
  // katakana_detox (workstream 5): A/B which_natural, native EN vs a Japanese
  // voice reading the katakana loanword. Inserted after the shadow grids, before
  // the challenge. JA voices alternate F/M across items.
  if (def.kataDetox) {
    const items = []
    for (let i = 0; i < def.kataDetox.items.length; i++) {
      const it = def.kataDetox.items[i]
      const ja = await genKana(it.word, it.kana, i % 2 === 0 ? JA_F : JA_M)
      items.push({ prompt: it.word, naturalAudioAssetId: await genUKF(it.word), naturalAudioAssetIdUs: await genUSF(it.word), choppyAudioAssetId: ja, choppyAudioAssetIdUs: ja })
    }
    screens.push({ type: 'question', audio: null, content: { question_type: 'which_natural', prompt: def.kataDetox.prompt, prompt_ja: def.kataDetox.prompt_ja, items, explanation: def.kataDetox.why, explanation_ja: def.kataDetox.why_ja } })
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
  console.log(`✓ ${def.slug}: ${screens.length} screens`)
}

// ── lessons ────────────────────────────────────────────────
const LESSONS = [
  {
    slug: 'pron-th-and-s', order: 1, title: 'TH & S', title_ja: 'TH と S',
    soundA: { code: 'th', label: 'TH' }, soundB: { code: 's', label: 'S' },
    intro: {
      title: 'Why TH turns into S', title_ja: 'TH が S になってしまう理由',
      body: `You already know English has a "th" sound that Japanese does not. The trouble is what the mouth does instead: it reaches for the closest Japanese sound, /s/, so *think* comes out as *sink* and *thank* as *sank*.

The fix is not a new hissing sound. It is one small move: the tip of your tongue comes forward, lightly between your top and bottom teeth. /s/ keeps the tongue inside; "th" lets it peek out.

This lesson trains that one move at the start and end of words.`,
      body_ja: `英語には日本語にない「th」の音があります。これはご存じですよね。問題は、その代わりに口が何をするか。いちばん近い日本語の音 /s/ を選んでしまうので、*think* が *sink*、*thank* が *sank* になってしまいます。

直し方は、新しい「スー」という音を覚えることではありません。たった一つの動きです。舌先を前に出して、上下の歯のあいだに軽くはさみます。/s/ は舌を中に置いたまま。「th」は舌をちょっとのぞかせます。

このレッスンでは、語のはじめとおわりで、その動きを練習します。`,
    },
    mechanics: {
      title: 'Tongue in, or tongue out', title_ja: '舌は「中」か「外」か',
      body: `The whole difference is where your tongue tip sits.

• *s*: the tongue tip stays just behind your top teeth, near the ridge inside the mouth, and air hisses through a small groove.
• *th*: the tongue tip comes forward to touch the bottom of your top teeth, peeking out a little, and air flows softly over the top of it.

Hold a hand near your mouth: /s/ gives a sharp hiss, "th" gives a soft, spread airflow. If you can see your tongue tip in a mirror, you are making "th".

Before each word, check one thing: is the tongue in, or out?`,
      body_ja: `違いは、舌先の位置だけです。

• *s*：舌先は上の歯のすぐ内側、ふくらみの近くにとどめます。せまいすき間から「スー」と鋭く息が出ます。
• *th*：舌先を前に出して上の歯の先に当て、少しのぞかせます。舌の上をやわらかく息が流れます。

口の前に手を当ててみましょう。/s/ は鋭い「スー」、「th」はやわらかく広がる息です。鏡で舌先が見えていれば、それが「th」。

単語を言う前に、一つだけ確認。舌は「中」か「外」か。`,
    },
    blocks: [
      { label: 'At the start of words', label_ja: '語のはじめ',
        disc: { playWord: 'think', correct: 'think', other: 'sink', expl: `It was *think*, with "th": the tongue tip peeks out between the teeth. *Sink* keeps the tongue inside for /s/.`, explJa: `正解は *think*、「th」です。舌先を歯のあいだから少しのぞかせます。*sink* は舌を中に入れたままの /s/。` },
        pairs: [['think', 'sink'], ['thank', 'sank'], ['thick', 'sick'], ['thigh', 'sigh']] },
      { label: 'At the end of words', label_ja: '語のおわり',
        disc: { playWord: 'bath', correct: 'bath', other: 'bass', correctSecond: true, expl: `It was *bath*, ending in "th": the tongue comes out to the teeth at the end. *Bass* ends with the tongue inside, a clean /s/.`, explJa: `正解は *bath*、語尾が「th」です。最後に舌を歯まで出します。*bass* は舌を中に入れたままの /s/ で終わります。` },
        pairs: [['bath', 'bass'], ['path', 'pass'], ['math', 'mass'], ['mouth', 'mouse']] },
      { label: 'More starting sounds', label_ja: 'はじめの音をもっと',
        disc: { playWord: 'thing', correct: 'thing', other: 'sing', expl: `It was *thing*, with "th". *Sing* uses /s/, tongue inside.`, explJa: `正解は *thing*、「th」です。*sing* は舌を中に入れた /s/。` },
        pairs: [['thing', 'sing'], ['thumb', 'sum'], ['thought', 'sought'], ['thin', 'sin']] },
    ],
    sentences: ['I think the sun is bright.', 'Thanks for the front seat.', 'The path goes south of the city.'],
  },
  {
    slug: 'pron-v-and-b', order: 2, title: 'V & B', title_ja: 'V と B',
    soundA: { code: 'v', label: 'V' }, soundB: { code: 'b', label: 'B' },
    intro: {
      title: 'Why V sounds like B', title_ja: 'V が B になってしまう理由',
      body: `Japanese has no /v/, so the mouth uses the nearest sound from the ば-row, /b/. That is why *very* turns into *berry* and *vote* into *boat*.

The two sounds are made in completely different places. /b/ is made with the lips. /v/ is made with the teeth and lip, and you can buzz it.

Once your mouth feels that difference, the words stop blurring.`,
      body_ja: `日本語には /v/ がないので、口はいちばん近い「ば行」の音 /b/ を使ってしまいます。だから *very* が *berry*、*vote* が *boat* になってしまうのです。

この2つは、まったく別の場所で作る音です。/b/ はくちびるで作ります。/v/ は歯とくちびるで作り、「ヴー」と震わせられます。

口がその違いを覚えれば、単語はもう混ざりません。`,
    },
    mechanics: {
      title: 'Teeth on lip, or lips together', title_ja: '「歯+くちびる」か「くちびる同士」か',
      body: `The difference is what touches what.

• *b*: both lips press together and pop open. No teeth. It is one quick burst, you cannot hold it.
• *v*: your top teeth rest gently on your lower lip and the voice buzzes through. You can hold it: vvv. Put a finger on your lip and feel the vibration.

Before each word, check: lips together (b), or teeth on lip (v)?`,
      body_ja: `違いは、何が何に触れるか、です。

• *b*：上下のくちびるを合わせて、ぱっと開きます。歯は使いません。一瞬の破裂音で、のばせません。
• *v*：上の歯を下くちびるに軽くのせて、声を「ヴー」と震わせます。のばせます（ヴーー）。くちびるに指を当てると振動を感じます。

単語の前に確認。くちびる同士（b）か、歯+くちびる（v）か。`,
    },
    blocks: [
      { label: 'At the start of words', label_ja: '語のはじめ',
        disc: { playWord: 'very', correct: 'very', other: 'berry', expl: `It was *very*, the V sound: top teeth on the lower lip, with a buzz. *Berry* starts with the lips together.`, explJa: `正解は *very*、V の音です。上の歯を下くちびるにのせ、震わせます。*berry* はくちびる同士で始まります。` },
        pairs: [['very', 'berry'], ['vote', 'boat'], ['vest', 'best'], ['van', 'ban']] },
      { label: 'Inside words', label_ja: '語のなか',
        disc: { playWord: 'marvel', correct: 'marvel', other: 'marble', expl: `It was *marvel*, the V sound in the middle: teeth on lip, buzzing. *Marble* brings the lips together in the middle.`, explJa: `正解は *marvel*、まん中が V の音です。歯+くちびるで震わせます。*marble* はまん中でくちびる同士になります。` },
        pairs: [['marvel', 'marble'], ['revel', 'rebel'], ['saver', 'saber'], ['curving', 'curbing']] },
      { label: 'More starting sounds', label_ja: 'はじめの音をもっと',
        disc: { playWord: 'vase', correct: 'vase', other: 'base', correctSecond: true, expl: `It was *vase*, the V sound: teeth on lip, buzzing. *Base* begins with the lips together.`, explJa: `正解は *vase*、V の音です。歯+くちびるで震わせます。*base* はくちびる同士で始まります。` },
        pairs: [['vase', 'base'], ['vow', 'bow'], ['vie', 'buy'], ['veer', 'beer']] },
    ],
    sentences: ['Vera has a very big van.', 'The boat has a blue cover.', 'I believe the view is lovely.'],
  },
  {
    slug: 'pron-s-and-sh', order: 3, title: 'S & SH', title_ja: 'S と SH',
    soundA: { code: 's', label: 'S' }, soundB: { code: 'sh', label: 'SH' },
    intro: {
      title: 'Why S and SH blur', title_ja: 'S と SH が混ざってしまう理由',
      body: `Before the "ee" vowel, Japanese has just one sound, し — and it sits between English /s/ and /ʃ/ ("sh"). So *see* and *she*, or *sip* and *ship*, come out almost the same.

English keeps them clearly apart. The fix is two things working together: where the tongue sits, and what the lips do.

This lesson trains the contrast at the start and end of words.`,
      body_ja: `「イ」の前では、日本語には「し」という音が一つあるだけ。その「し」は英語の /s/ と /ʃ/（「sh」）のちょうど中間です。だから *see* と *she*、*sip* と *ship* がほとんど同じに聞こえてしまいます。

英語ははっきり区別します。直すコツは2つの組み合わせ。舌の位置と、くちびるの形です。

このレッスンでは、語のはじめとおわりでこの違いを練習します。`,
    },
    mechanics: {
      title: 'Thin and forward, or round and back', title_ja: '「うすく前」か「丸めて奥」か',
      body: `Two moves separate them.

• *s*: the tongue tip sits near the ridge behind your top teeth with a narrow groove, and the lips stay relaxed. A thin, high hiss.
• *sh*: the tongue pulls back and its body domes up, and the lips push forward and round. A lower, fuller "shh".

The lips are the easy tell: round your lips and you get *sh*; relax them and you get *s*.

Before each word, check: lips relaxed (s), or rounded (sh)?`,
      body_ja: `分けるのは2つの動きです。

• *s*：舌先を上の歯の後ろのふくらみ近くに置き、せまいすき間を作ります。くちびるは力を抜いたまま。うすく高い「スー」。
• *sh*：舌を奥に引いて中央を持ち上げ、くちびるを前に出して丸めます。低くて豊かな「シュー」。

くちびるが分かりやすい目印。丸めれば *sh*、力を抜けば *s*。

単語の前に確認。くちびるは「力を抜く（s）」か「丸める（sh）」か。`,
    },
    blocks: [
      { label: 'At the start of words', label_ja: '語のはじめ',
        disc: { playWord: 'see', correct: 'see', other: 'she', expl: `It was *see*, the S sound: thin hiss, lips relaxed. *She* rounds the lips for "sh".`, explJa: `正解は *see*、S の音です。うすい「スー」で、くちびるは力を抜きます。*she* はくちびるを丸める「sh」。` },
        pairs: [['see', 'she'], ['sip', 'ship'], ['sue', 'shoe'], ['save', 'shave']] },
      { label: 'At the end of words', label_ja: '語のおわり',
        disc: { playWord: 'mass', correct: 'mass', other: 'mash', correctSecond: true, expl: `It was *mass*, ending in S: a clean hiss. *Mash* ends with the rounded "sh".`, explJa: `正解は *mass*、語尾が S です。すっきりした「スー」。*mash* は丸めた「sh」で終わります。` },
        pairs: [['mass', 'mash'], ['gas', 'gash'], ['class', 'clash'], ['lease', 'leash']] },
      { label: 'More starting sounds', label_ja: 'はじめの音をもっと',
        disc: { playWord: 'sigh', correct: 'sigh', other: 'shy', expl: `It was *sigh*, the S sound. *Shy* rounds the lips for "sh".`, explJa: `正解は *sigh*、S の音です。*shy* はくちびるを丸める「sh」。` },
        pairs: [['sigh', 'shy'], ['sin', 'shin'], ['sort', 'short'], ['sell', 'shell']] },
    ],
    sentences: ['She sells sea shells.', 'Show me the small shop.', 'I wish to see the ship.'],
  },
  {
    slug: 'pron-f-and-h', order: 4, title: 'F & H', title_ja: 'F と H',
    soundA: { code: 'f', label: 'F' }, soundB: { code: 'h', label: 'H' },
    intro: {
      title: 'Why F drifts toward H', title_ja: 'F が H に近づいてしまう理由',
      body: `Japanese ふ is not the English /f/. It is made with both lips, softer, so before some vowels English /f/ slips toward a breathy /h/, and *feel* sounds like *heel*, *fold* like *hold*.

The fix is the same lips as /v/, but with no voice: top teeth on the lower lip. /h/ uses no teeth and no lips at all, just breath.`,
      body_ja: `日本語の「ふ」は英語の /f/ ではありません。両くちびるで作るやわらかい音なので、母音によっては英語の /f/ が息っぽい /h/ に近づき、*feel* が *heel*、*fold* が *hold* に聞こえてしまいます。

直し方は /v/ と同じくちびる、ただし声は出しません。上の歯を下くちびるにのせます。/h/ は歯もくちびるも使わず、ただの息です。`,
    },
    mechanics: {
      title: 'Teeth on lip, or just breath', title_ja: '「歯+くちびる」か「ただの息」か',
      body: `• *f*: your top teeth touch the lower lip and you push air through. Same lips as /v/, but quiet, no voice.
• *h*: the mouth is open, the teeth and lips do nothing, and a gentle breath comes from the throat.

One note: English /h/ only appears at the start of a syllable (*ahead*, *perhaps*), never at the end of a word — so every pair here is word-initial.

Before each word, check: teeth on lip (f), or just breath (h)?`,
      body_ja: `• *f*：上の歯を下くちびるにのせ、息を押し出します。/v/ と同じくちびるですが、声は出さず静かに。
• *h*：口は開けたまま、歯もくちびるも使わず、のどからやさしく息を出します。

ひとつ補足。英語の /h/ は音節のはじめにしか現れず（*ahead*、*perhaps*）、語のおわりには来ません。だからここのペアはすべて語頭です。

単語の前に確認。歯+くちびる（f）か、ただの息（h）か。`,
    },
    blocks: [
      { label: 'Everyday pairs', label_ja: 'よく使うペア',
        disc: { playWord: 'feel', correct: 'feel', other: 'heel', expl: `It was *feel*, the F sound: teeth on the lower lip. *Heel* is just a breath, no teeth.`, explJa: `正解は *feel*、F の音です。上の歯を下くちびるにのせます。*heel* は歯を使わない、ただの息。` },
        pairs: [['feel', 'heel'], ['fat', 'hat'], ['fit', 'hit'], ['fall', 'hall']] },
      { label: 'More pairs', label_ja: 'もっとペア',
        disc: { playWord: 'fear', correct: 'fear', other: 'hear', correctSecond: true, expl: `It was *fear*, the F sound: teeth on lip. *Hear* is breath only.`, explJa: `正解は *fear*、F の音です。歯+くちびる。*hear* は息だけ。` },
        pairs: [['fear', 'hear'], ['fill', 'hill'], ['food', 'hood'], ['fair', 'hair']] },
      { label: 'Tricky pairs', label_ja: '難しいペア',
        disc: { playWord: 'foe', correct: 'foe', other: 'hoe', expl: `It was *foe*, the F sound. *Hoe* is a breath, no teeth or lips.`, explJa: `正解は *foe*、F の音です。*hoe* は歯もくちびるも使わない息。` },
        pairs: [['foe', 'hoe'], ['fold', 'hold'], ['fight', 'height'], ['five', 'hive']] },
    ],
    sentences: ['I feel the heat at home.', 'Hold the food in your hand.', 'He has a fair head of hair.'],
  },
  {
    slug: 'pron-clusters', order: 5, title: 'Extra Vowels & Clusters', title_ja: 'よけいな母音とクラスター',
    // no soundA/soundB: this is a production lesson, graded on the whole word
    intro: {
      title: 'The hidden extra vowels', title_ja: 'かくれた「よけいな母音」',
      body: `English often stacks consonants with no vowel between them, and ends words on a consonant. Japanese almost always puts a vowel after each consonant, so *desk* becomes *desuku* and *strike* becomes *sutoraiku*. Those extra vowels are the single biggest thing that makes English sound "Japanese".

The fix is to glue the consonants straight together and stop the word cleanly, with no vowel on the end.

This lesson trains clusters at the start of words and clean endings.`,
      body_ja: `英語は、あいだに母音を入れずに子音を重ね、子音で語を終えることがよくあります。日本語はほぼ必ず子音のあとに母音を置くので、*desk* が「デスク」、*strike* が「ストライク」になってしまいます。この「よけいな母音」こそ、英語が「日本語っぽく」聞こえる最大の原因です。

直し方は、子音をそのままくっつけて、語尾に母音をつけずにスッと止めること。

このレッスンでは、語頭のクラスターと、きれいな語尾を練習します。`,
    },
    mechanics: {
      title: 'Glue them, do not add ウ', title_ja: 'くっつける。「ウ」を足さない',
      body: `Two habits to build.

• Clusters: say the consonants in one move, with no vowel between. *street* is one beat, not "su-to-ri-to". Start the next consonant before you finish the first.
• Endings: when a word ends in a consonant, stop there. *desk* ends on a clean k, not "desu-ku". Do not add ウ or オ.

A good check: clap once for the whole word. *strong* is one clap. If you clapped three times, extra vowels crept in.`,
      body_ja: `身につける習慣は2つ。

• クラスター：子音をひと続きで、あいだに母音を入れずに言います。*street* は1拍。「ス-ト-リー-ト」ではありません。前の子音を言い終える前に、次の子音を始めます。
• 語尾：子音で終わる語は、そこで止めます。*desk* はきれいな k で終わり、「デス-ク」にしません。「ウ」や「オ」を足さないこと。

よい確認法：語ぜんたいで手を1回たたく。*strong* は1回。3回たたいたなら、よけいな母音が入っています。`,
    },
    blocks: [
      { label: 'Two consonants together', label_ja: '子音ふたつ', pairs: [['play', 'blue'], ['green', 'free'], ['school', 'sleep'], ['snow', 'smile']] },
      { label: 'Three consonants together', label_ja: '子音みっつ', pairs: [['street', 'spring'], ['scream', 'splash'], ['strong', 'square'], ['screen', 'spray']] },
      { label: 'Clean endings', label_ja: 'きれいな語尾', pairs: [['desk', 'milk'], ['help', 'hand'], ['cold', 'world'], ['asked', 'text']] },
    ],
    sentences: ['I asked for a glass of cold milk.', 'The strong wind broke the screen.', 'Please help me find my desk.'],
    kataDetox: {
      prompt: 'One of these is the katakana version. Pick the ENGLISH one.',
      prompt_ja: '片方はカタカナ発音です。英語の方を選ぼう。',
      items: [{ word: 'stop', kana: 'ストップ' }, { word: 'strike', kana: 'ストライク' }, { word: 'desk', kana: 'デスク' }],
      why: 'The katakana take adds a vowel after every consonant, so *stop* swells from one beat to four ("su-to-ppu") and *desk* becomes "de-su-ku". The English take glues the consonants and stops clean on the final one, with no vowel added.',
      why_ja: 'カタカナ版は子音のあとごとに母音を足すので、*stop* は1拍から「ス・ト・ッ・プ」と4拍にふくらみ、*desk* は「デ・ス・ク」になります。英語版は子音をくっつけ、最後の子音できれいに止め、母音を足しません。',
    },
  },
]

for (const def of LESSONS) await buildLesson(def)
console.log('done')
