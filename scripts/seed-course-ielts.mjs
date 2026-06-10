/**
 * Seed the IELTS mini-course (Brilliant-style prep course).
 *
 *   Course 'ielts-prep' — 4 levels × 3 lessons = 12 lessons, ~110 screens.
 *   Teaches the QUESTION FORMATS of the IELTS mocks with fresh, original
 *   examples — never the mock answers themselves. The first lesson of the
 *   course is free; the rest require a subscription (gated by the API).
 *
 *   Level 1  リスニング攻略     (numbers & spelling / paraphrase / option traps)
 *   Level 2  リーディング攻略   (TFNG / heading matching / completion)
 *   Level 3  ライティング攻略   (GT letters / Academic charts / Task 2 essays)
 *   Level 4  スピーキング攻略   (Part 1 extending / Part 2 cue card / Part 3 opinions)
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY):
 *   node --env-file=.env.local scripts/seed-course-ielts.mjs
 * Dry run (local validation only, no DB writes):
 *   node --env-file=.env.local scripts/seed-course-ielts.mjs --validate-only
 * Re-running REFRESHES the course (deletes 'ielts-prep'; cascades clean up
 * levels, lessons, screens and progress). All content is ORIGINAL.
 */
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--validate-only')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
  process.exit(1)
}
const db = DRY_RUN ? null : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

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
  slug: 'ielts-prep',
  exam_slug: 'ielts',
  title: 'IELTS Prep Course',
  title_ja: 'IELTS対策コース',
  description: 'The key to a higher band score is knowing the question formats inside out. From Listening to Speaking, master every pattern the test can throw at you.',
  description_ja: 'バンドスコアを上げる鍵は、問題形式への慣れ。リスニングからスピーキングまで、出題パターンを攻略します。',
  published: false,
  order_index: 1,
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — リスニング攻略
// ════════════════════════════════════════════════════════════════════════════

