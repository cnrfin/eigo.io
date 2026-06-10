/**
 * Seed the EIKEN prep course (Brilliant-style, one level per grade).
 *
 *   Course 'eiken-prep' — 4 levels (Grade 3 / Pre-2 / Grade 2 / Pre-1), one
 *   per mock set. PILOT BUILD: only Level 2 (Pre-2) has lessons so far —
 *   6 lessons / ~57 screens. The other levels are seeded as empty skeletons
 *   and filled in later passes (G3 → G2 → Pre-1), per eiken-course-plan.md.
 *
 *   Teaches the TASK FORMATS of the EIKEN mocks with fresh, original
 *   examples — never the mock answers themselves. Exam-format facts follow
 *   the 2024 renewal as encoded in the mock seed headers (the source of
 *   truth): Pre-2 reading 大問1=15 vocab/idiom gaps, 大問2 dialogue
 *   completion, 大問3 passage gap-fill, 大問4A email / 4B expository;
 *   writing = e-mail reply 40–50 words (answers the friend's TWO questions)
 *   + opinion 50–60 words (2 reasons); listening 第1部 = spoken options A–C,
 *   第2部/第3部 = printed 4-option MCQ; speaking = read-aloud card +
 *   イラストA (5 people, 5 actions) + イラストB (problem/intention).
 *
 *   Audio: listening screens are seeded with content.transcript + an
 *   instruction prompt; scripts/add-course-eiken-audio.mjs voices them at
 *   the Pre-2 mock TEMPO (0.94) and attaches audio_asset_id. The player
 *   hides transcripts until the question is answered.
 *   Images: two speaking screens get illustrations later — see
 *   supabase/EIKEN-COURSE-IMAGES.md + scripts/attach-eiken-course-images.mjs.
 *   Screens work without them (the picture area is simply empty).
 *
 *   FREE LESSON: eiken-g3-vocab (the first lesson of the course, per the
 *   engine rule). Flagging each level's vocab lesson free instead is a
 *   per-lesson flag flip if marketing prefers it.
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY):
 *   node --env-file=.env.local scripts/seed-course-eiken.mjs
 * Re-running REFRESHES the course (deletes 'eiken-prep'; cascades clean up
 * levels, lessons, screens and progress — AND any attached course audio
 * links; re-run the audio script afterwards). All content is ORIGINAL.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ────────────────────────────────────────────────────────────────────────────
// Screen builders (same shapes as seed-course-toeic.mjs / the IELTS course)
// ────────────────────────────────────────────────────────────────────────────
/** Concept screen. Bodies are split on \n\n by the player. */
const con = (title_ja, title, body_ja, body, example) => ({
  type: 'concept',
  content: { title_ja, title, body_ja, body, ...(example ? { example } : {}) },
})

/** Single-choice question. Labels A/B/C(/D) derived from option count. */
const q = (prompt_ja, prompt, opts, correct, explanation_ja, explanation) => {
  if (correct < 0 || correct >= opts.length) throw new Error(`bad correct index for: ${String(prompt).slice(0, 40)}`)
  return {
    type: 'question',
    content: {
      question_type: 'single_choice',
      prompt,
      ...(prompt_ja ? { prompt_ja } : {}),
      options: opts.map((content, i) => ({ label: 'ABCD'[i], content, is_correct: i === correct })),
      explanation_ja,
      explanation,
    },
  }
}

/** Gap-fill question (checked case-insensitively, whitespace-normalised). */
const gap = (prompt_ja, prompt, accepted, explanation_ja, explanation) => ({
  type: 'question',
  content: {
    question_type: 'gap_fill',
    prompt,
    ...(prompt_ja ? { prompt_ja } : {}),
    accepted,
    explanation_ja,
    explanation,
  },
})

/** Drag-fill question: text contains ___ blanks; answer must be ⊆ chips. */
const drag = (prompt_ja, prompt, text, chips, answer, explanation_ja, explanation) => {
  for (const a of answer) if (!chips.includes(a)) throw new Error(`drag answer '${a}' not in chips`)
  if ((text.match(/___/g) ?? []).length !== answer.length) throw new Error(`drag blanks != answers for: ${text.slice(0, 40)}`)
  return {
    type: 'question',
    content: { question_type: 'drag_fill', prompt, ...(prompt_ja ? { prompt_ja } : {}), text, chips, answer, explanation_ja, explanation },
  }
}

/** Audio MCQ (第2部/第3部 style): printed options, spoken material in transcript. */
const qa = (prompt_ja, prompt, transcript, opts, correct, explanation_ja, explanation) => {
  const s = q(prompt_ja, prompt, opts, correct, explanation_ja, explanation)
  s.content.transcript = transcript
  return s
}

/** 第1部-style audio question: the three response options are SPOKEN, so the
 *  printed options are letter-only (no label key — the content IS the letter). */
