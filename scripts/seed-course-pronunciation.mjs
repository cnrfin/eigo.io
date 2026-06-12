/**
 * Seed the Pronunciation course pilot: course -> level (Tricky Consonants) ->
 * lesson (L and R), organised position-by-position:
 *   understand (intro + mechanics)
 *   initial:  HVPT discrimination (word in 4 voices) -> shadow grid (8 cards)
 *   medial:   HVPT discrimination -> shadow grid (8 cards)
 *   final:    HVPT discrimination -> shadow grid (8 cards)
 *   challenge (randomised: 1 minimal pair per position + 1 sentence -> breakdown)
 *
 * Idempotent: wipes/recreates the course each run. Audio assets are reused
 * across runs (ensure() skips re-import/regeneration when an asset exists).
 *
 *   node --env-file=.env.local scripts/seed-course-pronunciation.mjs
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

const SOUNDS = '/sessions/inspiring-hopeful-planck/mnt/audio-timer/assets/sounds'
const BUCKET = 'test-assets'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta', UK_M = 'fNYuJl2dBlX9V7NxmjnV', US_F = 'uYXf8XasLslADfZ2MB4u', US_M = 'UgBBYS2sOqTuMpoF3BR0'
const VOICES = [['UK-Female', UK_F], ['UK-Male', UK_M], ['US-Female', US_F], ['US-Male', US_M]]
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function tts(text, voiceId = UK_F) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
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
// Reuse an asset if it already exists; only build (read/TTS) + upload when missing.
async function ensure(path, make, transcript) {
  const { data } = await sb.from('assets').select('id').eq('storage_path', path).maybeSingle()
  if (data) return data.id
  return uploadInsert(path, await make(), transcript)
}
const samUKF = (file, word) => ensure(`courses/pron/${word}.mp3`, async () => readFileSync(`${SOUNDS}/UK-Female/phonemes/r_l/${file}`), word)
const genUKF = (word) => ensure(`courses/pron/${word}.mp3`, () => tts(word), word)
const genUSF = (word) => ensure(`courses/pron/us/${word}.mp3`, () => tts(word, US_F), word)
const genSentence = (text, slug) => ensure(`courses/pron/${slug}.mp3`, () => tts(text), text)
const genSentenceUS = (text, slug) => ensure(`courses/pron/us/${slug}.mp3`, () => tts(text, US_F), text)
async function samVoiceSet(file, word) {
  const ids = []
  for (const [f] of VOICES) ids.push(await ensure(`courses/pron/hvpt/${word}-${f}.mp3`, async () => readFileSync(`${SOUNDS}/${f}/phonemes/r_l/${file}`), word))
  return ids
}
async function genVoiceSet(word) {
  const ids = []
  for (const [f, vid] of VOICES) ids.push(await ensure(`courses/pron/hvpt/${word}-${f}.mp3`, () => tts(word, vid), word))
  return ids
}

// ── ensure course + level, then rebuild only THIS lesson (additive: other
//    consonant lessons in the level are left intact) ─────────
let course = (await sb.from('courses').select('id').eq('slug', 'pronunciation').maybeSingle()).data
if (!course) {
  course = (await sb.from('courses').insert({
    slug: 'pronunciation', exam_slug: 'pronunciation',
    title: 'Pronunciation', title_ja: '発音',
    description: 'Master the English sounds Japanese speakers find hardest, with instant feedback from Teri!',
    description_ja: 'Teriと一緒に、日本人がつまずきやすい英語の音を、ひとつずつ攻略しよう！',
    published: false, order_index: 3,
  }).select('id').single()).data
}
let level = (await sb.from('course_levels').select('id').eq('course_id', course.id).eq('order_index', 0).maybeSingle()).data
if (!level) {
  level = (await sb.from('course_levels').insert({ course_id: course.id, order_index: 0, title: 'Tricky Consonants', title_ja: '苦手な子音' }).select('id').single()).data
}
const oldLesson = (await sb.from('lessons').select('id').eq('slug', 'pron-l-and-r').maybeSingle()).data
if (oldLesson) { await sb.from('lesson_screens').delete().eq('lesson_id', oldLesson.id); await sb.from('lessons').delete().eq('id', oldLesson.id) }

// ── audio ──────────────────────────────────────────────────
const A = {}
// Initial, medial (intervocalic) and cluster R/L only. Post-vocalic / final R is
// non-rhotic in British English (the platform's default), so grading it against
// en-US wrongly penalises correct British speech — we avoid it here.
const SAMWORDS = {
  right: 'r_l_01.mp3', light: 'r_l_02.mp3', read: 'r_l_03.mp3', lead: 'r_l_04.mp3', rock: 'r_l_05.mp3', lock: 'r_l_06.mp3', row: 'r_l_07.mp3', low: 'r_l_08.mp3',
  arrive: 'r_l_09.mp3', alive: 'r_l_10.mp3', correct: 'r_l_11.mp3', collect: 'r_l_12.mp3',
  grass: 'r_l_13.mp3', glass: 'r_l_14.mp3', fry: 'r_l_15.mp3', fly: 'r_l_16.mp3', pray: 'r_l_17.mp3', play: 'r_l_18.mp3', grow: 'r_l_21.mp3', glow: 'r_l_22.mp3',
}
for (const [w, f] of Object.entries(SAMWORDS)) A[w] = await samUKF(f, w)
for (const w of ['erect', 'elect', 'berry', 'belly']) A[w] = await genUKF(w)
// US voice for every word (the UK clips are samples / UK TTS; the US ones are TTS).
const AUS = {}
for (const w of Object.keys(A)) AUS[w] = await genUSF(w)
const S1 = 'The light is on the right.', S2 = 'I really like the yellow color.', S3 = 'Lend me the red umbrella.'
const aS1 = await genSentence(S1, 'sent-light-right'), aS2 = await genSentence(S2, 'sent-yellow-colour'), aS3 = await genSentence(S3, 'sent-red-umbrella')
const aS1u = await genSentenceUS(S1, 'sent-light-right'), aS2u = await genSentenceUS(S2, 'sent-yellow-colour'), aS3u = await genSentenceUS(S3, 'sent-red-umbrella')
const vRight = await samVoiceSet('r_l_01.mp3', 'right')
const vArrive = await samVoiceSet('r_l_09.mp3', 'arrive')
const vGrow = await samVoiceSet('r_l_21.mp3', 'grow')
console.log('audio ready')

// ── lesson ─────────────────────────────────────────────────
const { data: lesson } = await sb.from('lessons').insert({ level_id: level.id, order_index: 0, slug: 'pron-l-and-r', title: 'L & R', title_ja: 'L と R', free: true, estimated_minutes: 10 }).select('id').single()

// ── builders ───────────────────────────────────────────────
const concept = (content) => ({ type: 'concept', audio: null, content })
const disc = (voices, correct, other, explanation, explanation_ja, correctSecond = false) => ({
  type: 'question', audio: null, content: {
    question_type: 'single_choice', prompt: 'Which word did you hear?', prompt_ja: 'どちらの単語が聞こえましたか？',
    voices,
    options: correctSecond
      ? [{ content: other, is_correct: false }, { content: correct, is_correct: true }]
      : [{ content: correct, is_correct: true }, { content: other, is_correct: false }],
    explanation, explanation_ja,
  },
})
const grid = (words, prompt, prompt_ja) => ({ type: 'question', audio: null, content: { question_type: 'shadow', prompt, prompt_ja, sounds: ['r', 'l'], words: words.map(w => ({ word: w, audioAssetId: A[w], audioAssetIdUs: AUS[w] })) } })
const node = (word, sound) => ({ referenceText: word, displayText: word, targetLabel: sound === 'r' ? 'the R sound' : 'the L sound', targetSound: sound, audioAssetId: A[word], audioAssetIdUs: AUS[word] })
const sent = (text, assetId, assetIdUs) => ({ referenceText: text, displayText: text, targetLabel: 'both L and R', audioAssetId: assetId, audioAssetIdUs: assetIdUs })

const screens = [
  concept({
    title: 'Why L and R are still hard', title_ja: 'L と R がまだ難しい理由',
    body: `You already know English splits one Japanese sound, ら, into two: L and R. That part is not the problem.

The real problem is what ら actually is. It is a quick tap, where the tongue flicks the ridge behind your teeth for an instant. So when you reach for L or R, your tongue falls back on that tap, and the two English sounds collapse into one.

So this lesson is not only about hearing the difference. Above all it is about building two new tongue habits, one that touches and holds, and one that never touches at all. Once your mouth knows the difference, your ear follows.`,
    body_ja: `英語が日本語の「ら」を、L と R のふたつに分けていること。これはもうご存じですよね。問題はそこではありません。

本当の問題は、「ら」が何なのかです。「ら」は、舌が歯の後ろのふくらみを一瞬はじく「タップ」の音。だから L や R を出そうとしても、舌がついこのタップに戻ってしまい、英語の2つの音がひとつに溶けてしまうのです。

つまりこのレッスンの目的は、違いを「聞き取る」ことだけではありません。触れて止める動きと、まったく触れない動き、新しい舌の使い方を2つ作ることです。口が違いを覚えれば、耳は後からついてきます。`,
  }),
  concept({
    title: 'The one difference: touch or no touch', title_ja: '違いはひとつ、「触れる」か「触れない」か',
    body: `English keeps L and R completely apart, and the split is simpler than it feels. It comes down to one thing: whether your tongue tip touches.

• *l*: the tongue tip touches and stays pressed on the ridge behind your top teeth, and the voice flows out around the sides.
• *r*: the tongue tip touches nothing. Pull it back so it floats, and round your lips a little, as if about to whistle. That lip rounding is the part most people miss.

The habit to drop is the ら tap, where the tongue flicks the ridge for an instant. *l* holds the touch, *r* never makes it.

You will train this in three places, at the start, in the middle, and in blends with another consonant, because the sound feels different in each.`,
    body_ja: `英語の L と R は、はっきり別の音です。見分け方は思っているよりシンプルで、ポイントは「舌先が触れるかどうか」だけ。

・*l*：舌先を上の歯ぐきのふくらみにつけたまま保ち、声を舌の両わきから流します。
・*r*：舌先はどこにも触れません。舌を奥に引いて宙に浮かせ、唇を口笛を吹く直前のように軽く丸めます。この唇の丸めを忘れる人がとても多いです。

やめたいのは「ら」のはじきです。「ら」は舌が一瞬ふくらみをはじきますが、*l* は触れたまま、*r* は一度も触れません。

語の「はじめ・なか」、そして子音の組み合わせ（ブレンド）の3か所で練習します。場所によって音の感じが変わるからです。`,
  }),
  // initial
  disc(vRight, 'right', 'light',
    `It was *right*, the R sound: tongue pulled back, touching nothing, lips rounded. Hearing it across different voices trains your ear to catch the R anywhere.`,
    `正解は *right*、R の音です。舌は奥に引き、どこにも触れず、唇を丸めます。いろいろな声で聞くと、誰の R でも聞き分けられる耳が育ちます。`),
  grid(['right', 'light', 'read', 'lead', 'rock', 'lock', 'row', 'low'], 'At the start of words', '語のはじめ'),
  // medial
  disc(vArrive, 'arrive', 'alive',
    `It was *arrive*, with R in the middle: same R, just mid-word. The tongue still touches nothing. *Alive* uses L, tongue tip touching the ridge.`,
    `正解は *arrive*、語中の R です。語の真ん中でも同じ R で、舌はどこにも触れません。*alive* は L で、舌先をふくらみに当てます。`),
  grid(['arrive', 'alive', 'correct', 'collect', 'erect', 'elect', 'berry', 'belly'], 'In the middle of words', '語のなか'),
  // blends (R/L after another consonant: pre-vocalic, so accent-safe)
  disc(vGrow, 'grow', 'glow',
    `It was *grow*, the R sound after g. The tongue still touches nothing. *Glow* uses L, tongue tip on the ridge. Blends like gr and gl are where the contrast is hardest.`,
    `正解は *grow*、g のあとの R です。舌はどこにも触れません。*glow* は L で、舌先をふくらみに当てます。gr と gl のような組み合わせは、いちばん難しいところです。`,
    true),
  grid(['grow', 'glow', 'grass', 'glass', 'fry', 'fly', 'pray', 'play'], 'In blends', '子音の組み合わせ'),
  // automaticity step: the bin game — ears-only rounds from this lesson's own
  // word clips, fixed order (5 R / 5 L, never one side 3x in a row, every round
  // a different minimal pair).
  {
    type: 'question', audio: null, content: {
      question_type: 'sound_sorter',
      prompt: 'Ears only: throw each word into the right box.',
      prompt_ja: '耳だけで勝負。聞こえた単語を正しい箱へ。',
      left: { sound: 'r', label: 'R' },
      right: { sound: 'l', label: 'L' },
      words: [
        ['right', 'r'], ['lead', 'l'], ['lock', 'l'], ['row', 'r'], ['alive', 'l'],
        ['correct', 'r'], ['erect', 'r'], ['belly', 'l'], ['grow', 'r'], ['glass', 'l'],
      ].map(([w, s]) => ({ word: w, sound: s, audioAssetId: A[w], audioAssetIdUs: AUS[w] })),
      explanation: "Every round was one of this lesson's pairs. Replay the missed ones and listen for R against L.",
      explanation_ja: 'すべてこのレッスンのペアの単語でした。間違えたものを聞き直して、R と L の違いに耳を慣らしましょう。',
    },
  },
  // challenge: random pair per position + a sentence
  {
    type: 'question', audio: null, content: {
      question_type: 'challenge', accent: 'en-US',
      prompt: 'Say each word to walk Teri to the finish!', prompt_ja: '単語を言って、テリをゴールまで連れて行こう！',
      positions: [
        { pairs: [[node('right', 'r'), node('light', 'l')], [node('read', 'r'), node('lead', 'l')], [node('rock', 'r'), node('lock', 'l')], [node('row', 'r'), node('low', 'l')]] },
        { pairs: [[node('arrive', 'r'), node('alive', 'l')], [node('correct', 'r'), node('collect', 'l')], [node('erect', 'r'), node('elect', 'l')], [node('berry', 'r'), node('belly', 'l')]] },
        { pairs: [[node('grow', 'r'), node('glow', 'l')], [node('grass', 'r'), node('glass', 'l')], [node('fry', 'r'), node('fly', 'l')], [node('pray', 'r'), node('play', 'l')]] },
      ],
      sentences: [sent(S1, aS1, aS1u), sent(S2, aS2, aS2u), sent(S3, aS3, aS3u)],
    },
  },
]

const rows = screens.map((s, i) => ({ lesson_id: lesson.id, order_index: i, type: s.type, content: s.content, audio_asset_id: s.audio }))
const { error: scErr } = await sb.from('lesson_screens').insert(rows)
if (scErr) throw new Error('screens: ' + scErr.message)

console.log(`✓ pronunciation course seeded: ${screens.length} screens (course ${course.id}, lesson ${lesson.id}, draft)`)