// ── L1 (FREE) 数字とスペルの聞き取り ─────────────────────────────────────
const L1_SCREENS = [
  // 1. cold-open dictation
  gap(
    'まずは1問。音声を聞いたつもりで、フォームに記入してください。',
    '【音声】\n“My surname is Tanner. That’s T-A-double N-E-R.”\n\n【フォーム】\nSurname: ______',
    ['tanner'],
    'double N は「Nを2回」という意味。T-A-N-N-E-R で Tanner です。\n\nIELTSリスニングのSection 1では、名前のスペルがほぼ必ず読み上げられます。最初の関門がこの double。「double＋文字」と聞こえたら、その文字を2回書く——今日はこのフォーム記入を徹底的に練習します。\n\nなお、スペルミスは容赦なく0点。Taner でも Tannar でも不正解です。',
    '“Double N” means the letter N twice: T-A-N-N-E-R → Tanner. Section 1 almost always spells out a name, and “double + letter” is the first hurdle. One more rule with no mercy: any misspelling scores zero.',
  ),
  // 2. concept: predict before you listen
  con(
    'フォーム記入は「予測」が9割',
    'Form completion is 90% prediction',
    'Section 1は、電話での問い合わせや申し込みを聞いてフォームを埋める形式。音声は一度しか流れません。\n\nだから音声が始まる前に、フォームの空所をざっと見て「何が入るか」を予測しておきます。Surname なら名前のスペル、£ マークなら金額、Date なら日付。予測ができていれば、その瞬間だけ全集中すればいい。\n\nもうひとつ大事なのが指示文。Write ONE WORD AND/OR A NUMBER とあれば、2語書いた時点で不正解です。内容が合っていても、です。',
    'In Section 1 you complete a form while listening to a phone call — heard ONCE. So before the audio starts, scan the gaps and predict what each needs: a spelled-out name, a price, a date. Prediction tells you exactly when to concentrate. And obey the instruction line: if it says ONE WORD AND/OR A NUMBER, two words score zero even when the content is right.',
    'Surname: ______ → スペルの読み上げが来る\nDeposit: £______ → 金額が来る\nDate: ______ → 日付が来る',
  ),
  // 3. spelling with double
  gap(
    '音声を聞いたつもりで、フォームに記入してください。',
    '【音声】\n“The booking is under Mossley. M-O-double S-L-E-Y.”\n\n【フォーム】\nFamily name: ______',
    ['mossley'],
    'double S なので M-O-S-S-L-E-Y、Mossley です。\n\ndouble は本番の音声でも本当によく出ます。アルファベットを聞き取るときは、頭の中で1文字ずつ「書きながら」聞くのがコツ。聞き終わってから思い出そうとすると、たいてい1文字抜けます。',
    '“Double S” gives M-O-S-S-L-E-Y. When letters are read out, write them in your head AS you hear them — reconstructing the word afterwards almost always drops a letter.',
  ),
  // 4. concept: -teen vs -ty
  con(
    '最大の聞き分け：15と50',
    'The big one: fifteen vs. fifty',
    '数字の聞き取りで一番落とされるのが、-teen と -ty の区別です。fifteen（15）と fifty（50）、thirteen（13）と thirty（30）。\n\n聞き分けのポイントは2つ。\n\n①アクセント：-teen は後ろ（fifTEEN）、-ty は前（FIFty）にアクセント。\n\n②語尾：-teen は「ティーン」とはっきり伸び、-ty は「ティ」と短く落ちます。\n\nそして実は、話し手自身が間違いを防ごうとして “fifteen — that’s one five” のように数字を1桁ずつ言い直してくれることが多い。この確認が聞こえたら、必ずそちらを採用しましょう。',
    'The most-missed distinction in the numbers game: -teen vs. -ty. Two cues: STRESS (fifTEEN vs. FIFty) and the ENDING (a long clear “-teen” vs. a short clipped “-ty”). Best of all, speakers often confirm digit by digit — “fifteen, that’s one five”. When you hear that confirmation, trust it over your first impression.',
    'fifTEEN ＝ 15（後ろにアクセント）\nFIFty ＝ 50（前にアクセント）\n“one five” ＝ 15 と確定',
  ),
  // 5. price
  gap(
    '音声を聞いたつもりで、フォームに記入してください。',
    '【音声】\n“There’s a deposit to pay — fifty pounds. That’s five zero, fifty.”\n\n【フォーム】\nDeposit: £______',
    ['50', 'fifty'],
    'FIFty（前アクセント）、そして決定打は five zero という1桁ずつの確認。50ポンドです。\n\n15と迷ったら、確認の言い直しを待つ。Section 1の話し手は親切なので、大事な数字はたいてい2回言ってくれます。',
    'Front-stressed FIFty, sealed by the digit-by-digit “five zero”. When torn between 15 and 50, wait for the confirmation — Section 1 speakers repeat the numbers that matter.',
  ),
  // 6. -teen
  gap(
    '音声を聞いたつもりで、フォームに記入してください。',
    '【音声】\n“The evening course runs for thirteen weeks — one three, thirteen.”\n\n【フォーム】\nLength of course: ______ weeks',
    ['13', 'thirteen'],
    'thirTEEN（後ろアクセント）＋ one three の確認で、13週間です。\n\n30と書いた人は、-ty と -teen の聞き分けをもう一度。「アクセントが後ろなら -teen」と体に覚えさせましょう。',
    'End-stressed thirTEEN plus the “one three” confirmation: 13 weeks. If you wrote 30, replay the stress rule — stress at the end means -teen.',
  ),
  // 7. concept: numbers conventions
  con(
    '電話番号・値段・日付の読み上げルール',
    'How phone numbers, prices and dates are read out',
    '数字には独特の読み上げ方があります。知っているだけで聞き取れるようになるので、ここでまとめて覚えましょう。\n\n・電話番号：0 は oh（オウ）、同じ数字の連続は double（double four ＝ 44）\n\n・値段：nineteen ninety-nine ＝ £19.99。ポンドとペンスを分けて読みます\n\n・日付：the twenty-first of June ＝ 21 June。書くときは数字でOK\n\n・時刻：half past six ＝ 6.30、quarter to five ＝ 4.45\n\nhalf past six を「6時半」と理解できても、フォームに 6.30 と書けなければ得点になりません。「聞く→数字に変換して書く」まででワンセットです。',
    'Numbers follow reading conventions worth memorising: oh = 0 and double four = 44 in phone numbers; “nineteen ninety-nine” = £19.99; “the twenty-first of June” = 21 June; “half past six” = 6.30 and “quarter to five” = 4.45. Understanding the phrase is half the job — the mark only comes when you convert it to digits on the form.',
  ),
  // 8. phone number
  gap(
    '音声を聞いたつもりで、フォームに記入してください。',
    '【音声】\n“My mobile is oh seven seven, double three, oh nine six.”\n\n【フォーム】\nMobile number: ______',
    ['07733096', '0773 3096', '077 33 096', '077 33096'],
    'oh ＝ 0、double three ＝ 33。つなげると 077 33 096 です。\n\n電話番号は long なので、聞きながらそのまま書き取るのが鉄則。「oh は 0」「double は2回」の2つの変換さえ反射でできれば、電話番号は得点源になります。',
    '“Oh” = 0 and “double three” = 33, giving 077 33 096. Phone numbers are long — transcribe them AS you listen. Master the two conversions (oh → 0, double → twice) and phone numbers become free marks.',
  ),
  // 9. date with a correction
  gap(
    '音声を聞いたつもりで、フォームに記入してください。最後まで聞いてから書くこと。',
    '【音声】\nW: “Shall we say the thirtieth of June for the inspection?”\nM: “Ah, I’m away that week. Could we make it the thirteenth?”\nW: “The thirteenth of June. That’s fine.”\n\n【フォーム】\nDate of inspection: ______ June',
    ['13', '13th', 'thirteenth', 'the thirteenth'],
    '最初に出た thirtieth（30日）は変更され、最終合意は thirteenth（13日）。-ty と -teen の聞き分けに加えて、「最初に聞こえた数字が答えとは限らない」という大事なワナが入っていました。\n\n会話は最後まで聞いて、確定した情報だけをフォームへ。この「訂正のワナ」は、次の次のレッスンでがっつり攻略します。',
    'The first date (the thirtieth) gets changed; the agreed answer is the thirteenth. Two traps in one: -ty/-teen AND “the first number you hear isn’t necessarily the answer”. Only confirmed information goes on the form — corrections get a whole lesson soon.',
  ),
  // 10. recap
  con(
    'まとめ：書けて初めて1点',
    'Recap: a mark needs correct writing, not just hearing',
    '・音声の前にフォームを見て、空所に入る情報の種類を予測する\n\n・double＋文字 ＝ その文字を2回。スペルは1文字ずつ書きながら聞く\n\n・-teen は後ろ、-ty は前にアクセント。1桁ずつの確認（one five）が決定打\n\n・oh ＝ 0、half past six ＝ 6.30。読み上げルールを数字に変換して書く\n\n・スペルミス・語数オーバーは内容が合っていても0点\n\n次のレッスンでは、リスニング最大の仕掛け「言い換え」を攻略します。',
    '• Preview the form and predict each gap’s information type.\n\n• double + letter = write it twice; transcribe spellings letter by letter.\n\n• -teen stresses the end, -ty the front; digit-by-digit confirmations settle it.\n\n• Convert conventions to digits: oh = 0, half past six = 6.30.\n\n• Misspellings and extra words score zero, full stop.\n\nNext: the Listening test’s biggest device — paraphrase.',
  ),
]
// ── L2 言い換えに気づく ──────────────────────────────────────────────────
const L2_SCREENS = [
  // 1. concept hook
  con(
    '音声は、設問の単語を使わない',
    'The audio never uses the question’s words',
    'IELTSリスニングには、意地悪なほど徹底したルールがあります。設問に書いてある単語は、音声ではまず使われない。\n\n設問が free（無料）と聞いていれば、音声は costs nothing（お金がかからない）と言う。設問が weekly なら、音声は every seven days と言う。\n\nつまり、設問の単語が聞こえてくるのを待っていると、答えの瞬間を素通りしてしまうんです。\n\n対策はひとつ。設問を読んだら「これは音声でどう言い換えられるか」を先に想像しておく。今日はその変換力を鍛えます。',
    'IELTS Listening follows one ruthless rule: the words printed in the question are almost never the words you hear. The question says “free”; the audio says “costs nothing”. The question says “weekly”; the audio says “every seven days”. Wait for the printed word and the answer sails past you. The fix: before listening, imagine how each question could be re-worded — that conversion skill is today’s training.',
    '設問: When is entry free?\n音声: “Entry costs nothing on Monday evenings.”',
  ),
  // 2. practice
  q(
    'ミニ音声を読んで、設問に答えてください。',
    '【音声】\n“Entry to the gallery costs nothing on Monday evenings, thanks to support from the city council.”\n\nQ: When can visitors enter the gallery free of charge?',
    ['On Monday evenings', 'At weekends', 'On public holidays'],
    0,
    '設問の free of charge は、音声では costs nothing と言い換えられています。この変換に気づければ、答えは Monday evenings しかありません。\n\n「free という単語が聞こえなかったから答えがわからなかった」——これがリスニングで最も多い失点パターン。単語ではなく意味を待ち伏せしましょう。',
    '“Free of charge” in the question becomes “costs nothing” in the audio. Spot the conversion and Monday evenings is the only candidate. Missing answers because “the word never came up” is the single most common way to lose marks — ambush the meaning, not the word.',
  ),
  // 3. concept: classic pairs
  con(
    '言い換えの定番ペアを貯金する',
    'Bank the classic paraphrase pairs',
    '言い換えには「よく出るペア」があります。出会うたびに貯金していきましょう。まずはこの基本セットから。\n\n・costs nothing ／ at no charge → free\n\n・not until Thursday → later in the week（木曜より前ではない＝週の後半）\n\n・book in advance → reserve early\n\n・nearly all ／ the vast majority → most\n\n・once a month → monthly\n\nコツは、設問を読んだ瞬間に「自分ならこの内容を別の英語でどう言うか」と考えること。その候補が音声で流れたら、そこが答えです。',
    'Paraphrases come in recurring pairs — collect them like savings: costs nothing → free; not until Thursday → later in the week; book in advance → reserve early; nearly all → most; once a month → monthly. The working habit: as you read each question, ask “how else could English say this?” — when one of your candidates plays, that is your answer.',
  ),
  // 4. practice
  q(
    'ミニ音声を読んで、内容に合う選択肢を選んでください。',
    '【音声】\n“I’m afraid the sports centre won’t reopen until the end of April — the roof repairs have taken longer than expected.”',
    ['The sports centre has closed permanently.', 'The sports centre will reopen later in the spring.', 'The sports centre is open throughout April.'],
    1,
    'not until the end of April（4月末までは開かない）は、言い換えると「春の後半に再開する」。won’t … until 〜 は「〜になってやっと」という意味で、closed forever ではありません。\n\nnot until は時間系の言い換えで最頻出。「までは〜ない」＝「その時点でようやく」と変換できるようにしておきましょう。',
    '“Won’t reopen until the end of April” = it WILL reopen, just later in the spring. “Not until ~” is the highest-frequency time paraphrase: it means “only at that point”, never “never”.',
  ),
  // 5. practice
  q(
    'ミニ音声を読んで、設問に答えてください。',
    '【音声】\n“The full-day workshop includes all materials, and lunch is provided at no extra charge.”\n\nQ: What is said about lunch?',
    ['Participants must bring their own lunch.', 'Lunch can be bought at the venue.', 'A meal is included in the price.'],
    2,
    'provided at no extra charge（追加料金なしで提供）＝ included in the price（料金に含まれる）。lunch → meal という上位語への言い換えも入っています。\n\n「無料」系の表現は free ／ at no charge ／ at no cost ／ complimentary ／ included と仲間が多いので、まとめて1つの意味として覚えてしまいましょう。',
    '“Provided at no extra charge” = “included in the price”, with lunch → meal as a bonus general-word swap. Treat the free-family — free / at no charge / at no cost / complimentary / included — as one meaning with five faces.',
  ),
  // 6. gap fill
  gap(
    '言い換えを完成させてください。',
    '【音声】\n“Please note the lecture has been brought forward to Monday.”\n\n【言い換え】\nThe lecture will take place ______ than planned.（1語で）',
    ['earlier', 'sooner'],
    'bring forward は「予定を前倒しする」。つまり講演は予定より早く行われます。正解は earlier（または sooner）。\n\n反対は push back ／ put off（延期する）→ later ／ postponed。前倒しと延期のペアはリスニングでもリーディングでも繰り返し出ます。',
    '“Brought forward” means moved EARLIER. Its mirror twins — push back / put off → later, postponed — appear over and over in both Listening and Reading.',
  ),
  // 7. practice
  q(
    'ミニ音声を読んで、設問に答えてください。',
    '【音声】\n“Places on the pottery course are limited, so we strongly advise early booking.”\n\nQ: What should people who want to join the course do?',
    ['Reserve a place in advance', 'Arrive early on the first day', 'Wait for extra places to be added'],
    0,
    'early booking（早めの予約）→ reserve in advance（事前に予約する）。book と reserve は試験の最重要言い換えペアのひとつです。\n\n(B)は early という単語だけ拾うと選んでしまうワナ。「早く来る」ではなく「早く予約する」です。単語の一致ではなく、文の意味で選びましょう。',
    '“Early booking” → “reserve in advance” — book/reserve is a must-know pair. (B) traps anyone who grabbed the word “early” alone: the advice is to book early, not to show up early. Match meanings, not words.',
  ),
  // 8. practice
  q(
    'ミニ音声を読んで、設問に答えてください。',
    '【音声】\n“Children under twelve are welcome, but they must be accompanied by an adult at all times.”\n\nQ: What is true for children under 12?',
    ['They pay a reduced entry fee.', 'They cannot visit on their own.', 'They are not allowed to enter.'],
    1,
    'must be accompanied by an adult（大人の同伴が必要）＝ cannot visit on their own（一人では来られない）。肯定文と否定文をひっくり返した言い換えです。\n\n(C)は welcome（歓迎します）と矛盾。料金の話(A)はそもそも出ていません。「同伴必須」＝「単独不可」の裏返し変換、これも頻出です。',
    '“Must be accompanied by an adult” flips into “cannot visit on their own” — a positive-to-negative paraphrase. (C) contradicts “children are welcome”, and (A) was never mentioned. Flipping requirements into prohibitions is a staple conversion.',
  ),
  // 9. recap
  con(
    'まとめ：単語ではなく意味を待ち伏せる',
    'Recap: ambush the meaning, not the word',
    '・設問の単語は音声ではまず使われない。聞こえるのは言い換え\n\n・設問を読んだら「別の英語でどう言うか」を先に想像する\n\n・定番ペアを貯金：costs nothing→free、not until→later、book→reserve\n\n・肯定⇔否定の裏返し（同伴必須＝単独不可）にも慣れる\n\n次は、選択肢が全部聞こえてくる「選択肢の罠」を攻略します。',
    '• The printed words won’t play — their paraphrases will.\n\n• Pre-imagine the re-wordings before the audio starts.\n\n• Bank the pairs: costs nothing → free, not until → later, book → reserve.\n\n• Practise positive↔negative flips (must be accompanied = can’t go alone).\n\nNext: the trap where EVERY option gets mentioned.',
  ),
]
// ── L3 選択肢の罠 ────────────────────────────────────────────────────────
const L3_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。会話を最後まで読んでから答えてください。',
    '【会話】\nM: Shall we meet at two o’clock to go over the plans?\nW: I have a class until half past two. Could we say four?\nM: Four’s a bit late for me — I need to leave by five. How about three?\nW: Three o’clock works. See you then.\n\nQ: What time will they meet?',
    ['Two o’clock', 'Three o’clock', 'Four o’clock'],
    1,
    '2時、4時、3時——選択肢の時刻が全部会話に出てきましたね。これがIELTSの選択問題の作り方です。最初の提案（2時）も対案（4時）も退けられ、最後に合意したのは3時。\n\n「聞こえた＝正解」がまったく通用しない世界へようこそ。会話は最後まで聞いて、合意した内容だけを採用します。',
    'Two, four AND three all get said — that is exactly how IELTS builds its options. The first proposal and the counter-proposal both fall; the agreement lands on three. Welcome to a world where “I heard it” means nothing. Only what the speakers finally AGREE on counts.',
  ),
  // 2. concept: mentioned ≠ correct
  con(
    '全部の選択肢が「聞こえてくる」',
    'Every option gets mentioned',
    'IELTSの選択問題・マッチング問題には設計思想があります。不正解の選択肢も、音声の中で必ず一度は触れられる。\n\nだから「この単語、聞こえた！」は何の根拠にもなりません。むしろ全選択肢が聞こえてくる前提で構えてください。\n\n勝負を分けるのは、それぞれの選択肢が どう言及されたか です。\n\n・提案されたが断られた\n・去年はそうだった（今年は違う）\n・別の人の話だった\n\n音声を聞きながら、選択肢に「出たけど却下」のバツ印をつけていく感覚。最後まで残ったものが答えです。',
    'IELTS multiple choice and matching are built on a design rule: every wrong option is also mentioned somewhere. “I heard that word” proves nothing — assume ALL options will play. What decides the answer is HOW each one is mentioned: proposed but declined, true last year but not this year, said about somebody else. Listen with a mental pencil, crossing options off as they are raised and rejected. The survivor is your answer.',
  ),
  // 3. practice
  q(
    '会話を最後まで読んでから答えてください。',
    '【会話】\nW: For the workshop, there’s the Oak Room — it holds forty people.\nM: We’re expecting about sixty, though.\nW: Then the Cedar Room… ah, no, it’s booked all week. The Garden Room is free on Thursday, and it takes eighty.\nM: The Garden Room it is.\n\nQ: Which room will they use?',
    ['The Oak Room', 'The Cedar Room', 'The Garden Room'],
    2,
    'Oak Room は狭すぎて却下、Cedar Room は予約済みで却下、残った Garden Room で決定。3部屋とも名前が聞こえる、典型的な消去レースです。\n\n各部屋が「なぜダメだったか」まで追えていれば確実。理由（狭い・埋まっている）とセットでバツをつけましょう。',
    'Oak — too small, crossed off. Cedar — already booked, crossed off. Garden — the survivor. A classic elimination race where all three names play. Track WHY each falls (too small / booked) and the cross-offs become certain.',
  ),
  // 4. concept: corrections
  con(
    '訂正のサイン：Actually が出たら身構える',
    'Correction signals: brace when you hear “Actually”',
    '選択肢の罠の最終形態が、話し手自身による訂正です。一度決まりかけた内容が、最後の最後でひっくり返る。\n\n“Let’s meet at two… actually, could we make it three? I just remembered a call.”\n\nこの actually 以降がすべてです。訂正のサインを覚えておきましょう。\n\n・Actually… ／ On second thought…（やっぱり）\n・Oh wait ／ Sorry, my mistake（あ、間違えた）\n・Let’s make it 〜（〜に変更しよう）\n\nサインが聞こえたら、直前にメモした答えを消す準備を。最後に話した人の発言が勝つ、と覚えてください。',
    'The trap’s final form: the speakers correct THEMSELVES. A settled answer flips at the last moment — “Let’s meet at two… actually, could we make it three?” Learn the signals: Actually… / On second thought… / Oh wait / Sorry, my mistake / Let’s make it ~. When one plays, get ready to erase what you just wrote. The last speaker’s correction wins.',
    '“The meeting’s at two… actually, let’s make it three o’clock.”\n→ 答えは 3時。最後の発言が勝つ',
  ),
  // 5. practice
  q(
    '会話を最後まで読んでから答えてください。',
    '【会話】\nM: Could you deliver the desk on Friday?\nW: I’m afraid we don’t deliver on Fridays. We could do Wednesday?\nM: I’m away on Wednesday, unfortunately. What about Thursday?\nW: Thursday morning — yes, that’s fine.\n\nQ: On which day will the desk be delivered?',
    ['Wednesday', 'Thursday', 'Friday'],
    1,
    '金曜は配達不可、水曜は客が不在、最終合意は木曜。今回も3つの曜日が全部聞こえました。\n\n配達日・集合時間・締切などの「日時の交渉」は、Section 1の超定番。最初の希望日が通ることはまずない、くらいに構えておくとちょうどいいです。',
    'Friday — no deliveries; Wednesday — customer away; Thursday — agreed. All three days play, again. Date-and-time negotiations are Section 1’s bread and butter, and the FIRST proposed day almost never survives.',
  ),
  // 6. practice
  q(
    '会話を最後まで読んでから答えてください。',
    '【会話】\nW: For the staff room, how about a coffee machine? Everyone drinks coffee.\nM: Most people bring their own from the shop downstairs, though. I think a water cooler would get far more use.\nW: That’s true, especially in summer. Let’s order one.\n\nQ: What will they buy for the staff room?',
    ['A water cooler', 'A coffee machine', 'Cups and glasses'],
    0,
    '最初の提案はコーヒーメーカーでしたが、男性が水のサーバーを対案として出し、女性が That’s true … Let’s order one. と乗りました。one ＝ a water cooler です。\n\n決め手は、提案そのものではなく相手の反応。賛成（That’s true ／ Good idea ／ Let’s do that）が付いた提案だけが生き残ります。',
    'The coffee machine is proposed first, but the man counter-offers a water cooler and the woman agrees — “Let’s order one”, where “one” = the cooler. The decider is never the proposal itself but the REACTION to it: only suggestions that win agreement survive.',
  ),
  // 7. gap fill: correction dictation
  gap(
    '音声を聞いたつもりで、最終的に確定した番号を書いてください。',
    '【音声】\n“Your booking reference is three oh six — sorry, my mistake, three oh nine. That’s three, zero, nine.”\n\n【フォーム】\nBooking reference: ______',
    ['309'],
    'sorry, my mistake のあとに出た 309 が確定情報です。最初の 306 をメモしていたら、すぐ書き直す。\n\n数字の訂正は、フォーム記入問題と選択問題の両方で出ます。「訂正のサイン → 直後の情報で上書き」の反射を作っておきましょう。',
    'The number after “sorry, my mistake” — 309 — is the confirmed one. If 306 was already on your paper, overwrite it instantly. Build the reflex: correction signal → replace with what follows.',
  ),
  // 8. practice
  q(
    '音声を読んで、設問に答えてください。',
    '【音声】\n“A quick note about the layout. Last year the cookery demonstrations were held in the main tent, but this year they move down to the riverside area, and the main tent will host the craft stalls instead.”\n\nQ: Where will the cookery demonstrations take place this year?',
    ['In the riverside area', 'In the main tent', 'At the main entrance'],
    0,
    'last year … but this year の対比がすべて。去年の場所（main tent）はワナとして置かれ、今年は riverside area です。\n\n「以前は／今年は」「昔は／今は」の対比は、マッチング問題の不正解づくりの定番。設問が聞いているのは どの時点の話か、を常に確認しましょう。',
    '“Last year … but this year” is the whole game: the old venue (main tent) sits there as bait, and this year’s answer is the riverside area. Past-vs-present contrasts are the matching task’s favourite wrong-answer factory — always check WHICH time the question asks about.',
  ),
  // 9. recap
  con(
    'まとめ：最後に残ったものが答え',
    'Recap: the survivor is the answer',
    '・不正解の選択肢も必ず音声に登場する。「聞こえた」は根拠にならない\n\n・選択肢に「出たけど却下」のバツ印をつけながら聞く\n\n・Actually ／ my mistake ／ Let’s make it 〜 は訂正のサイン。直後の情報で上書き\n\n・提案は相手の賛成（Good idea ／ Let’s do that）が付いて初めて確定\n\n・last year ／ this year の対比にも注意\n\nリスニング攻略はここまで。次のレベルはリーディング、まずは最重要のTrue/False/Not Givenです。',
    '• Wrong options WILL be mentioned — hearing a word proves nothing.\n\n• Cross options off as they are raised and rejected.\n\n• Actually / my mistake / let’s make it ~ → overwrite with what follows.\n\n• A proposal only counts once someone agrees to it.\n\n• Watch the last-year/this-year contrast.\n\nThat wraps up Listening. Next level: Reading, starting with the big one — True/False/Not Given.',
  ),
]
// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — リーディング攻略
// ════════════════════════════════════════════════════════════════════════════

