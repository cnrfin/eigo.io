/**
 * Seed the pilot TOEIC mini-course (Brilliant-style prep course).
 *
 *   Course 'toeic-prep' — 4 levels × 3 lessons = 12 lessons, ~110 screens.
 *   Teaches the QUESTION TYPES of the TOEIC mocks with fresh, original
 *   examples — never the mock answers themselves. The first lesson of the
 *   course is free; the rest require a subscription (gated by the API).
 *
 *   Level 1  Part 2 応答問題の攻略       (WH / Yes-No+tag / sound traps)
 *   Level 2  Part 3・4 先読みの技術      (preview / paraphrase / intent)
 *   Level 3  Part 5 文法の頻出パターン   (word form / verb form / prep-conj)
 *   Level 4  Part 7 読解の戦略           (scanning / NOT+inference / double)
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY):
 *   node --env-file=.env.local scripts/seed-course-toeic.mjs
 * Re-running REFRESHES the course (deletes 'toeic-prep'; cascades clean up
 * levels, lessons, screens and progress). All content is ORIGINAL.
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
// Screen builders
// ────────────────────────────────────────────────────────────────────────────
/** Concept screen. Bodies are split on \n\n by the player. */
const con = (title_ja, title, body_ja, body, example) => ({
  type: 'concept',
  content: { title_ja, title, body_ja, body, ...(example ? { example } : {}) },
})

/** Single-choice question. Labels A/B/C(/D) derived from option count. */
const q = (prompt_ja, prompt, opts, correct, explanation_ja, explanation) => {
  if (correct < 0 || correct >= opts.length) throw new Error(`bad correct index for: ${prompt.slice(0, 40)}`)
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

// ────────────────────────────────────────────────────────────────────────────
// Course meta
// ────────────────────────────────────────────────────────────────────────────
const COURSE = {
  slug: 'toeic-prep',
  exam_slug: 'toeic',
  title: 'TOEIC Prep Course',
  title_ja: 'TOEIC対策コース',
  description: 'Master every question type on the mock tests, one pattern at a time. Know the patterns, and your score will follow.',
  description_ja: '模試で出る問題形式を、ひとつずつ攻略。パターンを知れば、スコアは伸びます。',
  published: false,
  order_index: 0,
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — Part 2 応答問題の攻略
// ════════════════════════════════════════════════════════════════════════════

// ── L1 (FREE) WH疑問文：最初の一語に集中 ──────────────────────────────────
const L1_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。応答として正しいものを選んでください。',
    'When is the budget meeting?',
    ['In the main conference room.', 'Tomorrow at ten.', 'Yes, about the budget.'],
    1,
    '質問の最初の一語は When。「いつ？」と聞かれているので、時を答える Tomorrow at ten. が正解です。場所を答える(A)や、Yes で始まる(C)は When の質問への答えになりません。\n\nこの「最初の一語で答えの種類が決まる」感覚が、Part 2攻略の出発点です。',
    'The first word is When, so the answer must give a time: “Tomorrow at ten.” (A) answers a Where question, and (C) starts with Yes — WH questions are never answered with yes or no.',
  ),
  // 2. concept: 最初の一語がすべて
  con(
    '最初の一語がすべて',
    'The first word is everything',
    'Part 2では質問が一度しか流れず、選択肢も印刷されていません。だからこそ、聞き取りの優先順位を決めておくことが大切です。\n\n最優先は文頭の疑問詞。What（何）・Where（どこ）・When（いつ）・Who（誰）・Why（なぜ）・How（どう）。この一語さえつかめば、「答えの種類」が先にわかります。\n\nWhere なら場所、When なら時、Who なら人。あとは選択肢の中から、その種類に合うものを探すだけです。',
    'In Part 2 you hear the question only once and nothing is printed. So decide your listening priority in advance: the question word at the very start. Catch What / Where / When / Who / Why / How, and you already know what KIND of answer to expect — a place, a time, a person. Then simply match the responses against that kind.',
    'Where is the copy machine? → 場所で答える\nWhen does the store open? → 時で答える\nWho wrote this report? → 人で答える',
  ),
  // 3. practice
  q(
    '応答として正しいものを選んでください。',
    'Where did you put the shipping invoices?',
    ['On your desk.', 'Yes, I shipped them.', 'Sometime next week.'],
    0,
    'Where と聞かれたら、答えは場所。On your desk. が正解です。\n\n(B)は質問の shipping と似た shipped を使ったひっかけで、しかもWH疑問文に Yes で答えています。(C)は When への答えですね。',
    'Where asks for a place, so “On your desk.” is the answer. (B) recycles a similar-sounding word (shipping → shipped) and answers a WH question with Yes; (C) answers a When question.',
  ),
  // 4. practice
  q(
    '応答として正しいものを選んでください。',
    'Who is leading the new employee orientation?',
    ['In the training room.', 'At nine thirty.', 'Ms. Okada from HR.'],
    2,
    'Who の答えは人。Ms. Okada from HR. が正解です。\n\n場所(A)や時刻(B)は、それぞれ Where / When への答え。疑問詞と「答えの種類」をセットでとらえる習慣をつけましょう。',
    'Who asks for a person — Ms. Okada. A place (A) answers Where and a time (B) answers When. Pair each question word with its answer type.',
  ),
  // 5. practice
  q(
    '応答として正しいものを選んでください。',
    'What time does the pharmacy close tonight?',
    ['At the corner drugstore.', 'At eight o’clock.', 'Twice a day.'],
    1,
    'What time は時刻を聞く質問なので、At eight o’clock. が正解。\n\n(A)は場所、(C)は頻度（How often への答え）です。What time / When / How often は答えの形が紛らわしいので、選択肢を「時刻・時・頻度」に仕分けする意識を持つと強くなります。',
    'What time asks for a clock time: “At eight o’clock.” (A) is a place; (C) answers How often. Sort time-flavoured options into time / date / frequency.',
  ),
  // 6. concept: ひっかけ
  con(
    'ひっかけの定番：Yes / No で始まる選択肢',
    'The classic trap: options that start with Yes / No',
    'WH疑問文に Yes や No で答えることはできません。「何時ですか？」と聞かれて「はい」と答えたら不自然ですよね。英語でも同じです。\n\nところがPart 2では、WH疑問文の選択肢に Yes / No で始まるものが平気で混ざってきます。これは即座に消去してOK。\n\nもうひとつの定番は、質問に出た単語（や似た音の単語）をそのまま使った選択肢。「聞こえた単語があるから正解っぽい」と感じさせるワナです。むしろ疑ってかかりましょう。',
    'You can never answer a WH question with Yes or No — yet Part 2 happily includes such options. Eliminate them instantly. The other classic trap is an option that repeats a word (or a similar sound) from the question: it FEELS right because you heard it. Treat it with suspicion instead.',
    'Q: What did you order for lunch?\n× Yes, I ordered it. ← WH疑問文にYesはNG\n× The order form is here. ← orderの繰り返しに注意\n○ Just a sandwich.',
  ),
  // 7. practice
  q(
    '応答として正しいものを選んでください。',
    'Why was the staff meeting moved to Friday?',
    ['Because the director is away on Thursday.', 'Yes, on Friday.', 'In meeting room two.'],
    0,
    'Why には理由で答えます。Because... の(A)が正解。\n\n(B)はWH疑問文への Yes、しかも質問の Friday をそのまま繰り返す二重のワナ。(C)は meeting つながりのひっかけです。ワナの形が見えてくると、消去法だけでも正解できます。',
    'Why needs a reason — “Because the director is away.” (B) is a double trap: Yes to a WH question plus a repeated word (Friday). (C) just echoes “meeting”.',
  ),
  // 8. practice
  q(
    '応答として正しいものを選んでください。',
    'How many chairs do we need for the seminar?',
    ['Yes, please set them up.', 'It starts at two.', 'About thirty should be enough.'],
    2,
    'How many は数を聞いています。About thirty... と数で答える(C)が正解。\n\n(A)は Yes 始まりで即消去、(B)は時刻なので When の答えです。最初の2語 How many まで聞ければ確実に取れる問題です。',
    'How many asks for a number: “About thirty.” (A) starts with Yes — gone. (B) answers When. Catch the first two words and this one is free.',
  ),
  // 9. recap
  con(
    'まとめ：最初の一語に全集中',
    'Recap: all eyes on the first word',
    '・Part 2は質問の最初の疑問詞で「答えの種類」が決まる\n\n・Where→場所、When→時、Who→人、Why→理由、How many→数\n\n・WH疑問文に Yes / No で始まる選択肢は即消去\n\n・質問と同じ単語・似た音の選択肢はワナを疑う\n\n次のレッスンでは、Yes / No で答えられる疑問文と付加疑問文を攻略します。',
    '• The first question word decides the answer type.\n\n• Where→place, When→time, Who→person, Why→reason, How many→number.\n\n• Yes/No openers are instant eliminations for WH questions.\n\n• Repeated or similar-sounding words are traps.\n\nNext: yes/no questions and tag questions.',
  ),
]
// ── L2 Yes/No疑問文と付加疑問文 ──────────────────────────────────────────
const L2_SCREENS = [
  // 1. concept hook
  con(
    'Yes/No疑問文 — でも正解は Yes/No とは限らない',
    'Yes/No questions — but the answer is rarely yes or no',
    'Do you...? / Have you...? / Is it...? のようなYes/No疑問文。今度こそ Yes か No で答えればいい…と思いきや、Part 2の正解は Yes/No を言わないことのほうが多いんです。\n\n実際の会話では、Yes/Noを飛ばして中身だけ答えることがよくあります。「資料、もう読んだ？」に「まだ半分くらい」と答えるイメージです。\n\nPart 2はこの「自然な会話」を出題します。Yes/Noがない選択肢を切り捨てないこと。これが今日のポイントです。',
    'With Do you...? / Have you...? / Is it...? you might expect a yes or a no — but in Part 2 the correct response often skips it entirely, just like real conversation: “Have you read the report?” — “About halfway through.” Never eliminate an option just because it lacks a yes or no.',
    'Q: Have you booked the flight?\n○ I’m waiting for the schedule to be confirmed.（Yes/Noなしで自然な答え）',
  ),
  // 2. practice
  q(
    '応答として正しいものを選んでください。',
    'Have you finished the sales report yet?',
    ['Almost — I just need the June figures.', 'Yes, he reported it.', 'On the sales floor.'],
    0,
    '「終わった？」への自然な答えは Almost（ほぼね）。Yes/Noがなくても、進み具合を伝えていれば立派な応答です。\n\n(B)は Yes で始まるものの中身が質問とかみ合わず、reported は report の音ワナ。(C)は sales つながりのひっかけです。',
    '“Almost — I just need the June figures.” answers naturally without a yes/no. (B) starts with Yes but makes no sense (and “reported” is a sound trap); (C) just echoes “sales”.',
  ),
  // 3. concept: indirect answers
  con(
    '「わからない」も立派な正解',
    '“I don’t know yet” is a perfectly good answer',
    'Part 2で頻出の正解パターンが、間接的な答えです。\n\n・I haven’t checked yet.（まだ確認していない）\n・Ask Maria — she organized it.（マリアに聞いて）\n・It depends on the budget.（予算次第だね）\n\n質問に正面から答えていなくても、会話として成立していればそれが正解。むしろ「きれいに答えすぎる」選択肢ほどワナだったりします。',
    'A hugely common correct pattern is the indirect answer: “I haven’t checked yet.” / “Ask Maria — she organized it.” / “It depends on the budget.” If it works as conversation, it can be the answer — and suspiciously tidy answers are often the traps.',
    'Q: Is the meeting room available at three?\n○ I haven’t checked the schedule yet.\n○ You’d better ask the receptionist.',
  ),
  // 4. practice
  q(
    '応答として正しいものを選んでください。',
    'Is the new cafe across the street any good?',
    ['Across from the bank.', 'I haven’t tried it yet.', 'Yes, a new street.'],
    1,
    '「新しいカフェ、おいしい？」に「まだ行ってないんだ」——完璧に自然な会話です。質問に直接答えていなくてもOK、というのがPart 2の鉄則。\n\n(A)は across の繰り返し、(C)は Yes で始まりますが中身がかみ合っていません。',
    '“I haven’t tried it yet.” is a natural, indirect reply. (A) recycles “across”; (C) starts with Yes but the content is nonsense.',
  ),
  // 5. practice
  q(
    '応答として正しいものを選んでください。',
    'Do you know if Mr. Ito has approved the budget?',
    ['About fifty thousand yen.', 'He approved of the idea.', 'His assistant would know.'],
    2,
    '「伊藤さん、予算を承認した？」に「アシスタントの方が知ってるよ」。自分は知らないので、知っていそうな人を案内する——これも頻出の正解パターンです。\n\n(A)は budget に引っ張られた金額のワナ、(B)は approved の繰り返しワナです。',
    '“His assistant would know.” redirects to someone who knows — a very common correct pattern. (A) is a money trap hooked to “budget”; (B) repeats “approved”.',
  ),
  // 6. concept: tag questions
  con(
    '付加疑問文は「ただの確認」',
    'Tag questions are just confirmation',
    '文の最後に付く isn’t it? / didn’t you? / right? が付加疑問文。「〜だよね？」という軽い確認です。\n\n複雑に見えますが、答え方は普通のYes/No疑問文とまったく同じ。後ろの小さな疑問は無視して、文の本体だけ聞き取ればOKです。\n\nThe shipment arrived on time, didn’t it? は要するに Did the shipment arrive on time? と同じ質問です。',
    'Tags like isn’t it? / didn’t you? / right? just turn a statement into a light confirmation. Answer them exactly like a normal yes/no question — ignore the tag and listen to the main sentence. “The shipment arrived on time, didn’t it?” simply means “Did the shipment arrive on time?”',
    'You’ve met the new manager, haven’t you?\n= Have you met the new manager?\n○ Yes, at last week’s lunch. / ○ Not yet, actually.',
  ),
  // 7. practice
  q(
    '応答として正しいものを選んでください。',
    'The shipment arrived on time, didn’t it?',
    ['Actually, it was a day late.', 'At the loading dock.', 'No, don’t ship it yet.'],
    0,
    '「予定どおり届いたよね？」への答えは、Actually, it was a day late.（実は1日遅れたんだ）。\n\nActually は「実はね」と相手の想定をやんわり訂正する頻出ワード。(B)は場所、(C)は ship の音ワナです。',
    '“Actually, it was a day late.” politely corrects the assumption — “actually” is a high-frequency signal for that. (B) is a place; (C) is a sound trap on “ship”.',
  ),
  // 8. practice
  q(
    '応答として正しいものを選んでください。',
    'You’re coming to the farewell party on Friday, aren’t you?',
    ['It was a great party.', 'I wouldn’t miss it.', 'Near the station.'],
    1,
    '「金曜の送別会、来るよね？」に I wouldn’t miss it.（絶対行くよ）。Yes と言わずに「行く」と伝える、こなれた表現です。\n\n(A)は過去形なので「これから」の話に合いません。(C)は場所の答えです。',
    '“I wouldn’t miss it.” means “definitely coming” without saying yes. (A) is past tense — the party hasn’t happened; (C) answers Where.',
  ),
  // 9. recap
  con(
    'まとめ：Yes/Noにこだわらない',
    'Recap: don’t insist on a yes or no',
    '・Yes/No疑問文の正解は、Yes/Noを言わないことが多い\n\n・「まだ確認していない」「〜に聞いて」などの間接的な答えは頻出の正解\n\n・付加疑問文（〜, isn’t it?）は普通の疑問文と同じに扱う\n\n・Actually で始まる応答は「実は違う」のサイン\n\n次は、Part 2最大のワナ「似た音のひっかけ」を集中攻略します。',
    '• Correct answers often skip yes/no entirely.\n\n• Indirect replies (“I haven’t checked”, “ask Maria”) are frequent winners.\n\n• Treat tag questions as ordinary yes/no questions.\n\n• “Actually...” signals a polite correction.\n\nNext: Part 2’s biggest trap — sound-alikes.',
  ),
]
// ── L3 似た音のひっかけ ──────────────────────────────────────────────────
const L3_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。応答として正しいものを選んでください。',
    'Could you walk me through the new filing system?',
    ['Sure — do you have time after lunch?', 'I work on the third floor.', 'Down the long hallway.'],
    0,
    'walk me through 〜 は「〜を一通り説明して」という依頼。快諾している(A)が正解です。\n\n(B)は walk と work の音のひっかけ。発音が似た単語を混ぜて聞き間違いを誘うのが、Part 2の定番ワナです。',
    '“Walk me through ~” is a request for an explanation, so (A) agrees to it. (B) is a sound trap — walk vs. work. Mixing in near-homophones is Part 2’s favourite trick.',
  ),
  // 2. concept: how sound traps work
  con(
    '音のワナの仕組み',
    'How sound traps work',
    'Part 2の不正解選択肢には、質問に出た単語と「音がそっくりな単語」が高確率で仕込まれます。\n\n・copy（コピー）⇔ coffee（コーヒー）\n・walk（歩く）⇔ work（働く）\n・mail（郵便）⇔ meal（食事）\n・supplies（備品）⇔ surprise（驚き）\n\n怖いのは、聞き取れた音に脳が飛びつくこと。「coffee って聞こえた！」と思った選択肢ほど、一度疑ってください。\n\n逆にいえば——質問と同じ・似た単語が入った選択肢はワナの可能性が高い。正解は別の表現で言い換えられていることがほとんどです。',
    'Wrong options in Part 2 are routinely seeded with near-homophones of words in the question: copy/coffee, walk/work, mail/meal, supplies/surprise. The danger is that your brain leaps at the sound it caught. So flip the logic: an option that repeats or resembles a question word is probably a trap, and the real answer is usually reworded.',
    'Q: Where can I buy copy paper?\n× With cream and sugar, please. ← copy → coffee と聞き違えさせるワナ',
  ),
  // 3. practice
  q(
    '応答として正しいものを選んでください。',
    'Where can I get a copy of the employee handbook?',
    ['With milk, please.', 'From the HR office.', 'He’s very handy.'],
    1,
    '(A)は copy を coffee と聞き違えた人を釣るワナ、(C)は handbook と handy の音ワナです。\n\nWhere への答えとして場所を示す(B)が正解。「似た音を疑う」と「場所で答える」、2つのチェックが両方使えた問題でした。',
    '(A) baits anyone who heard “coffee”; (C) plays handbook → handy. (B) gives a place, which is what Where demands.',
  ),
  // 4. practice
  q(
    '応答として正しいものを選んでください。',
    'When does the next train to the airport leave?',
    ['The new training program.', 'Yes, he’s leaving the company.', 'In about ten minutes.'],
    2,
    '(A)は train → training、(B)は leave → leaving の音ワナ＋WH疑問文への Yes。\n\nWhen に時間で答える(C)が正解です。ワナを2つ消せば、自信を持って選べますね。',
    '(A) plays train → training; (B) plays leave → leaving AND answers a WH question with Yes. (C) gives a time, which When requires.',
  ),
  // 5. concept: the right answer is plain
  con(
    '正解はたいてい「地味」',
    'The right answer is usually plain',
    'ここまでで気づいたかもしれません。Part 2の正解は、質問の単語を繰り返さない、地味な選択肢が多いんです。\n\n出題者の心理を想像してみましょう。聞き取れた単語をそのまま含む選択肢は「お、聞こえたぞ」と選ばせるエサ。正解はあえて別の単語で作っておく——こうすれば、本当に文全体を理解した人だけが正解できます。\n\nだから本番では、こう考えてください。「同じ単語・似た音 → 疑う」「地味だけど会話が成立 → 有力」。',
    'You may have noticed: correct Part 2 answers tend to be plain and avoid repeating the question’s words. Test writers use repeated words as bait, and deliberately reword the real answer so only people who understood the whole sentence get it. In the test: same/similar word → suspect it; plain but conversationally natural → strong candidate.',
  ),
  // 6. practice
  q(
    '応答として正しいものを選んでください。',
    'Why is the parking garage closed this week?',
    ['I bought new clothes.', 'They’re repaving the floors.', 'Yes, park it over there.'],
    1,
    '(A)は closed → clothes の音ワナ。(C)は parking → park の繰り返し＋Yes始まり。\n\n理由を答えている(B)が正解です。repave（舗装し直す）を知らなくても、ワナを2つ消せば残りは1つ。消去法もPart 2の立派な戦略です。',
    '(A) plays closed → clothes; (C) repeats “park” and opens with Yes. (B) gives a reason. Even without knowing “repave”, elimination leaves only one option.',
  ),
  // 7. practice
  q(
    '応答として正しいものを選んでください。',
    'How was your flight from Sapporo?',
    ['A little bumpy, but fine.', 'Could you turn off the light?', 'You’re right, it is.'],
    0,
    'How was 〜? は感想を聞く質問なので、(A)「ちょっと揺れたけど、まあ快適だったよ」が正解。\n\n(B)は flight → light、(C)は flight → right の音ワナです。語尾の -ight つながりに惑わされないように。',
    '“How was ~?” asks for an impression: “A little bumpy, but fine.” (B) and (C) both ride the -ight rhyme (flight → light / right).',
  ),
  // 8. practice
  q(
    '応答として正しいものを選んでください。',
    'Who’s in charge of ordering office supplies?',
    ['What a nice surprise!', 'Yes, in large sizes.', 'That would be Mr. Tanaka.'],
    2,
    '(A)は supplies → surprise、(B)は supplies → sizes の音ワナです。Who に人で答える(C)が正解。\n\nThat would be 〜 は「（担当は）〜のはずですよ」という柔らかい言い方で、Part 2の正解によく出ます。',
    '(A) plays supplies → surprise and (B) supplies → sizes. Who needs a person: “That would be Mr. Tanaka.” — a soft, very TOEIC-flavoured way to identify someone.',
  ),
  // 9. recap
  con(
    'まとめ：似た音は疑え',
    'Recap: suspect the sound-alikes',
    '・不正解の選択肢には、質問と音が似た単語が仕込まれる（copy/coffee、walk/work）\n\n・「聞こえた単語がある」選択肢ほど疑う\n\n・正解は地味に言い換えられていることが多い\n\n・ワナを消す消去法も立派な戦略\n\nこれでPart 2の3大パターンは攻略完了。次のレベルからは、Part 3・4の会話問題に進みます。',
    '• Wrong options carry near-homophones of question words.\n\n• The option you “heard” is the one to doubt.\n\n• Correct answers are plain and reworded.\n\n• Elimination is a legitimate strategy.\n\nThat completes the three big Part 2 patterns. Next level: Parts 3 & 4.',
  ),
]
// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — Part 3・4 先読みの技術
// ════════════════════════════════════════════════════════════════════════════

