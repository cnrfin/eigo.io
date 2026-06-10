/**
 * Add an end-of-level REVIEW lesson to each level of the TOEIC course.
 *
 * IMPORTANT: this INSERTS into the existing 'toeic-prep' course — it does NOT
 * re-seed. The original seed (seed-course-toeic.mjs) is stale relative to the
 * live DB (later content audits were applied to the DB only), so re-seeding
 * would regress those fixes. This script only adds/refreshes the 4 review
 * lessons, identified by their slugs, and leaves every other lesson alone.
 *
 *   node --env-file=.env.local scripts/add-toeic-reviews.mjs
 *   node --env-file=.env.local scripts/add-toeic-reviews.mjs --dry   # print plan only
 *
 * Idempotent: each review lesson is deleted (by slug) then re-inserted.
 * After running, generate audio for the listening reviews:
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/add-course-audio.mjs
 * (toeic-p2-review / toeic-p34-review are registered there.)
 *
 * Review style: "practice + challenge" — a mixed set drawn from every lesson in
 * the level (fresh examples, never the lesson/mock items), ending with 1–2
 * harder exam-style items, then a one-screen recap. ~8 questions per review.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
  process.exit(1)
}
const DRY = process.argv.includes('--dry')
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── screen builders (same shapes as the seed) ───────────────────────────────
const con = (title_ja, title, body_ja, body, example) => ({
  type: 'concept',
  content: { title_ja, title, body_ja, body, ...(example ? { example } : {}) },
})
const q = (prompt_ja, prompt, opts, correct, explanation_ja, explanation) => {
  if (correct < 0 || correct >= opts.length) throw new Error(`bad correct index: ${prompt.slice(0, 40)}`)
  return {
    type: 'question',
    content: {
      question_type: 'single_choice',
      prompt,
      ...(prompt_ja ? { prompt_ja } : {}),
      options: opts.map((content, i) => ({ label: 'ABCD'[i], content, is_correct: i === correct })),
      explanation_ja, explanation,
    },
  }
}
const gap = (prompt_ja, prompt, accepted, explanation_ja, explanation) => ({
  type: 'question',
  content: { question_type: 'gap_fill', prompt, ...(prompt_ja ? { prompt_ja } : {}), accepted, explanation_ja, explanation },
})

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 REVIEW — Part 2 (audio: whole-prompt). Each prompt is the spoken
// question; options are the responses. Covers WH / Yes-No / tag / sound-alike /
// indirect answers, then two harder indirect-response challenges.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_P2 = [
  con(
    'レベル総まとめ：Part 2',
    'Level review: Part 2',
    'このレベルで学んだ型を、まとめて練習します。\n\n・疑問詞は文頭で「答えの種類」を決める\n・WH疑問文に Yes / No は不可\n・質問の単語をそのまま含む選択肢は疑う\n・付加疑問・選択疑問・遠回しの返答にも慣れる\n\n音声を1回聞いて、最も自然な応答を選んでください。',
    'A mixed practice set for everything in this level. Catch the first word to fix the answer type, reject Yes / No after WH questions, distrust options that echo the question word, and get comfortable with tag questions, choice questions, and indirect replies. Listen once and choose the most natural response.',
  ),
  q(
    null, 'Where should I leave the signed contract?',
    ['Yes, I signed it.', 'On Ms. Reyes’s desk.', 'By Friday afternoon.'],
    1,
    'Where は場所を聞いています。On Ms. Reyes’s desk. が正解。(A)はWH疑問文にYesで答えており不可。(C)は When への答えです。',
    'Where asks for a place: "On Ms. Reyes’s desk." (A) answers a WH question with Yes; (C) answers When.',
  ),
  q(
    null, 'Who’s in charge of the training session?',
    ['It starts at nine.', 'In the east wing.', 'Mr. Tanaka is.'],
    2,
    'Who の答えは人。Mr. Tanaka is. が正解です。(A)は時刻（When）、(B)は場所（Where）への答え。',
    'Who asks for a person: "Mr. Tanaka is." (A) gives a time, (B) gives a place.',
  ),
  q(
    null, 'Have you reviewed the new schedule yet?',
    ['No, I haven’t had a chance.', 'A regular schedule.', 'It’s on the bulletin board.'],
    0,
    'Yes/No疑問文。No, I haven’t had a chance.（まだ手が回っていません）が自然な応答です。(B)は schedule の音を使ったワナ、(C)は「どこにある？」への答えで、質問の種類が違います。',
    'A Yes/No question. "No, I haven’t had a chance" is the natural reply. (B) just echoes the sound of "schedule"; (C) answers "Where is it?", the wrong question type.',
  ),
  q(
    null, 'You’re joining the client call, aren’t you?',
    ['A new client.', 'Yes, at three.', 'The call was long.'],
    1,
    '付加疑問文は中身がYes/No疑問文。Yes, at three. が正解です。(A)は client の繰り返し、(C)は call の繰り返しによるひっかけ。',
    'A tag question is a Yes/No question at heart: "Yes, at three." (A) and (C) just recycle "client" and "call."',
  ),
  q(
    null, 'Could you forward me the budget file?',
    ['Sure, give me a minute.', 'A fast car forward.', 'The file cabinet.'],
    0,
    '依頼への応答は引き受け／断りが基本。Sure, give me a minute. が自然です。(B)は forward の音のワナ、(C)は file の繰り返しです。',
    'Requests take an accept/decline: "Sure, give me a minute." (B) plays on the sound of "forward"; (C) echoes "file."',
  ),
  q(
    null, 'Would you prefer the morning or the afternoon slot?',
    ['Yes, I would.', 'The morning works better.', 'It was a good slot.'],
    1,
    '選択疑問文（A or B）にはどちらかを選んで答えます。The morning works better. が正解。(A)のYesは選択疑問への答えになりません。',
    'A choice question (A or B) needs one option chosen: "The morning works better." Yes (A) cannot answer an either/or question.',
  ),
  q(
    null, 'When will the elevator be repaired?',
    ['On the ground floor.', 'Yes, it’s broken.', 'There’s a notice by the door.'],
    2,
    'チャレンジ：遠回しの返答。「ドアのところに掲示があります」は「自分は知らないが、そこを見て」という自然な答え。(A)は場所、(B)はWHにYesで不可。',
    'Challenge:an indirect reply. "There’s a notice by the door" means "I don’t know, but check there." (A) is a place; (B) answers a WH question with Yes.',
  ),
  q(
    null, 'Is the regional manager visiting this week?',
    ['She’s out until next Monday.', 'Yes, the manager’s office.', 'A long visit.'],
    0,
    'チャレンジ：Yes/Noに直接答えない返答。「来週月曜まで不在」は事実上の No です。(B)は manager の繰り返し、(C)は visit の繰り返しのワナ。',
    'Challenge:an indirect answer to a Yes/No question. "She’s out until next Monday" effectively means no. (B) and (C) just echo "manager" and "visit."',
  ),
  con(
    'おさえる',
    'Takeaways',
    '・最初の一語で答えの種類を決める。WHにYes/Noはなし\n・付加疑問・選択疑問は中身で答える\n・聞こえた単語を含む選択肢、似た音の選択肢は要注意\n・上級者は遠回しの返答に強い。「知らない」「掲示を見て」も立派な正解\n\nこの調子で次のレベルへ進みましょう。',
    '• The first word fixes the answer type; never Yes/No after WH.\n• Answer tag and choice questions by their content.\n• Beware options that repeat a word or a similar sound.\n• Strong test-takers handle indirect replies, such as "I don’t know" or "check the notice," which can be the correct response.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 REVIEW — Parts 3 & 4 (audio: dialogue-q). Conversations with M:/W:
// lines + a Q line. Covers purpose / next-action / paraphrase / subject-swap.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_P34 = [
  con(
    'レベル総まとめ：Part 3・4',
    'Level review: Parts 3 & 4',
    'このレベルの技術をまとめて練習します。\n\n・設問の主語（誰の話か）と種類を先につかむ\n・目的は冒頭、次の行動は終盤に出やすい\n・正解は音声を言い換える。そのまま繰り返す選択肢は疑う\n・会話に出た内容でも、主語が違えば不正解\n\n会話を聞いて、設問に答えてください。',
    'A mixed set for this level’s skills: read the question’s subject and type first, expect purpose at the start and next actions at the end, choose the option that rewords the audio rather than copies it, and reject right-content-wrong-speaker traps. Listen to each conversation, then answer.',
  ),
  q(
    '会話を聞いて、設問に答えてください。',
    '【会話】\nW: Good morning, this is Lena from Brightway Movers. I’m calling to confirm your move is still set for Saturday.\nM: Yes, Saturday is fine. Will the team arrive at eight?\nW: Around eight thirty, if that works.\n\nQ: Why is the woman calling?',
    ['To reschedule the move', 'To confirm a moving date', 'To apply for a job', 'To complain about a service'],
    1,
    '冒頭で I’m calling to confirm your move... と目的を述べています。confirm = 確認。(A)の予定変更はしていません。目的は冒頭、が型です。',
    'Her opening line states the purpose: "I’m calling to confirm your move." She is not rescheduling (A). Purpose appears at the start.',
  ),
  q(
    '会話を聞いて、設問に答えてください。',
    '【会話】\nM: The supplier says our usual boxes are out of stock until next month.\nW: That’s a problem. Can we use a different size for now?\nM: I’ll check whether the larger ones cost more.\n\nQ: What does the man say about the usual boxes?',
    ['They are unavailable for now.', 'They have become cheaper.', 'They are the wrong size.', 'They were delivered early.'],
    0,
    '言い換え問題。out of stock until next month を unavailable for now と言い換えた(A)が正解。音声の語をそのまま使わず、意味で選びます。',
    'A paraphrase: "out of stock until next month" becomes "unavailable for now." Choose by meaning, not by matching words.',
  ),
  q(
    '会話を聞いて、設問に答えてください。',
    '【会話】\nW: The projector in Room B keeps shutting off during presentations.\nM: I can move your meeting to Room C, or I can call the repair desk.\nW: Let’s just switch rooms, it’s quicker.\n\nQ: What does the man offer to do?',
    ['Cancel the presentation', 'Buy a new projector', 'Move the meeting to another room', 'Repair the projector himself'],
    2,
    '男性の申し出は I can move your meeting to Room C。主語に注意：修理を「呼ぶ」とは言いましたが「自分で直す」とは言っていません((D)はすり替え)。',
    'His offer is "I can move your meeting to Room C." He offered to call the repair desk, not to fix it himself, so (D) is a subject/detail swap.',
  ),
  gap(
    '会話を聞いて、答えを入力してください。',
    '【会話】\nM: Should we send the samples on Wednesday or Thursday?\nW: Wednesday is too early. Let’s send them Thursday and call the client on Friday.\nM: Agreed.\n\nQ: On what day will the samples be sent?（英語1語で）',
    ['thursday', 'on thursday'],
    '女性が Let’s send them Thursday と決めています。Wednesday（早すぎる）や Friday（電話の日）に惑わされないこと。複数の曜日が出たら設問の的を絞ります。',
    'The woman decides: "Let’s send them Thursday." Wednesday is rejected and Friday is the call day. When several days appear, lock onto what the question asks.',
  ),
  q(
    '会話を聞いて、設問に答えてください。',
    '【会話】\nW: Thanks for coming in. Before the tour, would you like to see the staff lounge or the labs first?\nM: The labs, please. That’s really why I’m here.\nW: Of course. Let me grab the key card and we’ll head over.\n\nQ: What will the speakers most likely do next?',
    ['Visit the staff lounge', 'Sign an employment contract', 'Go to the labs', 'Take a coffee break'],
    2,
    '次の行動は終盤に出ます。男性は The labs, please と希望し、女性は head over と続けます。順序のすり替え（(A)ラウンジは選ばれていない）に注意。',
    'Next actions come at the end. He chooses "the labs" and she says they’ll "head over." Watch the order trap: the lounge (A) was not chosen.',
  ),
  q(
    '話を聞いて、設問に答えてください。',
    '【アナウンス】\nAttention, shoppers. The escalator to the second floor is temporarily out of service. Please use the elevators near the main entrance. Repairs should be finished by this afternoon.\n\nQ: What are listeners asked to do?',
    ['Leave the store', 'Use the elevators instead', 'Come back tomorrow', 'Take the stairs to the first floor'],
    1,
    'Part 4のアナウンス。Please use the elevators... が指示です。out of service（使えない）を理由に別手段を案内する、定番の流れ。',
    'A Part 4 announcement. The instruction is "Please use the elevators." An out-of-service notice followed by an alternative is a common pattern.',
  ),
  q(
    '話を聞いて、設問に答えてください。',
    '【アナウンス】\nThanks, everyone, for joining the orientation. You’ve all received a welcome folder. Inside, there’s a campus map and a parking pass. If your pass is missing, see me at the front before you leave today.\n\nQ: What should listeners do if a parking pass is missing?',
    ['Park outside the campus', 'Email the office next week', 'Speak to the speaker before leaving', 'Print a new map'],
    2,
    'チャレンジ：条件つきの指示。「不足していたら、帰る前に私のところへ」= see me at the front before you leave。before you leave today を before leaving と言い換えた(C)が正解。',
    'Challenge:a conditional instruction: "If your pass is missing, see me at the front before you leave." (C) rewords "before you leave today" as "before leaving."',
  ),
  con(
    'おさえる',
    'Takeaways',
    '・設問の「主語」と「種類」を先に読む\n・目的は冒頭、次の行動・条件つき指示は終盤\n・正解は言い換え。そのまま繰り返す選択肢は疑う\n・会話に出た内容でも、主語や順序が違えば不正解\n\n次はPart 5の文法へ。',
    '• Read the question’s subject and type first.\n• Purpose at the start; next actions and conditional instructions at the end.\n• Correct options reword; word-for-word copies are suspect.\n• Right content with the wrong speaker or order is still wrong.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 REVIEW — Part 5 grammar (no audio). Word form / verb form /
// preposition vs conjunction, then combined-pattern challenges.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_P5 = [
  con(
    'レベル総まとめ：Part 5',
    'Level review: Part 5',
    'このレベルの文法ポイントをまとめて練習します。\n\n・品詞：空所の前後を見て、名詞／動詞／形容詞／副詞を判断\n・動詞の形：時制・態（能動／受動）・主語との一致\n・前置詞 vs 接続詞：後ろが「名詞のかたまり」か「主語＋動詞」か\n\n空所に最も適切なものを選んでください。',
    'A mixed grammar set: pick the part of speech from the words around the blank; match verb tense, voice, and subject agreement; and decide preposition vs conjunction by what follows (a noun phrase, or a subject + verb). Choose the best option for each blank.',
  ),
  q(
    null, 'The new software has greatly improved the ___ of the assembly line.',
    ['efficient', 'efficiently', 'efficiency', 'efficiencies'],
    2,
    '品詞問題。the ___ of で、空所には名詞が入ります。単数の抽象名詞 efficiency が正解。(A)形容詞、(B)副詞、(D)は不自然な複数形。',
    'A word-form item: "the ___ of" needs a noun. The singular abstract noun "efficiency" fits. (A) is an adjective, (B) an adverb, (D) an odd plural.',
  ),
  q(
    null, 'All visitors ___ to wear a badge while inside the factory.',
    ['require', 'are required', 'requiring', 'requirement'],
    1,
    '態の問題。来訪者は「求められる」側なので受動態 are required。主語 visitors は複数なので are で一致。(A)能動、(C)分詞、(D)名詞。',
    'A voice item: visitors are the ones required, so the passive "are required" fits, and "visitors" (plural) takes "are." (A) is active, (C) a participle, (D) a noun.',
  ),
  q(
    null, 'Please submit the form ___ the end of the month.',
    ['by', 'until', 'while', 'during'],
    0,
    '前置詞の選択。締め切りの「期限」は by（〜までに）。until は「〜までずっと」継続。while は接続詞、during の後ろは期間の名詞。',
    'A preposition choice: a deadline takes "by" (no later than). "Until" means continuously up to; "while" is a conjunction; "during" needs a period noun.',
  ),
  q(
    null, '___ the weather was poor, the outdoor event went ahead as planned.',
    ['Despite', 'Although', 'However', 'Because of'],
    1,
    '後ろが the weather was poor（主語＋動詞）なので接続詞 Although が正解。Despite と Because of は前置詞（後ろは名詞）、However は副詞です。',
    'What follows is a clause (subject + verb), so the conjunction "Although" fits. "Despite" and "Because of" are prepositions (need a noun), and "However" is an adverb.',
  ),
  gap(
    '空所に入る1語を入力してください。',
    'The report must be reviewed ___ it is sent to the client.（接続詞を1語で）',
    ['before'],
    '後ろが it is sent（主語＋動詞）なので接続詞が必要。文意は「クライアントに送る前に確認」なので before。',
    'A clause follows (it is sent), so a conjunction is needed; the meaning "checked before it is sent" gives "before."',
  ),
  q(
    null, 'The marketing team worked ___ to launch the campaign on time.',
    ['collaborate', 'collaborative', 'collaboratively', 'collaboration'],
    2,
    '品詞問題。動詞 worked を修飾するのは副詞 collaboratively。(A)動詞、(B)形容詞、(D)名詞は入りません。',
    'A word-form item: the verb "worked" is modified by the adverb "collaboratively." (A) verb, (B) adjective, (D) noun do not fit.',
  ),
  q(
    null, 'By the time the auditors arrived, the staff ___ all the records.',
    ['organize', 'have organized', 'had organized', 'are organizing'],
    2,
    'チャレンジ：時制の組み合わせ。By the time + 過去, 主節は「それより前」なので過去完了 had organized。(B)現在完了、(D)現在進行は時制が合いません。',
    'Challenge:tense sequencing. "By the time" + past means the main clause happened earlier, so the past perfect "had organized" fits. (B) and (D) clash with the past frame.',
  ),
  q(
    null, 'The proposal was rejected ___ its high cost, ___ the committee liked the overall idea.',
    ['because of / although', 'although / because of', 'because of / because of', 'although / although'],
    0,
    'チャレンジ：前置詞と接続詞の組み合わせ。1つ目は名詞句 its high cost の前なので前置詞 because of。2つ目は節 the committee liked... の前なので接続詞 although。',
    'Challenge:combining both. The first blank precedes a noun phrase ("its high cost"), so the preposition "because of"; the second precedes a clause, so the conjunction "although."',
  ),
  con(
    'おさえる',
    'Takeaways',
    '・品詞は空所の前後（冠詞・前置詞・修飾先）で決める\n・動詞は時制・態・一致の3点をチェック\n・前置詞の後ろは名詞句、接続詞の後ろは主語＋動詞\n・1問に2つの文法ポイントが絡むこともある\n\n次はPart 7の読解へ。',
    '• Decide part of speech from the surroundings (articles, prepositions, what is modified).\n• Check verbs for tense, voice, and agreement.\n• Prepositions take a noun phrase; conjunctions take a subject + verb.\n• One item can test two grammar points at once.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 4 REVIEW — Part 7 reading (no audio). Scanning / NOT / inference /
// double passage. Short passages are printed in the prompt.
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_P7 = [
  con(
    'レベル総まとめ：Part 7',
    'Level review: Part 7',
    'このレベルの読解技術をまとめて練習します。\n\n・スキャニング：設問のキーワードを本文から探して事実を取る\n・NOT問題：3つ当てはまる→残り1つが答え\n・推測問題：本文の根拠から一歩だけ踏み込む\n・ダブルパッセージ：2文書を結びつけて答える\n\n本文を読んで、設問に答えてください。',
    'A mixed reading set: scan for the keyword and grab the fact; on NOT questions, find the three that match and pick the leftover; on inference, step just one move beyond the text; and on double passages, connect the two documents. Read each text, then answer.',
  ),
  q(
    null,
    '【Notice】\nThe Riverside Library will close early at 5 P.M. on June 14 for staff training. Normal hours (9 A.M.–9 P.M.) resume on June 15. The returns box by the entrance stays open at all times.\n\nQ: What time does the library close on June 14?',
    ['9 A.M.', '5 P.M.', '9 P.M.', 'It stays open all day.'],
    1,
    'スキャニング。設問のキーワード June 14 を本文から探すと close early at 5 P.M.。事実をそのまま取ります。',
    'Scan for the keyword "June 14": "close early at 5 P.M." Take the fact as stated.',
  ),
  q(
    null,
    '【Email excerpt】\nThank you for your order. Your membership includes free shipping, a monthly newsletter, and early access to sales. Note that gift wrapping is available for an additional fee.\n\nQ: What is NOT included for free with the membership?',
    ['Free shipping', 'The monthly newsletter', 'Gift wrapping', 'Early access to sales'],
    2,
    'NOT問題。無料の3つ（送料無料・ニュースレター・先行アクセス）は本文にあり。gift wrapping は for an additional fee（有料）なので、これが答え。',
    'A NOT question. Three are listed as included; gift wrapping is "for an additional fee," so it is the answer.',
  ),
  q(
    null,
    '【Message】\nHi Dan, the client moved our meeting up to 9 A.M., so I’ll need the slides tonight rather than tomorrow morning. Can you send what you have, even if the last section isn’t polished?\n\nQ: What does the writer imply?',
    ['The deadline is now earlier.', 'The meeting was cancelled.', 'The slides are already finished.', 'Dan should attend the meeting.'],
    0,
    '推測問題。moved our meeting up + need the slides tonight rather than tomorrow から、締め切りが早まったと読み取れます。本文の根拠から一歩だけ踏み込みます。',
    'Inference. "Moved our meeting up" and "tonight rather than tomorrow" imply the deadline is now earlier. Step just one move beyond the text.',
  ),
  gap(
    '本文を読んで、空所に入る語を入力してください。',
    '【Policy】\nRefunds are issued within five business days for items returned unopened. Opened items may be exchanged but cannot be ___.\n\nQ: Fill the blank with the word the policy implies.（本文から1語）',
    ['refunded'],
    '未開封は返金（refund）、開封済みは交換のみで「返金されない」。対比から空所は refunded。本文の語をそのまま使う点でスキャニング寄りの問題です。',
    'Unopened items are refunded; opened ones can only be exchanged, not refunded. The contrast supplies "refunded."',
  ),
  q(
    null,
    '【Review】\nThe café’s pastries were excellent and the staff were friendly. My only complaint is that it took nearly twenty minutes to get a simple coffee. I’d return, but maybe not during the lunch rush.\n\nQ: What can be inferred about the café?',
    ['The pastries were disappointing.', 'The staff were rude.', 'The service can be slow when busy.', 'The reviewer will not return.'],
    2,
    '推測問題。twenty minutes for a coffee と not during the lunch rush から「混雑時は遅い」と読み取れます。(A)(B)(D)は本文と矛盾します。',
    'Inference. "Twenty minutes for a coffee" plus "not during the lunch rush" implies service slows when busy. (A), (C), and (D) contradict the text.',
  ),
  q(
    null,
    '【Document 1: Workshop ad】\nWeekend workshops: $40 each. Sign up for any three and pay just $100.\n\n【Document 2: Email】\nHi, I’d like to register for the photography, baking, and pottery workshops. Please send the invoice.\n\nQ: How much should the writer be charged?',
    ['$40', '$100', '$120', '$140'],
    1,
    'チャレンジ：ダブルパッセージ。文書2で3つ申し込み→文書1の「3つで$100」が適用。$40×3=$120ではなく割引価格の$100が答え。2文書を結びつけます。',
    'Challenge:double passage. Document 2 names three workshops; Document 1’s "any three for $100" applies, so the discounted $100 (not $120) is the charge. Connect the two documents.',
  ),
  q(
    null,
    '【Document 1: Schedule】\nShuttle to the airport departs the hotel lobby at 6:00, 8:00, and 10:00 A.M.\n\n【Document 2: Note】\nMy flight check-in closes at 9:30 A.M., and the ride takes about an hour. I’ll take the latest shuttle that still gets me there in time.\n\nQ: Which shuttle will the writer take?',
    ['6:00 A.M.', '8:00 A.M.', '10:00 A.M.', 'None of them work.'],
    1,
    'チャレンジ：条件を結びつける。所要1時間、9:30までに到着が必要。8:00発→9:00着で間に合う。10:00発→11:00着では遅い。最も遅くて間に合うのは8:00。',
    'Challenge:combine conditions. The ride takes an hour and check-in closes at 9:30. The 8:00 shuttle arrives 9:00 (in time); the 10:00 arrives too late. The latest that still works is 8:00.',
  ),
  con(
    'おさえる',
    'Takeaways',
    '・設問のキーワードを本文で探す（スキャニング）\n・NOT問題は「当てはまる3つ」を消して残りを選ぶ\n・推測は本文の根拠から一歩だけ。飛躍しない\n・ダブルパッセージは2文書を結びつけ、料金は割引・条件を最後に当てはめる\n\n全レベルの総まとめ完了です。模試で力を試しましょう。',
    '• Scan for the question’s keyword.\n• On NOT questions, eliminate the three that match and keep the leftover.\n• Infer one step from the evidence, no leaps.\n• On double passages, connect both documents and apply discounts and conditions last.',
  ),
]

// ── review lessons, one per level (order_index = appended after lesson 2) ────
const REVIEWS = [
  { levelIndex: 0, slug: 'toeic-p2-review', title: 'Level Review: Part 2', title_ja: 'レベル総まとめ：Part 2', screens: REVIEW_P2 },
  { levelIndex: 1, slug: 'toeic-p34-review', title: 'Level Review: Parts 3 & 4', title_ja: 'レベル総まとめ：Part 3・4', screens: REVIEW_P34 },
  { levelIndex: 2, slug: 'toeic-p5-review', title: 'Level Review: Part 5', title_ja: 'レベル総まとめ：Part 5', screens: REVIEW_P5 },
  { levelIndex: 3, slug: 'toeic-p7-review', title: 'Level Review: Part 7', title_ja: 'レベル総まとめ：Part 7', screens: REVIEW_P7 },
]

// ── local checks (em-dash audit, answer runs, screen counts) ─────────────────
function validate() {
  const problems = []
  for (const r of REVIEWS) {
    const n = r.screens.length
    if (n < 8 || n > 12) problems.push(`${r.slug}: ${n} screens (want 8–12)`)
    if (r.screens[r.screens.length - 1].type !== 'concept') problems.push(`${r.slug}: last screen not a concept recap`)
    const positions = []
    r.screens.forEach((s, i) => {
      const c = s.content
      const txt = JSON.stringify(c)
      if (txt.includes('—')) problems.push(`${r.slug}#${i}: contains em-dash`)
      if (s.type === 'question' && c.question_type === 'single_choice') {
        const correct = c.options.filter(o => o.is_correct)
        if (correct.length !== 1) problems.push(`${r.slug}#${i}: ${correct.length} correct options`)
        positions.push(c.options.findIndex(o => o.is_correct))
      }
      if (s.type === 'question' && c.question_type === 'gap_fill' && (!c.accepted || !c.accepted.length)) {
        problems.push(`${r.slug}#${i}: gap_fill without accepted answers`)
      }
    })
    for (let i = 2; i < positions.length; i++) {
      if (positions[i] === positions[i - 1] && positions[i] === positions[i - 2]) {
        problems.push(`${r.slug}: 3 correct answers in a row at ${'ABCD'[positions[i]]}`)
      }
    }
  }
  if (problems.length) { console.error('Validation failed:'); problems.forEach(p => console.error('  - ' + p)); process.exit(1) }
  console.log('Local validation passed.')
}

async function run() {
  validate()
  const { data: course, error: cErr } = await db.from('courses').select('id').eq('slug', 'toeic-prep').single()
  if (cErr || !course) throw new Error(`course toeic-prep not found: ${cErr?.message}`)
  const { data: levels, error: lErr } = await db.from('course_levels')
    .select('id, order_index').eq('course_id', course.id).order('order_index')
  if (lErr) throw new Error(lErr.message)

  for (const r of REVIEWS) {
    const level = levels.find(l => l.order_index === r.levelIndex)
    if (!level) throw new Error(`level index ${r.levelIndex} not found`)
    // append after the last existing lesson in this level
    const { data: existing } = await db.from('lessons').select('order_index').eq('level_id', level.id).order('order_index', { ascending: false }).limit(1)
    const nextOrder = existing && existing.length ? existing[0].order_index + 1 : 0
    if (DRY) {
      console.log(`[dry] ${r.slug} -> level ${r.levelIndex}, order ${nextOrder}, ${r.screens.length} screens`)
      continue
    }
    await db.from('lessons').delete().eq('slug', r.slug) // idempotent
    const { data: les, error: insErr } = await db.from('lessons').insert({
      level_id: level.id, order_index: nextOrder, slug: r.slug,
      title: r.title, title_ja: r.title_ja, free: false, estimated_minutes: 8,
    }).select('id').single()
    if (insErr) throw new Error(`insert ${r.slug}: ${insErr.message}`)
    const rows = r.screens.map((s, k) => ({ lesson_id: les.id, order_index: k, type: s.type, content: s.content }))
    const { error: scrErr } = await db.from('lesson_screens').insert(rows)
    if (scrErr) throw new Error(`screens for ${r.slug}: ${scrErr.message}`)
    console.log(`  ${r.slug}: inserted at order ${nextOrder} (${rows.length} screens)`)
  }
  console.log('Done. Now run add-course-audio.mjs to voice toeic-p2-review / toeic-p34-review.')
}

run().catch(e => { console.error(e); process.exit(1) })