// ── L4 True/False/Not Given 完全攻略 ─────────────────────────────────────
const L4_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。直感で答えてみてください。',
    '【本文】\nMr. Reed has worked at the town library for more than twenty years and is responsible for the local history collection.\n\n【設問】Mr. Reed enjoys working at the library.',
    ['True', 'False', 'Not Given'],
    2,
    '20年も働いているなら、きっと仕事が好きなはず——そう考えてTrueを選びましたか？それこそが出題者の狙いです。\n\n本文にあるのは「20年以上働いている」「郷土史コレクションの担当」という事実だけ。楽しんでいるかどうかは一言も書かれていません。書いていない→Not Given。\n\n常識的に「たぶんそうだろう」と思える内容ほどNot Givenになる——これがTFNG最大のワナであり、このレッスンの核心です。',
    'Twenty years in the job — surely he enjoys it? That instinct is exactly what the test hunts. The text states two facts: 20+ years of service and responsibility for a collection. Whether he ENJOYS it is never addressed. Not written → Not Given. The more plausible a statement feels, the more likely it is to be Not Given — that is the heart of this lesson.',
  ),
  // 2. concept: the 3-way procedure
  con(
    '3つの問いを、この順番で',
    'Three questions, always in this order',
    'True/False/Not Givenは、毎回同じ手順で機械的に判定します。\n\n①本文は、設問と同じことを言っているか？\n→ 言っている（言い換えで一致）なら True\n\n②本文は、設問と逆のことを言っているか？\n→ 矛盾しているなら False\n\n③どちらでもない？\n→ 本文がその件について沈黙しているなら Not Given\n\n大事なのは、判定の材料は本文の文だけということ。あなたの知識・経験・常識は、この問題では一切使ってはいけません。「本文のどの文が根拠？」と自分に聞いて、指させなければNot Givenです。',
    'Judge TFNG with a fixed three-step procedure: 1) Does the text say the SAME thing (in other words)? → True. 2) Does the text say the OPPOSITE? → False. 3) Neither? The text is silent on the point → Not Given. The only admissible evidence is the sentences of the passage — your knowledge, experience and common sense are banned. Ask “which sentence proves this?” If you cannot point at one, it is Not Given.',
    '一致 → True\n矛盾 → False\n書いていない → Not Given',
  ),
  // 3. practice: True
  q(
    '手順どおりに判定してください。根拠の文を指させますか？',
    '【本文】\nThe museum offers free entry to all visitors on the first Sunday of every month.\n\n【設問】Visitors can enter the museum without paying once a month.',
    ['True', 'False', 'Not Given'],
    0,
    'free entry → without paying、the first Sunday of every month → once a month。単語は違いますが、意味は完全に一致しています。だからTrue。\n\nTrueの根拠は、リスニングで学んだのと同じ言い換えで書かれています。「同じ単語がないからNot Given」としないこと。意味の一致を確認しましょう。',
    '“Free entry” → “without paying”; “the first Sunday of every month” → “once a month”. Different words, identical meaning → True. True statements hide behind paraphrase, exactly like Listening answers. Never call something Not Given just because the words differ.',
  ),
  // 4. practice: False
  q(
    '手順どおりに判定してください。',
    '【本文】\nThe footpath along the cliff is closed to walkers during the winter months for safety reasons.\n\n【設問】The cliff path can be used throughout the year.',
    ['True', 'False', 'Not Given'],
    1,
    '本文は「冬の間は閉鎖」、設問は「一年中使える」。真っ向から矛盾しているのでFalseです。\n\nFalseと言えるのは、このように本文が設問の逆を明言しているときだけ。「本文を読むと設問が成り立たない」と根拠の文を指させることが条件です。',
    'The text says the path closes in winter; the statement claims year-round use. Direct contradiction → False. You may only answer False when the text actively asserts the opposite — and you can point at the sentence that does it.',
  ),
  // 5. concept: NG ≠ probably true
  con(
    'Not Given ≠「たぶん本当」',
    'Not Given ≠ “probably true”',
    'FalseとNot Givenの区別こそ、このタイプの最難関です。\n\n・False ＝ 本文が設問の逆を言っている\n・Not Given ＝ 本文がその件に触れていない\n\n「もっともらしいかどうか」は関係ありません。現実世界でほぼ確実に正しいことでも、本文に書いていなければNot Given。逆に、明らかに変な内容でも、本文が触れていなければFalseではなくNot Givenです。\n\n出題者の典型パターンは、本文の話題に理由・感情・比較をこっそり足すこと。「人気がある→だから増設した？」「長く働いている→だから好き？」——足された部分が本文にあるか、必ず確認してください。',
    'Splitting False from Not Given is the hard part. False = the text asserts the opposite. Not Given = the text never addresses it. Plausibility is irrelevant: a statement that is almost certainly true in the real world is still Not Given if the passage is silent, and a bizarre claim is Not Given (not False) when the text simply doesn’t touch it. The setter’s trick is quietly ADDING a reason, feeling or comparison to the passage’s topic — always check whether the added part is actually in the text.',
    '本文「夜行バスは病院職員に人気だ」\n設問「夜行バスは病院職員の要望で作られた」\n→ 理由が足されている → Not Given',
  ),
  // 6. practice: NG (added reason)
  q(
    '設問が本文に何かを「足して」いないか確認しましょう。',
    '【本文】\nGreenway Buses introduced its night service in 2019. The company says the route has proved especially popular with hospital staff.\n\n【設問】The night service was introduced because hospital staff requested it.',
    ['True', 'False', 'Not Given'],
    2,
    '本文にあるのは「2019年に開始」「病院職員に人気」という2つの事実。設問はそこに「職員の要望で始まった」という因果関係を足しています。導入の理由は本文のどこにも書かれていません→Not Given。\n\n人気だから要望があったはず、は常識による飛躍。話題が重なっていても、主張そのものが書かれていなければNot Givenです。',
    'The text gives two facts: launched in 2019, popular with hospital staff. The statement adds a CAUSE — “because staff requested it” — that appears nowhere. Not Given. “Popular, so they must have asked for it” is a common-sense leap; shared topic does not mean the claim itself is stated.',
  ),
  // 7. practice: False (extreme word)
  q(
    '設問の「強い言葉」に注目してください。',
    '【本文】\nMost of the apartments in the newly completed riverside building have a private balcony.\n\n【設問】Every apartment in the riverside building has a private balcony.',
    ['True', 'False', 'Not Given'],
    1,
    '本文は most（大半）、設問は every（すべて）。「大半にある」は「すべてにある」と両立しません——mostは「バルコニーのない部屋もある」ことを含むからです。よってFalse。\n\nevery ／ all ／ only ／ never のような極端な言葉は、TFNGの定番の仕掛け。設問に見つけたら、本文の表現と強さを比べてください。',
    'The text says MOST; the statement says EVERY. “Most have one” entails that some do not — direct conflict → False. Extreme words (every / all / only / never) are classic TFNG levers: when you spot one in a statement, compare its strength against the text’s wording.',
  ),
  // 8. practice: True (paraphrase flip)
  q(
    '言い換えに注意して判定してください。',
    '【本文】\nCyclists are required to dismount and walk their bicycles through the market square.\n\n【設問】Riding a bicycle is not permitted in the market square.',
    ['True', 'False', 'Not Given'],
    0,
    '「自転車を降りて押して通ること」は、裏返せば「乗ったまま通ってはいけない」。肯定の指示と否定の禁止、形は違っても意味は一致するのでTrueです。\n\nリスニングのレッスンでやった裏返し変換（同伴必須＝単独不可）と同じ技がここでも使えます。',
    '“Must dismount and walk the bike” flips into “riding is not permitted” — an instruction and a prohibition with one meaning → True. The positive↔negative flip from the Listening lesson works here too.',
  ),
  // 9. practice: NG
  q(
    '最後の1問。根拠の文を指させますか？',
    '【本文】\nThe cookery school runs evening classes from Tuesday to Friday, and students receive a recipe booklet at the end of the course.\n\n【設問】The evening classes are taught by professional chefs.',
    ['True', 'False', 'Not Given'],
    2,
    '本文にあるのは曜日とレシピ冊子の話だけ。誰が教えるかは一切書かれていません→Not Given。\n\n料理学校ならプロの講師がいそう——その「ありそう感」がワナです。指させる根拠ゼロ＝Not Given。この基準を最後まで貫けるかが、TFNGのスコアを決めます。',
    'The text covers the schedule and a booklet — who TEACHES is never mentioned → Not Given. “A cookery school probably has professional chefs” is precisely the plausibility bait. Zero pointable evidence = Not Given, every single time.',
  ),
  // 10. recap
  con(
    'まとめ：指させなければNot Given',
    'Recap: if you can’t point at it, it’s Not Given',
    '・判定は3段階：一致→True、矛盾→False、書いていない→Not Given\n\n・根拠は本文の文だけ。常識・知識・「ありそう感」は禁止\n\n・設問が理由・感情・因果を「足して」いたらNot Givenを疑う\n\n・every ／ all ／ only などの極端な言葉は本文と強さを比較\n\n・Trueは言い換えで隠されている。単語ではなく意味で照合\n\n次のレッスンは、段落と見出しを結びつけるマッチング問題です。',
    '• Three steps: match → True, contradict → False, silent → Not Given.\n\n• The text is the only evidence; common sense is banned.\n\n• Added reasons, feelings or causes → suspect Not Given.\n\n• Weigh extreme words (every / all / only) against the text.\n\n• True hides behind paraphrase — match meanings, not words.\n\nNext lesson: matching headings to paragraphs.',
  ),
]
// ── L5 見出しマッチング ──────────────────────────────────────────────────
const L5_SCREENS = [
  // 1. concept hook
  con(
    '見出しは段落の「主役」を言い当てる',
    'A heading names the paragraph’s main act',
    '見出しマッチングは、段落のリストと見出しのリストを正しく結びつける問題。一見シンプルですが、正答率は低めです。\n\n理由ははっきりしています。不正解の見出しが、段落の中の1つの詳細とは一致するように作られているから。\n\n段落には主役（段落全体を貫くテーマ）と脇役（例・データ・補足）がいます。見出しが言い当てるべきは主役だけ。脇役に一致する見出しは、どんなに「本文にある」内容でも不正解です。\n\nリスニングの「mentioned ≠ correct」と同じ構図ですね。書いてある ≠ 見出しになる、です。',
    'Heading matching looks simple and scores poorly — because wrong headings are engineered to match ONE detail inside the paragraph. Every paragraph has a main act (the through-line) and supporting cast (examples, data, asides). A heading must name the main act; a heading that matches only a supporting detail is wrong no matter how clearly that detail appears in the text. Same logic as Listening’s “mentioned ≠ correct”: present in the paragraph ≠ the heading.',
  ),
  // 2. practice: detail trap
  q(
    '段落の「主役」はどれか考えてから、見出しを選んでください。',
    '【段落】\nThe city’s bike-share scheme has grown faster than anyone predicted. In its first year, riders made half a million trips, and the number of docking stations has already tripled. A smartphone app, introduced last spring, lets users check where bikes are available. Officials now describe the scheme as the most successful transport project in a decade.\n\nQ: この段落に最も合う見出しは？',
    ['A new smartphone app for cyclists', 'The rapid growth of a bike-share scheme', 'The history of the city’s transport projects'],
    1,
    'アプリの話は確かに本文にあります——でも1文だけ。段落全体を貫いているのは「予想を超える成長」（50万回の利用、ステーション3倍、過去10年で最も成功）です。\n\n(A)のような「1つの詳細だけ拾った見出し」が、このタイプの代表的なワナ。見出し候補が段落の何文をカバーしているか、と考えると見破れます。',
    'The app IS in the text — for exactly one sentence. The through-line is runaway growth: half a million trips, tripled stations, “most successful in a decade”. Option (A) is the signature trap: a heading built from a single detail. Ask how many sentences each candidate heading covers, and the trap collapses.',
  ),
  // 3. concept: first/last sentence strategy
  con(
    '最初の文と最後の文を読む',
    'Read the first and last sentences',
    '段落の主役は、たいてい決まった場所にいます。\n\n基本は最初の文。英語の段落は「主題文→裏付け」の順で書かれることが多いからです。まず第1文を読み、見出し候補と照らす。\n\nただし例外があります。第1文が問いかけや具体例で始まる「つかみ」型の段落では、主役は最後の文で種明かしされることが多い。\n\nおすすめの手順：①第1文を読む → ②ピンとくる見出しがあれば仮置き → ③最終文で確認。中間の文は、候補が2つに絞れて迷ったときだけ精読すれば十分です。',
    'The main act usually stands in a predictable spot: the FIRST sentence, since English paragraphs tend to run topic-sentence-then-support. Read sentence one, test it against the headings. The exception: paragraphs that open with a question or an anecdote as a hook — there the reveal often waits in the LAST sentence. Routine: read the first sentence → pencil in a heading → confirm with the last sentence. Only close-read the middle when two candidates survive.',
    '第1文「The city’s bike-share scheme has grown faster than anyone predicted.」\n→ この時点で「成長」の見出しに仮置きできる',
  ),
  // 4. practice: topic sentence first
  q(
    '第1文に注目して、見出しを選んでください。',
    '【段落】\nWorking from home has quietly changed how people use their neighbourhoods. Cafés that once served morning commuters now fill with laptop workers at midday. Local shops report steadier trade through the week, and several suburban high streets have gained their first lunchtime gyms.\n\nQ: この段落に最も合う見出しは？',
    ['How remote work is reshaping local areas', 'Why cafés are losing their customers', 'The rise of suburban gyms'],
    0,
    '第1文「在宅勤務が地域の使われ方を変えた」がそのまま主題文で、カフェ・商店・ジムはすべてその具体例です。\n\n(B)はカフェの客はむしろ増えているので本文と逆、(C)はジムという脇役を主役に昇格させたワナ。主題文がきれいに最初に来る、いちばん素直なパターンでした。',
    'Sentence one — remote work has changed how neighbourhoods are used — IS the topic sentence; cafés, shops and gyms are all illustrations of it. (B) contradicts the text (cafés are busier, not emptier) and (C) promotes a supporting detail to the title role. The cleanest pattern: topic sentence first.',
  ),
  // 5. practice: reveal at the end
  q(
    '第1文が「つかみ」のときは、最後の文を確認しましょう。',
    '【段落】\nHow did anyone wake up on time before alarm clocks? In industrial-era Britain, a “knocker-up” walked the streets at dawn, tapping on bedroom windows with a long pole until the sleeper appeared. The trade survived in some northern towns into the 1970s. It is a reminder that even the most ordinary machines once had a human doing their job.\n\nQ: この段落に最も合う見出しは？',
    ['Life in industrial-era Britain', 'How alarm clocks were invented', 'A human job that machines replaced'],
    2,
    '第1文は問いかけの「つかみ」で、主役は最終文 even the most ordinary machines once had a human doing their job に出てきます。knocker-up はその実例です。\n\n(A)は広すぎ（産業時代の生活全般の話ではない）、(B)は本文にない話。つかみ型の段落では、最後の文が見出しの答えを持っています。',
    'The opener is a hook question; the reveal arrives in the last sentence — ordinary machines once had humans doing their job — with the knocker-up as the worked example. (A) is far too broad and (B) never happens in the text. In hook-style paragraphs, the final sentence holds the heading.',
  ),
  // 6. concept: distractor anatomy
  con(
    'ワナ見出しの3類型',
    'The three species of trap heading',
    '不正解の見出しは、だいたい3種類に分類できます。\n\n①詳細型：段落内の1文・1例とだけ一致する（最多のワナ）\n\n②広すぎ型：段落を含むけれど、章全体・分野全体レベルに大きすぎる\n\n③逆向き型：段落のテーマは合っているが、方向が逆（増えた⇔減った、利点⇔欠点）\n\n見出しを選んだら、最後にこのチェックを。「この見出しは、段落のほぼ全部の文をカバーしているか？大きすぎないか？方向は合っているか？」\n\n3つのYesがそろえば確定です。',
    'Trap headings come in three species: 1) the DETAIL trap — matches one sentence or example (the most common); 2) the TOO-BROAD trap — contains the paragraph but at chapter scale; 3) the REVERSED trap — right topic, wrong direction (rise vs. fall, benefit vs. drawback). Final check before committing: does my heading cover nearly every sentence? Is it the right size? Does it point the right way? Three yeses → lock it in.',
  ),
  // 7. practice
  q(
    '3つのチェック（カバー率・サイズ・方向）で選んでください。',
    '【段落】\nNot all plastic recycling is equal. Clear drinks bottles can be turned back into bottles many times over, but coloured plastics are usually “downcycled” into lower-grade products such as park benches or fleece fibres. Once plastic reaches that stage, it can rarely be recycled again.\n\nQ: この段落に最も合う見出しは？',
    ['Why park benches are made from plastic', 'The limits of plastic recycling', 'How to sort your household waste'],
    1,
    '段落全体を貫くのは「リサイクルには限界・格差がある」という話。第1文 Not all plastic recycling is equal がそのまま予告しています。\n\n(A)はベンチという1例を主役にした詳細型のワナ、(C)は本文にない話題。limits という言葉が、ボトル⇔ダウンサイクルの対比と最終文の rarely recycled again をきれいにカバーします。',
    'The through-line — announced by “Not all plastic recycling is equal” — is recycling’s limits and inequalities. (A) is a detail trap built on the bench example; (C) never appears. “Limits” covers the bottle/downcycling contrast and the final “rarely recycled again” in one word.',
  ),
  // 8. practice
  q(
    '仕上げの1問。手順どおりに：第1文 → 仮置き → 最終文で確認。',
    '【段落】\nThe Alhambra Theatre reopened its doors in May after a three-year closure. Stonemasons cleaned the Victorian façade block by block, while inside, the auditorium gained wider seating and modern acoustics. Within a fortnight, ticket sales for the opening season had passed the theatre’s full-year target.\n\nQ: この段落に最も合う見出しは？',
    ['A successful reopening after major restoration', 'The decline of Victorian theatre buildings', 'How theatre tickets are priced'],
    0,
    '第1文で「3年の閉鎖を経て再開」、中間で修復の中身、最終文で「チケットが年間目標を2週間で突破」＝成功。見出し(A)は再開・修復・成功の3要素をすべてカバーします。\n\n(B)は方向が逆（衰退ではなく復活）、(C)は本文にない話。チェック3つ——カバー率・サイズ・方向——が全部Yesになるのは(A)だけです。',
    'Sentence one: reopened after three years. Middle: the restoration work. Last sentence: sales smash the target — success. (A) covers all three beats. (B) points the wrong way (revival, not decline) and (C) never appears. Only (A) passes all three checks: coverage, size, direction.',
  ),
  // 9. recap
  con(
    'まとめ：主役にだけ見出しを',
    'Recap: headings go to the main act only',
    '・見出しは段落の主役（全体を貫くテーマ）を言い当てる\n\n・1つの詳細と一致するだけの見出しは最多のワナ\n\n・第1文を読む → 仮置き → 最終文で確認。つかみ型は最終文に主役\n\n・最終チェック：カバー率・サイズ・方向\n\n次は、語数制限との戦い——空所補充と要約完成です。',
    '• A heading names the paragraph’s through-line, never a detail.\n\n• Detail-only headings are the most common trap.\n\n• First sentence → pencil in → confirm with the last; hooks reveal late.\n\n• Final check: coverage, size, direction.\n\nNext: the war with word limits — completion and summary tasks.',
  ),
]
// ── L6 空所補充と要約 ────────────────────────────────────────────────────
const L6_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。語数制限に注意して、満点になる答え方を選んでください。',
    '【指示】Complete the sentence. Write NO MORE THAN TWO WORDS.\n\n【本文の該当箇所】\n… visitors can borrow audio guides free of charge at the information desk …\n\n【設問】Audio guides are available from the ______.',
    ['the information desk', 'information desk', 'desk for information'],
    1,
    'NO MORE THAN TWO WORDS（2語以内）なので、3語の (A) はその時点で0点。内容が完璧でも、です。(C) は語数こそ2語…ではなく3語ですし、本文の表現を勝手に組み替えています。\n\n正解は本文の言葉をそのまま2語に収めた information desk。語数制限は「努力目標」ではなく絶対ルール——これが空所補充の第一歩です。',
    '“NO MORE THAN TWO WORDS” kills (A) on arrival — three words score zero however correct the content. (C) rearranges the text’s wording (and is also three words). The mark goes to the text’s own words trimmed to fit: “information desk”. Word limits are law, not guidance.',
  ),
  // 2. concept: word-limit rules
  con(
    '語数ルールの読み方',
    'How to read the word-limit rules',
    '指示文には数パターンあります。\n\n・ONE WORD ONLY ＝ 1語だけ\n・NO MORE THAN TWO WORDS ＝ 2語以内（1語でもOK）\n・NO MORE THAN TWO WORDS AND/OR A NUMBER ＝ 2語以内＋数字も使える\n\n数え方のルールも決まっています。\n\n・a ／ the などの冠詞も1語と数える\n・ハイフンでつながった語（part-time）は1語\n・数字は 20 と書けば「a number」、twenty と書けば1語\n\nだから迷ったら数字は算用数字で書くのが安全。そして答えを書いたら、指を折って語数を数える——この5秒を惜しまないでください。',
    'The instruction line varies: ONE WORD ONLY; NO MORE THAN TWO WORDS (one is fine too); NO MORE THAN TWO WORDS AND/OR A NUMBER. Counting rules are fixed: articles (a/the) count as words; hyphenated forms (part-time) count as one; “20” counts as a number but “twenty” counts as a word — so digits are the safe choice. After writing, count on your fingers. Those five seconds save real marks.',
    'NO MORE THAN TWO WORDS のとき：\n× the information desk（3語）\n○ information desk（2語）\n○ desk（1語）',
  ),
  // 3. gap fill
  gap(
    '2語以内で答えてください（NO MORE THAN TWO WORDS）。',
    '【本文】\nThe community garden was created on the site of a disused car park. Volunteers cleared the ground over the spring, and the first vegetables were harvested in August.\n\n【設問】The garden was built where a ______ used to be.',
    ['car park', 'carpark', 'disused car park'],
    '本文の on the site of a disused car park（使われなくなった駐車場の跡地に）が根拠。設問の built where 〜 used to be は created on the site of の言い換えです。\n\n答えは本文の言葉そのまま car park。「跡地」の意味を自分の言葉で説明し始めたら、その時点で道を外れています。',
    'The evidence is “created on the site of a disused car park”, with “built where ~ used to be” as the question’s paraphrase of it. The answer is the text’s own words: car park. The moment you start explaining the idea in your own words, you have left the road.',
  ),
  // 4. concept: grammatical fit
  con(
    '空所の前後が品詞を教えてくれる',
    'The words around the gap dictate the grammar',
    '空所補充には、本文を探す前にできる準備があります。空所の前後を見て、入るべき形を決めておくことです。\n\n・a ／ the の直後 → 名詞（かたまり）\n・will ／ must の直後 → 動詞の原形\n・by ／ in ／ at の直後 → 名詞\n・two ／ many の直後 → 複数形の名詞\n\n完成した文は、文法的に正しい英文になるはず。だから候補を入れたら必ず文ごと読み直す。単数・複数のズレ（two photograph ←アウト）は、それだけで失点です。\n\n「形を決めてから探す」と、本文のどの語を抜けばいいかが一気に絞れます。',
    'Before hunting in the passage, let the gap’s surroundings dictate the form: after a/the → a noun; after will/must → a base verb; after by/in/at → a noun; after two/many → a PLURAL noun. The completed sentence must be grammatical English, so always re-read the whole line with your candidate in place — “two photograph” loses the mark by itself. Decide the form first, and the passage hunt narrows dramatically.',
  ),
  // 5. practice: grammar fit
  q(
    '文法的に成立するものを選んでください。',
    '【設問】The new library will ______ to the public in September.\n\n空所に入れて正しい英文になるのはどれ？',
    ['opening', 'openness', 'open'],
    2,
    'will の直後に来られるのは動詞の原形だけ。will open が正解です。\n\nwill opening も will openness も、英文として成立しません。本文に opening という単語が見えても、文法が合わなければ抜き出す語が違うというサイン。空所の前後の文法は、答え探しの最強のフィルターです。',
    'After “will”, only a base verb survives: “will open”. Even if the passage shows the word “opening”, a candidate that breaks the grammar is the wrong extraction. The gap’s grammar is your strongest filter.',
  ),
  // 6. gap fill: summary completion
  gap(
    '要約の空所を、本文の言葉で埋めてください（2語以内）。',
    '【本文】\nBefore the bridge was built, the only way across the river was a small passenger ferry, which stopped running whenever the weather turned rough. Local businesses campaigned for a permanent crossing for almost twenty years.\n\n【要約】\nUntil the bridge opened, people crossed the river by ______, a service that could not operate in bad weather.',
    ['ferry', 'passenger ferry'],
    '要約文の could not operate in bad weather は、本文の stopped running whenever the weather turned rough の言い換え。その主語にあたるのが passenger ferry です。by のあとなので名詞、2語以内なので ferry か passenger ferry。\n\n要約完成は「本文→要約」の言い換え対応を見つけて、対応箇所から語を抜く問題。探す場所さえ合えば、答えは本文に置いてあります。',
    'The summary’s “could not operate in bad weather” paraphrases “stopped running whenever the weather turned rough” — and the subject of that clause is the passenger ferry. After “by” we need a noun, within two words: “ferry” or “passenger ferry”. Summary completion is paraphrase-mapping: find the matching passage, then lift the words that are already there.',
  ),
  // 7. practice: exact words
  q(
    '満点になる答えはどれ？（NO MORE THAN TWO WORDS）',
    '【本文の該当箇所】\n… the hotel’s rooftop restaurant is open to non-residents during the summer months …\n\n【設問】Non-residents may use the rooftop restaurant in the ______.',
    ['summer months', 'warm season', 'summertime period'],
    0,
    '本文に summer months とあるのだから、それをそのまま使います。(B)や(C)のような「意味は近い自分の言葉」は、空所補充では減点リスクしかありません。\n\nライティングでは言い換えが武器になりますが、空所補充は逆。本文の言葉を、本文のスペルのまま。これが鉄則です。',
    'The text says “summer months” — so write “summer months”. Near-synonyms of your own invention, like (B) and (C), carry nothing but risk here. Paraphrase is a weapon in Writing; in completion tasks the rule is the opposite: the passage’s words, in the passage’s spelling.',
  ),
  // 8. gap fill
  gap(
    '仕上げの1問。形を決めてから本文を探しましょう（2語以内）。',
    '【本文】\nApplicants should send a completed form and two recent photographs to the address below. Please note that applications sent by email cannot be accepted.\n\n【設問】Along with the form, applicants must send two ______.',
    ['photographs', 'recent photographs', 'photos'],
    'two の直後なので複数形の名詞。本文の two recent photographs から photographs を抜き出します（recent photographs でも2語以内でOK）。\n\nphotograph と単数で書くと、内容が合っていても文法エラーで失点。「形を決める→探す→文ごと読み直す」の3点セット、身につきましたか？',
    'After “two” the gap demands a plural noun: “photographs” (or “recent photographs”, still within the limit). Singular “photograph” fails on grammar alone. Decide the form → hunt → re-read the whole sentence: the full routine.',
  ),
  // 9. recap
  con(
    'まとめ：本文の言葉を、制限内で',
    'Recap: the passage’s words, within the limit',
    '・語数制限は絶対ルール。書いたら指折り数える（冠詞も1語、ハイフン語は1語）\n\n・数字は算用数字で書くのが安全\n\n・空所の前後の文法で、入る形を先に決める\n\n・答えは本文の言葉をそのまま。自分の言い換えは使わない\n\n・入れたら文ごと読み直して、単複と文法を確認\n\nリーディング攻略はここまで。次のレベルはライティング、まずはGT Task 1の手紙からです。',
    '• Word limits are law — count on your fingers (articles count; hyphenated = one).\n\n• Digits are the safe way to write numbers.\n\n• Let the gap’s grammar decide the form before you hunt.\n\n• Use the passage’s exact words, never your own paraphrase.\n\n• Re-read the completed sentence for number and grammar.\n\nThat completes Reading. Next level: Writing, starting with GT Task 1 letters.',
  ),
]
// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — ライティング攻略
// ════════════════════════════════════════════════════════════════════════════