const qa1 = (prompt_ja, transcript, correctLetter, explanation_ja, explanation) => {
  const idx = 'ABC'.indexOf(correctLetter)
  if (idx < 0) throw new Error(`bad 第1部 letter: ${correctLetter}`)
  return {
    type: 'question',
    content: {
      question_type: 'single_choice',
      prompt: 'Listen. The three responses A–C are spoken, not printed — choose the one that fits.',
      prompt_ja,
      options: ['A', 'B', 'C'].map((content, i) => ({ content, is_correct: i === idx })),
      transcript,
      explanation_ja,
      explanation,
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Course meta
// ────────────────────────────────────────────────────────────────────────────
const COURSE = {
  slug: 'eiken-prep',
  exam_slug: 'eiken',
  title: 'EIKEN Prep Course',
  title_ja: '英検対策コース',
  description: 'Master every task on the EIKEN mocks, grade by grade — from Grade 3 to Pre-1, one pattern at a time.',
  description_ja: '模試で出る英検の問題形式を、級ごとにひとつずつ攻略。3級から準1級まで、パターンを知ればスコアは伸びます。',
  published: false,
  order_index: 2,
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade Pre-2（準2級）
// ════════════════════════════════════════════════════════════════════════════

// ── Lesson 1 (FREE) 大問1：単語・熟語 ───────────────────────────────────────
const P2_VOCAB = [
  // 1. cold-open question
  q(
    'まずは1問。空所に入る語を選んでください。',
    'A: Are you free this weekend?\nB: Yes! I’m really looking (   ) to the summer festival.',
    ['forward', 'up', 'after', 'out'],
    0,
    'look forward to 〜（〜を楽しみにする）の forward が正解です。look up（調べる）、look after（世話をする）も実在する句動詞ですが、to the summer festival とつながるのは forward だけ。\n\n準2級の大問1は、こうした熟語・句動詞が大きな割合を占めます。「動詞＋前置詞」をかたまりで覚えているかが勝負です。',
    '“Look forward to” (be excited about) gives “forward.” “Look up” and “look after” are real phrasal verbs, but only “forward” connects to “to the summer festival.” 大問1 leans heavily on these verb + preposition chunks.',
  ),
  // 2. concept: 大問1の手順
  con(
    '大問1の手順：全文 → 空所の前後 → 種類',
    'The 大問1 routine: whole sentence → around the gap → word type',
    '準2級の大問1は短文の空所補充が15問。問われるのは大きく3種類です。\n\n①熟語・句動詞（look forward to ／ give up など）\n②単語の意味（同じ品詞の4語から、文に合うものを選ぶ）\n③文法の形（比較・前置詞・語形など）\n\n手順はいつも同じ。まず全文を読んで場面をつかむ → 空所の直前・直後を見る → 「何の種類の問題か」を判定。熟語なら前置詞がヒント、語彙なら文全体のストーリーがヒントになります。\n\n1問にかける時間は20〜30秒が目安。わからなければ印をつけて先へ進みましょう。',
    '大問1 is 15 short gap-fills of three kinds: idioms/phrasal verbs, vocabulary (four words of the same class), and grammar forms. The routine never changes: read the whole sentence → look just before and after the gap → decide which kind it is. For idioms the preposition is the clue; for vocabulary it is the story of the sentence. Budget 20–30 seconds per item and move on.',
    '熟語 → 前置詞・相方の語がヒント\n語彙 → 文全体のストーリーがヒント\n文法 → 空所の前後の形がヒント',
  ),
  // 3. concept: 熟語はかたまり
  con(
    '熟語は「かたまり」で覚える',
    'Idioms are chunks, not words',
    '熟語・句動詞は、意味を単語ごとに考えても解けません。look ＝ 見る、forward ＝ 前へ……では「楽しみにする」にたどり着けませんよね。\n\nだから覚え方は1つ：かたまりごと、前置詞まで含めて覚える。\n\n・look forward to 〜ing（〜を楽しみにする）\n・take care of 〜（〜の世話をする）\n・give up 〜ing（〜をやめる・あきらめる）\n・be interested in 〜（〜に興味がある）\n・turn on ／ turn off（つける／消す）\n\n特に注意したいのは look forward to の後ろが動名詞（-ing）になること。to があるから動詞の原形……と思わせるワナが定番です。',
    'You cannot solve idiom items word by word — “look + forward” never adds up to “be excited about.” Memorise the whole chunk, preposition included: look forward to -ing, take care of, give up -ing, be interested in, turn on / turn off. Watch the classic trap: after “look forward to” comes a GERUND, not a base verb.',
    'look forward to seeing you（○ seeing ／ × see）\ntake care of my dog\ngive up eating snacks',
  ),
  // 4. practice: 句動詞
  q(
    '空所に入る語を選んでください。',
    'It was getting dark outside, so Mr. Hill (   ) on the lights in the living room.',
    ['got', 'turned', 'took', 'came'],
    1,
    'turn on（〜をつける）で turned が正解。「暗くなってきたので明かりをつけた」という流れです。\n\n空所の直後の on が最大のヒント。get on（乗る）、take on（引き受ける）もありますが、the lights（明かり）と組み合わせて自然なのは turn on だけです。',
    '“Turn on” (switch on) fits: it was getting dark, so he turned on the lights. The “on” after the gap is the big clue — “get on” and “take on” exist, but only “turn on” pairs naturally with “the lights.”',
  ),
  // 5. concept: 同じ品詞4つの語彙問題
  con(
    '語彙問題：4つとも文法的には入る',
    'Vocabulary items: all four fit the grammar',
    '語彙問題では、選択肢は同じ品詞の4語。つまり文法では絞れません。決め手は文全体のストーリーです。\n\nコツは、空所を「日本語の一言」で予想してから選択肢を見ること。\n\nKana wants to be a nurse, so she studies hard to pass the (   ).\n\n「看護学校に入るために合格したいもの」＝試験。そう予想してから選択肢を見れば、examination が一瞬で選べます。先に選択肢を見ると、4つの単語に引っ張られて迷いが生まれます。\n\n知らない単語が2つあっても大丈夫。知っている単語で文が自然になるなら、それが答えです。',
    'In vocabulary items all four options are the same part of speech, so grammar cannot help — the sentence’s story decides. Predict the gap in your own words BEFORE looking at the options (“she wants to pass the… exam”), then match. If two options are unknown, don’t panic: if a word you know makes the sentence natural, choose it.',
  ),
  // 6. practice: 語彙（名詞）
  q(
    '空所に入る語を選んでください。',
    'Kana wants to be a nurse, so she is studying hard to pass the (   ) for nursing school.',
    ['ceremony', 'performance', 'examination', 'invitation'],
    2,
    '「看護学校に入るために合格するもの」＝試験なので examination が正解。\n\nceremony（式典）、performance（公演）、invitation（招待）は、どれも pass（合格する）と組み合わせると不自然です。空所を予想してから選択肢を見る手順、効いたでしょうか。',
    'What does she need to pass to enter nursing school? An examination. “Ceremony,” “performance,” and “invitation” all clash with “pass.” Predicting the gap first makes this instant.',
  ),
  // 7. practice: 語彙（動詞）
  q(
    '空所に入る語を選んでください。',
    'My grandmother (   ) me a warm sweater for my birthday last year.',
    ['built', 'painted', 'baked', 'knitted'],
    3,
    'セーターを「編んでくれた」ので knitted が正解。built（建てた）、painted（塗った）、baked（焼いた）は sweater と合いません。\n\n4語とも過去形の動詞＝文法では絞れない語彙問題です。決め手は a warm sweater という目的語との相性でした。',
    'You knit a sweater — “knitted.” “Built,” “painted,” and “baked” don’t pair with a sweater. All four are past-tense verbs, so the object “a warm sweater” is what decides.',
  ),
  // 8. practice: 文法（比較の強調）
  q(
    '空所に入る語を選んでください。',
    'Emi practiced every day, and now her tennis is (   ) better than last year.',
    ['very', 'much', 'many', 'more'],
    1,
    '比較級 better を強めるのは much。「去年よりずっと上手」という意味になります。\n\nvery は原級（very good）には使えますが、比較級には使えません。very better と言えないのは、準2級の文法問題の定番ポイントです。',
    'To strengthen a comparative like “better,” use “much” — much better. “Very” works with plain adjectives (very good) but never with comparatives: “very better” is the classic 大問1 trap.',
  ),
  // 9. practice: 熟語の産出（gap）
  gap(
    '空所に入る1語を入力してください。',
    'Last weekend, I took (   ) of my grandparents’ dog while they were away.',
    ['care'],
    'take care of 〜（〜の世話をする）の care が正解です。\n\n選ぶだけでなく、自分で書けるようになると、ライティングや面接でもそのまま使えます。熟語は「読める」から「使える」へ。',
    '“Take care of” — care. Producing the chunk yourself (not just recognising it) means you can reuse it in the writing and the interview.',
  ),
]

// ── Lesson 2 読解：会話文・空所・長文 ───────────────────────────────────────
const P2_READING = [
  // 1. cold-open: 会話文完成
  q(
    'まずは1問。会話の空所に入るものを選んでください。',
    'A: I heard you joined the volleyball team. How is it going?\nB: (    )\nA: Don’t worry. You’ll get better soon.',
    [
      'I’ve already become the best player on the team.',
      'Actually, it’s hard to keep up with the other members.',
      'I’m thinking about joining the art club instead.',
    ],
    1,
    '空所の後ろに注目。「心配しないで、すぐ上手くなるよ」と励ましているので、空所には「ついていくのが大変」という弱音が入ります。(B)が正解。\n\n(A)の「もう一番上手い」なら励ましは不自然、(C)の「美術部に入ろうかな」なら Don’t worry はかみ合いません。会話文完成は、空所の前だけでなく後ろの返事が最大のヒントです。',
    'Look AFTER the gap: “Don’t worry. You’ll get better soon” is encouragement, so the gap must be a struggle — (B). If B were already the best player (A) or switching clubs (C), the reply wouldn’t connect. In dialogue completion, the line after the blank is the biggest clue.',
  ),
  // 2. concept: 会話文完成の鉄則
  con(
    '会話文完成：空所の「後ろ」が答えを決める',
    'Dialogue completion: the line AFTER the gap decides',
    '大問2は会話の空所補充が5問。選択肢はどれも自然な英文なので、「文として正しいか」では選べません。決め手はつながりです。\n\n鉄則は2つ。\n\n①空所の前の発言に「応答」しているか\n②空所の後ろの発言と「かみ合う」か\n\n特に②が強力です。出題者は、空所の後ろの返事が1つの選択肢としかかみ合わないように作っています。空所を見たら、まず後ろの発言を読む癖をつけましょう。\n\nまた、疑問文への返答なら「答えの種類」（時・場所・理由・Yes/No）が合っているかを確認します。',
    '大問2 gives five dialogue gaps. Every option is a natural sentence, so correctness can’t decide — CONNECTION does. Two rules: the gap must respond to the line before it, and it must mesh with the line after it. Rule ② is the stronger one: the writers design the following reply to fit exactly one option. Read after the gap first.',
    '空所の後ろが「Don’t worry」→ 空所は弱音\n空所の後ろが「That’s a good idea」→ 空所は提案\n空所の後ろが「Me too」→ 空所は好み・感想',
  ),
  // 3. concept: 大問3 長文の語句空所
  con(
    '長文の空所：前後の文をつなぐ言葉を選ぶ',
    'Passage gaps: choose what connects the sentences',
    '大問3は、長文の中に空所が置かれるタイプ。入るのは「つなぎ言葉」か「文脈に合うフレーズ」です。\n\n解き方は、空所のある文だけでなく、直前の文と直後の文を必ず読むこと。\n\nつなぎ言葉なら、前後の関係を判定します。\n\n・逆接（前と反対の流れ）→ However\n・具体例 → For example\n・言い換え → In other words\n・時間の流れ → At first ／ Finally\n\nフレーズ補充なら、段落全体の話題に合うものを選びます。1文だけ読んで決めると、もっともらしい誤答に引っかかります。',
    '大問3 puts gaps inside a passage; the answer is a connector or a phrase that fits the context. Always read the sentence BEFORE and AFTER the gap. For connectors, judge the relationship: contrast → However; illustration → For example; restatement → In other words; sequence → At first / Finally. For phrases, match the paragraph’s topic — one sentence alone will mislead you.',
  ),
  // 4. practice: つなぎ言葉
  q(
    '空所に入る語句を選んでください。',
    '【本文の一部】\nRiverside Park was closed for almost two years because of construction work. (    ), it reopened last month with a new playground and a small garden, and many families visit it every weekend.',
    ['However', 'For example', 'In other words', 'At first'],
    0,
    '前の文は「2年間閉まっていた」、後ろは「先月再開してにぎわっている」。流れが反対なので逆接の However が正解です。\n\nFor example（例えば）や In other words（言い換えると）は前の内容を発展させるときに使い、流れを反転させることはできません。前後の関係をまず判定——これが空所問題の核心です。',
    'Before: closed for two years. After: reopened and busy. The direction flips, so the contrast connector “However” fits. “For example” and “In other words” extend the previous idea — they can’t reverse it. Judge the relationship first.',
  ),
  // 5. practice: フレーズ補充
  q(
    '空所に入る語句を選んでください。',
    '【本文の一部】\nLast year, the city library started a club called “Book Friends” for people over 65. Members meet every Tuesday to talk about books they have read. Many members say the club has given them (    ).',
    [
      'a way to save money on books',
      'a reason to stay home more often',
      'a chance to make new friends',
      'a place to sell their old books',
    ],
    2,
    '段落の話題は「65歳以上の人が毎週集まって本について話すクラブ」。会員にとっての価値は人とのつながりなので、(C)「新しい友達を作る機会」が正解です。\n\n(A)(D)はお金や売買の話で本文にナシ、(B)は「集まる」クラブと逆向き。空所の文だけでなく段落全体の話題に合わせる——フレーズ補充の鉄則です。',
    'The paragraph is about over-65s meeting weekly to talk about books — the value is connection, so “a chance to make new friends.” Money (A, D) is never mentioned, and staying home (B) points the wrong way. Match the paragraph’s topic, not just the gapped sentence.',
  ),
  // 6. concept: 大問4 Eメールと説明文
  con(
    '大問4：設問の順番は本文の順番',
    '大問4: questions follow the text’s order',
    '大問4Aは Eメール、4Bは説明文。どちらも読み方は同じです。\n\n①先に設問を読む（何を探すか決めてから本文へ）\n②設問の順番は本文の順番。設問1の答えは前半、最後の設問の答えは後半にあります\n③正解の選択肢は、本文の言葉をそのまま使わず言い換えてあります。逆に、本文の単語をそのまま使った選択肢はワナのことが多い\n\nEメールではヘッダー（From / To / Subject）も情報です。誰が誰に、何の用件で書いたのかを最初の5秒でつかみましょう。',
    '大問4A is an e-mail, 4B an expository passage — same method for both. Read the questions first; trust that question order follows text order; and expect the correct option to PARAPHRASE the text while word-for-word echoes are usually traps. For e-mails, the header (From / To / Subject) tells you who is writing to whom about what — read it first.',
  ),
  // 7. practice: Eメール
  q(
    'Eメールを読んで、設問に答えてください。',
    '【Eメール】\nFrom: Lisa Carter\nTo: Mika Sato\nSubject: Cooking club\n\nHi Mika,\nThank you for telling me about the cooking club. I really wanted to join this month, but I hurt my arm playing basketball last week, so the doctor told me to rest for a while. I’m planning to join next month instead. Until then, could you send me the recipes from each meeting? I want to try them when I get better.\nYour friend,\nLisa\n\nQ: Why can’t Lisa join the cooking club this month?',
    [
      'She is busy with her homework.',
      'She moved to another town.',
      'She does not like cooking.',
      'She injured her arm.',
    ],
    3,
    '本文の I hurt my arm playing basketball が根拠。選択肢では injured her arm と言い換えられています。(D)が正解。\n\nhurt → injured のように、正解は本文と別の単語で書かれるのが大問4の基本。本文の単語そのままの選択肢を探すのではなく、意味で照合しましょう。',
    '“I hurt my arm playing basketball” is the evidence, paraphrased as “injured her arm” — (D). Correct options reword the text (hurt → injured); match meanings, not words.',
  ),
  // 8. practice: 説明文
  q(
    '本文を読んで、設問に答えてください。',
    '【本文の一部】\nIn 2019, a railway company in Kobe started a service called “Share Umbrella.” People can borrow an umbrella at one station and return it at any other station. At first, many umbrellas were never returned. The company then made a new rule: people who return umbrellas receive points they can use for shopping. After that, more than 90 percent of the umbrellas came back.\n\nQ: What happened after the company made the new rule?',
    [
      'Most of the umbrellas were returned.',
      'The service stopped at small stations.',
      'Umbrellas became more expensive to borrow.',
      'Fewer people used the service.',
    ],
    0,
    'After that, more than 90 percent of the umbrellas came back が根拠。more than 90 percent → most と言い換えた(A)が正解です。\n\n本文は「最初は返ってこなかった → ルール変更 → 返ってくるようになった」という時間の流れ。設問の after the new rule が、どの時点を聞いているかを正確につかみましょう。',
    '“More than 90 percent of the umbrellas came back” → “most were returned” (A). The passage is a before/after story; the question pins the AFTER. Track the timeline and match the paraphrase (90 percent → most).',
  ),
  // 9. recap
  con(
    'まとめ：つながりで解く読解',
    'Recap: reading is solved by connection',
    '・会話文完成は、空所の「後ろ」の返事が最大のヒント\n\n・長文の空所は、直前・直後の文を読んで関係を判定（逆接→However、例→For example）\n\n・フレーズ補充は段落全体の話題に合わせる\n\n・大問4は設問が本文の順番どおり。先に設問を読む\n\n・正解は言い換え、本文の単語そのままはワナを疑う\n\n次のレッスンは、ライティング。Eメール返信と意見文の型を手に入れます。',
    '• Dialogue gaps: the reply AFTER the blank is the biggest clue.\n\n• Passage gaps: read before and after; judge the relationship (contrast → However, illustration → For example).\n\n• Phrase gaps: match the paragraph’s topic.\n\n• 大問4: questions follow text order; read them first.\n\n• Correct answers paraphrase; word-for-word echoes are suspects.\n\nNext lesson: Writing — the e-mail reply and the opinion essay.',
  ),
]

// ── Lesson 3 ライティング：Eメールと意見文 ──────────────────────────────────
const P2_WRITING = [
  // 1. cold-open: 2つの質問に答えているか
  q(
    'まずは1問。友達のEメールに What sport do you like? と Do you play it with your friends? の2つの質問がありました。返信として最も適切なのはどれでしょう？',
    'Your friend asked: “What sport do you like?” and “Do you play it with your friends?”',
    [
      'I like tennis. It’s fun to watch professional matches on TV.',
      'I like tennis, and I usually play it with my friends on Saturdays.',
      'Playing sports is good for our health, so I try to exercise every day.',
    ],
    1,
    '友達のEメールには質問が必ず2つあり、両方に答えるのが採点の大前提です。(B)は「テニスが好き」＋「友達と土曜にプレーする」で両方に回答。\n\n(A)は1つ目にしか答えていません（友達とプレーするかは不明のまま）。(C)はどちらの質問にも正面から答えていません。書く前に「質問は2つ、答えも2つ」と確認する癖をつけましょう。',
    'The friend’s e-mail always contains TWO questions, and answering both is the first scoring requirement. (B) answers both (tennis + Saturdays with friends). (A) answers only the first; (C) answers neither directly. Before writing: find both questions, plan both answers.',
  ),
  // 2. concept: Eメール返信の型
  con(
    'Eメール返信：40〜50語、質問2つに必ず答える',
    'The e-mail reply: 40–50 words, both questions answered',
    '準2級ライティングの1問目は、友達のEメールへの返信。条件は40〜50語で、メールの中の質問2つに答えることです。\n\n型はこれだけ。\n\n①リアクション（Thank you for your e-mail. ／ That sounds fun!）\n②質問1への答え＋ひとこと\n③質問2への答え＋ひとこと\n④締め（I hope I can see you soon! など）\n\n「答え＋ひとこと」が語数調整のコツです。I like tennis. だけでは短すぎますが、I like tennis because I can play it with my friends. と理由を1つ足せば、自然に40語台に乗ります。',
    'Writing task 1 is a reply to a friend’s e-mail: 40–50 words, answering the friend’s TWO questions. The frame: ① a reaction (Thank you for your e-mail!) ② answer 1 + one extra sentence ③ answer 2 + one extra sentence ④ a friendly closing. “Answer + one extra” is how you control length: one added reason per answer lands you naturally in range.',
    '①リアクション → Thank you for your e-mail!\n②答え1＋ひとこと\n③答え2＋ひとこと\n④締め → I hope I can see you soon!',
  ),
  // 3. practice: 締めの一文
  q(
    '友達への返信メールの締めとして自然なのはどれでしょう？',
    'Choose the most natural closing for a reply to your friend.',
    ['To whom it may concern,', 'Yours faithfully,', 'See you at school tomorrow!'],
    2,
    '相手は友達なので、(C)のようなくだけた締めが自然です。\n\n(A)（ご担当者様）と(B)（敬具）はビジネスレターの表現で、友達へのメールに使うと不自然。英検のEメールは常に「友達への返信」なので、フォーマルな決まり文句は不要です。',
    'The reader is a friend, so the casual (C) fits. (A) and (B) are business-letter formulas — out of place in EIKEN’s e-mail task, which is always a reply to a friend.',
  ),
  // 4. concept: 意見文の型
  con(
    '意見文：50〜60語、意見＋理由2つ',
    'The opinion essay: 50–60 words, opinion + two reasons',
    '2問目は意見文。質問（QUESTION）に対して、50〜60語で自分の意見と理由を2つ書きます。\n\nテンプレートはこの形。\n\nI think (that) 〜. ← 意見\nI have two reasons. ← 予告\nFirst, 〜. ← 理由1＋ひとこと\nSecond, 〜. ← 理由2＋ひとこと\nThat is why I think 〜. ← 締め（意見の再確認）\n\n理由は「意見を支える」ものを。質問が Do you think students should eat breakfast every day? なら、Yes の理由は「朝のエネルギーになる」「授業に集中できる」など。好き嫌いや無関係な事実は理由になりません。\n\nこの型なら、理由それぞれに1文足すだけで自然に50語台に届きます。',
    'Task 2 is an opinion essay: 50–60 words answering the printed QUESTION with your opinion and two reasons. Template: I think (that)… / I have two reasons. / First,… / Second,… / That is why I think…. Reasons must SUPPORT the opinion — personal likes or unrelated facts don’t count. One extra sentence per reason carries you into range.',
    'I think 〜. → I have two reasons.\n→ First, 〜. → Second, 〜.\n→ That is why I think 〜.',
  ),
  // 5. practice: 型の組み立て（drag）
  drag(
    '意見文の骨格を完成させてください。',
    'QUESTION: Do you think students should eat breakfast every day?',
    '___ that students should eat breakfast every day. I have two ___. First, breakfast gives them energy for the morning. ___, they can concentrate better in class. ___ I think students should eat breakfast every day.',
    ['I think', 'reasons', 'Second', 'That is why', 'However', 'For example'],
    ['I think', 'reasons', 'Second', 'That is why'],
    '意見 → 予告 → First → Second → 締め、の順です。However（逆接）は意見文の骨格には不要、For example は理由の中で具体例を足すときに使います。\n\nこの5文の骨格を暗記すれば、本番ではテーマに合わせて中身を入れ替えるだけです。',
    'Opinion → preview → First → Second → closing. “However” has no place in this skeleton, and “For example” belongs inside a reason, not between them. Memorise the frame; on test day you only swap the content.',
  ),
  // 6. practice: 理由の質
  q(
    'QUESTION: Do you think it is better to study at the library than at home? — Yes の立場で、意見を最も強く支える理由はどれでしょう？',
    'You answered YES. Which reason supports your opinion best?',
    [
      'The library is quiet, so it is easy to concentrate on studying.',
      'I sometimes watch TV when I study at home.',
      'The library is a building that has many kinds of books.',
    ],
    0,
    '(A)は「静か→集中できる」と、図書館で勉強する利点を直接説明しています。これが理由の役割です。\n\n(B)は自分の習慣の告白で、「図書館の方が良い」ことの説明になりきれていません。(C)は図書館の説明という単なる事実で、勉強に良い理由とつながっていません。理由は「意見とつながっているか」で選びましょう。',
    '(A) directly explains why the library is better for studying (quiet → concentration). (B) is a confession about your habits, not an argument; (C) is a fact about libraries with no link to studying. A reason must CONNECT to the opinion.',
  ),
  // 7. concept: 減点ポイント
  con(
    '減点ポイント：語数・質問無視・話題ずれ',
    'Where points are lost: length, ignored questions, off-topic',
    'ライティングで点を落とす原因は、英語の難しさよりも条件違反がほとんどです。\n\n・語数オーバー／不足（Eメール40〜50語、意見文50〜60語。書いたら数える）\n・Eメールで質問の片方に答えていない\n・意見文で理由が1つしかない、または意見と関係ない理由\n・QUESTIONと違う話題について書く\n\n難しい単語や複雑な文法は要求されていません。この級で勝つのは、正しい型＋確実な英語＋条件の遵守です。',
    'Most lost points come from broken conditions, not weak English: word counts out of range (e-mail 40–50, opinion 50–60 — count after writing), one of the two questions ignored, only one reason (or an unrelated one), or drifting off the QUESTION’s topic. Difficult vocabulary is not required; the winning formula is the template + accurate simple English + conditions met.',
  ),
  // 8. practice: 何が問題？
  q(
    '友達の質問は2つ：When does your school festival start? と Can I bring my sister? この返信の最大の問題点はどれでしょう？\n\n“Thank you for your e-mail! Our school festival starts at nine in the morning. There will be food, games, and a music show. I am going to sing with my band. I hope you can come!”',
    'What is the biggest problem with this reply?',
    [
      'It is too long for the word limit.',
      'It uses vocabulary that is too difficult.',
      'It never answers whether the friend can bring her sister.',
    ],
    2,
    '2つ目の質問 Can I bring my sister? への答えがどこにもありません。(C)が正解。内容が良くても、質問の片方を無視すると大きく減点されます。\n\n語数は適正範囲で(A)は誤り、語彙も平易なので(B)も誤り。書き終えたら「質問2つに答えたか」を必ず見直しましょう。',
    'The reply never answers “Can I bring my sister?” — (C). However nice the content, ignoring one of the two questions costs heavily. Length and vocabulary are fine here. Final check, always: did I answer BOTH questions?',
  ),
  // 9. practice: テンプレ産出（gap）
  gap(
    '意見文の締めの1語を入力してください。',
    'First, trains are almost always on time. Second, they are safer than cars. That is (   ) I think more people should use trains.',
    ['why'],
    'That is why 〜（だから〜だと思う）の why が正解。意見文の締めの決まり文句です。\n\nFirst → Second と理由を並べたあと、That is why で最初の意見に戻って着地する。この流れごと覚えてしまいましょう。',
    '“That is WHY I think…” — the fixed closing of the opinion template. After First and Second, “That is why” loops back to your opinion and lands the essay.',
  ),
  // 10. recap
  con(
    'まとめ：型と条件を守れば勝てる',
    'Recap: the template plus the conditions',
    '・Eメール：40〜50語。質問2つに「答え＋ひとこと」で必ず両方答える\n\n・意見文：50〜60語。I think → I have two reasons → First → Second → That is why\n\n・理由は意見を支えるものだけ。事実の羅列や好みの告白は理由にならない\n\n・書き終えたら：語数を数える → 質問2つ確認 → 話題ずれ確認\n\n次のレッスンは、リスニング第1部〜第3部。音声だけの選択肢に慣れます。',
    '• E-mail: 40–50 words; both questions answered with “answer + one extra sentence.”\n\n• Opinion: 50–60 words; I think → two reasons → First → Second → That is why.\n\n• Reasons must support the opinion — facts and preferences alone don’t.\n\n• After writing: count words, confirm both questions, confirm the topic.\n\nNext lesson: Listening Parts 1–3 — including the spoken-options format.',
  ),
]

// ── Lesson 4 リスニング：第1部〜第3部 ───────────────────────────────────────
const P2_LISTENING = [
  // 1. concept: 第1部の形式
  con(
    '第1部：選択肢は印刷されない',
    '第1部: the options are spoken, not printed',
    '準2級リスニング第1部では、会話の最後の発言が消され、代わりに応答の選択肢A・B・Cが音声で読まれます。紙にはA・B・Cの文字しかありません。\n\nつまり、目で選択肢を比べることができない。頼れるのは耳と記憶だけです。\n\n戦略は2つ。\n\n①会話の最後の発言を頭の中で保持する（応答はその発言へのリアクション）\n②選択肢が読まれている間、「つながるか？」だけを判定する。Aを聞いた瞬間に○か×を決め、迷ったら保留して次へ\n\n読解の大問2と同じ「つながり」の問題を、目ではなく耳で解く——そう考えれば怖くありません。',
    'In 第1部 the last line of a conversation is replaced by three SPOKEN responses, A–C; the paper shows only the letters. You cannot compare options by eye — only ear and memory. Two moves: hold the conversation’s final line in your head (the response reacts to it), and judge each option the instant you hear it: connect or not? It is dialogue completion (大問2) solved by ear.',
  ),
  // 2. practice: 第1部
  qa1(
    'まずは1問。応答A〜Cは音声で読まれます。会話につながるものを選んでください。',
    'W: Excuse me, does this bus go to the city museum?\nM: Yes, but it takes about thirty minutes. The subway is much faster.\nW: (response)\nA. Yes, the museum was great.\nB. Then I’ll take the subway.\nC. I went there by bike yesterday.',
    'B',
    '男性は「バスは30分かかる、地下鉄の方がずっと速い」と教えてくれました。それを受けるのは(B)「じゃあ地下鉄に乗ります」。\n\n(A)は museum という単語を繰り返した音のワナで、過去の感想は場面に合いません。(C)も過去の話で、これから行こうとしている場面とかみ合いません。最後の発言「地下鉄が速い」を保持できたかが勝負でした。',
    'The man’s advice is “the subway is much faster,” so (B) “Then I’ll take the subway” connects. (A) echoes “museum” but reviews a past visit; (C) is also past. Holding the final line — subway is faster — wins this.',
  ),
  // 3. practice: 第1部
  qa1(
    '応答A〜Cは音声で読まれます。会話につながるものを選んでください。',
    'M: Mom, have you seen my soccer shoes? I can’t find them anywhere.\nW: Did you look under your bed?\nM: (response)\nA. Yes, but they weren’t there.\nB. No, I don’t play tennis.\nC. Thanks, they were delicious.',
    'A',
    '「ベッドの下は見た？」という質問への応答なので、(A)「見たけど、なかった」が正解。\n\n(B)はテニスの話で無関係、(C)は食べ物への返事です。第1部の誤答は、このように「別の場面なら自然な英文」で作られます。文として自然かではなく、この会話につながるかだけで判定しましょう。',
    '“Did you look under your bed?” → (A) “Yes, but they weren’t there.” (B) is about tennis, (C) answers a food comment. Wrong options are natural sentences for a DIFFERENT scene — judge connection, not naturalness.',
  ),
  // 4. concept: 第2部・第3部の先読み
  con(
    '第2部・第3部：選択肢から質問を予想する',
    '第2部・第3部: predict the question from the options',
    '第2部は会話、第3部は短いお知らせや説明文。どちらも最後に質問が音声で読まれ、紙には4つの選択肢が印刷されています。\n\n印刷されている＝先読みできる、ということ。音声が始まる前に選択肢を見ておけば、質問の種類が予想できます。\n\n・選択肢が全部「時刻」→ 時間が聞かれる\n・全部「場所」→ 場所が聞かれる\n・全部「行動」→ 誰かが何をする（した）かが聞かれる\n\n音声には複数の時刻・場所・品物が登場します。質問がどれを指すかを決めるので、「どれが何の数字か」をラベルごと聞き分けましょう。',
    '第2部 is a dialogue, 第3部 a short announcement or monologue; the question is spoken at the end but the four options are PRINTED — which means you can preview. All-times options → a when question; all-places → where; all-actions → what someone will do. The audio will mention several times/places/items; the question picks one, so track each number WITH its label.',
  ),
  // 5. practice: 第2部
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'M: Hi, Emma. Are you coming to band practice tomorrow?\nW: I want to, but I have a dentist appointment at four.\nM: We start at six, so you can come after your appointment, right?\nW: Oh, you’re right. I’ll be there!\nQuestion: What will Emma do tomorrow?',
    [
      'Cancel her dentist appointment.',
      'Skip band practice this week.',
      'Go to band practice after the dentist.',
      'Move the practice to four o’clock.',
    ],
    2,
    '最後の I’ll be there! が決め手。歯医者（4時）のあとに練習（6時開始）へ行けるとわかり、行くことにしました。(C)が正解。\n\n会話の前半だけ聞くと「歯医者があるから行けない」に聞こえます。結論は会話の最後で決まる——リスニングの大原則です。',
    'Her final “I’ll be there!” decides it: dentist at four, practice from six, so she attends after the appointment — (C). The first half sounds like she can’t come; conclusions live in the LAST lines.',
  ),
  // 6. practice: 第2部
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Welcome to Green Wheel Bicycle Shop. How can I help you?\nM: Hi. My brakes don’t work well. Can you fix them today?\nW: Let me see… we’re quite busy this morning, but it’ll be ready by five this afternoon.\nM: That’s fine. I’ll come back then.\nQuestion: When will the man get his bicycle back?',
    ['This morning.', 'At noon.', 'Tomorrow morning.', 'At five today.'],
    3,
    'it’ll be ready by five this afternoon ＋ 男性の I’ll come back then で、(D)「今日の5時」が正解。\n\nthis morning は「午前は忙しい（から無理）」という文脈で出てきた時間。聞こえた時刻がそのまま答えになるとは限りません。「何の時刻か」をラベルで聞き分けましょう。',
    '“Ready by five this afternoon” + “I’ll come back then” → (D). “This morning” was mentioned as the busy (impossible) time — a heard time is not automatically the answer; track what each time LABELS.',
  ),
  // 7. practice: 第3部
  qa(
    'お知らせと質問を聞いて、答えを選んでください。',
    'Listen to the announcement and the question.',
    'Attention, shoppers. Today is the first day of our summer sale. All T-shirts are twenty percent off, and all hats are half price. Also, if you spend over fifty dollars, you will receive a free shopping bag. The sale ends this Sunday.\nQuestion: Which items are half price today?',
    ['Hats.', 'T-shirts.', 'Shopping bags.', 'Summer dresses.'],
    0,
    'all hats are half price で(A)が正解。\n\nTシャツは20%オフ（半額ではない）、バッグは「50ドル以上で無料プレゼント」。1つのお知らせに割引が複数登場し、質問がどれか1つを指す——第3部の典型です。数字とラベルをセットで聞き取りましょう。',
    '“All hats are half price” — (A). T-shirts are 20% off (not half), bags are a free gift over $50. One announcement, several deals, one asked — note each number with its label.',
  ),
  // 8. practice: 第3部
  qa(
    'お知らせと質問を聞いて、答えを選んでください。',
    'Listen to the announcement and the question.',
    'Good morning, students. Here is some information about tomorrow’s field trip to the science museum. The bus will leave at eight thirty, so please arrive at school by eight fifteen. Don’t forget to bring your lunch and something to drink. You don’t need your textbooks, but you may bring a camera if you like.\nQuestion: What do the students need to bring tomorrow?',
    ['Their textbooks.', 'Lunch and a drink.', 'Their bus tickets.', 'A science report.'],
    1,
    'Don’t forget to bring your lunch and something to drink が根拠。(B)が正解です。\n\n教科書は You don’t NEED your textbooks と明確に否定され、カメラは「持ってきてもよい」（任意）。must / don’t need / may の聞き分けが第3部の頻出ポイントです。',
    '“Don’t forget to bring your lunch and something to drink” — (B). Textbooks are explicitly NOT needed and the camera is optional (“may”). Hearing the difference between must / don’t need / may is a 第3部 staple.',
  ),
  // 9. recap
  con(
    'まとめ：耳でつなぎ、ラベルで聞き分ける',
    'Recap: connect by ear, track by label',
    '・第1部は選択肢が音声のみ。最後の発言を保持し、聞いた瞬間に○×判定\n\n・誤答は「別の場面なら自然な英文」。つながりだけで選ぶ\n\n・第2部・第3部は選択肢が印刷されている＝先読みで質問を予想\n\n・結論は会話の最後で決まる。前半の「できない」に引っかからない\n\n・数字・時刻はラベルごと聞き取る（何の時刻？何の割引？）\n\n次のレッスンは、スピーキング。二次面接の流れとイラスト問題の型です。',
    '• 第1部: spoken options — hold the final line, judge each option instantly.\n\n• Wrong options are natural sentences for a different scene; connection decides.\n\n• 第2部/第3部: printed options = preview and predict the question.\n\n• Conclusions live in the last lines; don’t be caught by an early “can’t.”\n\n• Track every number WITH its label.\n\nNext lesson: Speaking — the interview flow and the two illustration tasks.',
  ),
]

// ── Lesson 5 スピーキング：面接の型 ─────────────────────────────────────────
// Screens 5 and 6 get illustrations attached later (イラストA / イラストB) —
// see supabase/EIKEN-COURSE-IMAGES.md. They read fine without the image.
const P2_SPEAKING = [
  // 1. concept: 面接の流れと音読
  con(
    '面接の流れと音読：止まらないことが最優先',
    'The interview flow — and reading aloud without stopping',
    '準2級の二次試験は面接です。流れは固定：入室とあいさつ → カードの黙読（20秒）→ 音読 → カードについての質問（No.1）→ イラストA・Bの問題 → あなた自身への質問。\n\n音読のコツは3つ。\n\n①意味のかたまりで区切る（Many people / use the internet / to learn English.）\n②知らない単語が出ても止まらない。それらしく読んで先へ進む\n③タイトルも読む。ゆっくり、はっきり、が早口より高評価\n\n面接では「アティチュード（積極的にコミュニケーションをとる態度）」も採点されます。沈黙がいちばんの敵。完璧な英語より、止まらない英語です。',
    'The Pre-2 interview is fixed: greetings → 20 seconds’ silent reading → read the card aloud → a question about the card (No.1) → the two illustration tasks → questions about you. Reading aloud: chunk by meaning, never stop at an unknown word (best-guess it and move on), and read the title too — slow and clear beats fast. Attitude is scored as well: silence is the enemy; unstopping English beats perfect English.',
  ),
  // 2. practice: 音読の態度
  q(
    '音読の途中で知らない単語が出てきました。最も良い対応はどれでしょう？',
    'You meet an unknown word while reading aloud. What is the best move?',
    [
      'Stop reading and wait for the examiner’s help.',
      'Read it with your best guess and keep going.',
      'Skip the whole sentence and start the next one.',
    ],
    1,
    '(B)が正解。発音が完璧でなくても、流れを止めずに読み切ることが評価されます。\n\n(A)の沈黙は音読でもアティチュードでも減点。(C)のように文ごと飛ばすと、読めている部分の点まで失います。「それらしく読んで前へ」が鉄則です。',
    '(B). An imperfect guess that keeps the flow beats stopping. Silence (A) costs both the reading and attitude scores; skipping a sentence (C) throws away credit for what you CAN read. Best-guess and move forward.',
  ),
  // 3. concept: No.1 パッセージの質問
  con(
    'No.1：答えはカードの中にある',
    'No.1: the answer is on the card',
    '音読のあとの No.1 は、カードの文章についての質問。Why 〜? か How 〜? の形が定番です。\n\n答えは必ずカードの中にあります。Why の場合は、本文の so や because の周辺を探しましょう。\n\nカード：Many people use reusable bags because they want to reduce plastic waste.\n質問：Why do many people use reusable bags?\n答え：Because they want to reduce plastic waste.\n\nコツは Because で文を始めて、主語を代名詞にすること。本文を頭から丸読みすると「質問に答えていない」印象になります。聞かれた部分だけを、Because 〜 で切り出しましょう。',
    'No.1 asks about the card’s passage, usually Why…? or How…?. The answer is always ON the card — for Why, hunt near “so” and “because.” Start your answer with “Because…” and pronoun-ise the subject. Reading the whole sentence from the top sounds like not answering; carve out just the asked part.',
    'カード: …because they want to reduce plastic waste.\n質問: Why …?\n答え: Because they want to reduce plastic waste.',
  ),
  // 4. practice: No.1 の答え方
  q(
    'カードの文：Many people use reusable bags because they want to reduce plastic waste. ／ 質問：Why do many people use reusable bags? — 最も良い答えはどれでしょう？',
    'Choose the best answer to the examiner’s question.',
    [
      'I think plastic bags are bad for the environment.',
      'Many people use reusable bags every day.',
      'Because they want to reduce plastic waste.',
    ],
    2,
    '(C)が正解。because の後ろの部分を、Because 〜 でそのまま切り出しています。\n\n(A)は自分の意見で、カードの内容を答えていません（No.1は意見を聞く問題ではありません）。(B)は質問の繰り返しで、Why に答えていません。',
    '(C) lifts exactly the “because” part of the card. (A) gives a personal opinion — No.1 is not an opinion question; (B) restates the question without answering Why.',
  ),
  // 5. concept+practice: イラストA（画像は後で添付）
  con(
    'イラストA：5人を現在進行形で describing',
    'Illustration A: five people, five -ing sentences',
    'イラストAには5人の人物が描かれ、全員が違う動作をしています。課題は「それぞれの人がしていることを描写してください」。\n\n使う文型は1つだけ：A man is 〜ing … ／ A woman is 〜ing …（現在進行形）。\n\n・A man is walking his dog.\n・A woman is reading a book.\n・A boy is riding a bicycle.\n\n1人につき1文、5文言えば完了です。complicated な文は不要。「主語＋is／are＋動詞ing＋少しの情報」を5回、リズムよく。\n\n動作の単語が出てこない人物は飛ばして、言える人物から描写してOKです。',
    'Illustration A shows five people doing five different actions; the task is one sentence per person, all in the present continuous: A man is walking his dog. A woman is reading a book. Five short sentences and you are done — subject + is/are + -ing + a little detail. If one action’s verb escapes you, skip that person and describe the ones you can.',
    'A man is walking his dog.\nA woman is reading a book.\nA boy is riding a bicycle.',
  ),
  // 6. practice: 進行形の産出
  gap(
    'イラストA練習：絵の中の少年は自転車に乗っています。空所に入る1語を入力してください。',
    'A boy is (   ) a bicycle in the park.',
    ['riding'],
    'ride → riding が正解。進行形は「is／are＋動詞ing」のセットです。\n\nride（乗る）、fly（あげる）、walk（散歩させる）など、イラストAの定番動詞は -ing 形でスラスラ出るように練習しておきましょう。',
    '“Riding.” Present continuous = is/are + -ing. Drill the Illustration-A staples (riding, flying, walking, reading, eating) until the -ing forms come automatically.',
  ),
  // 7. practice: イラストB（画像は後で添付）
  q(
    'イラストB練習：絵には、自動販売機の前で空っぽの財布を開いている少年が描かれています。この状況の説明として最も良いものはどれでしょう？',
    'Illustration B shows a boy at a vending machine holding an empty wallet. Which sentence describes the situation best?',
    [
      'He wants to buy a drink, but he doesn’t have any money.',
      'He is drinking juice with his friends.',
      'He is putting money into his wallet.',
    ],
    0,
    'イラストBは「問題」か「これからすること」が描かれます。答えの型は2つだけ：\n\n・He/She wants to 〜, but …（〜したいが、できない）\n・He/She is going to 〜（これから〜するところだ）\n\n空っぽの財布＋自動販売機＝「飲み物を買いたいがお金がない」。(A)が正解です。(B)(C)は絵の状況（困っている）と合いません。',
    'Illustration B always shows a problem or an intention, and two frames cover it: “wants to ~, but …” or “is going to ~.” Empty wallet + vending machine = wants a drink but has no money — (A).',
  ),
  // 8. practice: イラストBの型（drag）
  drag(
    'イラストBの答えを組み立ててください。',
    'The picture: a boy at a vending machine with an empty wallet.',
    'The boy ___ to buy a drink, but he ___ have any money. So he ___ going to go home.',
    ['wants', 'doesn’t', 'is', 'has', 'wanting'],
    ['wants', 'doesn’t', 'is'],
    'wants to 〜（〜したい）、doesn’t have（持っていない）、is going to 〜（これから〜する）。イラストBはこの3つの形でほぼ完結します。\n\nwanting は進行形にできない動詞（want）のワナ、has は any money の前の否定文に合いません。',
    '“Wants to,” “doesn’t have,” “is going to” — Illustration B nearly always resolves into these three shapes. “Wanting” is the stative-verb trap, and “has” can’t sit in the negative “any money” sentence.',
  ),
  // 9. concept: あなた自身への質問
  con(
    '最後の質問：答え＋もう1文',
    'The personal questions: answer + one more sentence',
    '面接の最後は、あなた自身についての質問が2問。Do you like watching sports? のような身近な話題です。\n\n答え方の型は「答え＋もう1文」。\n\nYes, I do. I often watch baseball games with my father.\n\nYes ／ No だけで止まると、アティチュードの面でもったいない。理由・頻度・具体例のどれかを1文足しましょう。\n\nここは英語力テストというより会話のテストです。完璧な文法より、相手の目を見て、聞こえる声で、すぐに反応することが点になります。',
    'The interview ends with two questions about YOU — everyday topics like “Do you like watching sports?” The frame: answer + ONE more sentence (a reason, a frequency, or an example): “Yes, I do. I often watch baseball games with my father.” Stopping at yes/no wastes easy attitude points. This is a conversation test: eye contact, audible voice, quick response.',
    'Q: Do you like watching sports?\nA: Yes, I do. I often watch baseball games with my father.',
  ),
  // 10. recap
  con(
    'まとめ：止まらない、型で返す',
    'Recap: never stop, answer in frames',
    '・音読は意味のかたまりで、知らない単語も止まらず読む\n\n・No.1 の答えはカードの中。Because 〜 で切り出し、主語は代名詞に\n\n・イラストAは「主語＋is/are＋〜ing」を5回\n\n・イラストBは wants to 〜, but … か is going to 〜\n\n・自分への質問は「答え＋もう1文」。沈黙だけが敵\n\n次は総まとめレッスン。準2級レベル全体の腕試しです。',
    '• Read aloud in chunks; never stop at unknown words.\n\n• No.1: the answer is on the card — carve it out with “Because…”.\n\n• Illustration A: subject + is/are + -ing, five times.\n\n• Illustration B: “wants to ~, but …” or “is going to ~.”\n\n• Personal questions: answer + one more sentence. Silence is the only enemy.\n\nNext: the level review — everything in Pre-2, mixed.',
  ),
]

// ── Lesson 6 総まとめ：準2級 ────────────────────────────────────────────────
const P2_REVIEW = [
  // 1. intro
  con(
    '総まとめ：準2級の全パターン',
    'The Pre-2 review: every pattern, mixed',
    'このレベルで学んだことを、本番と同じようにシャッフルして確認します。\n\n・大問1：熟語はかたまり、語彙は文のストーリー\n・会話文完成：空所の「後ろ」がヒント\n・長文の空所：前後の文の関係で判定\n・Eメール：質問2つに必ず答える\n・リスニング：第1部は耳で判定、数字はラベルごと\n・面接：イラストは決まった文型で\n\n間違えても大丈夫。どのパターンだったかを確認すれば、それが本番の1点になります。',
    'Everything this level taught, shuffled like the real test: idiom chunks and story-driven vocabulary (大問1), the line after the gap (dialogue completion), before-and-after logic (passage gaps), both questions answered (the e-mail), connection by ear and labelled numbers (listening), and the fixed frames for the interview illustrations. Miss one? Identify the pattern — that is a point earned for test day.',
  ),
  // 2. vocab: 熟語
  q(
    '空所に入る語を選んでください。',
    'My sister gave (   ) eating snacks late at night because she wants to be healthier.',
    ['up', 'out', 'off', 'away'],
    0,
    'give up 〜ing（〜をやめる）の up が正解。「健康のために夜のお菓子をやめた」という流れです。\n\ngive out（配る）、give off（発する）、give away（手放す）もありますが、eating という動名詞が続いて意味が通るのは give up だけ。熟語はかたまり＋後ろの形まで含めて覚えましょう。',
    '“Give up -ing” (quit) — up. Give out / off / away exist, but only “give up” takes the gerund “eating” and makes sense. Chunks include what follows them.',
  ),
  // 3. vocab: 語彙
  q(
    '空所に入る語を選んでください。',
    'The movie was so (   ) that some people fell asleep in the theater.',
    ['exciting', 'famous', 'boring', 'careful'],
    2,
    'so 〜 that …（とても〜なので…）の構文。「眠ってしまうほど」なので boring（退屈な）が正解です。\n\nexciting なら眠りません。famous（有名）と careful（注意深い）は映画の説明として文脈に合いません。空所を予想してから選択肢——大問1の手順どおりに。',
    'So ~ that people fell asleep → “boring.” Exciting points the wrong way; famous and careful don’t fit the story. Predict before you look.',
  ),
  // 4. 会話文完成
  q(
    '会話の空所に入るものを選んでください。',
    'A: Have you decided what to give Grandma for her birthday?\nB: (    )\nA: That’s a good idea. She loves flowers.',
    [
      'I forgot her birthday last year.',
      'She gave me a nice present.',
      'How about some flowers from the garden shop?',
    ],
    2,
    '空所の後ろの That’s a good idea. She loves flowers. が決め手。「いい考え」と言われ、花が好きという反応が続くので、空所は花の提案(C)です。\n\n会話文完成の鉄則——空所の後ろを先に読む——を思い出せましたか。',
    'The reply “That’s a good idea. She loves flowers” locks it: the gap must propose flowers — (C). Rule: read AFTER the gap first.',
  ),
  // 5. 長文の空所
  q(
    '空所に入る語句を選んでください。',
    '【本文の一部】\nMr. Sato has grown tomatoes in his small garden for years. (    ), his tomatoes did not sell well at the farmers’ market because they looked a little strange. Then, last spring, a famous restaurant started using them in its salads, and now everyone wants to buy them.',
    ['Because of this', 'In other words', 'For example', 'At first'],
    3,
    '空所の後ろは「売れなかった」、その後 Then, last spring 〜 now と時間が流れて「人気になった」。物語の出だしを示す At first（最初は）が正解です。\n\nAt first は「最初は〜だった（が、あとで変わった）」のサイン。Then や now との時間の対比に気づけば一瞬で選べます。',
    '“At first” opens a timeline that “Then, last spring” and “now” continue: didn’t sell → became popular. The time contrast gives it away.',
  ),
  // 6. Eメールの条件
  q(
    '友達の質問は2つ：When does your school festival start? と Can I bring my sister? — 両方に答えている返信はどれでしょう？',
    'Which reply answers BOTH questions?',
    [
      'It starts at nine in the morning. I’m looking forward to seeing you!',
      'It starts at nine, and of course you can bring your sister!',
      'My school festival is the biggest event of the year.',
    ],
    1,
    '(B)は「9時開始」＋「妹を連れてきてOK」で両方に回答しています。\n\n(A)は1つ目だけ（妹の話が抜けています）、(C)はどちらにも答えていません。Eメールはまず質問を2つ見つけて、答えを2つ用意——でしたね。',
    '(B) answers both: starts at nine + sister welcome. (A) drops the sister question; (C) answers neither. Find two questions, plan two answers.',
  ),
  // 7. listening 第1部（audio）
  qa1(
    '応答A〜Cは音声で読まれます。会話につながるものを選んでください。',
    'M: I’m going to the library to study for the math test. Do you want to come?\nW: (response)\nA. Sure, let’s go together.\nB. I already ate lunch.\nC. The test was easy.\n',
    'A',
    '「図書館に勉強しに行くけど、一緒に来る？」という誘いへの応答なので、(A)「うん、一緒に行こう」が正解。\n\n(B)は食事の話で無関係。(C)は the test WAS easy と過去形——テストはこれからなので時制が合いません。誘い→受ける／断る、のつながりで判定します。',
    'An invitation (“Do you want to come?”) takes an accept/decline — (A). (B) is about lunch; (C) is past tense about a test that hasn’t happened. Connection decides.',
  ),
  // 8. listening 第3部（audio）
  qa(
    '天気予報と質問を聞いて、答えを選んでください。',
    'Listen to the weather report and the question.',
    'Here is the weather for this weekend. Saturday will be sunny and warm — a perfect day for going outside. On Sunday, however, it will rain all day, so don’t forget your umbrella if you have plans.\nQuestion: How will the weather be on Sunday?',
    ['Sunny.', 'Windy.', 'Cloudy.', 'Rainy.'],
    3,
    'On Sunday, however, it will rain all day で(D)が正解。\n\nSaturday の sunny につられないこと。曜日と天気をラベルごとセットで聞き取る——第3部の基本です。however（ところが）の後ろに答えが来るパターンも頻出です。',
    '“On Sunday, however, it will rain all day” — (D). Don’t take Saturday’s “sunny”; pair each day with its weather, and expect answers after “however.”',
  ),
  // 9. speaking: イラスト描写（gap）
  gap(
    'イラスト描写：絵の中の男性は公園で犬を散歩させています。空所に入る1語を入力してください。',
    'A man is (   ) his dog in the park.',
    ['walking'],
    'walk one’s dog（犬を散歩させる）の進行形で walking が正解。\n\nイラストAの型「主語＋is/are＋〜ing」、もう体に入りましたか。本番では5人ぶん、この調子で。',
    '“Walking” — walk one’s dog in the present continuous. The Illustration-A frame, one more time; on test day you’ll do it five times.',
  ),
  // 10. final recap
  con(
    'まとめ：準2級レベル修了',
    'Recap: the Pre-2 level, complete',
    '・大問1は手順（全文→前後→種類）と熟語のかたまり\n\n・読解は「つながり」。会話は後ろ、長文は前後の関係\n\n・ライティングは型＋条件（語数・質問2つ・話題）\n\n・リスニングは最後の発言と、ラベル付きの数字\n\n・面接は止まらないこと。イラストは決まった文型で\n\nこれで準2級レベルは修了です。学んだパターンを、準2級の模試で試しましょう。実際の試験と同じ形式・同じ時間配分で力を確認できます。',
    '• 大問1: the routine (whole sentence → around the gap → type) and idiom chunks.\n\n• Reading: connection — after the gap in dialogues, before-and-after in passages.\n\n• Writing: the templates plus the conditions (length, both questions, topic).\n\n• Listening: the final line, and numbers with their labels.\n\n• The interview: never stop; describe in fixed frames.\n\nThat completes the Pre-2 level. Put the patterns to work in the Pre-2 mock set — same format, same timing as the real exam.',
  ),
]



// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade 3（3級）
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade 3（3級）
// ════════════════════════════════════════════════════════════════════════════
// ── Lesson 1 大問1：単語・文法 ──────────────────────────────────────────────
const G3_VOCAB = [
  // 1. cold-open question
  q(
    'まずは1問。空所に入る語を選んでください。',
    'Aki loves animals, so she wants (   ) a vet in the future.',
    ['be', 'to be', 'being', 'been'],
    1,
    'want to 〜（〜したい）の形で to be が正解です。「動物が大好きなので、将来は獣医になりたい」という文ですね。\n\nwant の後ろは必ず「to＋動詞の原形」。3級の大問1は、こうした「形」で解ける文法問題がたくさん出ます。単語の意味を考える前に、まず空所の前の動詞をチェックする——これが3級の第一歩です。',
    '“Want TO be” — want always takes to + base verb: she wants to be a vet. Grade 3’s 大問1 is full of form questions like this; check the verb before the gap before you think about meaning.',
  ),
  // 2. concept: 大問1の手順
  con(
    '大問1の手順：全文 → 空所の前後 → 種類',
    'The 大問1 routine: whole sentence → around the gap → question type',
    '3級の大問1は短文の空所補充が15問。問われるのは大きく3種類です。\n\n①文法の形（want to ／ enjoy -ing、比較の -er、時間の前置詞など）\n②単語の意味（同じ品詞の4語から、文に合うものを選ぶ）\n③会話でよく使う表現\n\n3級は①の文法問題の割合が高いのが特徴。形のルールを知っていれば、意味がぜんぶわからなくても解けます。\n\n手順はいつも同じ。まず全文を読んで場面をつかむ → 空所の直前・直後を見る → 「何の種類の問題か」を判定。文法なら前後の形が、語彙なら文のストーリーが答えを教えてくれます。\n\n1問にかける時間は20〜30秒が目安。わからなければ印をつけて先へ進みましょう。',
    '大問1 is 15 short gap-fills of three kinds: grammar forms (want to / enjoy -ing, comparatives, time prepositions), vocabulary (four words of the same class), and common conversational phrases. At Grade 3 the grammar share is large — if you know the form rules, you can solve items without knowing every word. The routine never changes: whole sentence → just before and after the gap → decide the type. Budget 20–30 seconds per item and move on.',
    '文法 → 空所の前の動詞・後ろの形がヒント\n語彙 → 文全体のストーリーがヒント\n表現 → 会話の場面がヒント',
  ),
  // 3. concept: 動詞のあとの形
  con(
    '動詞のあとの形：to なのか -ing なのか',
    'After the verb: to + base verb, or -ing?',
    '3級の文法問題でいちばんよく出るのが、「動詞の後ろの形」です。\n\n後ろに to＋動詞の原形をとるグループ：\n・want to 〜（〜したい）\n・hope to 〜（〜することを望む）\n・decide to 〜（〜することに決める）\n\n後ろに動名詞（-ing）をとるグループ：\n・enjoy 〜ing（〜して楽しむ）\n・finish 〜ing（〜し終える）\n・stop 〜ing（〜するのをやめる）\n\n意味で考えても見分けられません。覚え方は1つ、動詞とセットで丸ごと覚えること。「enjoy は -ing」「want は to」と、ペアで口に出して練習しましょう。空所の前にこれらの動詞があったら、その瞬間に答えの形が決まります。',
    'The most common Grade 3 grammar item is the form AFTER the verb. To-group: want to, hope to, decide to. -Ing group: enjoy -ing, finish -ing, stop -ing. Meaning won’t tell you which is which — memorise each verb WITH its pattern. The moment you spot one of these verbs before the gap, the answer’s form is decided.',
    'want to play（○）／ want playing（×）\nenjoy playing（○）／ enjoy to play（×）\nfinish doing my homework',
  ),
  // 4. practice: -ing をとる動詞
  q(
    '空所に入る語を選んでください。',
    'My brother (   ) playing video games with his friends every weekend.',
    ['wants', 'hopes', 'enjoys', 'decides'],
    2,
    '空所の後ろが playing（-ing形）なので、-ing をとる enjoys が正解。「兄は毎週末、友達とゲームをして楽しむ」という文です。\n\nwant・hope・decide はどれも「to＋原形」をとる動詞なので、playing の前には置けません。後ろの形を見れば、意味を考えなくても一瞬で絞れる——これが文法問題の強みです。',
    'The gap is followed by “playing,” so the verb must take -ing: “enjoys.” Want, hope and decide all take to + base verb, so they can’t sit before “playing.” The form after the gap decides it instantly.',
  ),
  // 5. concept: 前置詞・比較・まぎらわしいペア
  con(
    '時間の at・on・in、比較の -er / -est、まぎらわしいペア',
    'Time prepositions, comparatives, and confusable pairs',
    '大問1の残りの定番を、まとめて押さえましょう。\n\n①時間の前置詞は「狭い→広い」で使い分け。\n・at＋時刻（at seven）\n・on＋曜日・日付（on Sunday ／ on May 5）\n・in＋月・季節・年（in August ／ in winter）\n\n②比較は形がすべて。「〜より」なら -er＋than、「いちばん」なら the＋-est。長い単語は more ／ most を使いますが、3級はまず -er ／ -est を確実に。\n\n③意味のまぎらわしいペアは「方向」で覚える。\n・borrow（借りる：自分へ）／ lend（貸す：相手へ）\n・teach（教える）／ learn（習う）\n・bring（持ってくる）／ take（持っていく）\n\nどれも「誰から誰へ？」を考えれば迷いません。',
    'Three more 大問1 staples. ① Time prepositions go narrow → wide: at + clock time, on + days and dates, in + months, seasons, years. ② Comparison is pure form: -er + than for “more than,” the + -est for “the most”; long words take more/most, but Grade 3 lives on -er/-est. ③ Confusable pairs are about direction: borrow (toward you) / lend (away from you), teach / learn, bring / take. Ask “from whom, to whom?” and the pair resolves itself.',
    'at seven / on Sunday / in August\ntall → taller → the tallest\nborrow（自分へ）／ lend（相手へ）',
  ),
  // 6. practice: 前置詞
  q(
    '空所に入る語を選んでください。',
    'My birthday is (   ) March, so it is still a little cold on that day.',
    ['in', 'at', 'on', 'for'],
    0,
    '月の前は in なので、in March が正解です。\n\nat は時刻（at seven）、on は曜日・日付（on Sunday ／ on March 3）に使います。「3月3日に」なら on ですが、「3月に」と月だけなら in。狭い→広いの順に at → on → in と覚えましょう。',
    'Months take “in” — in March. “At” is for clock times, “on” for days and full dates (on March 3). With only the month, it’s “in.” Narrow → wide: at → on → in.',
  ),
  // 7. practice: 比較
  q(
    '空所に入る語を選んでください。',
    'This question is (   ) than the last one, so I can answer it quickly.',
    ['easy', 'easiest', 'more easy', 'easier'],
    3,
    '空所の後ろに than（〜より）があるので比較級。easy は短い単語なので -er をつけて easier が正解です。\n\neasiest は最上級で「the ＋ -est」の形で使います。more easy は、短い単語に more を重ねた典型的なワナ。than を見たら -er——形だけで解ける1問でした。',
    '“Than” after the gap demands a comparative, and easy is a short adjective: easier. “Easiest” is the superlative (the + -est), and “more easy” doubles up illegally on a short word. See “than,” write -er.',
  ),
  // 8. practice: まぎらわしいペア
  q(
    '空所に入る語を選んでください。',
    'I forgot my dictionary at home, so I asked my teacher to (   ) me one.',
    ['borrow', 'lend', 'teach', 'take'],
    1,
    '辞書が先生から自分へ来るので、lend（貸す）が正解。「先生に1冊貸してくださいと頼んだ」という文です。\n\nborrow は「借りる」、つまり自分が主語のときの動き（I borrowed one FROM my teacher）。lend me one ＝「私に貸して」と、方向が逆です。teach（教える）／ learn（習う）、bring（持ってくる）／ take（持っていく）も同じ「方向ペア」。誰から誰へ動くかで選びましょう。',
    'The dictionary moves from the teacher TO you, so the teacher LENDS it: “lend me one.” Borrow is the same exchange seen from the receiver (I borrowed one from my teacher). Teach/learn and bring/take work the same way — direction decides the pair.',
  ),
  // 9. practice: 比較の産出（gap）
  gap(
    '「fast」を正しい形に変えて、空所に入る1語を入力してください。',
    'Ken runs very fast. He is the (   ) runner on his team.',
    ['fastest'],
    'the ＋ 最上級で fastest が正解。「チームの中でいちばん速い」なので、-est の形です。\n\n直前の the と、後ろの on his team（チームの中で＝比べる範囲）が最上級のサイン。選ぶだけでなく自分で書けるようになると、ライティングや面接でもそのまま使えます。',
    '“The fastest” — the + superlative, signalled by “the” before the gap and the comparison group “on his team” after it. Producing the -est form yourself (not just recognising it) pays off in the writing and the interview too.',
  ),
]

// ── Lesson 2 読解：会話文・お知らせ・Eメール・エッセイ ──────────────────────
const G3_READING = [
  // 1. cold-open: 会話文完成
  q(
    'まずは1問。会話の空所に入るものを選んでください。',
    'A: Did you watch the soccer game on TV last night?\nB: (    )\nA: Really? It was the best game this year.',
    [
      'No, I went to bed early.',
      'Yes, I watch TV every night.',
      'I like baseball better than soccer.',
    ],
    0,
    '空所の後ろに注目。「えっ、今年いちばんの試合だったのに」という反応が続くので、空所には「見ていない」という返事が入ります。(A)「ううん、早く寝ちゃった」が正解。\n\n(B)の「毎晩テレビを見る」では Really? と驚かれる理由がなく、(C)は野球の話で質問に答えていません。会話の空所は、後ろの発言とかみ合うかで決まります。',
    'Look AFTER the gap: “Really? It was the best game this year” reacts to someone who MISSED it — (A) “No, I went to bed early.” (B) gives no reason for surprise, and (C) doesn’t answer the question. The line after the blank decides.',
  ),
  // 2. concept: 会話文完成の鉄則
  con(
    '会話の空所：返事は「つながる」が命',
    'Dialogue completion: the reply must connect',
    '大問2は会話の空所補充が5問。選択肢はどれも文として正しい英語なので、「正しいかどうか」では選べません。決め手はつながりです。\n\n鉄則は2つ。\n\n①空所の前の発言に「応答」しているか\n②空所の後ろの発言と「かみ合う」か\n\n特に②が強力。出題者は、空所の後ろの返事が1つの選択肢としかつながらないように問題を作っています。空所を見つけたら、まず後ろを読む癖をつけましょう。\n\n疑問文への返答なら、「答えの種類」も確認します。When なら時、Where なら場所、Yes/No 疑問文なら Yes か No——種類がずれた選択肢は、その場で消せます。',
    '大問2 gives five dialogue gaps. Every option is correct English, so correctness can’t choose — CONNECTION does. Two rules: the gap must respond to the line before it, and it must mesh with the line after it. Rule ② is the stronger one: the writers design the following line to fit exactly one option, so read after the gap first. For questions, also match the answer TYPE: when → a time, where → a place, yes/no → yes or no.',
    '後ろが「Really?」→ 空所は意外な返事\n後ろが「That sounds fun!」→ 空所は予定・提案\n後ろが「Here you are.」→ 空所はお願い',
  ),
  // 3. concept: お知らせとEメール
  con(
    'お知らせとEメール：ラベルから探す',
    'Notices and e-mails: hunt by label',
    '大問3Aは学校行事などの「お知らせ」。Date（日付）、Time（時間）、Place（場所）、値段といったラベルが並び、設問の答えは必ずどれかのラベル付きの事実です。\n\nだから頭から読む必要はありません。設問を先に読む → When なら Date・Time へ、Where なら Place へ、How much なら値段の行へ。一直線に探しに行きましょう。注意点は1つだけ：お知らせには日付や時刻が複数あるので、「何の日付か」をラベルごと確認すること。\n\n大問3BはEメールのやり取り。最初に読むのはヘッダー（From ／ To ／ Subject）です。誰が誰に、何の用件で書いたのか——ここを5秒でつかむと、本文がすっと頭に入ります。2通あるときは「どちらが書いた内容か」を取り違えないように。',
    '大問3A is a notice — a school event with labelled facts: Date, Time, Place, prices. Every question’s answer is one of those labelled facts, so don’t read top-to-bottom: read the question first, then go straight to the matching label (when → Date/Time, where → Place, how much → the price line). One caution: notices carry several dates and times, so confirm WHAT each one labels. 大問3B is an e-mail exchange: read the header (From / To / Subject) first — who is writing to whom about what — and never mix up which writer said what.',
    'When 〜? → Date・Time の行へ\nWhere 〜? → Place の行へ\nHow much 〜? → 値段の行へ',
  ),
  // 4. practice: お知らせ
  q(
    'お知らせを読んで、設問に答えてください。',
    '【お知らせ】\nWinter Talent Show\nDate: Friday, December 12\nTime: 1:30 p.m. – 3:00 p.m.\nPlace: School Gym\nStudents who want to sing or dance in the show, please write your name on the list by December 5. The list is on the music room door.\n\nQ: When do students need to write their names on the list?',
    ['By December 12.', 'By January 5.', 'By December 5.', 'By November 30.'],
    2,
    'please write your name on the list by December 5 がそのまま根拠。(C)が正解です。\n\n(A)の December 12 はショー本番の日付（Date のラベル）。お知らせには日付が複数あり、設問がどれを指すかを正確につかむのがポイントです。「申し込みの締め切り」と「本番の日」——役割ごとに区別しましょう。',
    '“Please write your name on the list by December 5” — (C). December 12 (A) is the show date under the Date label. Notices carry several dates; match each one to its role (deadline vs. event day) before you answer.',
  ),
  // 5. practice: Eメール
  q(
    'Eメールを読んで、設問に答えてください。',
    '【Eメール】\nFrom: Tom Baker\nTo: Daiki Mori\nSubject: Fishing trip\n\nHi Daiki,\nMy uncle will take me fishing at Lake Midori next Saturday, and he says you can come, too! We will leave from my house at seven in the morning. Can you bring your big cooler? Mine is too small. I hope you can come!\nYour friend,\nTom\n\nQ: What does Tom ask Daiki to do?',
    [
      'Buy a new fishing rod.',
      'Bring his big cooler.',
      'Come to the lake by bike.',
      'Ask his uncle about the trip.',
    ],
    1,
    'Can you bring your big cooler? が根拠。(B)が正解です。\n\nお願いは Can you 〜? ／ Please 〜. の文に隠れています。設問が What does A ask B to do? なら、本文からこの形を探しましょう。ヘッダーを見れば書き手は Tom、読み手は Daiki——「誰が誰に頼んだか」もヘッダーが教えてくれます。',
    '“Can you bring your big cooler?” — (B). Requests hide inside “Can you ~?” and “Please ~.” sentences; for a “what does A ask B to do?” question, hunt that shape. The header already told you Tom writes and Daiki reads.',
  ),
  // 6. concept: 3C エッセイ
  con(
    'エッセイ：段落に1つの事実、設問は本文の順番',
    'The essay: one fact per step, questions in text order',
    '大問3Cは、学生や家族の体験を書いた短いエッセイ。物語のように時間が流れ、段落ごとに新しい事実が1つずつ出てきます。\n\n読み方のルールは3つ。\n\n①設問を先に読む（5問。何を探すか決めてから本文へ）\n②設問の順番は本文の順番。設問1の答えは前半に、最後の設問の答えは後半にあります\n③正解の選択肢は、本文の言葉を言い換えてあります（difficult → hard など）。逆に、本文の単語をそのまま使った選択肢はワナのことが多い\n\n「いつ・誰が・何をした・どう感じた」を段落ごとに1つずつ拾えば、5問ぶんの答えが順番に見つかります。',
    '大問3C is a short personal essay — time flows like a story, and each step adds one new fact. Three rules: read the questions first (there are five); trust that question order follows text order (Q1 lives early, the last question late); and expect correct options to PARAPHRASE the text (difficult → hard) while word-for-word echoes are usually traps. Collect “when, who, did what, felt how” one step at a time and the five answers appear in order.',
  ),
  // 7. practice: エッセイ（前半）
  q(
    '本文を読んで、設問に答えてください。',
    '【本文の一部】\nMy name is Saki. Last spring, I began helping my grandfather in his vegetable garden every Sunday. At first, the work was difficult, and I wanted to stop going. But my grandfather showed me how to grow tomatoes, and in August we picked a lot of them. I gave some to our neighbors, and they looked very happy. Now I want to learn how to grow other vegetables, too.\n\nQ: Why did Saki want to stop going to the garden at first?',
    [
      'She did not like tomatoes.',
      'Her grandfather was too busy.',
      'The garden was far from her house.',
      'The work was hard for her.',
    ],
    3,
    'At first, the work was difficult, and I wanted to stop going が根拠。difficult を hard と言い換えた(D)が正解です。\n\n設問の at first（最初は）は、本文の At first を指しています。設問の言葉が本文のどこを指すかを見つけ、その周辺を読む——答えはいつも根拠の文とセットです。',
    '“At first, the work was difficult, and I wanted to stop going” — paraphrased as “the work was hard” (D). The question’s “at first” points straight to the text’s “At first”; find the matching spot and read around it.',
  ),
  // 8. practice: エッセイ（後半）
  q(
    '同じ本文を読んで、次の設問に答えてください。',
    '【本文の一部】\nMy name is Saki. Last spring, I began helping my grandfather in his vegetable garden every Sunday. At first, the work was difficult, and I wanted to stop going. But my grandfather showed me how to grow tomatoes, and in August we picked a lot of them. I gave some to our neighbors, and they looked very happy. Now I want to learn how to grow other vegetables, too.\n\nQ: What does Saki want to do now?',
    [
      'Sell tomatoes at a market.',
      'Learn to grow other vegetables.',
      'Make a small garden at school.',
      'Give flowers to her neighbors.',
    ],
    1,
    '最後の文 Now I want to learn how to grow other vegetables, too が根拠。(B)が正解です。\n\n設問の now が本文の Now を指しています。「今〜したい」を聞く設問の答えは本文の最後にある——設問の順番＝本文の順番、のルールどおりですね。(D)は neighbors という本文の単語を使ったワナ。あげたのはトマトで、花ではありません。',
    'The last sentence — “Now I want to learn how to grow other vegetables, too” — gives (B). A “now” question finds its answer at the end, exactly as question order = text order predicts. (D) echoes “neighbors” but swaps tomatoes for flowers: the word-echo trap.',
  ),
  // 9. recap
  con(
    'まとめ：つながりとラベルで解く読解',
    'Recap: reading by connection and by label',
    '・会話の空所は、後ろの発言とかみ合うものを選ぶ。種類（時・場所・Yes/No）も確認\n\n・お知らせは設問→ラベルへ一直線。日付・時刻は「何の日付か」までセットで\n\n・Eメールはヘッダー（From ／ To ／ Subject）が最初の5秒\n\n・エッセイは設問の順番＝本文の順番。正解は言い換え、単語そのままはワナを疑う\n\n次のレッスンは、ライティング。Eメール返信と意見文の型を手に入れます。',
    '• Dialogue gaps: choose what meshes with the line after the blank; check the answer type too.\n\n• Notices: question → label, straight line; pair every date and time with its role.\n\n• E-mails: the header (From / To / Subject) is your first five seconds.\n\n• The essay: question order = text order; correct answers paraphrase, word echoes are suspects.\n\nNext lesson: Writing — the e-mail reply and the opinion task.',
  ),
]

// ── Lesson 3 ライティング：Eメールと意見 ────────────────────────────────────
const G3_WRITING = [
  // 1. cold-open: 2つの質問に答えているか
  q(
    'まずは1問。友達のEメールに What club did you join? と How often do you practice? の2つの質問がありました。返信として最も適切なのはどれでしょう？',
    'Your friend asked: “What club did you join?” and “How often do you practice?”',
    [
      'I joined the brass band. Our school has many interesting clubs.',
      'I joined the brass band, and we practice three days a week.',
      'Club activities are a lot of fun. You should join one, too!',
    ],
    1,
    '友達のEメールには質問が必ず2つあり、両方に答えるのが採点の大前提です。(B)は「吹奏楽部に入った」＋「週3日練習する」で両方に回答しています。\n\n(A)は1つ目にしか答えていません（練習の頻度が不明のまま）。(C)はどちらの質問にも答えていません。書く前に「質問は2つ、答えも2つ」——まずこの確認からです。',
    'The friend’s e-mail always contains TWO questions, and answering both is the first scoring requirement. (B) answers both (brass band + three days a week). (A) answers only the first; (C) answers neither. Before writing: find both questions, plan both answers.',
  ),
  // 2. concept: Eメール返信の型
  con(
    'Eメール返信：15〜25語、質問2つに必ず答える',
    'The e-mail reply: 15–25 words, both questions answered',
    '3級ライティングの1問目は、友達のEメールへの返信。条件は15〜25語で、メールの中の質問2つに答えることです。\n\n型はこれだけ。\n\n①リアクション（Thanks for your e-mail! ／ That’s great!）\n②質問1への答え\n③質問2への答え\n④締め（See you! ／ Bye for now! など）\n\n15〜25語はかなり短いので、答えはそれぞれ1文でOK。むしろ書きすぎに注意です。リアクションと締めは短い決まり文句にして、真ん中の2文に語数を使いましょう。\n\n書き終えたら必ず語数を数えること。範囲の外は、内容が良くても減点です。',
    'Writing task 1 is a reply to a friend’s e-mail: 15–25 words, answering the friend’s TWO questions. The frame: ① a reaction (Thanks for your e-mail!) ② answer 1 ③ answer 2 ④ a short closing (See you!). The range is tight, so one sentence per answer is enough — overwriting is the real danger. Keep the reaction and closing short and spend your words on the two answers. Count the words when you finish: out of range loses points however good the content.',
    '①Thanks for your e-mail!\n②答え1（1文）\n③答え2（1文）\n④See you soon!',
  ),
  // 3. practice: 書き出しの1文
  q(
    '友達への返信メールの書き出しとして最も自然なのはどれでしょう？',
    'Choose the best FIRST sentence for your reply to a friend.',
    [
      'Thanks for your e-mail! Your new school sounds nice.',
      'Dear Sir, I am writing to answer your questions.',
      'This e-mail has two questions for me.',
    ],
    0,
    '相手は友達なので、(A)のような明るいリアクションが自然です。お礼＋ひとことで、感じよくスタートできます。\n\n(B)はビジネスレターの書き出しで、友達相手には不自然。(C)は問題の説明をしているだけで、返信の文になっていません。3級のEメールは常に「友達への返信」——くだけた、温かい英語でいきましょう。',
    'The reader is a friend, so the warm reaction (A) fits — thanks plus one friendly comment. (B) is business-letter language, and (C) describes the task instead of replying. EIKEN’s e-mail is always to a friend: keep it casual and warm.',
  ),
  // 4. concept: 意見の型
  con(
    '意見の問題：25〜35語、意見＋理由2つ',
    'The opinion task: 25–35 words, opinion + two reasons',
    '2問目は意見を書く問題。QUESTION（質問）に対して、25〜35語で自分の意見と理由を2つ書きます。\n\nテンプレートはこの形。\n\nI think 〜. ← 意見\nI have two reasons. ← 予告\nFirst, 〜. ← 理由1\nSecond, 〜. ← 理由2\n\nQUESTION が Which do you like better, A or B?（AとBどちらが好き？）の形なら、出だしは I like A better. に変えるだけ。あとは同じです。\n\n理由は「意見を支える」ものを。夏が好きな理由が「冬は寒い」では弱く、「海で泳げる」なら強い。意見と理由が一直線につながっているかを確認しましょう。',
    'Task 2 is an opinion: answer the printed QUESTION in 25–35 words with your opinion and two reasons. Template: I think ~. / I have two reasons. / First, ~. / Second, ~. If the QUESTION is “Which do you like better, A or B?”, just open with “I like A better.” — the rest is identical. Reasons must SUPPORT the opinion: “I can swim in the sea” argues for summer; a complaint about winter barely does. Check that opinion and reasons line up.',
    'I think 〜. → I have two reasons.\n→ First, 〜. → Second, 〜.',
  ),
  // 5. practice: 型の組み立て（drag）
  drag(
    '意見の答案の骨格を完成させてください。',
    'QUESTION: Which do you like better, summer or winter?',
    'I like summer ___. I have two ___. ___, I can swim in the sea with my friends. ___, my birthday is in August.',
    ['better', 'reasons', 'First', 'Second', 'However', 'Because'],
    ['better', 'reasons', 'First', 'Second'],
    'I like 〜 better. → I have two reasons. → First → Second、の順です。Which do you like better? と聞かれたら better で答える——質問の言葉を借りるのがコツ。\n\nHowever（逆接）は意見の骨格には不要、Because は理由の文を始めることもできますが、First ／ Second の位置には入りません。この骨格を暗記すれば、本番ではテーマに合わせて中身を入れ替えるだけです。',
    '“I like ~ better” → “I have two reasons” → First → Second. A “which do you like better?” question is answered with “better” — borrow the question’s own words. “However” has no place in this skeleton, and “Because” can’t fill the First/Second slots. Memorise the frame; on test day you only swap the content.',
  ),
  // 6. practice: 理由の質
  q(
    'QUESTION: Do you like studying with your friends? — Yes の立場で、意見を最も強く支える理由はどれでしょう？',
    'You answered YES. Which reason supports your opinion best?',
    [
      'My friends and I go to the same school.',
      'I sometimes study alone in my room.',
      'We can ask each other questions when we don’t understand.',
    ],
    2,
    '(C)は「わからないとき教え合える」と、友達と勉強する利点を直接説明しています。これが理由の役割です。\n\n(A)は単なる事実で、「一緒に勉強するのが好き」な理由になっていません。(B)は逆に1人で勉強する話で、Yes の意見と反対方向です。理由は「意見とつながっているか」で選びましょう。',
    '(C) directly explains the benefit of studying together (asking each other questions). (A) is a bare fact with no link to the opinion, and (B) points the OPPOSITE way — studying alone. A reason must connect to the opinion.',
  ),
  // 7. concept: 減点ポイント
  con(
    '減点ポイント：語数・質問無視・話題ずれ',
    'Where points are lost: length, ignored questions, off-topic',
    'ライティングで点を落とす原因は、英語の難しさよりも条件違反がほとんどです。\n\n・語数オーバー／不足（Eメール15〜25語、意見25〜35語。書いたら数える）\n・Eメールで質問の片方に答えていない\n・理由が1つしかない、または意見と関係ない理由\n・QUESTIONと違う話題について書く\n\n難しい単語や長い文は要求されていません。中学校で習った英語を、型に乗せて、条件どおりに——それが3級ライティングの満点ルートです。',
    'Most lost points come from broken conditions, not weak English: word counts out of range (e-mail 15–25, opinion 25–35 — count after writing), one of the two questions ignored, only one reason (or an unrelated one), or drifting off the QUESTION’s topic. Hard words and long sentences are not required; junior-high English inside the template, conditions met — that is the full-marks route.',
  ),
  // 8. practice: 何が問題？
  q(
    '友達の質問は2つ：Where did you go during the winter vacation? と What did you do there? この返信の最大の問題点はどれでしょう？\n\n“Thanks for your e-mail! I went to Nagano with my family. The mountains were very beautiful. I want to visit again next year!”',
    'What is the biggest problem with this reply?',
    [
      'It is much longer than 25 words.',
      'It never says what the writer did in Nagano.',
      'The closing is too formal for a friend.',
    ],
    1,
    '2つ目の質問 What did you do there? への答えがどこにもありません。(B)が正解。「山がきれいだった」は感想で、「何をしたか」には答えていません。skiing でも snowball fights でも、したことを1文書く必要があります。\n\n語数は23語で範囲内なので(A)は誤り、書き方も友達向けで自然なので(C)も誤り。見直しの最初の質問はいつも「質問2つに答えたか？」です。',
    'The reply never answers “What did you do there?” — (B). “The mountains were beautiful” is a comment, not an activity; one sentence about skiing or playing in the snow was needed. The length (23 words) and the friendly tone are fine. First proofreading question, always: did I answer BOTH questions?',
  ),
  // 9. practice: テンプレ産出（gap）
  gap(
    '意見の答案の2文目に入る1語を入力してください。',
    'QUESTION: Do you think students should join a club? — “I think students should join a club. I have two (   ). First, they can make new friends. Second, they can learn things they cannot learn in class.”',
    ['reasons'],
    'I have two reasons.（理由は2つあります）の reasons が正解です。\n\n意見の直後にこの1文を置くと、採点者に「ここから理由が2つ来ます」と予告できて、答案の形がはっきりします。First ／ Second とセットで、手が覚えるまで書いて練習しましょう。',
    '“I have two REASONS.” — the preview sentence right after your opinion. It tells the grader “two reasons coming,” and First / Second deliver them. Drill the line until your hand writes it automatically.',
  ),
  // 10. recap
  con(
    'まとめ：型と条件を守れば勝てる',
    'Recap: the template plus the conditions',
    '・Eメール：15〜25語。リアクション → 答え1 → 答え2 → 締め。質問2つに必ず答える\n\n・意見：25〜35語。I think → I have two reasons → First → Second\n\n・Which do you like better? には I like 〜 better. で答える\n\n・理由は意見を支えるものだけ\n\n・書き終えたら：語数を数える → 質問2つ確認 → 話題ずれ確認\n\n次のレッスンは、リスニング第1部〜第3部。イラストを見ながら聞く形式に慣れます。',
    '• E-mail: 15–25 words; reaction → answer 1 → answer 2 → closing; both questions answered.\n\n• Opinion: 25–35 words; I think → I have two reasons → First → Second.\n\n• “Which do you like better?” → “I like ~ better.”\n\n• Reasons must support the opinion.\n\n• After writing: count words, confirm both questions, confirm the topic.\n\nNext lesson: Listening Parts 1–3 — including the picture-based format.',
  ),
]

// ── Lesson 4 リスニング：第1部〜第3部 ───────────────────────────────────────
// The two 第1部 screens (order 1–2) get illustrations attached later — their
// dialogues are written around those exact scenes. They read fine without.
const G3_LISTENING = [
  // 1. concept: 第1部の形式
  con(
    '第1部：イラストを先に読む',
    '第1部: read the picture first',
    '3級リスニング第1部は10問。問題用紙にはイラストだけが印刷されています。短い会話が流れ、最後の発言への応答A・B・Cが音声で読まれます——紙に選択肢の文はありません。\n\n戦略は3つ。\n\n①音声が始まる前にイラストを見る。誰が（親子？友達？店員と客？）、どこで（家？学校？店？）、何をしているか。場面が頭に入っていれば、会話は半分聞き取れたようなものです\n②会話の最後の発言を頭の中で保持する（応答はその発言へのリアクション）\n③A・B・Cは聞いた瞬間に○×判定。迷ったら保留して次へ\n\n3級の音声はゆっくり、はっきり読まれます。あわてる必要はありません。イラスト→最後の発言→即判定、のリズムで。',
    'Grade 3 Listening 第1部 is 10 questions: only a picture is printed, a short dialogue plays, and the three responses A–C to its last line are SPOKEN, never printed. Three moves: read the picture BEFORE the audio (who, where, doing what — know the scene and you’ve half heard the dialogue), hold the final line in your head, and judge each option the instant it’s spoken. Grade 3 audio is slow and clear; keep the rhythm — picture, final line, instant judgment.',
    'イラスト → 誰が・どこで・何をしている\n最後の発言 → 頭の中で保持\nA・B・C → 聞いた瞬間に○×',
  ),
  // 2. practice: 第1部（イラスト：猫の絵を見せる女の子）
  qa1(
    'まずは1問。イラストを見ながら聞きましょう。応答A〜Cは音声で読まれます。会話につながるものを選んでください。',
    'W: Look, Dad! I finished my picture of our cat.\nM: Wow, it’s so big! Did you draw it at school?\nW: (response)\nA. Yes, in my art class today.\nB. No, our cat is sleeping outside.\nC. I’ll buy a new camera soon.',
    'A',
    'イラストは、リビングで大きな猫の絵をお父さんに見せている女の子。お父さんの最後の発言は「学校で描いたの？」という質問なので、(A)「うん、今日の美術の授業で」が正解です。\n\n(B)は cat という単語を繰り返した音のワナで、質問に答えていません。(C)はカメラの話で場面と無関係。イラストで「絵を見せている場面」とわかっていれば、最後の質問もすっと入ってきます。',
    'The picture: a girl showing her father a big drawing of their cat in the living room. His last line asks “Did you draw it at school?”, so (A) “Yes, in my art class today” connects. (B) echoes “cat” without answering; (C) is about a camera. Knowing the scene from the picture makes the final question easy to catch.',
  ),
  // 3. practice: 第1部（イラスト：雨の日の玄関）
  qa1(
    'イラストを見ながら聞きましょう。応答A〜Cは音声で読まれます。会話につながるものを選んでください。',
    'M: Mom, I’m leaving for school now.\nW: Wait, Ken. It’s raining very hard. Take your umbrella.\nM: (response)\nA. Thanks, but I already had breakfast.\nB. OK. I’ll get it from my room.\nC. Yes, it was sunny yesterday.',
    'B',
    'イラストは、通学かばんを持って玄関に立つ男の子と、そばのお母さん。開いたドアの外は大雨です。お母さんの最後の発言は「傘を持っていきなさい」なので、(B)「わかった、部屋から取ってくる」が正解。\n\n(A)は朝ごはんの話でかみ合わず、(C)は昨日の天気で「今、傘を持っていくか」に答えていません。最後の発言——Take your umbrella——を保持できたかが勝負でした。',
    'The picture: a boy with his school bag at the front door, his mother beside him, heavy rain outside. Her last line is “Take your umbrella,” so (B) “OK. I’ll get it from my room” connects. (A) answers about breakfast, (C) about yesterday’s weather. Holding the final line — take your umbrella — wins this.',
  ),
  // 4. concept: 第2部・第3部の先読み
  con(
    '第2部・第3部：選択肢の先読みで質問を予想',
    '第2部・第3部: preview the printed options',
    '第2部は会話が10問、第3部は短い説明文やお知らせが10問。どちらも最後に質問が音声で読まれ、紙には4つの選択肢が印刷されています。\n\n印刷されている＝先読みできる、ということ。音声が始まる前に選択肢を見ておけば、質問の種類が予想できます。\n\n・選択肢が全部「時刻」→ When ／ What time が来る\n・全部「場所」→ Where が来る\n・全部「行動」→ 誰かが何をする（した）かが来る\n\n音声には時刻や場所、値段が複数登場します。質問はそのうち1つを指すので、「どの数字が何のものか」をラベルごと聞き分けましょう。そして結論は会話の最後で決まる——前半の「できない」「だめ」に引っかからないこと。',
    '第2部 is 10 dialogues, 第3部 10 short talks or announcements; the question is spoken at the end but the four options are PRINTED — which means you can preview. All-times options → a what-time question; all-places → where; all-actions → what someone will or did do. The audio mentions several times, places and prices and the question picks one, so track each number WITH its label. And conclusions live in the last lines — don’t be caught by an early “can’t.”',
    '選択肢が全部時刻 → What time 〜?\n全部場所 → Where 〜?\n全部行動 → What will/did 〜 do?',
  ),
  // 5. practice: 第2部
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Hi, Kenta. Did you finish the science homework?\nM: Not yet. I left my notebook at school.\nW: You can use mine. I’ll bring it to your house after dinner.\nM: Really? Thanks, Mari!\nQuestion: What will Mari do after dinner?',
    [
      'Finish her science homework.',
      'Go back to school.',
      'Call Kenta’s teacher.',
      'Take her notebook to Kenta’s house.',
    ],
    3,
    'I’ll bring it to your house after dinner が根拠。it ＝ Mari のノートなので、(D)「ノートをケンタの家に持っていく」が正解です。\n\n質問は What will MARI do?——誰の行動を聞かれているかに注意。宿題が終わっていないのはケンタで、(A)を選ぶと人物を取り違えたことになります。選択肢が全部「行動」なら、誰が何をするかをメモのつもりで聞きましょう。',
    '“I’ll bring it to your house after dinner” — “it” is Mari’s notebook, so (D). The question asks what MARI will do; Kenta is the one with unfinished homework, so (A) confuses the people. With all-action options, track who does what.',
  ),
  // 6. practice: 第2部
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'M: Excuse me. How much is this blue cap?\nW: It’s ten dollars. The white one is eight dollars.\nM: Then I’ll take the white one, please.\nW: Sure. Thank you!\nQuestion: How much will the man pay?',
    ['Eight dollars.', 'Ten dollars.', 'Eighteen dollars.', 'Two dollars.'],
    0,
    '男性は最後に「じゃあ白いほうをください」と言ったので、白い帽子の値段＝8ドル、(A)が正解です。\n\n10ドルは最初に聞いた青い帽子の値段。聞こえた数字がそのまま答えになるとは限りません。「青＝10ドル、白＝8ドル」とラベルごと聞き取り、結論（どちらを買うか）は最後の発言で確定——第2部の基本がつまった1問でした。',
    'He takes the WHITE one, so he pays its price — eight dollars (A). Ten dollars labels the blue cap he asked about first. A heard number is not automatically the answer: pair each price with its item, and let the last line settle which one he buys.',
  ),
  // 7. practice: 第3部
  qa(
    '説明文と質問を聞いて、答えを選んでください。',
    'Listen to the talk and the question.',
    'Yumi is on the tennis team at her junior high school. The team usually practices on the school tennis court. Last week, it rained every day, so the team practiced in the gym instead.\nQuestion: Where did Yumi’s team practice last week?',
    ['On the tennis court.', 'At the park.', 'In the gym.', 'At Yumi’s house.'],
    2,
    'so the team practiced in the gym instead が根拠。(C)が正解です。\n\nテニスコートは「ふだんの」練習場所。質問の last week（先週）は、雨で変更になったあとの場所を聞いています。usually（ふだん）と last week（先週）のように、時を表す言葉が「どの情報を答えるか」を決める——第3部の頻出パターンです。',
    '“So the team practiced in the gym instead” — (C). The tennis court is where they USUALLY practice; the question asks about LAST WEEK, after the rain changed the plan. Time words like “usually” vs. “last week” decide which fact answers the question.',
  ),
  // 8. practice: 第3部
  qa(
    'お知らせと質問を聞いて、答えを選んでください。',
    'Listen to the announcement and the question.',
    'Welcome to Sunny Town Zoo, everyone. The lion show will start at two o’clock at the East Stage. Before the show, you can take pictures with a baby rabbit near the gift shop. The zoo closes at five o’clock today. We hope you have a great day!\nQuestion: What time will the lion show start?',
    ['At one o’clock.', 'At two o’clock.', 'At five o’clock.', 'At three o’clock.'],
    1,
    'The lion show will start at two o’clock が根拠。(B)が正解です。\n\n5時は閉園の時刻で、ショーの時刻ではありません。1つのお知らせに時刻が複数登場し、質問がどれか1つを指す——だから「2時＝ショー、5時＝閉園」とラベルごとメモするつもりで聞きましょう。選択肢が全部時刻だと先読みできていれば、数字に集中して待てたはずです。',
    '“The lion show will start at two o’clock” — (B). Five o’clock is the CLOSING time, not the show. One announcement, several times, one asked: log each time with its label (two = show, five = closing). Previewing the all-times options told you to listen for numbers.',
  ),
  // 9. recap
  con(
    'まとめ：イラストで場面、ラベルで数字',
    'Recap: scene from the picture, numbers with labels',
    '・第1部はイラストを先に読む。誰が・どこで・何をしているか\n\n・最後の発言を保持し、A・B・Cは聞いた瞬間に○×\n\n・第2部・第3部は選択肢が印刷されている＝先読みで質問を予想\n\n・数字・時刻・場所はラベルごと聞き取る（何の時刻？誰の行動？）\n\n・結論は最後の発言で決まる。usually と last week のような時の言葉にも注意\n\n次のレッスンは、スピーキング。二次面接の流れとイラスト描写の型です。',
    '• 第1部: read the picture first — who, where, doing what.\n\n• Hold the final line; judge each spoken option instantly.\n\n• 第2部/第3部: printed options = preview and predict the question.\n\n• Track every number, time and place WITH its label.\n\n• Conclusions live in the last lines; watch time words like “usually” vs. “last week.”\n\nNext lesson: Speaking — the interview flow and describing the card’s picture.',
  ),
]

