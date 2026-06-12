/**
 * Seed Level 4 (Natural Flow / Connected Speech) of the Pronunciation course.
 *
 * 6 lessons, each built to the Word Stress bar: concept screens with real rules,
 * THREE graded practice screens, a shadow grid, and a graded flow challenge.
 *
 * Linking lessons ramp in difficulty: the first drag-to-link drill isolates the
 * lesson's ONE target link type (only those gaps are marked correct); the second
 * is a full SENTENCE where the learner must find every place words run together.
 * Chunks are common, useful phrases that each demonstrate the lesson's link.
 *
 * Clips are generated in a UK and a US female voice (breath-trimmed); which_natural
 * also needs a CHOPPY take (words said separately) per phrase. Additive +
 * idempotent: re-run until "done".
 *
 *   node --env-file=.env.local scripts/seed-pron-connected.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function trimTail(buf) {
  const d = mkdtempSync(join(tmpdir(), 'tr-'))
  try {
    const i = join(d, 'i.mp3'), o = join(d, 'o.mp3')
    writeFileSync(i, buf)
    const r = spawnSync('ffmpeg', ['-y', '-i', i, '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.04,areverse', '-c:a', 'libmp3lame', '-q:a', '4', o], { stdio: ['ignore', 'ignore', 'pipe'] })
    return r.status === 0 ? readFileSync(o) : buf
  } catch { return buf } finally { rmSync(d, { recursive: true, force: true }) }
}

function concatChoppy(wordBufs, gapSec = 0.13) {
  const d = mkdtempSync(join(tmpdir(), 'ch-'))
  try {
    const sil = join(d, 'sil.mp3')
    spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(gapSec), '-q:a', '9', sil], { stdio: 'ignore' })
    const files = wordBufs.map((b, i) => { const f = join(d, `w${i}.mp3`); writeFileSync(f, b); return f })
    const listLines = []
    files.forEach((f, i) => { listLines.push(`file '${f}'`); if (i < files.length - 1) listLines.push(`file '${sil}'`) })
    const list = join(d, 'l.txt'); writeFileSync(list, listLines.join('\n'))
    const out = join(d, 'out.mp3')
    const r = spawnSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.status !== 0) throw new Error('choppy concat failed')
    return readFileSync(out)
  } finally { rmSync(d, { recursive: true, force: true }) }
}

const BUCKET = 'test-assets'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta', US_F = 'uYXf8XasLslADfZ2MB4u'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function tts(text, voiceId = UK_F, stability = 0.5) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: { stability, similarity_boost: 0.75 } }),
    })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      return (voiceId === UK_F || voiceId === US_F) ? trimTail(buf) : buf
    }
    if (res.status === 429) { await new Promise(r => setTimeout(r, 2500)); continue }
    throw new Error('ElevenLabs ' + res.status)
  }
  throw new Error('ElevenLabs 429 (gave up)')
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
const slug = (s) => s.replace(/[^a-z]/gi, '').toLowerCase()
const genUK = (text) => ensure(`courses/pron/flow-${slug(text)}.mp3`, () => tts(text, UK_F), text)
const genUS = (text) => ensure(`courses/pron/us/flow-${slug(text)}.mp3`, () => tts(text, US_F), text)
const genChoppyUK = (phrase) => ensure(`courses/pron/flow-choppy-${slug(phrase)}.mp3`, async () => {
  const bufs = []; for (const w of phrase.split(/\s+/)) bufs.push(await tts(w, UK_F)); return concatChoppy(bufs)
}, 'choppy: ' + phrase)
const genChoppyUS = (phrase) => ensure(`courses/pron/us/flow-choppy-${slug(phrase)}.mp3`, async () => {
  const bufs = []; for (const w of phrase.split(/\s+/)) bufs.push(await tts(w, US_F)); return concatChoppy(bufs)
}, 'choppy: ' + phrase)

const course = (await sb.from('courses').select('id').eq('slug', 'pronunciation').maybeSingle()).data
if (!course) throw new Error('Pronunciation course not found — run the consonant seed first.')
let level = (await sb.from('course_levels').select('id').eq('course_id', course.id).eq('order_index', 3).maybeSingle()).data
if (!level) level = (await sb.from('course_levels').insert({ course_id: course.id, order_index: 3, title: 'Natural Flow', title_ja: '自然な流れ' }).select('id').single()).data
const LEVEL_ID = level.id

// ── screen builders ────────────────────────────────────────
const concept = (content) => ({ kind: 'concept', content })
const linkDraw = (prompt, prompt_ja, items, why, why_ja) => ({ kind: 'link_pairs', prompt, prompt_ja, items, why, why_ja })
const linkLetters = (prompt, prompt_ja, items, why, why_ja) => ({ kind: 'link_letters', prompt, prompt_ja, items, why, why_ja })
// LL: a link_letters item. links = [[[fromW,fromC],[toW,toC]], ...] — the
// consonant chunk that docks into the gap before the NEXT word (to = [w+1, 0]).
// EVERY consonant chunk of every non-final word is draggable (movers and
// decoys look identical, so nothing in the UI marks the answer).
const LL_VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const LL = (words, chunks, links, { joined, joined_ja, note, note_ja } = {}) => {
  const sources = []
  chunks.forEach((wordChunks, wi) => {
    if (wi === words.length - 1) return // nothing to jump to after the last word
    wordChunks.forEach((ch, ci) => { if (!LL_VOWELS.has(ch[0].toLowerCase())) sources.push([wi, ci]) })
  })
  const inList = (list, c) => list.some(x => x[0] === c[0] && x[1] === c[1])
  for (const [from, to] of links) {
    if (!inList(sources, from)) throw new Error('LL: from is not a draggable consonant in ' + words.join(' '))
    if (to[0] !== from[0] + 1) throw new Error('LL: a consonant can only dock into the gap right after its word: ' + words.join(' '))
    if (to[1] !== 0) throw new Error('LL: target must be word-initial in ' + words.join(' '))
    if (chunks[from[0]]?.[from[1]] === undefined || chunks[to[0]]?.[to[1]] === undefined) throw new Error('LL: bad chunk index in ' + words.join(' '))
    if (LL_VOWELS.has(chunks[to[0]][0][0].toLowerCase()) === false) throw new Error('LL: answer link lands on a consonant-initial word in ' + words.join(' '))
  }
  // silent-e guard: the mover must be the consonant LETTER, never a trailing e
  for (const [from] of links) {
    if (chunks[from[0]][from[1]].toLowerCase().includes('e')) throw new Error('LL: source chunk contains an e (silent-e leak) in ' + words.join(' '))
  }
  const targets = links.map(l => l[1])
  return { words, chunks, sources, targets, links: links.map(l => ({ from: l[0], to: l[1] })), joined, joined_ja, note, note_ja }
}
const glidePick = (prompt, prompt_ja, items, why, why_ja) => ({ kind: 'glide_pick', prompt, prompt_ja, items, why, why_ja })
const tapT = (prompt, prompt_ja, items, why, why_ja) => ({ kind: 'tap_t', prompt, prompt_ja, items, why, why_ja })
// Every /t/-sound letter in a sentence as ordered {word,char} spots. A "tt"
// counts once; a "th" is skipped entirely (it spells /ð/ or /θ/, not /t/).
function scanTs(text) {
  const spots = []
  text.split(' ').forEach((w, wi) => {
    for (let ci = 0; ci < w.length; ci++) {
      if (w[ci].toLowerCase() !== 't') continue
      if (w[ci + 1]?.toLowerCase() === 'h') continue // "th" digraph, not a /t/
      if (ci > 0 && w[ci - 1].toLowerCase() === 't') continue // second half of a tt
      spots.push({ word: wi, char: ci })
    }
  })
  return spots
}
// tap_t item. flaps/dels are {word,char} of the t's that soften / vanish; the
// rest of the t's become tappable distractors automatically.
const tapItem = (text, flaps, dels, joined, joined_ja, note, note_ja) => {
  const tSpots = scanTs(text)
  const k = (s) => `${s.word}-${s.char}`
  const idxOf = (arr) => (arr || []).map(f => tSpots.findIndex(s => k(s) === k(f))).filter(i => i >= 0)
  const answer = idxOf(flaps), deleted = idxOf(dels)
  if (answer.length !== (flaps || []).length) throw new Error('tapItem: a flap spot did not match a t in "' + text + '"')
  return { text, tSpots, answer, deleted, joined, joined_ja, note, note_ja }
}
const whichNatural = (prompt, prompt_ja, phrases, why, why_ja) => ({ kind: 'which_natural', prompt, prompt_ja, phrases, why, why_ja })
const joinType = (prompt, prompt_ja, items, why, why_ja) => ({ kind: 'join_type', prompt, prompt_ja, items, why, why_ja })
const shadow = (prompt, prompt_ja, phrases) => ({ kind: 'shadow', prompt, prompt_ja, phrases })
const challenge = (prompt, prompt_ja, sentences) => ({ kind: 'challenge', prompt, prompt_ja, sentences })

function audioPlan(screens) {
  const nat = new Set(), chop = new Set()
  for (const s of screens) {
    if (s.kind === 'link_pairs') s.items.forEach(it => nat.add(it.words.join(' ')))
    if (s.kind === 'link_letters') s.items.forEach(it => nat.add(it.words.join(' ')))
    if (s.kind === 'glide_pick') s.items.forEach(it => nat.add(it.text))
    if (s.kind === 'tap_t') s.items.forEach(it => nat.add(it.text))
    if (s.kind === 'which_natural') s.phrases.forEach(p => { nat.add(p); chop.add(p) })
    if (s.kind === 'shadow') s.phrases.forEach(p => nat.add(p))
    if (s.kind === 'challenge') s.sentences.forEach(p => nat.add(p))
  }
  return { nat: [...nat], chop: [...chop] }
}

function buildScreenContent(s, A, AUS, CN, CNUS) {
  if (s.kind === 'concept') return { type: 'concept', audio: null, content: s.content }
  if (s.kind === 'link_pairs') return { type: 'question', audio: null, content: {
    question_type: 'link_pairs', prompt: s.prompt, prompt_ja: s.prompt_ja,
    items: s.items.map(it => ({ words: it.words, links: it.links, joined: it.joined, joined_ja: it.joined_ja, note: it.note, note_ja: it.note_ja, audioAssetId: A[it.words.join(' ')], audioAssetIdUs: AUS[it.words.join(' ')] })),
    explanation: s.why, explanation_ja: s.why_ja } }
  if (s.kind === 'link_letters') return { type: 'question', audio: null, content: {
    question_type: 'link_letters', prompt: s.prompt, prompt_ja: s.prompt_ja,
    items: s.items.map(it => ({ words: it.words, chunks: it.chunks, sources: it.sources, targets: it.targets, links: it.links, joined: it.joined, joined_ja: it.joined_ja, note: it.note, note_ja: it.note_ja, audioAssetId: A[it.words.join(' ')], audioAssetIdUs: AUS[it.words.join(' ')] })),
    explanation: s.why, explanation_ja: s.why_ja } }
  if (s.kind === 'glide_pick') return { type: 'question', audio: null, content: {
    question_type: 'glide_pick', prompt: s.prompt, prompt_ja: s.prompt_ja,
    items: s.items.map(it => ({ text: it.text, answer: it.answer, joined: it.joined, joined_ja: it.joined_ja, note: it.note, note_ja: it.note_ja, audioAssetId: A[it.text], audioAssetIdUs: AUS[it.text] })),
    explanation: s.why, explanation_ja: s.why_ja } }
  // Flapping/deletion is American; the answer keys follow the US clip, so serve
  // the US take to every learner (UK and US ids both point at the US clip).
  if (s.kind === 'tap_t') return { type: 'question', audio: null, content: {
    question_type: 'tap_t', prompt: s.prompt, prompt_ja: s.prompt_ja,
    items: s.items.map(it => ({ text: it.text, tSpots: it.tSpots, answer: it.answer, deleted: it.deleted, joined: it.joined, joined_ja: it.joined_ja, note: it.note, note_ja: it.note_ja, audioAssetId: AUS[it.text], audioAssetIdUs: AUS[it.text] })),
    explanation: s.why, explanation_ja: s.why_ja } }
  if (s.kind === 'which_natural') return { type: 'question', audio: null, content: {
    question_type: 'which_natural', prompt: s.prompt, prompt_ja: s.prompt_ja,
    items: s.phrases.map(p => ({ prompt: p, naturalAudioAssetId: A[p], naturalAudioAssetIdUs: AUS[p], choppyAudioAssetId: CN[p], choppyAudioAssetIdUs: CNUS[p] })),
    explanation: s.why, explanation_ja: s.why_ja } }
  if (s.kind === 'join_type') return { type: 'question', audio: null, content: {
    question_type: 'join_type', prompt: s.prompt, prompt_ja: s.prompt_ja,
    items: s.items.map(it => ({ display: it.display, accepted: it.accepted, hint: it.hint, hint_ja: it.hint_ja })),
    explanation: s.why, explanation_ja: s.why_ja } }
  if (s.kind === 'shadow') return { type: 'question', audio: null, content: {
    question_type: 'shadow', prompt: s.prompt, prompt_ja: s.prompt_ja,
    words: s.phrases.map(p => ({ word: p, audioAssetId: A[p], audioAssetIdUs: AUS[p] })) } }
  if (s.kind === 'challenge') return { type: 'question', audio: null, content: {
    question_type: 'challenge', accent: 'en-US', prompt: s.prompt, prompt_ja: s.prompt_ja,
    positions: s.sentences.map(p => ({ pairs: [[{ referenceText: p, displayText: p, connected: true, audioAssetId: A[p], audioAssetIdUs: AUS[p] }]] })), sentences: [] } }
  throw new Error('unknown screen kind ' + s.kind)
}

async function buildLesson(def) {
  const { nat, chop } = audioPlan(def.screens)
  const A = {}, AUS = {}, CN = {}, CNUS = {}
  for (const p of nat) { A[p] = await genUK(p); AUS[p] = await genUS(p) }
  for (const p of chop) { CN[p] = await genChoppyUK(p); CNUS[p] = await genChoppyUS(p) }
  const screens = def.screens.map(s => buildScreenContent(s, A, AUS, CN, CNUS))
  const old = (await sb.from('lessons').select('id').eq('slug', def.slug).maybeSingle()).data
  if (old) { await sb.from('lesson_screens').delete().eq('lesson_id', old.id); await sb.from('lessons').delete().eq('id', old.id) }
  const { data: lesson } = await sb.from('lessons').insert({ level_id: LEVEL_ID, order_index: def.order, slug: def.slug, title: def.title, title_ja: def.title_ja, free: false, estimated_minutes: 10 }).select('id').single()
  const rows = screens.map((s, i) => ({ lesson_id: lesson.id, order_index: i, type: s.type, content: s.content, audio_asset_id: s.audio }))
  const { error } = await sb.from('lesson_screens').insert(rows)
  if (error) throw new Error('screens: ' + error.message)
  console.log(`✓ ${def.slug}: ${screens.length} screens`)
}

// helper for a link item: words, correct gap indices, joined form, rule note
const L = (words, links, joined, joined_ja, note, note_ja) => ({ words, links, joined, joined_ja, note, note_ja })

// ════════════════════════════════════════════════════════════
const LESSONS = [

// ── L1 · What Is Connected Speech? ─────────────────────────
{
  slug: 'pron-flow-intro', order: 0, title: 'What Is Connected Speech?', title_ja: '音のつながりってなに？',
  screens: [
    concept({
      title: 'English flows', title_ja: '英語は流れる',
      body: `In natural English, words do not stop at their edges. They run into one another in a single smooth stream. *What do you think?* is not four separate words; it pours out as one piece, "wəd-ya-think".

Japanese is built the opposite way: every word, and every mora inside it, is kept separate, even, and clear. Carry that habit into English and you get *staccato* speech, "What. Do. You. Think." Every word is correct, yet a native ear hears it as choppy and slow, and actually finds it harder to follow.

The good news: flow is not about new sounds or speed. It is about *joining*. Three habits do almost all the work, and this level trains them one at a time:

• link a final consonant onto the next vowel,
• slide between two vowels with a tiny glide,
• and let the small grammar words shrink.`,
      body_ja: `自然な英語では、語は端で止まりません。ひとつのなめらかな流れの中で、互いに溶け合います。*What do you think?* は4つの別々の語ではなく、ひとかたまりとして「ワdヤ・スィンク」のように出てきます。

日本語は逆の作りです。どの語も、その中のどの拍も、均等にはっきりと分けます。その癖のまま英語を話すと、「ワット・ドゥ・ユー・スィンク」と*ぶつ切り*になります。単語はすべて正しいのに、ネイティブの耳にはぎこちなく遅く聞こえ、かえって聞き取りにくくなります。

朗報：流れとは新しい音や速さではなく、「つなぐ」ことです。ほぼすべては3つの習慣で決まり、このレベルでは一つずつ練習します。

• 語末の子音を次の母音につなぐ
• 母音どうしを小さな渡り音ですべらせる
• 小さな文法語を弱める`,
    }),
    concept({
      title: 'One breath, no gaps', title_ja: '一息で、すき間なく',
      body: `Here is the test you will use all level: say a short phrase *in one breath, with no gaps*. If it comes out feeling like one long word, you are flowing.

Try it now, out loud:
• *come in* → "co-min"
• *hold on a minute* → "hol-do-na-minute"

Notice that nothing was added or dropped. The letters are all there; you simply changed *where you break*. The break moved off the end of each word and onto the start of the next.

In the exercises you will first *hear* the difference, then *build* the links yourself by dragging each linking consonant onto the vowel it jumps to, then say them. You start with two-word chunks, then link a whole sentence.`,
      body_ja: `このレベルでずっと使う確認方法：短いフレーズを*一息で、すき間なく*言ってみましょう。ひとつの長い単語のように感じられたら、流れています。

声に出してやってみましょう：
• *come in* →「コ・ミン」
• *hold on a minute* →「ホ・ル・ド・ナ・ミニッ」

何も足さず、何も落としていません。文字はすべてそこにあります。変えたのは*区切る場所*だけ。区切りが各語の終わりから外れ、次の語の頭へ移ったのです。

練習ではまず違いを*聞き*、次に語をドラッグでつないで自分でリンクを*作り*、最後に声に出します。2語のチャンクから始め、最後は文まるごとをつなぎます。`,
    }),
    whichNatural('Which take flows as one stream instead of word by word?', '一語ずつではなく、ひと続きの流れになっているのはどっち？',
      ['what do you think', 'nice to meet you', 'thanks a lot'],
      'In the natural takes nothing stops inside the phrase: *what do you think* pours out as "whadda-ya-think", *nice to meet you* as "nice-ta-meechu", *thanks a lot* as "thank-sa-lot". The choppy takes say the same words with a tiny stop after each one, which is exactly what katakana rhythm does. The words never change; only the breaks do.', '自然なほうは、フレーズの中で一度も止まりません。*what do you think* は「ワダヤシンク」、*nice to meet you* は「ナイス・タ・ミーチュ」、*thanks a lot* は「サンク・サ・ロッ」とひと息で流れます。\n\nぶつ切りのほうは同じ単語を一語ずつ区切って言っています。これはカタカナのリズムそのもの。単語は同じでも、切れ目の有無だけで「英語らしさ」が決まるのです。'),
    linkLetters('Drag each linking consonant onto the vowel it jumps to.', 'つながる子音を、次の語の母音までドラッグしよう。', [
      LL(['come', 'in'], [['c', 'o', 'm', 'e'], ['i', 'n']], [[[0, 2], [1, 0]]], { joined: '"co-min"', joined_ja: '「コ・ミン」', note: 'The m of come lands on the i of in.', note_ja: 'come の m が in の i に乗ります。' }),
      LL(['hold', 'on'], [['h', 'o', 'l', 'd'], ['o', 'n']], [[[0, 3], [1, 0]]], { joined: '"hol-don"', joined_ja: '「ホ・ル・ドン」', note: 'The d of hold lands on the o of on.', note_ja: 'hold の d が on の o に乗ります。' }),
      LL(['take', 'it'], [['t', 'a', 'k', 'e'], ['i', 't']], [[[0, 2], [1, 0]]], { joined: '"tay-kit"', joined_ja: '「テイ・キッ」', note: 'The k of take lands on the i of it. The silent e is not a sound, so the k was already the last sound.', note_ja: 'take の k が it の i に乗ります。語末の e は音ではないので、k がもともと最後の音です。' }),
    ], '*Come in* becomes "co-min": the m leaves come and starts in. *Hold on* becomes "hol-don" (the d moves, not the l), and *take it* becomes "tay-kit", where the k was already the last sound because the silent e says nothing. If you dragged the l of hold or the t of take, that is the eye fooling the ear: only the final consonant SOUND jumps.', '*come in* は「コ・ミン」。come の m が in の頭に移ります。*hold on* は「ホル・ドン」。動くのは d で、l ではありません。*take it* は「テイ・キッ」。語末の e は読まない文字なので、k がもともと最後の音です。\n\nhold の l や take の t をドラッグした人は、目が耳をだましています。移るのは「最後の子音の音」だけです。'),
    linkLetters('A whole sentence now — drag every linking consonant onto its vowel.', '今度は文まるごと。つながる子音を全部、母音までドラッグ。', [
      LL(['Hold', 'on', 'a', 'minute'], [['H', 'o', 'l', 'd'], ['o', 'n'], ['a'], ['m', 'i', 'n', 'u', 't', 'e']], [[[0, 3], [1, 0]], [[1, 1], [2, 0]]], { joined: '"hol-do-na minute"', joined_ja: '「ホ・ル・ド・ナ・ミニッ」', note: 'Hold\'s d lands on on, and on\'s n lands on a. minute starts with a consonant, so it stands alone.', note_ja: 'Hold の d が on に、on の n が a に乗ります。minute は子音始まりなので、そのまま。' }),
      LL(['Take', 'it', 'or', 'leave', 'it'], [['T', 'a', 'k', 'e'], ['i', 't'], ['o', 'r'], ['l', 'e', 'a', 'v', 'e'], ['i', 't']], [[[0, 2], [1, 0]], [[1, 1], [2, 0]], [[3, 3], [4, 0]]], { joined: '"tay-ki-tor leave it"', joined_ja: '「テイ・キ・トー・リー・ヴィッ」', note: 'Three consonants jump to vowels: k→it, t→or, v→it. or→leave does not link, because leave starts with a consonant.', note_ja: '3つの子音が母音へ：k→it、t→or、v→it。or→leave は leave が子音始まりなのでつながりません。' }),
    ], '*Hold on a minute*: two jumps in a row. The d lands on on ("hol-don"), then on\'s n lands on a ("na"). Nothing lands on minute, because minute already starts with a consonant. *Take it or leave it*: k to it, t to or, v to it ("tay-ki-tor lea-vit"), while the r of or stays home for the same reason: leave starts with l. A consonant only moves when a vowel is waiting next door.', '*Hold on a minute* はジャンプが2連続。d が on に乗って「ホル・ドン」、その n が a に乗って「ナ」。でも minute には何も乗りません。minute は子音で始まるからです。\n\n*Take it or leave it* は k→it、t→or、v→it で「テイ・キ・トー・リー・ヴィッ」。or の r が動かないのも同じ理由で、leave は l 始まり。子音が移るのは、隣に母音が待っているときだけです。'),
    shadow('Say each one in a single smooth piece.', 'ひと続きのなめらかなかたまりで言おう。',
      ['all of it', 'kind of', 'one of them', 'first of all', 'more or less']),
    challenge('Pour each sentence out in one stream to walk Teri to the finish!', '各文をひと続きの流れで出して、テリをゴールへ！',
      ['What do you think?', "It's nice to meet you.", 'Thanks a lot for helping.', 'I kind of like it.', 'We talked it over.']),
  ],
},

// ── L2 · Catch the Vowel (consonant → vowel) ───────────────
{
  slug: 'pron-flow-cv', order: 1, title: 'Catch the Vowel', title_ja: '母音をつかまえる',
  screens: [
    concept({
      title: 'The number-one link', title_ja: '最重要のつなぎ',
      body: `Consonant-to-vowel linking is the most common join in English, and the single biggest fix for choppy speech.

The rule: when a word ends in a *consonant sound* and the next word begins with a *vowel sound*, the consonant moves over and starts that next word.

• *pick it up* → "pi-ki-tup" (k starts *it*, t starts *up*)
• *turn it on* → "tur-ni-ton"
• *find out* → "fine-dout"

Read those slowly and feel the consonant jump forward. The word *it* almost never sounds like "it"; after a consonant it becomes "-tit, -kit, -nit". That is normal, not sloppy.`,
      body_ja: `子音から母音へのリンクは、英語でいちばん多いつなぎ方で、ぶつ切りを直す最大のポイントです。

ルール：語が*子音の音*で終わり、次の語が*母音の音*で始まると、その子音は移動して次の語の始まりになります。

• *pick it up* →「ピ・キ・タプ」（k が *it* の頭、t が *up* の頭）
• *turn it on* →「タ・ニ・トン」
• *find out* →「ファイン・ダウト」

ゆっくり読んで、子音が前へ飛ぶのを感じましょう。*it* が「イット」と聞こえることはほぼなく、子音のあとでは「ティッ、キッ、ニッ」のようになります。これはふつうで、雑なのではありません。`,
    }),
    concept({
      title: 'Sound, not spelling', title_ja: 'つづりでなく、音',
      body: `One trap: judge by *sound*, not by letters. What matters is what you hear.

• Links: the next word begins with a vowel sound (a, e, i, o, u, and words like *open, easy, off, in, up, all, and, eat, ask, hour, out, on*).
• No link: if the next word begins with a *consonant sound*, there is nothing to catch. *good morning*, *this book* stay separate.

So in *check it out*, both gaps link (k → it, t → out), but in *that book* nothing does.

First you will link clean two-word and three-word chunks. Then you will link a whole sentence, where some gaps join and some do not, and you decide which.`,
      body_ja: `落とし穴がひとつ：文字ではなく*音*で判断します。大事なのは聞こえる音です。

• つながる：次の語が母音の音で始まるとき（a, e, i, o, u、そして *open, easy, off, in, up, all, and, eat, ask, hour, out, on* のような語）。
• つながらない：次の語が*子音の音*で始まるなら、つかまえる相手がいません。*good morning*、*this book* は分けたまま。

だから *check it out* は両方つながり（k → it、t → out）、*that book* はどこもつながりません。

まずきれいな2語・3語のチャンクをつなぎ、次に文まるごとをつなぎます。文ではつながる切れ目とつながらない切れ目があり、それを自分で見分けます。`,
    }),
    linkLetters('Drag each linking consonant onto the next vowel.', 'つながる子音を、次の母音までドラッグ。', [
      LL(['pick', 'it', 'up'], [['p', 'i', 'ck'], ['i', 't'], ['u', 'p']], [[[0, 2], [1, 0]], [[1, 1], [2, 0]]], { joined: '"pi-ki-tup"', joined_ja: '「ピ・キ・タプ」', note: 'pick\'s ck lands on it, and it\'s t lands on up. (ck spells one sound, /k/.)', note_ja: 'pick の ck が it に、it の t が up に乗ります。（ck は /k/ ひとつの音。）' }),
      LL(['turn', 'it', 'on'], [['t', 'u', 'r', 'n'], ['i', 't'], ['o', 'n']], [[[0, 3], [1, 0]], [[1, 1], [2, 0]]], { joined: '"tur-ni-ton"', joined_ja: '「タ・ニ・トン」', note: 'turn\'s n lands on it, and it\'s t lands on on.', note_ja: 'turn の n が it に、it の t が on に乗ります。' }),
      LL(['find', 'out'], [['f', 'i', 'n', 'd'], ['o', 'u', 't']], [[[0, 3], [1, 0]]], { joined: '"fine-dout"', joined_ja: '「ファイン・ダウト」', note: 'find\'s d lands straight on the o of out.', note_ja: 'find の d がそのまま out の o に乗ります。' }),
    ], '*Pick it up* chains twice: the ck (two letters, one sound /k/) starts it, then it\'s t starts up, giving "pi-ki-tup". *Turn it on* does the same with n and t: "tur-ni-ton". *Find out* is a single clean jump, d onto out: "fine-dout". Notice what happened to *it*: after a consonant it never sounds like "it", it becomes "-kit" or "-nit". That is normal English, not sloppy English.', '*pick it up* は2連鎖。ck（2文字で1つの音 /k/）が it の頭になり、it の t が up の頭になって「ピ・キ・タプ」。*turn it on* も n と t で同じく「タ・ニ・トン」。*find out* は d が out に乗るだけの一発ジャンプで「ファイン・ダウト」。\n\n注目は it の変身です。子音のあとの it は「イット」とは聞こえず、「キッ」「ニッ」になります。これが雑ではなく、ふつうの英語です。'),
    linkLetters('A whole sentence — drag only where a consonant meets a vowel.', '文まるごと。子音が母音と出会う所だけドラッグ。', [
      LL(['Turn', 'it', 'off', 'and', 'on'], [['T', 'u', 'r', 'n'], ['i', 't'], ['o', 'ff'], ['a', 'n', 'd'], ['o', 'n']], [[[0, 3], [1, 0]], [[1, 1], [2, 0]], [[2, 1], [3, 0]], [[3, 2], [4, 0]]], { joined: '"tur-ni-to-fa-non"', joined_ja: '「タ・ニ・ト・ファ・ノン」', note: 'Every consonant lands on a vowel: n→it, t→off, ff→and, d→on. A whole sentence in one breath.', note_ja: 'すべての子音が母音に乗ります：n→it、t→off、ff→and、d→on。文まるごと一息で。' }),
      LL(['Can', 'I', 'check', 'it', 'out'], [['C', 'a', 'n'], ['I'], ['ch', 'e', 'ck'], ['i', 't'], ['o', 'u', 't']], [[[0, 2], [1, 0]], [[2, 2], [3, 0]], [[3, 1], [4, 0]]], { joined: '"ca-ni check i-tout"', joined_ja: '「キャ・ニ・チェッ・キ・タウト」', note: 'can→I, check→it, it→out all land on vowels. I→check does not: check starts with a consonant.', note_ja: 'can→I、check→it、it→out は母音に乗ります。I→check は check が子音始まりなので乗りません。' }),
    ], '*Turn it off and on* links at every gap: n to it, t to off, ff to and, d to on, one unbroken "tur-ni-to-fa-non". *Can I check it out* links three times (n to I, ck to it, t to out) but NOT at I and check, because check starts with a consonant. If you linked everything everywhere, listen again: the chain only forms where a consonant meets a vowel.', '*Turn it off and on* は全部の切れ目がつながります。n→it、t→off、ff→and、d→on で、切れ目ゼロの「タ・ニ・ト・ファ・ノン」。\n\n*Can I check it out* は n→I、ck→it、t→out の3か所だけ。I→check はつながりません。check が子音始まりだからです。「全部つなぐ」のではなく「子音と母音が出会う所だけつなぐ」。ここが判断のしどころでした。'),
    whichNatural('Which take links the consonants onto the vowels?', '子音を母音につないでいるのはどっち？',
      ['fill it in', 'sort it out', 'talk about it'],
      'The natural takes run the chains: *fill it in* is "fi-li-tin", *sort it out* is "sor-ti-tout", *talk about it* is "tal-ka-bou-tit". Each consonant hands the stream to the next vowel. In the choppy takes every word ends with a stop, so *it* keeps its lonely full shape, the clearest sign of katakana-style speech.', '自然なほうは鎖がつながっています。*fill it in* は「フィ・リ・ティン」、*sort it out* は「ソー・ティ・タウト」、*talk about it* は「トー・カ・バウ・ティッ」。子音が次の母音へ流れを手渡しています。\n\nぶつ切りのほうは各語の終わりで止まるので、it が「イット」と独立したまま。これがカタカナ式リズムの一番わかりやすいサインです。'),
    shadow('Let each consonant grab the next vowel.', '子音に次の母音をつかませよう。',
      ['clean it up', 'get it done', 'sign up', 'keep it up', 'ask around']),
    challenge('Catch every vowel and keep the chain unbroken to the finish!', '母音をつかまえ、鎖を切らさずゴールへ！',
      ['Can you clean it up?', "Let's get it done.", 'Please sign up today.', 'Keep it up!', "I'll ask around."]),
  ],
},

// ── L3 · Sliding Sounds (vowel → vowel + r-link) ───────────
{
  slug: 'pron-flow-vv', order: 2, title: 'Sliding Sounds', title_ja: 'すべる音',
  screens: [
    concept({
      title: 'A bridge between vowels', title_ja: '母音にかける橋',
      body: `When one word ends in a *vowel* and the next begins with a *vowel*, the two vowels would crash and force a stop. To avoid that, your mouth slides a tiny bridge between them, and which bridge depends on the first vowel:

• After "ee / i / ay / eye" sounds, a small *y* (/j/) slides in: *I agree* → "I-yagree", *the end* → "thee-yend".
• After "oo / oh / ow" sounds, a small *w* slides in: *go ahead* → "go-wahead", *do it* → "do-wit".

You never write this sound and barely hear it on its own; it just keeps the stream moving so you never stop and restart between the vowels. This lesson trains *only* these vowel-to-vowel slides, so in the first drill you link nothing but vowels meeting vowels.`,
      body_ja: `語が*母音*で終わり、次が*母音*で始まると、二つの母音がぶつかって止まらざるを得ません。それを避けるため、口は二つの間に小さな橋をすべり込ませます。どの橋かは前の母音で決まります：

• 「イー／イ／エイ／アイ」の音のあとは、小さな*y*（/j/）：*I agree* →「ア・イヤグリー」、*the end* →「ジ・エンド」。
• 「ウー／オウ／アウ」の音のあとは、小さな*w*：*go ahead* →「ゴ・ワヘッド」、*do it* →「ド・ウィッ」。

この音は決して書かず、単体ではほとんど聞こえません。母音どうしの間で止まらずにすむよう、流れを保つだけです。このレッスンでは*この母音→母音のすべりだけ*を練習するので、最初の練習では母音どうしが出会う所だけをつなぎます。`,
    }),
    concept({
      title: 'The linking r', title_ja: 'つなぎの r',
      body: `British English adds a second bridge. A word spelled with a final *r* is normally silent (*far*, *more*, *your* end in a vowel sound). But when the very next word starts with a vowel, that r wakes up and links the two together:

• *far away* → "fa-raway"
• *more ice* → "mo-rice"
• *your own* → "yo-rown"

So the bridges between vowels are: a *y* glide, a *w* glide, and the linking *r*. They all do one job, stop two vowels colliding.

You will isolate each one, then put everything together in a sentence, where these vowel bridges combine with the consonant links from the last lesson.`,
      body_ja: `イギリス英語には2つ目の橋があります。語末の *r* はふだん発音しません（*far*、*more*、*your* は母音の音で終わります）。でも次の語が母音で始まると、その r が目を覚ましてつなぎます：

• *far away* →「ファ・ラウェイ」
• *more ice* →「モ・ライス」
• *your own* →「ヨ・ロウン」

つまり母音間の橋は、*y* の渡り音、*w* の渡り音、つなぎの *r*。役目はどれも同じ、二つの母音の衝突を防ぐこと。

一つずつ切り分けて練習し、最後に文の中でまとめます。文では、この母音の橋が前のレッスンの子音リンクと組み合わさります。`,
    }),
    glidePick('Listen. Which sound bridges the two words?', '音声を聞いて、二つの語をつなぐ橋の音を選ぼう。', [
      { text: 'I agree', answer: 'y', joined: '"I-yagree"', joined_ja: '「ア・イヤグリー」', note: 'After the "eye" sound of I, a Y glide slides in before agree.', note_ja: 'I の「アイ」の音のあと、agree の前に Y の渡り音が入ります。' },
      { text: 'go ahead', answer: 'w', joined: '"go-wahead"', joined_ja: '「ゴ・ワヘッド」', note: 'After the "oh" of go, a W glide carries on into ahead.', note_ja: 'go の「オウ」のあと、W の渡り音が ahead へ続きます。' },
      { text: 'far away', answer: 'r', joined: '"fa-raway"', joined_ja: '「ファ・ラウェイ」', note: 'The silent r in far wakes up and links onto away.', note_ja: 'far の黙っていた r が目を覚まし、away につながります。' },
    ], '*I agree* ends in the "eye" sound, so a small y slides in: "I-yagree". *Go ahead* ends in "oh", the lips are already rounded, and a w appears: "go-wahead". *Far away* has the written r, and before a vowel it wakes up: "fa-raway". You never write the y or w, but the mouth makes them whenever those vowels meet another vowel.', '*I agree* は「アイ」で終わるので、小さな y がすべり込んで「ア・イヤグリー」。*go ahead* は「オウ」で終わり、唇がすでに丸いので w が現れて「ゴ・ワヘッド」。*far away* はつづりに r があり、母音の前で目を覚まして「ファ・ラウェイ」。\n\ny も w も文字には書きません。でも口は、これらの母音が次の母音と出会うたびに自動で橋を架けています。'),
    glidePick('Listen again. Y glide, W glide, or linking R?', 'もう一度。Y の渡り音、W の渡り音、それとも つなぎの R？', [
      { text: 'the end', answer: 'y', joined: '"thee-yend"', joined_ja: '「ジ・エンド」', note: 'Before a vowel, the becomes "thee" and a Y glide links it onto end.', note_ja: '母音の前で the は「ジ」になり、Y の渡り音で end につながります。' },
      { text: 'more ice', answer: 'r', joined: '"mo-rice"', joined_ja: '「モ・ライス」', note: 'The silent r in more wakes up and links straight onto ice.', note_ja: 'more の黙っていた r が目を覚まし、そのまま ice につながります。' },
      { text: 'who is', answer: 'w', joined: '"who-wiz"', joined_ja: '「フ・ウィズ」', note: 'After the "oo" of who, a W glide carries on into is.', note_ja: 'who の「ウー」のあと、W の渡り音が is へ続きます。' },
    ], '*The end*: before a vowel, the becomes "thee", and that "ee" brings a y glide onto end ("thee-yend"). *More ice*: the silent r of more links straight on, "mo-rice". *Who is*: the "oo" of who rounds the lips, so a w carries it into is, "who-wiz". The bridge is decided entirely by how the FIRST word ends; the second word just receives it.', '*the end* では母音の前の the が「ジ」になり、その「イー」が y の橋で end へつながります（「ジ・エンド」）。*more ice* は more の黙っていた r がそのまま目を覚まして「モ・ライス」。*who is* は who の「ウー」で唇が丸まり、w が is へ運んで「フ・ウィズ」。\n\n橋の種類を決めるのは、前の語の「終わりの音」だけ。後ろの語は受け取るだけです。'),
    linkDraw('A whole sentence — link every place the words run together.', '文まるごと。つながる所を全部リンクしよう。', [
      L(['You', 'and', 'I', 'are', 'early'], [0, 1, 2, 3], '"yo-wan-dai-ya-rearly"', '「ヨ・ワン・ダイ・ヤ・リアリー」', 'A w-glide, a consonant link, a y-glide, and a linking r — all four kinds in one sentence.', 'w の渡り音、子音リンク、y の渡り音、つなぎの r。4種類が一文に。'),
      L(['Go', 'in', 'and', 'see', 'us'], [0, 1, 3], '"go-win-and see-yus"', '「ゴ・ウィン・アンド・スィ・ヤス」', 'go→in (w-glide), in→and (consonant link), see→us (y-glide). and→see does not link: see starts with a consonant.', 'go→in（w 渡り音）、in→and（子音リンク）、see→us（y 渡り音）。and→see は see が子音始まりでつながりません。'),
    ], '*You and I are early* packs four bridges into nine syllables: you to and takes a w ("yo-wan"), and to I links the d ("dai"), I to are takes a y ("ya"), and are to early wakes the r ("a-rearly"). *Go in and see us*: go to in is a w glide, in to and links the n, see to us is a y glide, but and to see stays apart because see starts with a consonant. Feel all of these and you are hearing English as a stream, not as words.', '*You and I are early* は、たった9音節に橋が4本。you→and は w（「ヨ・ワン」）、and→I は d のリンク（「ダイ」）、I→are は y（「ヤ」）、are→early は r が目を覚まして「ア・リアリー」。\n\n*Go in and see us* は go→in が w、in→and が n のリンク、see→us が y。でも and→see はつながりません。see が子音始まりだからです。この4種類が体感できたら、英語が「単語の列」ではなく「一本の流れ」に聞こえ始めています。'),
    shadow('Bridge every pair of vowels, never stop between them.', '母音のペアごとに橋をかけ、間で止めない。',
      ['do it', 'no idea', 'pay attention', 'you are', 'here it is']),
    challenge('Slide across every vowel to keep the stream alive to the finish!', 'すべての母音をすべり抜け、流れを切らさずゴールへ！',
      ['You and I agree.', 'Go ahead and try it.', 'I have no idea.', 'Pay attention to me.', 'Where are you off to?']),
  ],
},

// ── L4 · The Small Words Shrink (weak forms) ───────────────
{
  slug: 'pron-flow-weak', order: 3, title: 'The Small Words Shrink', title_ja: '小さな語は縮む',
  screens: [
    concept({
      title: 'Strong words and weak words', title_ja: '強い語と弱い語',
      body: `English speech runs at two speeds at once. The *content words* (nouns, main verbs, adjectives) are said fully and clearly. The *grammar words* (to, of, and, for, can, at, that, you, your, a, the, them) are squeezed small.

Their vowel collapses to a tiny "uh" sound (the schwa, /ə/), and they go quiet and quick:

• *to* → "tə"   • *of* → "əv"   • *and* → "ən"   • *for* → "fə"   • *can* → "kən"   • *them* → "əm"

So *a lot of work* → "a lottə work", *bread and butter* → "bread ən butter", *wait for them* → "wait fər əm".`,
      body_ja: `英語は2つの速さで同時に流れます。*内容語*（名詞・主動詞・形容詞）ははっきりフルに。*文法語*（to, of, and, for, can, at, that, you, your, a, the, them）は小さく押し込みます。

母音は小さな「ア」（あいまい母音 /ə/）に縮み、弱く速くなります：

• *to* →「タ」  • *of* →「アヴ」  • *and* →「ン」  • *for* →「ファ」  • *can* →「カン（弱）」  • *them* →「アム」

つまり *a lot of work* →「ア・ロタ・ワーク」、*bread and butter* →「ブレッ・ン・バター」、*wait for them* →「ウェイト・ファ・ラム」。`,
    }),
    concept({
      title: 'Why strong sounds wrong', title_ja: 'なぜ強いと不自然か',
      body: `The surprise for many learners: saying every word fully makes you *harder* to understand, not easier.

English rhythm is built on the contrast between strong and weak. The strong content words land like drumbeats; the weak words fill the gaps quietly. A listener locks onto that beat. Give a small word like *to* or *and* a full, strong vowel and it sticks out where the ear expects a dip, so the whole rhythm stumbles.

Contractions are this same shrinking, written down: *I will* → *I'll*, *it is* → *it's*, *could not* → *couldn't*. Two small words pressed into one beat.

Next you will hear the contrast, then write the shrunk forms.`,
      body_ja: `多くの学習者に意外な事実：すべての語をフルに言うと、かえって*伝わりにくく*なります。

英語のリズムは強と弱の対比でできています。強い内容語は太鼓のように打たれ、弱い語は静かに間を埋めます。聞き手はその拍に同調します。*to* や *and* にフルの強い母音を与えると、耳が弱まると予想する所で浮き上がり、リズム全体がつまずきます。

短縮形は、この縮みを書いたもの：*I will* → *I'll*、*it is* → *it's*、*could not* → *couldn't*。小さな語2つを1拍に。

次は対比を聞き、それから縮んだ形を書きます。`,
    }),
    whichNatural('Which take keeps the small words weak and quick?', '小さな語を弱く速くしているのはどっち？',
      ['a lot of work', 'ready for it', 'look at it'],
      'In the natural takes the grammar words shrink to almost nothing: *a lot of work* is "a-lotta-work" (of is just "ə"), *ready for it* squeezes for to "fə" and links the r ("ready-fə-rit"), *look at it* is "loo-ka-tit". The choppy takes give of, for and at the same weight as the content words, and that even rhythm is what sounds foreign. Small words are meant to disappear.', '自然なほうでは文法語がほぼ消えます。*a lot of work* は「ア・ロタ・ワーク」（of は「ア」だけ）、*ready for it* は for が「ファ」に縮み、r がつながって「レディ・ファ・リッ」、*look at it* は「ル・カ・ティッ」。\n\nぶつ切りのほうは of・for・at を内容語と同じ重さで言っています。この「全部同じ重さ」こそ、カタカナ英語のリズム。小さな語は、消えるのが正解です。'),
    joinType('Write the one-beat contraction.', '1拍の短縮形を書こう。', [
      { display: 'I will', accepted: ["I'll", 'Ill'], hint: '', hint_ja: '' },
      { display: 'do not', accepted: ["don't", 'dont'], hint: '', hint_ja: '' },
      { display: 'they are', accepted: ["they're", 'theyre'], hint: '', hint_ja: '' },
      { display: 'we have', accepted: ["we've", 'weve'], hint: '', hint_ja: '' },
    ], '"I\'ll", "don\'t", "they\'re", "we\'ve": each contraction is a weak form you can see. *I will* loses the whole "wi" and keeps one beat. *Do not* crushes not onto do. *They are* melts are into a tail, and *we have* keeps only the "v". Say each one as a single beat: if your version has two beats, the apostrophe has not finished its job.', 'I\'ll、don\'t、they\'re、we\'ve。短縮形は「目に見える弱形」です。*I will* は wi がまるごと消えて1拍に。*do not* は not が do に押しつぶされ、*they are* は are がしっぽに溶け、*we have* は「ヴ」だけが残ります。\n\nどれも「1拍」で言えたか確認しましょう。2拍に聞こえたら、アポストロフィの仕事がまだ終わっていません。'),
    joinType('A few trickier contractions — write the short form.', 'もう少し難しい短縮形を書こう。', [
      { display: 'it is', accepted: ["it's", 'its'], hint: '', hint_ja: '' },
      { display: 'I am', accepted: ["I'm", 'im'], hint: '', hint_ja: '' },
      { display: 'could not', accepted: ["couldn't", 'couldnt'], hint: '', hint_ja: '' },
      { display: 'should have', accepted: ["should've", 'shouldve'], hint: 'not "should of"', hint_ja: '「should of」ではない' },
    ], '"It\'s", "I\'m", "couldn\'t", "should\'ve". The last one is the famous trap: the "əv" you hear is weak *have*, so the writing is should\'ve, never "should of". People write "of" because the weak form genuinely sounds like of, which proves how far the reduction goes.', 'it\'s、I\'m、couldn\'t、should\'ve。最後が有名なワナです。聞こえる「アヴ」は弱形の *have* なので、書くなら should\'ve。「should of」ではありません。\n\nネイティブの子どもでも of と書き間違えるほど、have は本当に「アヴ」まで縮んでいます。弱形の強さの、何よりの証拠です。'),
    shadow('Lean on the content words, shrink the rest.', '内容語に乗り、残りは縮める。',
      ['bread and butter', 'a glass of water', 'time for lunch', 'good at maths', 'proud of you']),
    challenge('Shrink every small word and let the content words ring to the finish!', '小さな語を縮め、内容語を響かせてゴールへ！',
      ['I want some bread and butter.', 'Can I have a glass of water?', "It's time for lunch.", "She's good at maths.", "We're proud of you."]),
  ],
},

// ── L5 · Wanna, Gonna, Gotta (relaxed forms) ───────────────
{
  slug: 'pron-flow-wanna', order: 4, title: 'Wanna, Gonna, Gotta', title_ja: 'wanna・gonna・gotta',
  screens: [
    concept({
      title: 'When two words fuse', title_ja: '2語が溶け合うとき',
      body: `Reduction has a final stage: a few very common pairs do not just shrink, they *fuse* into a single new word.

• *want to* → "wanna"   • *going to* → "gonna"   • *got to* → "gotta"
• *have to* → "hafta"   • *has to* → "hasta"   • *kind of* → "kinda"
• *let me* → "lemme"   • *give me* → "gimme"   • *out of* → "outta"

These are not slang and not lazy. They are the normal everyday spoken forms, used by everyone from news anchors to professors the moment speech relaxes. *I'm going to call you* almost always comes out "I'm gonna call you".

One guard-rail: *gonna* and *wanna* only work before a verb. "I'm going to call you" → "I'm gonna call you", but "I'm going to Tokyo" never becomes "gonna Tokyo" — there the *to* is a real destination word. Likewise *want to see* → "wanna see", but *I want two* never fuses.`,
      body_ja: `弱化には最終段階があります。ごく一般的ないくつかのペアは、ただ縮むだけでなく、*溶け合って*ひとつの新しい語になります。

• *want to* →「ワナ」  • *going to* →「ゴナ」  • *got to* →「ガタ」
• *have to* →「ハフタ」  • *has to* →「ハスタ」  • *kind of* →「カインダ」
• *let me* →「レミ」  • *give me* →「ギミ」  • *out of* →「アウタ」

これはスラングでも怠けでもありません。ニュースキャスターから教授まで、話がくだけた瞬間に誰もが使う、ふつうの日常の話し言葉です。*I'm going to call you* はほぼ必ず「I'm gonna call you」と出ます。

ひとつだけガードレール：gonna と wanna が使えるのは、後ろに動詞が来るときだけです。"I'm going to call you" は "I'm gonna call you" になりますが、"I'm going to Tokyo" は決して "gonna Tokyo" になりません。この to は行き先を表す本物の to だからです。同じく *want to see* は「wanna see」でも、*I want two* は溶けません。`,
    }),
    concept({
      title: 'Say it, but do not write it', title_ja: '言う、でも書かない',
      body: `One firm rule keeps you safe: these fused forms belong to *speech only*. Say "I wanna go", but write "I want to go" in an email, an essay, or anything formal. Writing "wanna" looks wrong on the page even though it is exactly what people say.

And hearing them matters as much as saying them. If your ear is waiting for a clear "going to", you will miss "gonna" completely and lose the sentence. Films, songs, and real conversation are full of these, so training your ear here is training your listening.

In the drills, type how each pair actually sounds, then say the fused forms in real sentences.`,
      body_ja: `安全を守る確かなルールがひとつ：この溶けた形は*話し言葉だけ*のものです。「I wanna go」と言っても、メールや作文では「I want to go」と書きます。「wanna」と書くと、実際にそう言っていても、紙の上では誤りに見えます。

そして聞き取れることは、言えることと同じくらい大切です。耳がはっきりした「going to」を待っていると、「gonna」をまるごと聞き逃します。映画も歌も会話もこれだらけ。ここで耳を鍛えることは、リスニングを鍛えることです。

練習では、各ペアの実際の聞こえ方を入力し、それから本物の文の中で溶けた形を言います。`,
    }),
    joinType('Type how each pair sounds when it fuses.', '溶けたときの聞こえ方を入力しよう。', [
      { display: 'want to', accepted: ['wanna'], hint: 'before a verb', hint_ja: '動詞の前で' },
      { display: 'going to', accepted: ['gonna'], hint: 'before a verb', hint_ja: '動詞の前で' },
      { display: 'got to', accepted: ['gotta'], hint: '', hint_ja: '' },
      { display: 'have to', accepted: ['hafta', 'havta'], hint: '', hint_ja: '' },
    ], '"Wanna", "gonna", "gotta", "hafta". Notice the two flavors: in wanna and gonna the t drops out entirely, while gotta flaps its t to a fast d, and hafta sharpens the v of have to f before the t. And keep the guard-rail: these only fire before a verb. "I\'m gonna call you", but never "I\'m gonna Tokyo".', 'wanna、gonna、gotta、hafta。よく見ると溶け方が2種類あります。wanna と gonna は t がまるごと消えるタイプ。gotta は t がタップ（速い d）になり、hafta は have の v が t の前で f に変わるタイプです。\n\nそしてガードレールを忘れずに。使えるのは動詞の前だけ。"I\'m gonna call you" は言えても、"I\'m gonna Tokyo" とは決して言いません。'),
    joinType('A few more everyday fusions.', '日常のもう少しの融合形。', [
      { display: 'kind of', accepted: ['kinda'], hint: '', hint_ja: '' },
      { display: 'let me', accepted: ['lemme'], hint: '', hint_ja: '' },
      { display: 'give me', accepted: ['gimme'], hint: '', hint_ja: '' },
      { display: 'out of', accepted: ['outta'], hint: '', hint_ja: '' },
    ], '"Kinda", "lemme", "gimme", "outta". Two patterns again: kind of and out of drop the f of weak of ("əv" becomes "ə"), while let me and give me delete the consonant in front of the m (the t of let, the v of give) so the words pour together. These four are everywhere in real speech; catching them by ear is half of understanding fast English.', 'kinda、lemme、gimme、outta。ここにも型が2つあります。kind of と out of は、弱形 of の f が落ちるタイプ（「アヴ」→「ア」）。let me と give me は、m の前の子音（let の t、give の v）が消えて語が流れ込むタイプです。\n\nこの4つは日常会話のあらゆる所に出てきます。耳で捕まえられれば、速い英語の半分は攻略済みです。'),
    whichNatural('Which take fuses the pair into one relaxed word?', 'ペアをひとつのくだけた語に溶かしているのはどっち？',
      ['I have to leave', 'let me try', 'out of time'],
      'The natural takes fuse: "I hafta leave", "lemme try", "outta time", each pair landing as one relaxed word. The choppy takes pronounce have to, let me and out of as two careful words each, which instantly sounds like reading aloud instead of talking. The fusion is not lazy; it IS the spoken form.', '自然なほうは「I hafta leave」「lemme try」「outta time」。ペアがひとつのくだけた語として着地しています。\n\nぶつ切りのほうは have to、let me、out of を2語ずつ丁寧に発音していて、「話している」ではなく「音読している」ように聞こえます。溶けるのは怠けではなく、それが話し言葉の正式な形です。'),
    shadow('Say each fused pair as one easy word.', '溶けたペアを、ひとつの楽な語として言おう。',
      ['wanna try', 'gonna leave', 'gotta hurry', 'kinda tired', 'gimme a sec']),
    challenge('Fuse the pairs and stay relaxed all the way to the finish!', 'ペアを溶かし、リラックスしたままゴールへ！',
      ['I wanna try it.', "We're gonna leave soon.", 'I gotta hurry up.', "I'm kinda tired today.", 'Gimme a second.']),
  ],
},

// ── L6 · The Fast T (flap / linking T) ─────────────────────
{
  slug: 'pron-flow-flapt', order: 5, title: 'The Fast T', title_ja: '速い T',
  screens: [
    concept({
      title: 'T between vowels', title_ja: '母音にはさまれた T',
      body: `A hard "t" is a little stop: the air halts and bursts. That is fine at the start of a word, but between two vowels it would break the flow, so English softens it.

In American English, a *t* between vowels becomes a *flap*: a single quick tap of the tongue that sounds almost like a fast *d*.

• *water* → "wadder"   • *better* → "bedder"   • *city* → "ciddy"
• and across words: *get it* → "geddit", *a lot of* → "a lodda", *put it on* → "pu-di-don"

The flap keeps the tongue moving so the t never stops the stream. It happens inside a word and, just as often, across the gap between words.

One condition: inside a word, the t flaps only when the next syllable is weak. *WAter*, *BETter*, *CIty* flap; *hoTEL* and *aTTENtion* do not, because there the t starts the strong beat.`,
      body_ja: `硬い「トゥ」は小さな止まりです。息が止まって破裂します。語頭ではよいのですが、二つの母音の間では流れを切るので、英語はそれをやわらげます。

アメリカ英語では、母音間の *t* は*フラップ*になります。舌を一度すばやく弾く、速い *d* に近い音です。

• *water* →「ワダー」  • *better* →「ベダー」  • *city* →「シディ」
• 語をまたいでも：*get it* →「ゲディッ」、*a lot of* →「ア・ロダ」、*put it on* →「プ・ディ・ドン」

フラップは舌を動かし続け、t が流れを止めないようにします。語の中でも、語と語の切れ目でも、同じくらいよく起こります。

条件がひとつ。語の中では、次の音節が弱いときだけ t がフラップになります。*WAter*・*BETter*・*CIty* はフラップしますが、*hoTEL* や *aTTENtion* はなりません。そこでは t が強い拍の頭にあるからです。`,
    }),
    concept({
      title: 'Accents handle it differently', title_ja: 'アクセントで扱いが違う',
      body: `This is one place where American and British English clearly split, so match the model voice you are learning from.

• *American*: the flap, a quick d-like tap (*get it* → "geddit").
• *British (RP)*: a clearer, crisper t, kept light so it still does not stop the flow.
• *Many British / Australian accents*: a *glottal stop*, a tiny catch in the throat instead of the t (*water* → "wa'er").

The point underneath all three is the same: between vowels, the t never becomes a hard, full stop that breaks the stream.

In the drills, you tap every t that softens, and a tapped t *shrinks* on screen — softened, not gone. One step further: a t caught between an *n* and a weak vowel can vanish completely. *twenty* becomes "twenny", *winter* becomes "winner". The last drill trains those disappearing t's.`,
      body_ja: `ここはアメリカ英語とイギリス英語がはっきり分かれる場所のひとつなので、学んでいるモデル音声に合わせましょう。

• *アメリカ*：フラップ、速い d のような弾き（*get it* →「ゲディッ」）。
• *イギリス（RP）*：よりはっきりした t。ただし軽く保ち、流れは止めません。
• *多くのイギリス／オーストラリアのアクセント*：*声門閉鎖音*。t の代わりに、のどの小さな「詰まり」（*water* →「ウォ・ア」）。

3つの底にある要点は同じ：母音間では、t が流れを切る硬いフル停止にはならない、ということ。

練習では、やわらぐ t を全部タップします。タップした t は画面上で*小さく*なります。消えるのではなく、やわらぐのです。さらにもう一歩：n と弱い母音にはさまれた t は、完全に消えることがあります。*twenty* は「トゥエニー」、*winter* は「ウィナー」。最後の練習では、その消える t を扱います。`,
    }),
    whichNatural('Which take keeps the t light and linked, not a hard stop?', 't を硬く止めず、軽くつないでいるのはどっち？',
      ['get it', 'a little bit', 'later on'],
      'In the natural takes every t between vowels taps: *get it* is "geddit", *a little bit* is "a liddle bit", and in *later on* the flapped t of later links straight across into on, "lay-de-ron". The choppy takes hit a hard t and stop dead after it. If a phrase sounds like it has tiny brakes inside, those brakes are the hard t\'s.', '自然なほうは母音間の t が全部タップします。*get it* は「ゲディッ」、*a little bit* は「ア・リドゥ・ビッ」、*later on* は later のタップした t が on まで渡って「レイ・デ・ロン」。\n\nぶつ切りのほうは硬い t を打って、そのたびに完全に止まります。フレーズの中に小さなブレーキを感じたら、それが硬い t です。'),
    tapT('Listen, then tap every t that softens into the fast d.', '音声を聞いて、やわらかい d に変わる t を全部タップしよう。', [
      tapItem('Get it out of it', [{ word: 0, char: 2 }, { word: 1, char: 1 }, { word: 2, char: 2 }, { word: 4, char: 1 }], [],
        '"ge-di-tou-do-vit"', '「ゲ・ディ・タウ・ド・ヴィッ」',
        'Every t here sits between vowels, so all four tap to a fast d.', 'ここでは t がどれも母音にはさまれ、4つすべて速い d にタップします。'),
      tapItem('We sat at a hotel', [{ word: 1, char: 2 }, { word: 2, char: 1 }], [],
        '"we sa-da-da hotel"', '「ウィ・サ・ダ・ダ・ホテル」',
        'sat and at flap to a fast d before the next vowel. The t in hoTEL is hard — it starts the strong beat, so leave it.', 'sat と at は次の母音の前で速い d にタップ。hoTEL の t は強い拍の頭にある硬い t なので、そのまま。'),
      tapItem('I bought a better table', [{ word: 1, char: 5 }, { word: 3, char: 2 }], [],
        '"I bou-da bedder table"', '「アイ・ボー・ダ・ベダー・テイブル」',
        'bought and better flap between vowels. The T in Table is hard — it starts the stressed word.', 'bought と better は母音間でタップ。Table の T は強い語の頭にある硬い t です。'),
    ], '*Get it out of it*: three taps in a row (get to it, it to out, out to of) plus a v link, "ge-di-tou-do-vit". *We sat at a hotel*: sat and at both tap, but hoTEL keeps its hard t because that t starts the strong beat. *I bought a better table*: bought taps onto a and beTTer taps inside the word, while Table stays hard for the same reason as hoTEL. The rule in one line: t softens between vowels only when the next syllable is weak.', '*Get it out of it* はタップ3連発（get→it、it→out、out→of）＋ v のリンクで「ゲ・ディ・タウ・ド・ヴィッ」。*We sat at a hotel* は sat→at と at→a がタップ。でも hoTEL の t は硬いまま。t が強い拍の頭にあるからです。*I bought a better table* は bought→a と beTTer の中がタップし、Table は hoTEL と同じ理由で硬いまま。\n\nルールは一行。t がやわらぐのは母音の間、ただし次の音節が弱いときだけ。'),
    tapT('Now listen for t\'s that vanish completely. Tap each one.', '今度は、完全に消える t を聞き取ろう。それぞれタップ。', [
      tapItem('in the winter', [{ word: 2, char: 3 }], [{ word: 2, char: 3 }],
        '"in the winner"', '「イン・ザ・ウィナー」',
        'After n, the t in winter often disappears entirely: "winner".', 'n のあと、winter の t はまるごと消えることがよくあります：「ウィナー」。'),
      tapItem('twenty cents', [{ word: 0, char: 4 }], [{ word: 0, char: 4 }],
        '"twenny cents"', '「トゥエニー・センツ」',
        'The middle t of twenty drops: "twenny". The first T is a hard onset, and the t in cents stays.', 'twenty の真ん中の t は落ちて「トゥエニー」。最初の T は硬い頭の音、cents の t は残ります。'),
      tapItem('the internet', [{ word: 1, char: 2 }], [{ word: 1, char: 2 }],
        '"the innernet"', '「ジ・イナーネット」',
        'The t after n drops: "innernet". The final t stays.', 'n のあとの t は落ちて「イナーネット」。最後の t は残ります。'),
    ], '*Winter* loses its t completely: "winner". *Twenty* becomes "twenny" and *internet* "innernet". All three t\'s sit between an n and a weak vowel, the one spot where American English deletes the t rather than tapping it. The other t\'s in these phrases (cents, the final t of internet) survive untouched. If you tapped those, listen again for what actually disappeared.', '*winter* は t が完全に消えて「ウィナー」。*twenty* は「トゥエニー」、*internet* は「イナネッ」。3つとも t が「n と弱い母音の間」にいます。ここはアメリカ英語が、やわらげるどころか消してしまう特等席です。\n\n同じフレーズでも cents の t や internet の最後の t は無傷で残ります。そこをタップした人は、もう一度「本当に消えた音」を聞き直してみましょう。'),
    shadow('Tap the t forward, keep it light.', 't を前へタップ、軽く保つ。',
      ['better off', 'out of it', 'water it', 'got it right', 'a little while']),
    challenge('Tap every t and flow without a single hard stop to the finish!', 'すべての t をタップし、硬い止まりなしでゴールへ！',
      ["We're better off now.", "I'm out of it.", 'Can you water it?', "Let's figure it out.", 'Just wait a bit.']),
  ],
},

]

for (const def of LESSONS) await buildLesson(def)
console.log('done')