// ── L4 設問の先読み ──────────────────────────────────────────────────────
const L4_SCREENS = [
  // 1. concept hook
  con(
    '音声が流れる前に、勝負は始まっている',
    'The battle starts before the audio plays',
    'Part 3・4では、会話やトークを聞いて、印刷された3つの設問に答えます。\n\nスコアが伸びない人の多くは、音声が始まってから設問を読み始めます。これでは「何を聞き取ればいいか」わからないまま音声が終わってしまう。\n\n上級者は逆です。音声の前の数秒で設問を先に読み、「聞き取るべきポイント」を決めてから音声を迎える。これが先読みです。このレッスンでは、紙の上のトレーニングで先読みの型を身につけます。',
    'In Parts 3 and 4 you answer three printed questions about each conversation or talk. Low scorers start reading the questions AFTER the audio begins — and the audio ends before they know what to listen for. High scorers preview: they read the questions in the seconds beforehand and decide their listening targets. This lesson trains that habit on paper.',
  ),
  // 2. concept: pick your ambush points
  con(
    '設問から「待ち伏せポイント」を決める',
    'Turn each question into an ambush point',
    '設問を読んだら、2つだけマークします。\n\n①誰について聞かれているか（the man / the woman / the speaker）\n②何を聞かれているか（場所？目的？次の行動？）\n\nたとえば Why is the man calling? なら、「男性が」「電話の目的を」話す瞬間を待ち伏せします。電話の目的はほぼ冒頭で語られるので、集中すべきは最初のひと言。\n\nWhat will the woman do next? なら、答えのヒントは会話の終盤に来ます。設問の種類で「答えが出る位置」まで予測できるんです。',
    'When you read a question, mark two things: WHO it asks about (the man / the woman) and WHAT it asks for (place? purpose? next action?). “Why is the man calling?” → ambush the opening line, because callers state their purpose first. “What will the woman do next?” → the clue comes near the end. The question type even predicts WHERE the answer will appear.',
    'Why is the man calling? → 冒頭を待ち伏せ\nWhat does the woman suggest? → 女性のセリフだけに集中\nWhat will the man do next? → 終盤を待ち伏せ',
  ),
  // 3. meta question (3 options)
  q(
    '先読みトレーニング',
    '設問 “Why is the woman calling?” を先読みしました。音声が始まったら、どこに集中すべき？',
    ['会話の冒頭、女性の最初のセリフ', '会話の真ん中あたりの男性のセリフ', '会話の最後のあいさつ'],
    0,
    '電話の用件は、かけた本人が冒頭で言うのが自然です（「〜の件でお電話したのですが」）。\n\nWhy is A calling? 型の設問は、答えが冒頭に来る代表格。設問の形から「答えの位置」を予測するのが、先読みの核心です。',
    'Callers state their purpose at the start (“I’m calling about...”), so ambush the woman’s opening line. Predicting WHERE the answer appears is the heart of previewing.',
  ),
  // 4. transcript question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nW: Hi, this is Keiko from Norton Dental. I’m calling to remind you about your appointment tomorrow at 4 P.M.\nM: Oh, thank you. Actually, could I move it to Thursday? Something urgent came up at work.\nW: Let me see... yes, Thursday at 4 is open.\n\nQ: Why is the woman calling?',
    ['To cancel an appointment', 'To remind the man about an appointment', 'To ask about a dental problem', 'To reschedule a meeting'],
    1,
    '女性は冒頭で I’m calling to remind you... とハッキリ目的を言っています。「先読みで冒頭を待ち伏せ → 一発で正解」の流れを体感してください。\n\n(D)の「予定変更」をしたがっているのは男性のほう。主語のすり替えに注意です。',
    'Her opening line says it outright: “I’m calling to remind you...”. (D) describes what the MAN wants — a classic subject swap.',
  ),
  // 5. gap fill
  gap(
    '会話を読んで、答えを入力してください。',
    '【会話】\nM: The client wants to move our presentation up to Tuesday. Can the slides be ready?\nW: Tuesday is tight... I can finish the data section by Monday evening, but the design polish needs one more day.\nM: Then let’s show them the data Tuesday and send the final deck on Wednesday.\n\nQ: What day will the final slides be sent?（英語1語で）',
    ['wednesday', 'on wednesday'],
    '男性の最後のセリフ send the final deck on Wednesday が根拠です。\n\nPart 3では曜日や時刻が複数飛び交います。先読みで「最終版はいつ？」と決め打ちして聞けば、Tuesday や Monday に惑わされません。',
    'The man’s last line — “send the final deck on Wednesday” — is the evidence. Several days fly past in Part 3; previewing tells you which one to lock onto.',
  ),
  // 6. concept: subject swaps
  con(
    '主語のすり替えに注意',
    'Watch for subject swaps',
    '先読みで意外と大事なのが、設問の主語です。\n\nWhat does the man offer to do?（男性は何を申し出ている？）という設問で、会話に「提案」が2つ出てきたら——片方は男性の提案、もう片方は女性の提案、という作りになっています。\n\n不正解の選択肢は「会話に出てきた内容だけど、主語が違う」ことが多い。聞こえた内容に飛びつかず、誰が言ったかをセットで追いましょう。',
    'The subject of the question matters more than it looks. If the question asks what the MAN offers, the conversation will usually contain a second offer — made by the woman. Wrong options are often things that WERE said, just by the other speaker. Track who said what, not just what was said.',
  ),
  // 7. transcript question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nW: The printer on this floor is out of toner again. I need to print 40 copies of the agenda before 3.\nM: The supply closet is locked, but I can ask building services to open it. Or you could use the printer on the fifth floor.\nW: I’ll try the fifth floor — it’s faster.\n\nQ: What does the man offer to do?',
    ['Print the agenda himself', 'Buy more toner', 'Move the meeting to 3 o’clock', 'Contact building services'],
    3,
    '男性のセリフ I can ask building services... が「申し出」です。\n\n女性が選んだのは5階のプリンターですが、設問が聞いているのは男性の申し出のほう。主語を意識した先読みができていれば迷いません。',
    'His offer is “I can ask building services to open it.” The woman chooses the fifth floor, but the question asks about HIS offer — subject awareness wins.',
  ),
  // 8. transcript question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nM: Welcome to Grandview Apartments. Are you here for the two-bedroom viewing?\nW: Yes, but I’m also curious about parking. I drive to work every day.\nM: Each unit comes with one space, and a second one is available for a monthly fee.\nW: Good. Could I see the parking area after we look at the room?\n\nQ: What will the speakers probably do next?',
    ['Sign a lease agreement', 'Discuss the monthly fee', 'Look at an apartment', 'Visit the parking area'],
    2,
    '女性は after we look at the room（部屋を見たあとで）と言っているので、次にするのは部屋の内見です。(D)の駐車場はそのあと。\n\nnext を聞く設問は、順番の入れ替えがワナになります。終盤を待ち伏せ＋順序に注意、です。',
    '“After we look at the room” means the room comes first, the parking area second. “Next” questions love to scramble the order — ambush the ending AND check the sequence.',
  ),
  // 9. recap
  con(
    'まとめ：先読みの型',
    'Recap: the previewing routine',
    '・音声の前に設問を読み、「誰の」「何を」待ち伏せするか決める\n\n・Why is ~ calling? → 冒頭、What will ~ do next? → 終盤に答えが出やすい\n\n・会話に出てきた内容でも、主語が違えば不正解\n\n・本番では設問間のポーズ（約8秒）が先読みタイム。解答を即決して、残りで次の設問を読む\n\n次のレッスンは、Part 3・4の核心「言い換え」です。',
    '• Before the audio, decide WHOSE words and WHAT information to ambush.\n\n• Purpose questions → opening; next-action questions → ending.\n\n• Right content, wrong speaker = wrong answer.\n\n• In the real test, the ~8-second pauses are your previewing time.\n\nNext: the heart of Parts 3 & 4 — paraphrasing.',
  ),
]
// ── L5 言い換えを見抜く ──────────────────────────────────────────────────
const L5_SCREENS = [
  // 1. concept hook
  con(
    '正解は「同じ言葉」では出てこない',
    'The answer never uses the same words',
    'Part 3・4で音声がこう言ったとします。The shipment won’t arrive until Thursday.\n\n正解の選択肢はこうなります。The delivery will come later this week.\n\nshipment は delivery に、not until Thursday は later this week に。同じ内容なのに、単語はほぼ総入れ替えです。これがTOEICの言い換え（パラフレーズ）。\n\n逆に、音声と同じ単語をそのまま使った選択肢はワナのことが多い。Part 2の「似た音のワナ」と同じ発想ですね。聞こえた単語ではなく、意味で選ぶ——これがこのレッスンのテーマです。',
    'Suppose the audio says “The shipment won’t arrive until Thursday.” The correct option will read “The delivery will come later this week.” — same meaning, almost every word swapped. That is TOEIC paraphrasing. Options that copy the audio word-for-word are usually traps, just like Part 2’s sound-alikes. Choose by meaning, not by matching words.',
  ),
  // 2. matching question
  q(
    '言い換えトレーニング',
    '音声: “I can give you a hand with those reports, if you like.”\n\nこの発言の内容に合う選択肢はどれ？',
    ['He wants to read the reports.', 'He is offering to help.', 'He needs the reports by hand.', 'He has already finished the reports.'],
    1,
    'give 〜 a hand は「手を貸す」。選択肢では offer to help と言い換えられています。\n\nイディオム → 普通の動詞、という言い換えはPart 3・4の頻出パターン。hand につられて(C)を選ばないように。',
    '“Give you a hand” = help, so the option says “offering to help”. Idiom → plain verb is a staple TOEIC paraphrase. Don’t let “hand” pull you to (C).',
  ),
  // 3. concept: three patterns
  con(
    '言い換えの3大パターン',
    'The three big paraphrase patterns',
    '①上位語への言い換え（具体 → ざっくり）\ndesk lamps → lighting products ／ sandwiches → food\n\n②動詞・イディオムの言い換え\ngive a hand → help ／ look into → investigate\n\n③数字・時間の言い換え\nnot until Thursday → later this week ／ every 30 minutes → twice an hour\n\n音声を聞きながら「これ、別の言い方をしたら？」と変換する癖をつけると、正解が浮かび上がって見えるようになります。',
    '1) Specific → general: desk lamps → lighting products; sandwiches → food.\n\n2) Verb/idiom swaps: give a hand → help; look into → investigate.\n\n3) Number/time conversions: not until Thursday → later this week; every 30 minutes → twice an hour.\n\nTrain yourself to re-say what you hear in other words, and correct options start to glow.',
  ),
  // 4. question
  q(
    '言い換えトレーニング',
    '音声: “All desk lamps are twenty percent off this weekend only.”\n\nこの内容に合う選択肢はどれ？',
    ['Some lighting products are temporarily discounted.', 'All furniture is on sale.', 'Desks are twenty percent off.', 'A new lamp model is arriving this weekend.'],
    0,
    'desk lamps → lighting products（上位語）、this weekend only → temporarily、twenty percent off → discounted。三段階の言い換えが入っています。\n\n(C)は desk だけ聞き取った人へのワナ。値引きされるのは机ではなくランプです。',
    'Three swaps at once: desk lamps → lighting products, weekend only → temporarily, 20% off → discounted. (C) baits anyone who only caught “desk”.',
  ),
  // 5. question
  q(
    '言い換えトレーニング',
    '音声: “The fitness center is free of charge for all hotel guests.”\n\nこの内容に合う選択肢はどれ？',
    ['The hotel charges a small fee for the gym.', 'The fitness center is open all night.', 'Guests can use the gym at no cost.', 'The fitness center is for members only.'],
    2,
    'free of charge → at no cost、fitness center → gym。\n\n「無料」の言い換えは free ／ at no cost ／ complimentary の3点セットで覚えておくと、Part 3・4でも Part 7でも役立ちます。',
    '“Free of charge” → “at no cost”; “fitness center” → “gym”. Memorise the free-trio: free / at no cost / complimentary — it pays off in Part 7 too.',
  ),
  // 6. gap fill
  gap(
    '言い換えを完成させてください。',
    '音声: “The workshop has been pushed back to next month.”\n\n選択肢ではこう言い換えられます：\nThe workshop has been ___.（1語で）\n\nヒント: pushed back = 延期された',
    ['postponed', 'delayed', 'rescheduled'],
    'push back（後ろへ押す → 延期する）は、選択肢では postponed や delayed に化けます。\n\n句動詞 → 1語の動詞への言い換えはTOEIC全パートの定番。put off → postpone もセットで覚えましょう。',
    '“Push back” becomes “postponed” (or “delayed”) in the options. Phrasal verb → single verb is a TOEIC-wide pattern; learn “put off → postpone” with it.',
  ),
  // 7. question
  q(
    '言い換えトレーニング',
    '音声: “The express bus to the airport runs every fifteen minutes.”\n\nこの内容に合う選択肢はどれ？',
    ['The bus takes fifteen minutes to reach the airport.', 'The bus runs only in the morning.', 'The airport is fifteen minutes away.', 'The bus departs four times an hour.'],
    3,
    'every fifteen minutes（15分おき）＝1時間に4本。\n\n数字をそのまま使った(A)(C)は「15分」の意味をすり替えたワナです。数字の言い換えは、単位を変換して確認するのが確実です。',
    '“Every fifteen minutes” = four times an hour. (A) and (C) keep the number but twist its meaning. With number paraphrases, convert the units to verify.',
  ),
  // 8. question
  q(
    '言い換えトレーニング',
    '音声: “Ms. Rivera will go over the survey results at Monday’s meeting.”\n\nこの内容に合う選択肢はどれ？',
    ['Ms. Rivera will distribute a survey on Monday.', 'Ms. Rivera will review some findings.', 'The meeting has been moved to Monday.', 'The survey will close on Monday.'],
    1,
    'go over → review（見直す・説明する）、survey results → findings（調査結果）。どちらもTOEIC頻出の言い換えペアです。\n\n(A)は survey を「配る」にすり替えたワナ。動詞まで正確に聞き取れたかが問われています。',
    '“Go over” → review; “survey results” → findings — both high-frequency pairs. (A) keeps “survey” but swaps the verb to “distribute”.',
  ),
  // 9. recap
  con(
    'まとめ：意味で選ぶ',
    'Recap: choose by meaning',
    '・正解の選択肢は、音声の単語を言い換えてある\n\n・3大パターン：上位語／動詞・イディオム／数字・時間\n\n・音声と同じ単語が目立つ選択肢はワナを疑う\n\n・free → at no cost、push back → postpone など、ペアで暗記すると速い\n\n次は、言い換えのさらに上を行く「話者の意図問題」です。',
    '• Correct options reword the audio.\n\n• Three patterns: general words / verb swaps / number conversions.\n\n• Word-for-word matches are suspect.\n\n• Learn paraphrase PAIRS (free → at no cost, push back → postpone).\n\nNext: one level deeper — speaker-intent questions.',
  ),
]
// ── L6 話者の意図問題 ────────────────────────────────────────────────────
const L6_SCREENS = [
  // 1. concept hook
  con(
    '“It’s already five o’clock” の本当の意味',
    'What “It’s already five o’clock” really means',
    'Part 3・4には、こんな設問があります。\n\nWhy does the woman say, “It’s already five o’clock”?（女性はなぜ「もう5時だ」と言っているのか）\n\n「時刻を伝えるため」——これはほぼ確実にワナです。実際の会話で「もう5時だよ」と言うとき、私たちは時刻ではなく「急ごう」「今日はもう無理」「帰ろう」といった気持ちを伝えていますよね。\n\n意図問題は、セリフの文字どおりの意味ではなく、その場での働き（機能）を聞いています。前後の流れがすべてです。',
    'Some questions ask: Why does the woman say, “It’s already five o’clock”? “To tell the time” is almost always a trap. In real life that sentence means “let’s hurry”, “it’s too late today”, or “time to go home”. Intent questions ask about the FUNCTION of the line in context — and the surrounding lines are everything.',
  ),
  // 2. question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nM: Can we add one more section to the proposal before we send it?\nW: It’s already five o’clock. The client expects it today.\nM: You’re right. Let’s send it as it is.\n\nQ: Why does the woman say, “It’s already five o’clock”?',
    ['To suggest there is no time for changes', 'To tell the man the current time', 'To complain about working late', 'To remind the man about a meeting'],
    0,
    '直後に男性が「そのまま送ろう」と納得していることから、女性の「もう5時」は時刻の報告ではなく「修正している時間はない」という反対のサイン。\n\n(B)の「時刻を伝えるため」は文字どおり解釈のワナです。意図問題は前後の反応から逆算しましょう。',
    'The man’s reply — “Let’s send it as it is” — shows her line worked as “no time for changes”. (B) is the literal-meaning trap. Work backwards from the reaction.',
  ),
  // 3. concept: four functions
  con(
    '意図は4種類に分けて考える',
    'Sort intent into four functions',
    '意図問題のセリフの働きは、だいたい次の4つに収まります。\n\n①提案・促し：「もう5時だよ」→ そろそろ終わろう\n\n②断り・反対：「今週は出張なんだ」→ だから無理\n\n③驚き・意外：「もう売り切れ？」→ 早すぎる\n\n④安心させる・引き受ける：「私、明日も出社するよ」→ 任せて\n\n選択肢を読むときも、To suggest... ／ To decline... ／ To express surprise... ／ To reassure... という動詞に注目すると、この4分類がそのまま使えます。',
    'Almost every intent line does one of four jobs: 1) suggest/prompt (“it’s already five” → let’s wrap up), 2) decline/object (“I’m travelling this week” → so I can’t), 3) express surprise (“sold out already?”), 4) reassure/volunteer (“I’ll be in tomorrow anyway”). The options mirror this: To suggest / To decline / To express surprise / To reassure.',
  ),
  // 4. question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nW: We’re ordering pizza for the team lunch. Want to join?\nM: I have a client call at noon.\nW: No problem — we’ll save you a few slices.\n\nQ: What does the man imply when he says, “I have a client call at noon”?',
    ['He wants the lunch moved to noon.', 'He will order the pizza himself.', 'He cannot join the lunch.', 'He forgot about the client call.'],
    2,
    '誘いへの返事として「12時に客先と電話があって」と言えば、それは断りです。日本語でも「その日ちょっと予定が…」で断りが伝わるのと同じ。\n\n直後に女性が「取っておくね」とフォローしているのも決め手です。',
    'As a reply to an invitation, “I have a client call at noon” is a refusal — just like “I have plans that day”. The woman’s “we’ll save you a few slices” confirms it.',
  ),
  // 5. question (talk)
  q(
    'トークを読んで、設問に答えてください。',
    '【トーク】\nM: ...and one more thing about Saturday’s sale. Last year, the doors opened at nine, and by ten the gift bags were gone. This year we’ve prepared three hundred — but I’d still come early.\n\nQ: Why does the speaker say, “I’d still come early”?',
    ['The store will open earlier this year.', 'The gift bags may run out again.', 'The sale ends in the morning.', 'Staff must arrive before nine.'],
    1,
    '直前の「去年は1時間で配布終了 → 今年は300個用意した。それでも早めに来る」という流れから、「300個でも足りないかもしれない」という含みが読めます。\n\n意図問題の根拠は、直前のセリフにあることがほとんどです。',
    'The build-up — gone within an hour last year, 300 prepared this year, “but I’d STILL come early” — implies even 300 may not be enough. The evidence sits in the line just before.',
  ),
  // 6. concept: literal options are traps
  con(
    '文字どおりの選択肢はワナ',
    'The literal option is the trap',
    '意図問題の選択肢には、必ずと言っていいほど文字どおりの意味の選択肢が混ざっています。\n\n“It’s already five o’clock” → To tell the man the time\n“I have a client call” → To describe his schedule\n\nこの手の選択肢は、ほぼ自動で消去してかまいません。出題者がわざわざ「なぜこう言ったのか」と聞くのは、文字どおりではない働きがあるからです。\n\n残った選択肢を、直前・直後のセリフと突き合わせる。これが意図問題の解答手順です。',
    'Intent questions almost always include a literal-meaning option (“to tell the time”, “to describe his schedule”). Eliminate it on sight — the test only asks “why does she say this?” when the line does something beyond its surface meaning. Then check the remaining options against the lines just before and after.',
  ),
  // 7. question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nM: The venue for the year-end party wants a deposit by Friday.\nW: Friday? The budget approval meeting isn’t until next Tuesday.\nM: I’ll ask them if they can wait a few more days.\n\nQ: What does the woman imply when she says, “The budget approval meeting isn’t until next Tuesday”?',
    ['The deposit cannot be paid by Friday.', 'The party should be moved to Tuesday.', 'The budget has already been approved.', 'The meeting should be rescheduled.'],
    0,
    '「承認会議は来週の火曜」＝「金曜までにお金は出せない」という遠回しの指摘です。男性が「先方に待ってもらえるか聞いてみる」と動いたことが裏付け。\n\nスケジュールを述べるセリフは、「だから間に合わない／できない」のサインとして頻出です。',
    'Stating the schedule means “so we can’t pay by Friday”. The man’s move — asking the venue to wait — confirms it. Schedule statements very often function as “therefore it’s impossible”.',
  ),
  // 8. question
  q(
    '会話を読んで、設問に答えてください。',
    '【会話】\nW: I’m worried no one will sign up for the new evening class.\nM: You saw the survey results, didn’t you?\nW: Oh — right. Over half asked for evening options.\n\nQ: Why does the man say, “You saw the survey results, didn’t you?”',
    ['To ask the woman to run a new survey', 'To check whether the survey is finished', 'To reassure the woman about the class', 'To criticize the woman’s report'],
    2,
    '不安がる女性に「アンケート結果、見たでしょ？」と返すのは、「心配いらないよ、需要はあるよ」と安心させるため。女性が Oh — right（あ、そうだった）と安心しているのが決め手です。\n\n疑問文の形でも、働きは「励まし」。これが意図問題の面白いところです。',
    'To a worried colleague, “you saw the survey results, didn’t you?” means “relax — the demand is there”. Her relieved “Oh — right” seals it. A question in form, a reassurance in function.',
  ),
  // 9. recap
  con(
    'まとめ：セリフの「働き」を読む',
    'Recap: read the function, not the words',
    '・意図問題はセリフの文字どおりの意味ではなく、その場での働きを聞く\n\n・働きは4分類：提案／断り／驚き／安心させる\n\n・文字どおりの意味の選択肢はほぼ消去してよい\n\n・根拠は直前・直後のセリフ（相手の反応）にある\n\n次のレベルは、リーディングの得点源・Part 5の文法問題です。',
    '• Intent questions ask what the line DOES in context.\n\n• Four functions: suggest / decline / surprise / reassure.\n\n• Eliminate the literal-meaning option on sight.\n\n• Evidence lives in the lines just before and after.\n\nNext level: the scoring engine of Reading — Part 5 grammar.',
  ),
]
// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — Part 5 文法の頻出パターン
// ════════════════════════════════════════════════════════════════════════════