// ── Lesson 5 スピーキング：面接の型 ─────────────────────────────────────────
// Screens 5 and 6 get the card illustration attached later (a park: a boy
// drinking water on a bench, a girl reading under a tree, a man washing his
// car nearby) — see supabase/EIKEN-COURSE-IMAGES.md. They read fine without.
const G3_SPEAKING = [
  // 1. concept: 面接の流れと音読
  con(
    '面接の流れと音読：20秒の黙読から始まる',
    'The interview flow — starting with 20 silent seconds',
    '3級の二次試験は面接です。流れは固定：入室とあいさつ → カードを受け取る → 黙読（20秒）→ 音読 → No.1（カードの文章について）→ No.2・No.3（カードのイラストについて）→ No.4・No.5（あなた自身について）。\n\n音読のコツは3つ。\n\n①意味のかたまりで区切る（Many students / play sports / after school.）\n②知らない単語が出ても止まらない。それらしく読んで先へ進む\n③タイトルも読む。ゆっくり、はっきり、が早口より高評価\n\n面接では「アティチュード（積極的にコミュニケーションをとる態度）」も採点されます。沈黙がいちばんの敵。完璧な英語より、止まらない英語です。',
    'The Grade 3 interview is fixed: greetings → receive the card → 20 seconds’ silent reading → read aloud → No.1 about the passage → No.2 and No.3 about the card’s picture → No.4 and No.5 about you. Reading aloud: chunk by meaning, never stop at an unknown word (best-guess it and move on), and read the title too — slow and clear beats fast. Attitude is scored as well: silence is the enemy; unstopping English beats perfect English.',
    '黙読20秒 → 音読 → No.1 → No.2・No.3 → No.4・No.5',
  ),
  // 2. practice: 黙読の使い方
  q(
    '黙読の20秒で最もすべきことはどれでしょう？',
    'You have 20 seconds to read the card silently. What is the best use of this time?',
    [
      'Practice saying your name and your school’s name.',
      'Memorize the whole passage word by word.',
      'Read the passage quietly and catch its topic.',
    ],
    2,
    '(C)が正解。20秒で文章の話題と、読みにくそうな単語をチェックしておけば、音読がぐっと楽になります。\n\n(B)の丸暗記は20秒では不可能ですし、音読ではカードを見てよいので必要もありません。(A)の自己紹介はあいさつの段階で済んでいます。黙読は「音読の下見」——この使い方が正解です。',
    '(C). Use the 20 seconds to catch the topic and spot hard-to-read words — it makes the read-aloud far smoother. Memorising (B) is impossible in 20 seconds and unnecessary (you keep the card while reading), and (A) belongs to the greeting stage. Silent reading is a preview of the read-aloud.',
  ),
  // 3. concept: No.1
  con(
    'No.1：答えはカードの文章の中にある',
    'No.1: the answer is in the passage',
    '音読のあとの No.1 は、カードの文章についての質問。Why 〜? や What 〜? の形で聞かれます。\n\n答えは必ずカードの中にあります。Why の場合は、本文の because や so の周辺を探しましょう。\n\nカード：People in Hoshino Town like Aozora Park because they can enjoy walking under many trees.\n質問：Why do people in Hoshino Town like Aozora Park?\n答え：Because they can enjoy walking under many trees.\n\nコツは Because で文を始めて、聞かれた部分だけを切り出すこと。本文を頭から丸読みすると「質問に答えていない」印象になります。自分の意見を言う場面でもありません——カードの言葉で答えましょう。',
    'No.1 asks about the card’s passage, usually Why…? or What…?. The answer is always IN the passage — for Why, hunt near “because” and “so.” Start with “Because…” and carve out just the asked part: reading the whole sentence from the top sounds like not answering, and your own opinion isn’t wanted here. Answer with the card’s words.',
    'カード: …because they can enjoy walking under many trees.\n質問: Why …?\n答え: Because they can enjoy walking under many trees.',
  ),
  // 4. practice: No.1 の答え方
  q(
    'カードの文：People in Hoshino Town like Aozora Park because they can enjoy walking under many trees. ／ 質問：Why do people in Hoshino Town like Aozora Park? — 最も良い答えはどれでしょう？',
    'Choose the best answer to the examiner’s question.',
    [
      'Because they can enjoy walking under many trees.',
      'People in Hoshino Town like Aozora Park.',
      'I sometimes walk in the park near my house.',
    ],
    0,
    '(A)が正解。because の後ろの部分を、Because 〜 でそのまま切り出しています。\n\n(B)は質問の繰り返しで、Why に答えていません。(C)は自分の話で、カードの内容を答えていません（No.1 は意見や体験を聞く問題ではありません）。「Because＋カードの言葉」——この型で確実に1点を取りましょう。',
    '(A) lifts exactly the “because” part of the card. (B) restates the question without answering Why; (C) talks about yourself — No.1 is not a personal question. “Because + the card’s words” is the reliable point.',
  ),
  // 5. concept: No.2・No.3 イラスト描写
  con(
    'No.2・No.3：「何をしていますか」には He/She is 〜ing.',
    'No.2 and No.3: “What is the X doing?” → “He/She is ~ing.”',
    'No.2 と No.3 は、カードのイラストについての質問。複数の人がそれぞれ違うことをしている絵で、What is the boy doing?（男の子は何をしていますか）のように聞かれます。\n\n答えの型は1つだけ：He is 〜ing …. ／ She is 〜ing ….（現在進行形のフルセンテンス）\n\nDrinking. と単語だけで答えるのは×。主語から始めて、1文で言い切りましょう。\n\n大事なのは、質問の人物を絵の中で正しく見つけること。絵には男の子も女の子も大人もいます。the boy と聞かれたら男の子の動作を、the man と聞かれたら男性の動作を——主語の取り違えがいちばんもったいないミスです。',
    'No.2 and No.3 ask about the card’s picture — several people, each doing something different: “What is the boy doing?” One frame answers everything: He is ~ing… / She is ~ing… — a full present-continuous sentence. A bare word (“Drinking.”) scores poorly; start from the subject and finish the sentence. And locate the RIGHT person first: the picture has boys, girls and adults, and answering about the wrong one is the most wasteful mistake.',
    'Q: What is the girl doing?\nA: She is reading a book under the tree.',
  ),
  // 6. practice: イラスト描写（画像は後で添付）
  q(
    'イラストを見て答えましょう。面接官の質問：What is the boy doing?',
    'Look at the picture. The examiner asks: “What is the boy doing?” Choose the best answer.',
    [
      'He is reading a book under the tree.',
      'He is drinking water.',
      'He is washing his car.',
    ],
    1,
    'イラストの中で、男の子はベンチで水を飲んでいます。(B)「He is drinking water.」が正解。\n\n(A)の「木の下で本を読んでいる」のは女の子、(C)の「車を洗っている」のは男性の動作です。質問の主語——the boy——に合う人物を絵の中で見つけてから、is 〜ing の1文で答える。この順番を体に入れましょう。',
    'In the picture the boy is drinking water on the bench — (B). Reading under the tree (A) is the girl, and washing the car (C) is the man. Find the person the question names, THEN answer with one “is ~ing” sentence.',
  ),
  // 7. practice: 進行形の産出（gap）
  gap(
    'イラストを見て答えましょう。面接官の質問：What is the man doing? — 空所に入る1語を入力してください。',
    'Look at the picture and complete the answer. “The man is (   ) his car.”',
    ['washing'],
    'wash → washing が正解。進行形は「is ／ are＋動詞の -ing形」のセットです。\n\nイラスト描写の定番動詞——drinking、reading、playing、walking、cooking——は、-ing形が口からスッと出るまで練習しておきましょう。本番では考える時間が短いほど、アティチュードの印象も良くなります。',
    '“Washing.” Present continuous = is/are + -ing. Drill the picture-description staples (drinking, reading, playing, walking, cooking) until the -ing forms come automatically — quick answers also lift your attitude score.',
  ),
  // 8. concept: No.4・No.5 あなた自身への質問
  con(
    'No.4・No.5：「答え＋もう1文」',
    'No.4 and No.5: answer + one more sentence',
    '面接の最後は、あなた自身についての質問が2問。What do you usually do on weekends? や Do you like cooking? のような身近な話題です。\n\n答え方の型は「答え＋もう1文」。\n\nQ: Do you like cooking?\nA: Yes, I do. I sometimes make curry with my mother.\n\nYes ／ No だけで止まると、アティチュードの面でもったいない。理由・頻度・具体例のどれかを1文足しましょう。\n\nここは英語力テストというより会話のテストです。相手の目を見て、聞こえる声で、すぐに反応すること。質問が聞き取れなかったら、I’m sorry? ／ Pardon? と聞き返してOK——それだけで減点はされません。',
    'The interview ends with two questions about YOU — everyday topics like weekends or cooking. The frame: answer + ONE more sentence (a reason, a frequency, or an example): “Yes, I do. I sometimes make curry with my mother.” Stopping at yes/no wastes easy attitude points. This is a conversation test: eye contact, audible voice, quick response — and if you miss a question, “I’m sorry?” or “Pardon?” costs you nothing.',
    'Q: Do you like cooking?\nA: Yes, I do. I sometimes make curry with my mother.',
  ),
  // 9. practice: あなた自身への質問
  q(
    '面接官の質問：What do you usually do on weekends? — 最も良い答えはどれでしょう？',
    'The examiner asks: “What do you usually do on weekends?” Choose the best answer.',
    [
      'I usually play basketball.',
      'Basketball is a popular sport around the world.',
      'I usually play basketball. I practice with my friends in the park.',
    ],
    2,
    '(C)が正解。「バスケをします」という答えに、「友達と公園で練習します」というもう1文を足しています。これが「答え＋もう1文」の型です。\n\n(A)は答えてはいますが1文で止まっていて、もったいない。(B)は一般的な知識の話で、「あなたは何をするか」に答えていません。自分のことを、2文で——それだけで印象が大きく変わります。',
    '(C) — the answer plus one more sentence (practising with friends in the park). (A) answers but stops short; (B) states a general fact without answering about YOU. Two sentences about yourself transform the impression.',
  ),
  // 10. recap
  con(
    'まとめ：止まらない、型で返す',
    'Recap: never stop, answer in frames',
    '・黙読20秒は音読の下見。話題と読みにくい単語をチェック\n\n・音読は意味のかたまりで、知らない単語も止まらず読む\n\n・No.1 の答えはカードの中。Because 〜 で切り出す\n\n・No.2・No.3 は質問の人物を見つけて「He/She is 〜ing.」の1文\n\n・No.4・No.5 は「答え＋もう1文」。沈黙だけが敵\n\n次は総まとめレッスン。3級レベル全体の腕試しです。',
    '• The 20 silent seconds preview the read-aloud: topic and hard words.\n\n• Read aloud in chunks; never stop at unknown words.\n\n• No.1: the answer is in the passage — carve it out with “Because…”.\n\n• No.2/No.3: find the named person, then one “He/She is ~ing.” sentence.\n\n• No.4/No.5: answer + one more sentence. Silence is the only enemy.\n\nNext: the level review — everything in Grade 3, mixed.',
  ),
]