// ── L7 手紙の書き方（GT Task 1）──────────────────────────────────────────
const L7_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。場面に合う書き出しを選んでください。',
    'あなたは市の図書館に、なくした会員カードの再発行を依頼する手紙を書きます。担当者の名前はわかりません。書き出しは？',
    ['Hey there!', 'Dear Sir or Madam,', 'Dear Library,'],
    1,
    '相手は知らない人（組織の担当者）なので、フォーマルな手紙。名前を知らない相手への定番の書き出しは Dear Sir or Madam, です。\n\n(A)は友達向け、(C)は建物宛てになってしまいます。GT Task 1の採点では、場面に合った丁寧さ（レジスター）が大きな評価項目。手紙は最初の1行から採点が始まっています。',
    'You are writing to a stranger at an organisation — a formal letter — and the standard opener when you don’t know the name is “Dear Sir or Madam,”. (A) greets a friend; (C) addresses a building. Register (matching your tone to the situation) is a major scoring criterion, and it starts on line one.',
  ),
  // 2. concept: three registers
  con(
    '3つのレジスターと、開き・結びのペア',
    'Three registers, with matching openings and closings',
    'GT Task 1の手紙は、相手との関係で3種類に分かれます。\n\n①フォーマル（名前を知らない相手：会社・役所など）\nDear Sir or Madam, ↔ Yours faithfully,\n\n②セミフォーマル（名前を知っている、でも親しくはない：大家さん・上司など）\nDear Mr Tanaka, ↔ Yours sincerely,\n\n③インフォーマル（友人・家族）\nDear Ken, ↔ Best wishes, ／ See you soon,\n\n覚え方：名前を知らなければ faithfully、知っていれば sincerely。そして friend に faithfully は使わない。開きと結びはペアで暗記してください。ちぐはぐな組み合わせ（Dear Ken, … Yours faithfully,）は、それだけで減点対象です。',
    'Letters split into three registers by relationship: FORMAL (no name known — company, council): Dear Sir or Madam, ↔ Yours faithfully. SEMI-FORMAL (named but not close — landlord, manager): Dear Mr Tanaka, ↔ Yours sincerely. INFORMAL (friend or family): Dear Ken, ↔ Best wishes / See you soon. Memory hook: no name → faithfully; a name → sincerely; and never “Yours faithfully” to a friend. Learn openings and closings as PAIRS — a mismatched pair loses marks by itself.',
    '名前を知らない → Dear Sir or Madam, ＋ Yours faithfully,\n名前を知っている → Dear Mr Tanaka, ＋ Yours sincerely,\n友達 → Dear Ken, ＋ See you soon,',
  ),
  // 3. practice: closing match
  q(
    '開きと結びはペアです。',
    '手紙を Dear Sir or Madam, で始めました。結びとして正しいのは？',
    ['Yours faithfully,', 'See you soon,', 'Yours sincerely,'],
    0,
    'Dear Sir or Madam,（名前を知らない）とペアになるのは Yours faithfully, です。\n\nYours sincerely, は Dear Mr Tanaka, のように名前で呼びかけたときの結び。この組み合わせは試験の世界では固定ルールなので、理屈抜きでペアごと覚えるのが早道です。',
    '“Dear Sir or Madam,” pairs with “Yours faithfully,”. “Yours sincerely,” belongs to letters that open with a name. In exam land this pairing is a fixed convention — memorise the pairs whole.',
  ),
  // 4. practice: informal phrase
  q(
    '場面に合うトーンを選んでください。',
    '引っ越しを手伝ってくれた友人に、お礼の手紙を書きます。お礼の一文として自然なのは？',
    ['I am writing to express my sincere gratitude for your assistance.', 'I hereby acknowledge your kind contribution to the relocation.', 'Thanks a million for helping me move — I couldn’t have done it without you.'],
    2,
    '友人への手紙はインフォーマル。Thanks a million（本当にありがとう）や短縮形（couldn’t）が自然です。\n\n(A)(B)は文法的には正しくても、友達に向けた言葉としては不自然なほど堅い。「正しい英語」ではなく「場面に合う英語」が採点されるのが手紙問題です。役所文体で友達に書くと、Task Achievement（課題達成）で減点されます。',
    'A letter to a friend is informal: “Thanks a million” and contractions like “couldn’t” are exactly right. (A) and (B) are grammatical but absurdly stiff for a friend. The letter task grades situational fit, not just correctness — writing to a friend in bureaucrat-speak costs Task Achievement marks.',
  ),
  // 5. concept: the 3-bullet rule
  con(
    '3つの箇条書きは「契約書」',
    'The three bullet points are a contract',
    '手紙の問題文には、必ず3つの箇条書きが付いています。\n\nWrite a letter to your landlord. In your letter:\n・describe the problem（問題を説明し）\n・explain how it affects you（影響を述べ）\n・say what you want the landlord to do（してほしいことを伝える）\n\nこの3点は「全部書いてください」という契約です。1つでも落とすと、どんなに美しい英語でもTask Achievementのバンドに上限がかかります。\n\nおすすめの型：箇条書き1つ＝本文1段落。書く前の30秒で「①故障の状況 ②寒くて在宅勤務に支障 ③今週中の修理依頼」のようにメモすれば、構成は自動的に完成します。',
    'Every letter prompt carries three bullet points — and they are a contract: cover ALL three or your Task Achievement band is capped, however beautiful the English. The reliable shape: one bullet = one body paragraph. Thirty seconds of planning (“① what broke ② how it affects me ③ what I want done”) and the structure writes itself.',
  ),
  // 6. practice: plan coverage
  q(
    'どのプランが3つの箇条書きをすべてカバーしていますか？',
    '【課題】大家さんに手紙を書く。In your letter:\n・describe the problem with the heating\n・explain how it affects you\n・say what you would like the landlord to do\n\n3段落のプランとして正しいのは？',
    ['①暖房が壊れた状況を説明 ②建物の他の不満も列挙 ③これまでの感謝を伝える', '①暖房が壊れた状況を説明 ②寒くて在宅勤務に支障が出ていると説明 ③今週中の修理を依頼', '①自己紹介と入居の経緯 ②暖房の故障を説明 ③返事を待っていますと結ぶ'],
    1,
    '(B)だけが「問題→影響→依頼」の3点をすべて踏んでいます。\n\n(A)は2つ目の箇条書き（自分への影響）が抜け、関係のない不満に脱線。(C)は影響と依頼が抜けています。書き終わったら箇条書きを1つずつ指差して「書いたか？」と確認する——この習慣だけでTask Achievementは安定します。',
    'Only (B) walks through problem → effect → request. (A) skips the “how it affects you” bullet and wanders into unrelated complaints; (C) misses both the effect and the request. After writing, point at each bullet and ask “did I cover this?” — that one habit stabilises your Task Achievement score.',
  ),
  // 7. practice: register break
  q(
    'レジスターは最後まで一貫させます。',
    '友人への手紙の一部です。1文だけトーンが浮いています。どれ？',
    ['Should you require further information, please do not hesitate to contact me.', 'I was so happy to hear about your new job!', 'Let’s grab a coffee soon and celebrate properly.'],
    0,
    '(A)はビジネスレターの定型文。友人への手紙に混ざると、急にスーツを着たような違和感が出ます。\n\nこの「1通の中でのトーンの揺れ」は採点者がよく見るポイント。書き出しで決めたレジスターを、結びまで一貫させましょう。友人になら If you want to know more, just ask! で十分です。',
    '(A) is boilerplate from a business letter — mid-letter it reads like suddenly putting on a suit. Tone consistency within one letter is something examiners actively check: keep the register you chose in line one all the way to the sign-off. For a friend, “If you want to know more, just ask!” does the job.',
  ),
  // 8. gap fill
  gap(
    'ペアで覚えた結びを書いてください（1語）。',
    'Dear Sir or Madam, で始めた手紙の結び：\n\nYours ______,',
    ['faithfully'],
    '名前を知らない相手への手紙は Dear Sir or Madam, ↔ Yours faithfully, のペア。\n\nスペルにも注意：faithfully は full に -ly ではなく、faithful ＋ -ly で l が2つ続きます。結びの1語のスペルミスは、最後の最後で印象を落とすので丁寧に。',
    'No name known → Dear Sir or Madam ↔ Yours faithfully. Mind the spelling: faithful + -ly gives the double L. A misspelled sign-off is a sour final note — finish clean.',
  ),
  // 9. recap
  con(
    'まとめ：レジスターと3点カバー',
    'Recap: register plus full bullet coverage',
    '・相手との関係でレジスターを決める：知らない→フォーマル、名前を知る→セミフォーマル、友人→インフォーマル\n\n・開きと結びはペア：Sir or Madam↔faithfully、名前↔sincerely、友人↔See you soon\n\n・3つの箇条書きは契約。1つ＝1段落で全部カバー\n\n・トーンは1通の中で一貫させる\n\n次は、Academic Task 1のグラフ描写です。',
    '• Choose register by relationship: stranger → formal, named → semi-formal, friend → informal.\n\n• Openings and closings come in pairs: Sir or Madam ↔ faithfully; a name ↔ sincerely; a friend ↔ see you soon.\n\n• The three bullets are a contract — one paragraph each.\n\n• Keep the tone consistent to the sign-off.\n\nNext: describing charts in Academic Task 1.',
  ),
]
// ── L8 グラフ描写（Academic Task 1）──────────────────────────────────────
const L8_SCREENS = [
  // 1. concept hook
  con(
    'Task 1はレポート。エッセイではない',
    'Task 1 is a report, not an essay',
    'Academic Task 1では、グラフや表を見て150語以上で説明します。ここで多くの受験者が踏む地雷がこれ——意見を書いてしまうこと。\n\nやることは「データに見えること」の報告だけです。\n\n・主要な特徴を選ぶ（全データの読み上げはしない）\n・比較する（AはBの2倍、など）\n\nやってはいけないこと：\n\n・意見（I think people should drive less.）\n・データにない理由の推測（おそらくガソリン価格のせいで…）\n\nあなたはジャーナリストではなく、計器の読み上げ係。見えるものだけを、正確な英語で。',
    'Academic Task 1 asks for a 150-word description of a chart — and the classic landmine is writing OPINIONS. Your job is to report what the data shows: select the main features (don’t read out every number) and compare. Banned: opinions (“I think people should drive less”) and invented causes (“probably because of petrol prices”). You are not a journalist; you are the instrument reader. Only what is visible, in precise English.',
    '【データ】通勤手段「車」: 2005年 55% → 2020年 30%\n○ Car use fell sharply, from 55% to 30%.\n× I think people should drive less.（意見はNG）',
  ),
  // 2. practice
  q(
    'データを見て、正しく描写した文を選んでください。',
    '【データ】映画館の年間入場者数\n2010年: 120万人 → 2020年: 250万人',
    ['Cinema attendance remained stable over the decade.', 'Cinema attendance fell slightly between 2010 and 2020.', 'Cinema attendance more than doubled between 2010 and 2020.'],
    2,
    '120万→250万は2倍を超える増加なので、more than doubled（2倍以上になった）が正確です。\n\nTask 1の文は「データと突き合わせて真偽を判定できる文」でなければなりません。stable（横ばい）も fell（減少）も、データを見れば即アウト。数字→英語の変換が正確かどうか、それだけが勝負です。',
    '1.2m → 2.5m is more than a twofold rise: “more than doubled”. Every Task 1 sentence must be checkable against the data — “stable” and “fell” are instantly falsifiable here. The whole game is converting numbers into accurate English.',
  ),
  // 3. concept: trend language bank
  con(
    'トレンド表現の語彙バンク',
    'The trend-language bank',
    'グラフ描写の語彙は、実は少数精鋭で足ります。\n\n上昇：rose ／ increased ＋ sharply（急に）・steadily（着実に）・slightly（わずかに）\n\n下降：fell ／ dropped ／ declined ＋ 同じ副詞\n\n横ばい：remained stable ／ stayed constant\n\n倍率：doubled（2倍）／ halved（半減）／ more than doubled\n\n頂点・底：peaked at 80% ／ fell to a low of 5%\n\n基本の型は「主語＋動詞＋副詞＋期間」。Car use fell sharply between 2005 and 2020. この型に語彙バンクから部品をはめれば、どんなグラフでも文が作れます。',
    'Chart language is a small, high-value vocabulary: rises (rose / increased + sharply / steadily / slightly), falls (fell / dropped / declined + the same adverbs), flat lines (remained stable / stayed constant), multiples (doubled / halved / more than doubled), extremes (peaked at 80% / fell to a low of 5%). The frame is SUBJECT + VERB + ADVERB + PERIOD: “Car use fell sharply between 2005 and 2020.” Slot the bank’s parts into that frame and any chart becomes writable.',
  ),
  // 4. practice
  q(
    'データに対して正確な描写はどれ？',
    '【データ】バス運賃の推移\n2015年: £2.00 → 2016年: £2.05 → 2017年: £2.05 → 2018年: £2.10',
    ['Bus fares rose only slightly over the period.', 'Bus fares doubled in three years.', 'Bus fares fell steadily after 2016.'],
    0,
    '£2.00→£2.10は3年で5%の上昇。rose only slightly（わずかに上昇）がぴったりです。\n\ndoubled なら£4.00になっていないといけませんし、fell は方向が逆。副詞の選択（sharply か slightly か）まで含めて、データと一致して初めて正解です。',
    '£2.00 → £2.10 is a 5% rise over three years — “rose only slightly”. “Doubled” would need £4.00, and “fell” points the wrong way. Accuracy includes the adverb: sharply vs. slightly is part of the claim.',
  ),
  // 5. practice: spot the opinion
  q(
    'Task 1に書いてはいけない文が1つあります。どれ？',
    '通勤手段のグラフを描写した3文：',
    ['The proportion of people cycling to work doubled over the period.', 'Cycling is clearly the best way to get to work.', 'Car use fell from 55% to 40%, the largest decline of any transport mode.'],
    1,
    '(B)は意見です。best という評価語が出た時点で、データの報告ではなくなっています。\n\n(A)(C)は数字と突き合わせて検証できる事実の文。Task 1では think ／ should ／ best ／ unfortunately のような意見・感情の言葉が出てきたら赤信号、と覚えてください。意見はTask 2で思う存分どうぞ。',
    '(B) is an opinion — the evaluative “best” disqualifies it as data reporting. (A) and (C) are verifiable factual claims. In Task 1, treat think / should / best / unfortunately as red flags. Save the opinions for Task 2, where they belong.',
  ),
  // 6. concept: the overview
  con(
    'オーバービュー：採点者が最初に探す1文',
    'The overview: the sentence examiners hunt for',
    'Task 1の答案でバンド6と7を分けるのが、オーバービュー（全体観の1文）です。\n\n・書き出しの言い換え（The chart shows…）のすぐあとに置く\n\n・Overall, で始めるのが定番\n\n・具体的な数字は入れない。一番大きな傾向だけを2つ程度\n\n例：Overall, car use declined considerably over the period, while cycling grew to become the second most common way to travel.\n\n細かい数字は本文の段落で。オーバービューは「遠くから見たら何が起きているか」を言う1〜2文です。これがない答案は、どんなに数字が正確でもTask Achievementで頭打ちになります。',
    'The overview separates band 6 from band 7. Place it right after your one-sentence paraphrase of the task; open with “Overall,”; include NO specific numbers — just the one or two biggest trends. Example: “Overall, car use declined considerably, while cycling grew to become the second most common way to travel.” Details live in the body paragraphs; the overview says what the chart looks like from a distance. Without one, the most numerically perfect answer still hits a Task Achievement ceiling.',
  ),
  // 7. practice: pick the overview
  q(
    'オーバービューとして最も良い文を選んでください。',
    '【データ】自宅のインターネット利用率（2010年→2020年）\n若年層: 95% → 98%　／　高齢層: 30% → 75%',
    ['In 2010, 30% of older people had internet access at home.', 'Overall, I believe the internet has greatly improved everyone’s daily life.', 'Overall, home internet use rose in both age groups, with by far the biggest growth among older people.'],
    2,
    '(C)は「両グループで上昇、特に高齢層の伸びが大きい」という最大の傾向だけを、数字なしでまとめています。これがオーバービューの教科書形です。\n\n(A)は1つの数字の読み上げ（本文の段落でやること）、(B)は Overall で始まっていても中身が意見。形ではなく役割で判定しましょう。',
    '(C) captures the biggest pattern — growth in both groups, dominated by the older one — with zero specific numbers: textbook overview. (A) reads out a single data point (body-paragraph work), and (B) starts with “Overall” but is an opinion in disguise. Judge by function, not by the opening word.',
  ),
  // 8. gap fill
  gap(
    'トレンド表現を完成させてください（1語）。',
    '【データ】来館者数：6月 1,800人 → 7月 1,800人 → 8月 1,820人\n\n【描写】Visitor numbers ______ stable between June and August.',
    ['remained', 'stayed', 'were', 'held'],
    '数字がほぼ動いていないので remained stable（または stayed stable）。「横ばい」はグラフ頻出なのに書ける人が少ない、差がつく表現です。\n\nバリエーションとして stayed constant ／ levelled off（横ばいになった）も一緒にバンクへどうぞ。',
    'The numbers barely move: “remained (or stayed) stable”. Flat lines appear in almost every chart yet few candidates can write them — easy marks. Add “stayed constant” and “levelled off” to the bank while you’re here.',
  ),
  // 9. recap
  con(
    'まとめ：見えるものを、正確に',
    'Recap: report what is visible, precisely',
    '・Task 1は報告。意見・推測の理由づけは書かない（think ／ should ／ best は赤信号）\n\n・語彙バンク：rose sharply ／ fell slightly ／ remained stable ／ more than doubled ／ peaked at\n\n・型は「主語＋動詞＋副詞＋期間」\n\n・オーバービューを必ず書く：Overall, ＋最大の傾向、数字なし\n\n・すべての文がデータで検証可能かチェック\n\n次は配点最大、Task 2エッセイの型です。',
    '• Task 1 reports; it never opines (think / should / best = red flags).\n\n• The bank: rose sharply / fell slightly / remained stable / more than doubled / peaked at.\n\n• Frame: subject + verb + adverb + period.\n\n• Always write the overview: “Overall,” + biggest trends, no numbers.\n\n• Every sentence must be checkable against the data.\n\nNext: the highest-stakes task — the Task 2 essay skeleton.',
  ),
]
// ── L9 エッセイの型（Task 2）─────────────────────────────────────────────
const L9_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。設問のタイプを見極めてください。',
    '【設問】\n“Some people think all children should learn a musical instrument at school. To what extent do you agree or disagree?”\n\nこの問題はどのタイプ？',
    ['意見型：自分の立場を決めて、最後まで貫く', '両論型：両方の見方を論じてから自分の意見を述べる', '原因解決型：問題の原因と解決策を述べる'],
    0,
    'To what extent do you agree or disagree?（どの程度賛成/反対か）は意見型のサイン。求められているのは、立場を決めて一貫して主張することです。\n\nここで「賛成の意見もあれば反対の意見もある」と両論併記を始めると、設問に答えていないと判定されます。タイプの見極めを外すと、英語力に関係なくTask Responseが沈む——だから最初の10秒で必ずタイプ判定をします。',
    '“To what extent do you agree or disagree?” marks an OPINION question: pick a side and argue it consistently. Slip into “some agree, some disagree” fence-sitting and you are judged off-task. Misreading the type sinks Task Response regardless of your English — so spend the first ten seconds identifying it, every time.',
  ),
  // 2. concept: skeleton + types
  con(
    '4段落の骨格と、2大設問タイプ',
    'The four-paragraph skeleton and the two big question types',
    'Task 2は、どんなテーマが来てもこの骨格で書けます。\n\n①導入：設問の言い換え＋自分の立場（thesis）\n②本論1：理由その1＋具体例\n③本論2：理由その2＋具体例\n④結論：立場の再確認\n\nそして設問は2大タイプに分かれます。\n\n・意見型（agree or disagree?）：本論2つとも自分の立場を支える。または本論2で「反対意見への反論」\n\n・両論型（Discuss both views and give your own opinion）：本論1＝見方A、本論2＝見方B。自分の意見は導入と結論で明示\n\n両論型で片方の見方しか書かないのは最悪の失点パターン。both views は文字どおり「両方」です。',
    'One skeleton fits every Task 2: ① intro — paraphrase the question + your thesis; ② body 1 — first reason + example; ③ body 2 — second reason + example; ④ conclusion — restate your position. Questions split into two big types. OPINION (“agree or disagree?”): both bodies support your side, or body 2 rebuts the opposition. DISCUSS-BOTH-VIEWS: body 1 = view A, body 2 = view B, with YOUR opinion declared in the intro and conclusion. Covering only one view in a discuss-both question is the deadliest scoring mistake — “both” means both.',
    '意見型 → 本論1・2とも自分の立場を支える\n両論型 → 本論1＝見方A、本論2＝見方B＋自分の意見',
  ),
  // 3. practice: identify type
  q(
    'タイプを見極めてください。',
    '【設問】\n“Some people prefer to shop in large supermarkets, while others choose small local shops. Discuss both views and give your own opinion.”',
    ['意見型', '両論型', '原因解決型'],
    1,
    'Discuss both views and give your own opinion が両論型の決まり文句。本論1でスーパー派の言い分、本論2で地元商店派の言い分を論じ、自分の意見を導入と結論に置きます。\n\nwhile others 〜 のように2つの立場が並んでいる設問文も、両論型のヒントです。',
    '“Discuss both views and give your own opinion” is the discuss-both formula: body 1 for the supermarket case, body 2 for the local-shop case, your view stated in the intro and conclusion. A prompt that lines up two camps (“some… while others…”) is itself a hint.',
  ),
  // 4. concept: thesis statements
  con(
    'thesis：導入の最後で結論を予告する',
    'The thesis: announce your verdict at the end of the intro',
    '導入の最後の1文がthesis statement——「この答案の結論はこれです」という予告です。採点者はここで答案の地図を手に入れます。\n\n良いthesisの条件は2つ。\n\n①設問に直接答えている（賛成？反対？どちら寄り？）\n②理由をちらっと予告している\n\n意見型の例：I largely agree with this view, mainly because flexible work saves commuting time and improves family life.\n\n両論型の例：While supermarkets offer convenience, I believe small shops bring greater value to a community.\n\n避けたいのは This essay will discuss this topic. のような中身ゼロの文。立場も理由も見えないthesisは、ないのと同じです。',
    'The last sentence of your intro is the thesis — the spoiler that hands the examiner a map of your essay. A good thesis does two things: answers the question directly (agree? disagree? leaning where?) and flashes a preview of your reasons. Opinion type: “I largely agree, mainly because flexible work saves commuting time and improves family life.” Discuss-both: “While supermarkets offer convenience, I believe small shops bring greater value to a community.” The one to avoid: “This essay will discuss this topic.” — a thesis with no position and no reasons is no thesis at all.',
  ),
  // 5. practice: thesis for opinion type
  q(
    '意見型のthesisとして最も良いのは？',
    '【設問】\n“Working from home is better for employees than working in an office. To what extent do you agree or disagree?”\n\n導入の最後に置く1文を選んでください。',
    ['This essay will discuss the advantages and disadvantages of working from home.', 'Working from home has both good points and bad points.', 'I largely agree that remote work benefits employees, as it saves commuting time and allows a more flexible daily schedule.'],
    2,
    '(C)は立場（largely agree）も理由の予告（通勤時間・柔軟性）も入った、地図として機能するthesisです。\n\n(A)は「論じます」と言っただけで何も答えていません。(B)は両論併記の宣言で、意見型への答えになっていない——agree or disagree? には、どちらかに寄って答えるのがルールです。',
    '(C) works as a map: a position (“largely agree”) plus previewed reasons (commuting time, flexibility). (A) merely promises to discuss; (B) declares fence-sitting, which fails an agree-or-disagree question. When asked to pick a side, pick one.',
  ),
  // 6. practice: thesis for discuss-both
  q(
    '両論型のthesisとして最も良いのは？',
    '【設問】\n“Some people prefer large supermarkets, while others choose small local shops. Discuss both views and give your own opinion.”',
    ['Shopping is an important part of everyone’s daily life.', 'While large supermarkets offer lower prices and convenience, I believe small local shops bring greater value to a community.', 'I completely disagree with people who shop in large supermarkets.'],
    1,
    '(B)は While 〜 の前半で見方A（スーパーの利点）を認め、後半で自分の立場（地元商店派）を明示。両論を扱う予告と意見表明が1文に収まった、両論型の理想形です。\n\n(A)は一般論で立場ゼロ。(C)は立場こそ明確ですが、見方Aを「論じる」気配がなく、disagreeする相手は人ではなく意見であるべき、という点でもズレています。',
    '(B) concedes view A in the “While…” clause and declares the writer’s camp in the main clause — both views previewed, opinion stated, all in one sentence. (A) is a position-free platitude; (C) takes a side but shows no intention of discussing view A (and quarrels with people rather than the view).',
  ),
  // 7. concept: linking phrases
  con(
    'リンキング表現は道路標識',
    'Linking phrases are road signs',
    '段落と段落、文と文のつなぎ目には道路標識を立てます。採点基準のCoherence and Cohesion（一貫性）はここを見ています。\n\n・本論の頭：Firstly, ／ Secondly, ／ The main reason is that…\n\n・対比・転換：However, ／ On the other hand,（両論型の本論2の頭はこれ）\n\n・具体例：For example, ／ For instance,\n\n・結論：In conclusion, ／ To sum up,\n\n注意点はひとつ、使いすぎないこと。毎文の頭に Moreover, Furthermore, Additionally…と並ぶと、かえって機械的で不自然になります。1段落に2〜3個、必要な角にだけ標識を。',
    'Plant road signs at the joints between paragraphs and sentences — the Coherence and Cohesion criterion is graded right there. Body openers: Firstly / Secondly / The main reason is that…; contrast: However / On the other hand (the natural opener for body 2 in a discuss-both essay); examples: For example / For instance; conclusion: In conclusion / To sum up. One warning: don’t over-sign the road. A Moreover-Furthermore-Additionally pile-up reads mechanical. Two or three per paragraph, only at the real corners.',
  ),
  // 8. gap fill
  gap(
    '結論の段落の書き出しを完成させてください（2語で）。',
    '【結論の段落】\n“______, while both types of shop have their strengths, I believe small local shops deserve our support.”',
    ['in conclusion', 'to conclude', 'to summarise', 'to summarize', 'to sum'],
    '結論の合図は In conclusion,（または To conclude, ／ To sum up,）。この標識があるだけで、採点者は「ここから結論」と迷わず読めます。\n\n結論の中身は、thesisの言い換え＋ひとこと。新しい論点をここで出すのはNGです。',
    '“In conclusion,” (or “To conclude,” / “To sum up,”) tells the examiner exactly where your verdict begins. Inside it: your thesis re-worded plus a closing thought — never a brand-new argument.',
  ),
  // 9. recap
  con(
    'まとめ：タイプ判定→骨格→thesis',
    'Recap: identify the type → skeleton → thesis',
    '・最初の10秒で設問タイプを判定：agree or disagree?＝意見型、Discuss both views＝両論型\n\n・骨格は4段落：導入＋thesis／本論1／本論2／結論\n\n・両論型は本論1＝見方A、本論2＝見方B。片方だけは致命傷\n\n・thesisは立場＋理由の予告。「This essay will discuss…」は禁止\n\n・リンキングは要所だけ：However ／ For example ／ In conclusion\n\nライティング攻略はここまで。最終レベルはスピーキングです。',
    '• Ten seconds first: opinion type (“agree or disagree?”) or discuss-both (“Discuss both views”)?\n\n• Four paragraphs: intro + thesis / body 1 / body 2 / conclusion.\n\n• Discuss-both means BOTH: one view per body paragraph.\n\n• A thesis = position + previewed reasons; never “This essay will discuss…”.\n\n• Link at the corners only: However / For example / In conclusion.\n\nWriting done. Final level: Speaking.',
  ),
]
// ════════════════════════════════════════════════════════════════════════════
// LEVEL 4 — スピーキング攻略
// ════════════════════════════════════════════════════════════════════════════