// ── L7 品詞問題 ──────────────────────────────────────────────────────────
const L7_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。空所に入る語を選んでください。',
    'Sales increased ___ after the new advertising campaign.',
    ['significant', 'significantly', 'significance', 'signify'],
    1,
    '空所の前は increased（動詞）。動詞を修飾するのは副詞なので、-ly の significantly が正解です。\n\n実はこの問題、文全体を訳す必要はありません。空所の前後だけで品詞が決まる——これがPart 5最速の解き方です。',
    'The blank follows the verb “increased”, and verbs are modified by adverbs — “significantly”. No need to translate the sentence; the words around the blank decide everything.',
  ),
  // 2. concept: look around the blank
  con(
    '訳すな、前後を見ろ',
    'Don’t translate — look around the blank',
    'Part 5の約3分の1は品詞問題。選択肢に significant ／ significantly ／ significance のような同じ単語の変化形が並んでいたら、それが品詞問題のサインです。\n\n品詞問題は文の意味を取る必要がありません。見るのは空所の前後1〜2語だけ。\n\n・the ___ of → the と of に挟まれたら名詞\n・a ___ ＋名詞 → 名詞の前は形容詞\n・動詞＋ ___ → 動詞のあとは副詞\n・___ ＋動詞（文頭）→ 主語になる名詞\n\n1問20秒以内。ここで稼いだ時間をPart 7に回すのが、リーディング全体の戦略です。',
    'About a third of Part 5 is word-form questions — you spot them when the options are one word in four costumes. You never need the sentence’s meaning; only the one or two words around the blank. the ___ of → noun; a ___ + noun → adjective; verb + ___ → adverb. Under 20 seconds each — the time you save here funds Part 7.',
    'The ___ of the new policy ... → the と of の間 → 名詞\nShe spoke ___ . → 動詞の後ろ → 副詞',
  ),
  // 3. concept: endings
  con(
    '語尾で品詞を見分ける',
    'Identify the part of speech by its ending',
    '変化形のどれが名詞でどれが形容詞か、迷わないために語尾のパターンを押さえましょう。\n\n名詞：-tion ／ -ment ／ -ness ／ -ity（information, payment, kindness, ability）\n\n形容詞：-ive ／ -ful ／ -able ／ -ous（effective, useful, reliable, famous）\n\n副詞：形容詞＋ -ly（effectively, usefully）\n\n動詞：-ize ／ -ify（organize, simplify）\n\n注意したいのは -ly。friendly や timely のように形容詞の -ly もあるので、「-ly だから副詞」と即断せず、空所の位置と合わせて判断しましょう。',
    'Nouns: -tion / -ment / -ness / -ity. Adjectives: -ive / -ful / -able / -ous. Adverbs: adjective + -ly. Verbs: -ize / -ify. One caution: -ly is not always an adverb (friendly, timely are adjectives) — always combine the ending with the blank’s position.',
  ),
  // 4. question
  q(
    '空所に入る語を選んでください。',
    'Please read the safety ___ carefully before operating the machine.',
    ['instruct', 'instructive', 'instructions', 'instructly'],
    2,
    'the safety ___ は「the＋名詞のかたまり」、しかも read の目的語。名詞の instructions が正解です。\n\n-tion(s) は名詞の代表的な語尾。(D)の instructly のような実在しない単語も平気で並ぶので、語尾の知識で堂々と切りましょう。',
    '“The safety ___” needs a noun (and it is the object of “read”): instructions. Note that non-words like “instructly” appear as options — ending knowledge lets you cut them with confidence.',
  ),
  // 5. question
  q(
    '空所に入る語を選んでください。',
    'The hotel staff were praised for their quick and ___ response to the power outage.',
    ['efficient', 'efficiency', 'efficiently', 'efficiencies'],
    0,
    '空所は response（名詞）の前、しかも quick and ___ と形容詞 quick に並列されています。and で結ばれる語は同じ品詞。だから形容詞の efficient が正解です。\n\n並列（and ／ or ／ but）は品詞問題の強力なヒントになります。',
    'The blank sits before the noun “response” and is paired with the adjective “quick” by “and” — coordinated words share a part of speech, so “efficient”. Coordination is a powerful clue.',
  ),
  // 6. gap fill
  gap(
    '品詞問題・記述トレーニング',
    'カッコ内の単語を正しい形に変えて入力してください。\n\nThe manager explained the new schedule very ( clear ) ___.',
    ['clearly'],
    'explained（動詞）を修飾するので、副詞の clearly が正解。「動詞の後ろ・文末で様子を表す → 副詞」は品詞問題の頻出位置です。\n\nvery も実はヒント：very のあとに来られるのは形容詞か副詞だけです。',
    '“Explained” is a verb, so it takes the adverb “clearly”. Bonus clue: “very” can only be followed by an adjective or an adverb.',
  ),
  // 7. question
  q(
    '空所に入る語を選んでください。',
    'Ms. Park’s ___ to detail makes her an excellent quality inspector.',
    ['attentive', 'attentively', 'attend', 'attention'],
    3,
    '所有格 Ms. Park’s の直後に来られるのは名詞だけ。attention が正解です。「所有格＋ ___」は名詞、と機械的に処理してOK。\n\nattention to detail（細部への気配り）は、ビジネス英語の頻出表現としても覚えておくとお得です。',
    'Only a noun can follow the possessive “Ms. Park’s”: attention. Process “possessive + ___” mechanically. “Attention to detail” is also a phrase worth owning.',
  ),
  // 8. question
  q(
    '空所に入る語を選んでください。',
    'The ___ designed brochure attracted many visitors to the booth.',
    ['new', 'newly', 'newest', 'newness'],
    1,
    '空所の後ろは designed（過去分詞）＋ brochure。分詞という「動詞の仲間」を修飾するのは副詞なので、newly が正解。\n\nnewly designed（新しくデザインされた）、recently updated のような「副詞＋分詞＋名詞」はPart 5の定番パターンです。',
    'The blank modifies the participle “designed” — participles are verb-family words, so they take an adverb: “newly”. The “adverb + participle + noun” chain (newly designed, recently updated) is a Part 5 staple.',
  ),
  // 9. recap
  con(
    'まとめ：品詞問題は20秒で',
    'Recap: word-form questions in 20 seconds',
    '・選択肢に同じ単語の変化形が並んだら品詞問題\n\n・文を訳さない。空所の前後1〜2語で決める\n\n・語尾で品詞を判定：-tion/-ment＝名詞、-ive/-able＝形容詞、-ly＝副詞（例外あり）\n\n・and の並列、所有格の後ろ、分詞の前など、「位置のパターン」を貯める\n\n次は動詞の形——時制・態・一致の3点チェックです。',
    '• One word in four costumes = a word-form question.\n\n• Never translate; the 1–2 words around the blank decide.\n\n• Judge by endings: -tion/-ment nouns, -ive/-able adjectives, -ly adverbs (with exceptions).\n\n• Collect position patterns: coordination, possessives, participles.\n\nNext: verb forms — the tense/voice/agreement checklist.',
  ),
]
// ── L8 動詞の形 ──────────────────────────────────────────────────────────
const L8_SCREENS = [
  // 1. concept hook
  con(
    '動詞問題は3つだけチェック',
    'Verb questions: check exactly three things',
    '選択肢に develop ／ develops ／ developed ／ is developed のように同じ動詞の形が並んでいたら、動詞の形問題です。\n\nチェックするのは3つだけ。\n\n①一致：主語は単数？複数？\n\n②時制：時を表すヒント（yesterday, next week, for the past...）はあるか？\n\n③態：主語は「する側」（能動）か「される側」（受動）か？\n\nこの順番で確認すれば、たいてい2〜3個の選択肢が瞬時に消えます。',
    'When the options are one verb in four forms, run a fixed three-point check: 1) AGREEMENT — is the subject singular or plural? 2) TENSE — any time markers (yesterday, next week, for the past...)? 3) VOICE — does the subject act or get acted on? In that order, two or three options usually vanish instantly.',
  ),
  // 2. question (agreement)
  q(
    '空所に入る語を選んでください。',
    'The list of approved vendors ___ updated at the beginning of every quarter.',
    ['are', 'were', 'is', 'being'],
    2,
    '主語は The list（単数）。直後の of approved vendors は修飾語で、ここに惑わされて are を選ばせるのが出題者の狙いです。\n\nevery quarter（毎四半期）という習慣のヒントから現在形。よって is が正解。「of の前が本当の主語」と覚えましょう。',
    'The subject is “The list” (singular) — “of approved vendors” is just a modifier planted to make you pick “are”. “Every quarter” signals a habitual present: “is”. The real subject comes BEFORE “of”.',
  ),
  // 3. concept: passive sign
  con(
    '受動態のサイン：目的語がない',
    'The passive signal: no object after the blank',
    '能動と受動で迷ったら、空所の後ろを見てください。\n\n・後ろに目的語（名詞）がある → 能動態\n・後ろに目的語がない（by 〜や前置詞、ピリオド）→ 受動態\n\nThe report ___ by Mr. Chen. → 後ろに目的語なし → was written\nMr. Chen ___ the report. → 目的語あり → wrote\n\n「レポートは書く側ではなく書かれる側」という意味からも判断できますが、目的語チェックのほうが速くて確実です。',
    'Torn between active and passive? Look right after the blank. An object (noun) follows → active. No object (just “by ~”, a preposition, or a full stop) → passive. “The report ___ by Mr. Chen.” → was written. “Mr. Chen ___ the report.” → wrote. The object check is faster and safer than translating.',
  ),
  // 4. question (passive)
  q(
    '空所に入る語を選んでください。',
    'All luggage must ___ at the security checkpoint before boarding.',
    ['inspect', 'be inspected', 'inspecting', 'have inspected'],
    1,
    '空所の後ろに目的語がなく、主語の luggage は「検査する側」ではなく「される側」。must のあとは動詞の原形なので、be inspected が正解です。\n\n助動詞＋ be ＋過去分詞の形は、Part 5で何度も出ます。',
    'No object after the blank, and luggage gets inspected rather than inspecting anything — passive. After “must” we need the base form: “be inspected”. Modal + be + past participle is a recurring shape.',
  ),
  // 5. question (tense)
  q(
    '空所に入る語を選んでください。',
    'By the time the new system launches next month, the staff ___ three training sessions.',
    ['will have completed', 'completed', 'are completing', 'complete'],
    0,
    'By the time＋未来の時点（next month）とくれば、「その時までに〜し終えている」という未来完了 will have completed の合図です。\n\nPart 5の時制問題は、文中の「時のヒント」と時制の組み合わせをパターンとして覚えるのが近道です。',
    '“By the time + a future point” signals the future perfect: “will have completed”. Part 5 tense questions are pattern-matching between time markers and tenses.',
  ),
  // 6. gap fill
  gap(
    '時のヒントに注目',
    'カッコ内の動詞を正しい形にして入力してください。\n\nThe company ( grow ) ___ steadily for the past five years.',
    ['has grown', 'has been growing'],
    'for the past five years（この5年間ずっと）は現在完了のサイン。has grown（または has been growing）が正解です。\n\nfor ／ since ／ over the past 〜 を見たら現在完了——この反射を作っておくと、時制問題が一気に楽になります。',
    '“For the past five years” is a present-perfect marker: “has grown” (or “has been growing”). Build the reflex: for / since / over the past → present perfect.',
  ),
  // 7. question (agreement)
  q(
    '空所に入る語を選んでください。',
    'Anyone who ___ to volunteer for the charity event should contact Ms. Liu by Friday.',
    ['wish', 'wishes', 'wishing', 'are wishing'],
    1,
    '主語は Anyone（単数扱い）。関係代名詞 who の動詞は先行詞に合わせるので、三単現の wishes が正解です。\n\nanyone ／ everyone ／ each は見た目より「単数」。ここを突いてくるのがTOEICです。',
    '“Anyone” is singular, and the verb after “who” agrees with its antecedent: “wishes”. Anyone / everyone / each are singular — a favourite TOEIC pressure point.',
  ),
  // 8. question (tense + voice)
  q(
    '空所に入る語を選んでください。',
    'The keynote speech ___ when the fire alarm went off.',
    ['delivers', 'is delivered', 'was being delivered', 'will deliver'],
    2,
    'when the fire alarm went off（警報が鳴ったとき）という過去の一瞬に対し、スピーチは「行われている最中」でした。さらに speech は「行われる側」なので受動。\n\n過去進行＋受動の was being delivered が正解です。態と時制、両方のチェックが活きる1問でした。',
    'Against the past moment “when the alarm went off”, the speech was in progress — and a speech is delivered, not delivering. Past progressive passive: “was being delivered”. Both checks, one question.',
  ),
  // 9. recap
  con(
    'まとめ：一致 → 時制 → 態',
    'Recap: agreement → tense → voice',
    '・動詞の形問題は ①主語との一致 ②時のヒント ③能動/受動 の順でチェック\n\n・of 〜 などの修飾語に惑わされない。「of の前が本当の主語」\n\n・空所の後ろに目的語がなければ受動態\n\n・for the past 〜 ＝現在完了、by the time＋未来＝未来完了\n\n次は前置詞と接続詞の使い分けです。',
    '• Run the fixed order: agreement → time markers → voice.\n\n• Don’t be fooled by “of ~” modifiers; the real subject comes first.\n\n• No object after the blank → passive.\n\n• for the past ~ → present perfect; by the time + future → future perfect.\n\nNext: prepositions vs. conjunctions.',
  ),
]
// ── L9 前置詞と接続詞 ────────────────────────────────────────────────────
const L9_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。空所に入る語を選んでください。',
    '___ the heavy rain, the outdoor concert went ahead as scheduled.',
    ['Despite', 'Although', 'However', 'While'],
    0,
    '空所の後ろは the heavy rain——名詞のかたまりです。名詞を従えられるのは前置詞の Despite だけ。Although や While は接続詞なので、後ろに「主語＋動詞」が必要です。\n\n意味はどちらも「〜にもかかわらず」。決め手は意味ではなく、後ろの形なんです。',
    'After the blank comes a noun phrase — “the heavy rain”. Only the preposition “Despite” can take a bare noun; Although and While are conjunctions and need a subject + verb. Same meaning, different grammar — the FORM decides.',
  ),
  // 2. concept: look behind
  con(
    '後ろを見れば一発：前置詞 vs 接続詞',
    'One glance behind the blank: preposition vs. conjunction',
    '前置詞と接続詞には、意味がほぼ同じペアがたくさんあります。\n\n・despite ／ in spite of（前）⇔ although ／ though（接）「〜にもかかわらず」\n・because of ／ due to（前）⇔ because ／ since（接）「〜のため」\n・during（前）⇔ while（接）「〜の間」\n\n見分け方はただ1つ。空所の後ろが名詞だけなら前置詞、主語＋動詞（SV）が続くなら接続詞。\n\n意味で迷う必要はありません。形で解く——Part 5で最も「機械的に」得点できる問題です。',
    'Many preposition/conjunction pairs share a meaning: despite ⇔ although, because of ⇔ because, during ⇔ while. The single test: a bare noun after the blank → preposition; a subject + verb → conjunction. No meaning needed — the most mechanical points in Part 5.',
    'During the meeting（名詞）⇔ While we were meeting（SV）\nBecause of the delay（名詞）⇔ Because the flight was delayed（SV）',
  ),
  // 3. question
  q(
    '空所に入る語を選んでください。',
    '___ Mr. Okafor was attending the conference, his assistant handled all incoming calls.',
    ['During', 'Despite', 'While', 'Because of'],
    2,
    '空所の後ろは Mr. Okafor was attending——主語＋動詞が続いています。だから接続詞の While が正解。\n\n「〜の間」という意味では During も浮かびますが、During は前置詞なので During the conference のように名詞しか従えられません。',
    'A subject + verb follows (“Mr. Okafor was attending”), so we need the conjunction “While”. “During” has the same meaning but is a preposition — it could only take “the conference”.',
  ),
  // 4. question
  q(
    '空所に入る語を選んでください。',
    'The flight was delayed for two hours ___ a mechanical inspection.',
    ['due to', 'because', 'although', 'even if'],
    0,
    '空所の後ろは a mechanical inspection という名詞のかたまり。前置詞の due to が正解です。\n\nbecause はSVが必要なので、because the aircraft needed an inspection なら正解になれます。because of ／ due to ／ owing to はワンセットで前置詞扱いです。',
    'A noun phrase follows, so the preposition “due to” wins. “Because” would need a clause (“because the aircraft needed an inspection”). Group because of / due to / owing to together as prepositions.',
  ),
  // 5. concept: by/until and friends
  con(
    '頻出ペアを表で固める',
    'Lock in the high-frequency pairs',
    '前置詞・接続詞問題でもう1つ問われるのが、時間系の使い分けです。\n\n・by「〜までに（締切）」⇔ until「〜までずっと（継続）」\nSubmit the form by Friday. ／ The shop is open until 9.\n\n・for＋期間の長さ（for two weeks）⇔ during＋出来事の名前（during the meeting）\n\n・in＋月・年（in March）／ on＋日付・曜日（on Monday）／ at＋時刻（at noon）\n\n「締切の by、継続の until」は毎回のように出題されます。日本語の「〜まで」が両方を兼ねるせいで、日本人が最も間違えやすいポイントです。',
    'The other battleground is time words. by = deadline (“submit by Friday”) vs. until = continuation (“open until 9”). for + a length (“for two weeks”) vs. during + an event (“during the meeting”). in + month/year, on + day/date, at + clock time. Japanese 「〜まで」 covers both by and until — which is exactly why TOEIC tests it constantly.',
  ),
  // 6. question
  q(
    '空所に入る語を選んでください。',
    'All expense reports must be submitted ___ the last day of the month.',
    ['until', 'since', 'at', 'by'],
    3,
    '提出は「締切までに1回やる」動作なので by が正解。until は「その時までずっと続く」状態に使います（The office stays open until 6）。\n\nsubmit ／ finish ／ arrive のような一回きりの動作＋締切 → by、と覚えましょう。',
    'Submitting happens ONCE before a deadline → “by”. “Until” describes a state continuing up to a time. One-shot verbs (submit, finish, arrive) + deadline → by.',
  ),
  // 7. gap fill
  gap(
    'ヒント：空所の後ろは their stay という名詞です。',
    '空所に入る1語を入力してください。\n\nVisitors must wear a badge ___ their stay in the building.（滞在の間ずっと）',
    ['during', 'throughout'],
    '後ろが their stay という名詞なので、前置詞の during（または throughout）が正解。while を使うなら while they are staying とSVが必要です。\n\n「名詞なら during、SVなら while」——この型はそのまま本番で使えます。',
    '“Their stay” is a noun phrase, so the preposition “during” (or “throughout”) fits. “While” would need a clause. Noun → during; clause → while.',
  ),
  // 8. question
  q(
    '空所に入る語を選んでください。',
    '___ the budget is approved by Friday, the marketing campaign will start next week.',
    ['Due to', 'Unless', 'As long as', 'During'],
    2,
    '空所の後ろは the budget is approved とSVなので、接続詞が必要。まず前置詞の(A)(D)を消去します。\n\n残りは意味勝負：「予算が承認されれば開始する」という条件なので As long as（〜する限り）が正解。Unless（〜しない限り）だと意味が逆になります。形で絞って意味で決める、の2段構えです。',
    'A clause follows, so cut the prepositions (A) and (D) first. Then meaning: the campaign starts IF the budget is approved → “As long as”. “Unless” would flip the logic. Narrow by form, decide by meaning.',
  ),
  // 9. recap
  con(
    'まとめ：形で解く',
    'Recap: solve by form',
    '・後ろが名詞だけ → 前置詞、SVが続く → 接続詞\n\n・despite ⇔ although、because of ⇔ because、during ⇔ while のペアで暗記\n\n・締切の by、継続の until\n\n・前置詞／接続詞で絞ってから、最後に意味で確認\n\n次のレベルはいよいよ最終関門、Part 7の読解戦略です。',
    '• Bare noun → preposition; subject + verb → conjunction.\n\n• Memorise the pairs: despite ⇔ although, because of ⇔ because, during ⇔ while.\n\n• by = deadline, until = continuation.\n\n• Narrow by form first, confirm by meaning last.\n\nFinal level: Part 7 reading strategies.',
  ),
]
// ════════════════════════════════════════════════════════════════════════════
// LEVEL 4 — Part 7 読解の戦略
// ════════════════════════════════════════════════════════════════════════════