// ── Lesson 6 総まとめ：3級 ──────────────────────────────────────────────────
const G3_REVIEW = [
  // 1. intro
  con(
    '総まとめ：3級の全パターン',
    'The Grade 3 review: every pattern, mixed',
    'このレベルで学んだことを、本番と同じようにシャッフルして確認します。\n\n・大問1：動詞のあとの形（to ／ -ing）、前置詞、比較、まぎらわしいペア\n・会話の空所：後ろの発言とかみ合うものを\n・お知らせ：設問→ラベルへ一直線\n・Eメール：質問2つに必ず答える\n・リスニング：選択肢の先読みと、ラベル付きの数字\n・面接：He/She is 〜ing. と「答え＋もう1文」\n\n間違えても大丈夫。どのパターンだったかを確認すれば、それが本番の1点になります。',
    'Everything this level taught, shuffled like the real test: verb patterns (to / -ing), prepositions, comparatives and confusable pairs (大問1); the line after the gap (dialogue completion); question → label (the notice); both questions answered (the e-mail); option preview and labelled numbers (listening); and “He/She is ~ing” plus “answer + one more sentence” (the interview). Miss one? Identify the pattern — that is a point earned for test day.',
  ),
  // 2. vocab/grammar: 動詞のあとの形
  q(
    '空所に入る語を選んでください。',
    'It started to rain, so we stopped (   ) soccer and went home.',
    ['play', 'to play', 'plays', 'playing'],
    3,
    'stop は後ろに -ing をとる動詞なので、stopped playing で(D)が正解。「雨が降り出したので、サッカーをやめて帰った」という文です。\n\nenjoy・finish・stop は -ing、want・hope・decide は to＋原形——動詞とセットで覚える形のルール、思い出せましたか。',
    '“Stop” takes -ing: stopped PLAYING — (D). Enjoy, finish and stop take -ing; want, hope and decide take to + base verb. The verb decides the form.',
  ),
  // 3. vocab: まぎらわしいペア
  q(
    '空所に入る語を選んでください。',
    'Ms. Hara (   ) us math at our junior high school. Her classes are always fun.',
    ['learns', 'teaches', 'borrows', 'takes'],
    1,
    '先生から生徒へ知識が動くので、teaches（教える）が正解。「ハラ先生は私たちに数学を教えている」という文です。\n\nlearn は「習う」、つまり生徒側の動き（We learn math FROM Ms. Hara）。teach ／ learn は borrow ／ lend と同じ方向ペアです。「誰から誰へ？」で選ぶ——もう体に入っていますね。',
    'Knowledge moves from teacher to students, so she TEACHES us math — (B). “Learn” is the students’ side of the same exchange. Teach/learn is a direction pair, just like borrow/lend: ask “from whom, to whom?”',
  ),
  // 4. 会話文完成
  q(
    '会話の空所に入るものを選んでください。',
    'A: This math question is too difficult for me.\nB: (    )\nA: Thank you! You always help me.',
    [
      'Shall I help you with it?',
      'I finished my homework an hour ago.',
      'Math is my favorite subject.',
    ],
    0,
    '空所の後ろの Thank you! You always help me. が決め手。お礼と「いつも助けてくれる」が続くので、空所は手助けの申し出(A)「手伝おうか？」です。\n\n(B)は自分の宿題の報告、(C)は好みの話で、どちらもお礼につながりません。会話の空所は後ろを先に読む——鉄則どおりでした。',
    '“Thank you! You always help me” locks it: the gap must OFFER help — (A) “Shall I help you with it?” (B) reports homework, (C) states a preference; neither earns thanks. Read after the gap first.',
  ),
  // 5. お知らせ
  q(
    'お知らせを読んで、設問に答えてください。',
    '【お知らせ】\nSchool Library Book Sale\nDate: Monday, October 6\nTime: 12:30 p.m. – 1:00 p.m.\nPlace: School Library\nAll books are 50 yen each. Please bring your own bag.\n\nQ: How much are the books at the sale?',
    ['100 yen each.', 'Free for students.', '50 yen each.', '500 yen each.'],
    2,
    'All books are 50 yen each がそのまま根拠。(C)が正解です。\n\nHow much（いくら）と聞かれたら、値段の書いてある行へ一直線。日付や時間の行を読み返す必要はありません。設問→ラベル、の最短ルートで取れる1点でした。',
    '“All books are 50 yen each” — (C). A “how much” question sends you straight to the price line; no need to re-read the date or time. Question → label, shortest route.',
  ),
  // 6. Eメールの条件
  q(
    '友達の質問は2つ：When is your piano concert? と Can my brother come, too? — 両方に答えている返信はどれでしょう？',
    'Which reply answers BOTH questions?',
    [
      'It’s on Sunday afternoon. I will play two songs.',
      'It’s on Sunday afternoon, and yes, your brother is welcome!',
      'I practice the piano every day after school.',
    ],
    1,
    '(B)は「日曜の午後」＋「弟くんも歓迎」で両方に回答しています。\n\n(A)は1つ目だけ（弟の話が抜けています。曲数は聞かれていません）。(C)はどちらにも答えていません。Eメールはまず質問を2つ見つけて、答えを2つ用意——でしたね。',
    '(B) answers both: Sunday afternoon + the brother is welcome. (A) drops the brother question (nobody asked about the songs); (C) answers neither. Find two questions, plan two answers.',
  ),
  // 7. listening 第2部（audio）
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Dad, can we go to the new ramen shop for dinner?\nM: Sorry, Mio. It’s closed on Mondays. Let’s make curry at home.\nW: OK! Can I help you cook?\nM: Of course.\nQuestion: What will Mio do tonight?',
    [
      'Help her father make curry.',
      'Eat at the new ramen shop.',
      'Have dinner at her friend’s house.',
      'Buy vegetables at the store.',
    ],
    0,
    'ラーメン店は月曜定休で行けず、家でカレーを作ることに。ミオは Can I help you cook? と申し出て、お父さんが Of course. と答えています。(A)「お父さんのカレー作りを手伝う」が正解。\n\n(B)は最初の希望で、実現しなかったプラン。結論は会話の最後で決まる——前半の案に引っかからないこと、でしたね。',
    'The ramen shop is closed, so it’s curry at home; Mio offers to help cook and Dad says “Of course” — (A). The ramen shop (B) was the FIRST plan, which fell through. Conclusions live in the last lines.',
  ),
  // 8. listening 第3部（audio）
  qa(
    '説明文と質問を聞いて、答えを選んでください。',
    'Listen to the talk and the question.',
    'Mike is a junior high school student from Canada. Last month, he stayed with his grandmother in Japan. She showed him how to make rice balls. Now he makes them for lunch every weekend.\nQuestion: What did Mike learn in Japan?',
    [
      'How to speak Japanese.',
      'How to play the piano.',
      'How to grow rice.',
      'How to make rice balls.',
    ],
    3,
    'She showed him how to make rice balls が根拠。showed him how to 〜 を learned（習った）と言い換えた(D)が正解です。\n\n(C)の grow rice は rice という単語だけ重ねた音のワナ。作ったのは rice balls（おにぎり）です。単語の一致ではなく、内容の一致で選びましょう。',
    '“She showed him how to make rice balls” — what he LEARNED (D). “Grow rice” (C) recycles the word “rice” but changes the action: match the content, not the sound.',
  ),
  // 9. speaking: イラスト描写（gap）
  gap(
    '面接のイラスト描写です。空所に入る1語を入力してください。',
    'Look at the picture from the speaking card. “A girl is (   ) a book under the tree.”',
    ['reading'],
    'read → reading が正解。「女の子は木の下で本を読んでいます」——面接のイラスト描写の型「He/She is 〜ing.」そのものです。\n\n本番では、質問の人物を絵の中で見つけて、この1文をすぐに言えるかどうか。-ing形が自動で出るまで、口でも手でも練習しておきましょう。',
    '“Reading” — A girl is reading a book under the tree, the interview’s “He/She is ~ing” frame exactly. On test day, find the named person and produce this sentence at once; drill the -ing forms until they are automatic.',
  ),
  // 10. final recap
  con(
    'まとめ：3級レベル修了',
    'Recap: the Grade 3 level, complete',
    '・大問1は手順（全文→前後→種類）と、動詞ごとの形のルール\n\n・読解は「つながり」と「ラベル」。会話は後ろ、お知らせは設問→ラベル\n\n・ライティングは型＋条件（語数・質問2つ・話題）\n\n・リスニングはイラストと先読み、数字はラベルごと\n\n・面接は止まらないこと。He/She is 〜ing. と「答え＋もう1文」\n\nこれで3級レベルは修了です。学んだパターンを、3級の模試で試しましょう。実際の試験と同じ形式・同じ時間配分で力を確認できます。',
    '• 大問1: the routine (whole sentence → around the gap → type) and each verb’s form rule.\n\n• Reading: connection and labels — after the gap in dialogues, question → label in notices.\n\n• Writing: the templates plus the conditions (length, both questions, topic).\n\n• Listening: the picture, the option preview, and numbers with their labels.\n\n• The interview: never stop; “He/She is ~ing.” and “answer + one more sentence.”\n\nThat completes the Grade 3 level. Put the patterns to work in the Grade 3 mock set — same format, same timing as the real exam.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade 2（2級）
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade 2（2級）
// ════════════════════════════════════════════════════════════════════════════
// ── Lesson 1 大問1：単語・熟語 ──────────────────────────────────────────────
const G2_VOCAB = [
  // 1. cold-open question
  q(
    'まずは1問。空所に入る語を選んでください。',
    'Researchers at the university are trying to come (   ) with a cheaper way to recycle plastic bottles.',
    ['out', 'up', 'over', 'along'],
    1,
    'come up with 〜（〜を考え出す）の up が正解です。come out（出る）、come over（やって来る）、come along（一緒に行く）も実在する句動詞ですが、with a cheaper way とつながるのは come up with だけ。\n\n2級の大問1は17問。句動詞は、研究・ビジネス・社会の話題といった少し改まった文の中で出るのが2級らしさです。かたまりごと、後ろに続く形まで含めて覚えましょう。',
    '“Come up with” (think of, invent) gives “up” — only that chunk connects to “with a cheaper way.” At Grade 2, 大問1 has 17 items, and phrasal verbs appear in slightly formal contexts like research and business. Learn the chunk plus what follows it.',
  ),
  // 2. concept: 大問1の手順
  con(
    '大問1の手順：2級は17問、決め手は空所の周り',
    'The 大問1 routine: 17 items, decided around the gap',
    '2級の大問1は短文の空所補充が17問。単語のレベルは上がりますが、問われ方は3種類に整理できます。\n\n①コロケーション（決まった組み合わせ：make a decision ／ play a role）\n②句動詞（carry out ／ put off ／ come up with——改まった文の中で）\n③単語の意味（同じ品詞の4語から、文脈に合うものを選ぶ）\n\n手順はいつも同じ。全文を読んで場面をつかむ → 空所の直前・直後の語を見る → 組み合わせとして自然なものを選ぶ。答えを決めるのは空所そのものではなく、空所の周りの語です。\n\n1問20〜30秒が目安。リーディングは31問55分なので、大問1で時間を使いすぎないことが後半の長文を守ります。',
    '大問1 at Grade 2 is 17 short gap-fills of three kinds: collocations (fixed pairings like “make a decision”), phrasal verbs in slightly formal register, and vocabulary (four words of the same class — context decides). The routine never changes: read the whole sentence → look at the words just before and after the gap → choose the natural pairing. The words AROUND the gap choose the answer. Budget 20–30 seconds per item — Reading is 31 questions in 55 minutes, and time saved here protects the passages later.',
    'コロケーション → 相方の語がヒント\n句動詞 → 前置詞と目的語がヒント\n語彙 → 文全体のストーリーがヒント',
  ),
  // 3. concept: コロケーション
  con(
    'コロケーション：答えは空所の「周り」が選ぶ',
    'Collocations: the words around the gap choose the answer',
    'コロケーションとは、英語で「決まった組み合わせ」のこと。日本語の「決断を下す」「役割を果たす」と同じで、動詞と名詞の相方が決まっています。\n\n・make a decision（決断を下す）— × do a decision\n・play a role（役割を果たす）— × make a role\n・pay attention to 〜（〜に注意を払う）— × give attention\n・take responsibility for 〜（〜の責任を取る）\n\nだから解き方はこうなります。空所の後ろの名詞（または前の動詞）を見て、「この語の相方はどれ？」と考える。文全体の意味を深く考えるより先に、組み合わせで絞れることが多いのです。\n\n単語帳で動詞だけ・名詞だけを覚えるのではなく、「動詞＋名詞」のペアで覚えるのが2級の語彙学習です。',
    'A collocation is a fixed pairing — just like Japanese 決断を「下す」, English “makes” a decision and “plays” a role, never the other way around. So the method: look at the noun after the gap (or the verb before it) and ask “what is this word’s partner?” The pairing often narrows the options before you even think about meaning. Study vocabulary in verb + noun pairs, not as isolated words.',
    'make a decision ／ play a role\npay attention to 〜 ／ take responsibility for 〜\n名詞を見て「相方の動詞」を思い出す',
  ),
  // 4. practice: コロケーション
  q(
    '空所に入る語を選んでください。',
    'Before making a final (   ), the manager listened carefully to everyone’s opinions.',
    ['decision', 'solution', 'attention', 'promotion'],
    0,
    'make a decision（決断を下す）の組み合わせで decision が正解。「最終決定を下す前に全員の意見を聞いた」という流れです。\n\nsolution は find a solution、attention は pay attention、promotion は get a promotion と、それぞれ相方の動詞が違います。直前の making が答えを選んでくれました——これがコロケーションの解き方です。',
    '“Make a (final) decision” — the verb “making” right before the gap chooses “decision.” The others take different partners: find a solution, pay attention, get a promotion. The surrounding words did the work.',
  ),
  // 5. concept: 接頭辞・接尾辞
  con(
    '接頭辞・接尾辞：知らない単語は分解する',
    'Prefixes and suffixes: take unknown words apart',
    '2級では、選択肢に知らない単語が並ぶことがあります。そこで効くのが、単語のパーツの知識です。\n\n・un-（〜でない）：unnecessary（不要な）、unfair（不公平な）\n・re-（再び）：rebuild（建て直す）、reuse（再利用する）\n・-able（〜できる）：washable（洗える）、available（利用できる）\n・-ment（動詞→名詞）：agree → agreement、develop → development\n\nたとえば unbreakable を知らなくても、un＋break＋able＝「壊せない」と組み立てられます。\n\n選択肢に知らない単語があっても慌てない。パーツで意味を推測し、文のストーリーに合うかを確かめる——これで「知らない＝解けない」ではなくなります。',
    'Grade 2 options often include words you have not memorised — word parts save you. un- = not (unnecessary, unfair); re- = again (rebuild, reuse); -able = can be done (washable, available); -ment turns a verb into a noun (agree → agreement). Even an unknown word like “unbreakable” assembles itself: un + break + able = cannot be broken. Unknown no longer means unsolvable: build the meaning from parts, then test it against the sentence’s story.',
    'un + necessary → 「必要でない」\nre + use → 「再び使う」\nwash + able → 「洗える」\nagree + ment → 「合意」（名詞）',
  ),
  // 6. practice: 接頭辞
  q(
    '空所に入る語を選んでください。',
    'Tap water in this city is clean and safe to drink, so buying bottled water is almost (   ).',
    ['responsible', 'reusable', 'impressive', 'unnecessary'],
    3,
    '「水道水が安全なら、ペットボトルの水を買うことはほぼ不要」という流れ。un＋necessary＝「必要でない」で unnecessary が正解です。\n\nresponsible（責任がある）、reusable（再利用できる）、impressive（印象的な）はどれも文のストーリーに合いません。4語とも形容詞＝文法では絞れないタイプ。パーツの意味とストーリーで決めましょう。',
    'If tap water is safe, buying bottled water is “almost unnecessary” — un + necessary = not needed. The others (responsible, reusable, impressive) clash with the story. All four are adjectives, so grammar can’t narrow it; word parts and the story decide.',
  ),
  // 7. practice: 句動詞
  q(
    '空所に入る語を選んでください。',
    'The fire drill was carried (   ) exactly as planned, and all the workers left the building in less than five minutes.',
    ['on', 'up', 'out', 'over'],
    2,
    'carry out 〜（〜を実施する）の out が正解。「避難訓練は計画どおりに実施された」という、2級らしい少し改まった文です。\n\ncarry on（続ける）も実在しますが、as planned（計画どおりに）と相性がいいのは carry out。「計画・調査・実験を実施する」＝ carry out a plan / a survey / an experiment と、目的語ごと覚えておきましょう。',
    '“Carry out” (conduct, perform) — the drill was carried out as planned. “Carry on” (continue) exists, but “exactly as planned” pairs with carrying OUT a plan. Memorise the chunk with its objects: carry out a plan / a survey / an experiment.',
  ),
  // 8. practice: 語彙（ストーリーで決める）
  q(
    '空所に入る語を選んでください。',
    'After months of discussion, the two companies finally reached an (   ) about the new shopping center.',
    ['environment', 'agreement', 'instrument', 'movement'],
    1,
    '「何か月も話し合った末にたどり着くもの」＝合意なので agreement が正解。reach an agreement（合意に達する）はコロケーションとしても頻出です。\n\n4つとも -ment で終わる名詞、つまり文法でもパーツでも絞れません。最後に決めるのは文全体のストーリー——「全部入りそうに見えても、話の流れに合うのは1つだけ」が大問1の鉄則です。',
    'What do companies reach after months of discussion? An agreement — and “reach an agreement” is itself a high-frequency collocation. All four options are -ment nouns, so neither grammar nor word parts can separate them: the story of the sentence decides. Even when all four “fit,” only one tells the right story.',
  ),
  // 9. practice: 句動詞の産出（gap）
  gap(
    '空所に入る1語を入力してください。',
    'Because of the typhoon, the school decided to put (   ) the sports day until the end of the month.',
    ['off'],
    'put off 〜（〜を延期する）の off が正解です。「台風のせいで体育祭を月末まで延期した」という文でした。\n\n選べるだけでなく自分で書けるようになると、ライティングの意見文や面接でもそのまま使えます。句動詞は「読める」から「使える」へ。',
    '“Put off” (postpone) — off. The school postponed the sports day until the end of the month. Producing the chunk yourself (not just recognising it) means you can reuse it in the essay and the interview.',
  ),
]

// ── Lesson 2 読解：空所・Eメール・長文 ──────────────────────────────────────
const G2_READING = [
  // 1. cold-open: 長文の空所（つなぎ言葉）
  q(
    'まずは1問。本文の空所に入る語句を選んでください。',
    '【本文の一部】\nFor many years, the small town of Hillside had no train station, so few tourists visited. Last year, a new station finally opened. (    ), the number of visitors has almost doubled, and several new cafes have opened near the station.',
    ['However', 'For example', 'As a result', 'In other words'],
    2,
    '前の文は「駅がついに開業した」、後ろは「観光客がほぼ倍増し、カフェも増えた」。原因→結果の流れなので As a result（その結果）が正解です。\n\nHowever は流れが反対のとき、For example は具体例、In other words は言い換え。2級の大問2は、長文の空所にこうした「つなぎ言葉」やフレーズを入れる問題。空所の文だけでなく、前後の文の関係が答えを決めます。',
    'Before: the station finally opened. After: visitors doubled and cafes opened. Cause → effect, so “As a result.” “However” reverses, “For example” illustrates, “In other words” restates. In 大問2 the discourse — the relationship between the sentences before and after — decides the blank.',
  ),
  // 2. concept: 大問2の解き方
  con(
    '大問2：空所は「文と文の関係」で決まる',
    '大問2: the blank is decided by the discourse',
    '2級の大問2は長文の空所補充。パッセージが2つあり、それぞれに空所が3つ、計6問です。空所に入るのは「つなぎ言葉」か「文脈に合うフレーズ」。\n\n鉄則は、空所のある文だけで決めないこと。直前の文と直後の文を必ず読み、関係を判定します。\n\n・逆接（前と反対の流れ）→ However\n・因果（だから）→ Therefore ／ As a result\n・具体例 → For example\n・言い換え → In other words\n\nつなぎ言葉は段落のレールです。レールの向き（順方向か、反転か）さえつかめば、選択肢は一気に絞れます。\n\nフレーズ補充の場合も同じ。空所の後ろの文が、入れたフレーズの「続き」として自然につながるかを確かめましょう。',
    '大問2 gives TWO passages with three blanks each — six questions. The blank holds a connector or a phrase, and the rule is: never decide from the gapped sentence alone. Read the sentence before AND after, then judge the relationship: contrast → However; cause and effect → Therefore / As a result; illustration → For example; restatement → In other words. Connectors are the rails of a paragraph — find the direction (forward or reversed) and the options collapse. For phrase blanks, check that the NEXT sentence continues naturally from the phrase you chose.',
    '前の文 ⇄ 後ろの文 の関係を判定\n反転 → However ／ 因果 → Therefore\n例 → For example ／ 言い換え → In other words',
  ),
  // 3. concept: 大問3A Eメール
  con(
    '大問3A：Eメールはヘッダーから読む',
    '大問3A: read the e-mail header first',
    '大問3Aは Eメールの読解で、設問は3問。最初に読むのは本文ではなくヘッダー（From / To / Subject）です。誰が、誰に、何の用件で書いたのか——この3点を最初の5秒でつかむと、本文がぐっと読みやすくなります。\n\n2級のEメールは、仕事や地域活動など、少し大人の場面が増えます。読み方の鉄則は2つ。\n\n①設問を先に読み、何を探すか決めてから本文へ\n②設問の順番は本文の順番。設問1の答えは前半、設問3の答えは後半にあります\n\nそして正解の選択肢は、本文の言葉をそのまま使わず言い換えてあります。本文の単語をそのまま繰り返した選択肢は、むしろワナを疑いましょう。',
    '大問3A is an e-mail with three questions. Read the HEADER first — From / To / Subject tells you who is writing to whom about what in five seconds, and the body becomes far easier. Grade 2 e-mails lean adult: work, community, services. Two rules: read the questions before the body so you know what to hunt for, and trust that question order follows text order — question 1 lives in the first part, question 3 near the end. Correct options PARAPHRASE the text; a word-for-word echo is usually a trap.',
  ),
  // 4. practice: フレーズ補充
  q(
    '本文の空所に入る語句を選んでください。',
    '【本文の一部】\nLast spring, students at Aoba High School started growing vegetables on the school roof. At first, they simply wanted to make use of the empty space. However, the project soon (    ). Local restaurants began to buy the vegetables, and the students now use the money to buy seeds and tools for the next season.',
    [
      'had to be stopped for safety reasons',
      'brought the students an unexpected benefit',
      'made the students lose interest in farming',
      'needed too much money to continue',
    ],
    1,
    '空所の後ろを読むと「レストランが野菜を買い始め、その収入で種や道具を買っている」——つまり良い展開です。(B)「思いがけない利益をもたらした」が正解。\n\n(A)(C)(D)はどれも悪い展開で、直後の文と逆向きになってしまいます。フレーズ補充は、入れたフレーズの「続き」として後ろの文が自然かどうかで判定——前後を読む鉄則はつなぎ言葉と同じです。',
    'After the blank: restaurants buy the vegetables and the money funds next season — a positive turn, so (B) “an unexpected benefit.” The other three are negative turns that contradict the next sentence. For phrase blanks, test whether the following sentence continues naturally from your choice — same before-and-after rule as connectors.',
  ),
  // 5. practice: Eメール
  q(
    'Eメールを読んで、設問に答えてください。',
    '【Eメール】\nFrom: Karen Lee\nTo: Daniel Brown\nSubject: Photography contest\n\nDear Daniel,\nI am writing to you about the Westville Photography Contest. You entered it last year, didn’t you? This year, I am one of the organizers, and we are still looking for a few more judges. Since you have won several prizes for your photos, I thought you would be perfect. The judging will take place on March 12. We cannot pay you, but lunch will be provided, and your name will appear in the contest program. Could you let me know by Friday?\nBest regards,\nKaren\n\nQ: Why did Karen write to Daniel?',
    [
      'To tell him that he won a prize in a contest.',
      'To invite him to enter this year’s contest.',
      'To ask him about the date of the contest.',
      'To ask him to help judge a photography contest.',
    ],
    3,
    'ヘッダーと本文前半から、用件は we are still looking for a few more judges ＋ I thought you would be perfect——つまり審査員の依頼です。(D)が正解。\n\n(A)は「過去に受賞歴がある」という背景の誤読、(B)は「去年出場した」の誤読です。entered や prizes など本文の単語を含む選択肢ほど注意。正解の(D)は help judge と言い換えています。',
    'The header plus the opening give the purpose: “we are still looking for a few more judges… I thought you would be perfect” — she is asking him to JUDGE, (D). (A) misreads his past prizes; (B) misreads “you entered it last year.” Note how the wrong options echo words from the text (entered, prizes) while the correct one paraphrases (“help judge”).',
  ),
  // 6. concept: 大問3B 説明文
  con(
    '大問3B：1段落に1つの仕事',
    '大問3B: one paragraph, one job',
    '大問3Bは説明文の読解で、設問は5問。リーディング31問の最後を締めくくる、いちばん長い問題です。\n\n読み方の核は「1段落に1つの仕事」。筆者は段落ごとに役割を分けて書いています——①話題の紹介 → ②問題点 → ③解決の試み → ④結果、のように。各段落の最初の文（トピックセンテンス）が、その段落の仕事を教えてくれます。\n\n設問は本文の段落の順番どおりに進みます。設問1は第1段落、最後の設問は最終段落か全体について。だから「設問を読む → 該当する段落を探す → その段落の中で根拠を見つける」が最短ルートです。\n\n正解は必ず言い換え。more than 90 percent → most のような数字の言い換えも頻出です。',
    '大問3B is the expository passage — five questions, the longest task of the 31-question Reading section. The core idea: ONE PARAGRAPH, ONE JOB. Writers assign each paragraph a role — introduce the topic → present a problem → attempt a solution → report the result — and the topic sentence announces it. Questions follow paragraph order: question 1 maps to paragraph 1, the last question to the final paragraph or the whole text. So the shortest route is question → matching paragraph → evidence inside it. Correct options always paraphrase, numbers included (more than 90 percent → most).',
    '設問1 → 第1段落あたり\n設問5 → 最終段落 or 全体\n段落の最初の文＝その段落の仕事',
  ),
  // 7. practice: 説明文①
  q(
    '本文を読んで、設問に答えてください。',
    '【本文の一部】\nA “repair cafe” is a free community event where people bring broken items, such as toasters, clothes, and bicycles, and volunteers help fix them. The first repair cafe was held in Amsterdam in 2009 by a woman who was worried that too many usable things were being thrown away.\n\nThe idea has since spread to many countries. At a repair cafe in Kobe, about 60 percent of the items brought in are successfully fixed. Visitors say they enjoy not only saving their belongings but also talking with the volunteers, and some have even started learning repair skills themselves.\n\nQ: Why did a woman in Amsterdam start the first repair cafe?',
    [
      'She thought too many things that could still be used were thrown away.',
      'She wanted to sell her old toasters and bicycles.',
      'She needed volunteers for her own cafe business.',
      'She hoped to teach people how to make new products.',
    ],
    0,
    '第1段落の最後、worried that too many usable things were being thrown away が根拠。usable → could still be used と言い換えた(A)が正解です。\n\n設問1の答えが第1段落にある——「設問の順番＝本文の順番」のとおりですね。(B)(C)(D)は本文にない動機です。',
    'Paragraph 1 ends with the evidence: “worried that too many usable things were being thrown away,” paraphrased as “things that could still be used” — (A). Question 1, paragraph 1: order preserved. The other motives never appear in the text.',
  ),
  // 8. practice: 説明文②
  q(
    '同じ本文の続きの設問です。',
    '【本文の一部】\nA “repair cafe” is a free community event where people bring broken items, such as toasters, clothes, and bicycles, and volunteers help fix them. The first repair cafe was held in Amsterdam in 2009 by a woman who was worried that too many usable things were being thrown away.\n\nThe idea has since spread to many countries. At a repair cafe in Kobe, about 60 percent of the items brought in are successfully fixed. Visitors say they enjoy not only saving their belongings but also talking with the volunteers, and some have even started learning repair skills themselves.\n\nQ: What is one thing visitors to the repair cafe in Kobe say?',
    [
      'Most of the items they bring cannot be fixed.',
      'They have to pay the volunteers for each repair.',
      'They like chatting with the volunteers there.',
      'Learning repair skills is too difficult for them.',
    ],
    2,
    '第2段落の they enjoy … talking with the volunteers が根拠。enjoy talking → like chatting と言い換えた(C)が正解です。\n\n(A)は逆（約60%は直る）、(B)は free イベントなので誤り、(D)も逆（自分で技術を学び始めた人もいる）。設問2の答えは第2段落——順番どおり、そして正解は言い換え、でした。',
    'Paragraph 2: “they enjoy not only saving their belongings but also talking with the volunteers” → “like chatting” — (C). (A) reverses the 60 percent success, (B) contradicts “free,” (D) reverses the visitors who STARTED learning skills. Question 2, paragraph 2 — and the answer paraphrases.',
  ),
  // 9. recap
  con(
    'まとめ：談話のレールと段落の仕事',
    'Recap: the rails of discourse, the jobs of paragraphs',
    '・大問2の空所は前後の文の関係で決める（因果→As a result、反転→However、例→For example）\n\n・フレーズ補充は「後ろの文が自然に続くか」でチェック\n\n・Eメールはヘッダーから。設問を先に読み、順番どおりに探す\n\n・説明文は「1段落に1つの仕事」。設問は段落の順番どおり\n\n・正解は言い換え。本文の単語そのままの選択肢はワナを疑う\n\n次のレッスンは、ライティング。2024年から加わった要約問題と、意見文の型を手に入れます。',
    '• 大問2 blanks: judge the before-and-after relationship (cause → As a result, reversal → However, illustration → For example).\n\n• Phrase blanks: does the next sentence continue naturally?\n\n• E-mails: header first; read the questions, then hunt in order.\n\n• Expository: one paragraph, one job; questions follow paragraph order.\n\n• Correct answers paraphrase; word-for-word echoes are suspects.\n\nNext lesson: Writing — the summary task new since 2024, and the opinion essay.',
  ),
]

// ── Lesson 3 ライティング：要約と意見文 ─────────────────────────────────────
const G2_WRITING = [
  // 1. cold-open: 主張と具体例を見分ける
  q(
    'まずは1問。この短い文章の「いちばん言いたいこと（主張）」はどれでしょう？',
    '【本文の一部】\nMore and more people in Japan are choosing to work from home. For example, one IT company in Osaka now lets its workers come to the office only twice a week. Working from home saves traveling time and helps people balance work and family life.',
    [
      'One IT company in Osaka lets its workers come to the office only twice a week.',
      'More and more people in Japan are choosing to work from home.',
      'Office buildings in big cities are becoming less crowded.',
    ],
    1,
    '主張は第1文「在宅勤務を選ぶ人が増えている」。(B)が正解です。(A)の大阪のIT企業は For example が示すとおり具体例、(C)はそもそも本文に書かれていません。\n\n2級ライティングの1問目は要約問題（2024年からの新形式）。約150語の文章を45〜55語にまとめます。要約の第一歩は、まさに今やったこと——どれが主張で、どれが例かを見分けることです。',
    'The claim is sentence 1: more people are working from home — (B). The Osaka company is an EXAMPLE (announced by “For example”), and (C) is never stated. Writing task 1 at Grade 2 is the summary (new since 2024): compress a ~150-word passage into 45–55 words. Step one is exactly what you just did — separate the claim from the examples.',
  ),
  // 2. concept: 要約の型
  con(
    '要約：残すのは主張と理由、削るのは例と数字',
    'The summary: keep claims and reasons, cut examples and numbers',
    '要約問題の条件は45〜55語。約150語の文章を3分の1にするのですから、「何を残し、何を削るか」がすべてです。\n\n残すもの：\n・主張（文章がいちばん言いたいこと）\n・主な理由・利点・問題点（たいてい2つ）\n\n削るもの：\n・具体例（For example の後ろ）\n・数字・年号・固有名詞のディテール\n・エピソードや細かい描写\n\nそして残した内容は、自分の言葉で言い換えること。本文の文をそのまま写すと減点対象です。動詞や名詞を別の語に置き換える、2文を1文にまとめる——この2つが基本テクニックです。\n\n最後にもうひとつ大事なルール：自分の意見は書かない。要約は「筆者の言ったこと」だけの世界です。',
    'The summary allows 45–55 words for a ~150-word passage — a third of the length, so everything depends on keep vs. cut. KEEP the claim and the main reasons, advantages or problems (usually two). CUT the examples (everything after “For example”), the numbers, years and names, and the anecdotes. Then PARAPHRASE what you keep: copying whole sentences loses points — swap the verbs and nouns, merge two sentences into one. And one more law: NO opinions of your own. A summary contains only what the writer said.',
    '残す → 主張＋理由（2つ）\n削る → 例・数字・固有名詞\n言い換える → 丸写しは減点\n自分の意見 → 書かない',
  ),
  // 3. practice: 良い要約文を選ぶ
  q(
    '次の本文の一部を要約します。要約の1文として最も適切なのはどれでしょう？',
    '【本文の一部】\nElectric bicycles are becoming popular among older people who live in hilly towns. Riders can climb steep streets without getting tired, and they do not need a driver’s license to use one.\n\nWhich sentence works best in a summary?',
    [
      'Electric bicycles are becoming popular among older people who live in hilly towns, and riders can climb steep streets without getting tired.',
      'I think electric bicycles are wonderful, so every older person should buy one soon.',
      'Older people in hilly areas like electric bicycles because riding them is easy and requires no license.',
    ],
    2,
    '(C)が正解。主張と2つの理由を残しつつ、popular → like、without getting tired → easy、do not need a driver’s license → requires no license と自分の言葉に言い換えています。\n\n(A)は本文をほぼ丸写しでつないだだけ——内容は正しくても言い換えの得点が取れません。(B)は I think と自分の意見を足してしまっています。要約に意見は禁物です。',
    '(C) keeps the claim and both reasons while paraphrasing: popular → like, without getting tired → easy, no driver’s license → requires no license. (A) is two sentences copied almost word for word — accurate but unrewarded. (B) smuggles in an opinion (“I think… should buy one”), which a summary must never do.',
  ),
  // 4. practice: 削るものを見抜く
  q(
    'この本文を45〜55語に要約するとき、削るべき部分はどれでしょう？',
    '【本文の一部】\nCity libraries are lending more e-books than ever. For example, the library in Midori City lent over 12,000 e-books last year. E-books are convenient because people can borrow them at any time without visiting the library, and the library never runs out of copies.\n\nWhich part should you CUT from your summary?',
    [
      'The example of Midori City and its 12,000 e-books.',
      'The fact that libraries are lending more e-books.',
      'The reasons why e-books are convenient.',
    ],
    0,
    '削るのは(A)の具体例です。For example の後ろにある固有名詞（Midori City）と数字（12,000）は、要約では真っ先に削る素材。\n\n(B)は文章の主張そのもの、(C)は主張を支える理由なので、どちらも残します。「主張と理由を残し、例と数字を削る」——要約の取捨選択はこの一行に尽きます。',
    'Cut (A): the example after “For example,” with its proper noun (Midori City) and number (12,000), is the first thing a summary drops. (B) is the claim itself and (C) the supporting reasons — both stay. Keep claims and reasons; cut examples and numbers.',
  ),
  // 5. concept: 意見文の型
  con(
    '意見文：80〜100語、賛成か反対か＋理由2つ',
    'The opinion essay: 80–100 words, agree or disagree + two reasons',
    'ライティング2問目は意見文。与えられたTOPIC（〜すべきだ、〜が増えるだろう等）に賛成か反対かを決め、理由2つを添えて80〜100語で書きます。試験時間はライティング全体で約30分。要約に時間を取られすぎないよう、意見文は型で素早く書きましょう。\n\n型は4部構成です。\n\n①導入＋立場：I agree with the idea that 〜. ／ I do not think that 〜.\n②理由1：First, 〜.（＋補足をもう1文）\n③理由2：Second, 〜.（＋補足をもう1文）\n④結論：In conclusion, I believe that 〜.（立場の再確認）\n\n80〜100語は意外と長いので、各理由に「補足の1文」（具体的な説明や身近な例）を必ず足すのがコツ。それでも足りなければ、結論の前に For these reasons を入れて1文を厚くします。',
    'Task 2 is the opinion essay: agree or disagree with the printed TOPIC, two reasons, 80–100 words — and the whole Writing section runs about 30 minutes, so the essay must come out of a template, fast. Four parts: ① position (“I agree with the idea that…” / “I do not think that…”), ② First, + reason 1 + one supporting sentence, ③ Second, + reason 2 + one supporting sentence, ④ In conclusion, restate the position. 80–100 words is longer than it looks: the supporting sentence after each reason (an explanation or everyday example) is what carries you into range.',
    '①I agree with the idea that 〜.\n②First, 〜. ＋補足1文\n③Second, 〜. ＋補足1文\n④In conclusion, I believe that 〜.',
  ),
  // 6. practice: 型の組み立て（drag）
  drag(
    '意見文の骨格を完成させてください。',
    'TOPIC: More people should use public transportation instead of cars.',
    '___ with the idea that more people should use public transportation. I have two reasons. ___ , trains and buses produce less CO2 than cars, so they are better for the environment. ___ , people can read or rest while they travel. ___ , I believe more people should use public transportation.',
    ['I agree', 'First', 'Second', 'In conclusion', 'However', 'For example', 'I am not sure'],
    ['I agree', 'First', 'Second', 'In conclusion'],
    '立場 → First → Second → 結論、の順です。However（逆接）は骨格には不要、For example は理由の補足1文の中で使うもの、I am not sure は立場を曖昧にするので意見文では禁物です。\n\nこの骨格を暗記すれば、本番ではTOPICに合わせて中身を入れ替えるだけ。型が時間を生み、生まれた時間が要約に回せます。',
    'Position → First → Second → In conclusion. “However” has no place in the skeleton, “For example” belongs inside a supporting sentence, and “I am not sure” fatally blurs your position. Memorise the frame — on test day you only swap the content, and the minutes you save go to the summary.',
  ),
  // 7. practice: 理由の質
  q(
    'TOPIC: High school students should do volunteer work. — 賛成の立場で、意見を最も強く支える理由はどれでしょう？',
    'You agreed with the topic. Which reason supports your position best?',
    [
      'Some of my friends say volunteer work sounds boring.',
      'Volunteer work teaches students skills they cannot learn in the classroom.',
      'Volunteer work means working without receiving any money.',
    ],
    1,
    '(B)が正解。「教室では学べないスキルが身につく」は、高校生がボランティアを「すべき」理由を直接説明しています。\n\n(A)は友達の感想で、むしろ反対方向。(C)はボランティアの定義という単なる事実で、「すべきだ」の根拠になっていません。理由の合格条件はただひとつ——立場と論理でつながっていることです。',
    '(B) directly explains why students SHOULD volunteer: skills unavailable in class. (A) is a friend’s impression pointing the wrong way; (C) is a definition — a fact with no argumentative force. A reason passes one test only: does it logically support your position?',
  ),
  // 8. concept: 減点ポイント
  con(
    '減点ポイント：丸写し・意見混入・語数',
    'Where points are lost: copying, smuggled opinions, length',
    'ライティングで点を落とす原因は、英語力よりも条件違反です。タスク別に整理しましょう。\n\n要約でやりがちなミス：\n・本文の文をそのまま写す（言い換えゼロ）\n・自分の意見や感想を足す\n・具体例や数字を残して語数を圧迫する\n\n意見文でやりがちなミス：\n・理由が1つしかない、または立場とつながらない理由\n・TOPICと違う話題にずれる\n・語数オーバー／不足\n\nどちらも、書き終えたら語数を数えること（要約45〜55語、意見文80〜100語）。難しい単語は要求されていません。型＋確実な英語＋条件の遵守——2級ライティングの勝ち筋はこの3つです。',
    'Most lost points are broken conditions, not weak English. Summary sins: copying sentences verbatim, adding your own opinion, keeping examples and numbers that eat the word count. Essay sins: one reason only (or one that doesn’t support the position), drifting off the TOPIC, word counts out of range. For both tasks, count your words when you finish — 45–55 for the summary, 80–100 for the essay. Difficult vocabulary is not required; the winning formula is the templates + accurate simple English + conditions met.',
  ),
  // 9. practice: つなぎ語の産出（gap）
  gap(
    '前の文と反対の流れを作る「逆接のつなぎ語」を、1語で入力してください。',
    'Trains in this city are fast and convenient. (   ), they are very crowded in the morning, so some people choose to drive instead.',
    ['However', 'Nevertheless', 'Nonetheless', 'Still', 'Yet'],
    'However（しかしながら）が代表的な答えです（Nevertheless や Still なども正解）。「速くて便利」→「しかし朝は混雑」と、流れを反転させる1語でした。\n\n逆接のつなぎ語は、意見文で反対意見に触れるときにも、要約で「利点→問題点」の転換を1語で済ませたいときにも効きます。書けるレベルにしておきましょう。',
    '“However” is the model answer (Nevertheless, Still and others also work): fast and convenient → BUT crowded. A contrast connector earns its keep everywhere — acknowledging the other side in the essay, or pivoting from advantages to problems in one word in the summary.',
  ),
  // 10. recap
  con(
    'まとめ：要約45〜55語、意見文80〜100語',
    'Recap: summary 45–55 words, essay 80–100 words',
    '・要約は45〜55語。主張と理由を残し、例・数字・固有名詞を削る\n\n・残した内容は言い換える。丸写しと自分の意見はNG\n\n・意見文は80〜100語。立場 → First → Second → In conclusion\n\n・理由は立場を支えるものだけ。補足の1文で語数を稼ぐ\n\n・書き終えたら語数を数え、条件を確認\n\n次のレッスンは、リスニング第1部・第2部。質問が音声で読まれる形式に慣れます。',
    '• Summary: 45–55 words; keep the claim and reasons, cut examples, numbers and names.\n\n• Paraphrase what you keep; never copy, never add opinions.\n\n• Essay: 80–100 words; position → First → Second → In conclusion.\n\n• Reasons must support the position; the supporting sentence fills the word count.\n\n• After writing: count words, check the conditions.\n\nNext lesson: Listening Parts 1 and 2 — where the question itself is spoken.',
  ),
]

// ── Lesson 4 リスニング：第1部・第2部 ───────────────────────────────────────
const G2_LISTENING = [
  // 1. concept: 第1部の形式
  con(
    '第1部：質問は音声、選択肢は紙の上',
    '第1部: the question is spoken, the options are printed',
    '2級リスニングは30問。第1部は会話が15問です。会話（3〜6往復）が流れたあと、最後に質問が音声で読まれます。紙に印刷されているのは4つの選択肢だけ。\n\n選択肢が印刷されている＝先読みできる、ということ。会話が始まる前に選択肢に目を走らせれば、質問の種類が予想できます。\n\n・選択肢が全部「行動」→ 誰かが何をする（した）かが聞かれる\n・全部「理由」っぽい文 → Why が来る\n・全部「時・場所」→ When ／ Where が来る\n\nそして大原則がひとつ。会話の結論は最後の発言で決まります。前半で「無理かも」と言っていても、最後に「やっぱり行く」と変われば、答えは最後の方。さらに、正解の選択肢は会話の表現をそのまま使わず言い換えてあります。',
    'Grade 2 Listening has 30 questions; Part 1 is 15 conversations of three to six turns, with the QUESTION spoken at the end. Only the four options are printed — which means you can preview. Scan them before the audio: all actions → a what-will-she-do question; reason-shaped sentences → Why; times and places → When/Where. Two laws: conclusions live in the LAST turns (an early “maybe I can’t” often flips at the end), and the correct option PARAPHRASES the audio rather than echoing it.',
    '選択肢が行動 → What will 〜 do?\n選択肢が理由 → Why 〜?\n選択肢が時・場所 → When ／ Where?',
  ),
  // 2. practice: 第1部
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Hello, Bayside Hotel. How can I help you?\nM: Hi. I have a reservation for this Saturday, but my business trip has been moved to next week. Could I change my stay to next Saturday instead?\nW: Let me check... yes, that’s no problem. The same type of room, a single with an ocean view?\nM: Yes, please. Thank you so much.\nQuestion: Why is the man calling the hotel?',
    [
      'To cancel his trip to the hotel.',
      'To change the date of his reservation.',
      'To ask about the price of a single room.',
      'To book a room with a different view.',
    ],
    1,
    '用件は Could I change my stay to next Saturday instead? ——予約の日付変更なので(B)が正解。change my stay → change the date of his reservation と言い換えられています。\n\n(A)キャンセルではなく変更、(C)料金の話は出てこない、(D)部屋のタイプは「同じ」です。先読みで「目的を聞かれそう」と構えられたかがポイントでした。',
    '“Could I change my stay to next Saturday instead?” — a date change, (B), with “change my stay” paraphrased as “change the date of his reservation.” He is not cancelling (A), price never comes up (C), and the room stays the same (D). Previewing the options tells you a purpose question is coming.',
  ),
  // 3. practice: 第1部
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'M: Hi, Sarah. Are you still looking for someone to take care of your plants while you’re in Okinawa?\nW: Yes! Are you offering, Mike?\nM: Sure. I live just across the street, so it’s no trouble. How often do they need water?\nW: Just twice a week. I’ll leave a note in the kitchen with everything you need to know.\nM: Perfect. Have a great trip!\nQuestion: What will the man do while the woman is away?',
    [
      'Stay at her house in Okinawa.',
      'Leave a note in her kitchen.',
      'Move to an apartment across the street.',
      'Water her plants twice a week.',
    ],
    3,
    '男性が引き受けたのは植物の世話。女性の Just twice a week と合わせて、(D)「週2回、植物に水をやる」が正解です。\n\n沖縄に行くのは女性(A)、メモを残すのも女性(B)、across the street は男性がもう住んでいる場所(C)。会話に出てきた語を「誰のことか」を入れ替えて作るのが誤答の定番——主語に注意して聞きましょう。',
    'The man takes on the plant care, and the woman says “just twice a week” — (D). She is the one going to Okinawa (A) and leaving the note (B), and he already lives across the street (C). Wrong options recycle real words with the WRONG person attached — track who does what.',
  ),
  // 4. concept: 第2部の形式
  con(
    '第2部：60〜90語のモノローグを聞く',
    '第2部: monologues of 60–90 words',
    '第2部は15問。今度は会話ではなく、1人の話し手によるモノローグです。長さは60〜90語ほどで、ある人物の話、説明文、アナウンスなどが読まれ、最後に質問が音声で流れます。選択肢は第1部と同じく紙に印刷されています。\n\n攻略の柱は2つ。\n\n①先読み。選択肢から話題と質問を予想してから聞く\n②数字はラベルごと聞き取る。モノローグには時刻・割合・回数が複数登場し、質問はそのうち1つだけを指します。「60%＝直った割合」「週2回＝水やり」のように、数字と「何の数字か」をセットでメモしましょう\n\nそして第1部と同じく、正解の選択肢は音声の表現を言い換えてあります。音声と同じ単語が聞こえた選択肢に飛びつかないこと。',
    'Part 2 is 15 monologues — a single speaker, 60–90 words: a story about a person, an explanation, an announcement — with the question spoken at the end and the four options printed. Two pillars: preview the options to predict the topic and question, and track every number WITH its label — the audio scatters times, percentages and frequencies, and the question picks exactly one. As always, the correct option paraphrases; don’t leap at the option that repeats a word you heard.',
    '数字を聞いたら →「何の数字か」をセットで\n音声と同じ単語の選択肢 → まずワナを疑う',
  ),
  // 5. practice: 第2部
  qa(
    'モノローグと質問を聞いて、答えを選んでください。',
    'Listen to the passage and the question.',
    'Kenji works for a small company that makes wooden furniture. Last year, the company started selling its products online. At first, Kenji was worried because he had never used a computer for his work. However, his daughter showed him how to take attractive photos of the furniture, and the online shop is now doing well. Kenji is even thinking of starting a video channel about furniture making.\nQuestion: Why was Kenji worried at first?',
    [
      'He had no experience of using a computer for work.',
      'His company stopped making wooden furniture.',
      'His daughter did not like his photos.',
      'The online shop was not selling anything.',
    ],
    0,
    'he had never used a computer for his work が根拠。never used → had no experience of using と言い換えた(A)が正解です。\n\nAt first … However … now という時間の流れに注意。質問の at first は「最初の心配」を指しています。(C)(D)は However の後ろの「うまくいった」展開と矛盾します。',
    '“He had never used a computer for his work” → “had no experience of using a computer” — (A). Note the timeline: At first… However… now. The question pins the FIRST stage; (C) and (D) contradict the success that follows “However.”',
  ),
  // 6. practice: 第2部
  qa(
    'アナウンスと質問を聞いて、答えを選んでください。',
    'Listen to the announcement and the question.',
    'Every July, the city of Kitahama holds a beach cleanup event. Last year, more than three hundred people joined and collected about two hundred bags of garbage. This year, the city hopes that more young people will take part, so volunteers under the age of twenty will receive free movie tickets. The event will be held on the second Sunday of July, starting at nine in the morning.\nQuestion: How will the city try to attract more young volunteers this year?',
    [
      'By moving the event to a movie theater.',
      'By starting the cleanup later in the morning.',
      'By giving them free movie tickets.',
      'By collecting three hundred bags of garbage.',
    ],
    2,
    'volunteers under the age of twenty will receive free movie tickets が根拠で、(C)が正解。receive → giving them と、視点を変えた言い換えです。\n\nこのアナウンスには300人・200袋・20歳・9時と数字が4つ登場しますが、質問が指すのは「若者を増やす方法」だけ。数字をラベルごと聞き分ける練習台のような問題でした。',
    '“Volunteers under the age of twenty will receive free movie tickets” — (C), reworded from receive to give. The announcement scatters four numbers (300 people, 200 bags, age 20, 9 a.m.), but the question asks only about attracting the young. Numbers with labels — that is the whole game.',
  ),
  // 7. practice: 第1部（応用）
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'M: Excuse me. I think I left my umbrella on the ten o’clock train from Sakura Station. It’s dark blue with a white handle.\nW: Let me check with the lost-and-found office... You’re in luck. A dark blue umbrella was turned in from that train. It’s at the office on the second floor.\nM: Great! Can I pick it up now?\nW: Yes, but please bring something that shows your name and address.\nQuestion: What does the woman tell the man to do?',
    [
      'Wait for the next train from Sakura Station.',
      'Buy a new umbrella on the second floor.',
      'Call the lost-and-found office tomorrow.',
      'Show something with his name and address on it.',
    ],
    3,
    '最後の発言 please bring something that shows your name and address が根拠。(D)が正解です。\n\n指示・依頼は会話の最後に来るのが定番——「結論は最後の発言」の法則どおりですね。(B)(C)は second floor、lost-and-found という聞こえた語を使ったワナです。',
    'Her final line — “please bring something that shows your name and address” — is the instruction, (D). Requests and instructions live in the last turn, exactly where conclusions live. (B) and (C) recycle heard words (second floor, lost-and-found) into traps.',
  ),
  // 8. practice: 第1部（応用）
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Tom, are you free on Saturday afternoon? The community center needs volunteers for the children’s science fair.\nM: That sounds interesting. What would I have to do?\nW: You’d help the kids with their experiments and clean up afterwards. It’s from one to five.\nM: Hmm, I have a guitar lesson until noon... but I can come after that.\nW: Perfect! I’ll put your name on the volunteer list.\nQuestion: What will Tom do on Saturday afternoon?',
    [
      'Help children at a science fair.',
      'Take a guitar lesson at the community center.',
      'Make a list of volunteers for the woman.',
      'Teach science at an elementary school.',
    ],
    0,
    '迷いながらも最後に I can come after that と引き受けたので、(A)が正解。土曜の午後は科学フェアの手伝いです。\n\nギターのレッスンは正午まで＝午前(B)。リストに名前を載せるのは女性(C)。「予定が2つ出てきて、質問はどちらか一方を指す」——時間のラベルと最後の発言、両方が効く問題でした。',
    'Despite the hesitation, his final “I can come after that” seals it — (A). The guitar lesson ends at noon, so it is his MORNING (B); the woman, not Tom, writes the list (C). Two plans in one dialogue, one asked — the time labels and the last turn decide together.',
  ),
  // 9. recap
  con(
    'まとめ：先読み、最後の発言、ラベル付きの数字',
    'Recap: preview, last turns, labelled numbers',
    '・第1部は会話15問、第2部はモノローグ15問。質問は最後に音声で\n\n・選択肢は印刷されている＝先読みで質問を予想\n\n・結論・指示・決定は最後の発言に来る\n\n・数字・時刻はラベルごと聞き取る（何の数字？誰の予定？）\n\n・正解は言い換え。聞こえた単語そのままの選択肢はワナを疑う\n\n次のレッスンは、スピーキング。面接の流れと、3コマイラストのナレーションです。',
    '• Part 1: 15 conversations; Part 2: 15 monologues — the question is spoken at the end.\n\n• Printed options = preview and predict the question.\n\n• Conclusions, instructions and decisions live in the last turns.\n\n• Track numbers and times WITH their labels — whose plan, which figure?\n\n• Correct options paraphrase; echoed words are suspects.\n\nNext lesson: Speaking — the interview flow and the three-panel narration.',
  ),
]