// ── L10 Part 1 答えをひとこと伸ばす ──────────────────────────────────────
const L10_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。試験官に好印象なのはどの答え？',
    '【試験官】“Do you like cooking?”',
    ['Yes, I do.', 'Yes, I do — I find it relaxing, and I usually make curry with my kids on Sundays.', 'Cooking is the activity of preparing food by combining various ingredients.'],
    1,
    '(A)は文法的に完璧、でも会話が即死します。試験官が聞きたいのは Yes/No ではなく、あなたの英語。(C)は辞書の定義の暗唱で、質問に答えていません。\n\n(B)は答え（Yes）→理由（リラックスできる）→例（日曜に子どもとカレー）の3点セット。この「ひとこと伸ばす」習慣が、Part 1のすべてです。',
    '(A) is grammatically perfect and kills the conversation stone dead — the examiner wants your English, not a yes/no. (C) recites a dictionary definition without answering. (B) runs answer → reason → example: yes, it relaxes me, Sunday curry with the kids. That one habit of extending is the whole of Part 1.',
  ),
  // 2. concept: answer + reason + example
  con(
    '答え＋理由＋例 の3点セット',
    'Answer + reason + example',
    'Part 1は身近な話題（住まい・仕事・趣味）への短い質問が続く、いわばウォームアップ。でも採点はもう始まっています。\n\n答え方の型はひとつだけ。\n\n①答える：Yes, I do. ／ Not really.\n②理由を足す：because ／ The main reason is…\n③例を足す：For example… ／ 固有名詞や数字があると強い\n\n2〜4文、時間にして15〜25秒が目安です。\n\n逆にやってはいけないのが、暗記したスピーチの暗唱。試験官は暗記口調をすぐ見抜き、予定外の質問で崩しにきます。型は暗記、中身はその場の本音——これが正解です。',
    'Part 1 is the warm-up — short questions on home, work, hobbies — but the scoring has already begun. One formula covers everything: ① answer (Yes, I do / Not really), ② add a reason (because… / The main reason is…), ③ add an example (For example… — names and numbers make it vivid). Two to four sentences, 15–25 seconds. The one banned move: reciting a memorised speech. Examiners spot the recital tone instantly and derail it with an unexpected question. Memorise the FRAME; fill it with honest, on-the-spot content.',
    'Q: Do you like your neighbourhood?\n①Yes, I really do. ②It’s quiet but convenient.\n③There’s a great bakery two minutes from my door.',
  ),
  // 3. practice
  q(
    '3点セットができている答えはどれ？',
    '【試験官】“What’s your favourite season?”',
    ['Winter, definitely — I love snowboarding, and I try to get to the mountains in Nagano at least once a month.', 'I like all the seasons. They are all nice.', 'Season is a word that describes one of the four periods of the year.'],
    0,
    '(A)は答え（冬）→理由（スノボ好き）→例（長野に月1回）。固有名詞と頻度が入って、一気に生きた答えになっています。\n\n(B)は答えてはいるものの、理由も例もなく会話が止まる。(C)はまた辞書です。具体的な地名・数字・人名は、Part 1の答えを最も簡単に豊かにする材料です。',
    '(A) delivers the trio: winter → loves snowboarding → Nagano once a month. The proper noun and the frequency bring it alive. (B) answers but stalls — no reason, no example; (C) is the dictionary again. Place names, numbers and people are the cheapest way to enrich a Part 1 answer.',
  ),
  // 4. concept: when you're stuck
  con(
    '詰まったときの救急フレーズ',
    'First-aid phrases for when you freeze',
    'Part 1では、考えたこともない質問が飛んでくることがあります。「彫像は好きですか？」「鏡をよく見ますか？」——ここで黙り込むのが一番の失点です。\n\n救急フレーズを持っておきましょう。\n\n・That’s an interesting question.（考える時間を稼ぐ）\n・I’ve never really thought about it, but…（正直に認めてから答える）\n・It depends.（場合によります——から条件を説明）\n\n大事な心構え：内容は採点されません。彫像への深い見識は不要で、英語が流れているかだけが見られています。つまらない本音＋理由のほうが、立派な嘘より高得点です。',
    'Part 1 sometimes throws questions you have never once considered — “Do you like statues?” “Do you often look in mirrors?” Freezing is the only real failure. Carry first-aid phrases: “That’s an interesting question” (buys time), “I’ve never really thought about it, but…” (honest entry), “It depends” (then explain on what). Remember: CONTENT is not graded. Nobody needs your philosophy of statues — only flowing English. A boring honest answer with a reason outscores an impressive lie.',
  ),
  // 5. practice
  q(
    '予想外の質問への対応として最も良いのは？',
    '【試験官】“Do you like statues?”',
    ['（5秒沈黙して）…I don’t know.', 'Statues are very important for culture and history and art and society.', 'Hmm, I’ve never really thought about it — but yes, I suppose so. There’s a famous dog statue near Shibuya Station, and I always smile when I pass it.'],
    2,
    '(C)は「考えたことなかった」と正直に時間を稼ぎ、そこから渋谷のハチ公という具体例に着地。完璧な救急対応です。\n\n(A)の沈黙は流暢さの採点に直撃。(B)は重要そうな名詞を並べただけで、何も言っていません。知らない話題ほど、正直＋身近な例で切り抜けましょう。',
    '(C) buys time honestly (“never really thought about it”) and lands on a concrete example — the famous dog statue near Shibuya. Textbook first aid. (A)’s silence hits Fluency directly; (B) strings important-sounding nouns into nothing. The less you know a topic, the more honesty plus a nearby example saves you.',
  ),
  // 6. practice
  q(
    '“Not really.” で終わらせず、ひとこと伸ばします。続ける文として最も良いのは？',
    '【試験官】“Do you often take the bus?”\n【あなた】“Not really —”',
    ['Buses are vehicles that carry many passengers.', 'I prefer the train, because it’s faster and I can read on the way.', 'I said not really.'],
    1,
    'No系の答えこそ伸ばしどころ。「バスはあまり——電車派なんです、速いし車内で本が読めるので」と、代わりの本当のことを話せば、否定の答えが会話の入り口に変わります。\n\nNot really. で切ると試験官が次の質問を探す沈黙が生まれ、(A)はまた定義、(C)は논외。No と答えるときは「代わりに何か」をセットで。',
    'Negative answers are extension gold: “Not really — I prefer the train, it’s faster and I can read.” The alternative truth turns a “no” into a doorway. A bare “Not really.” forces the examiner to hunt for the next question; (A) defines buses again. Whenever you say no, attach what you do instead.',
  ),
  // 7. practice
  q(
    '定番の最初の質問。最も良い答えは？',
    '【試験官】“Do you work, or are you a student?”',
    ['I work for an IT company in Osaka — I’ve been there about five years now, mostly building apps for hospitals.', 'Work.', 'That is rather a personal question, I think.'],
    0,
    'これはほぼ確実に聞かれる質問なので、3点セットを事前に組み立てておけます。(A)は仕事→場所→年数→中身まで、自然な2文に収まった理想形。\n\n(B)の一語回答は採点材料を出していないのと同じ。(C)のように質問を拒否すると、試験として成立しません。定番質問の答えだけは、型を準備しておきましょう（暗唱ではなく、部品の準備です）。',
    'This question is near-guaranteed, so build your trio in advance. (A) packs job → city → five years → what he builds into two natural sentences. (B)’s single word gives the examiner nothing to grade; (C) refuses the game entirely. For the predictable questions, prepare the parts — not a recital.',
  ),
  // 8. gap fill
  gap(
    '理由を導く1語を入れてください。',
    '【試験官】“Do you enjoy your job?”\n【あなた】“Yes, I love it, ______ I get to solve a different problem every day.”',
    ['because', 'as', 'since'],
    '理由をつなぐ because（as ／ since でも可）。「答え＋because＋理由」は、Part 1で一番よく使う接続です。\n\n口癖レベルまで体に入れましょう。Yes と言ったら、口が勝手に because を続けるくらいでちょうどいいです。',
    '“Because” (or as / since) is the hinge of answer + reason — the single most-used connector in Part 1. Drill it until “Yes” reflexively pulls a “because” out of your mouth.',
  ),
  // 9. recap
  con(
    'まとめ：Yes/Noで止まらない',
    'Recap: never stop at yes or no',
    '・答え＋理由＋例の3点セット。2〜4文、15〜25秒\n\n・固有名詞・数字・人名が答えを生かす\n\n・詰まったら救急フレーズ：I’ve never really thought about it, but…\n\n・Noと答えるときは「代わりに何か」をセットで\n\n・内容は採点されない。正直＋理由が最強\n\n次は2分間の独演、Part 2キューカードの攻略です。',
    '• Answer + reason + example: 2–4 sentences, 15–25 seconds.\n\n• Names, numbers and places bring answers alive.\n\n• Stuck? “I’ve never really thought about it, but…”\n\n• Every “no” comes with an “instead”.\n\n• Content isn’t graded — honesty plus a reason wins.\n\nNext: the two-minute solo — the Part 2 cue card.',
  ),
]
// ── L11 Part 2 キューカード攻略 ──────────────────────────────────────────
const L11_SCREENS = [
  // 1. concept hook
  con(
    '2分間、ひとりで話し続ける',
    'Two minutes, talking alone',
    'Part 2では、トピックの書かれたキューカードを渡されます。準備1分、スピーチ1〜2分。試験官は相づちも助け舟も出しません。\n\n受験者の最大の恐怖は「30秒で話が尽きる」こと。でも実は、カードに解決策が印刷されています。\n\nDescribe a place you like to visit.\nYou should say:\n・where it is\n・how often you go there\n・what you do there\nand explain why you like it so much.\n\nこの4つの箇条書きが、そのままスピーチの設計図。4つ×20〜30秒で、ちょうど1分半〜2分になる計算です。カードは敵ではなく台本です。',
    'In Part 2 you receive a cue card: one minute to prepare, then one to two minutes speaking solo — no nods, no rescue from the examiner. The universal fear is running dry at thirty seconds. But the solution is printed on the card: its four bullet points ARE the speech plan. Four bullets × 20–30 seconds each lands you neatly at 1.5–2 minutes. The card is not the enemy; it is the script.',
  ),
  // 2. concept: the 1-minute prep
  con(
    '準備の1分：4つの箇条書き＝4つのミニ段落',
    'The prep minute: four bullets = four mini-paragraphs',
    '準備の1分でやることは決まっています。4つの箇条書きそれぞれに、キーワードを2〜3個メモする。\n\nDescribe a place you like to visit. なら：\n\n①どこ → 鎌倉・海沿い・電車で1時間\n②頻度 → 月1回・週末\n③何をする → 寺めぐり・海岸を散歩・カフェ\n④なぜ好き → 頭がリセットされる・学生時代の思い出\n\n書くのはキーワードだけ。文を書き始めると1分では2文しか書けず、しかもそれを読み上げてしまいます。\n\nメモは話す順番どおりに上から並べる。スピーチ中は、メモを上から順に消化していけば、迷子になりません。',
    'The prep minute has a fixed job: jot two or three KEYWORDS for each of the four bullets. For “a place you like to visit”: ① where → Kamakura, by the sea, an hour by train; ② how often → monthly, weekends; ③ what you do → temples, beach walks, cafés; ④ why → resets my head, student memories. Keywords only — start writing sentences and the minute buys you two of them, which you will then read aloud. List the notes in speaking order, then walk down the list as you talk. No getting lost.',
  ),
  // 3. practice: best notes
  q(
    '準備メモの取り方として最も良いのは？',
    '【キューカード】Describe a skill you learned recently.\n\n準備の1分、どう使う？',
    ['4つの箇条書きごとにキーワードを2〜3個ずつメモする（例：パン作り・YouTube・週末・達成感）', 'メモは取らず、最初の文を頭の中で完璧に組み立てる', '最初の2文をフルセンテンスで書き切ってから話し始める'],
    0,
    'キーワード方式なら、1分で4パート全部に足場が組めます。\n\n(B)は最初の文しか準備できず、30秒後に白紙へ。(C)は2文書いた時点で1分が終わり、その2文を読み上げる不自然なスタートになります。メモは思い出すためのフックであって、原稿ではありません。',
    'Keywords scaffold all four parts inside the minute. (B) preps only the opening line — blank page at the 30-second mark; (C) spends the whole minute writing two sentences and then reading them out. Notes are hooks for memory, not a manuscript.',
  ),
  // 4. concept: openings and closings
  con(
    '始め方と終わり方を固定する',
    'Fix your opening and closing lines',
    'スピーチの最初と最後は、毎回同じ型でいいんです。\n\n始め：I’d like to talk about 〜（トピックを自分の言葉で）\nOK, so I’m going to tell you about the time I…\n\nこの1文で「何の話か」を宣言しつつ、頭を整える時間が稼げます。\n\n終わり：So, that’s why 〜 is so special to me.\nAnyway, that’s the story of how I…\n\n終わりの合図がないと、試験官は「まだ続く？」と待ち、気まずい沈黙が生まれます。So, that’s why… と締めれば、2分未満でも「話し終えた」ときれいに着地できます。\n\n箇条書きの間は、Moving on to why I love it… のようなつなぎがあると、さらに滑らかです。',
    'Open and close with the same fixed lines every time. Openers: “I’d like to talk about ~” / “OK, so I’m going to tell you about the time I…” — one sentence that names the topic and buys composure. Closers: “So, that’s why ~ is so special to me.” / “Anyway, that’s the story of how I…” Without a closing signal the examiner waits, and the silence goes awkward; with one, even a 100-second talk lands cleanly. Between bullets, a bridge like “Moving on to why I love it…” keeps the ride smooth.',
  ),
  // 5. practice: opening
  q(
    '話し始めの一文として自然なのは？',
    '【キューカード】Describe a person who has influenced you.',
    ['The topic of my presentation today is the influence of persons.', 'I’d like to talk about my grandmother, who I stayed with every summer as a child.', 'I will now commence my response to the question provided.'],
    1,
    '(B)はトピックを自分の話（祖母）に引きつけて、すっと話し始めています。who 以下で背景まで添えて、次の箇条書きへの橋もできました。\n\n(A)(C)はスピーチコンテストか法廷のよう。Part 2は「面接官への発表」ではなく「ちょっと長めのおしゃべり」。肩の力を抜いた話し言葉が正解です。',
    '(B) pulls the topic into a personal story — grandmother, childhood summers — and the relative clause already bridges to the next bullet. (A) and (C) sound like a contest speech and a courtroom. Part 2 is extended chat, not a presentation; relaxed spoken English wins.',
  ),
  // 6. practice: time remains
  q(
    '3つ目の箇条書きまで話して、まだ1分も経っていません。どうする？',
    '時間が余りそうなときの正しい動きは？',
    ['黙って、試験官が止めてくれるのを待つ', '最初に戻って、同じ内容をもう一度話す', '気持ちの描写や細部（そのとき何と言ったか、その後どうなったか）を足してふくらませる'],
    2,
    '余った時間は、細部と感情で埋めます。「そのとき祖母は何と言ったか」「終わったあとどう感じたか」「今でも続いているか」——どの話題にも足せる万能の延長パーツです。\n\n(A)の沈黙は流暢さに直撃、(B)の繰り返しは語彙・文法の評価機会を捨てています。4つ目の箇条書き and explain how you felt… が、まさにこの「感情パート」を用意してくれていることにも注目。',
    'Fill spare time with detail and feeling: what she said at that moment, how you felt afterwards, whether it continues today — universal extension parts that fit any topic. Silence (A) hits Fluency; repetition (B) wastes your chance to show more language. Notice that the fourth bullet — “and explain how you felt…” — is the card handing you this exact material.',
  ),
  // 7. practice: bullet mapping
  q(
    '箇条書きとスピーチ内容を対応させましょう。',
    '【キューカードの最終行】and explain how you felt when you finished it.\n\nこのパートで話す内容として最も良いのは？',
    ['I was incredibly proud — I phoned my parents that evening, and honestly, I couldn’t stop smiling for days.', 'It took place in a large building near the centre of town.', 'So, that’s everything I wanted to say about it.'],
    0,
    'how you felt（どう感じたか）を聞かれているので、感情の中身＋それを示す行動（親に電話・笑いが止まらない）を話します。具体的な行動は、感情を伝える最高の証拠です。\n\n(B)は場所の話で、別の箇条書きの内容。(C)は締めの一文で、感情パートを丸ごとスキップしています。カードの each bullet に、ちゃんと答えを返しましょう。',
    '“How you felt” wants the emotion plus the behaviour that proves it — phoning your parents, smiling for days. Actions are the best evidence of feelings. (B) answers a different bullet (where), and (C) is a closing line that skips the feelings entirely. Give every bullet its own answer.',
  ),
  // 8. gap fill
  gap(
    '締めの定番フレーズを完成させてください（1語）。',
    '【スピーチの最後】\n“So, ______ why that summer is still so memorable for me.”',
    ["that's", 'thats', 'that is', 'that’s'],
    'So, that’s why 〜（そういうわけで〜なんです）が締めの合図。この1文で、スピーチが「終わった」ことが試験官に伝わります。\n\n始めの I’d like to talk about 〜 とセットで、毎回同じでOK。型を固定すれば、本番では中身だけに集中できます。',
    '“So, that’s why ~” is the landing signal — one sentence that tells the examiner you have finished. Pair it with your fixed opener and reuse both every time; fixed frames free your brain for the content.',
  ),
  // 9. recap
  con(
    'まとめ：カードが台本',
    'Recap: the card is the script',
    '・4つの箇条書き＝4つのミニ段落。1つ20〜30秒\n\n・準備の1分はキーワードのみ。文は書かない\n\n・始めと終わりは固定フレーズ：I’d like to talk about 〜 ／ So, that’s why 〜\n\n・時間が余ったら感情と細部で延長。沈黙と繰り返しはNG\n\n・どの箇条書きにも答えを返す\n\n最終レッスンは、Part 3の意見構築です。',
    '• Four bullets = four mini-paragraphs, 20–30 seconds each.\n\n• Prep minute: keywords only, never sentences.\n\n• Fixed opener and closer: “I’d like to talk about ~” / “So, that’s why ~”.\n\n• Spare time → feelings and details; never silence or repetition.\n\n• Answer every bullet on the card.\n\nFinal lesson: building opinions in Part 3.',
  ),
]
// ── L12 Part 3 意見を組み立てる ──────────────────────────────────────────
const L12_SCREENS = [
  // 1. cold-open question
  q(
    'まずは1問。Part 3らしい答えはどれ？',
    '【試験官】“Do you think schools should teach cooking?”',
    ['Yes, I think so.（→次の質問を待つ）', 'Cooking, schools, children… yes, it is very important, I think so.', 'In general, I’d say yes — cooking is a life skill. Students who can cook eat more healthily once they live alone, for instance. Of course, it depends on schools having the time and facilities.'],
    2,
    'Part 3は抽象的な意見を聞く、いわば「口頭のミニエッセイ」。(C)は立場（yes）→理由（生活スキル）→例（一人暮らしの食生活）→譲歩（学校側の事情次第）の4部構成で答えています。\n\n(A)はPart 1なら許される短さですが、Part 3では物足りない。(B)は単語を並べただけです。この4部構成の型を、今日のレッスンで体に入れます。',
    'Part 3 asks for abstract opinions — a spoken mini-essay. (C) runs the four moves: position (yes) → reason (life skill) → example (eating healthily when living alone) → concession (depends on time and facilities). (A) would pass in Part 1 but starves Part 3; (B) is nouns in a bag. That four-move frame is today’s whole lesson.',
  ),
  // 2. concept: the framework
  con(
    '型：立場→理由→例→譲歩',
    'The frame: position → reason → example → concession',
    'Part 3の質問は「現代社会で〜はどうあるべきか」のような大きな話。何も持たずに挑むと迷子になります。持っていくのはこの型です。\n\n①立場：I’d say yes ／ I think it depends, but…\n②理由：The main reason is… ／ mainly because…\n③例：For instance… ／ In Japan, for example…\n④譲歩：Of course, … ／ Having said that, …\n\n④の譲歩（反対側にも一理あると認める）が、バンドを押し上げる隠し味。「物事を多面的に語れる」証拠になるからです。\n\n4ステップで30〜45秒。Task 2エッセイの段落を、口で話していると思えばちょうどいいです。',
    'Part 3 questions are big — how society should work — and you get lost without equipment. Carry this frame: ① position (I’d say yes / It depends, but…), ② reason (The main reason is… / mainly because…), ③ example (For instance… / In Japan, for example…), ④ concession (Of course… / Having said that…). The concession — granting the other side its point — is the hidden band-booster: it proves you can see questions from more than one side. Four moves, 30–45 seconds: a Task 2 paragraph, spoken aloud.',
    '立場 → I’d say yes\n理由 → mainly because…\n例 → For instance…\n譲歩 → Of course, …',
  ),
  // 3. practice: identify the move
  q(
    'この文は型のどのパーツ？',
    '“The main reason is that cooking teaches children to look after themselves.”',
    ['立場（position）', '理由（reason）', '譲歩（concession）'],
    1,
    'The main reason is that… は理由パートの定番の入り方です。\n\n型の各パーツには、こうした合図のフレーズがあります。立場なら I’d say…、例なら For instance…、譲歩なら Having said that…。合図を口が覚えていれば、考えながらでも構造の通った答えになります。',
    '“The main reason is that…” is the standard doorway into the reason move. Each move has its signal phrases — I’d say… for position, For instance… for example, Having said that… for concession. When your mouth knows the signals, your answer stays structured even while your brain is still thinking.',
  ),
  // 4. concept: hedging
  con(
    'ヘッジ表現：断定しないのが上級者',
    'Hedging: experts don’t absolutise',
    '日本語でも「絶対みんなそう」と断言する人より、「人によるけど、たぶん〜」と言う人のほうが知的に聞こえますよね。英語ではこの加減をヘッジと呼び、Part 3の評価に直結します。\n\n・I’d say…（〜だと思いますね）← I think より柔らかい\n・It depends on…（〜次第です）\n・In general… ／ tend to…（一般的には／〜しがち）\n・probably ／ perhaps\n\n× Young people always use social media too much.\n○ Younger people tend to spend more time online, but it really depends on the person.\n\n断定は反例ひとつで崩れますが、ヘッジした主張は崩れません。大きな質問ほど、柔らかく答えるのが正解です。',
    'In any language, “absolutely everyone does this” sounds less intelligent than “it varies, but generally…”. English calls this hedging, and Part 3 rewards it directly: I’d say… (softer than I think), It depends on…, In general… / tend to…, probably / perhaps. Compare: “Young people always use social media too much” vs. “Younger people tend to spend more time online, but it really depends on the person.” An absolute claim collapses at one counter-example; a hedged claim never does. The bigger the question, the softer the answer.',
  ),
  // 5. practice: hedged version
  q(
    'Part 3の答え方として最も自然なのは？',
    '【試験官】“Do young people spend too much time online?”',
    ['I’d say younger people tend to spend more time online than older ones, though it really depends on the person.', 'Yes. Young people always use the internet too much. It is 100 percent bad for them.', 'Maybe… I don’t know… perhaps yes.'],
    0,
    '(A)は tend to と it depends で適度にヘッジしながら、世代比較というちゃんとした中身を述べています。\n\n(B)の always ／ 100 percent は反例ひとつ（ネットを使わない若者）で崩壊する断定。(C)はヘッジではなくただの迷子です——ヘッジは「柔らかく主張する」技術であって、主張しないことではありません。',
    '(A) hedges with “tend to” and “it depends” while still making a real claim about generations. (B)’s “always / 100 percent” collapses at the first counter-example; (C) isn’t hedging, it’s drifting — hedging means asserting softly, not declining to assert.',
  ),
  // 6. practice: what comes next
  q(
    '型の順番どおりに続けましょう。',
    '【試験官】“Do you think people will cook less in the future?”\n【あなた】“I’d say yes, probably.” ——この直後に続ける文として最も良いのは？',
    ['For instance, my cousin lives almost entirely on delivery apps.', 'Mainly because ready-made meals keep getting cheaper and better.', 'Of course, some people will always love cooking.'],
    1,
    '立場を述べた直後に来るのは理由です。理由（中食が安く美味しくなっている）→例（いとこの話）→譲歲（料理好きは残る）の順に流すと、(A)(C)もこのあと全部使えます。\n\n例から先に話すと「なぜそう思うか」が宙に浮き、譲歩から入ると立場がぼやけます。立場→理由→例→譲歩、この順番が聞き手に一番親切です。',
    'After the position comes the REASON. Run reason (ready-made meals keep improving) → example (the cousin on delivery apps) → concession (some will always love cooking), and all three options get used in order. Example-first leaves the “why” floating; concession-first blurs your position. The order exists for the listener.',
  ),
  // 7. gap fill
  gap(
    '困ったときの万能フレーズを完成させてください（1語）。',
    '【試験官】“Is it better to study alone or in a group?”\n【あなた】“Hmm, it ______ on the situation — for exams I’d study alone, but for languages a group helps.”',
    ['depends'],
    'It depends on 〜（〜次第です）は、Part 3最強の入り口フレーズ。二択を迫る質問に「場合分け」で答えられるので、即座に中身のある構造が生まれます。\n\nそのあとに for A …, but for B … と対比を続ければ、1つの質問で2つの意見を述べる高度な答えが完成します。',
    '“It depends on ~” is Part 3’s strongest opener: it turns an either-or question into a case-by-case answer with instant structure. Follow with “for A…, but for B…” and one question yields two contrasted opinions — a genuinely advanced answer.',
  ),
  // 8. practice: full ordering
  q(
    '総仕上げ。4つの文を「立場→理由→例→譲歩」の順に並べたものはどれ？',
    '【試験官】“Will printed books disappear?”\n\n①Of course, libraries will still matter for people who prefer paper.\n②I’d say most everyday reading will move to screens.\n③My own bookshelf, for instance, hasn’t gained a single new book in two years.\n④That’s mainly because digital books are cheaper and instantly available.',
    ['④→②→①→③', '②→③→④→①', '②→④→③→①'],
    2,
    '②立場（読書は画面に移る）→④理由（電子書籍は安くて速い）→③例（自分の本棚は2年増えていない）→①譲歩（紙派のための図書館は残る）。\n\n(A)は理由から始まって立場が見えず、(B)は理由より先に例が来て「なぜ？」が宙ぶらりんに。型の順番は、聞き手が迷子にならないための道順です。',
    '② position (reading moves to screens) → ④ reason (digital is cheaper, instant) → ③ example (my bookshelf, frozen for two years) → ① concession (libraries remain for paper lovers). (A) opens with a reason for an unstated position; (B) gives the example before the why. The order is the listener’s route map.',
  ),
  // 9. recap (course finale)
  con(
    'まとめ：口で書くミニエッセイ',
    'Recap: a mini-essay, spoken',
    '・Part 3の型：立場→理由→例→譲歩。30〜45秒\n\n・合図フレーズ：I’d say… ／ mainly because… ／ For instance… ／ Having said that…\n\n・断定よりヘッジ：tend to ／ It depends ／ in general\n\n・二択の質問は It depends で場合分け\n\nこれで全12レッスン完了です。リスニングの言い換え、TFNGの3段判定、手紙のレジスター、Part 3の型——学んだパターンを武器に、模試で腕試ししましょう。',
    '• The Part 3 frame: position → reason → example → concession, 30–45 seconds.\n\n• Signal phrases: I’d say… / mainly because… / For instance… / Having said that…\n\n• Hedge rather than absolutise: tend to / It depends / in general.\n\n• Either-or questions: split them with “It depends”.\n\nAll twelve lessons complete. Paraphrase radar, the TFNG procedure, letter registers, the Part 3 frame — take the patterns into a mock test and put them to work.',
  ),
]
// ────────────────────────────────────────────────────────────────────────────
// Course tree
// ────────────────────────────────────────────────────────────────────────────
const LEVELS = [
  {
    title: 'Listening Strategies',
    title_ja: 'リスニング攻略',
    lessons: [
      { slug: 'ielts-listening-numbers', title: 'Numbers and Spelling Dictation', title_ja: '数字とスペルの聞き取り', free: true, minutes: 10, screens: L1_SCREENS },
      { slug: 'ielts-listening-paraphrase', title: 'Hearing the Paraphrase', title_ja: '言い換えに気づく', free: false, minutes: 10, screens: L2_SCREENS },
      { slug: 'ielts-listening-option-traps', title: 'Option Traps and Corrections', title_ja: '選択肢の罠', free: false, minutes: 10, screens: L3_SCREENS },
    ],
  },
  {
    title: 'Reading Strategies',
    title_ja: 'リーディング攻略',
    lessons: [
      { slug: 'ielts-reading-tfng', title: 'True / False / Not Given Mastery', title_ja: 'True/False/Not Given 完全攻略', free: false, minutes: 10, screens: L4_SCREENS },
      { slug: 'ielts-reading-headings', title: 'Matching Headings', title_ja: '見出しマッチング', free: false, minutes: 10, screens: L5_SCREENS },
      { slug: 'ielts-reading-completion', title: 'Gap Fill and Summary Completion', title_ja: '空所補充と要約', free: false, minutes: 10, screens: L6_SCREENS },
    ],
  },
  {
    title: 'Writing Strategies',
    title_ja: 'ライティング攻略',
    lessons: [
      { slug: 'ielts-writing-letters', title: 'Letters and Register (GT Task 1)', title_ja: '手紙の書き方（GT Task 1）', free: false, minutes: 10, screens: L7_SCREENS },
      { slug: 'ielts-writing-charts', title: 'Describing Charts (Academic Task 1)', title_ja: 'グラフ描写（Academic Task 1）', free: false, minutes: 10, screens: L8_SCREENS },
      { slug: 'ielts-writing-essays', title: 'The Essay Skeleton (Task 2)', title_ja: 'エッセイの型（Task 2）', free: false, minutes: 10, screens: L9_SCREENS },
    ],
  },
  {
    title: 'Speaking Strategies',
    title_ja: 'スピーキング攻略',
    lessons: [
      { slug: 'ielts-speaking-part1', title: 'Part 1: Extend Every Answer', title_ja: 'Part 1 答えをひとこと伸ばす', free: false, minutes: 10, screens: L10_SCREENS },
      { slug: 'ielts-speaking-cue-card', title: 'Part 2: Conquering the Cue Card', title_ja: 'Part 2 キューカード攻略', free: false, minutes: 10, screens: L11_SCREENS },
      { slug: 'ielts-speaking-part3', title: 'Part 3: Building an Opinion', title_ja: 'Part 3 意見を組み立てる', free: false, minutes: 10, screens: L12_SCREENS },
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
if (DRY_RUN) {
  const total = LEVELS.flatMap(l => l.lessons).reduce((n, l) => n + l.screens.length, 0)
  console.log(`Dry run only — ${LEVELS.length} levels, ${LEVELS.flatMap(l => l.lessons).length} lessons, ${total} screens. No DB writes.`)
  process.exit(0)
}
const courseId = await seed()
await selfCheck(courseId)
