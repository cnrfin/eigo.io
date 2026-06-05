/**
 * Seed the CEFR Level Check (~20 minutes, four skills, level estimate).
 *
 * Design (criterion-referenced, kept deliberately light):
 *   1. Vocabulary  — 9 items, graded ladder A1->C1 (payload.cefr tags)
 *   2. Grammar     — 9 items, graded ladder A1->C1
 *   3. Reading     — 2 short texts, 5 items (A2->B2)
 *   4. Listening   — 4 short clips, 6 items (A1->B2), TTS-generated
 *   5. Writing     — 1 short task, AI-graded 1-6 vs CEFR descriptors
 *   6. Speaking    — 2 short prompts, AI-graded from audio 1-6
 *
 * Scoring: basket walk over the level tags (receptive) fused with the
 * writing/speaking bands -> CEFR band + strength + CEFR-J sub-level.
 *
 * All content ORIGINAL. Run AFTER supabase/seed-cefr.sql:
 *   node --env-file=.env.local scripts/seed-cefr.mjs
 * Re-running REFRESHES the form (deletes the old form + audio, regenerates).
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

const BUCKET = 'test-assets'
const FORM_SLUG = 'cefr-check-01'
const AUDIO_DIR = `listening/${FORM_SLUG}`
const ELEVENLABS_MODEL_ID = 'eleven_v3'

const VOICES = {
  usf: { voiceId: 'uYXf8XasLslADfZ2MB4u', label: 'US-Female' },
  usm: { voiceId: 'UgBBYS2sOqTuMpoF3BR0', label: 'US-Male' },
  ukf: { voiceId: 'lcMyyd2HUfFzxdCaC4Ta', label: 'UK-Female' },
  ukm: { voiceId: 'fNYuJl2dBlX9V7NxmjnV', label: 'UK-Male' },
}

// ---------------------------------------------------------------------------
//  Objective ladder content (every item tagged with its CEFR level)
// ---------------------------------------------------------------------------
// 4-option single choice; `a` = index of the correct option.
// `expl` / `expl_ja` are revealed only in the post-test review.
const VOCAB = [
  { cefr: 'A1', q: 'I ___ breakfast at seven o’clock every morning.', opts: ['eat', 'go', 'play', 'read'], a: 0,
    expl: 'You eat breakfast. Go, play and read don’t take "breakfast" as an object.',
    expl_ja: 'breakfastを目的語に取れる動詞はeatだけです。go/play/readは使えません。' },
  { cefr: 'A1', q: 'My sister is two years ___ than me.', opts: ['young', 'younger', 'youngest', 'more young'], a: 1,
    expl: 'With "than" we use the comparative form: younger. Short adjectives take -er, so "more young" is wrong.',
    expl_ja: 'thanと一緒に使うのは比較級のyounger。短い形容詞は-erを付けるのでmore youngとは言いません。' },
  { cefr: 'A2', q: 'The train was late, so we ___ the start of the film.', opts: ['lost', 'missed', 'failed', 'dropped'], a: 1,
    expl: 'To miss something = to be too late for it. You can’t lose, fail or drop "the start of a film".',
    expl_ja: '「間に合わなかった」はmiss。lose/fail/dropはこの意味では使えません。' },
  { cefr: 'A2', q: 'It’s raining — don’t forget your ___.', opts: ['umbrella', 'wallet', 'scissors', 'ladder'], a: 0,
    expl: 'The rain is the clue: an umbrella is the only item connected to it.',
    expl_ja: '雨がヒントです。雨と関係のある持ち物はumbrellaだけです。' },
  { cefr: 'B1', q: 'I’ve stopped eating out because I’m trying to ___ money for a trip to Australia.', opts: ['collect', 'save', 'keep', 'hold'], a: 1,
    expl: 'Spending less to build up money = save money. Collect means gathering money from other people.',
    expl_ja: '出費を減らしてお金を貯めるのはsave money。collectは人から集めるという意味です。' },
  { cefr: 'B1', q: 'The doctor gave me a ___ for some stronger medicine.', opts: ['recipe', 'receipt', 'prescription', 'subscription'], a: 2,
    expl: 'A doctor writes a prescription for medicine. A recipe is for cooking, a receipt is proof of payment, and a subscription is a regular paid service.',
    expl_ja: '医師が薬のために書くのはprescription（処方箋）。recipeは料理のレシピ、receiptは領収書、subscriptionは定期購読です。' },
  { cefr: 'B2', q: 'The two reports reached entirely ___ conclusions: one recommended expanding the programme, the other shutting it down.', opts: ['contradictory', 'argumentative', 'disagreeable', 'unacceptable'], a: 0,
    expl: 'Expanding vs. shutting down are opposites, so the conclusions contradict each other. The other adjectives describe unpleasantness, not opposition.',
    expl_ja: '「拡大」と「閉鎖」は正反対なのでcontradictory（矛盾する）。他の選択肢には「対立する」という意味がありません。' },
  { cefr: 'C1', q: 'She was ___ unaware of the controversy her remarks would cause.', opts: ['blissfully', 'gracefully', 'plentifully', 'wishfully'], a: 0,
    expl: '"Blissfully unaware" is a fixed collocation meaning happily ignorant of something. The other adverbs don’t collocate with "unaware".',
    expl_ja: 'blissfully unawareは「幸せなことに全く気づいていない」という定型表現。他の副詞はunawareと結びつきません。' },
  { cefr: 'C1', q: 'The new evidence ___ the witness’s account of events.', opts: ['corroborates', 'reiterates', 'presumes', 'condones'], a: 0,
    expl: 'Evidence corroborates (confirms/supports) an account. It can’t reiterate (repeat), presume (assume), or condone (accept wrongdoing).',
    expl_ja: '証拠が証言を「裏付ける」のはcorroborate。reiterateは繰り返す、presumeは推定する、condoneは大目に見る、という意味です。' },
]

const GRAMMAR = [
  { cefr: 'A1', q: '___ you like coffee?', opts: ['Are', 'Do', 'Is', 'Have'], a: 1,
    expl: '"Like" is an ordinary verb, so questions are formed with do: "Do you like…?"',
    expl_ja: 'likeは一般動詞なので、疑問文はDoで作ります。' },
  { cefr: 'A1', q: 'There ___ two cats in the garden.', opts: ['is', 'are', 'be', 'has'], a: 1,
    expl: '"Two cats" is plural, so we say there are.',
    expl_ja: 'two catsは複数なのでthere areになります。' },
  { cefr: 'A2', q: 'I ___ to Osaka last weekend.', opts: ['go', 'goed', 'went', 'have gone'], a: 2,
    expl: '"Last weekend" is a finished past time, so we use the simple past went. The present perfect ("have gone") can’t be used with a finished time expression.',
    expl_ja: 'last weekendという過去の時点が明示されているので過去形went。have goneのような現在完了は使えません。' },
  { cefr: 'A2', q: 'She is taller ___ her brother.', opts: ['that', 'as', 'than', 'from'], a: 2,
    expl: 'Comparatives are followed by than: taller than.',
    expl_ja: '比較級の後はthanを使います。' },
  { cefr: 'B1', q: 'If it rains tomorrow, we ___ the picnic.', opts: ['would have cancelled', 'will cancel', 'would cancel', 'cancelled'], a: 1,
    expl: 'A real future condition uses the first conditional: if + present, will + verb. "Would have cancelled" is for unreal past situations.',
    expl_ja: '実現しうる未来の条件文は「if+現在形, will+動詞」。would have cancelledは過去の仮定に使います。' },
  { cefr: 'B1', q: 'I’ve lived in Tokyo ___ 2019.', opts: ['for', 'since', 'from', 'during'], a: 1,
    expl: 'With the present perfect, a starting point (2019) takes since; a length of time would take for ("for five years").',
    expl_ja: '現在完了で起点（2019年）を表すのはsince。期間の長さならfor（for five years）です。' },
  { cefr: 'B2', q: 'By the time we arrived, the film ___.', opts: ['has already started', 'had already started', 'is already starting', 'will already have started'], a: 1,
    expl: 'An action completed before another past action ("we arrived") takes the past perfect: had already started.',
    expl_ja: '過去の出来事（到着）よりさらに前に完了した出来事は過去完了（had already started）で表します。' },
  { cefr: 'C1', q: '___ had she finished speaking when the phone rang.', opts: ['Hardly', 'Rarely', 'Seldom', 'Never'], a: 0,
    expl: '"Hardly had … when …" is a fixed inverted pattern meaning "as soon as". Rarely/seldom/never don’t pair with "when" like this.',
    expl_ja: 'Hardly had ... when ...で「〜するかしないかのうちに」という倒置の定型表現。他の副詞はwhenとこの形で使えません。' },
  { cefr: 'C1', q: 'Only after the report was published ___ the full scale of the problem.', opts: ['did we realise', 'we realised', 'we did realise', 'had we realised'], a: 0,
    expl: 'When "Only after…" starts the sentence, subject and auxiliary invert: did we realise. "Had we realised" would put the realising before the publishing, contradicting "only after".',
    expl_ja: 'Only after...が文頭に来ると倒置が起こり、did we realiseの語順になります。had we realisedでは時間関係が逆になってしまいます。' },
]

const READING = [
  {
    title: 'Notice',
    passage:
      'RIVERSIDE SPORTS CENTRE\n\nThe swimming pool will be closed on Monday 12 May for cleaning. The gym and tennis courts will stay open as usual. Pool members can use the pool at Eastgate Leisure Centre for free on that day. We are sorry for any inconvenience.',
    questions: [
      { cefr: 'A2', q: 'Why will the pool be closed on 12 May?', opts: ['For cleaning', 'For repairs', 'For a competition', 'For a holiday'], a: 0,
        expl: 'The notice says the pool will be closed "for cleaning". Repairs, competitions and holidays are not mentioned.',
        expl_ja: '掲示にfor cleaning（清掃のため）と明記されています。他の理由は書かれていません。' },
      { cefr: 'A2', q: 'What can pool members do on that day?', opts: ['Use the gym for free', 'Swim at Eastgate for free', 'Get their money back', 'Book a tennis court for free'], a: 1,
        expl: 'The notice says pool members "can use the pool at Eastgate Leisure Centre for free". The gym stays open, but nothing says it is free.',
        expl_ja: 'Eastgateのプールを無料で使えると書かれています。ジムは営業しますが「無料」とは書かれていません。' },
    ],
  },
  {
    title: 'Short article',
    passage:
      'A recent study of four hundred office workers found that those who took short, regular breaks completed tasks faster and made fewer mistakes than those who worked without stopping. Interestingly, the benefit disappeared when breaks were spent scrolling on a phone: only breaks involving movement or a change of scenery improved performance. The researchers suggest that what matters is not simply pausing work, but giving the brain genuinely different input.',
    questions: [
      { cefr: 'B1', q: 'What did the study find about workers who took regular breaks?', opts: ['They worked faster and more accurately', 'They worked more slowly but more accurately', 'They made more mistakes', 'They finished fewer tasks'], a: 0,
        expl: 'The text says they "completed tasks faster and made fewer mistakes" — faster AND more accurate.',
        expl_ja: '本文に「より速く作業を終え、ミスも少なかった」とあります。速さと正確さの両方です。' },
      { cefr: 'B2', q: 'According to the passage, why did phone breaks not help?', opts: ['Phones tired the workers’ eyes', 'They did not give the brain genuinely different input', 'They lasted too long', 'Workers forgot what they were doing'], a: 1,
        expl: 'The researchers say what matters is "giving the brain genuinely different input" — scrolling a phone doesn’t provide that. Eyes, break length and forgetting are never mentioned.',
        expl_ja: '重要なのは「脳にまったく別の刺激を与えること」で、スマホを見る休憩はそれを与えないためです。目の疲れ等は本文にありません。' },
      { cefr: 'B2', q: 'Which statement best summarises the researchers’ conclusion?', opts: ['Any pause in work improves performance', 'Breaks should be banned during busy periods', 'The type of break matters more than simply pausing', 'Phones should be kept out of offices'], a: 2,
        expl: 'The conclusion is "not simply pausing work, but giving the brain genuinely different input" — i.e. the kind of break is what matters. Option A is directly contradicted.',
        expl_ja: '結論は「ただ休むことではなく、休み方（質）が重要」ということです。Aは本文と矛盾します。' },
    ],
  },
]

// Listening: short clips, each its own group (audio plays from the stimulus pane).
const LISTENING = [
  {
    key: 'l1',
    lines: [{ v: 'usf', text: 'Good morning! Can I have a cheese sandwich and an orange juice, please?', gap: 0.2 }],
    questions: [
      { cefr: 'A1', q: 'What does the woman order?', opts: ['A cheese sandwich and an orange juice', 'A salad and a coffee', 'A cheese sandwich and a coffee', 'An egg sandwich and an orange juice'], a: 0,
        expl: 'She asks for "a cheese sandwich and an orange juice" — both parts must match.',
        expl_ja: '「a cheese sandwich and an orange juice」と注文しています。両方が一致する選択肢を選びます。' },
    ],
  },
  {
    key: 'l2',
    lines: [
      { v: 'usm', text: 'Are we still meeting at three?', gap: 0.4 },
      { v: 'ukf', text: 'Could we make it half past four instead? My dentist appointment was moved.', gap: 0.4 },
      { v: 'usm', text: 'No problem. See you then.', gap: 0.2 },
    ],
    questions: [
      { cefr: 'A2', q: 'What time will they meet?', opts: ['3:00', '3:30', '4:00', '4:30'], a: 3,
        expl: 'The woman asks to change the time to "half past four" (4:30) and the man agrees ("See you then"). 3:00 was the original plan, not the final one.',
        expl_ja: '女性がhalf past four（4時半）への変更を提案し、男性が了承しています。3時は元の予定です。' },
    ],
  },
  {
    key: 'l3',
    lines: [
      { v: 'ukf', text: "Hi Tom, it's Ayaka. About Saturday — the forecast says heavy rain, so instead of the barbecue, let's meet at my place and cook indoors. Could you still bring the drinks? Oh, and please tell Maria the start time hasn't changed — one o'clock, as planned.", gap: 0.2 },
    ],
    questions: [
      { cefr: 'B1', q: 'Why is Ayaka changing the plan?', opts: ['Heavy rain is forecast', 'The barbecue was cancelled by the park', 'Tom cannot come on Saturday', 'Her place is closer for everyone'], a: 0,
        expl: 'She says "the forecast says heavy rain, so instead of the barbecue let’s meet at my place". The other reasons are never mentioned.',
        expl_ja: '「大雨の予報なので、バーベキューの代わりに家で」と言っています。他の理由は出てきません。' },
      { cefr: 'B1', q: 'What should Tom tell Maria?', opts: ['The event starts at the same time', 'The event starts one hour later', 'The event has been cancelled', 'She should bring the drinks'], a: 0,
        expl: 'She says "tell Maria the start time hasn’t changed — one o’clock, as planned". The drinks are Tom’s job, and the event is moved indoors, not cancelled.',
        expl_ja: '「開始時刻は変わらないとMariaに伝えて」と頼んでいます。飲み物はTomの担当で、イベントは中止ではなく場所の変更です。' },
    ],
  },
  {
    key: 'l4',
    lines: [
      { v: 'ukm', text: "People often assume that working from home means working less. In my experience, the opposite is true. Without a commute to separate work from private life, many people find it harder to switch off, answering emails late into the evening. The real challenge of remote work isn't laziness — it's learning where to draw the line.", gap: 0.2 },
    ],
    questions: [
      { cefr: 'B2', q: 'What is the speaker’s main point about remote workers?', opts: ['They often struggle to stop working', 'They are usually less productive', 'They answer fewer emails', 'They need longer commutes'], a: 0,
        expl: 'He says it’s "harder to switch off" and the real challenge is "learning where to draw the line" — i.e. stopping work. He argues remote workers work MORE, not less.',
        expl_ja: '「仕事を切り上げるのが難しい」「線引きを学ぶことが課題」と述べています。在宅勤務者はむしろ働きすぎる、という主張です。' },
      { cefr: 'B2', q: 'The speaker believes the common assumption about working from home is…', opts: ['mistaken', 'accurate', 'unfashionable', 'impossible to test'], a: 0,
        expl: 'People assume remote work means working less, but he says "the opposite is true" — so the assumption is mistaken.',
        expl_ja: '「実際はその逆だ」と言っているので、世間の思い込みは誤り（mistaken）です。' },
    ],
  },
  {
    key: 'l5',
    lines: [
      { v: 'ukf', text: "The committee's report stops short of recommending an outright ban on short-haul flights, noting instead that, in its words, 'demand-side measures remain underexplored'. Reading between the lines, the authors appear less interested in prohibition than in making the alternatives — rail above all — so cheap and so frequent that the question of flying largely answers itself.", gap: 0.2 },
    ],
    questions: [
      { cefr: 'C1', q: 'What approach do the report’s authors appear to favour?', opts: ['Making alternatives such as rail more attractive', 'An immediate ban on short-haul flights', 'Raising the price of rail travel', 'Flying more frequently on short routes'], a: 0,
        expl: 'The report "stops short of recommending an outright ban" and favours making rail "so cheap and so frequent that the question of flying largely answers itself" — improving the alternatives rather than prohibition.',
        expl_ja: '「全面禁止までは求めず」、鉄道を「安く便利にして自然に飛行機離れを促す」立場です。禁止ではなく代替手段の魅力向上を支持しています。' },
    ],
  },
]

const WRITING_PROMPT =
  'Write about your favourite place (4–8 sentences in English).\nInclude: where it is, what you do there, and why you like it.\nIf you can, also explain how you would feel if it changed or disappeared.'

const SPEAKING = [
  { prompt: 'Tell me about your typical day. Speak for about 30 seconds.', speak: 30 },
  { prompt: 'Some people think children should start learning English as early as possible. What do you think, and why? Speak for about 45 seconds.', speak: 45 },
]

// ---------------------------------------------------------------------------
//  Plumbing (same as the other seed scripts)
// ---------------------------------------------------------------------------
function requireEnv() {
  const missing = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY')
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '))
    console.error('Run with:  node --env-file=.env.local scripts/seed-cefr.mjs')
    process.exit(1)
  }
}

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: ELEVENLABS_MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg'
}
let ffmpegWarned = false

function joinSegments(segments) {
  if (segments.length === 1 && !segments[0].gapAfter) return segments[0].buffer
  const dir = mkdtempSync(join(tmpdir(), 'cefr-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`)
      writeFileSync(p, seg.buffer)
      inputs.push('-i', p)
      filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter ?? 0.2}[a${i}]`)
      labels.push(`[a${i}]`)
    })
    const outPath = join(dir, 'out.mp3')
    const filterComplex = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const res = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', filterComplex, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', outPath], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (res.error || res.status !== 0) throw new Error(res.error?.message || res.stderr?.toString().slice(-200) || 'ffmpeg failed')
    return readFileSync(outPath)
  } catch (err) {
    if (!ffmpegWarned) { console.warn(`\n  ! ffmpeg unavailable (${err.message}); joining without gaps.`); ffmpegWarned = true }
    return Buffer.concat(segments.map(s => s.buffer))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function insertOne(supabase, table, row) {
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table} insert: ${error.message}`)
  return data.id
}

async function insertChoice(supabase, groupId, orderIndex, item) {
  const qid = await insertOne(supabase, 'questions', {
    group_id: groupId, order_index: orderIndex, question_type: 'single_choice', scoring_method: 'auto_choice',
    prompt: item.q,
    // explanation / explanation_ja are answer-revealing -> stripped from the
    // client during the test, shown in the post-scoring review.
    payload: { cefr: item.cefr, explanation: item.expl ?? '', explanation_ja: item.expl_ja ?? '' },
    max_score: 1,
  })
  const { error } = await supabase.from('question_options').insert(
    item.opts.map((content, idx) => ({
      question_id: qid, order_index: idx, label: String.fromCharCode(65 + idx), content, is_correct: idx === item.a,
    }))
  )
  if (error) throw new Error(`options: ${error.message}`)
}

async function cleanup(supabase) {
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).maybeSingle()
  const { data: files } = await supabase.storage.from(BUCKET).list(AUDIO_DIR, { limit: 100 })
  if (files?.length) await supabase.storage.from(BUCKET).remove(files.map(f => `${AUDIO_DIR}/${f.name}`)).catch(() => {})
  await supabase.from('assets').delete().like('storage_path', `${AUDIO_DIR}/%`)
  if (form) { console.log('Existing form found — refreshing.'); await supabase.from('test_forms').delete().eq('id', form.id) }
}

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: track } = await supabase.from('exam_tracks').select('id').eq('slug', 'cefr-check').single()
  if (!track) throw new Error('Track cefr-check not found — run supabase/seed-cefr.sql first.')
  const { data: wRubric } = await supabase.from('rubrics').select('id').eq('track_id', track.id).eq('name', 'CEFR Writing Level').maybeSingle()
  const { data: sRubric } = await supabase.from('rubrics').select('id').eq('track_id', track.id).eq('name', 'CEFR Speaking Level').maybeSingle()
  if (!wRubric || !sRubric) throw new Error('CEFR rubrics not found — run supabase/seed-cefr.sql first.')

  await cleanup(supabase)

  // Self-paced (~20 min in practice): no countdown — friendlier for a level check.
  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'CEFR Level Check', title_ja: 'CEFR レベルチェック',
    // One-section "set": gets the mock card + preview screen on the tests page.
    set_slug: 'cefr-check', set_title: 'CEFR Level Check', set_title_ja: 'CEFR レベルチェック', set_order: 0,
    mode: 'full_mock', time_limit_seconds: null, published: true,
  })

  // ── 1. Vocabulary ──
  let sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'reading', part_label: 'Part 1', title: 'Vocabulary',
    instructions: 'Choose the word that best completes each sentence.', order_index: 0,
  })
  let grp = await insertOne(supabase, 'question_groups', { section_id: sec, order_index: 0, stimulus_type: 'none', prompt: '' })
  for (let i = 0; i < VOCAB.length; i++) await insertChoice(supabase, grp, i, VOCAB[i])

  // ── 2. Grammar ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'reading', part_label: 'Part 2', title: 'Grammar',
    instructions: 'Choose the option that best completes each sentence.', order_index: 1,
  })
  grp = await insertOne(supabase, 'question_groups', { section_id: sec, order_index: 0, stimulus_type: 'none', prompt: '' })
  for (let i = 0; i < GRAMMAR.length; i++) await insertChoice(supabase, grp, i, GRAMMAR[i])

  // ── 3. Reading ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'reading', part_label: 'Part 3', title: 'Reading',
    instructions: 'Read each text and answer the questions.', order_index: 2,
  })
  for (let g = 0; g < READING.length; g++) {
    const r = READING[g]
    grp = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: g, stimulus_type: 'passage', passage_text: r.passage, prompt: '',
    })
    for (let i = 0; i < r.questions.length; i++) await insertChoice(supabase, grp, i, r.questions[i])
  }

  // ── 4. Listening (TTS) ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 4', title: 'Listening',
    instructions: 'Listen to each recording and answer the questions. You can play each recording.', order_index: 3,
  })
  for (let g = 0; g < LISTENING.length; g++) {
    const clip = LISTENING[g]
    const segments = []
    for (const line of clip.lines) segments.push({ buffer: await tts(line.text, VOICES[line.v].voiceId), gapAfter: line.gap })
    const audio = joinSegments(segments)
    const path = `${AUDIO_DIR}/${clip.key}.mp3`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload ${path}: ${upErr.message}`)
    const transcript = clip.lines.map(l => `${VOICES[l.v].label}: ${l.text}`).join('\n')
    const assetId = await insertOne(supabase, 'assets', { type: 'audio', storage_path: path, transcript, alt_text: '' })
    grp = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: g, stimulus_type: 'audio', audio_asset_id: assetId, prompt: '',
    })
    for (let i = 0; i < clip.questions.length; i++) await insertChoice(supabase, grp, i, clip.questions[i])
    process.stdout.write(`\r  listening clip ${g + 1}/${LISTENING.length} done   `)
  }
  console.log('')

  // ── 5. Writing ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'writing', part_label: 'Part 5', title: 'Writing',
    instructions: 'Write your answer in English. Write as naturally as you can — the level of your language matters more than the length.', order_index: 4,
  })
  grp = await insertOne(supabase, 'question_groups', { section_id: sec, order_index: 0, stimulus_type: 'prompt', prompt: '' })
  await insertOne(supabase, 'questions', {
    group_id: grp, order_index: 0, question_type: 'essay', scoring_method: 'ai_rubric',
    prompt: WRITING_PROMPT, payload: {}, rubric_id: wRubric.id, max_score: 6,
  })

  // ── 6. Speaking ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'speaking', part_label: 'Part 6', title: 'Speaking',
    instructions: 'Record your answer to each question. Speak naturally — it does not need to be perfect.', order_index: 5,
  })
  grp = await insertOne(supabase, 'question_groups', { section_id: sec, order_index: 0, stimulus_type: 'prompt', prompt: '' })
  for (let i = 0; i < SPEAKING.length; i++) {
    await insertOne(supabase, 'questions', {
      group_id: grp, order_index: i, question_type: 'speaking_response', scoring_method: 'ai_rubric',
      prompt: SPEAKING[i].prompt, payload: { speak_seconds: SPEAKING[i].speak }, rubric_id: sRubric.id, max_score: 6,
    })
  }

  const nObjective = VOCAB.length + GRAMMAR.length + READING.reduce((s, r) => s + r.questions.length, 0) + LISTENING.reduce((s, c) => s + c.questions.length, 0)
  console.log(`✓ Seeded ${FORM_SLUG}: ${nObjective} ladder items (A1–C1) + 1 writing + ${SPEAKING.length} speaking.`)
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