// ── Lesson 5 スピーキング：面接の型 ─────────────────────────────────────────
// Screens 6 and 7 (drag + gap) are about the three-panel story card and get
// an illustration attached later — see supabase/EIKEN-COURSE-IMAGES.md.
// They read fine without the image (the panels are described in the prompt).
const G2_SPEAKING = [
  // 1. concept: 面接の流れと音読
  con(
    '面接の流れと音読：意味のかたまりで読む',
    'The interview flow — and reading aloud in chunks',
    '2級の二次試験は面接です。流れは固定：入室とあいさつ → カードの黙読（20秒）→ 音読（約60語のパッセージ）→ パッセージについての質問（No.1）→ 3コマイラストのナレーション（No.2）→ あなたの意見を聞く質問（No.3・No.4）。\n\n音読のコツは3つ。\n\n①意味のかたまりで区切る（Today, / many people / use smartphones / to pay for shopping.）。カンマとピリオドで必ず息継ぎを\n②文末より文の中身を立てる。大事な名詞・動詞を少し強く、ゆっくり\n③知らない単語が出ても止まらない。それらしく読んで先へ\n\n採点には「アティチュード（積極的にコミュニケーションをとる態度）」も含まれます。沈黙がいちばんの敵。完璧な発音より、止まらない英語です。',
    'The Grade 2 interview is fixed: greetings → 20 seconds’ silent reading → read the ~60-word passage aloud → a question about the passage (No.1) → narrate the three-panel illustration (No.2) → two opinion questions (No.3 and No.4). Reading aloud: chunk by meaning and breathe at commas and periods; give the key nouns and verbs a little extra weight, slowly; and never stop at an unknown word — best-guess it and move on. Attitude is scored too: silence is the enemy, and unstopping English beats perfect pronunciation.',
    'Today, / many people / use smartphones / to pay for shopping.\n（区切り＝息継ぎポイント）',
  ),
  // 2. practice: 音読のしかた
  q(
    '音読のしかたとして最も良いのはどれでしょう？',
    'Which is the best way to read the passage aloud?',
    [
      'Read as fast as possible to show your fluency.',
      'Read every word with exactly the same strength.',
      'Read in meaning chunks, pausing at commas and periods.',
    ],
    2,
    '(C)が正解。意味のかたまりごとに区切り、カンマとピリオドで一呼吸——これが「伝わる音読」です。\n\n(A)の早口は減点のもと。速さは流暢さではありません。(B)のように全部の単語を同じ強さで読むと、英語らしいリズムが消えてしまいます。ゆっくり、はっきり、かたまりで。',
    '(C). Chunk by meaning, pause at the punctuation — that is a reading that communicates. Speed (A) is not fluency and costs points; equal stress on every word (B) flattens the rhythm of English. Slow, clear, in chunks.',
  ),
  // 3. concept: No.1 パッセージの質問
  con(
    'No.1：答えはカードの中、by doing so がサイン',
    'No.1: the answer is on the card — “by doing so” is the signal',
    '音読のあとの No.1 は、カードのパッセージについての質問。How 〜? か Why 〜? の形で来ます。\n\n答えは必ずカードの中にあります。2級のカードには by doing so（そうすることで）や in this way（このようにして）という表現がよく出てきて、質問はたいていこの周辺を狙います。\n\nカード：Some supermarkets have started using paper packages, and by doing so they reduce plastic waste.\n質問：How do some supermarkets reduce plastic waste?\n答え：By using paper packages.\n\nコツは2つ。How なら By 〜ing で、Why なら Because で文を始めること。そして主語は代名詞（they など）に変えること。カードの文を頭から丸読みすると「質問に答えていない」印象になります。聞かれた部分だけを切り出しましょう。',
    'No.1 asks about the card’s passage, as How…? or Why…?. The answer is always ON the card, and Grade 2 cards plant signals: “by doing so” and “in this way” — the question usually aims right there. Card: “…and by doing so they reduce plastic waste.” Question: “How do some supermarkets reduce plastic waste?” Answer: “By using paper packages.” Two habits: open with “By -ing” for How and “Because” for Why, and pronoun-ise the subject. Reading the whole sentence from the top sounds like not answering — carve out just the asked part.',
    'How 〜? → By 〜ing …\nWhy 〜? → Because 〜\n主語は they ／ it に置き換える',
  ),
  // 4. practice: No.1 の答え方
  q(
    'カードの文：Some supermarkets have started using paper packages, and by doing so they reduce plastic waste. ／ 質問：How do some supermarkets reduce plastic waste? — 最も良い答えはどれでしょう？',
    'Choose the best answer to the examiner’s question.',
    [
      'By using paper packages.',
      'Some supermarkets have started using paper packages.',
      'I think plastic waste is a serious problem.',
    ],
    0,
    '(A)が正解。by doing so の指す内容（using paper packages）を、By 〜ing の形で切り出しています。\n\n(B)はカードの文の丸読みで、How への答えの形になっていません。(C)は自分の意見——それは No.3・No.4 で聞かれます。No.1 はカードの内容を答える問題です。',
    '(A) carves out exactly what “by doing so” points to, in the By -ing shape the question asks for. (B) reads the card from the top without answering How; (C) is an opinion — save it for No.3 and No.4. No.1 is about the card, nothing else.',
  ),
  // 5. concept: No.2 3コマのナレーション
  con(
    'No.2：3コマを過去形でつなぐ',
    'No.2: narrate the three panels in the past tense',
    'No.2 は3コマイラストのナレーション。カードに最初の1文が印刷されていて（例：One day, Yuki was walking home from school.）、20秒の準備のあと、3コマの物語を自分の言葉で語ります。\n\n型は3つだけ。\n\n①印刷された1文から始める（必ず読み上げる）\n②全部過去形で話す（saw / found / took——現在形に戻らない）\n③コマの切り替えに「時のつなぎ語」を置く：One day → Then ／ A few minutes later → In the end ／ Finally\n\n1コマにつき2文が目安。「誰が何をした」＋「様子や気持ち」を添えれば十分です。吹き出しや矢印の中の情報（〜しようと思っている等）も忘れずに言葉にしましょう。',
    'No.2 is the three-panel narration. The first sentence is printed on the card (e.g. “One day, Yuki was walking home from school.”); after 20 seconds’ preparation you tell the story of the three panels. Three rules: start from the printed sentence (read it aloud), keep everything in the PAST tense (saw / found / took — never drift back to present), and hinge the panels with sequence phrases: One day → Then / A few minutes later → In the end / Finally. Two sentences per panel is plenty — who did what, plus a feeling or detail. Put any thought-bubble or arrow information into words too.',
    '1コマ目 → One day, 〜（印刷された文）\n2コマ目 → Then ／ A few minutes later, 〜\n3コマ目 → In the end ／ Finally, 〜',
  ),
  // 6. practice: ナレーションの組み立て（drag）
  drag(
    '3コマの物語です。コマの切り替えに置く「時のつなぎ語」を入れて、ナレーションを完成させてください。',
    'The three panels: ① On her way home from school, a girl named Yuki notices a poster about a lost cat on a pole. ② In a park, she finds the cat under a bench. ③ She returns the cat to its elderly owner at the front door, and the owner looks very happy.',
    '___ , Yuki saw a poster about a lost cat on her way home from school. ___ , she found the cat under a bench in the park. ___ , she took it back to its owner, who looked very happy.',
    ['One day', 'Then', 'In the end', 'However', 'For example', 'Because'],
    ['One day', 'Then', 'In the end'],
    'One day（1コマ目の始まり）→ Then（場面の切り替え）→ In the end（結末）。この3つを置くだけで、3つの文が1本の物語になります。\n\nHowever と For example は意見文や読解のつなぎ語で、物語の時間は進めてくれません。Because は理由の接続詞なので文頭のこの位置には合いません。動詞も saw → found → took とすべて過去形——ナレーションの2大ルール、つなぎ語と過去形がそろいました。',
    'One day (opening) → Then (scene change) → In the end (resolution): three phrases turn three sentences into one story. “However” and “For example” are essay-and-reading connectors — they don’t move time forward — and “Because” can’t sit in these slots. Notice the verbs too: saw → found → took, all past tense. Sequence phrases plus past tense: the two laws of narration.',
  ),
  // 7. practice: 過去形の産出（gap）
  gap(
    '2コマ目のナレーションです。動詞 find を正しい形（過去形）にして、1語で入力してください。',
    'Then, Yuki (   ) the cat under a bench in the park.',
    ['found'],
    'find → found が正解。ナレーションは最初から最後まで過去形で通します。\n\nfind-found、see-saw、take-took、give-gave——3コマナレーションの定番動詞は不規則変化ばかり。過去形が口から自動で出るまで練習しておくと、本番で時制が崩れません。',
    '“Found” — find in the past tense, like every verb in the narration. The narration staples are nearly all irregular: find-found, see-saw, take-took, give-gave. Drill them until the past forms are automatic and your tenses won’t slip under pressure.',
  ),
  // 8. concept: No.3・No.4 意見の質問
  con(
    'No.3・No.4：立場＋理由＋例の2〜3文',
    'No.3 and No.4: position + reason + example, in 2–3 sentences',
    '面接の最後は、あなたの意見を聞く質問が2問。カードの話題に関連した No.3 と、より一般的な話題の No.4 です。環境、身近なテクノロジー、地域、旅行、働き方——日常＋少し社会的なテーマが中心です。\n\n答え方の型は「立場＋理由＋例」の2〜3文。\n\nQ: Do you think more people will work from home in the future?\nA: Yes, I do. Working from home saves a lot of commuting time. For example, my aunt works at home and uses that time for her family.\n\nDo you think 〜? と聞かれたら、まず Yes ／ No をはっきり言ってから because や For example で続けます。立場を言わずに理由から話し始めると、伝わりにくくなります。沈黙せず、完璧でなくても2文目まで言い切ることが点になります。',
    'The interview ends with two opinion questions: No.3 linked to the card’s topic, No.4 more general — everyday-plus-social themes like the environment, technology in daily life, community, travel and work. The frame: position + reason + example, in two or three sentences. “Do you think more people will work from home?” → “Yes, I do. Working from home saves commuting time. For example, my aunt works at home and uses that time for her family.” State Yes/No FIRST, then follow with because or For example. Starting from the reason without a position muddies the answer; pushing through to a second sentence, even imperfectly, earns the points.',
    'Q: Do you think 〜?\nA: Yes, I do. ＋理由1文 ＋例1文',
  ),
  // 9. practice: 良い答えを選ぶ
  q(
    '質問：Do you think more people will use car-sharing services in the future? — 最も良い答えはどれでしょう？',
    'Choose the best answer to the examiner’s question.',
    [
      'Yes.',
      'Yes, I do. Owning a car costs a lot of money, so sharing one is cheaper. For example, my uncle stopped buying a car and now uses a sharing service.',
      'I really like cars. My favorite one is a red sports car that I saw in a magazine.',
    ],
    1,
    '(B)が正解。立場（Yes, I do）→ 理由（所有よりシェアの方が安い）→ 例（おじの実例）と、型どおりの2〜3文です。\n\n(A)の Yes だけでは理由を言う前に終わってしまい、アティチュードの面でも大きく損。(C)は車の好みの話で、質問（カーシェアは増えるか）に答えていません。立場＋理由＋例——この3点セットで答えましょう。',
    '(B): position (Yes, I do) → reason (sharing beats the cost of owning) → example (the uncle) — the frame in action. A bare “Yes” (A) ends before the reason and wastes attitude points; (C) talks about favorite cars without answering whether sharing will GROW. Position, reason, example — always the set of three.',
  ),
  // 10. recap
  con(
    'まとめ：かたまりで読み、過去形で語る',
    'Recap: read in chunks, narrate in the past',
    '・音読は意味のかたまりで。カンマとピリオドで息継ぎ、止まらない\n\n・No.1 の答えはカードの中。How → By 〜ing、Why → Because、主語は代名詞に\n\n・No.2 は印刷された1文から。過去形＋One day → Then → In the end\n\n・No.3・No.4 は立場＋理由＋例の2〜3文。Yes ／ No を先に\n\n・沈黙だけが敵。完璧さより、言い切ること\n\n次は総まとめレッスン。2級レベル全体の腕試しです。',
    '• Read aloud in meaning chunks; breathe at the punctuation; never stop.\n\n• No.1: the answer is on the card — By -ing for How, Because for Why, pronouns for subjects.\n\n• No.2: start from the printed sentence; past tense plus One day → Then → In the end.\n\n• No.3/No.4: position + reason + example in 2–3 sentences, Yes/No first.\n\n• Silence is the only enemy — finishing beats perfection.\n\nNext: the level review — everything in Grade 2, mixed.',
  ),
]

