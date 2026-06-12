/**
 * Seed Level 3 (Word Stress) of the Pronunciation course — pilot lesson.
 *   intro (concept) + mechanics (concept)
 *   stress-pick rounds (tap the stressed syllable) — 2-syllable then 3-syllable
 *   shadow grid (say the words with the right stress)
 *
 * Every word is generated in both a UK and a US voice (audioAssetId /
 * audioAssetIdUs), like the vowel level. Additive + idempotent; re-run until "done".
 *
 *   node --env-file=.env.local scripts/seed-pron-stress.mjs
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
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta', US_F = 'uYXf8XasLslADfZ2MB4u'
// Japanese voices (from src/lib/sayafterme/voices.ts) for the katakana_detox take.
const JA_F = 'MXKtCrra8fvlDUbfKUT1', JA_M = 'GKDaBI8TKSBJVhsCLD6n'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function tts(text, voiceId = UK_F) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error('ElevenLabs ' + res.status)
  const buf = Buffer.from(await res.arrayBuffer())
  return (voiceId === UK_F || voiceId === US_F || voiceId === JA_F) ? trimTail(buf) : buf
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
const genUKF = (word) => ensure(`courses/pron/${slug(word)}.mp3`, () => tts(word, UK_F), word)
const genUSF = (word) => ensure(`courses/pron/us/${slug(word)}.mp3`, () => tts(word, US_F), word)
const genSentence = (text, id) => ensure(`courses/pron/${id}.mp3`, () => tts(text, UK_F), text)
const genSentenceUS = (text, id) => ensure(`courses/pron/us/${id}.mp3`, () => tts(text, US_F), text)
// Katakana take for katakana_detox: a Japanese voice confidently reading the
// loanword (。-wrapped so it states it, no list/question intonation).
const genKana = (word, kana, voice) => ensure(`courses/pron/kana/${slug(word)}.mp3`, () => tts(`${kana}。`, voice), kana)

// ── ensure course + level ──────────────────────────────────
const course = (await sb.from('courses').select('id').eq('slug', 'pronunciation').maybeSingle()).data
if (!course) throw new Error('Pronunciation course not found — run the consonant seed first.')
let level = (await sb.from('course_levels').select('id').eq('course_id', course.id).eq('order_index', 2).maybeSingle()).data
if (!level) level = (await sb.from('course_levels').insert({ course_id: course.id, order_index: 2, title: 'Word Stress', title_ja: '単語のアクセント' }).select('id').single()).data
const LEVEL_ID = level.id

// Re-roll "guitar": the clip stressed the wrong syllable (GUI-tar instead of gui-TAR).
for (const p of ['courses/pron/guitar.mp3', 'courses/pron/us/guitar.mp3']) {
  await sb.storage.from(BUCKET).remove([p])
  await sb.from('assets').delete().eq('storage_path', p)
}

// ── builders ───────────────────────────────────────────────
const concept = (content) => ({ type: 'concept', audio: null, content })
// Show a word with its stressed syllable in capitals, e.g. baNAna -> "baNAna".
const markWord = (it) => it.syl.map((s, k) => (k === it.stress ? s.toUpperCase() : s)).join('')
const markSentence = (it) => it.words.map((w, k) => (it.stress.includes(k) ? w.toUpperCase() : w)).join(' ')
const ORD = ['first', 'second', 'third', 'fourth', 'fifth']
const ORD_JA = ['1つめ', '2つめ', '3つめ', '4つめ', '5つめ']
// A per-word reason, grounded in each lesson's rule, for the "Why?" modal.
function whyWord(kind, it) {
  const m = markWord(it), p = it.stress
  // 'surprise' is second-syllable as BOTH noun and verb — flag it as an
  // exception instead of presenting it as evidence for the verb-back tendency.
  if (kind === 'two' && it.word === 'surprise') return { en: 'surPRISE: second-syllable beat as both noun and verb — one of the exceptions worth remembering.', ja: 'surPRISE：名詞でも動詞でも拍は2つめ。傾向の例外のひとつとして覚えましょう。' }
  if (kind === 'two') return it.pos === 'verb'
    ? { en: `${m}: a verb, so the beat goes on the second syllable.`, ja: `${m}：動詞なので、拍は2つめの音節に来ます。` }
    : { en: `${m}: a ${it.pos === 'adjective' ? 'describing word' : 'noun'}, so the beat goes on the first syllable.`, ja: `${m}：${it.pos === 'adjective' ? 'ようすを表す語' : '名詞'}なので、拍は1つめの音節に来ます。` }
  if (kind === 'katakana') return { en: `${m}: katakana ${it.hintJa} sounds flat, but English puts the beat on the ${ORD[p]} syllable.`, ja: `${m}：カタカナ「${it.hintJa}」は平らですが、英語は${ORD_JA[p]}の音節に拍を置きます。` }
  if (kind === 'endings') {
    const end = /(t|s)ion$/.test(it.word) ? '-tion/-sion' : /ic$/.test(it.word) ? '-ic' : /ial$/.test(it.word) ? '-ial' : 'this ending'
    return { en: `${m}: the ${end} ending puts the beat on the syllable just before it.`, ja: `${m}：語尾 ${end} が、その直前の音節に拍を置きます。` }
  }
  if (kind === 'long') return p === 0
    ? { en: `${m}: a long word, so the beat sits near the front, almost never on the last syllable.`, ja: `${m}：長い単語なので、拍は前のほう。最後の音節に来ることはまれです。` }
    : { en: `${m}: a long word, so the beat sits inside, almost never on the last syllable.`, ja: `${m}：長い単語なので、拍は内側。最後の音節に来ることはまれです。` }
  return { en: `${m}: the strong beat is on the ${ORD[p]} syllable. Say it longer and louder.`, ja: `${m}：強い拍は${ORD_JA[p]}の音節。長く大きく読みます。` }
}
function whySentence(it) {
  const m = markSentence(it)
  const content = it.words.filter((_, k) => it.stress.includes(k)).join(', ')
  const fn = it.words.filter((_, k) => !it.stress.includes(k)).join(', ')
  return { en: `${m}: the content words (${content}) carry the meaning, so they take the beat; the grammar words (${fn}) stay weak.`, ja: `${m}：内容語（${content}）が意味を運ぶので、拍を受けます。文法語（${fn}）は弱いまま。` }
}
const stressPick = (items, prompt, prompt_ja, A, AUS, kind) => {
  const reasons = items.map((it) => whyWord(kind, it))
  return { type: 'question', audio: null, content: {
    question_type: 'stress_pick', prompt, prompt_ja,
    explanation: reasons.map((r) => r.en).join('\n'),
    explanation_ja: reasons.map((r) => r.ja).join('\n'),
    words: items.map((it) => ({ word: it.word, syllables: it.syl, stressIndex: it.stress, ...(it.hint ? { hint: it.hint } : {}), ...(it.hintJa ? { hint_ja: it.hintJa } : {}), audioAssetId: A[it.word], audioAssetIdUs: AUS[it.word] })),
  } }
}
const grid = (words, prompt, prompt_ja, A, AUS) => ({ type: 'question', audio: null, content: { question_type: 'shadow', prompt, prompt_ja, words: words.map((w) => ({ word: w, audioAssetId: A[w], audioAssetIdUs: AUS[w] })) } })
// Graded production: say each word, walk Teri. Each word is its own position
// (a single-node "pair"); the route grades it on syllable reduction + prosody.
const sNode = (it, A, AUS) => ({ referenceText: it.word, displayText: it.word, syllables: it.syl, stressIndex: it.stress, audioAssetId: A[it.word], audioAssetIdUs: AUS[it.word] })
const challenge = (items, prompt, prompt_ja, A, AUS) => ({ type: 'question', audio: null, content: { question_type: 'challenge', accent: 'en-US', prompt, prompt_ja, positions: items.map((it) => ({ pairs: [[sNode(it, A, AUS)]] })), sentences: [] } })
// Sentence-stress (perception): tap the stressed content words in each sentence.
const sentenceStress = (items, prompt, prompt_ja, SA, SAUS) => {
  const reasons = items.map(whySentence)
  return { type: 'question', audio: null, content: {
    question_type: 'sentence_stress', prompt, prompt_ja,
    explanation: reasons.map((r) => r.en).join('\n'),
    explanation_ja: reasons.map((r) => r.ja).join('\n'),
    sentences: items.map((it) => ({ text: it.text, words: it.words, stressed: it.stress, audioAssetId: SA[it.text], audioAssetIdUs: SAUS[it.text] })),
  } }
}
// Graded sentence challenge: say each short sentence with natural rhythm. Each
// node carries the content-word indices so the route grades stress by duration.
const sentChallenge = (items, prompt, prompt_ja, SA, SAUS) => ({ type: 'question', audio: null, content: { question_type: 'challenge', accent: 'en-US', prompt, prompt_ja, positions: items.map((it) => ({ pairs: [[{ referenceText: it.text, displayText: it.text, words: it.words, stressed: it.stress, audioAssetId: SA[it.text], audioAssetIdUs: SAUS[it.text] }]] })), sentences: [] } })

async function buildLesson(def) {
  const old = (await sb.from('lessons').select('id').eq('slug', def.slug).maybeSingle()).data
  if (old) { await sb.from('lesson_screens').delete().eq('lesson_id', old.id); await sb.from('lessons').delete().eq('id', old.id) }
  // Sentence-stress lesson: intro + mechanics + tap-the-words rounds.
  if (def.sentencePicks) {
    const SA = {}, SAUS = {}
    let si = 0
    const allTexts = [...new Set([...def.sentencePicks.flat().map((s) => s.text), ...(def.challenge ?? []).map((c) => c.text)])]
    for (const text of allTexts) { const id = `${def.slug}-s${++si}`; SA[text] = await genSentence(text, id); SAUS[text] = await genSentenceUS(text, id) }
    const { data: lesson } = await sb.from('lessons').insert({ level_id: LEVEL_ID, order_index: def.order, slug: def.slug, title: def.title, title_ja: def.title_ja, free: false, estimated_minutes: 10 }).select('id').single()
    const screens = [concept(def.intro), concept(def.mechanics), ...def.sentencePicks.map((r) => sentenceStress(r, def.pickPrompt, def.pickPrompt_ja, SA, SAUS))]
    if (def.challenge) screens.push(sentChallenge(def.challenge, def.challengePrompt, def.challengePrompt_ja, SA, SAUS))
    const rows = screens.map((s, i) => ({ lesson_id: lesson.id, order_index: i, type: s.type, content: s.content, audio_asset_id: s.audio }))
    const { error } = await sb.from('lesson_screens').insert(rows)
    if (error) throw new Error('screens: ' + error.message)
    console.log(`✓ ${def.slug}: ${screens.length} screens (sentence stress)`)
    return
  }
  const A = {}, AUS = {}
  const words = [...new Set([...def.picks.flat().map((it) => it.word), ...def.challenge.map((it) => it.word), ...def.shadow])]
  for (const w of words) { A[w] = await genUKF(w); AUS[w] = await genUSF(w) }
  // katakana_detox (workstream 5): A/B which_natural, native English vs a
  // Japanese voice reading the katakana form (flat katakana rhythm vs English
  // stress). Inserted after the last stress_pick, before the shadow grid.
  let kataScreen = null
  if (def.kataDetox) {
    const items = []
    for (let i = 0; i < def.kataDetox.items.length; i++) {
      const it = def.kataDetox.items[i]
      const ja = await genKana(it.word, it.kana, i % 2 === 0 ? JA_F : JA_M)
      items.push({ prompt: it.word, naturalAudioAssetId: A[it.word] ?? await genUKF(it.word), naturalAudioAssetIdUs: AUS[it.word] ?? await genUSF(it.word), choppyAudioAssetId: ja, choppyAudioAssetIdUs: ja })
    }
    kataScreen = { type: 'question', audio: null, content: { question_type: 'which_natural', prompt: def.kataDetox.prompt, prompt_ja: def.kataDetox.prompt_ja, items, explanation: def.kataDetox.why, explanation_ja: def.kataDetox.why_ja } }
  }
  const { data: lesson } = await sb.from('lessons').insert({ level_id: LEVEL_ID, order_index: def.order, slug: def.slug, title: def.title, title_ja: def.title_ja, free: false, estimated_minutes: 10 }).select('id').single()
  const screens = [
    concept(def.intro), concept(def.mechanics),
    stressPick(def.picks[0], def.pickPrompt, def.pickPrompt_ja, A, AUS, def.kind),
    stressPick(def.picks[1], def.pickPrompt, def.pickPrompt_ja, A, AUS, def.kind),
    stressPick(def.picks[2], def.pickPrompt, def.pickPrompt_ja, A, AUS, def.kind),
    ...(kataScreen ? [kataScreen] : []),
    grid(def.shadow, def.shadowPrompt, def.shadowPrompt_ja, A, AUS),
    challenge(def.challenge, def.challengePrompt, def.challengePrompt_ja, A, AUS),
  ]
  const rows = screens.map((s, i) => ({ lesson_id: lesson.id, order_index: i, type: s.type, content: s.content, audio_asset_id: s.audio }))
  const { error } = await sb.from('lesson_screens').insert(rows)
  if (error) throw new Error('screens: ' + error.message)
  console.log(`✓ ${def.slug}: ${screens.length} screens (UK+US audio)`)
}

// ── lessons ────────────────────────────────────────────────
const PP = 'Tap the strong beat in each word.', PP_JA = '各単語の強く読む部分をタップしよう。'
const SP = 'Now say each word, making the strong beat stand out.', SP_JA = '今度は強い拍を目立たせて、各単語を声に出してみよう。'
const CP = 'Say each word with the right beat to walk Teri to the finish!', CP_JA = '正しい拍で単語を言って、テリをゴールまで連れて行こう！'
const LESSONS = [
  {
  slug: 'pron-stress-intro', order: 0, title: 'What Is Stress?', title_ja: 'アクセントってなに？',
  intro: {
    title: 'One strong beat in every word', title_ja: '単語にはひとつの強い拍がある',
    body: `Every English word of two or more syllables has one syllable that is said stronger than the rest, the stressed beat. *baNAna*, *comPUter*, *guiTAR*. The other syllables lean on it and go weaker.

Japanese gives every mora roughly equal weight, so katakana flattens this out: *banana* becomes a level "ba-na-na" with no strong beat. To an English ear, a word with the wrong beat, or no beat at all, can be hard to recognise, even when every sound is correct.

So stress is not a detail. Often it matters more than the individual sounds. This lesson trains your ear to find the strong beat.`,
    body_ja: `2音節以上の英語の単語には、ほかより強く読む音節が必ず一つあります。これが「アクセント」です。*baNAna*、*comPUter*、*guiTAR*。ほかの音節はそこに寄りかかって弱くなります。

日本語はどの拍もほぼ同じ強さなので、カタカナではこれが平らになります。*banana* は強い拍のない「バ・ナ・ナ」に。英語の耳には、拍の位置がちがったり、強い拍がなかったりする単語は、ひとつひとつの音が正しくても聞き取りにくいのです。

だからアクセントは小さな問題ではありません。音そのものより大事なことも多いのです。このレッスンでは、強い拍を聞き分ける耳を育てます。`,
  },
  mechanics: {
    title: 'Strong and clear, or weak and short', title_ja: '「強くはっきり」か「弱く短く」か',
    body: `The stressed syllable is doing four things at once: it is louder, longer, a little higher in pitch, and its vowel is full and clear.

The unstressed syllables do the opposite: shorter, quieter, lower, and the vowel often shrinks to a weak "uh" (the schwa). In *baNAna*, only the middle beat is strong; the syllables on either side go weak and blurry.

The trick is the contrast. Do not make every syllable equally strong. Make one beat stand out and let the others fall away.

As you listen, ask: where is the strong beat?`,
    body_ja: `強く読む音節は、同時に4つのことをしています。大きく、長く、少し高く、そして母音をはっきりフルに出します。

弱い音節はその逆。短く、小さく、低く、母音はよく弱いあいまいな「ア」（schwa）に縮みます。*baNAna* で強く読むのは真ん中の「ナ」だけ。前後の音節は力が抜けて、ぼんやりした弱い音になります。

コツは「差をつける」こと。すべての音節を同じ強さにしないこと。ひとつの拍を目立たせ、ほかは力を抜きます。

聞くときの問い：強い拍はどこ？`,
  },
  pickPrompt: 'Tap the strong beat in each word.', pickPrompt_ja: '各単語の強く読む部分をタップしよう。',
  picks: [
    [
      { word: 'window', syl: ['win', 'dow'], stress: 0 },
      { word: 'police', syl: ['po', 'lice'], stress: 1 },
      { word: 'garden', syl: ['gar', 'den'], stress: 0 },
      { word: 'balloon', syl: ['ba', 'lloon'], stress: 1 },
    ],
    [
      { word: 'umbrella', syl: ['um', 'brel', 'la'], stress: 1 },
      { word: 'tomato', syl: ['to', 'ma', 'to'], stress: 1 },
      { word: 'hospital', syl: ['hos', 'pi', 'tal'], stress: 0 },
      { word: 'dinosaur', syl: ['di', 'no', 'saur'], stress: 0 },
    ],
    [
      { word: 'supermarket', syl: ['su', 'per', 'mar', 'ket'], stress: 0 },
      { word: 'America', syl: ['a', 'me', 'ri', 'ca'], stress: 1 },
      { word: 'information', syl: ['in', 'for', 'ma', 'tion'], stress: 2 },
      { word: 'technology', syl: ['tech', 'no', 'lo', 'gy'], stress: 1 },
    ],
  ],
  shadow: ['window', 'balloon', 'garden', 'umbrella', 'tomato', 'dinosaur', 'supermarket', 'America', 'information', 'technology'],
  shadowPrompt: 'Now say each word, making the strong beat stand out.', shadowPrompt_ja: '今度は強い拍を目立たせて、各単語を声に出してみよう。',
  challenge: [
    { word: 'police', syl: ['po', 'lice'], stress: 1 },
    { word: 'garden', syl: ['gar', 'den'], stress: 0 },
    { word: 'tomato', syl: ['to', 'ma', 'to'], stress: 1 },
    { word: 'hospital', syl: ['hos', 'pi', 'tal'], stress: 0 },
    { word: 'information', syl: ['in', 'for', 'ma', 'tion'], stress: 2 },
    { word: 'technology', syl: ['tech', 'no', 'lo', 'gy'], stress: 1 },
  ],
  challengePrompt: CP, challengePrompt_ja: CP_JA,
  },
  {
    slug: 'pron-stress-two', order: 1, kind: 'two', title: 'Two-Syllable Words', title_ja: '2音節の単語',
    intro: {
      title: 'Front or back?', title_ja: '前か、うしろか',
      body: `Most English words have two syllables, and the strong beat lands on one of them. A loose pattern helps: most two-syllable *nouns* and adjectives stress the first beat (*DOCtor*, *HAPpy*), while many two-syllable *verbs* stress the second (*reLAX*, *deCIDE*).

It is a tendency, not a law, so your ear still decides. But knowing it gives you a good first guess.

This lesson trains you to hear which beat is strong.`,
      body_ja: `英語の単語の多くは2音節で、強い拍はそのどちらかに来ます。役に立つゆるい傾向があります。2音節の*名詞*や形容詞は最初の拍を強く読むことが多く（*DOCtor*、*HAPpy*）、2音節の*動詞*は2つ目を強く読むことが多いのです（*reLAX*、*deCIDE*）。

あくまで傾向で、ルールではありません。最後は耳で決めます。でもこれを知っていれば、最初のあたりがつけやすくなります。

このレッスンでは、どちらの拍が強いかを聞き分ける練習をします。`,
    },
    mechanics: {
      title: 'Lead with the strong beat', title_ja: '強い拍から考える',
      body: `When you meet a two-syllable word, try the pattern first, then listen to check.

• A thing or a describing word? Try the first beat: *TAble*, *PREtty*, *MOUNtain*.
• An action? Try the second beat: *arRIVE*, *comPLETE*, *reTURN*.

Then say it both ways and keep the one that matches what you hear. The strong beat is louder and longer; the weak one shrinks.

As you listen, ask: is the strong beat first or second?`,
      body_ja: `2音節の単語に出会ったら、まず傾向を試して、それから聞いて確かめます。

• ものや、ようすを表す語？　最初の拍を試す：*TAble*、*PREtty*、*MOUNtain*。
• 動作？　2つ目の拍を試す：*arRIVE*、*comPLETE*、*reTURN*。

そして両方の言い方で声に出し、聞こえた音に合うほうを選びます。強い拍は大きく長く、弱い拍は縮みます。

聞くときの問い：強い拍は前か、うしろか。`,
    },
    pickPrompt: PP, pickPrompt_ja: PP_JA,
    picks: [
      [{ word: 'doctor', syl: ['doc', 'tor'], stress: 0, pos: 'noun' }, { word: 'agree', syl: ['a', 'gree'], stress: 1, pos: 'verb' }, { word: 'sister', syl: ['sis', 'ter'], stress: 0, pos: 'noun' }, { word: 'surprise', syl: ['sur', 'prise'], stress: 1, pos: 'verb' }],
      [{ word: 'relax', syl: ['re', 'lax'], stress: 1, pos: 'verb' }, { word: 'coffee', syl: ['cof', 'fee'], stress: 0, pos: 'noun' }, { word: 'forget', syl: ['for', 'get'], stress: 1, pos: 'verb' }, { word: 'morning', syl: ['mor', 'ning'], stress: 0, pos: 'noun' }],
      [{ word: 'enjoy', syl: ['en', 'joy'], stress: 1, pos: 'verb' }, { word: 'rabbit', syl: ['rab', 'bit'], stress: 0, pos: 'noun' }, { word: 'explain', syl: ['ex', 'plain'], stress: 1, pos: 'verb' }, { word: 'summer', syl: ['sum', 'mer'], stress: 0, pos: 'noun' }],
    ],
    shadow: ['doctor', 'agree', 'coffee', 'relax', 'morning', 'enjoy', 'sister', 'explain', 'summer', 'forget'],
    shadowPrompt: SP, shadowPrompt_ja: SP_JA,
    challenge: [{ word: 'doctor', syl: ['doc', 'tor'], stress: 0 }, { word: 'relax', syl: ['re', 'lax'], stress: 1 }, { word: 'surprise', syl: ['sur', 'prise'], stress: 1 }, { word: 'coffee', syl: ['cof', 'fee'], stress: 0 }, { word: 'forget', syl: ['for', 'get'], stress: 1 }, { word: 'summer', syl: ['sum', 'mer'], stress: 0 }],
    challengePrompt: CP, challengePrompt_ja: CP_JA,
  },
  {
    slug: 'pron-stress-katakana', order: 2, kind: 'katakana', title: 'Katakana Traps', title_ja: 'カタカナのわな',
    intro: {
      title: 'The katakana trap', title_ja: 'カタカナのわな',
      body: `Thousands of English words live in Japanese as katakana, and that is a huge head start. But katakana flattens the stress and adds extra vowels, so the borrowed version often has the *wrong* beat. *banana* is バナナ (flat), but English says *baNAna*. *potato* is ポテト, but English says *poTAto*.

When you already "know" a word from katakana, that is exactly when the stress slips. So these everyday loanwords are worth a careful look.

This lesson trains the real English beat on words you already know.`,
      body_ja: `何千もの英単語が、カタカナとして日本語の中にあります。これは大きなアドバンテージ。でもカタカナはアクセントを平らにし、母音を足してしまうので、借りてきた形はしばしば*ちがう*拍になっています。*banana* は「バナナ」（平ら）ですが、英語では *baNAna*。*potato* は「ポテト」ですが、英語では *poTAto*。

カタカナで「知っている」つもりの単語こそ、アクセントがずれやすいのです。だから、こうした身近な外来語ほど、ていねいに見直す価値があります。

このレッスンでは、すでに知っている単語の、本当の英語の拍を練習します。`,
    },
    mechanics: {
      title: 'Forget the katakana beat', title_ja: 'カタカナの拍を、いったん忘れる',
      body: `For each word, do two things:

• Drop the flat, even katakana rhythm. English picks one strong beat and weakens the rest.
• Find that beat and lean on it. *comPUter* is not "kom-pyu-ta"; *toMAto* is not "to-ma-to".

The katakana spelling is shown to remind you what to *un*-learn. Read the English word, find its strong beat, and let the other syllables shrink.

As you listen, ask: where does English put the beat?`,
      body_ja: `単語ごとに、2つのことをします。

• 平らで一定なカタカナのリズムを手放します。英語はひとつの拍を強くし、ほかを弱めます。
• その拍を見つけて、そこに乗ります。*computer* は「コン・ピュー・タ」、*tomato* は「ト・マ・ト」ではありません。

カタカナの表記は、何を*忘れる*べきかを思い出すために表示しています。英語の単語を読み、強い拍を見つけ、ほかの音節を縮めましょう。

聞くときの問い：英語はどこに拍を置く？`,
    },
    pickPrompt: PP, pickPrompt_ja: PP_JA,
    picks: [
      [{ word: 'banana', syl: ['ba', 'na', 'na'], stress: 1, hintJa: 'バナナ' }, { word: 'career', syl: ['ca', 'reer'], stress: 1, hintJa: 'キャリア' }, { word: 'calendar', syl: ['cal', 'en', 'dar'], stress: 0, hintJa: 'カレンダー' }, { word: 'percent', syl: ['per', 'cent'], stress: 1, hintJa: 'パーセント' }],
      [{ word: 'hotel', syl: ['ho', 'tel'], stress: 1, hintJa: 'ホテル' }, { word: 'image', syl: ['im', 'age'], stress: 0, hintJa: 'イメージ' }, { word: 'pattern', syl: ['pat', 'tern'], stress: 0, hintJa: 'パターン' }, { word: 'event', syl: ['e', 'vent'], stress: 1, hintJa: 'イベント' }],
      [{ word: 'video', syl: ['vi', 'de', 'o'], stress: 0, hintJa: 'ビデオ' }, { word: 'vitamin', syl: ['vi', 'ta', 'min'], stress: 0, hintJa: 'ビタミン' }, { word: 'guitar', syl: ['gui', 'tar'], stress: 1, hintJa: 'ギター' }, { word: 'volunteer', syl: ['vol', 'un', 'teer'], stress: 2, hintJa: 'ボランティア' }],
    ],
    shadow: ['banana', 'career', 'calendar', 'hotel', 'image', 'event', 'video', 'vitamin', 'guitar', 'volunteer'],
    shadowPrompt: SP, shadowPrompt_ja: SP_JA,
    challenge: [{ word: 'banana', syl: ['ba', 'na', 'na'], stress: 1 }, { word: 'career', syl: ['ca', 'reer'], stress: 1 }, { word: 'calendar', syl: ['cal', 'en', 'dar'], stress: 0 }, { word: 'hotel', syl: ['ho', 'tel'], stress: 1 }, { word: 'event', syl: ['e', 'vent'], stress: 1 }, { word: 'volunteer', syl: ['vol', 'un', 'teer'], stress: 2 }],
    challengePrompt: CP, challengePrompt_ja: CP_JA,
    kataDetox: {
      prompt: 'One of these is the katakana version. Pick the ENGLISH one.',
      prompt_ja: '片方はカタカナ発音です。英語の方を選ぼう。',
      items: [{ word: 'banana', kana: 'バナナ' }, { word: 'hotel', kana: 'ホテル' }, { word: 'volunteer', kana: 'ボランティア' }],
      why: 'The katakana take gives every beat the same flat weight (ba-na-na), while English leans hard on one syllable and weakens the rest (baNAna, hoTEL, volunTEER). Listen for the strong beat: that is the English one.',
      why_ja: 'カタカナ版はどの拍も同じ平らな重さ（バ・ナ・ナ）。英語はひとつの音節に強く乗り、ほかを弱めます（baNAna、hoTEL、volunTEER）。強い拍が聞こえるほう、それが英語です。',
    },
  },
  {
    slug: 'pron-stress-endings', order: 3, kind: 'endings', title: 'Endings That Move Stress', title_ja: 'アクセントを動かす語尾',
    intro: {
      title: 'Endings that pull the stress', title_ja: 'アクセントを引き寄せる語尾',
      body: `Some word endings are bossy: they pull the stress to the same place almost every time. Learn the ending, and you can predict the beat.

• *-tion* / *-sion*: stress the syllable just before it. celeBRAtion, atTRACtion.
• *-ic*: stress the syllable just before it. athLEtic, roMANtic.
• *-ial*: stress the syllable just before it. comMERcial, iNItial.

This is the good news of English stress: once you spot the ending, you do not have to guess.`,
      body_ja: `語尾の中には「強引な」ものがあります。ほとんどの単語で、決まった場所にアクセントを引き寄せるのです。語尾を覚えれば、拍を予測できます。

• *-tion* / *-sion*：その直前の音節を強く読む。celeBRAtion、atTRACtion。
• *-ic*：その直前の音節を強く読む。athLEtic、roMANtic。
• *-ial*：その直前の音節を強く読む。comMERcial、iNItial。

これは英語のアクセントの「うれしい知らせ」。語尾を見つけさえすれば、もう当てずっぽうは要りません。`,
    },
    mechanics: {
      title: 'Spot the ending, then step back one', title_ja: '語尾を見つけて、ひとつ手前へ',
      body: `The rule is the same for all three endings: find the ending, then put the strong beat on the syllable right before it.

• *-tion*: cele-BRA-tion, at-TRAC-tion.
• *-ic*: ath-LE-tic, ro-MAN-tic.
• *-ial*: com-MER-cial, i-NI-tial.

It does not matter how long the word is. Find the ending, step back one syllable, and stress there.

As you listen, confirm: is the beat right before the ending?`,
      body_ja: `3つの語尾すべてに共通のルール：語尾を見つけ、その「直前の音節」に強い拍を置きます。

• *-tion*：cele-BRA-tion、at-TRAC-tion。
• *-ic*：ath-LE-tic、ro-MAN-tic。
• *-ial*：com-MER-cial、i-NI-tial。

単語の長さは関係ありません。語尾を見つけ、ひとつ手前の音節に戻って、そこを強く。

聞いて確認：拍は語尾の直前にありますか？`,
    },
    pickPrompt: PP, pickPrompt_ja: PP_JA,
    picks: [
      [{ word: 'information', syl: ['in', 'for', 'ma', 'tion'], stress: 2 }, { word: 'education', syl: ['e', 'du', 'ca', 'tion'], stress: 2 }, { word: 'decision', syl: ['de', 'ci', 'sion'], stress: 1 }, { word: 'attention', syl: ['a', 'tten', 'tion'], stress: 1 }],
      [{ word: 'fantastic', syl: ['fan', 'tas', 'tic'], stress: 1 }, { word: 'terrific', syl: ['te', 'rri', 'fic'], stress: 1 }, { word: 'specific', syl: ['spe', 'ci', 'fic'], stress: 1 }, { word: 'electric', syl: ['e', 'lec', 'tric'], stress: 1 }],
      [{ word: 'essential', syl: ['es', 'sen', 'tial'], stress: 1 }, { word: 'official', syl: ['o', 'ffi', 'cial'], stress: 1 }, { word: 'financial', syl: ['fi', 'nan', 'cial'], stress: 1 }, { word: 'potential', syl: ['po', 'ten', 'tial'], stress: 1 }],
    ],
    shadow: ['information', 'decision', 'attention', 'fantastic', 'specific', 'electric', 'essential', 'official', 'financial', 'potential'],
    shadowPrompt: SP, shadowPrompt_ja: SP_JA,
    challenge: [{ word: 'information', syl: ['in', 'for', 'ma', 'tion'], stress: 2 }, { word: 'decision', syl: ['de', 'ci', 'sion'], stress: 1 }, { word: 'fantastic', syl: ['fan', 'tas', 'tic'], stress: 1 }, { word: 'electric', syl: ['e', 'lec', 'tric'], stress: 1 }, { word: 'essential', syl: ['es', 'sen', 'tial'], stress: 1 }, { word: 'potential', syl: ['po', 'ten', 'tial'], stress: 1 }],
    challengePrompt: CP, challengePrompt_ja: CP_JA,
  },
  {
    slug: 'pron-stress-long', order: 4, kind: 'long', title: 'Longer Words', title_ja: '長い単語',
    intro: {
      title: 'The longer the word, the more it matters', title_ja: '長い単語ほど、アクセントが大事',
      body: `In long words, the wrong stress is what makes them hardest to understand. The good news: English almost never puts the strong beat on the *last* syllable of a long word, and it usually sits near the front or middle.

*reMEMber*, *comPUter*, *toGETHer*: the beat is buried inside, not at the edges.

This lesson gives you practice on longer, everyday words, so the strong beat becomes a habit.`,
      body_ja: `長い単語では、アクセントのまちがいが、いちばん通じにくくする原因です。うれしいことに、英語は長い単語の*最後*の音節に強い拍を置くことはほとんどなく、たいてい前か真ん中あたりに来ます。

*reMEMber*、*comPUter*、*toGETHer*：拍は端ではなく、内側に埋もれています。

このレッスンでは、長めの身近な単語で練習し、強い拍を習慣にします。`,
    },
    mechanics: {
      title: 'Look inside, not at the edges', title_ja: '端ではなく、内側を見る',
      body: `Two habits for long words:

• Do not stress the last syllable. English long words rarely end on the beat.
• Find the one strong beat near the front or middle, and let everything around it go weak. The weak syllables shrink to a quick "uh".

*YESterday* keeps the beat at the front, not "yes-ter-DAY". *reMEMber* leans on the middle.

As you listen, ask: which inside beat is strong?`,
      body_ja: `長い単語のための2つの習慣。

• 最後の音節を強く読まない。英語の長い単語は、最後で拍を打つことはまれです。
• 前か真ん中あたりにある「ひとつの強い拍」を見つけ、まわりはすべて弱く。弱い音節は短い「ア」に縮みます。

*yesterday* は最後ではなく、前に拍を置きます。*remember* は真ん中に乗ります。

聞くときの問い：内側のどの拍が強い？`,
    },
    pickPrompt: PP, pickPrompt_ja: PP_JA,
    picks: [
      [{ word: 'animal', syl: ['an', 'i', 'mal'], stress: 0 }, { word: 'important', syl: ['im', 'por', 'tant'], stress: 1 }, { word: 'umbrella', syl: ['um', 'brel', 'la'], stress: 1 }, { word: 'holiday', syl: ['ho', 'li', 'day'], stress: 0 }],
      [{ word: 'family', syl: ['fa', 'mi', 'ly'], stress: 0 }, { word: 'delicious', syl: ['de', 'li', 'cious'], stress: 1 }, { word: 'photograph', syl: ['pho', 'to', 'graph'], stress: 0 }, { word: 'tomorrow', syl: ['to', 'mo', 'rrow'], stress: 1 }],
      [{ word: 'dictionary', syl: ['dic', 'tio', 'na', 'ry'], stress: 0 }, { word: 'experience', syl: ['ex', 'pe', 'ri', 'ence'], stress: 1 }, { word: 'America', syl: ['a', 'me', 'ri', 'ca'], stress: 1 }, { word: 'helicopter', syl: ['he', 'li', 'cop', 'ter'], stress: 0 }],
    ],
    shadow: ['animal', 'important', 'delicious', 'tomorrow', 'family', 'experience', 'holiday', 'photograph', 'dictionary', 'helicopter'],
    shadowPrompt: SP, shadowPrompt_ja: SP_JA,
    challenge: [{ word: 'animal', syl: ['an', 'i', 'mal'], stress: 0 }, { word: 'important', syl: ['im', 'por', 'tant'], stress: 1 }, { word: 'holiday', syl: ['ho', 'li', 'day'], stress: 0 }, { word: 'tomorrow', syl: ['to', 'mo', 'rrow'], stress: 1 }, { word: 'helicopter', syl: ['he', 'li', 'cop', 'ter'], stress: 0 }, { word: 'experience', syl: ['ex', 'pe', 'ri', 'ence'], stress: 1 }],
    challengePrompt: CP, challengePrompt_ja: CP_JA,
  },
  {
    slug: 'pron-stress-sentence', order: 5, title: 'Stress in Sentences', title_ja: '文のなかのアクセント',
    intro: {
      title: 'Some words, not all', title_ja: 'すべての語ではなく、一部の語',
      body: `English does not stress every word in a sentence equally. *Content* words (nouns, verbs, adjectives, adverbs) get the strong beats. *Function* words (a, the, to, of, and, is, can) go weak and quiet. This strong-and-weak pattern is the rhythm of English.

Japanese tends to give every word similar weight, which sounds flat to an English ear. In "*I WANT to GO to the SHOP*", only WANT, GO and SHOP ring out; the small words shrink.

This lesson trains your ear to hear which words carry the beat.`,
      body_ja: `英語は、文のすべての語を同じ強さでは読みません。*内容語*（名詞・動詞・形容詞・副詞）が強い拍をもらいます。*文法語*（a, the, to, of, and, is, can など）は弱く、小さくなります。この「強い・弱い」のパターンが、英語のリズムです。

日本語はどの語も同じくらいの強さで読みがちで、それが英語の耳には平らに聞こえます。「*I WANT to GO to the SHOP*」では、強く響くのは WANT, GO, SHOP だけ。小さな語は縮みます。

このレッスンでは、どの語が拍を担うかを聞き分ける練習をします。`,
    },
    mechanics: {
      title: 'Strong words and weak words', title_ja: '強い語と、弱い語',
      body: `Words split into two groups.

• *Content* words carry the meaning: nouns, main verbs, adjectives, adverbs, question words. Give them a clear, strong beat. If you texted only these, the message would still make sense.
• *Function* words are the grammar glue: a, the, to, of, and, is, was, can, for. Say them fast and quiet, so "to" becomes "tə", "and" becomes "ən", "the" becomes "thə".

Tap the content words, and let the glue almost disappear.`,
      body_ja: `語は2つのグループに分かれます。

• *内容語*は意味を運びます：名詞、本動詞、形容詞、副詞、疑問詞。はっきり強い拍を与えます。これだけで短いメッセージを送っても、意味は通じます。
• *文法語*は文をつなぐ「のり」：a, the, to, of, and, is, was, can, for など。すばやく小さく言います。「to」は「tə」、「and」は「ən」、「the」は「thə」のように弱まります。

内容語をタップして、「のり」の語は消えるくらいに弱めましょう。`,
    },
    pickPrompt: 'Tap the words that are stressed.', pickPrompt_ja: '強く読む語をタップしよう。',
    sentencePicks: [
      [
        { text: 'I want to go home.', words: ['I', 'want', 'to', 'go', 'home'], stress: [1, 3, 4] },
        { text: 'She bought a new car.', words: ['She', 'bought', 'a', 'new', 'car'], stress: [1, 3, 4] },
        { text: 'We can meet at noon.', words: ['We', 'can', 'meet', 'at', 'noon'], stress: [2, 4] },
      ],
      [
        { text: 'He is the best teacher.', words: ['He', 'is', 'the', 'best', 'teacher'], stress: [3, 4] },
        { text: 'Please call me later.', words: ['Please', 'call', 'me', 'later'], stress: [0, 1, 3] },
        { text: 'I left my keys at work.', words: ['I', 'left', 'my', 'keys', 'at', 'work'], stress: [1, 3, 5] },
      ],
      [
        { text: 'My flight has been delayed.', words: ['My', 'flight', 'has', 'been', 'delayed'], stress: [1, 4] },
        { text: 'Is breakfast included?', words: ['Is', 'breakfast', 'included'], stress: [1, 2] },
        { text: 'Could you call me a taxi?', words: ['Could', 'you', 'call', 'me', 'a', 'taxi'], stress: [2, 5] },
      ],
    ],
    challenge: [
      { text: 'How much is this?', words: ['How', 'much', 'is', 'this'], stress: [0, 1, 3] },
      { text: 'Can I try this on?', words: ['Can', 'I', 'try', 'this', 'on'], stress: [2, 4] },
      { text: 'Is this seat taken?', words: ['Is', 'this', 'seat', 'taken'], stress: [2, 3] },
      { text: 'When does the store close?', words: ['When', 'does', 'the', 'store', 'close'], stress: [0, 3, 4] },
      { text: 'My flight has been delayed.', words: ['My', 'flight', 'has', 'been', 'delayed'], stress: [1, 4] },
    ],
    challengePrompt: 'Say each sentence with natural rhythm to walk Teri to the finish!', challengePrompt_ja: '自然なリズムで文を言って、テリをゴールまで連れて行こう！',
  },
]

for (const def of LESSONS) await buildLesson(def)
console.log('done')
