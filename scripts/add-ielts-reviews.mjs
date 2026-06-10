/**
 * Add an end-of-level REVIEW lesson to each level of the IELTS course.
 *
 * Like the TOEIC version, this INSERTS into the live 'ielts-prep' course — it
 * does NOT re-seed (the original seed is stale: drag_fill and the rebuilt
 * Speaking level were applied to the DB only). It adds/refreshes 4 review
 * lessons by slug and leaves everything else alone.
 *
 *   node --env-file=.env.local scripts/add-ielts-reviews.mjs
 *   node --env-file=.env.local scripts/add-ielts-reviews.mjs --dry
 *
 * After running, voice the listening review:
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/add-course-audio.mjs
 * (ielts-listening-review is registered there as dialogue-q.)
 *
 * Style: "practice + challenge" — a mixed set (single_choice / gap_fill /
 * drag_fill) drawn from every lesson in the level with fresh examples, ending
 * with 1–2 harder items, then a recap. ~8 questions (more for Speaking).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env (run with --env-file=.env.local)'); process.exit(1)
}
const DRY = process.argv.includes('--dry')
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── builders ────────────────────────────────────────────────────────────────
const con = (title_ja, title, body_ja, body, example) => ({
  type: 'concept', content: { title_ja, title, body_ja, body, ...(example ? { example } : {}) },
})
const q = (prompt_ja, prompt, opts, correct, explanation_ja, explanation) => {
  if (correct < 0 || correct >= opts.length) throw new Error(`bad correct: ${prompt.slice(0, 40)}`)
  return { type: 'question', content: {
    question_type: 'single_choice', prompt, ...(prompt_ja ? { prompt_ja } : {}),
    options: opts.map((content, i) => ({ label: 'ABCD'[i], content, is_correct: i === correct })),
    explanation_ja, explanation } }
}
const gap = (prompt_ja, prompt, accepted, explanation_ja, explanation) => ({
  type: 'question', content: { question_type: 'gap_fill', prompt, ...(prompt_ja ? { prompt_ja } : {}), accepted, explanation_ja, explanation },
})
const drag = (prompt_ja, prompt, text, chips, answer, explanation_ja, explanation) => ({
  type: 'question', content: { question_type: 'drag_fill', prompt, ...(prompt_ja ? { prompt_ja } : {}), text, chips, answer, explanation_ja, explanation },
})

// ════════════════════════════════════════════════════════════════════════════
// L0 LISTENING REVIEW (audio: dialogue-q). 【音声】/【会話】 + Q: line, or a form
// line with ______ for gap items. Numbers/spelling, paraphrase, option traps.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_LISTEN = [
  con('レベル総まとめ：リスニング', 'Level review: Listening',
    'このレベルの技術をまとめて練習します。\n\n・Section 1は聞く前に空所を予測し、指示の語数制限を守る\n・印刷された語ではなく「言い換え」を待ち伏せる\n・選択肢トラップでは全部が言及される。確定する言葉を待つ\n・but / actually / instead の後の訂正に注意\n\n音声は1回だけ。聞いて答えてください。',
    'A mixed set for this level: predict the gaps and obey the word limit in Section 1, listen for the paraphrase rather than the printed word, wait for the confirmation in option traps, and catch corrections after "but / actually / instead." You hear each clip once.'),
  gap('音声を聞いて、フォームを完成させてください。（つづりに注意）',
    '【会話】\nM: Good afternoon, Lakeside Leisure Centre.\nW: Hi, I’d like to book a swimming lesson. The surname is Vaughan.\nM: Could you spell that?\nW: Yes, V-A-U-G-H-A-N.\n\nSurname: ______',
    ['vaughan'],
    'つづりの聞き取り。V-A-U-G-H-A-N → Vaughan。Section 1では名前や地名のつづりが頻出です。',
    'A spelling item: V-A-U-G-H-A-N gives "Vaughan." Section 1 loves spelled-out names and places.'),
  gap('音声を聞いて、フォームを完成させてください。',
    '【会話】\nM: The full membership is ninety pounds a year, but students pay just fifty-five.\nW: I’m a student, so the student one, please.\n\nStudent fee: £______',
    ['55', 'fifty-five', 'fifty five'],
    '数字＋ひっかけ。先に90ポンドが聞こえますが、学生は55ポンド。設問の student に合う数字を選びます。最初の数字に飛びつかないこと。',
    'Two figures appear; the student fee is 55, not the 90 you hear first. Match the number to what the question asks.'),
  q('音声を聞いて、設問に答えてください。',
    '【音声】\nThe library is open until nine on weekdays, but on Saturdays it closes at five, and it’s shut all day Sunday.\n\nQ: When can you NOT use the library?',
    ['Weekday evenings', 'Saturday afternoons', 'Sunday'],
    2,
    '「shut all day Sunday」＝日曜は終日閉館。NOT問題は否定の言い換えに注意。shut = open でない、です。',
    '"Shut all day Sunday" means you cannot use it on Sunday. On NOT questions, watch the negative paraphrase: "shut" = not open.'),
  q('音声を聞いて、設問に答えてください。',
    '【会話】\nW: Shall we meet in the library, the café, or the study room?\nM: The café is too noisy, and the library closes early. Let’s use the study room.\n\nQ: Where will they meet?',
    ['The café', 'The study room', 'The library'],
    1,
    '選択肢トラップ。3つすべてが言及されますが、café と library は否定され、選ばれたのは study room。「全部聞こえる」ので確定する言葉を待ちます。',
    'An option trap: all three are named, but the café and library are rejected and the study room is chosen. Everything gets mentioned, so wait for the confirmation.'),
  gap('音声を聞いて、空所を完成させてください。（2語以内）',
    '【音声】\nFor the field trip, please bring a packed lunch and a waterproof jacket. Umbrellas are not necessary.\n\nStudents must bring a packed lunch and a ______.',
    ['waterproof jacket', 'jacket'],
    '指示は2語以内。waterproof jacket が答え。傘は不要と明言されています。語数制限を必ず守ること。',
    'No more than two words: "waterproof jacket." Umbrellas are explicitly not needed. Always obey the word limit.'),
  gap('音声を聞いて、フォームを完成させてください。',
    '【音声】\nThe next available appointment is on the fourteenth of June at half past ten.\n\nAppointment: 14 June at ______',
    ['10:30', 'half past ten', '10.30', 'ten thirty'],
    '時刻の聞き取り。half past ten = 10:30。数字表現の言い換えに慣れましょう。',
    '"Half past ten" = 10:30. Get used to spoken time expressions.'),
  q('音声を聞いて、設問に答えてください。',
    '【音声】\nThe tour was going to start at the museum, but because of building work, it now begins at the town hall instead.\n\nQ: Where does the tour start now?',
    ['The town hall', 'The museum', 'The building site'],
    0,
    'チャレンジ：訂正のパターン。was going to ... but now ... instead で、開始地点が town hall に変更されました。but / instead の後の情報が正解になりやすいです。',
    'Challenge: a correction. "Was going to... but now... instead" moves the start to the town hall. The information after "but / instead" is usually the answer.'),
  q('音声を聞いて、設問に答えてください。',
    '【音声】\nMembers can use the gym at any time, but the pool is for over-eighteens only.\n\nQ: What is true about the pool?',
    ['Anyone can use it', 'It is closed to members', 'Only adults can use it'],
    2,
    'チャレンジ：「over-eighteens only」＝大人のみ。「会員は何でも使える」と思い込まないこと。限定表現を正確に。',
    'Challenge: "over-eighteens only" means only adults. Do not assume members can use everything; read the restriction precisely.'),
  con('おさえる', 'Takeaways',
    '・聞く前に空所を予測し、語数制限を守る\n・印刷語ではなく言い換えを待つ\n・選択肢トラップは全部言及される。確定を待つ\n・but / instead の後の訂正、限定表現に注意\n\n次はリーディングへ。',
    '• Predict gaps and obey the word limit.\n• Listen for the paraphrase, not the printed word.\n• In option traps, everything is mentioned; wait for the confirmation.\n• Watch corrections after "but / instead" and restriction words.'),
]

// ════════════════════════════════════════════════════════════════════════════
// L1 READING REVIEW (no audio). TFNG / matching headings / completion.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_READ = [
  con('レベル総まとめ：リーディング', 'Level review: Reading',
    'このレベルの技術をまとめて練習します。\n\n・True/False/Not Given：本文が断言→True、矛盾→False、触れていない→Not Given\n・見出し問題：段落の要旨を一言で。詳細に引っ張られない\n・完成問題：本文の語を使い、文法に合わせて形を整える\n\n本文を読んで答えてください。',
    'A mixed set: on True/False/Not Given, the passage confirms (True), contradicts (False), or is silent (Not Given); on headings, match the paragraph’s main idea; on completion, use the passage’s words and fit the grammar.'),
  q(null,
    '【Passage】\nHoney never truly spoils. Archaeologists have found pots of honey in ancient tombs that are over 3,000 years old and still perfectly edible.\n\n【Statement】Honey found in ancient tombs could still be eaten.',
    ['True', 'False', 'Not Given'],
    0,
    '本文が「still perfectly edible（まだ十分食べられる）」と断言 → True。本文がはっきり支持していれば True です。',
    'The passage states the honey is "still perfectly edible," so the statement is True. When the text clearly confirms it, choose True.'),
  q(null,
    '【Passage】\nDespite a popular belief, the Great Wall of China is not visible to the naked eye from the Moon.\n\n【Statement】The Great Wall can be seen from the Moon without a telescope.',
    ['True', 'False', 'Not Given'],
    1,
    '本文が明確に否定（not visible from the Moon）→ False。「書かれていない」のではなく「矛盾する」のが False です。',
    'The passage explicitly contradicts this ("not visible... from the Moon"), so it is False. False means the text disagrees, not that it is silent.'),
  q(null,
    '【Passage】\nHoney never truly spoils, which is why pots of it survive in ancient tombs.\n\n【Statement】Honey was the most common food placed in ancient tombs.',
    ['True', 'False', 'Not Given'],
    2,
    '本文は「最も一般的な食べ物」とは述べていません → Not Given。常識で True にしないこと。書かれた情報だけで判断します。',
    'The passage never says honey was the most common food, so it is Not Given. Do not answer from common sense, only from the text.'),
  drag('各段落に合う見出しを選んで並べてください（1つは使いません）。',
    '【Paragraphs】\nA: Sea otters wrap themselves in kelp so they do not drift away while they sleep.\nB: A sea otter keeps a favourite rock in a pouch of loose skin under one arm.\nC: By eating sea urchins, otters stop kelp forests from being overgrazed.',
    'A → ___\nB → ___\nC → ___',
    ['Staying in place while resting', 'A tool kept close at hand', 'Guardians of the kelp forest', 'How otters raise their young'],
    ['Staying in place while resting', 'A tool kept close at hand', 'Guardians of the kelp forest'],
    'A＝寝る間に流されない工夫、B＝道具(石)を脇に持つ、C＝ケルプ林を守る。各段落の要旨と見出しを対応させ、余った見出しは使いません。',
    'A is about staying put while sleeping, B about keeping a tool to hand, C about protecting the kelp. Match each paragraph’s main idea and leave the extra heading unused.'),
  gap('本文を読んで、空所に入る語を入力してください。',
    '【Passage】\nThe coldest naturally occurring temperature on Earth was recorded in Antarctica, where it fell to nearly minus ninety degrees Celsius.\n\n【Summary】The record low temperature was measured in ______.',
    ['antarctica'],
    '要約完成は本文の語をそのまま使います。Antarctica を抜き出します。',
    'Summary completion uses the passage’s own words: lift "Antarctica."'),
  gap('本文を読んで、空所に入る語を入力してください。',
    '【Passage】\nUnlike most birds, the kiwi cannot fly. It uses its long beak, which has nostrils at the very tip, to sniff out insects in the soil.\n\n【Summary】The kiwi finds food by ______ for insects underground.',
    ['smelling', 'sniffing'],
    'sniff out → smelling / sniffing。文法に合わせて形を整える完成問題です。',
    '"Sniff out" becomes "smelling / sniffing." Completion items sometimes need the word adjusted to fit the grammar.'),
  q(null,
    '【Passage】\nThe marathon route passes three landmarks: it starts at the cathedral, turns at the river bridge, and finishes in the central park.\n\nQ: Where does the marathon finish?',
    ['The river bridge', 'The cathedral', 'The central park'],
    2,
    'スキャニング。設問のキーワード finish で本文を探すと central park。事実をそのまま取ります。',
    'Scanning: search the passage for the keyword "finish" to get "central park." Take the fact as stated.'),
  q(null,
    '【Passage】\nThe museum offers free entry on the first Sunday of every month.\n\n【Statement】The museum is busier on its free-entry days.',
    ['True', 'Not Given', 'False'],
    1,
    'チャレンジ：本文は「混雑する」とは述べていません → Not Given。常識では正しそうでも、書かれていなければ Not Given です。',
    'Challenge: the passage never says it is busier, so Not Given. It may seem likely, but if the text does not say it, it is Not Given.'),
  con('おさえる', 'Takeaways',
    '・True＝断言、False＝矛盾、Not Given＝未記載\n・見出しは段落の要旨を一言で\n・完成問題は本文の語＋文法に合わせた形\n・常識ではなく本文の根拠で判断する\n\n次はライティングへ。',
    '• True = confirmed, False = contradicted, Not Given = not stated.\n• Headings capture the paragraph’s main idea.\n• Completion uses the passage’s words, adjusted to the grammar.\n• Decide from the text, not from common sense.'),
]

// ════════════════════════════════════════════════════════════════════════════
// L2 WRITING REVIEW (no audio). Register / chart language / essay structure.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_WRITE = [
  con('レベル総まとめ：ライティング', 'Level review: Writing',
    'このレベルの技術をまとめて練習します。\n\n・手紙(GT Task 1)：目的に合った register（丁寧さ）\n・グラフ(Academic Task 1)：導入→概観→詳細。意見は書かない\n・エッセイ(Task 2)：導入(立場)→本論→本論→結論\n\n最も適切なものを選んでください。',
    'A mixed set: match the register to the letter’s purpose; structure a chart answer intro → overview → details with no opinion; and build an essay intro (position) → body → body → conclusion.'),
  q(null,
    '【状況】You are writing a formal letter to complain about a faulty product.\nQ: Which opening is appropriate?',
    ['Hey, this thing you sent me is broken.', 'I am writing to express my dissatisfaction with a recent purchase.', 'Hi there, got a problem with my order!'],
    1,
    'フォーマルな苦情。I am writing to express my dissatisfaction... が適切。Hi / Hey や省略形(got)はカジュアルで減点対象です。',
    'A formal complaint opens with "I am writing to express my dissatisfaction." "Hi/Hey" and casual contractions cost marks.'),
  q(null,
    '【状況】A letter asking your landlord to repair the heating.\nQ: Which sentence makes the request politely?',
    ['Fix the heating now.', 'I would be grateful if you could arrange for the heating to be repaired.', 'The heating is your problem.'],
    1,
    '依頼は丁寧に。I would be grateful if you could... が適切。命令形(A)や非難(C)は不適切です。',
    'Polite request: "I would be grateful if you could..." A command (A) or blame (C) is inappropriate.'),
  gap('グラフ描写の動詞を1語で入力してください。',
    '【グラフ】Sales of electric cars rose steadily from 2010 to 2020, then ______ sharply in 2021.（2021年は急減）',
    ['fell', 'dropped', 'plummeted', 'decreased'],
    '急減を表す動詞：fell / dropped / plummeted など。rose と対になる下降の動詞を使い分けると語彙の幅が出ます。',
    'A verb for a sharp fall: "fell / dropped / plummeted." Varying your up and down verbs widens your range.'),
  drag('Task 1の段落構成を順に並べてください（1つは使いません）。',
    '【設問】Academic Writing Task 1: describe a chart.',
    '___\n↓\n___\n↓\n___',
    ['Introduction: paraphrase what the chart shows', 'Overview: the main trends, no specific numbers', 'Details: specific figures and comparisons', 'Your personal opinion on the topic'],
    ['Introduction: paraphrase what the chart shows', 'Overview: the main trends, no specific numbers', 'Details: specific figures and comparisons'],
    '導入→概観→詳細。Task 1に意見は不要です（意見はTask 2）。概観で全体の傾向、詳細で具体的な数値を述べます。',
    'Intro → overview → details. Task 1 carries no opinion (that is Task 2). The overview gives the trends; the details give the figures.'),
  q(null,
    '【設問】"Some people think children should start school at a younger age. Do you agree or disagree?"\nQ: Which is the best thesis?',
    ['School is very important for all children.', 'This essay will discuss starting school early.', 'I disagree, because starting school too young can harm children’s development.'],
    2,
    'thesis は「立場＋理由の予告」。I disagree, because... が最適。一般論(A)や「これから論じる」(B)は立場を示していません。',
    'A thesis states a position and previews a reason: "I disagree, because..." (A) is a generality; (B) announces without taking a side.'),
  drag('段落をエッセイの順に並べてください（2つは使いません）。',
    '【設問】"Working from home is better than working in an office. To what extent do you agree?"',
    '___\n↓\n___\n↓\n___\n↓\n___',
    ['Introduction: paraphrase the question and your position', 'Body 1: a benefit of home working, with an example', 'Body 2: a drawback, and your balanced view', 'Conclusion: restate your position', 'A list of office rules', 'A new paragraph about salaries in the conclusion'],
    ['Introduction: paraphrase the question and your position', 'Body 1: a benefit of home working, with an example', 'Body 2: a drawback, and your balanced view', 'Conclusion: restate your position'],
    '導入→本論→本論→結論。各本論は1つの考えを例とともに展開し、結論では新しい話題を出しません。',
    'Intro → body → body → conclusion. Each body develops one idea with an example; the conclusion introduces nothing new.'),
  gap('対比のつなぎ語を1語で入力してください。',
    'Public transport reduces traffic. ______, it can be unreliable in rural areas.',
    ['however'],
    '空所の後は逆の内容なので However。文頭の However はカンマを伴います。',
    'The next idea opposes the first, so "However" (followed by a comma at the start of a sentence).'),
  q(null,
    '【設問】Academic Task 1. Which belongs in the OVERVIEW?',
    ['The exact figure for each year', 'The highest and lowest points and the general trend', 'A recommendation for the future'],
    1,
    'チャレンジ：概観は「全体の傾向＋最高/最低」。具体的な数値(A)は詳細パラグラフへ。提言(C)はTask 1には不要です。',
    'Challenge: the overview gives the general trend plus the high and low points. Exact figures go in the details, and recommendations do not belong in Task 1.'),
  con('おさえる', 'Takeaways',
    '・手紙は目的に合った丁寧さ（register）\n・Task 1：導入→概観→詳細、意見なし\n・Task 2：導入(立場)→本論→本論→結論\n・上昇/下降の動詞を使い分け、つなぎ語で論理を示す\n\n次はスピーキングへ。',
    '• Match the letter’s register to its purpose.\n• Task 1: intro → overview → details, no opinion.\n• Task 2: intro (position) → body → body → conclusion.\n• Vary trend verbs and signal logic with linkers.'),
]

// ════════════════════════════════════════════════════════════════════════════
// L3 SPEAKING REVIEW (no audio, longer — 6-lesson level). Band criteria,
// lexical & grammatical range, answer structure, cue card, Part 3.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_SPEAK = [
  con('レベル総まとめ：スピーキング', 'Level review: Speaking',
    'このレベルの技術をまとめて練習します。\n\n・採点基準：流暢さ・語彙・文法・発音\n・語彙：同じ語を繰り返さず、コロケーションを使う\n・文法：複文で幅を出す。話題に合った時制\n・構成：答え→理由→例。Part 2は項目順、Part 3は意見＋理由＋反対側\n\nそれぞれ答えてください。',
    'A longer mixed set: the four marking areas; lexical range and collocation; grammatical range and tense; and structure (answer → reason → example, the cue-card order, and Part 3 opinion + reason + other side).'),
  q(null,
    '【設問】In IELTS Speaking, "fluency and coherence" mainly means:',
    ['Using big, rare words', 'Speaking smoothly and linking ideas logically', 'Having a perfect British accent'],
    1,
    '流暢さ＋一貫性＝なめらかに話し、考えを論理的につなぐこと。難語(A)や特定の発音(C)は別の評価項目です。',
    'Fluency and coherence means speaking smoothly and linking ideas logically, not using rare words or a particular accent.'),
  gap('「good」をより自然で強い形容詞に言い換えてください。（1語）',
    'Raise the band: replace "good" in "It was a good experience" with a stronger adjective.',
    ['wonderful', 'great', 'fantastic', 'memorable', 'valuable', 'rewarding', 'enjoyable', 'terrific', 'excellent', 'amazing', 'brilliant', 'worthwhile', 'fascinating'],
    '語彙の幅。good → wonderful / rewarding / memorable など。同じ平凡な語の繰り返しを避けます。',
    'Lexical range: upgrade "good" to "wonderful / rewarding / memorable," and so on. Avoid repeating one flat word.'),
  gap('コロケーションを完成させてください。（1語）',
    'Collocation: "I’m really ______ in photography." (a word meaning "having an interest")',
    ['interested', 'keen'],
    'be interested in / be keen on。動詞と前置詞をセットで覚えると自然です。',
    '"Interested in" (or "keen on"). Learn the word together with its preposition.'),
  drag('答えの流れを並べてください（1つは使いません）。',
    '【設問】Part 1: "Do you enjoy cooking?"',
    '___\n↓\n___\n↓\n___',
    ['Direct answer: Yes, I really enjoy it.', 'Reason: it helps me relax after work.', 'Example: last weekend I made a curry from scratch.', 'A memorised dictionary definition of "cooking"'],
    ['Direct answer: Yes, I really enjoy it.', 'Reason: it helps me relax after work.', 'Example: last weekend I made a curry from scratch.'],
    '答え→理由→例。一言で終わらせず必ず広げる習慣が流暢さを上げます。暗記した定義は不自然です。',
    'Answer → reason → example. Extending every answer lifts fluency; a memorised definition sounds unnatural.'),
  q(null,
    '【設問】Which answer shows a wider range of grammar?',
    ['I like my city because, although it is big, it still has plenty of green parks.', 'I like my city. It is big. It has parks.', 'My city big and have park.'],
    0,
    '文法の幅。because / although を使った複文(A)が高評価。短文の羅列(B)や誤り(C)は band を下げます。',
    'Grammatical range: the complex sentence with "because/although" (A) scores higher than short choppy sentences (B) or errors (C).'),
  gap('過去の話に合う形にしてください。（1〜2語）',
    'Part 2 often asks about the past: "When I was a child, I ______ (live) by the sea."',
    ['lived', 'used to live'],
    '過去の習慣・状態。lived / used to live。子どもの頃の話は過去形が基本で、used to も自然です。',
    'Past habit or state: "lived" or "used to live." Childhood topics take the past.'),
  drag('話す順番を並べてください（1つは使いません）。',
    '【設問】Part 2 cue card: "Describe a place you like to visit."',
    '___\n↓\n___\n↓\n___\n↓\n___',
    ['What the place is and where it is', 'When you usually go there', 'What you do there', 'Why you like it (finish here)', 'A list of every place you have ever visited'],
    ['What the place is and where it is', 'When you usually go there', 'What you do there', 'Why you like it (finish here)'],
    'キューカードの項目順に話し、最後の「なぜ好きか」で締めると印象が良いです。無関係な列挙は避けます。',
    'Follow the cue-card bullets in order and save "why" for last so you finish strongly. Avoid listing unrelated things.'),
  q(null,
    '【設問】Part 3: "Should governments fund the arts?" A strong answer would:',
    ['Just say "Yes." and stop', 'Repeat the question back to the examiner', 'Give an opinion, a reason, and consider the other side'],
    2,
    'Part 3は議論。意見＋理由＋反対側への目配り(C)が高評価。一言(A)やオウム返し(B)では不十分です。',
    'Part 3 is a discussion: give an opinion, a reason, and acknowledge the other side. One word (A) or repeating the question (B) is not enough.'),
  q(null,
    '【設問】Which habit LOWERS your Speaking score?',
    ['Giving a specific personal example', 'Reciting a memorised paragraph that does not fit the question', 'Correcting a small slip naturally'],
    1,
    'チャレンジ：質問に合わない暗記の定型文は減点。具体例(A)や自然な言い直し(C)はむしろプラスです。',
    'Challenge: reciting a memorised paragraph that does not fit the question lowers the score; specific examples and natural self-correction help.'),
  con('おさえる', 'Takeaways',
    '・評価は流暢さ・語彙・文法・発音の4つ\n・語彙は言い換えとコロケーション、文法は複文と正しい時制\n・答えは「答え→理由→例」で広げる\n・Part 2は項目順、Part 3は意見＋理由＋反対側。暗記の丸暗記は逆効果\n\n全レベルの総まとめ完了です。模試で力を試しましょう。',
    '• Four areas: fluency, vocabulary, grammar, pronunciation.\n• Vocabulary through paraphrase and collocation; grammar through complex sentences and correct tense.\n• Extend answers: answer → reason → example.\n• Cue cards in bullet order; Part 3 with opinion + reason + other side. Memorised scripts backfire.'),
]

// ── review lessons ──────────────────────────────────────────────────────────
const REVIEWS = [
  { levelIndex: 0, slug: 'ielts-listening-review', title: 'Level Review: Listening', title_ja: 'レベル総まとめ：リスニング', screens: REVIEW_LISTEN },
  { levelIndex: 1, slug: 'ielts-reading-review', title: 'Level Review: Reading', title_ja: 'レベル総まとめ：リーディング', screens: REVIEW_READ },
  { levelIndex: 2, slug: 'ielts-writing-review', title: 'Level Review: Writing', title_ja: 'レベル総まとめ：ライティング', screens: REVIEW_WRITE },
  { levelIndex: 3, slug: 'ielts-speaking-review', title: 'Level Review: Speaking', title_ja: 'レベル総まとめ：スピーキング', screens: REVIEW_SPEAK },
]

function validate() {
  const problems = []
  for (const r of REVIEWS) {
    const n = r.screens.length
    if (n < 8 || n > 13) problems.push(`${r.slug}: ${n} screens (want 8–13)`)
    if (r.screens[r.screens.length - 1].type !== 'concept') problems.push(`${r.slug}: last screen not a concept`)
    const positions = []
    r.screens.forEach((s, i) => {
      const c = s.content
      if (JSON.stringify(c).includes('—')) problems.push(`${r.slug}#${i}: em-dash`)
      if (c.question_type === 'single_choice') {
        if (c.options.filter(o => o.is_correct).length !== 1) problems.push(`${r.slug}#${i}: not exactly 1 correct`)
        positions.push(c.options.findIndex(o => o.is_correct))
      }
      if (c.question_type === 'gap_fill' && (!c.accepted || !c.accepted.length)) problems.push(`${r.slug}#${i}: gap_fill without accepted`)
      if (c.question_type === 'drag_fill') {
        const blanks = (c.text.match(/___/g) || []).length
        if (blanks !== c.answer.length) problems.push(`${r.slug}#${i}: ${blanks} blanks vs ${c.answer.length} answers`)
        for (const a of c.answer) if (!c.chips.includes(a)) problems.push(`${r.slug}#${i}: answer "${a.slice(0, 20)}" not in chips`)
      }
    })
    for (let i = 2; i < positions.length; i++) {
      if (positions[i] === positions[i - 1] && positions[i] === positions[i - 2]) problems.push(`${r.slug}: 3 correct in a row at ${'ABC'[positions[i]]}`)
    }
  }
  if (problems.length) { console.error('Validation failed:'); problems.forEach(p => console.error('  - ' + p)); process.exit(1) }
  console.log('Local validation passed.')
}

async function run() {
  validate()
  const { data: course, error: cErr } = await db.from('courses').select('id').eq('slug', 'ielts-prep').single()
  if (cErr || !course) throw new Error(`course ielts-prep not found: ${cErr?.message}`)
  const { data: levels, error: lErr } = await db.from('course_levels').select('id, order_index').eq('course_id', course.id).order('order_index')
  if (lErr) throw new Error(lErr.message)
  for (const r of REVIEWS) {
    const level = levels.find(l => l.order_index === r.levelIndex)
    if (!level) throw new Error(`level ${r.levelIndex} not found`)
    const { data: existing } = await db.from('lessons').select('order_index').eq('level_id', level.id).order('order_index', { ascending: false }).limit(1)
    const nextOrder = existing && existing.length ? existing[0].order_index + 1 : 0
    if (DRY) { console.log(`[dry] ${r.slug} -> level ${r.levelIndex}, order ${nextOrder}, ${r.screens.length} screens`); continue }
    await db.from('lessons').delete().eq('slug', r.slug)
    const { data: les, error: insErr } = await db.from('lessons').insert({
      level_id: level.id, order_index: nextOrder, slug: r.slug, title: r.title, title_ja: r.title_ja, free: false, estimated_minutes: 9,
    }).select('id').single()
    if (insErr) throw new Error(`insert ${r.slug}: ${insErr.message}`)
    const rows = r.screens.map((s, k) => ({ lesson_id: les.id, order_index: k, type: s.type, content: s.content }))
    const { error: scrErr } = await db.from('lesson_screens').insert(rows)
    if (scrErr) throw new Error(`screens for ${r.slug}: ${scrErr.message}`)
    console.log(`  ${r.slug}: inserted at order ${nextOrder} (${rows.length} screens)`)
  }
  console.log('Done. Run add-course-audio.mjs to voice ielts-listening-review.')
}

run().catch(e => { console.error(e); process.exit(1) })