// ── Lesson 6 総まとめ：2級 ──────────────────────────────────────────────────
const G2_REVIEW = [
  // 1. intro
  con(
    '総まとめ：2級の全パターン',
    'The Grade 2 review: every pattern, mixed',
    'このレベルで学んだことを、本番と同じようにシャッフルして確認します。\n\n・大問1：コロケーション・句動詞・接頭辞接尾辞——答えは空所の周りが選ぶ\n・大問2：空所は前後の文の関係（因果・逆接・例）で決める\n・大問3：設問は本文の順番、正解は言い換え\n・要約：主張と理由を残し、例と数字を削り、言い換える\n・意見文：立場 → First → Second → In conclusion\n・リスニング：先読み、最後の発言、ラベル付きの数字\n・面接：過去形のナレーションと、立場＋理由＋例\n\n間違えても大丈夫。どのパターンだったかを確認すれば、それが本番の1点になります。',
    'Everything this level taught, shuffled like the real test: collocations, phrasal verbs and word parts (大問1 — the words around the gap choose); before-and-after logic for passage blanks (大問2); question order and paraphrase (大問3); keep-cut-paraphrase for the summary; the four-part essay; preview, last turns and labelled numbers in listening; and past-tense narration plus position-reason-example in the interview. Miss one? Identify the pattern — that is a point earned for test day.',
  ),
  // 2. vocab: コロケーション
  q(
    '空所に入る語を選んでください。',
    'Local volunteers (   ) an important role in keeping the river clean and safe.',
    ['make', 'take', 'give', 'play'],
    3,
    'play a role（役割を果たす）の組み合わせで play が正解。「地域のボランティアが川の美化に重要な役割を果たしている」という文です。\n\nmake / take / give はどれも role を相方にしません。空所の後ろの名詞を見て相方の動詞を思い出す——コロケーションの解き方、身についてきましたか。',
    '“Play a role” — the noun “role” chooses its partner verb. Make, take and give don’t pair with it. Look at the noun after the gap and recall its partner: the collocation method, one more time.',
  ),
  // 3. vocab: 句動詞
  q(
    '空所に入る語を選んでください。',
    'The hospital carried (   ) a survey to find out how patients felt about its new waiting room.',
    ['out', 'on', 'up', 'away'],
    0,
    'carry out a survey（調査を実施する）の out が正解です。\n\ncarry on（続ける）も実在しますが、a survey という目的語と組むのは carry out。句動詞は「目的語ごと」覚える——carry out a plan / a survey / an experiment のセットを思い出せたら合格です。',
    '“Carry out a survey” — out. “Carry on” exists, but the object “a survey” belongs to carry OUT. Phrasal verbs live with their objects: carry out a plan / a survey / an experiment.',
  ),
  // 4. 大問2：つなぎ言葉
  q(
    '本文の空所に入る語句を選んでください。',
    '【本文の一部】\nFor years, Mr. Oda’s bakery used only imported wheat flour. Recently, however, the price of imported flour has kept rising, and he began to worry about the future of his shop. (    ), he decided to try flour made from locally grown rice. To his surprise, his rice-flour bread quickly became the most popular item in the bakery.',
    ['For example', 'Therefore', 'In other words', 'However'],
    1,
    '前の文は「輸入小麦粉の値上がりで店の将来が心配」、後ろは「地元の米粉を試すことにした」。悩み→だから行動、という因果の流れなので Therefore（それゆえ）が正解です。\n\nHowever はこの段落ではすでに直前で使われ、流れの反転は済んでいます。空所の前後の関係をまず判定——大問2のレールの読み方でした。',
    'Before: rising flour prices, worry about the shop. After: he decided to try rice flour. Worry → action is cause and effect, so “Therefore.” The reversal already happened earlier (“however” in sentence two); this blank rides the forward rail. Judge the relationship first.',
  ),
  // 5. 大問3：言い換え
  q(
    '本文を読んで、設問に答えてください。',
    '【本文の一部】\nGreenfield Station used to be one of the dirtiest stations in the city. Two years ago, a group of local high school students began cleaning it every Saturday morning. Their activity appeared in a newspaper, and other residents gradually started to join them. Now, more than eighty people, from small children to retired workers, take part in the cleaning every weekend.\n\nQ: What is true about the cleaning activity now?',
    [
      'It is done only by high school students.',
      'It was stopped after appearing in a newspaper.',
      'People of many different ages join it.',
      'It takes place once a month.',
    ],
    2,
    '最終文 more than eighty people, from small children to retired workers が根拠。「子どもから退職者まで」→「幅広い年齢の人々」と言い換えた(C)が正解です。\n\n(A)は「今は高校生だけではない」ので誤り、(B)は逆（記事のあと参加者が増えた）、(D)は every weekend と矛盾。Now を聞かれたら最終文へ——時間の流れと言い換え、両方の確認でした。',
    '“More than eighty people, from small children to retired workers” → “people of many different ages” — (C). (A) is outdated, (B) reverses the newspaper effect, (D) contradicts “every weekend.” A question about NOW points to the final sentence; then the paraphrase decides.',
  ),
  // 6. 要約の判断
  q(
    'この本文を45〜55語に要約します。正しい方針はどれでしょう？',
    '【本文の一部】\nMany city offices in Japan now offer free Wi-Fi for visitors. For example, Minato City installed Wi-Fi at all of its offices in 2023. Free Wi-Fi helps foreign visitors find information easily, and it is also useful when people need to contact their families in an emergency.\n\nYou are summarizing this passage in 45–55 words. Which is the best move?',
    [
      'Keep the main point and the two reasons, and cut the example about Minato City.',
      'Keep the example about Minato City because it includes a specific year.',
      'Add your own opinion that every city should offer free Wi-Fi.',
    ],
    0,
    '(A)が正解。主張（市役所の無料Wi-Fiが増えている）と2つの理由（情報収集・緊急時の連絡）を残し、For example の後ろの固有名詞と年号は削る——要約の取捨選択そのものです。\n\n(B)は逆で、具体的な数字や年号こそ削る対象。(C)の自分の意見は、要約では厳禁でしたね。',
    '(A): keep the claim (free Wi-Fi spreading at city offices) and the two reasons (finding information, emergency contact); cut the example with its name and year. (B) inverts the rule — specifics are exactly what goes; and (C) breaks the law of the summary: no opinions of your own.',
  ),
  // 7. listening 第1部（audio）
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Hello, Greenhill Sports Center.\nM: Hi. I’d like to join the morning yoga class. Do you have any space?\nW: The Tuesday class is full, I’m afraid, but there are a few places left in the Friday class. It starts at seven.\nM: Friday works for me. Can I sign up over the phone?\nW: Of course. I just need your name and a phone number.\nQuestion: What will the man probably do next?',
    [
      'Visit the sports center on Tuesday.',
      'Wait until a new class opens.',
      'Give the woman his name and number.',
      'Ask to move the class to the afternoon.',
    ],
    2,
    '最後のやり取りが決め手。「電話で申し込めますか」→「お名前と電話番号を」——次にすることは(C)です。\n\n火曜のクラスは満席（行くのではなく断られた曜日）なので(A)は誤り。結論と次の行動は最後の発言に来る、の法則どおりでした。',
    'The closing exchange decides: “Can I sign up over the phone?” → “I just need your name and a phone number” — so next he gives them, (C). Tuesday is the FULL class, not a plan (A). Conclusions and next actions live in the last turns.',
  ),
  // 8. listening 第2部（audio）
  qa(
    'モノローグと質問を聞いて、答えを選んでください。',
    'Listen to the passage and the question.',
    'Akiko loves traveling, but she does not like carrying heavy bags. Last month, before her trip to Hokkaido, she tried a new service that sends suitcases from her home directly to the hotel. Her suitcase arrived before she did, so she was able to enjoy sightseeing on the first day without any luggage. Akiko has already decided to use the same service for her next trip.\nQuestion: Why was Akiko able to enjoy sightseeing on the first day?',
    [
      'She bought a lighter suitcase for the trip.',
      'Her suitcase had been sent ahead to the hotel.',
      'The hotel was next to the sightseeing spots.',
      'Her friend carried her bags all day.',
    ],
    1,
    'sends suitcases from her home directly to the hotel ＋ Her suitcase arrived before she did が根拠。「先にホテルへ送られていた」と言い換えた(B)が正解です。\n\n(A)(C)(D)は音声に登場しません。サービスの説明→結果（身軽に観光）という因果をつかめたか——第2部の言い換え聞き取り、仕上がってきましたね。',
    '“Sends suitcases from her home directly to the hotel” + “her suitcase arrived before she did” → paraphrased as “sent ahead to the hotel,” (B). The others never occur in the audio. Service → result (luggage-free sightseeing): cause and effect, caught by ear.',
  ),
  // 9. speaking: ナレーション（gap）
  gap(
    'ナレーション練習：3コマ目です。動詞 take を正しい形（過去形）にして、1語で入力してください。',
    'In the end, Yuki (   ) the cat back to its owner, who looked very happy.',
    ['took'],
    'take → took が正解。In the end で結末に入り、動詞は過去形——ナレーションの2大ルールが両方そろった1文です。\n\nfind-found、see-saw、take-took。不規則動詞の過去形が自動で出れば、3コマナレーションはもう怖くありません。',
    '“Took” — take in the past tense, riding behind “In the end.” Sequence phrase plus past tense: both laws of narration in one sentence. When find-found, see-saw and take-took come automatically, the three panels hold no fear.',
  ),
  // 10. final recap
  con(
    'まとめ：2級レベル修了',
    'Recap: the Grade 2 level, complete',
    '・大問1は空所の周り——コロケーションの相方、句動詞のかたまり、単語のパーツ\n\n・大問2は前後の文の関係、大問3は順番と言い換え\n\n・要約は「残す・削る・言い換える」、意見文は4部構成の型\n\n・リスニングは先読みと最後の発言、数字はラベルごと\n\n・面接は過去形のナレーションと、立場＋理由＋例\n\nこれで2級レベルは修了です。2級の模試で力を試しましょう。実際の試験と同じ形式・同じ時間配分で、学んだパターンがどこまで通用するかを確認できます。',
    '• 大問1: the words around the gap — collocation partners, phrasal-verb chunks, word parts.\n\n• 大問2: the before-and-after relationship; 大問3: order and paraphrase.\n\n• The summary: keep, cut, paraphrase; the essay: the four-part frame.\n\n• Listening: preview, last turns, numbers with labels.\n\n• The interview: past-tense narration, and position + reason + example.\n\nThat completes the Grade 2 level. Put your skills to the test in the Grade 2 mock set — same format, same timing as the real exam.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade Pre-1（準1級）
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// LEVEL: Grade Pre-1（準1級）
// ════════════════════════════════════════════════════════════════════════════
// ── Lesson 1 大問1：単語・熟語 ──────────────────────────────────────────────
const PRE1_VOCAB = [
  // 1. cold-open question
  q(
    'まずは1問。空所に入る語を選んでください。',
    'Many island nations (   ) heavily on imported fossil fuels to generate their electricity.',
    ['conform', 'rely', 'dispose', 'attach'],
    1,
    'rely heavily on 〜（〜に大きく依存する）の rely が正解です。決め手は意味の訳ではなく、heavily on という空所の周りの語。conform は to、dispose は of、attach も to と組み、heavily on を従えられるのは rely（または depend）だけです。\n\n準1級の大問1は18問。単語のレベルは上がりますが、解き方はむしろシンプルになります——「どの語とどの語が組むか」、コロケーションで消去するのです。',
    '“Rely heavily on” — and the deciding evidence is not a translation but the words around the gap: “heavily on.” Conform takes “to,” dispose takes “of,” attach takes “to”; only rely (or depend) governs “heavily on.” 大問1 at Pre-1 has 18 items, and the higher the vocabulary climbs, the more the method simplifies: eliminate by collocation, not by translating.',
  ),
  // 2. concept: 大問1の手順
  con(
    '大問1の手順：準1級は18問、訳すのではなく組み合わせで消す',
    'The 大問1 routine: 18 items — eliminate by collocation, not translation',
    '準1級の大問1は短文の空所補充が18問。リーディング31問・55分の半分以上を占める、最大の得点源です。\n\n語彙はB2〜C1レベル。4つの選択肢を全部きれいに和訳できることは、まずありません。だから方針を変えます——訳すのではなく、組み合わせで消すのです。\n\n①空所の前後の語（前置詞・副詞・名詞）を見る\n②各選択肢に「この語はどんな相方と組むか」を問う\n③相方が合わない選択肢を消していく\n\nrely は heavily on と、available は widely と、prohibit は strictly と組む。単語の「意味」を知らなくても、「ふるまい」を知っていれば消去できます。\n\n1問15〜25秒が目安。大問1で稼いだ時間が、後半の300〜400語の長文を守ります。',
    '大問1 at Pre-1 is 18 short gap-fills — more than half of the 31-question, 55-minute Reading section, and your biggest single source of points. The lexis is B2–C1: you will rarely be able to translate all four options cleanly, so change the method — don’t translate, eliminate by collocation. Look at the words around the gap (prepositions, adverbs, nouns); ask of each option “what partners does this word take?”; cross out the ones whose partners don’t match. Rely pairs with “heavily on,” available with “widely,” prohibit with “strictly.” You can eliminate a word whose meaning is hazy as long as you know its BEHAVIOR. Budget 15–25 seconds per item — the time you bank here protects the 300–400-word passages later.',
    'rely heavily on 〜 ／ widely available\nstrictly prohibited ／ deeply concerned\n意味より先に「ふるまい」で消す',
  ),
  // 3. concept: コロケーションの強度
  con(
    'コロケーションの強度：副詞と形容詞は相方が決まっている',
    'Collocation strength: adverbs and adjectives keep fixed partners',
    '準1級のコロケーションで特に問われるのが、副詞＋動詞／副詞＋形容詞の「強度」です。意味が似ていても、組める相方は決まっています。\n\n・rely heavily on 〜（大きく依存する）— × rely widely\n・widely available（広く手に入る）— × heavily available\n・highly unlikely（まずありえない）— × deeply unlikely\n・deeply concerned（深く憂慮して）— × highly concerned とは言いにくい\n・strictly prohibited（固く禁じられて）\n\nだから解き方はこうなります。空所の隣にある副詞（または形容詞・名詞）を見て、「この語の相方はどれ？」と問う。4つの選択肢の和訳がどれも「ありそう」に見えるときこそ、組み合わせの知識が一刀で決めてくれます。\n\n単語を覚えるときも同じ。available 単体ではなく widely available、concerned ではなく deeply concerned about と、相方ごと暗記するのが準1級の語彙学習です。',
    'What Pre-1 tests hardest is collocation STRENGTH — adverb + verb and adverb + adjective pairings that stay fixed even when meanings overlap: rely heavily on (never “rely widely”), widely available (never “heavily available”), highly unlikely, deeply concerned, strictly prohibited. So the move is: look at the adverb (or adjective, or noun) beside the gap and ask which option is its partner. Precisely when all four translations look plausible, pairing knowledge cuts the knot in one stroke. Study words the same way — not “available” but “widely available,” not “concerned” but “deeply concerned about”: memorise the partner along with the word.',
    'rely heavily on ／ widely available\nhighly unlikely ／ deeply concerned\nstrictly prohibited\n→ 隣の語が答えを選ぶ',
  ),
  // 4. practice: 副詞コロケーション
  q(
    '空所に入る語を選んでください。',
    'Thanks to new delivery networks, fresh seafood from small fishing ports is now widely (   ) in supermarkets across the country.',
    ['affordable', 'visible', 'durable', 'available'],
    3,
    'widely available（広く手に入る）の組み合わせで available が正解。「配送網のおかげで小さな漁港の鮮魚が全国のスーパーで手に入る」という文です。\n\naffordable（手頃な）も意味は通りそうに見えますが、widely の相方として定着しているのは available。visible（目に見える）と durable（長持ちする）はストーリーに合いません。直前の widely が答えを選んでくれました——準1級のコロケーション問題の型です。',
    '“Widely available” — the adverb chooses its partner. “Affordable” looks meaning-plausible, but “widely” pairs with “available”; visible and durable don’t fit the story at all. The word right before the gap did the choosing — the standard shape of a Pre-1 collocation item.',
  ),
  // 5. concept: フォーマル語彙と抽象的な句動詞
  con(
    'フォーマル語彙と句動詞：抽象的な意味で出る',
    'Formal vocabulary — and phrasal verbs in abstract senses',
    '準1級の大問1には、あと2種類の常連がいます。\n\n①ラテン語系のフォーマル語彙。implement（実施する）、compromise（妥協）、constitute（構成する）、deteriorate（悪化する）——新聞・論説の文体で出ます。これも相方ごと覚えるのが近道：implement a policy、reach a compromise、undergo surgery。\n\n②抽象的な意味の句動詞。基本動詞＋前置詞が、物理的な意味を離れて使われます。\n\n・rule out 〜（〜の可能性を排除する）— rule out a possibility\n・account for 〜（〜を占める／〜の原因を説明する）— account for half of 〜\n・set back 〜（〜を遅らせる）— set back the project\n・bring about 〜（〜を引き起こす）— bring about change\n\n「ルールの外に出す→排除する」のように、元のイメージから意味の橋を架けると覚えやすくなります。ここでも決め手は目的語：possibility が見えたら rule out、half of が見えたら account for です。',
    'Two more regulars at Pre-1: Latinate formal vocabulary — implement (a policy), compromise (reach a), constitute, deteriorate, undergo (surgery) — the register of newspapers and editorials, best memorised with their partners; and phrasal verbs in ABSTRACT senses, where a basic verb + particle leaves its physical meaning: rule out a possibility, account for half of, set back the project, bring about change. Build a bridge from the literal image (“rule it outside the line” → exclude) and the meaning sticks. And once again the object decides: see “possibility” and reach for rule out; see “half of” and reach for account for.',
    'implement a policy ／ reach a compromise\nrule out a possibility ／ account for half of 〜\nset back the project ／ bring about change',
  ),
  // 6. practice: フォーマル語彙
  q(
    '空所に入る語を選んでください。',
    'After eighteen months of difficult negotiations, the union and the management finally reached a (   ) on working hours.',
    ['compromise', 'monopoly', 'prescription', 'dimension'],
    0,
    'reach a compromise（妥協に至る）の組み合わせで compromise が正解。「18か月の交渉の末、労使がようやく労働時間で妥協に達した」という文です。\n\nmonopoly（独占）、prescription（処方箋）、dimension（次元・側面）はどれも reach a 〜 と組んでこの文脈を作れません。negotiations（交渉）という語が見えた瞬間に compromise を引き出せたか——文脈の語からの連想も、準1級の消去法の武器です。',
    '“Reach a compromise” — after 18 months of negotiations, exactly what unions and management finally do. Monopoly, prescription and dimension can’t build this context with “reach a.” The word “negotiations” should summon “compromise” on sight: context-word association is one more weapon in the elimination kit.',
  ),
  // 7. practice: 抽象句動詞
  q(
    '空所に入る語を選んでください。',
    'Investigators have not yet (   ) out the possibility that the bridge was damaged before the storm.',
    ['ruled', 'taken', 'carried', 'figured'],
    0,
    'rule out 〜（〜の可能性を排除する）の ruled が正解。「調査官たちは、橋が嵐の前から損傷していた可能性をまだ排除していない」という文です。\n\n決め手は目的語の the possibility。carry out（実施する）は a survey や a plan と、figure out（解き明かす）は答えや理由と組みます。句動詞は「動詞＋前置詞＋典型的な目的語」の3点セットで覚える——rule out a possibility はその代表です。',
    '“Rule out” — investigators have not yet ruled out the possibility. The object “the possibility” is the deciding clue: carry out takes surveys and plans, figure out takes answers and reasons. Learn phrasal verbs as a three-piece set — verb + particle + typical object — and “rule out a possibility” is the textbook case.',
  ),
  // 8. practice: フォーマル語彙（動詞）
  q(
    '空所に入る語を選んでください。',
    'The city government plans to (   ) the new recycling regulations next spring, starting with restaurants and hotels.',
    ['undergo', 'accumulate', 'implement', 'withdraw'],
    2,
    'implement regulations（規制を実施する）の組み合わせで implement が正解。「市は来春、新しいリサイクル規制を実施する予定」という文です。\n\nundergo は surgery や changes を「受ける」側、accumulate は wealth や data を「蓄積する」、withdraw（撤回する）は plans to と並ぶと逆方向。regulations という目的語と plans to という前後関係が、implement を一意に選びます。',
    '“Implement” — governments implement regulations and policies. Undergo is what the PATIENT of change does (undergo surgery), accumulate hoards wealth or data, and withdraw would reverse the meaning of “plans to.” The object “regulations” plus the frame “plans to” selects implement uniquely.',
  ),
  // 9. practice: 句動詞の産出（gap）
  gap(
    '空所に入る1語を入力してください。',
    'Tourism alone accounts (   ) nearly half of the island’s economy, so the government is eager to attract more visitors.',
    ['for'],
    'account for 〜（〜を占める）の for が正解です。「観光だけで島の経済の半分近くを占める」という文でした。\n\naccount for は「割合を占める」と「原因を説明する」の2つの顔を持つ、準1級頻出の句動詞。nearly half of のような割合表現が見えたら account for——選べるだけでなく書けるレベルにしておくと、要約や意見文でもそのまま使えます。',
    '“Accounts FOR nearly half” — account for, the Pre-1 staple with two faces: making up a proportion and explaining a cause. A proportion phrase like “nearly half of” should trigger it instantly. Producing the particle yourself (not just recognising it) means the chunk is ready for your summary and essay too.',
  ),
]

// ── Lesson 2 読解：論理の空所と長文 ─────────────────────────────────────────
const PRE1_READING = [
  // 1. cold-open: 論理の空所（譲歩→反転）
  q(
    'まずは1問。本文の空所に入る語句を選んでください。',
    '【本文の一部】\nElectric scooters have been promoted as a quick solution to urban traffic jams. (    ), early data from several European cities suggests that most scooter trips replace walking or cycling rather than car journeys, so the effect on traffic has been far smaller than promised.',
    ['Consequently', 'Similarly', 'However', 'For instance'],
    2,
    '前の文は「渋滞の特効薬として宣伝されてきた」、後ろは「実際のデータでは効果はずっと小さい」。宣伝→現実、と流れが反転しているので However が正解です。\n\nConsequently（その結果）は順方向、Similarly（同様に）は並列、For instance（例えば）は具体例。準1級の大問2はこの「論理の向き」を選ばせる問題が中心で、本文は約250語×2本、空所は各3つ。主張のあとに However が来たら、筆者がこれから修正・反論を始める合図です。',
    'Before: scooters promoted as a quick fix. After: the data shows a far smaller effect. Promise → reality is a reversal, so “However.” Consequently rides forward, Similarly runs parallel, For instance illustrates. 大問2 at Pre-1 turns on this — the DIRECTION of the logic — across two ~250-word passages with three blanks each. And a “However” after a claim is the author’s signal that a correction is coming.',
  ),
  // 2. concept: 大問2 論理の鎖
  con(
    '大問2：譲歩→反転→限定の鎖を読む',
    '大問2: read the concession → reversal → qualification chain',
    '準1級の大問2は、約250語のパッセージ2本に空所が3つずつ、計6問。空所に入るのはつなぎ言葉か、文脈をつなぐフレーズです。\n\n準1級らしさは、論理が「鎖」になること。論説文は、よくこの形で進みます。\n\n①通説・期待：〜と考えられてきた（It has long been believed…）\n②反転：However ／ Yet ＋ 新しい証拠\n③譲歩：While ／ Although 〜（確かに〜だが）\n④限定された結論：つまり「条件つきで正しい」\n\n鉄則はいつもどおり——空所の文だけで決めず、前後の文の関係を判定する。ただし選択肢はB2レベル：Nevertheless（それにもかかわらず）、By contrast（対照的に）、Consequently（その結果）、In fact（実際は）。\n\nフレーズ補充では、空所の後ろの文が「入れたフレーズの続き」として自然か、必ず確かめましょう。後ろの文が理由・補足になっていれば、その方向のフレーズが正解です。',
    '大問2 gives two ~250-word passages with three blanks each — six questions, each blank a connector or a linking phrase. What makes Pre-1 feel like Pre-1 is that the logic forms a CHAIN. Expository prose here loves this shape: ① the received view (“It has long been believed…”) → ② a reversal (However / Yet + new evidence) → ③ a concession (While / Although…) → ④ a qualified conclusion (“true, but only under conditions”). The iron rule still holds — never decide from the gapped sentence alone; judge the before-and-after relationship — but the options go B2: Nevertheless, By contrast, Consequently, In fact. For phrase blanks, test whether the NEXT sentence continues naturally from your phrase; if it gives a reason or detail, pick the phrase that points that way.',
    '通説 → However ＋ 証拠 → While 〜 → 限定つき結論\nNevertheless ／ By contrast ／ Consequently ／ In fact\n決めるのは前後の文の関係',
  ),
  // 3. concept: 大問3 段落マッピング
  con(
    '大問3：設問を先に読み、段落を地図にする',
    '大問3: read the question first, map the paragraphs',
    '準1級の大問3は、約300語と約400語の長文2本に設問が3問＋4問、計7問。説明文・論説文で、リーディングの最後を締めくくります。\n\n400語を頭から精読していたら時間が足りません。手順を逆にします。\n\n①設問を先に読む（選択肢はまだ読まない）\n②設問の順番＝本文の順番。設問1は前半、最後の設問は終盤か全体\n③設問のキーワードで該当段落を探し、その段落の中で根拠を見つける\n\n「1段落に1つの仕事」は準1級でも健在です。第1段落が話題と通説、中盤が証拠や反論、最終段落が筆者の結論——段落の最初の文が、その段落の仕事を教えてくれます。\n\nそして正解は必ず言い換え。used for only a few minutes a year → spend most of the year unused のように、本文の表現を別の角度から述べた選択肢を選びます。本文の単語をそのまま繰り返す選択肢は、まずワナです。',
    '大問3 closes Reading with two passages — ~300 and ~400 words, 3 + 4 questions. Reading 400 words line by line will bankrupt your 55 minutes, so invert the procedure: read the question first (not the options yet); trust that question order follows text order — question 1 lives early, the last question late or over the whole text; then use the question’s keywords to locate the paragraph and find the evidence inside it. “One paragraph, one job” still rules at Pre-1: paragraph 1 sets the topic and the received view, the middle carries evidence and objections, the final paragraph holds the author’s conclusion — and each topic sentence announces its paragraph’s job. Correct options always PARAPHRASE (“used for only a few minutes a year” → “spend most of the year unused”); an option that echoes the text word for word is usually bait.',
    '設問 → キーワード → 段落 → 根拠\n設問の順番＝本文の順番\n正解は言い換え、丸ごとの繰り返しはワナ',
  ),
  // 4. practice: フレーズ補充
  q(
    '本文の空所に入る語句を選んでください。',
    '【本文の一部】\nFor decades, it was widely believed that planting large numbers of trees was always good for dry regions. Recent research, however, paints a more complicated picture. In some areas, fast-growing plantations (    ). As a result, several governments have begun to choose tree species more carefully and to limit planting near rivers.',
    [
      'grew even faster than scientists had expected',
      'absorbed so much groundwater that local streams began to dry up',
      'were replaced by fields of vegetables and fruit',
      'attracted rare birds and insects to the region',
    ],
    1,
    '空所の後ろを読むと「樹種を慎重に選び、川の近くの植林を制限し始めた」——つまり水に関わる問題が起きたはずです。(B)「地下水を吸いすぎて川が干上がり始めた」が正解。\n\n(A)(D)は良い展開で、政府が制限を始めた理由になりません。(C)は farming の話に飛んでしまいます。however で「複雑な実態」へ反転し、空所が具体的な問題、As a result が対策——譲歩→反転→帰結の鎖の中に空所がはまっているか、前後で確かめる解き方でした。',
    'Read past the blank: governments now choose species carefully and LIMIT PLANTING NEAR RIVERS — so the problem must involve water. (B): plantations drank so much groundwater that streams dried up. (A) and (D) are good news that explains no restrictions; (C) jumps to farming. The chain holds the blank in place: “however” turns to the complicated reality, the blank supplies the concrete problem, “As a result” delivers the response — confirmed on both sides.',
  ),
  // 5. practice: 大問3 言い換え
  q(
    '本文を読んで、設問に答えてください。',
    '【本文の一部】\nA growing number of cities have opened “tool libraries,” where residents can borrow electric drills, ladders, and gardening equipment in the same way they borrow books. Supporters point out that most household tools are used for only a few minutes a year, so sharing them saves both money and storage space.\n\nNot everyone is convinced, however. Some hardware store owners worry about losing customers, and keeping donated tools in safe condition takes more volunteer time than many libraries expected.\n\nQ: What do supporters of tool libraries point out?',
    [
      'Borrowing tools is more difficult than borrowing books.',
      'Hardware stores should repair tools for the libraries.',
      'Most libraries have too little space to store tools.',
      'Household tools spend most of the year unused.',
    ],
    3,
    '第1段落の used for only a few minutes a year が根拠。「年に数分しか使われない」→「1年の大半は使われていない」と言い換えた(D)が正解です。\n\n設問の Supporters というキーワードで第1段落に絞れましたか。(A)(B)は本文にない比較・提案、(C)は「収納スペースの節約」という利点を「足りない」とねじった逆向きのワナです。設問→段落→言い換え、の最短ルートでした。',
    'Paragraph 1 holds the evidence: tools are “used for only a few minutes a year” → paraphrased as “spend most of the year unused,” (D). The keyword “Supporters” should have sent you straight to paragraph 1. (A) and (B) never appear; (C) twists the saving of storage space into a shortage. Question → paragraph → paraphrase: the shortest route.',
  ),
  // 6. concept: 筆者のスタンス
  con(
    '筆者のスタンス：誰の声かを聞き分ける',
    'Author stance: whose voice is speaking?',
    '準1級の長文には複数の「声」が登場します。supporters claim（支持者は主張する）、critics argue（批判者は論じる）、researchers caution（研究者は注意を促す）——そして筆者自身の声。設問が the author’s conclusion を聞いてきたら、人々の意見ではなく筆者の声を探さなければなりません。\n\n聞き分けのサインは3つ。\n\n①引用動詞のあとは他人の声：Supporters describe it as 〜 は筆者の意見ではない\n②意見の直後の however は筆者の介入：「〜と言われている。しかし——」の「しかし」から筆者が話し始める\n③結論は最後＋ヘッジつき：筆者の声は What the evidence really shows is 〜 や may ／ appear to のような慎重な表現で、たいてい最終段落に置かれる\n\n両論併記の文章ほど、筆者の結論は「AかBか」ではなく「条件しだい」という限定つきの形になります。極端な選択肢（always ／ every ／ completely）は、まずその時点で疑いましょう。',
    'Pre-1 passages are full of voices: supporters claim, critics argue, researchers caution — and, somewhere, the author. When a question asks for the AUTHOR’S conclusion, you must find that voice, not the quoted ones. Three signals: after a reporting verb you are hearing someone else (“Supporters describe it as…” is not the author); a “however” right after an opinion is the author stepping in; and the author’s own conclusion usually sits in the final paragraph, hedged (“What the evidence really shows is…,” may, appear to). In balanced, two-sided passages the author’s verdict is rarely “A wins” — it is “it depends,” a qualified claim. Which means extreme options (always, every, completely) start out under suspicion.',
    'supporters claim ／ critics argue → 他人の声\n意見＋However → 筆者の介入\n最終段落＋may ／ appear to → 筆者の結論',
  ),
  // 7. practice: 筆者の結論
  q(
    '本文を読んで、設問に答えてください。',
    '【本文の一部】\nSupporters of the four-day workweek often describe it as a simple win for everyone: employees get more rest, and companies get more motivated workers. The results of recent trials, however, suggest that the picture is less tidy. While office workers in several large trials reported lower stress with no loss of output, hospitals and factories — where someone must always be on duty — found that shorter weeks meant hiring extra staff or cutting services. What the trials really show, then, is not that the four-day week succeeds or fails, but that its success depends heavily on the type of workplace.\n\nQ: What is the author’s main conclusion about the four-day workweek?',
    [
      'Whether it works depends on the kind of workplace.',
      'It benefits every company if it is introduced carefully.',
      'Hospitals and factories should adopt it before offices do.',
      'Recent trials have proved that it always lowers stress.',
    ],
    0,
    '最終文 its success depends heavily on the type of workplace が筆者の声。これを言い換えた(A)が正解です。\n\n第1文の「誰にとっても得」は supporters の声で、直後の however から筆者が介入——「絵はそれほどきれいではない」。(B)の every、(D)の always proved は、両論併記の筆者が選ばない極端な断定です。(C)は本文にない提案。声の聞き分けと限定つき結論、両方の確認でした。',
    'The final sentence is the author speaking: “its success depends heavily on the type of workplace” — (A). The “simple win for everyone” belongs to the supporters, and the “however” right after it is the author stepping in. (B)’s “every” and (D)’s “always proved” are absolutes a balanced author never signs; (C) proposes something the text never says. Voices told apart, qualified conclusion found.',
  ),
  // 8. practice: 詳細の言い換え
  q(
    '同じ本文の続きの設問です。',
    '【本文の一部】\nSupporters of the four-day workweek often describe it as a simple win for everyone: employees get more rest, and companies get more motivated workers. The results of recent trials, however, suggest that the picture is less tidy. While office workers in several large trials reported lower stress with no loss of output, hospitals and factories — where someone must always be on duty — found that shorter weeks meant hiring extra staff or cutting services. What the trials really show, then, is not that the four-day week succeeds or fails, but that its success depends heavily on the type of workplace.\n\nQ: What problem did hospitals and factories experience in the trials?',
    [
      'Their workers reported much higher stress.',
      'They had to employ more people or reduce their services.',
      'Their output fell even though staff numbers grew.',
      'Their employees refused to join the trials.',
    ],
    1,
    'shorter weeks meant hiring extra staff or cutting services が根拠。hiring extra staff → employ more people、cutting services → reduce their services と二重に言い換えた(B)が正解です。\n\n(A)のストレス増、(C)の生産低下、(D)の参加拒否はどれも本文にありません。While 〜（確かにオフィスでは…）の譲歩のあとに来る「常時誰かが必要な職場」の対比——譲歩の構文は、対比される情報の置き場所も教えてくれます。',
    '“Shorter weeks meant hiring extra staff or cutting services” → doubly paraphrased in (B): employ more people, reduce their services. Higher stress (A), falling output (C) and refusal to participate (D) never occur. Note where the answer lived: right after the “While…” concession, in the contrasted clause — concessive grammar tells you where the opposing facts are stored.',
  ),
  // 9. recap
  con(
    'まとめ：論理の鎖と段落の地図',
    'Recap: chains of logic, maps of paragraphs',
    '・大問2の空所は前後の文の関係で決める。準1級は譲歩→反転→限定の鎖（However ／ Nevertheless ／ While）\n\n・フレーズ補充は「後ろの文が自然に続くか」でチェック\n\n・大問3は設問が先。設問の順番＝本文の順番、キーワードで段落を特定\n\n・声を聞き分ける：supporters claim は他人の声、意見直後の however から筆者\n\n・筆者の結論は限定つき。always ／ every の極端な選択肢を疑う\n\n・正解は言い換え。本文の丸ごとの繰り返しはワナ\n\n次のレッスンは、ライティング。200語の文章を60〜70語に圧縮する要約と、POINTSを使う120〜150語の意見文です。',
    '• 大問2 blanks: judge the before-and-after relationship — at Pre-1, the concession → reversal → qualification chain (However / Nevertheless / While).\n\n• Phrase blanks: does the next sentence continue naturally?\n\n• 大問3: question first; question order = text order; keywords locate the paragraph.\n\n• Tell the voices apart: “supporters claim” is someone else; the author enters at “however.”\n\n• The author’s conclusion is qualified — distrust always / every.\n\n• Correct answers paraphrase; verbatim echoes are traps.\n\nNext lesson: Writing — compressing a 200-word passage into 60–70 words, and the 120–150-word POINTS essay.',
  ),
]

// ── Lesson 3 ライティング：要約と意見文 ─────────────────────────────────────
const PRE1_WRITING = [
  // 1. cold-open: 両論を公平にまとめる
  q(
    'まずは1問。この本文を最も公平に要約した1文はどれでしょう？',
    '【本文の一部】\nSome cities have introduced “car-free Sundays” in their centers. Supporters say the streets become safer and local shops attract more visitors on foot. On the other hand, delivery companies and residents with limited mobility complain that the restrictions make their daily activities much harder.\n\nWhich sentence summarizes this passage most fairly?',
    [
      'Car-free Sundays make city centers safer and busier, so more cities should adopt them.',
      'While car-free Sundays are praised for safer streets and busier shops, they also create difficulties for deliveries and less mobile residents.',
      'Delivery companies are the main opponents of car-free Sundays in most cities.',
    ],
    1,
    '(B)が正解。賛成側（安全・にぎわい）と反対側（配送・移動が困難な住民）の両方を、While 〜 の1文で公平に圧縮しています。\n\n(A)は賛成側だけを残した上に should adopt と自分の意見を足しています。(C)は一方の詳細を全体の結論に格上げした誤り。準1級の要約は約200語の文章を60〜70語に——そして本文はたいてい両論併記です。片方だけの要約は、語数が合っていても減点されます。',
    '(B) compresses BOTH sides into one “While…” sentence — the praise (safer, busier) and the complaints (deliveries, less mobile residents). (A) keeps only the supporters and smuggles in an opinion (“should adopt”); (C) promotes one detail to a conclusion. The Pre-1 summary squeezes ~200 words into 60–70 — and the passage almost always carries two viewpoints. A one-sided summary loses points even at the right length.',
  ),
  // 2. concept: 要約 60〜70語
  con(
    '要約：60〜70語、両方の視点を公平に圧縮する',
    'The summary: 60–70 words, both viewpoints compressed fairly',
    '準1級ライティングの1問目は要約。約200語の文章を60〜70語にまとめます（ライティング全体で2タスク・約35分）。\n\n準1級の本文は、ほぼ必ずこの形です：ある変化・取り組みの紹介 → 利点（2つ前後）→ However → 問題点（2つ前後）→ 帰結。\n\nだから要約の設計図も決まっています。\n\n①第1文：何が起きているか（変化・取り組み）\n②第2文：利点を圧縮（While 〜 で③とつなぐと美しい）\n③第3文：問題点を圧縮\n④必要なら帰結を1文\n\n残すのは骨組み、削るのは固有名詞・数字・具体例。そして自分の言葉に言い換える——本文の語句を3語以上そのまま写すと減点対象です。\n\n最重要ルールは「公平さ」。利点だけ・問題点だけの要約は、内容点を大きく失います。自分の意見も厳禁。however ／ as a result などのつなぎ語で論理を見せましょう。',
    'Writing task 1 is the summary: ~200 words down to 60–70 (the whole Writing section is two tasks in about 35 minutes). The Pre-1 source passage almost always runs: a change or initiative → its advantages (about two) → However → its problems (about two) → an outcome. So the blueprint writes itself: ① sentence 1 — what is happening; ② sentence 2 — the advantages, compressed (elegantly joined to ③ with “While…”); ③ sentence 3 — the problems; ④ one more sentence for the outcome if there is one. Keep the skeleton; cut names, numbers and examples; and PARAPHRASE — copying runs of three or more words costs credit. The supreme rule is FAIRNESS: an advantages-only or problems-only summary bleeds content points. No opinions of your own, and show the logic with connectors like however and as a result.',
    '①変化 ②利点 ③However＋問題点 ④帰結\n削る → 固有名詞・数字・例\n言い換える・両論を公平に・意見は書かない',
  ),
  // 3. practice: 圧縮の言い換え
  q(
    '次の2文を要約の1文に圧縮します。最も良いものはどれでしょう？',
    '【本文の一部】\nOnline learning allows students in remote areas to take classes from top universities. At the same time, many students say that staying motivated without classmates around them is difficult.\n\nWhich sentence compresses this best for a summary?',
    [
      'Online learning is difficult, so universities should improve their classes.',
      'Students in remote areas find that their classmates at top universities lack motivation.',
      'While online learning gives distant students access to excellent classes, studying without classmates makes it hard for some to stay motivated.',
    ],
    2,
    '(C)が正解。While 〜 の譲歩構文で、利点（遠隔地から良い授業へ）と問題点（仲間がいないと意欲が続かない）を1文に圧縮し、allows … to take → gives … access to と言い換えています。\n\n(A)は問題点だけ残して should improve という意見まで足した二重違反。(B)は「級友のやる気がない」と内容をねじ曲げています。2文を While で1文に——60〜70語に収める最大の武器です。',
    '(C): a “While…” concession folds the advantage (distant students reach excellent classes) and the problem (motivation without classmates) into one sentence, paraphrasing as it goes (allows…to take → gives…access to). (A) keeps only the problem AND adds an opinion — two violations at once; (B) garbles the meaning (the classmates aren’t the unmotivated ones). Two sentences into one with “While”: the single best tool for hitting 60–70 words.',
  ),
  // 4. practice: 削るものを見抜く
  q(
    'この本文を60〜70語に要約するとき、削るべき部分はどれでしょう？',
    '【本文の一部】\nMore companies are switching to reusable packaging. For example, a supermarket chain in Germany introduced returnable containers in over 200 stores in 2022. Reusable packaging reduces waste, but it also requires systems for collecting and washing containers, which small businesses often cannot afford.\n\nYou are summarizing this in 60–70 words. Which part should you CUT?',
    [
      'The German supermarket chain, its 200 stores, and the year 2022.',
      'The point that collection and washing systems are too expensive for small businesses.',
      'The fact that more companies are moving to reusable packaging.',
    ],
    0,
    '削るのは(A)。For example の後ろの固有名詞（ドイツのチェーン）・数字（200店舗・2022年）は、要約で真っ先に落とす素材です。\n\n(C)は本文の主張そのもの、(B)は However 側の問題点——両論を公平に残すために、どちらも要約に必要です。「主張と両論を残し、例と数字を削る」——この取捨選択に「公平さ」が加わったのが、準1級の要約です。',
    'Cut (A): the material after “For example” — the named chain, the 200 stores, the year — is the first thing a summary drops. (C) is the claim itself and (B) is the problem side of the “but”; fairness requires both to stay. Keep the claim and both sides, cut the examples and numbers: keep-and-cut discipline, with fairness added — the Pre-1 summary in one line.',
  ),
  // 5. concept: 意見文 120〜150語とPOINTS
  con(
    '意見文：120〜150語、4つのPOINTSから2つを選ぶ',
    'The opinion essay: 120–150 words, TWO of the four POINTS',
    'ライティング2問目は意見文。TOPIC（Agree or disagree: 〜）の下に4つのPOINTS（観点）が印刷され、そのうち2つを使って120〜150語で書きます。構成は序論・本論・結論の3部です。\n\n①序論（1〜2文）：立場を明示。I agree with the idea that 〜 ／ 言い換えてTOPICを再提示\n②本論（2段落）：POINTを1つずつ。Firstly, in terms of cost, 〜 ＋ 理由と例。Furthermore, with regard to the environment, 〜\n③結論（1〜2文）：In conclusion, 〜 で立場を再確認\n\nPOINTSの選び方が勝負です。「賢く見える観点」ではなく、理由＋例まで書ける観点を選ぶこと。書き始める前に、各POINTについて「理由を1文、例を1文言えるか」を頭の中でテストしましょう。2つ書けたらそれが採用です。\n\n語調はフォーマルに：a major benefit is 〜 ／ it is essential that 〜 ／ this would allow 〜。なお、使ったPOINTが2つ未満だと内容点を失います。語数も120〜150語を必ず守ってください。',
    'Task 2 prints a TOPIC (“Agree or disagree: …”) with four POINTS beneath it; you must use TWO of them in 120–150 words, shaped as introduction / body / conclusion. ① Introduction (1–2 sentences): state your position — “I agree with the idea that…,” restating the topic in your own words. ② Body (two paragraphs): one POINT each — “Firstly, in terms of cost,…” with a reason and an example, then “Furthermore, with regard to the environment,…” ③ Conclusion: “In conclusion,…” restating the position. Choosing the POINTS is the real game: pick not the two that sound clever but the two you can DEVELOP — before writing, test each point in your head for one reason sentence and one example sentence. Keep the register formal: “a major benefit is…,” “it is essential that…,” “this would allow….” Using fewer than two printed points costs content credit, and the 120–150-word range is non-negotiable.',
    '序論：立場 → 本論：POINT×2（理由＋例）→ 結論\nFirstly, in terms of 〜 ／ Furthermore, with regard to 〜\nPOINTは「書ける2つ」を選ぶ',
  ),
  // 6. practice: 型の組み立て（drag）
  drag(
    '意見文の骨格を完成させてください。',
    'TOPIC: Companies should allow their employees to work from home. — POINTS: Cost / Health / Communication / The environment',
    '___ , I agree that companies should allow their employees to work from home. ___ , in terms of health, remote work removes long commutes, which reduces stress and leaves more time for exercise. ___ , with regard to the environment, fewer commuters means less traffic and lower CO2 emissions. ___ , I believe the benefits of working from home clearly outweigh the drawbacks.',
    ['In my opinion', 'Firstly', 'Furthermore', 'In conclusion', 'However', 'For instance', 'I am not sure'],
    ['In my opinion', 'Firstly', 'Furthermore', 'In conclusion'],
    '立場（In my opinion）→ Firstly ＋ POINT1（Health）→ Furthermore ＋ POINT2（The environment）→ In conclusion、の3部構成です。\n\nHowever は骨格には不要（反対意見に触れる余裕は150語にはありません）、For instance は本論の例の文の中で使うもの、I am not sure は立場を曖昧にするので意見文では禁物。in terms of health ／ with regard to the environment のように、使うPOINTを名指しするのが準1級の作法です。',
    'Position (In my opinion) → Firstly + POINT 1 (Health) → Furthermore + POINT 2 (The environment) → In conclusion. “However” has no seat in the skeleton (150 words leaves no room for the other side), “For instance” belongs inside an example sentence, and “I am not sure” fatally blurs the position. Note the Pre-1 manners: name your chosen POINTS explicitly — “in terms of health,” “with regard to the environment.”',
  ),
  // 7. practice: POINTの選び方
  q(
    'TOPIC: Governments should encourage people to use bicycles for short trips. — POINTS: Cost / Safety / Technology / The environment。賛成の立場で書きます。POINTの選び方として最も良いのはどれでしょう？',
    'You will AGREE with the topic. Which is the best way to choose your two POINTS?',
    [
      'Choose Technology and Safety because they look the most impressive to examiners.',
      'Choose Safety, and argue that cycling on busy roads is dangerous for everyone.',
      'Choose Cost and The environment, because you can give a reason and an example for each: cycling is nearly free, and replacing short car trips cuts emissions.',
    ],
    2,
    '(C)が正解。各POINTに「理由＋例」のテストをかけ、書ける2つ（自転車はほぼ無料／近距離の車をやめれば排出が減る）を選んでいます。\n\n(A)の「賢く見えるから」は最悪の基準——Technology で自転車の利点を2文書けますか？(B)は Safety を選んだ上に「危険だ」と反対方向に展開しており、立場と矛盾します。POINTは中身（理由＋例）で選ぶ。これだけで本論の筆が止まらなくなります。',
    '(C) runs the develop-test on each point and picks the two that pass: cycling costs almost nothing (Cost), and swapping short car trips cuts emissions (The environment) — a reason and an example each. (A) chooses by impressiveness — try writing two sentences on Technology and bicycles. (B) picks Safety and then argues AGAINST the position. Choose points by what you can write, and the body paragraphs write themselves.',
  ),
  // 8. concept: 断定とヘッジ
  con(
    '断定とヘッジ：主張は明確に、根拠は慎重に',
    'Absolute vs hedged: a clear position, careful support',
    '準1級の意見文でよくある失点が、本論の「断定しすぎ」です。\n\n× Working from home always makes every employee happier.\n（always ＋ every——例外を1つ挙げられたら崩れる主張）\n\n○ Working from home tends to reduce commuting stress, so many employees have more energy for their tasks.\n（tends to ／ many——反論されにくく、B2らしい正確さ）\n\n便利なヘッジ表現：tend to 〜（〜する傾向がある）、in many cases（多くの場合）、is likely to 〜（〜しそうだ）、not necessarily（必ずしも〜ではない）、can help 〜（〜の助けになりうる）。\n\nただし、ヘッジするのは根拠の文だけ。立場そのものは I agree ／ I do not think と明確に言い切ります。「主張は鋭く、根拠は慎重に」——これが評価される論調です。リーディングで見た「筆者の限定つき結論」を、今度は自分が書く番です。',
    'The classic Pre-1 essay wound is the over-absolute body sentence. “Working from home ALWAYS makes EVERY employee happier” collapses at the first counter-example. “Working from home TENDS TO reduce commuting stress, so MANY employees have more energy” resists attack — and sounds B2. The hedge kit: tend to, in many cases, is likely to, not necessarily, can help. But hedge only the SUPPORT: the position itself stays sharp — I agree / I do not think, no wavering. A sharp claim on careful evidence is exactly the qualified voice you learned to FIND in Reading; now you write in it.',
    '立場 → 言い切る（I agree ／ I do not think）\n根拠 → ヘッジ（tend to ／ in many cases ／ is likely to）\nalways ／ every の断定は反例一発で崩れる',
  ),
  // 9. practice: ヘッジの産出（gap）
  gap(
    '断定を避けて文を和らげる副詞を、1語で入力してください。',
    'Bigger budgets do not (   ) lead to better schools; how the money is spent matters just as much.',
    ['necessarily', 'always', 'automatically', 'inevitably'],
    'not necessarily（必ずしも〜ではない）の necessarily が代表的な答えです（always ／ automatically ／ inevitably も正解）。「予算が増えれば学校が良くなる、とは限らない」と断定を避けた1文でした。\n\nnot necessarily は、意見文で反対側に一言だけ触れたいときにも、要約で本文の限定つき結論を写し取るときにも効く万能ヘッジ。書けるレベルにしておきましょう。',
    '“Not necessarily” is the model answer (always, automatically and inevitably also fit): bigger budgets do not necessarily mean better schools. This is the all-purpose hedge — it lets an essay nod to the other side in two words, and it reproduces exactly the kind of qualified conclusion Pre-1 passages love. Have it ready to write, not just to read.',
  ),
  // 10. recap
  con(
    'まとめ：要約60〜70語、意見文120〜150語',
    'Recap: summary 60–70 words, essay 120–150 words',
    '・要約は60〜70語。変化→利点→However＋問題点の骨組みを、両論公平に\n\n・固有名詞・数字・例を削り、自分の言葉に言い換える。意見は書かない\n\n・While 〜 の1文圧縮が最大の武器\n\n・意見文は120〜150語。序論・本論（POINT×2）・結論\n\n・POINTは「理由＋例まで書ける2つ」を選ぶ\n\n・立場は言い切り、根拠はヘッジ（tend to ／ not necessarily）\n\n次のレッスンは、リスニング。1回しか流れない自然なスピードの英語と、Real-Life形式の攻略です。',
    '• Summary: 60–70 words; the change → advantages → However + problems skeleton, both sides treated fairly.\n\n• Cut names, numbers and examples; paraphrase; no opinions.\n\n• The “While…” one-sentence compression is your best tool.\n\n• Essay: 120–150 words; introduction / body (two POINTS) / conclusion.\n\n• Choose the two POINTS you can develop with a reason and an example.\n\n• State the position sharply; hedge the support (tend to / not necessarily).\n\nNext lesson: Listening — natural-speed English heard only once, and the Real-Life format.',
  ),
]

// ── Lesson 4 リスニング：Part 1〜3 ──────────────────────────────────────────
const PRE1_LISTENING = [
  // 1. concept: Part 1 の形式
  con(
    'Part 1：長い会話、結論は交渉の末に',
    'Part 1: longer conversations — the conclusion is negotiated',
    '準1級リスニングは29問、すべて1回しか流れません。Part 1 は会話が12問。4〜8往復のぐっと長い会話が自然なスピードで流れ、最後に質問が読まれます。紙に印刷されているのは4つの選択肢だけ。\n\n会話が長くなると、何が変わるか。話し手が意見を変えるのです。最初に反対していた人が説得されて賛成に回る、AとBの案からCという折衷案が生まれる——準1級の会話は小さな交渉です。\n\nだから鉄則は2つ。\n\n①最初の発言で決めない。質問が What will they do? なら、答えは交渉の末の最終合意——最後の1〜2往復にあります\n②先読みはここでも武器。選択肢が全部「行動」なら next の質問、「意見」なら think の質問を予想\n\nそして正解は必ず言い換え。音声の単語をそのまま含む選択肢は、途中で捨てられた案であることが多いのです。',
    'Pre-1 Listening is 29 questions, everything heard ONCE. Part 1 is 12 conversations — long ones, four to eight turns at natural speed, with the question spoken at the end and only the four options printed. Length changes the game: speakers change their minds. The early objector gets persuaded; plans A and B merge into compromise C — a Pre-1 conversation is a small negotiation. Two rules follow: never answer from the opening turns — if the question is “What will they do?”, the answer is the FINAL agreement, in the last exchange or two; and preview as always — all-action options predict a what-next question, opinion-shaped options predict a what-does-she-think question. The correct option paraphrases; an option that echoes the audio word for word is often a plan that was abandoned mid-conversation.',
    '長い会話＝小さな交渉\n途中の案に飛びつかない → 最終合意は最後の1〜2往復\n音声の単語そのまま → 捨てられた案を疑う',
  ),
  // 2. practice: Part 1
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'M: The garage called about our car. Fixing the engine will cost at least two thousand dollars.\nW: Two thousand? That’s nearly what the car is worth. Maybe it’s time to replace it.\nM: A new car would mean monthly payments, though. Our budget is already tight.\nW: True. But we’d save on repairs, and newer cars use far less fuel.\nM: I suppose so. Still, I’d rather not decide anything until we see the exact repair estimate in writing.\nW: Fair enough. Ask the garage to send it today, and let’s compare the numbers this weekend.\nQuestion: What do the speakers agree to do?',
    [
      'Buy a new car this weekend.',
      'Compare costs after getting a written estimate.',
      'Pay two thousand dollars for the engine repair.',
      'Sell their car to the garage.',
    ],
    1,
    '交渉の結末は最後の2往復。「正式な見積もりを見るまで決めたくない」→「では今日送ってもらって、週末に数字を比べましょう」——(B)が正解です。\n\n「買い替え時かも」(A)は女性の途中の案で、まだ合意ではありません。(C)の2,000ドルは修理費の情報、(D)は登場しません。意見が動く会話では、途中の案に飛びつかず最終合意を待つ——Part 1 の型どおりでした。',
    'The negotiation settles in the last two exchanges: “I’d rather not decide until we see the exact estimate in writing” → “Ask them to send it today, and let’s compare the numbers this weekend” — (B). Replacing the car (A) was the woman’s mid-conversation proposal, never agreed; $2,000 (C) is the repair quote, not a decision; (D) never happens. When opinions move, wait for the final agreement.',
  ),
  // 3. practice: Part 1（意見が変わる）
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: Did you hear the company is moving the sales conference online this year?\nM: Yes, and honestly I’m relieved. The flights and hotels always ate up our department’s budget.\nW: I don’t know. You lose something when nobody meets face to face. Last year I found two new clients just chatting over coffee.\nM: That’s true — I hadn’t thought of it that way. Maybe a mix would work: online most years, in person every second year.\nW: Now that I could support. Why don’t you propose it to the director?\nM: All right. I’ll draft an e-mail this afternoon.\nQuestion: What will the man probably do next?',
    [
      'Book flights and hotels for the conference.',
      'Meet two new clients over coffee.',
      'Cancel this year’s online conference.',
      'Write to the director about a mixed plan.',
    ],
    3,
    '最後の2往復が決め手。「折衷案を部長に提案しては？」→「今日の午後メールを書きます」——draft an e-mail を write to the director と言い換えた(D)が正解です。\n\n男性は最初「オンラインで安心」でしたが、女性の反論を受けて折衷案へ——まさに意見が動く準1級の会話です。(B)の clients over coffee は女性の去年の話。聞こえた語の再利用に注意、でしたね。',
    'The last exchange decides: “Why don’t you propose it to the director?” → “I’ll draft an e-mail this afternoon” — paraphrased as “write to the director,” (D). The man starts relieved about online, hears the counter-argument, and lands on a compromise — a Pre-1 conversation in miniature. The clients over coffee (B) are the woman’s memory of LAST year: recycled words, wrong speaker, wrong time.',
  ),
  // 4. concept: Part 2 — 1本のパッセージに質問2つ
  con(
    'Part 2：150語のパッセージに質問が2つ',
    'Part 2: ~150-word passages, TWO questions each',
    'Part 2 は説明文の聞き取り。約150語のアカデミック寄りのパッセージ（科学・社会・歴史の小話）が6本流れ、各パッセージに質問が2つ——計12問です。\n\n質問が2つ、がポイント。問題用紙には選択肢が2セット印刷されています。聞く前の10秒で両方のセットに目を走らせ、「何が2回聞かれるか」を予想してから聞き始めましょう。\n\n出題の型はだいたい決まっています。1問目はパッセージ前半の主題や問題（What is one problem with 〜?）、2問目は後半の展開・結果・研究者の注意（What do researchers say about 〜?）。つまり、前半と後半に1つずつ「聞きどころ」を構えるのです。\n\n中身への攻め方は変わりません：数字はラベルごと、However のあとに本命の情報、正解は言い換え。なお、このレッスンでは練習のため1クリップ1問で出題します。',
    'Part 2 is the lecture-lite section: six ~150-word passages (science, society, history) with TWO questions each — 12 questions. The “two” is the whole tactic. The booklet prints two sets of options per passage; in the ten seconds before the audio, scan BOTH sets and predict what will be asked twice. The pattern is stable: question 1 targets the first half — the topic or the problem (“What is one problem with…?”) — and question 2 targets the second half — the development, the result, or the researchers’ caution (“What do researchers say about…?”). So you station one ear on each half. Inside the passage, the usual weapons work: numbers with labels, the key fact after “However,” paraphrased correct options. (In this lesson we drill one question per clip for practice.)',
    '1本のパッセージ × 質問2つ\n1問目 → 前半（主題・問題）\n2問目 → 後半（結果・研究者の注意）',
  ),
  // 5. practice: Part 2（後半の注意）
  qa(
    'パッセージと質問を聞いて、答えを選んでください。',
    'Listen to the passage and the question.',
    'In many large cities, summer temperatures are rising faster than in the surrounding countryside, partly because dark roads and rooftops absorb heat all day. To fight this, some city governments have begun painting rooftops white. White surfaces reflect sunlight, and in test districts, top-floor apartments became noticeably cooler in summer. However, researchers caution that the approach suits some places better than others. In cooler climates, reflecting sunlight in winter can push heating costs up, so the same paint that saves energy in one city may waste it in another.\nQuestion: What do researchers say about white rooftops?',
    [
      'How well they work depends on the local climate.',
      'They cool buildings equally well in every region.',
      'They are too expensive for most city governments.',
      'They stop working after a few years of use.',
    ],
    0,
    'However のあとが根拠。suits some places better than others ＋「涼しい地域では暖房費が上がりうる」を、「効果は土地の気候しだい」と言い換えた(A)が正解です。\n\n(B)はその逆、(C)の費用、(D)の寿命は語られていません。「研究者は何と言っているか」という2問目型の質問は、後半の However ／ caution の周辺が定位置——聞きどころを後半に構えられたかが勝負でした。',
    'The evidence sits after “However”: the approach “suits some places better than others,” and in cooler climates the paint can raise heating costs — paraphrased as “depends on the local climate,” (A). (B) reverses it; cost (C) and durability (D) never come up. A “what do researchers say” question is second-question type: its home is the second half, around “However” and “caution.” That is where your ear should have been stationed.',
  ),
  // 6. practice: Part 2（理由の聞き取り）
  qa(
    'パッセージと質問を聞いて、答えを選んでください。',
    'Listen to the passage and the question.',
    'For decades, night trains in Europe were disappearing, as budget airlines offered faster and cheaper ways to travel. Recently, however, several railway companies have brought them back, and many routes now sell out weeks in advance. The change is driven partly by travelers who want to avoid the carbon emissions of flying, and partly by new sleeping cars that offer private rooms and showers. Companies admit that night trains still cost more than budget flights, but they expect demand to keep growing, especially among younger passengers planning long summer trips.\nQuestion: Why have night trains become popular again?',
    [
      'Flying in Europe has become much more expensive.',
      'Many airlines have stopped selling cheap tickets.',
      'Travelers want to avoid emissions and like the new sleeping cars.',
      'Railway companies cut their prices below budget airlines.',
    ],
    2,
    'driven partly by 〜 and partly by 〜 が根拠。「飛行機の排出を避けたい旅行者」と「個室・シャワーつきの新型寝台車」の2つの理由をまとめた(C)が正解です。\n\n(A)(D)は価格の逆転を語っていますが、音声は still cost more than budget flights——夜行列車の方がまだ高いと明言しています。理由が2つ並ぶときは、片方だけの選択肢より両方を含む選択肢——partly by … and partly by … は2つセットの合図です。',
    '“Driven partly by… and partly by…” — two reasons, both captured in (C): travelers avoiding flight emissions, and the new private-room sleeping cars. (A) and (D) invert the prices: the audio says night trains STILL cost more than budget flights. When you hear “partly by… and partly by…,” expect the correct option to hold both halves.',
  ),
  // 7. concept: Part 3 Real-Life形式
  con(
    'Part 3 Real-Life形式：印刷されたSituationの条件で消す',
    'Part 3, the Real-Life format: eliminate with the printed conditions',
    'Part 3 は準1級ならではの Real-Life形式が5問。問題用紙に Situation（あなたの状況）が印刷されていて、10秒で読んでから、アナウンスや留守番電話を聞きます。質問は音声では読まれません——「あなたはどうすべきか」が印刷されているだけです。\n\nSituation には必ず条件が2〜3個埋まっています。「今日中に」「予算は8,000円まで」「午後2時までに戻る」——これがあなたの絞り込みフィルターです。\n\n①10秒で条件に下線を引く（時間・お金・曜日・持ち物）\n②音声は「選択肢のカタログ」。案内される各オプションを条件と照合\n③条件を1つでも破るオプションを消す——残った1つが正解\n\n誤答の選択肢は、音声に実際に登場した「別の人向けの正しい行動」です。だから「聞こえたかどうか」では選べません。条件に合うかどうか、だけが基準です。このコースでは、本番と同じように Situation を問題文に印刷して出題します。',
    'Part 3 is the Pre-1 specialty: five Real-Life items. A SITUATION is printed in the booklet — you get ten seconds to read it — and then an announcement or voicemail plays. No question is spoken; the printed prompt asks what YOU should do. The Situation always buries two or three conditions: today, within 8,000 yen, back by 2 p.m. Those are your filter. ① In the ten seconds, underline the conditions (time, money, day, luggage). ② Treat the audio as a CATALOGUE of options, checking each against the conditions. ③ Eliminate every option that breaks a condition — the survivor is the answer. The traps are real actions from the audio that suit a DIFFERENT listener, so “I heard it” proves nothing; only “it fits my conditions” does. In this course, the Situation is printed in the question text, exactly as on the real test.',
    'Situation の条件＝絞り込みフィルター\n音声＝オプションのカタログ\n条件を破る選択肢を消す → 残った1つが正解',
  ),
  // 8. practice: Real-Life
  qa(
    'Situationを読んでから、アナウンスを聞いて答えてください。質問は音声では読まれません。',
    'Situation: You are at a city sports center. You want to join a beginner swimming class that meets on weekday evenings. Your budget is 8,000 yen a month.\n\nListen to the announcement. Which class should you choose?',
    'Thank you for visiting Riverside Sports Center. We are now taking sign-ups for next month’s swimming classes. The beginner class with Coach Yamada meets on Tuesday and Thursday evenings at seven, and costs seven thousand yen a month. Our popular intermediate class meets on Monday and Wednesday evenings, for nine thousand yen a month. If your weekdays are busy, a new beginner class will open on Saturday mornings at ten, also for seven thousand yen. Finally, private lessons are available on request at five thousand yen per hour. Sign-up sheets are at the front desk.',
    [
      'The class with Coach Yamada.',
      'The Monday and Wednesday class.',
      'The Saturday morning class.',
      'Private lessons.',
    ],
    0,
    '条件は3つ：初心者向け・平日の夜・月8,000円まで。山田コーチのクラスは火木の夜・初心者・月7,000円で全条件クリア——(A)が正解です。\n\n月水クラス(B)は中級者向けで9,000円（2条件違反）、土曜朝(C)は初心者でも平日の夜ではない、個人レッスン(D)は1時間5,000円で週2回通えば予算を大きく超えます。すべて音声に実際に登場した行動——条件と照らした人だけが正解できる、Real-Life形式の典型でした。',
    'Three conditions: beginner, weekday evenings, within 8,000 yen a month. Coach Yamada’s class — Tuesday and Thursday evenings, beginner, 7,000 yen — passes all three: (A). The Monday/Wednesday class (B) is intermediate AND 9,000 yen; Saturday morning (C) fails the weekday-evening condition; private lessons (D) at 5,000 yen per hour explode the budget. Every option really was announced — only the conditions separate them. Real-Life in its purest form.',
  ),
  // 9. practice: Real-Life（時間条件）
  qa(
    'Situationを読んでから、アナウンスを聞いて答えてください。質問は音声では読まれません。',
    'Situation: It is 1:50 p.m. and you are at Greenhill Station with a large suitcase. You need to reach the airport by 3:00 p.m.\n\nListen to the announcement. What should you do?',
    'May I have your attention, please. Because of a fallen tree on the line, express trains to the airport are suspended until further notice. Passengers traveling to the airport have several alternatives. Local trains are still running, but they take ninety minutes and are extremely crowded at the moment. The express bus leaves from stop number three every twenty minutes; it takes fifty minutes and has luggage space under the floor. Taxis are available at the east exit, although the waiting time there is currently over thirty minutes. Passengers who are not in a hurry are welcome to wait for express service to resume. We apologize for the inconvenience.',
    [
      'Wait at the station for the express train to resume.',
      'Take a local train to the airport.',
      'Line up for a taxi at the east exit.',
      'Take the express bus from stop number three.',
    ],
    3,
    '条件は「3時までに空港」「大きなスーツケース」、現在1時50分。エクスプレスバスは20分間隔・所要50分・床下に荷物スペース——最悪でも約3時に到着でき、唯一条件を満たす(D)が正解です。\n\n普通列車(B)は90分で3時20分着、タクシー(C)は待ちだけで30分超、運転再開待ち(A)は「急がない人向け」と音声が明言。時間の計算と荷物の条件、2つのフィルターで3つを消す——Real-Life形式の消去法、仕上がってきましたね。',
    'Conditions: airport by 3:00, large suitcase; it is now 1:50. The express bus — every 20 minutes, 50 minutes’ ride, luggage space under the floor — arrives around 3:00 even in the worst case and is the only option that passes: (D). The local train (B) needs 90 minutes (3:20), the taxi queue (C) alone eats 30+ minutes, and waiting for the express (A) is explicitly for passengers NOT in a hurry. Two filters — arithmetic and luggage — eliminate three options.',
  ),