// ── L10 スキャニング ─────────────────────────────────────────────────────
const L10_SCREENS = [
  // 1. concept hook
  con(
    '全部読むな',
    'Don’t read everything',
    'Part 7は54問。最後まで終わらない受験者が続出する、時間との戦いです。\n\n敗因ははっきりしています。文書を頭から全部読むこと。\n\nPart 7の設問の多くは、本文のどこか1カ所に答えが書いてある「事実検索型」。必要なのは読解ではなく検索です。\n\n①設問を先に読む → ②キーワードを決める → ③本文をスキャン（目を走らせて探す）→ ④見つけた周辺だけ精読。\n\nこの4ステップをスキャニングと呼びます。今日はこれを体で覚えます。',
    'Part 7 has 54 questions, and running out of time is the default outcome — usually because people read each document top to bottom. Most questions are fact-finding: the answer sits in ONE spot. So search, don’t read: 1) read the question first, 2) pick a keyword, 3) scan the text for it, 4) read closely only around the hit. That four-step routine is scanning.',
  ),
  // 2. concept: keywords
  con(
    'キーワードは「数字・固有名詞・日付」',
    'Scan for numbers, names, and dates',
    'スキャンの目印に向いているのは、形が変わらない語です。\n\n・数字・金額・時刻（40%、$25、9:30）\n・固有名詞（人名・社名・地名）\n・日付・曜日（March 15、Monday）\n\nWhen does registration open? という設問なら、本文から時刻っぽい表記だけを探して目を走らせます。文章を「読む」のではなく、目的の形を「探す」。\n\n注意点はひとつ。Part 7の選択肢は本文の言い換えになっていることが多い。見つけた箇所と選択肢を突き合わせるときだけ、丁寧に読みましょう。',
    'The best scan targets are words that never change shape: numbers, prices, times ($25, 9:30), proper names, dates and weekdays. For “When does registration open?”, sweep the text for time-shaped strings. One warning: Part 7 options paraphrase the text, so slow down only at the moment you compare the hit against the options.',
  ),
  // 3. question (notice)
  q(
    '設問のキーワードを決めてから、本文をスキャンしましょう。',
    '【お知らせ】\nGREENFIELD COMMUNITY CENTER\nSpring Photography Workshop\nSaturday, April 12, 10:00 A.M.–3:00 P.M.\nFee: $30 (members $20) — includes lunch\nRegistration opens March 1 on our website.\nSpace is limited to 16 participants.\n\nQ: How much do members pay for the workshop?',
    ['$16', '$20', '$30', '$50'],
    1,
    'キーワードは members と金額。Fee の行をスキャンすれば (members $20) が見つかります。\n\n$30 は一般料金、16 は定員——どちらも「数字だけ拾った人」を引っかける選択肢です。見つけた行は最後まで読む、が鉄則です。',
    'Keywords: “members” + a price. The Fee line gives “(members $20)”. $30 is the general fee and 16 is the capacity — both bait for number-grabbers. Read the WHOLE line you land on.',
  ),
  // 4. question (email)
  q(
    '設問のキーワードを決めてから、本文をスキャンしましょう。',
    '【メール】\nFrom: Dana Whitfield, Office Manager\nTo: All Staff\nSubject: Parking lot repaving\n\nThe parking lot will be repaved on Thursday and Friday next week. During this time, please use the garage on Cedar Street; bring your employee ID to enter. The lot will reopen on Monday morning. Questions? Call extension 230.\n\nQ: What should employees bring to the Cedar Street garage?',
    ['A parking permit', 'A repaving schedule', 'Their employee ID', 'A copy of the email'],
    2,
    'キーワードは Cedar Street。その一文をスキャンすると bring your employee ID to enter とあります。\n\n答えは1文に凝縮されていて、メール全体を読む必要はありません。設問 → キーワード → 該当行だけ精読、の流れを確認してください。',
    'Keyword: “Cedar Street”. That sentence says “bring your employee ID to enter” — the whole answer in one line. Question → keyword → one close-read line.',
  ),
  // 5. gap fill (same notice)
  gap(
    '本文の数字は「何の数字か」をラベルごと確認しましょう。',
    '【お知らせ】（さっきと同じ文書です）\nGREENFIELD COMMUNITY CENTER\nSpring Photography Workshop\nSaturday, April 12, 10:00 A.M.–3:00 P.M.\nFee: $30 (members $20) — includes lunch\nRegistration opens March 1 on our website.\nSpace is limited to 16 participants.\n\nQ: 参加できる人数は最大何人？（半角数字で）',
    ['16', '16 people', 'sixteen'],
    'キーワードは「人数」。limited to 16 participants（16名限定）の行が根拠です。\n\nこの文書の数字は日付・時刻・料金・定員と4種類もあります。「何の数字か」をラベルごと確認する癖をつけましょう。',
    '“Limited to 16 participants” is the evidence. This little notice contains dates, times, prices AND a capacity — always check what each number labels.',
  ),
  // 6. concept: question order
  con(
    '設問はスキャンしやすい順に解く',
    'Answer the scannable questions first',
    '実は、設問にも解きやすい順番があります。\n\n・固有名詞や数字を含む設問（How much ／ When ／ Who）→ スキャンが速い。先に解く\n\n・What is the purpose...? ／ What is suggested...? → 全体理解が必要。後回し\n\n1つの文書に複数の設問が付いている場合、検索型を解くうちに文書の全体像がつかめて、結果的に purpose 型も速く解けます。\n\n「易 → 難の順に解くと、難が勝手に易しくなる」——Part 7の小さな裏ワザです。',
    'Questions have a best order too. Fact questions with names or numbers (How much / When / Who) scan fast — do them first. Purpose and “What is suggested” questions need the whole picture — save them for last. While you answer the scannable ones, you absorb the document’s outline, and the hard question quietly becomes easy.',
  ),
  // 7. question (ad)
  q(
    '設問のキーワードを決めてから、本文をスキャンしましょう。',
    '【広告】\nMOVE-IT RENTALS — Spring Special\nRent any moving van for a full day for $59 (regular price $79).\nOffer valid weekdays only, April 1–30.\nReservations: www.move-it.com or 555-0188.\nVans must be returned with a full tank.\n\nQ: When is the special price available?',
    ['On weekdays in April', 'On weekends in April', 'Every day in April', 'During the first week of April'],
    0,
    'キーワードは valid。Offer valid weekdays only, April 1–30 の行から「4月の平日のみ」とわかります。\n\n(C)は April だけ拾った人へのワナ、(B)は逆の内容。only のような限定語は正解の根拠になりやすいので、見つけたら必ず線を引く気持ちで読みましょう。',
    'Keyword: “valid”. The line “valid weekdays only, April 1–30” settles it. (C) baits anyone who only caught “April”. Limiting words like “only” are answer gold — underline them mentally.',
  ),
  // 8. question (same ad)
  q(
    '設問のキーワードを決めてから、本文をスキャンしましょう。',
    '【広告】（同じ広告です）\nMOVE-IT RENTALS — Spring Special\nRent any moving van for a full day for $59 (regular price $79).\nOffer valid weekdays only, April 1–30.\nReservations: www.move-it.com or 555-0188.\nVans must be returned with a full tank.\n\nQ: What must customers do when returning a van?',
    ['Pay an extra $20', 'Call 555-0188', 'Wash the vehicle', 'Fill the fuel tank'],
    3,
    'キーワードは return。最終行 returned with a full tank が根拠で、正解では fill the fuel tank と言い換えられています。\n\nPart 7でも言い換えは健在。「本文の表現そのまま」の(B)の電話番号は予約用で、ワナです。',
    'Keyword: “return”. “Returned with a full tank” is paraphrased as “fill the fuel tank”. The verbatim-looking phone number (B) belongs to reservations — a trap.',
  ),
  // 9. recap
  con(
    'まとめ：読むな、探せ',
    'Recap: search, don’t read',
    '・設問を先に読み、数字・固有名詞・日付をキーワードに決める\n\n・本文はスキャン。見つけた行の周辺だけ精読\n\n・選択肢は本文の言い換え。突き合わせは丁寧に\n\n・検索型の設問から解き、purpose 型は後回し\n\n次は、Part 7で最も時間を食う「NOT問題」と「推測問題」の攻略です。',
    '• Read the question first; pick numbers, names, dates as keywords.\n\n• Scan; close-read only around the hit.\n\n• Options paraphrase the text — compare carefully.\n\n• Fact questions first, purpose questions last.\n\nNext: the two time-eaters — NOT questions and inference questions.',
  ),
]
// ── L11 NOT問題と推測問題 ────────────────────────────────────────────────
const L11_SCREENS = [
  // 1. concept hook
  con(
    '「書いていないもの」を探す問題',
    'The question that asks what ISN’T there',
    'Part 7にはこんな設問があります。\n\nWhat is NOT mentioned about the hotel?（ホテルについて述べられていないものは？）\n\n普通の問題は「書いてあるもの」を1つ探せば終わり。でもNOT問題は、選択肢4つのうち3つが本文に書いてあり、書いていない1つが正解。つまり最大4回の照合が必要な、Part 7で最も時間を食うタイプです。\n\nだからこそ、手順を固定して機械的に処理します。次の画面でその手順を見てみましょう。',
    '“What is NOT mentioned about the hotel?” — in a NOT question, three of the four options ARE in the text and the missing one is the answer. That means up to four matching passes, making it Part 7’s biggest time sink. The cure is a fixed, mechanical procedure — see the next screen.',
  ),
  // 2. concept: elimination procedure
  con(
    'NOT問題は「消し込み作業」',
    'NOT questions are a crossing-off job',
    '手順はシンプルです。\n\n①選択肢A〜Dを先にざっと読む（4つの内容を頭に置く）\n\n②本文を読みながら、出てきた選択肢を消していく\n\n③最後まで消えなかった1つが正解\n\nコツは、選択肢が本文の言い換えになっていること。本文 complimentary breakfast → 選択肢 free morning meal のような変換を見抜きながら消します。\n\nまた、NOT問題は文書全体に根拠が散らばるので、スキャンではなく通し読みに近くなります。3問セットの最後に回すのが効率的です。',
    'The procedure: 1) skim options A–D first, 2) read the text and cross off each option as it appears, 3) the survivor is the answer. Remember the options are PARAPHRASES (complimentary breakfast → free morning meal). And since the evidence is scattered, a NOT question is closer to a read-through than a scan — do it last in its set.',
  ),
  // 3. NOT question
  q(
    '選択肢を先に読んでから、本文と照合しましょう。',
    '【ホテル案内】\nThe Brightwater Inn offers 48 guest rooms, each with a private balcony. Guests enjoy a complimentary breakfast served from 6:30 to 9:30, free Wi-Fi throughout the building, and an outdoor pool open from May to September. The inn is a five-minute walk from Lakeside Station.\n\nQ: What is NOT mentioned as a feature of the Brightwater Inn?',
    ['Free internet access', 'A fitness room', 'An outdoor pool', 'Free breakfast'],
    1,
    '(A)は free Wi-Fi、(C)は outdoor pool、(D)は complimentary breakfast として本文にあります。残った(B)のフィットネスルームだけ言及なし。\n\ncomplimentary ＝ free の言い換えに気づけたかがポイントです。消し込み → 残った1つ、の手順どおりに解けましたか？',
    '(A) = free Wi-Fi, (C) = outdoor pool, (D) = complimentary breakfast. Only the fitness room never appears. The hinge was spotting complimentary = free.',
  ),
  // 4. NOT question
  q(
    '選択肢を先に読んでから、本文と照合しましょう。',
    '【求人広告】\nSales Associate — Hartley Furniture\nWe are seeking a full-time sales associate for our downtown showroom. Duties include assisting customers, processing payments, and arranging product displays. Applicants should have at least one year of retail experience and be available on weekends. To apply, send a résumé to jobs@hartleyfurniture.com by June 20.\n\nQ: What is NOT a stated requirement for the position?',
    ['Retail experience', 'Weekend availability', 'A driver’s license', 'Submitting a résumé'],
    2,
    '(A)は one year of retail experience、(B)は available on weekends、(D)は send a résumé として本文に登場します。運転免許だけはどこにもありません。\n\n「ありそうな内容」ほどワナになるのがNOT問題。常識ではなく、本文だけを根拠にしましょう。',
    '(A), (B) and (D) all appear in the ad; a driver’s license never does. Plausible-sounding options are exactly the trap — go by the text, never by common sense.',
  ),
  // 5. concept: inference
  con(
    '推測問題：書いていない、でも導ける',
    'Inference: not written, but derivable',
    '次は推測問題。設問に imply ／ suggest ／ most likely が入っていたらこのタイプです。\n\nWhat is implied about Mr. Soto?（ソトさんについて何が示唆されている？）\n\n答えは本文にそのまま書いてありません。でも、書いてある事実を組み合わせれば必ず導けるようにできています。\n\n例：本文「会員は送料無料。Sotoさんの注文書には送料$0と記載」→ 導ける結論「Sotoさんは会員である」。\n\n大切なのは、飛躍しないこと。「たぶんそうだろう」という常識的な想像ではなく、本文の事実から一歩だけ進んだ結論を選びます。',
    'Inference questions carry imply / suggest / most likely. The answer is never stated outright, but it is always derivable from stated facts: “members get free shipping” + “Mr. Soto’s invoice shows $0 shipping” → Mr. Soto is a member. The discipline is taking exactly ONE step from the facts — never a leap of plausible imagination.',
  ),
  // 6. inference question
  q(
    '本文の事実から「一歩だけ」進んだ結論を選びましょう。',
    '【メモ】\nTo: All Westgate Mall tenants\nStarting next month, the mall will open at 9 A.M. instead of 10 A.M. on weekdays. Tenants who wish to keep their current opening hours may do so, but please inform the management office by Friday so we can update the mall directory.\n\nQ: What is suggested about the stores in Westgate Mall?',
    ['They must all open at 9 A.M.', 'They currently open at 10 A.M. on weekdays.', 'They will close earlier next month.', 'They share one management office.'],
    1,
    '「来月から10時ではなく9時開店に変わる」という一文から、今は10時開店だと導けます。\n\n(A)は may do so（現行どおりでもよい）と矛盾。推測問題の正解は、このように本文の事実を裏返しただけのことが多いんです。',
    '“9 A.M. instead of 10 A.M.” implies the current opening time is 10. (A) contradicts “may do so”. Correct inferences are often just the stated fact, flipped.',
  ),
  // 7. inference question
  q(
    '本文の事実から「一歩だけ」進んだ結論を選びましょう。',
    '【レビュー】\n★★★★☆ Bella Trattoria\nI’ve eaten here every Friday for the past year, and the pasta never disappoints. Last week the kitchen was short-staffed and my main course took 40 minutes, so I’m taking off one star. Still, I’ve already booked a table for my parents’ anniversary next month.\n\nQ: What is implied about the reviewer?',
    ['He is a first-time customer.', 'He works at the restaurant.', 'He ordered a pasta dish last week.', 'He plans to return to the restaurant.'],
    3,
    'booked a table for ... next month（来月の予約を入れた）から、「また行くつもり」が導けます。\n\n(A)は every Friday for the past year と矛盾。(C)は「いつもパスタ」とはあっても、先週何を頼んだかは書かれていません——本文にない決めつけは、推測問題では不正解です。',
    '“I’ve already booked a table for next month” → he plans to return. (A) contradicts the weekly visits; (C) assumes last week’s order, which the text never states. Unstated assumptions lose.',
  ),
  // 8. NOT question (list scan)
  q(
    '列挙（A, B, or C）を見つけると照合が速くなります。',
    '【案内】\nRiverside Library — Meeting Rooms\nRooms may be booked free of charge by library cardholders. Bookings can be made online, by phone, or at the front desk. Rooms are available from 9 A.M. to 8 P.M. and must be left clean. Food is not permitted; covered drinks are allowed.\n\nQ: What is NOT mentioned as a way to book a room?',
    ['By email', 'Online', 'By phone', 'At the front desk'],
    0,
    '予約方法は online ／ by phone ／ at the front desk の3つが列挙されています。email はありません。\n\nA, B, or C のような列挙を見つけたら、選択肢との照合は一瞬で終わります。NOT問題は「列挙箇所を探す」と速い——覚えておいて損はないコツです。',
    'The booking methods are listed in one breath: online, by phone, or at the front desk — no email. When a NOT question maps onto a list, the cross-off takes seconds.',
  ),
  // 9. recap
  con(
    'まとめ：消し込みと一歩の推測',
    'Recap: cross off, then take one step',
    '・NOT問題は選択肢を先に読み、本文と照合して消し込む。残った1つが正解\n\n・言い換え（complimentary ＝ free）を見抜きながら消す\n\n・推測問題は本文の事実から「一歩だけ」進んだ結論を選ぶ\n\n・常識や想像で補わない。根拠は常に本文\n\n最終レッスンは、2つの文書を組み合わせて解くダブルパッセージです。',
    '• NOT questions: skim the options, cross off matches, keep the survivor.\n\n• Cross off through paraphrases (complimentary = free).\n\n• Inference: exactly one step from stated facts.\n\n• Never fill gaps with common sense — the text is the only evidence.\n\nFinal lesson: double passages.',
  ),
]
// ── L12 ダブルパッセージ ─────────────────────────────────────────────────
const L12_SCREENS = [
  // 1. concept hook
  con(
    '答えは2つの文書をまたいで',
    'The answer spans two documents',
    'Part 7の後半には、2つ（または3つ）の文書を読んで答えるセットが登場します。メール＋予定表、広告＋申込書といった組み合わせです。\n\n最大の特徴は、5問中1〜2問が「両方の文書を見ないと解けない」クロス問題だということ。\n\nたとえば、予定表に「火曜の講師：Hill先生」、メールに「火曜に参加します」とあれば、「この人の講師はHill先生」という答えは、2つの文書を組み合わせて初めて出てきます。\n\n片方の文書だけで選ぶと、もっともらしい不正解にきれいにはまる——そういう作りになっています。',
    'Late in Part 7 come sets with two (or three) documents — an email plus a schedule, an ad plus an order form. The signature feature: one or two questions per set are CROSS questions that cannot be solved from either document alone. If the schedule says “Tuesday instructor: Hill” and the email says “I’ll attend Tuesday”, only the combination yields “her instructor is Hill”. Pick from one document only and you fall neatly into a plausible wrong answer.',
  ),
  // 2. concept: document roles
  con(
    '文書の役割分担をつかむ',
    'Map each document’s role first',
    '攻略の第一歩は、各文書の役割を10秒でつかむこと。\n\n・文書1が広告なら「条件・料金・日程」の倉庫\n・文書2がメールなら「個別の事情・変更・依頼」が書いてある\n\nクロス問題は決まって、文書2の具体的な人や日付を、文書1の表や条件に当てはめる形になります。\n\n解く手順：①設問の固有名詞・日付をマーク → ②まずそれが載っている文書を見る → ③出てきた条件をもう一方の文書で確認。往復は1回で済ませるのが理想です。',
    'Spend ten seconds mapping roles: an ad or schedule (document 1) is the warehouse of conditions, prices and dates; an email or form (document 2) carries one person’s situation, changes and requests. Cross questions always plug document 2’s specifics into document 1’s table. Routine: mark the name/date in the question → start in the document that has it → verify the condition in the other. Aim for a single round trip.',
  ),
  // 3. cross question
  q(
    '2つの文書を組み合わせて答えましょう。',
    '【文書1: 予定表】\nMAPLEWOOD COMMUNITY CLASSES — May\nMon: Beginner Yoga (Instructor: R. Iwata)\nTue: Watercolor Painting (Instructor: P. Novak)\nThu: Digital Photography (Instructor: S. Hill)\nFri: Italian Cooking (Instructor: M. Greco)\n\n【文書2: メール】\nFrom: Aiko Mori\nTo: Maplewood Community Center\nHello, I’d like to register for a May class. I work until 6 P.M. on Mondays and Fridays, so those days are impossible. Between the other two options, I’ll choose the art class.\n\nQ: Who will most likely be Ms. Mori’s instructor?',
    ['P. Novak', 'R. Iwata', 'S. Hill', 'M. Greco'],
    0,
    'メール（文書2）から「月・金は不可」「残りのうちアートの講座を選ぶ」とわかります。火曜の水彩画と木曜の写真のうち、アートと呼べるのは水彩画。予定表（文書1）で火曜の講師を見ると P. Novak です。\n\nメール → 予定表の1往復で解く、典型的なクロス問題でした。',
    'The email rules out Monday and Friday and picks “the art class” of the remaining two — watercolor painting, not photography. The schedule puts P. Novak on Tuesday. One round trip: email → schedule.',
  ),
  // 4. single-document question (same pair)
  q(
    '今度は片方の文書だけで解ける問題です。',
    '（さっきと同じ2つの文書です）\n【文書1: 予定表】\nMAPLEWOOD COMMUNITY CLASSES — May\nMon: Beginner Yoga (Instructor: R. Iwata)\nTue: Watercolor Painting (Instructor: P. Novak)\nThu: Digital Photography (Instructor: S. Hill)\nFri: Italian Cooking (Instructor: M. Greco)\n\n【文書2: メール】\nFrom: Aiko Mori\nTo: Maplewood Community Center\nHello, I’d like to register for a May class. I work until 6 P.M. on Mondays and Fridays, so those days are impossible. Between the other two options, I’ll choose the art class.\n\nQ: Why can’t Ms. Mori attend the Friday class?',
    ['She has another lesson.', 'She dislikes cooking.', 'She works until the evening.', 'She will be out of town.'],
    2,
    'これは文書2だけで解ける問題。I work until 6 P.M. on Mondays and Fridays が根拠で、works until the evening と言い換えられています。\n\nダブルパッセージでも全問がクロスではありません。「この設問はどちらの文書か」を見極めるだけで、読む量がぐっと減ります。',
    'Document 2 alone answers this: “I work until 6 P.M. on Mondays and Fridays”, paraphrased as “works until the evening”. Not every question is a cross question — knowing which document a question lives in cuts your reading dramatically.',
  ),
  // 5. concept: cross-question signs
  con(
    'クロス問題のサイン',
    'How to spot the cross question',
    'どの設問がクロス問題かは、ある程度予測できます。\n\nクロスになりやすい設問：\n・特定の人が「いくら払うか」（料金表 × その人の条件）\n・「いつ・どこで会うか」（予定表 × 変更メール）\n・most likely を含む設問\n\n特に注意したいのが変更・例外の情報。文書2のメールに「火曜は休講になりました」とあれば、文書1の予定表をそのまま信じた選択肢はワナです。\n\n新しい情報が古い情報に勝つ——ダブルパッセージの鉄則です。',
    'Cross questions are predictable: how much a SPECIFIC person pays (price table × their conditions), when or where people will actually meet (schedule × a change email), and anything with “most likely”. Above all, watch for changes and exceptions — if the email says Tuesday’s class is cancelled, every option that trusts the original schedule is a trap. New information beats old information, always.',
  ),
  // 6. cross question (price calc)
  q(
    '「基本料金 → 加算 → 割引」の順に当てはめましょう。',
    '【文書1: 広告】\nCLEARVIEW WINDOW CLEANING\nStandard house (up to 10 windows): $80\nLarge house (11–20 windows): $120\nFirst-time customers receive $15 off any service.\nWeekend appointments: additional $10.\n\n【文書2: 予約フォーム】\nName: Greg Olsen\nAddress: 44 Birch Lane\nWindows: 14\nPreferred day: Saturday\nNotes: This is my first time using your service.\n\nQ: How much will Mr. Olsen most likely pay?',
    ['$105', '$115', '$120', '$130'],
    1,
    '窓14枚 → Large house $120（文書1）。土曜希望 → ＋$10。初回利用 → −$15。120＋10−15＝$115 です。\n\n料金のクロス問題は「基本料金 → 加算 → 割引」の順に文書2の条件を当てはめれば確実。(C)の$120は、割引と週末料金を見落とした人へのワナです。',
    '14 windows → Large house $120; Saturday → +$10; first-time → −$15. Total $115. Apply the form’s conditions in the order base → surcharges → discounts. $120 traps anyone who stopped at the table.',
  ),
  // 7. single-document question (same pair)
  q(
    '根拠の一文を見つけて、言い換えを確認しましょう。',
    '（同じ2つの文書です）\n【文書1: 広告】\nCLEARVIEW WINDOW CLEANING\nStandard house (up to 10 windows): $80\nLarge house (11–20 windows): $120\nFirst-time customers receive $15 off any service.\nWeekend appointments: additional $10.\n\n【文書2: 予約フォーム】\nName: Greg Olsen\nAddress: 44 Birch Lane\nWindows: 14\nPreferred day: Saturday\nNotes: This is my first time using your service.\n\nQ: What is indicated about Mr. Olsen?',
    ['He has used Clearview before.', 'He lives in a small apartment.', 'He prefers a weekday appointment.', 'He has never used Clearview before.'],
    3,
    '文書2の Notes に This is my first time using your service とあります。正解(D)はそれを has never used ... before と言い換えたもの。(A)はその正反対です。\n\nindicated 型の設問は、根拠の一文を見つけて言い換えを確認するだけ——落ち着いて取りましょう。',
    'The form’s note — “This is my first time using your service” — is reworded as “has never used Clearview before”. (A) says the exact opposite. Find the sentence, verify the paraphrase, collect the point.',
  ),
  // 8. gap fill (cross)
  gap(
    '2つの文書を結びつけて、空所を英語1語で埋めてください。',
    '（同じ2つの文書です）\nMr. Olsen will pay an extra $10 because he requested a ___ appointment.\n\nヒント：文書2の Preferred day と、文書1の追加料金の行を見比べましょう。',
    ['weekend', 'saturday', 'a weekend'],
    '文書2の Preferred day: Saturday と、文書1の Weekend appointments: additional $10 を結びつける問題です。土曜＝週末なので追加料金が発生します。\n\n「土曜 → 週末」のような一段ざっくりした言い換えも、クロス問題の定番です。',
    'Connect “Preferred day: Saturday” (form) with “Weekend appointments: additional $10” (ad). Saturday = a weekend day, so the surcharge applies. Specific → general (Saturday → weekend) is a classic cross-passage paraphrase.',
  ),
  // 9. recap
  con(
    'まとめ：1往復で仕留める',
    'Recap: solve it in one round trip',
    '・ダブルパッセージは5問中1〜2問がクロス問題\n\n・手順：設問の固有名詞・数字 → まず片方の文書 → 条件をもう一方で確認\n\n・料金問題は「基本 → 加算 → 割引」の順に当てはめる\n\n・変更・例外の情報（メール側）が、表や広告の情報に勝つ\n\nこれで全12レッスン完了です。学んだパターンを武器に、模試で腕試ししましょう。',
    '• One or two questions per set are cross questions.\n\n• Routine: mark the specifics → start in the document that has them → verify in the other.\n\n• Price questions: base → surcharges → discounts.\n\n• Changes and exceptions beat the original table.\n\nAll twelve lessons complete — take the patterns into a mock test and put them to work.',
  ),
]
// ────────────────────────────────────────────────────────────────────────────
// Course tree
// ────────────────────────────────────────────────────────────────────────────
const LEVELS = [
  {
    title: 'Part 2: Mastering Question–Response',
    title_ja: 'Part 2 応答問題の攻略',
    lessons: [
      { slug: 'toeic-p2-wh-questions', title: 'WH Questions: The First Word Is Everything', title_ja: 'WH疑問文：最初の一語に集中', free: true, minutes: 10, screens: L1_SCREENS },
      { slug: 'toeic-p2-yesno-tag-questions', title: 'Yes/No and Tag Questions', title_ja: 'Yes/No疑問文と付加疑問文', free: false, minutes: 10, screens: L2_SCREENS },
      { slug: 'toeic-p2-sound-traps', title: 'Sound-Alike Traps', title_ja: '似た音のひっかけ', free: false, minutes: 10, screens: L3_SCREENS },
    ],
  },
  {
    title: 'Parts 3 & 4: The Art of Previewing',
    title_ja: 'Part 3・4 先読みの技術',
    lessons: [
      { slug: 'toeic-p34-question-preview', title: 'Previewing the Questions', title_ja: '設問の先読み', free: false, minutes: 10, screens: L4_SCREENS },
      { slug: 'toeic-p34-paraphrase', title: 'Spotting Paraphrases', title_ja: '言い換えを見抜く', free: false, minutes: 10, screens: L5_SCREENS },
      { slug: 'toeic-p34-speaker-intent', title: 'Speaker Intent Questions', title_ja: '話者の意図問題', free: false, minutes: 10, screens: L6_SCREENS },
    ],
  },
  {
    title: 'Part 5: High-Frequency Grammar',
    title_ja: 'Part 5 文法の頻出パターン',
    lessons: [
      { slug: 'toeic-p5-word-forms', title: 'Word-Form Questions', title_ja: '品詞問題', free: false, minutes: 10, screens: L7_SCREENS },
      { slug: 'toeic-p5-verb-forms', title: 'Verb Forms: Tense, Voice, Agreement', title_ja: '動詞の形', free: false, minutes: 10, screens: L8_SCREENS },
      { slug: 'toeic-p5-prepositions-conjunctions', title: 'Prepositions vs. Conjunctions', title_ja: '前置詞と接続詞', free: false, minutes: 10, screens: L9_SCREENS },
    ],
  },
  {
    title: 'Part 7: Reading Strategies',
    title_ja: 'Part 7 読解の戦略',
    lessons: [
      { slug: 'toeic-p7-scanning', title: 'Scanning: Find the Fact', title_ja: 'スキャニング', free: false, minutes: 10, screens: L10_SCREENS },
      { slug: 'toeic-p7-not-inference', title: 'NOT and Inference Questions', title_ja: 'NOT問題と推測問題', free: false, minutes: 10, screens: L11_SCREENS },
      { slug: 'toeic-p7-double-passage', title: 'Double Passages', title_ja: 'ダブルパッセージ', free: false, minutes: 10, screens: L12_SCREENS },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Local sanity checks (before touching the DB)
// ────────────────────────────────────────────────────────────────────────────
function validateLocal() {
  const problems = []
  const slugs = new Set()
  for (const level of LEVELS) {
    for (const lesson of level.lessons) {
      if (slugs.has(lesson.slug)) problems.push(`duplicate slug: ${lesson.slug}`)
      slugs.add(lesson.slug)
      if (lesson.screens.length < 8 || lesson.screens.length > 10) {
        problems.push(`${lesson.slug}: ${lesson.screens.length} screens (want 8–10)`)
      }
      const first = lesson.screens[0]
      const last = lesson.screens[lesson.screens.length - 1]
      if (last.type !== 'concept') problems.push(`${lesson.slug}: last screen is not a concept recap`)
      if (!first) problems.push(`${lesson.slug}: empty lesson`)
      lesson.screens.forEach((s, i) => {
        const c = s.content
        if (s.type === 'concept') {
          if (!c.title_ja || !c.title || !c.body_ja || !c.body) problems.push(`${lesson.slug}#${i}: concept missing fields`)
        } else if (c.question_type === 'single_choice') {
          const correct = (c.options ?? []).filter(o => o.is_correct)
          if (correct.length !== 1) problems.push(`${lesson.slug}#${i}: ${correct.length} correct options`)
          if (!c.explanation_ja || !c.explanation) problems.push(`${lesson.slug}#${i}: missing explanation`)
        } else if (c.question_type === 'gap_fill') {
          if (!Array.isArray(c.accepted) || c.accepted.length === 0) problems.push(`${lesson.slug}#${i}: gap_fill without accepted answers`)
          if (!c.explanation_ja || !c.explanation) problems.push(`${lesson.slug}#${i}: missing explanation`)
        } else {
          problems.push(`${lesson.slug}#${i}: unknown question_type`)
        }
      })
      // no runs of 3+ identical correct positions within a lesson
      const positions = lesson.screens
        .filter(s => s.type === 'question' && s.content.question_type === 'single_choice')
        .map(s => s.content.options.findIndex(o => o.is_correct))
      for (let i = 2; i < positions.length; i++) {
        if (positions[i] === positions[i - 1] && positions[i] === positions[i - 2]) {
          problems.push(`${lesson.slug}: three correct answers in a row at position ${'ABCD'[positions[i]]}`)
        }
      }
    }
  }
  const firstLesson = LEVELS[0].lessons[0]
  if (!firstLesson.free) problems.push('first lesson of the course must be free')
  const freeCount = LEVELS.flatMap(l => l.lessons).filter(l => l.free).length
  if (freeCount !== 1) problems.push(`expected exactly 1 free lesson, found ${freeCount}`)
  if (problems.length) {
    console.error('Local validation failed:')
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
// Self-check (runs after seeding, reads back from the DB)
// ────────────────────────────────────────────────────────────────────────────
async function selfCheck(courseId) {
  console.log('\n── Self-check ──────────────────────────────────────────')
  const { data: levels, error: e1 } = await db
    .from('course_levels').select('id, title_ja, order_index')
    .eq('course_id', courseId).order('order_index')
  if (e1) throw new Error(e1.message)

  const { data: lessons, error: e2 } = await db
    .from('lessons').select('id, slug, free, level_id, order_index')
    .in('level_id', levels.map(l => l.id)).order('order_index')
  if (e2) throw new Error(e2.message)

  const { data: screens, error: e3 } = await db
    .from('lesson_screens').select('lesson_id, type, content')
    .in('lesson_id', lessons.map(l => l.id))
  if (e3) throw new Error(e3.message)

  console.log(`Levels: ${levels.length} | Lessons: ${lessons.length} | Screens: ${screens.length}`)

  const totalDist = { A: 0, B: 0, C: 0, D: 0 }
  for (const level of levels) {
    console.log(`\n${level.title_ja}`)
    for (const lesson of lessons.filter(l => l.level_id === level.id)) {
      const ls = screens.filter(s => s.lesson_id === lesson.id)
      const qs = ls.filter(s => s.type === 'question')
      const dist = { A: 0, B: 0, C: 0, D: 0 }
      let gaps = 0
      for (const s of qs) {
        if (s.content.question_type === 'gap_fill') { gaps++; continue }
        const idx = (s.content.options ?? []).findIndex(o => o.is_correct)
        const letter = 'ABCD'[idx] ?? '?'
        dist[letter] = (dist[letter] ?? 0) + 1
        totalDist[letter] = (totalDist[letter] ?? 0) + 1
      }
      const distStr = Object.entries(dist).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(' ')
      console.log(`  ${lesson.slug}${lesson.free ? ' (FREE)' : ''} — ${ls.length} screens (${qs.length} questions, ${gaps} gap-fill) | answers ${distStr}`)
    }
  }
  console.log(`\nOverall answer positions — A:${totalDist.A} B:${totalDist.B} C:${totalDist.C} D:${totalDist.D}`)

  const issues = []
  if (levels.length !== 4) issues.push(`expected 4 levels, got ${levels.length}`)
  if (lessons.length !== 12) issues.push(`expected 12 lessons, got ${lessons.length}`)
  if (lessons.filter(l => l.free).length !== 1) issues.push('expected exactly one free lesson')
  for (const lesson of lessons) {
    const n = screens.filter(s => s.lesson_id === lesson.id).length
    if (n < 8 || n > 10) issues.push(`${lesson.slug} has ${n} screens (want 8–10)`)
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