// 10. recap
  con(
    'まとめ：1回きりの音声を、型で受け止める',
    'Recap: one hearing, three formats, one method',
    '・Part 1は長い会話。提案→難色→修正→合意の流れを追い、結論は最後の発言\n\n・選択肢の先読みで質問を予想。音声の単語そのままの選択肢はワナを疑う\n\n・Part 2は150語のパッセージに質問2つ。印刷された設問文を両方先読みして、注意を2か所に配る\n\n・However のあとに本命の情報。数字はラベルごと\n\n・Part 3 Real-Lifeは、印刷されたSituationの条件で消去。「聞こえた」ではなく「条件に合う」が基準\n\n次のレッスンは、スピーキング。4コマナレーションと、社会的な話題への意見です。',
    '• Part 1: long conversations — track propose → object → adjust → agree; the conclusion lives in the last turns.\n\n• Preview the printed options; word-for-word echoes of the audio are suspects.\n\n• Part 2: ~150-word passages with TWO questions — preview both printed stems and split your attention.\n\n• The key information follows “however”; track numbers with their labels.\n\n• Part 3 Real-Life: eliminate by the printed Situation’s conditions, never by what you merely heard.\n\nNext lesson: Speaking — the four-panel narration and social-issue opinions.',
  ),
]

// ── Lesson 5 スピーキング：4コマナレーションと社会的話題 ────────────────────
// Screens 3 and 4 (drag + gap) are about the four-panel story card and get
// the ec-pre1-panels illustration attached later — see the EIKEN course image
// brief. They read fine without the image (the panels are described in the prompt).
const PRE1_SPEAKING = [
  // 1. concept: 面接の流れとナレーションの型
  con(
    '面接の流れ：4コマを1分で組み立て、2分で語る',
    'The interview: one minute to build the four panels, two to tell them',
    '準1級の二次試験は面接です。流れは固定：あいさつと小さな雑談 → 4コマ漫画のカードを受け取る → 1分で考える → 2分でナレーション → カードについての質問（No.1）→ カードを伏せて社会的な話題への質問（No.2〜No.4）。\n\nナレーションの型は3つだけ。\n\n①カードに印刷された最初の1文から始める（必ず読み上げる）\n②各コマの上に印刷された時間表現（The next week ／ Six months later）を、コマの切り替えでそのまま使う\n③すべて過去形。1コマにつき2〜3文——「誰が何をした」＋セリフや表情を言葉に\n\n吹き出しのセリフは He said, “〜.” か He suggested -ing で必ず拾うこと。4コマ目は物語の「結末」で、たいてい新しい問題や皮肉な展開が描かれます。ここを丁寧に語っておくと、直後の No.1 がそのまま答えやすくなります。\n\n2分は意外と長く、沈黙は採点に響きます。止まらず、コマからコマへ。',
    'The Pre-1 interview is fixed: greetings and small talk → a four-panel cartoon card → ONE minute to prepare → TWO minutes to narrate → a question about the card (No.1) → card face down, then social-topic questions (No.2–No.4). The narration has three laws: start with the printed first sentence (read it aloud); reuse the time captions printed above each panel (The next week / Six months later) as your panel hinges; and keep everything in the past tense, two or three sentences per panel — who did what, plus the speech bubbles and faces put into words (He said, “…” / He suggested -ing). Panel 4 is the punchline — usually a new problem or an ironic turn — and narrating it carefully sets up No.1, which will ask about exactly that moment. Two minutes is longer than it feels, and silence costs points: keep moving, panel to panel.',
    '①印刷された1文から\n②コマ上の時間表現で切り替え\n③過去形で1コマ2〜3文、セリフも言葉に',
  ),
  // 2. practice: ナレーションの方針
  q(
    'ナレーションのしかたとして最も良いのはどれでしょう？',
    'Which is the best way to handle the two-minute narration?',
    [
      'Spend most of the two minutes describing the first panel in detail.',
      'Tell the story in the present tense to make it lively.',
      'Start with the printed sentence and give each panel two or three past-tense sentences, using the printed time captions.',
    ],
    2,
    '(C)が正解。印刷された1文 → 各コマ2〜3文・過去形 → コマ上の時間表現で切り替え——ナレーションの3つの型そのものです。\n\n(A)のように1コマ目に時間を使いすぎると、肝心の4コマ目（No.1で聞かれる結末）が駆け足になります。2分を4等分するつもりで。(B)の現在形は、準1級ナレーションでは時制の誤りとして減点対象——物語は過去形で語ります。',
    '(C): the printed sentence, then two or three past-tense sentences per panel, hinged with the printed time captions — the three laws in one option. Burning the clock on panel 1 (A) starves panel 4, the punchline No.1 will ask about; budget the two minutes in four equal parts. And the present tense (B) is scored as a tense error at Pre-1 — stories are told in the past.',
  ),
  // 3. practice: 時間表現の組み立て（drag）
  drag(
    '4コマの物語です。印刷された最初の1文は “One day, Mr. and Mrs. Sato were talking about how crowded the buses in their town had become.” 各コマの上に印刷された時間表現を、ナレーションの正しい位置に置いてください。',
    'The four panels: ① The Satos talk about crowded buses. ② At a town meeting, Mr. Sato proposes a bike-sharing program. ③ Bicycle stations appear around town, and people ride happily. ④ Mr. Sato finds a pile of rental bicycles dumped in front of the station.',
    '___ , Mr. Sato suggested starting a bike-sharing program at a town meeting. ___ , bicycle stations had been set up around town, and many people were riding the shared bikes. ___ , Mr. Sato found a pile of rental bicycles left lying in front of the station.',
    ['The next week', 'Six months later', 'One morning', 'For example', 'In other words', 'Because'],
    ['The next week', 'Six months later', 'One morning'],
    'The next week（提案）→ Six months later（普及）→ One morning（新しい問題の発見）。カードに印刷された時間表現をそのまま置くだけで、4コマが1本の物語になります。\n\nFor example と In other words は論説のつなぎ語で、物語の時間を進めません。Because は文頭のこの位置に置けません。動詞も suggested → had been set up → found とすべて過去側——時間表現と過去形、ナレーションの2大ルールがそろいました。',
    'The next week (the proposal) → Six months later (the program spreads) → One morning (the new problem appears). Drop in the printed captions and four panels become one story. “For example” and “In other words” are essay connectors — they move no time — and “Because” cannot sit in these slots. The verbs ride the past side too: suggested → had been set up → found. Captions plus past tense: the two laws of narration.',
  ),
  // 4. practice: 過去形の産出（gap）
  gap(
    '3コマ目のナレーションです。動詞 notice を正しい形（過去形）にして、1語で入力してください。',
    'Six months later, Mr. Sato (   ) that many people had started riding the shared bicycles to the station.',
    ['noticed'],
    'notice → noticed が正解。Six months later で時間が進み、動詞は過去形——ナレーションの2大ルールが1文に入っています。\n\nそのあとの had started は「気づいた時点よりさらに前」を表す過去完了。準1級のナレーションでは、この一段深い時制が言えると描写がぐっと正確になります。まずは過去形が自動で出ること、それが土台です。',
    '“Noticed” — notice in the past tense, riding behind “Six months later”: both laws of narration in one sentence. The “had started” after it is past perfect — events before the noticing — and that extra layer of tense is what makes a Pre-1 narration precise. But the foundation is automatic past forms; build that first.',
  ),
  // 5. concept: No.1 仮定の質問
  con(
    'No.1：If you were 〜 には would で、その人の声で',
    'No.1: “If you were…” takes would — and that person’s voice',
    'ナレーションが終わると、面接官はこう聞きます：Please look at the fourth picture. If you were Mr. Sato, what would you be thinking?\n\n4コマ目の人物になりきる仮定の質問です。答えの型は決まっています。\n\nI’d be thinking, “〜.” ——引用符の中は、その人の心の声。\n\n中身は2文。①状況への気持ちや判断、②次にどうしたいか（would ／ should を使って）。\n\nI’d be thinking, “People love the bikes, but leaving them like this will turn the town against the program. We should add more parking spaces near the station.”\n\nやってはいけないのは2つ。三人称でナレーションを続けること（Mr. Sato was sad…——なりきれていません）と、仮定の would を落として現在形で答えること。If you were と聞かれたら would で返す——文法がそのまま得点になります。',
    'After the narration comes: “Please look at the fourth picture. If you were Mr. Sato, what would you be thinking?” — a hypothetical that asks you to BECOME the person in panel 4. The frame is fixed: “I’d be thinking, ‘…’” — and inside the quotation marks, that person’s inner voice, two sentences: ① the feeling or judgment about the situation, ② what to do next, carried by would or should. “I’d be thinking, ‘People love the bikes, but leaving them like this will turn the town against the program. We should add more parking spaces near the station.’” Two fatal moves: continuing the narration in the third person (“Mr. Sato was sad…” — you never became him), and dropping the hypothetical would for plain present tense. “If you were…” must be answered with would — the grammar itself is scored.',
    'Q: If you were 〜, what would you be thinking?\nA: I’d be thinking, “気持ち＋次の一手（would/should）”\n三人称で続けない・wouldを落とさない',
  ),
  // 6. practice: No.1 の答え方
  q(
    '4コマ目：佐藤さんが、駅前に山積みに放置されたレンタル自転車を見つけた場面です。質問：If you were Mr. Sato, what would you be thinking? — 最も良い答えはどれでしょう？',
    'Choose the best answer to the examiner’s question.',
    [
      'I’d be thinking, “The program has become popular, but bicycles left like this will cause complaints. We should create more parking areas and clearer rules.”',
      'Mr. Sato was very surprised because there were many bicycles in front of the station.',
      'I like riding bicycles very much, so I would be happy to see so many bicycles.',
    ],
    0,
    '(A)が正解。I’d be thinking, “〜” の型で佐藤さんになりきり、状況の判断（放置は苦情のもと）＋次の一手（駐輪場とルールを増やすべき）を would ／ should で語っています。\n\n(B)は三人称のナレーションの続きで、仮定の質問に答えていません。(C)は自分の趣味の話になり、4コマ目の「問題」を見落としています。人物の立場で、2文、would——No.1 の3点セットです。',
    '(A) enters the frame — “I’d be thinking, ‘…’” — judges the situation (dumped bikes breed complaints) and proposes the next move (more parking, clearer rules) with would/should. (B) is third-person narration continuing past its welcome: the question was hypothetical. (C) drifts into personal taste and misses the PROBLEM the fourth panel paints. In character, two sentences, would: the No.1 set of three.',
  ),
  // 7. concept: No.2〜No.4 社会的な話題
  con(
    'No.2〜No.4：立場＋理由＋例を3〜4文で',
    'No.2–No.4: position + reason + example, in three or four sentences',
    'カードを伏せたら、面接の後半は社会的な話題への意見です。カードのテーマから広がって、環境、テクノロジー、働き方、地域社会——Do you think 〜? や Should 〜? の形で3問続きます。\n\n答えの型は1つだけ。\n\n①立場：Yes, I think so. ／ No, I don’t think so.（まず言い切る）\n②理由：because や The main reason is 〜 で1〜2文\n③例または補足：For example, 〜 で1文\n\n3〜4文で1セット。ライティングで使ったヘッジ（tend to ／ in many cases ／ not necessarily）は口頭でも有効で、断定しすぎない大人の論調を作ってくれます。\n\n面接官が Why? や What about 〜? と追い打ちをかけてくることもありますが、これは不合格のサインではなく、会話を深める普通の流れ。理由をもう1つ、例をもう1つ——同じ型で答え続ければいいのです。完璧な内容より、止まらない3〜4文。',
    'Card face down, the second half begins: three questions of opinion on social themes radiating out from the card — the environment, technology, ways of working, local communities — shaped as “Do you think…?” or “Should…?”. One frame answers them all: ① position first, said plainly — “Yes, I think so.” / “No, I don’t think so.”; ② reason — one or two sentences on “because” or “The main reason is…”; ③ an example or supporting sentence — “For example,…”. Three or four sentences per answer. The hedges from Writing (tend to, in many cases, not necessarily) work aloud too, giving you the measured, adult tone Pre-1 rewards. The examiner may press — “Why?” “What about…?” — and that is not failure but conversation: answer the push with the same frame, one more reason, one more example. Unbroken sentences beat perfect ones.',
    '①Yes, I think so. ／ No, I don’t think so.\n②The main reason is 〜（1〜2文）\n③For example, 〜（1文）',
  ),
  // 8. practice: 社会的話題への答え
  q(
    '質問：Do you think companies should be responsible for reducing plastic waste? — 最も良い答えはどれでしょう？',
    'Choose the best answer to the examiner’s question.',
    [
      'Yes. Plastic is bad for the sea.',
      'Yes, I think so. Companies create most plastic packaging, so they are in the best position to reduce it. For example, some supermarkets have switched to refill stations, and customers have accepted the change quickly.',
      'I don’t know much about plastic waste, so I cannot answer this question.',
    ],
    1,
    '(B)が正解。立場（Yes, I think so）→ 理由（包装の大半を作る企業こそ減らせる立場にある）→ 例（量り売りへの切り替え）と、3〜4文の型どおりです。\n\n(A)は立場と理由が一応ありますが2文で途切れ、準1級の「掘り下げ」には足りません。(C)は答える前に降りてしまっています——知識を試す試験ではないので、身近な例ひとつで充分戦えます。型に乗せて、3〜4文を言い切りましょう。',
    '(B): position (Yes, I think so) → reason (the makers of most packaging are best placed to reduce it) → example (refill stations, accepted quickly) — the frame at full length. (A) technically has a position and a reason but dies after two thin sentences — under-developed for Pre-1. (C) surrenders before answering; the interview tests opinion, not expertise, and one everyday example is enough ammunition. Ride the frame to the fourth sentence.',
  ),
  // 9. practice: 答えに詰まったとき
  q(
    '面接官が、考えたこともない話題について質問してきました。最も良い対応はどれでしょう？',
    'The examiner asks about a topic you have never thought about. What is the best move?',
    [
      'Pause silently until the examiner moves on to the next question.',
      'Say “I have no opinion about that” and wait for an easier topic.',
      'Take a position anyway, give one honest reason, and add a simple example from your daily life.',
    ],
    2,
    '(C)が正解。準1級の面接は知識のテストではなく、英語で意見を組み立てる力のテスト。その場で立場を決め、正直な理由1つと身近な例1つを型に乗せれば、内容が素朴でも十分得点できます。Well, let me see. のようなつなぎ表現で考える時間を稼ぐのも立派な技術です。\n\n(A)の沈黙はアティチュードの面で最大の失点、(B)の「意見はありません」は質問を丸ごと手放してしまいます。どんな話題でも、型＋3〜4文。それがこのレッスンの結論です。',
    '(C). The interview tests your ability to BUILD an opinion in English, not your expertise: pick a side on the spot, give one honest reason and one everyday example, and the frame carries you — simple content scores. Buying thinking time aloud (“Well, let me see…”) is legitimate technique. Silence (A) is the single biggest attitude loss, and “I have no opinion” (B) hands the question back unanswered. Any topic, same frame, three or four sentences — the lesson in one line.',
  ),
  // 10. recap
  con(
    'まとめ：過去形で2分、wouldで答え、型で意見を',
    'Recap: two minutes in the past tense, would for the hypothetical, the frame for opinions',
    '・ナレーションは印刷された1文から。コマ上の時間表現で切り替え、過去形で1コマ2〜3文\n\n・セリフは He said, “〜.” で拾う。4コマ目の結末は丁寧に\n\n・No.1 は If you were 〜 → I’d be thinking, “〜.”——なりきって2文、would を落とさない\n\n・No.2〜No.4 は立場＋理由＋例の3〜4文。ヘッジは口頭でも武器\n\n・沈黙だけが敵。つなぎ表現で時間を稼ぎ、型に乗せて言い切る\n\n次は総まとめレッスン。準1級レベル全体の腕試しです。',
    '• Narration: start from the printed sentence; hinge on the printed time captions; past tense, two or three sentences per panel.\n\n• Catch the speech bubbles with He said, “…”; give panel 4, the punchline, its full due.\n\n• No.1: “If you were…” → “I’d be thinking, ‘…’” — in character, two sentences, would intact.\n\n• No.2–No.4: position + reason + example in three or four sentences; hedges work aloud too.\n\n• Silence is the only enemy — buy time aloud and ride the frame to the end.\n\nNext: the level review — everything in Grade Pre-1, mixed.',
  ),
]

// ── Lesson 6 総まとめ：準1級 ────────────────────────────────────────────────
const PRE1_REVIEW = [
  // 1. intro
  con(
    '総まとめ：準1級の全パターン',
    'The Grade Pre-1 review: every pattern, mixed',
    'このレベルで学んだことを、本番と同じようにシャッフルして確認します。\n\n・大問1：訳すのではなく、コロケーションと相方で消す（rely heavily on ／ rule out a possibility）\n・大問2：譲歩→反転→限定の鎖。空所は前後の文の関係で\n・大問3：設問が先、段落を地図に。声を聞き分け、筆者の限定つき結論へ\n・要約：60〜70語、両論を公平に。While 〜 の1文圧縮\n・意見文：120〜150語、POINTSは「書ける2つ」。立場は鋭く、根拠はヘッジ\n・リスニング：最終合意を待つ、パッセージは前半・後半に聞きどころ、Real-Lifeは条件で消す\n・面接：過去形のナレーション、If you were には would、意見は型で3〜4文\n\n間違えても大丈夫。どのパターンだったかを確認すれば、それが本番の1点になります。',
    'Everything this level taught, shuffled like the real test: eliminate by collocation, not translation (rely heavily on / rule out a possibility); the concession → reversal → qualification chain in 大問2; question-first paragraph mapping and the author’s qualified voice in 大問3; the 60–70-word summary that treats both sides fairly, with the “While…” compression; the 120–150-word essay built on the two POINTS you can develop, position sharp and support hedged; listening for the final agreement, stationing an ear on each half of the passage, and condition-elimination in Real-Life; and the interview — past-tense narration, would for the hypothetical, the three-to-four-sentence opinion frame. Miss one? Identify the pattern — that is a point earned for test day.',
  ),
  // 2. vocab: 副詞コロケーション
  q(
    '空所に入る語を選んでください。',
    'Reliable weather forecasts are now (   ) available to farmers in the region through a free smartphone app.',
    ['heavily', 'deeply', 'widely', 'strictly'],
    2,
    'widely available（広く手に入る）の組み合わせで widely が正解。「無料アプリを通じて、信頼できる天気予報が地域の農家に広く提供されている」という文です。\n\nheavily は rely と、deeply は concerned と、strictly は prohibited と組む副詞。意味ではなく相方で消す——大問1の消去法、身についてきましたか。',
    '“Widely available” — the adjective summons its adverb. Heavily pairs with rely, deeply with concerned, strictly with prohibited. Eliminate by partner, not by translation: the 大問1 method, one more time.',
  ),
  // 3. vocab: 抽象句動詞
  q(
    '空所に入る語を選んでください。',
    'Engineers have (   ) out the possibility of a software error, so attention has now turned to the machine’s wiring.',
    ['set', 'ruled', 'figured', 'handed'],
    1,
    'rule out 〜（〜の可能性を排除する）の ruled が正解。「ソフトウェアの誤りの可能性は排除されたので、注目は配線に移った」という文です。\n\n決め手はやはり目的語の the possibility。set back は「遅らせる」、figure out は答えを「解き明かす」。動詞＋前置詞＋典型的な目的語の3点セット——rule out a possibility、もう手の内ですね。',
    '“Ruled out” — the object “the possibility” chooses the chunk, and the second clause confirms it: that possibility is gone, so attention moved on. Set back delays, figure out solves. Verb + particle + typical object: rule out a possibility, now firmly yours.',
  ),
  // 4. 大問2：論理の空所
  q(
    '本文の空所に入る語句を選んでください。',
    '【本文の一部】\nFor years, the village of Kanaya promoted its hot springs to attract visitors, with little success. Two years ago, it began offering its empty houses to young craftspeople at very low rent. (    ), the village now hosts a small but growing community of artists, and weekend visitors come to see their studios rather than the baths.',
    ['By contrast', 'For instance', 'Nevertheless', 'As a result'],
    3,
    '前の文は「空き家を若い職人に低家賃で提供し始めた」、後ろは「職人のコミュニティが育ち、週末の観光客が来る」。施策→成果の因果なので As a result が正解です。\n\nBy contrast は対比、For instance は例示、Nevertheless は逆接——どれも前後の関係に合いません。with little success（温泉では失敗）からの方針転換と成功という物語の流れも、順方向のつなぎ語を支持しています。',
    'Before: the village began renting empty houses to young craftspeople. After: a growing community of artists and weekend visitors. Policy → outcome is cause and effect: “As a result.” By contrast opposes, For instance illustrates, Nevertheless reverses — none fits. The larger story (hot springs failed, the new plan worked) also rides the forward rail.',
  ),
  // 5. 要約の判断
  q(
    'この本文を60〜70語に要約します。正しい方針はどれでしょう？',
    '【本文の一部】\nMore schools are replacing paper textbooks with tablet computers. Tablets make school bags lighter, and teachers can update materials instantly. However, some parents report that children are more easily distracted on screens, and reading long passages on a display tires the eyes.\n\nYou are summarizing this in 60–70 words. Which is the best move?',
    [
      'Keep the change, the advantages, and the parents’ concerns, compressed in your own words.',
      'Keep only the advantages, because the passage presents them first.',
      'Add your opinion that schools should return to paper textbooks.',
    ],
    0,
    '(A)が正解。変化（タブレット化）＋利点（軽い・即時更新）＋ However 側の懸念（集中力・目の疲れ）を、両論公平に自分の言葉で——準1級要約の設計図そのものです。\n\n(B)は片側だけの要約で、語数が合っていても内容点を大きく失います。(C)の自分の意見は要約では厳禁でしたね。残す・削る・言い換える、そして「公平に」。',
    '(A): the change (tablets), the advantages (lighter bags, instant updates) and the concerns after “However” (distraction, tired eyes) — both sides, compressed and paraphrased. The blueprint itself. (B) is the one-sided summary that bleeds content points at any length; (C) breaks the no-opinion law. Keep, cut, paraphrase — and stay fair.',
  ),
  // 6. 意見文：POINTの選択
  q(
    'TOPIC: Governments should make public transportation free. — POINTS: Cost / The environment / Convenience / Health。賛成の立場で書きます。POINTの選び方として最も良いのはどれでしょう？',
    'You will AGREE with the topic. Which is the best way to choose your two POINTS?',
    [
      'Choose The environment and Convenience — fewer car trips would mean cleaner air, and people without cars could move around easily.',
      'Choose Cost and Health, because they are printed first in the list.',
      'Choose Cost — free transportation would be extremely expensive for governments to maintain.',
    ],
    0,
    '(A)が正解。2つのPOINTそれぞれに理由（車が減って空気がきれいに／車のない人も移動しやすく）が用意できており、「書ける2つ」の基準を満たしています。\n\n(B)の「先頭の2つだから」は中身ゼロの選び方。(C)は1つしか選んでいない上に、「高くつく」は反対側の論拠——賛成の立場と矛盾します。POINTは立場を支え、理由＋例まで書けるものを2つ。意見文の勝負は書き始める前についています。',
    '(A) passes the develop-test on both points: cleaner air from fewer car trips (The environment), easy travel for people without cars (Convenience). (B) chooses by position in the list — no content; (C) picks only ONE point, and “too expensive” argues for the OTHER side. Two points that support your position and survive the reason-plus-example test: the essay is won before the first sentence.',
  ),
  // 7. listening Part 1（audio）
  qa(
    '会話と質問を聞いて、答えを選んでください。',
    'Listen to the conversation and the question.',
    'W: How is the report for tomorrow’s board meeting coming along?\nM: Almost finished — but the printer on our floor has broken down again. I was planning to print thirty copies tonight.\nW: Don’t bother with printing. The meeting room has that new screen now. Just send everyone the file and present it there.\nM: Good point. It would save paper, too. I’ll e-mail it to the team right away.\nQuestion: What will the man probably do next?',
    [
      'Repair the printer on his floor.',
      'Print thirty copies of the report.',
      'Move the meeting to another room.',
      'Send the report to the team by e-mail.',
    ],
    3,
    '最後の発言 I’ll e-mail it to the team right away が決め手。(D)が正解です。\n\n30部の印刷(B)は壊れたプリンターとともに捨てられた当初の計画——音声の単語をそのまま含む、典型的な「捨て案」のワナです。修理(A)も部屋の移動(C)も話題に出ません。提案を受けて計画が変わる小さな交渉、最終合意は最後の1往復——Part 1 の型どおりでした。',
    '“I’ll e-mail it to the team right away” — the final turn, (D). Printing thirty copies (B) is the ABANDONED plan, echoing the audio word for word: the classic discarded-option trap. Repairs (A) and room changes (C) never come up. A small negotiation, a changed plan, the agreement in the last exchange — Part 1 exactly as drilled.',
  ),
  // 8. listening Real-Life（audio）
  qa(
    'Situationを読んでから、アナウンスを聞いて答えてください。質問は音声では読まれません。',
    'Situation: You are at City Hall. You want to renew your passport today, and you must be back at your office by 2:00 p.m. It is now 12:30 p.m.\n\nListen to the announcement. What should you do?',
    'Good afternoon. May we have your attention, please. The passport service counter on the third floor is extremely busy today, and the current waiting time is about two hours. If you would like to avoid the wait, two options are available. You may book an appointment for tomorrow afternoon at the information desk on the first floor. Alternatively, our branch office inside Central Station offers the same passport services with almost no waiting until five p.m. today; the station is one stop away by subway. Thank you for your understanding.',
    [
      'Wait at the third-floor counter.',
      'Go to the branch office in Central Station.',
      'Book an appointment for tomorrow afternoon.',
      'Come back to City Hall after two p.m.',
    ],
    1,
    '条件は「今日中に」「2時までに職場へ」、現在12時30分。3階の窓口(A)は待ち約2時間で2時半——間に合いません。明日の予約(C)は「今日中に」に違反。地下鉄で1駅の支所なら、ほぼ待ちなしで今日中に手続きでき、2時にも間に合う——(B)が正解です。\n\n(D)は2時に職場へ戻る条件と真っ向から矛盾。すべて音声に登場する行動を、Situationの条件だけが選り分ける——Real-Life形式の消去法、完成です。',
    'Conditions: today, and back at the office by 2:00; it is 12:30. The third-floor counter (A) means a two-hour wait — done at 2:30, too late. Tomorrow’s appointment (C) breaks “today.” The branch office one subway stop away, almost no waiting — renewed today, back by 2:00: (B). And (D) collides head-on with the 2:00 condition. Every option was really announced; only your printed conditions tell them apart. Condition-elimination, mastered.',
  ),
  // 9. speaking: ナレーション（gap）
  gap(
    'ナレーション練習：4コマ目です。動詞 decide を正しい形（過去形）にして、1語で入力してください。',
    'One morning, the town (   ) to build more bicycle parking areas near the station, and the streets soon looked tidy again.',
    ['decided'],
    'decide → decided が正解。One morning で最終コマの時間が動き、動詞は過去形——時間表現と過去形、ナレーションの2大ルールがそろった結末の1文です。\n\nsuggest-suggested、notice-noticed、decide-decided。準1級ナレーションの定番動詞は、過去形が口から自動で出るまで練習を。2分間、時制を一度も崩さないことが評価を支えます。',
    '“Decided” — decide in the past tense, behind the time caption “One morning,” closing the story: both laws of narration in the final sentence. Suggested, noticed, decided — drill the staples until the past forms are automatic. Two minutes without a single tense slip is what holds a narration score together.',
  ),
  // 10. final recap
  con(
    'まとめ：準1級レベル修了',
    'Recap: the Grade Pre-1 level, complete',
    '・大問1は組み合わせで消す——rely heavily on、widely available、rule out a possibility\n\n・大問2は譲歩→反転→限定の鎖、大問3は段落の地図と筆者の限定つき結論\n\n・要約は60〜70語で両論を公平に、意見文はPOINTS2つ＋鋭い立場＋ヘッジした根拠\n\n・リスニングは最終合意・前半後半の聞きどころ・Real-Lifeの条件消去\n\n・面接は過去形の2分、If you were には would、意見は型で3〜4文\n\nこれで準1級レベルは修了です。準1級の模試で力を試しましょう。実際の試験と同じ形式・同じ時間配分で、学んだパターンがどこまで通用するかを確認できます。',
    '• 大問1: eliminate by pairing — rely heavily on, widely available, rule out a possibility.\n\n• 大問2: the concession → reversal → qualification chain; 大問3: paragraph maps and the author’s qualified conclusion.\n\n• The summary: 60–70 words, both sides fairly; the essay: two POINTS, a sharp position, hedged support.\n\n• Listening: the final agreement, an ear on each half, and condition-elimination in Real-Life.\n\n• The interview: two minutes in the past tense, would for “If you were…,” and the three-to-four-sentence opinion frame.\n\nThat completes the Grade Pre-1 level. Put your skills to the test in the Grade Pre-1 mock set — same format, same timing as the real exam.',
  ),
]

// ────────────────────────────────────────────────────────────────────────────
// Levels
// ────────────────────────────────────────────────────────────────────────────
const LEVELS = [
  {
    title: 'Grade 3',
    title_ja: '3級の攻略',
    lessons: [
      { slug: 'eiken-g3-vocab', title: 'Vocabulary and grammar (大問1)', title_ja: '大問1：単語・文法', free: true, minutes: 10, screens: G3_VOCAB },
      { slug: 'eiken-g3-reading', title: 'Reading: dialogues, notices and essays', title_ja: '読解：会話文・お知らせ・エッセイ', free: false, minutes: 10, screens: G3_READING },
      { slug: 'eiken-g3-writing', title: 'Writing: the e-mail and the opinion', title_ja: 'ライティング：Eメールと意見', free: false, minutes: 10, screens: G3_WRITING },
      { slug: 'eiken-g3-listening', title: 'Listening: Parts 1–3', title_ja: 'リスニング：第1部〜第3部', free: false, minutes: 10, screens: G3_LISTENING },
      { slug: 'eiken-g3-speaking', title: 'Speaking: the interview', title_ja: 'スピーキング：面接の型', free: false, minutes: 10, screens: G3_SPEAKING },
      { slug: 'eiken-g3-review', title: 'Level review: Grade 3', title_ja: '総まとめ：3級', free: false, minutes: 9, screens: G3_REVIEW },
    ],
  },
  {
    title: 'Grade Pre-2',
    title_ja: '準2級の攻略',
    lessons: [
      { slug: 'eiken-pre2-vocab', title: 'Vocabulary and idioms (大問1)', title_ja: '大問1：単語・熟語', free: false, minutes: 10, screens: P2_VOCAB },
      { slug: 'eiken-pre2-reading', title: 'Reading: dialogues, gaps and passages', title_ja: '読解：会話文・空所・長文', free: false, minutes: 10, screens: P2_READING },
      { slug: 'eiken-pre2-writing', title: 'Writing: the e-mail and the opinion', title_ja: 'ライティング：Eメールと意見文', free: false, minutes: 10, screens: P2_WRITING },
      { slug: 'eiken-pre2-listening', title: 'Listening: Parts 1–3', title_ja: 'リスニング：第1部〜第3部', free: false, minutes: 10, screens: P2_LISTENING },
      { slug: 'eiken-pre2-speaking', title: 'Speaking: the interview', title_ja: 'スピーキング：面接の型', free: false, minutes: 10, screens: P2_SPEAKING },
      { slug: 'eiken-pre2-review', title: 'Level review: Pre-2', title_ja: '総まとめ：準2級', free: false, minutes: 9, screens: P2_REVIEW },
    ],
  },
  {
    title: 'Grade 2',
    title_ja: '2級の攻略',
    lessons: [
      { slug: 'eiken-g2-vocab', title: 'Vocabulary and collocations (大問1)', title_ja: '大問1：単語・コロケーション', free: false, minutes: 10, screens: G2_VOCAB },
      { slug: 'eiken-g2-reading', title: 'Reading: discourse gaps and passages', title_ja: '読解：空所と長文', free: false, minutes: 10, screens: G2_READING },
      { slug: 'eiken-g2-writing', title: 'Writing: the summary and the opinion', title_ja: 'ライティング：要約と意見文', free: false, minutes: 10, screens: G2_WRITING },
      { slug: 'eiken-g2-listening', title: 'Listening: Parts 1 and 2', title_ja: 'リスニング：第1部・第2部', free: false, minutes: 10, screens: G2_LISTENING },
      { slug: 'eiken-g2-speaking', title: 'Speaking: narration and opinions', title_ja: 'スピーキング：ナレーションと意見', free: false, minutes: 10, screens: G2_SPEAKING },
      { slug: 'eiken-g2-review', title: 'Level review: Grade 2', title_ja: '総まとめ：2級', free: false, minutes: 9, screens: G2_REVIEW },
    ],
  },
  {
    title: 'Grade Pre-1',
    title_ja: '準1級の攻略',
    lessons: [
      { slug: 'eiken-pre1-vocab', title: 'Vocabulary and collocation strength (大問1)', title_ja: '大問1：語彙とコロケーション', free: false, minutes: 10, screens: PRE1_VOCAB },
      { slug: 'eiken-pre1-reading', title: 'Reading: logic gaps and long passages', title_ja: '読解：論理の空所と長文', free: false, minutes: 10, screens: PRE1_READING },
      { slug: 'eiken-pre1-writing', title: 'Writing: the summary and the POINTS essay', title_ja: 'ライティング：要約とPOINTS意見文', free: false, minutes: 10, screens: PRE1_WRITING },
      { slug: 'eiken-pre1-listening', title: 'Listening: Parts 1–3 and Real-Life', title_ja: 'リスニング：Part 1〜3とReal-Life', free: false, minutes: 10, screens: PRE1_LISTENING },
      { slug: 'eiken-pre1-speaking', title: 'Speaking: the four-panel narration', title_ja: 'スピーキング：4コマナレーション', free: false, minutes: 10, screens: PRE1_SPEAKING },
      { slug: 'eiken-pre1-review', title: 'Level review: Pre-1', title_ja: '総まとめ：準1級', free: false, minutes: 9, screens: PRE1_REVIEW },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Local validation (before any DB writes)
// ────────────────────────────────────────────────────────────────────────────
function validateLocal() {
  const problems = []
  const slugs = new Set()
  for (const level of LEVELS) {
    for (const lesson of level.lessons) {
      if (slugs.has(lesson.slug)) problems.push(`duplicate slug ${lesson.slug}`)
      slugs.add(lesson.slug)
      if (lesson.screens.length < 8 || lesson.screens.length > 11) problems.push(`${lesson.slug}: ${lesson.screens.length} screens (want 8–11)`)
      lesson.screens.forEach((s, i) => {
        const c = s.content
        if (s.type === 'concept') {
          if (!c.body || !c.body_ja) problems.push(`${lesson.slug}#${i}: concept missing body/body_ja`)
        } else {
          if (!c.explanation || !c.explanation_ja) problems.push(`${lesson.slug}#${i}: missing explanation(s)`)
          if (!c.prompt_ja) problems.push(`${lesson.slug}#${i}: missing prompt_ja`)
          if (c.question_type === 'gap_fill') {
            if (!c.accepted?.length) problems.push(`${lesson.slug}#${i}: empty accepted`)
            if (/1語/.test(c.prompt_ja) && c.accepted.some(a => a.trim().includes(' ')))
              problems.push(`${lesson.slug}#${i}: prompt says 1語 but accepted has multi-word entries`)
            for (const a of c.accepted) {
              const printed = c.prompt.replace(/\(\s*\)/, '')
              if (a.length > 3 && printed.toLowerCase().includes(a.toLowerCase()))
                problems.push(`${lesson.slug}#${i}: accepted '${a}' appears in the prompt`)
            }
          }
        }
      })
    }
  }
  if (problems.length) {
    console.error('Local validation FAILED:')
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }
  console.log('Local validation passed.')
}

// ────────────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────────────
async function seed() {
  // Idempotent: deleting the course cascades to levels → lessons → screens.
  const del = await db.from('courses').delete().eq('slug', COURSE.slug)
  if (del.error) throw new Error(`delete course: ${del.error.message}`)

  const { data: course, error: courseErr } = await db.from('courses').insert(COURSE).select('id').single()
  if (courseErr) throw new Error(`insert course: ${courseErr.message}`)
  console.log(`Course '${COURSE.slug}' created (${course.id}, published: ${COURSE.published})`)

  for (const [li, level] of LEVELS.entries()) {
    const { data: lvl, error: lvlErr } = await db
      .from('course_levels')
      .insert({ course_id: course.id, order_index: li, title: level.title, title_ja: level.title_ja })
      .select('id')
      .single()
    if (lvlErr) throw new Error(`insert level ${li}: ${lvlErr.message}`)
        for (const [ji, lesson] of level.lessons.entries()) {
      const { data: les, error: lesErr } = await db
        .from('lessons')
        .insert({
          level_id: lvl.id,
          order_index: ji,
          slug: lesson.slug,
          title: lesson.title,
          title_ja: lesson.title_ja,
          free: lesson.free,
          estimated_minutes: lesson.minutes,
        })
        .select('id')
        .single()
      if (lesErr) throw new Error(`insert lesson ${lesson.slug}: ${lesErr.message}`)

      const rows = lesson.screens.map((s, k) => ({
        lesson_id: les.id,
        order_index: k,
        type: s.type,
        content: s.content,
      }))
      const { error: scrErr } = await db.from('lesson_screens').insert(rows)
      if (scrErr) throw new Error(`insert screens for ${lesson.slug}: ${scrErr.message}`)
      console.log(`  ${lesson.slug}: ${rows.length} screens${lesson.free ? ' (FREE)' : ''}`)
    }
  }
  return course.id
}

// ────────────────────────────────────────────────────────────────────────────
// Self-check (reads back from the DB)
// ────────────────────────────────────────────────────────────────────────────
async function selfCheck(courseId) {
  const { data: levels } = await db.from('course_levels').select('id, order_index, title').eq('course_id', courseId).order('order_index')
  const levelIds = levels.map(l => l.id)
  const { data: lessons } = await db.from('lessons').select('id, level_id, slug, free, order_index').in('level_id', levelIds).order('order_index')
  const { data: screens } = await db.from('lesson_screens').select('id, lesson_id, type, content').in('lesson_id', lessons.map(l => l.id))

  console.log('\nSelf-check:')
  const totalDist = { A: 0, B: 0, C: 0, D: 0 }
  for (const level of levels) {
    const ls = lessons.filter(l => l.level_id === level.id)
    if (!ls.length) { console.log(`  [${level.title}] skeleton (0 lessons)`); continue }
    for (const lesson of ls) {
      const sc = screens.filter(s => s.lesson_id === lesson.id)
      const qs = sc.filter(s => s.type === 'question')
      const dist = { A: 0, B: 0, C: 0, D: 0 }
      let gaps = 0, drags = 0, audio = 0
      for (const s of qs) {
        if (s.content.question_type === 'gap_fill') { gaps++; continue }
        if (s.content.question_type === 'drag_fill') { drags++; continue }
        if (s.content.transcript) audio++
        const idx = (s.content.options ?? []).findIndex(o => o.is_correct)
        const letter = 'ABCD'[idx] ?? '?'
        dist[letter]++; totalDist[letter]++
      }
      const distStr = Object.entries(dist).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(' ')
      console.log(`  ${lesson.slug}${lesson.free ? ' (FREE)' : ''} — ${sc.length} screens (${qs.length} q: ${gaps} gap, ${drags} drag, ${audio} audio-mcq) | answers ${distStr}`)
    }
  }
  console.log(`Overall answer positions — A:${totalDist.A} B:${totalDist.B} C:${totalDist.C} D:${totalDist.D}`)

  const issues = []
  if (levels.length !== 4) issues.push(`expected 4 levels, got ${levels.length}`)
  for (const g of ['g3', 'pre2', 'g2', 'pre1']) {
    const n = lessons.filter(l => l.slug.startsWith(`eiken-${g}-`)).length
    if (n !== 6) issues.push(`expected 6 ${g} lessons, got ${n}`)
  }
  if (lessons.filter(l => l.free).length !== 1) issues.push('expected exactly one free lesson')
  // every listening/review audio screen must carry a transcript for the audio pass
  for (const s of screens) {
    const lesson = lessons.find(l => l.id === s.lesson_id)
    if (s.type === 'question' && /listening/.test(lesson.slug) && !s.content.transcript && s.content.question_type === 'single_choice')
      issues.push(`${lesson.slug}: single_choice without transcript (audio pass will skip it)`)
  }
  if (issues.length) {
    console.error('\nSelf-check FAILED:')
    for (const i of issues) console.error('  - ' + i)
    process.exit(1)
  }
  console.log('Self-check passed. Course is seeded (published: false).')
}

validateLocal()
const courseId = await seed()
await selfCheck(courseId)
