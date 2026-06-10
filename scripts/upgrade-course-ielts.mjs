/**
 * Upgrade the IELTS mini-course ('ielts-prep') — Speaking level v2 + Writing refresh.
 *
 *   A) Deletes the existing speaking level (title_ja 'スピーキング攻略') and
 *      recreates it with SIX lessons (was three):
 *        1. ielts-speaking-band-criteria  採点基準を知る
 *        2. ielts-speaking-lexical        語彙の幅を見せる
 *        3. ielts-speaking-grammar-range  文法の幅を見せる
 *        4. ielts-speaking-structure      答えの組み立て
 *        5. ielts-speaking-cue-card       Part 2 キューカード攻略
 *        6. ielts-speaking-part3          Part 3 議論を組み立てる
 *   B) Replaces the SCREENS of 'ielts-writing-essays' and 'ielts-writing-charts'
 *      (lesson rows are kept, so slugs/progress references stay intact).
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY):
 *   node --env-file=.env.local scripts/upgrade-course-ielts.mjs
 * Dry run (local validation only, no DB writes):
 *   node scripts/upgrade-course-ielts.mjs --validate-only
 *
 * Idempotent: re-running deletes the speaking level again (cascades to lessons,
 * screens and progress) and re-replaces the writing screens. All content is
 * 100% ORIGINAL. New question type used here: drag_fill —
 *   { question_type: 'drag_fill', prompt, prompt_ja?, text: '… ___ …',
 *     chips: [answers + plausible distractors], answer: [one chip per blank],
 *     explanation_ja, explanation }
 * matching the lesson player at src/app/dashboard/courses/lessons/[id]/page.tsx.
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

const COURSE_SLUG = 'ielts-prep'

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

/** Drag-fill question: chips dragged/tapped into the ___ blanks of `text`. */
const drag = (prompt_ja, prompt, text, chips, answer, explanation_ja, explanation) => ({
  type: 'question',
  content: {
    question_type: 'drag_fill',
    prompt,
    ...(prompt_ja ? { prompt_ja } : {}),
    text,
    chips,
    answer,
    explanation_ja,
    explanation,
  },
})

// ════════════════════════════════════════════════════════════════════════════
// SPEAKING LESSON 1 — 採点基準を知る (ielts-speaking-band-criteria)
// ════════════════════════════════════════════════════════════════════════════
const S1_SCREENS = [
  // 1. hook: Band 5 vs Band 7 cold open
  q(
    'まずは1問。採点者の目で見てください。スコアが高いのはどちらの答えで、決め手は何でしょう？',
    '【試験官】“Do you prefer mornings or evenings?”\n\n【答えX】“I prefer evenings. Evening is relax time. I watch TV and I rest.”\n【答えY】“Definitely evenings — once dinner’s out of the way, I can finally unwind. I usually read or catch up with friends online, which helps me switch off before bed.”',
    [
      'Y——語彙と文法に幅があり、文が自然につながっているから',
      'Y——Xより文の数が多く、長く話しているから',
      'X——短い文で文法ミスがなく、簡潔だから',
    ],
    0,
    '決め手は長さではなく「幅」です。Yは unwind ／ catch up with ／ switch off といった自然な語彙に加え、once 〜 や which 〜 で文を組み合わせています。\n\nIELTSスピーキングは4つの採点基準（流暢さと一貫性・語彙・文法・発音）で測られ、長さそのものは基準にありません。Xのように短く正確なだけの答えは、「幅」を見せる材料がないため頭打ちになります。',
    'The decisive factor is range, not length. Y shows natural vocabulary (unwind, catch up with, switch off) and combines clauses with “once” and “which”. IELTS Speaking is scored on four criteria — fluency and coherence, vocabulary, grammar, pronunciation — and length itself is not one of them. X is short and accurate, but offers no evidence of range, which caps its score.',
  ),
  // 2. concept: the four criteria
  con(
    '採点基準は4つ。重みはすべて25%',
    'Four criteria, 25% each',
    'スピーキングのバンドスコアは、次の4基準の平均で決まります。\n\n①Fluency and Coherence（流暢さと一貫性）：止まらずに話せるか、話が論理的につながっているか\n\n②Lexical Resource（語彙力）：場面に合った語彙を、幅広く正確に使えるか\n\n③Grammatical Range and Accuracy（文法の幅と正確さ）：多様な文構造を、ミスを抑えて使えるか\n\n④Pronunciation（発音）：無理なく聞き取れるか、強勢やイントネーションが自然か\n\n重要なのは、4つが同じ重みだということ。文法が完璧でも、語彙が nice の繰り返しなら平均は伸びません。逆に言えば、弱点の基準をひとつ底上げするだけで、バンド全体が動きます。\n\nこのレベルでは、基準ごとに「見せ方」を鍛えていきます。まずは、答えを聞いて「どの基準が削られているか」を診断できるようになりましょう。',
    'Your Speaking band is the average of four equally weighted criteria: ① Fluency and Coherence — can you keep going, and does the answer hang together logically? ② Lexical Resource — a wide, precise vocabulary used appropriately. ③ Grammatical Range and Accuracy — varied structures with errors under control. ④ Pronunciation — effortless to follow, with natural stress and intonation.\n\nBecause the weights are equal, perfect grammar cannot rescue a vocabulary of repeated “nice”s — and lifting your weakest criterion moves the whole band. This level trains each criterion in turn, starting with the diagnostic skill: hearing an answer and naming WHICH criterion it loses.',
    'Band ＝ (流暢さ・一貫性 ＋ 語彙 ＋ 文法 ＋ 発音) ÷ 4',
  ),
  // 3. diagnose: fluency
  q(
    'この答えが最も減点される基準はどれでしょう？',
    '【試験官】“Do you enjoy shopping?”\n【受験者】“Well… er… I would say… I would say shopping is… how can I put it… quite enjoyable… because… because I can browse and… er… compare different brands.”',
    [
      'Lexical Resource（語彙力）',
      'Fluency and Coherence（流暢さと一貫性）',
      'Grammatical Range and Accuracy（文法の幅と正確さ）',
    ],
    1,
    '語彙は browse ／ compare different brands と悪くなく、文法ミスもありません。問題は er… の連発と同じ語句の言い直しで、話の流れが何度も止まっていること——これは Fluency and Coherence の減点対象です。\n\n「どの基準が削られているか」を聞き分けられるようになると、自分の練習の優先順位も決められます。',
    'The vocabulary (browse, compare different brands) is sound and there are no grammar errors. What suffers is the FLOW: constant fillers and restarts interrupt the answer again and again — that lands squarely on Fluency and Coherence. Learning to diagnose which criterion an answer loses is also how you prioritise your own practice.',
  ),
  // 4. diagnose: lexical resource
  q(
    'この答えが最も減点される基準はどれでしょう？',
    '【試験官】“Tell me about your hometown.”\n【受験者】“My hometown is nice. The people are nice and friendly, the food is nice, and there are some nice parks near the station.”',
    [
      'Fluency and Coherence（流暢さと一貫性）',
      'Grammatical Range and Accuracy（文法の幅と正確さ）',
      'Lexical Resource（語彙力）',
    ],
    2,
    '流れは止まっておらず、文法も正確です。しかし nice が4回——同じ形容詞の繰り返しは、語彙の幅が見えないという Lexical Resource の典型的な減点パターンです。\n\nwelcoming（温かい）／ delicious local dishes（おいしい地元料理）／ leafy parks（緑豊かな公園）のように、対象ごとに違う語を当てられるかが見られています。',
    'The answer flows and the grammar is accurate — but “nice” appears four times. Repeating one adjective leaves your range invisible: the classic Lexical Resource ceiling. The examiner is listening for a different word per target: welcoming people, delicious local dishes, leafy parks.',
  ),
  // 5. diagnose: grammar
  q(
    'この答えが最も減点される基準はどれでしょう？',
    '【試験官】“How has your city changed in recent years?”\n【受験者】“The city change a lot. Many new buildings appear near the station last year, and more tourists is coming now.”',
    [
      'Grammatical Range and Accuracy（文法の幅と正確さ）',
      'Fluency and Coherence（流暢さと一貫性）',
      'Lexical Resource（語彙力）',
    ],
    0,
    '流れは良く、語彙も話題に合っています。削られているのは文法の正確さ——change → has changed、appear → appeared、tourists is → tourists are と、時制と主語・動詞の一致のミスが3連発です。\n\nGrammatical Range and Accuracy は「幅」と「正確さ」の両輪。ミスゼロは要求されませんが、この密度になると評価を直撃します。',
    'The delivery is fluent and the vocabulary fits the topic. What bleeds is grammatical ACCURACY: change → has changed, appear → appeared, tourists is → tourists are — three tense/agreement errors in two sentences. GRA grades range and accuracy together; nobody demands zero errors, but this density hits the score directly.',
  ),
  // 6. concept: Band 5 vs Band 7
  con(
    'バンド5と7は、ここが違う',
    'What separates Band 5 from Band 7',
    '同じ質問への2つの答えを見比べてください（下の例）。どちらも「伝わる」答えです。違いは——\n\n・Band 5：短い単文の連続。語彙は基本語の繰り返し。間違いは少ないが、幅も見えない\n\n・Band 7：less common な語彙（nothing fancy ／ the queue tells you everything）、複文、そして自分の感覚がにじむ細部\n\n誤解されがちですが、Band 7はノーミスではありません。多少のミスがあっても、幅と柔軟さがあれば届きます。逆に、ミスを恐れて簡単な文だけで答え続けると、正確でもBand 5〜6で止まります。\n\n「安全運転の正確さ」より「多少のリスクを取った幅」——採点基準は後者に報酬を出します。',
    'Compare the two sample answers below — both communicate. The difference: Band 5 strings short simple sentences with basic, repeated vocabulary; few errors, but no visible range. Band 7 shows less common phrasing (“nothing fancy”, “the queue tells you everything”), combined clauses, and detail with a personal voice.\n\nThe common misconception: Band 7 does not mean error-free. A few slips are fine if range and flexibility are there. Play it safe with simple correct sentences and you park at 5–6 — the criteria pay for ambition, not caution.',
    'Q: “Do you often eat out?”\n【Band 5】“Yes, I eat out two times a week. I like the ramen shop near my house. It is cheap and good.”\n【Band 7】“Yes, a couple of times a week, usually when I’m too tired to cook. There’s a fantastic little ramen place near my flat — it’s nothing fancy, but the queue tells you everything.”',
  ),
  // 7. concept: the expansion habit
  con(
    '「答え＋理由＋例」が4基準すべてに効く',
    'Answer + reason + example feeds every criterion',
    'では、幅はどうやって見せるのか。一番確実なのが、どんな質問にも「答え＋理由＋例」まで話す習慣です。\n\n・流暢さと一貫性：ターンが長くなり、because ／ for example のつなぎで論理が見える\n\n・語彙力：例を出すと、具体的な名詞や動詞が自然に増える\n\n・文法：理由や例を足すと、複文（because 〜 ／ which 〜）が勝手に生まれる\n\nつまり、この習慣ひとつが3つの基準に同時に効く、最も効率のよい投資です（発音だけは別枠で、音読やシャドーイングで鍛えます）。\n\n次の問題で、この形を自分で組み立ててみましょう。',
    'So how do you SHOW range? The most reliable habit: extend every answer to answer + reason + example. Fluency and Coherence — longer turns, with “because” and “for example” making the logic audible. Lexical Resource — examples drag concrete nouns and verbs in naturally. Grammar — reasons and examples generate complex sentences (because…, which…) by themselves.\n\nOne habit, three criteria paid at once — the best investment in the test. (Pronunciation is the exception; train it separately with reading aloud and shadowing.) Now assemble the shape yourself.',
    '答え → Yes, I do.\n理由 → mainly because …\n例 → For example, …',
  ),
  // 8. drag_fill: assemble an expanded answer
  drag(
    '「答え＋理由＋例」の形になるように、語句を当てはめてください。',
    '【試験官】“Do you like walking?”',
    '“Yes, I do — ___ because it helps me clear my head after work. ___, I walk along the river near my flat most evenings, ___ when it’s cold.”',
    ['mainly', 'For example', 'even', 'However', 'so that', 'only'],
    ['mainly', 'For example', 'even'],
    'mainly because（主な理由は〜）で理由、For example で例、even when it’s cold（寒い日でさえ）で細部の粘りが加わります。\n\nonly when it’s cold だと「寒い日にだけ歩く」となり、直前の most evenings と矛盾します。However と so that は、どの空所にも論理的に収まりません。',
    '“Mainly because” opens the reason, “For example” the example, and “even when it’s cold” adds a vivid detail of persistence. “Only when it’s cold” would contradict “most evenings”, and “However” / “so that” fit none of the gaps logically.',
  ),
  // 9. gap: example-introducing phrase
  gap(
    '例を導く定番フレーズです。空所に入る1語を入力してください。',
    '“I enjoy hiking. For ______, last month I climbed Mt. Takao with my sister.”',
    ['example', 'instance'],
    'For example,（または For instance,）が例の合図です。この1語が聞こえた瞬間、採点者は「具体例で支えられた答えだ」と認識します。\n\n理由のあとに for example を続ける反射を作れば、答えは自動的に3点セットの形になります。',
    '“For EXAMPLE,” (or “for instance,”) is the signal that evidence is coming — the moment the examiner hears it, your answer registers as supported. Train the reflex of following every reason with one, and the three-part shape builds itself.',
  ),
  // 10. diagnose: coherence (answering the wrong question)
  q(
    '今度は上級編。この答えが最も減点される基準はどれでしょう？',
    '【試験官】“Do you like your neighbourhood?”\n【受験者】“Talking of neighbourhoods, my hometown has a long history. It was founded around four hundred years ago, and its castle is quite famous, so many tourists visit in spring.”',
    [
      'Lexical Resource（語彙力）',
      'Grammatical Range and Accuracy（文法の幅と正確さ）',
      'Fluency and Coherence（流暢さと一貫性）',
    ],
    2,
    '語彙も文法も問題ありません。しかし質問は「今住んでいる地域は好きか」なのに、答えは故郷の歴史の話——質問に答えていない答えは、Coherence（一貫性）の問題として Fluency and Coherence で減点されます。\n\n準備したトピックに強引につなげる「暗記スピーチへの誘導」も、同じ理由で見抜かれて減点されます。流暢に話せていても、です。',
    'The language is flawless — but the question asked about your current NEIGHBOURHOOD, and the answer narrates a hometown’s history. An answer that doesn’t address the question is a coherence failure, scored under Fluency and Coherence. Steering every question toward a memorised topic is caught and penalised the same way, however fluent the delivery.',
  ),
  // 11. recap
  con(
    'まとめ：基準を知れば、対策が決まる',
    'Recap: know the criteria, know your training plan',
    '・採点は4基準×25%：流暢さと一貫性／語彙／文法／発音\n\n・長さは基準にない。評価されるのは「幅」と「自然さ」\n\n・Band 7はノーミスではない。安全運転の単文より、リスクを取った複文\n\n・「答え＋理由＋例」の習慣が、3基準に同時に効く\n\n・質問に答えない流暢な答えは、一貫性で減点される\n\n次のレッスンでは、4基準のひとつ目の柱——語彙の幅の見せ方を鍛えます。',
    '• Four criteria at 25% each: fluency and coherence / vocabulary / grammar / pronunciation.\n\n• Length is not a criterion; range and naturalness are.\n\n• Band 7 ≠ error-free. Ambitious complex sentences beat cautious simple ones.\n\n• The answer + reason + example habit pays three criteria at once.\n\n• Fluent answers that dodge the question lose marks for coherence.\n\nNext lesson: the first pillar in detail — showing your lexical range.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// SPEAKING LESSON 2 — 語彙の幅を見せる (ielts-speaking-lexical)
// ════════════════════════════════════════════════════════════════════════════
const S2_SCREENS = [
  // 1. hook
  q(
    'まずは1問。語彙力（Lexical Resource）の評価が最も高いのはどの答えでしょう？',
    '【試験官】“Tell me about a teacher you remember.”',
    [
      '“My maths teacher was a very good teacher. Her lessons were very good and she was good at explaining.”',
      '“My maths teacher was strict but endlessly patient — she had a knack for making difficult ideas feel simple.”',
      '“My maths teacher was a paradigmatic pedagogue whose erudite elucidations were ubiquitously lauded.”',
    ],
    1,
    '(B)は strict ／ endlessly patient ／ have a knack for（〜のコツを心得ている）と、自然で幅のある語彙を使っています。\n\n(A)は good の繰り返しで幅が見えません。(C)は難語を並べていますが、会話で paradigmatic pedagogue と言う人はいません——語彙力とは「難しい単語」ではなく「場面に合った的確な単語」です。',
    '(B) uses natural, varied vocabulary: strict, endlessly patient, a knack for. (A) repeats “good” and shows no range. (C) stacks rare words nobody says in conversation — Lexical Resource rewards the RIGHT word for the situation, not the hardest word in the dictionary.',
  ),
  // 2. concept
  con(
    '語彙力とは「言い換えられる力」',
    'Lexical Resource means having alternatives',
    '採点者が語彙について見ているのは、主に3点です。\n\n①幅：同じ語を繰り返さず、対象ごとに違う語を当てられるか\n\n②的確さ：語と語の相性（コロケーション）が自然か\n\n③言い換え力：知らない単語や設問の単語を、別の言い方で乗り切れるか\n\n対策の出発点は、自分の「口癖単語」を知ること。good ／ nice ／ important ／ very——誰にでも、つい頼ってしまう便利な単語があります。それぞれに代役を2〜3個ずつ準備しておけば、本番で自然に幅が出ます。\n\nこのレッスンでは、その代役を実際に「自分の口から出す」練習をします。選択肢から選ぶのではなく、思い出して言えるか——それが本番で問われる力だからです。',
    'For vocabulary, the examiner listens for three things: ① range — a different word per target instead of one word recycled; ② precision — natural word partnerships (collocation); ③ paraphrase — talking your way around words you lack.\n\nThe starting point is knowing your crutch words. Everyone has them: good, nice, important, very. Prepare two or three stand-ins for each and range appears by itself. This lesson makes you PRODUCE those stand-ins — recalling a word yourself, not recognising it in a list, is the skill the test demands.',
    'good → superb ／ impressive ／ rewarding\nimportant → essential ／ crucial ／ vital\nvery tired → exhausted',
  ),
  // 3. gap: upgrade "important"
  gap(
    'important を使わずに、同じ意味の1語を入力してください。',
    '“Regular exercise is ______ for older people — it keeps both body and mind strong.”',
    ['essential', 'crucial', 'vital', 'critical', 'key', 'significant', 'indispensable', 'fundamental', 'paramount', 'imperative', 'invaluable'],
    'essential ／ crucial ／ vital あたりが最も自然です。important 自体は正しい英語ですが、毎回 important では幅が見えません。\n\n「重要」を3通りで言える——それが採点者に見せたい語彙力です。',
    'Essential, crucial and vital all fit naturally. “Important” is perfectly correct — but if it is your only word for the idea, your range stays invisible. Owning three ways to say “important” is exactly what the examiner is listening for.',
  ),
  // 4. gap: collocation with absolutely
  gap(
    '料理を強くほめる形容詞を1語。absolutely との相性に注意してください。',
    '“You have to try her cooking — the meal she made was absolutely ______.”',
    ['delicious', 'superb', 'wonderful', 'fantastic', 'amazing', 'incredible', 'outstanding', 'marvellous', 'marvelous', 'divine', 'exquisite', 'delightful', 'unforgettable', 'perfect', 'sublime', 'heavenly'],
    'delicious ／ superb ／ incredible などの「強い」形容詞が入ります。\n\n注意したいのは、absolutely good とは言えないこと。absolutely は「これ以上ない」レベルの形容詞（delicious ／ freezing ／ exhausted）とだけ組みます。very good ／ absolutely delicious——この組み合わせの感覚がコロケーションです。',
    'Strong adjectives fit: delicious, superb, incredible. Note that “absolutely good” is impossible — absolutely pairs only with ungradable, already-extreme adjectives (delicious, freezing, exhausted). “Very good” but “absolutely delicious”: that pairing instinct is collocation.',
  ),
  // 5. concept: synonym webs
  con(
    '「卒業したい単語」に代役を用意する',
    'Build stand-ins for your overused words',
    '練習法は単純です。自分がよく使う単語を5つ選び、それぞれに代役を2〜3個ずつ。辞書の同義語を丸写しするのではなく、「自分が本当に言いそうな場面」とセットで覚えます。\n\nコツが2つあります。\n\n①同じ nice でも、対象で代役は変わる（下の例）。「人に使う nice」「場所に使う nice」を分けて準備する\n\n②反対語のペアも幅の証拠になる。My old flat was tiny, but the new one is spacious. のような対比は、1文で2語ぶんの幅を見せられます\n\n仕上げの練習は「禁止ゲーム」。1つの質問に、good ／ nice を一度も使わずに答えてみる——代役が体に入っているか、すぐ分かります。',
    'The training is simple: pick your five most-used words and prepare two or three stand-ins each — tied to situations you would genuinely talk about, not copied from a thesaurus.\n\nTwo refinements: ① the stand-in depends on the target — “nice” for a person and “nice” for a place need different replacements (see below); ② antonym pairs also prove range: “My old flat was tiny, but the new one is spacious” shows two words’ worth in one sentence.\n\nThe finishing drill is the ban game: answer a question without once saying “good” or “nice”. You will know within seconds whether the stand-ins are truly yours.',
    'nice（人）→ friendly ／ welcoming ／ easy-going\nnice（場所）→ cosy ／ lively ／ picturesque\nbig（変化）→ dramatic ／ significant',
  ),
  // 6. single_choice: precise near-synonym
  q(
    '空所に最も自然に収まる語はどれでしょう？',
    '“The documentary was really ______ — I came away knowing far more about the deep sea than before.”',
    ['informative', 'knowledgeable', 'educated'],
    0,
    '物事が「ためになる」は informative。knowledgeable と educated は「（人が）博識だ・教養がある」で、人にしか使えません。\n\na knowledgeable guide ／ an informative documentary——意味が近い語ほど、「何に使える語か」で区別します。この精度が、語彙の的確さの評価を分けます。',
    'Things are informative; PEOPLE are knowledgeable or educated. “A knowledgeable guide”, but “an informative documentary”. With near-synonyms, what separates them is usually what they can describe — and that precision is high-value Lexical Resource.',
  ),
  // 7. gap: antonym production
  gap(
    '対比で語彙の幅を見せましょう。tiny と反対の意味になる1語を入力してください。',
    '“My old flat was tiny, but my new place is wonderfully ______ — there’s even room for a proper desk.”',
    ['spacious', 'roomy', 'huge', 'enormous', 'massive', 'vast', 'large', 'big', 'airy', 'generous', 'expansive'],
    'spacious ／ roomy が最も自然です。tiny → spacious のような対比は、1文で2語ぶんの幅を見せられる効率のよい技。\n\nbig でも正解ですが、すでに tiny という「表情のある」語を使っているので、釣り合う spacious ／ enormous まで上げられると理想的です。',
    'Spacious or roomy fit best. A contrast pair like tiny → spacious shows two words’ worth of range in one sentence. “Big” passes, but since “tiny” is already a vivid word, matching its energy with spacious or enormous is the stronger move.',
  ),
  // 8. drag_fill: varied vocabulary in an answer
  drag(
    '前置詞と動詞の相性に注意して、語句を当てはめてください。',
    '【試験官】“Do you have any hobbies?”',
    '“I’m really ___ on photography. I find it ___ after a long week, and it’s a hobby that doesn’t ___ much money.”',
    ['keen', 'relaxing', 'cost', 'interested', 'boring', 'spend'],
    ['keen', 'relaxing', 'cost'],
    'keen on（〜に夢中）、find it relaxing（リラックスできる）、cost money（お金がかかる）。\n\ninterested は前置詞が in なので keen の位置には入れません。spend の主語は人（I don’t spend much money on it）で、hobby を主語にするなら cost です。類義語の分かれ道は、たいてい前置詞と主語にあります。',
    '“Keen ON photography” (interested takes IN, so it cannot fill that slot), “find it relaxing”, and “a hobby that doesn’t COST much” — people spend, things cost. Near-synonyms usually part ways at the preposition or the subject.',
  ),
  // 9. gap: paraphrase the examiner's word
  gap(
    '試験官の influences をそのまま繰り返さず、別の動詞で言い換えてください。',
    '【試験官】“Do you think advertising influences people?”\n【あなた】“Definitely — adverts ______ our choices far more than we realise.”',
    ['shape', 'affect', 'sway', 'steer', 'guide', 'drive', 'determine', 'colour', 'color', 'impact', 'mould', 'mold'],
    'shape ／ affect ／ sway（揺さぶる）などが好例です。設問の単語をそのまま返しても減点はされませんが、言い換えて返せば、その瞬間に語彙の幅をひとつ証明できます。\n\n試験官の単語は「言い換えのチャンス」と考えましょう。',
    'Shape, affect and sway all work. Echoing the examiner’s word back is not an error — but paraphrasing it proves range on the spot. Treat every content word in the question as an invitation to show an alternative.',
  ),
  // 10. recap
  con(
    'まとめ：的確な代役を、自分の口から',
    'Recap: precise stand-ins, produced on demand',
    '・語彙力＝幅×的確さ×言い換え力。難語の暗唱ではない\n\n・口癖単語（good ／ nice ／ important ／ very）に代役を2〜3個ずつ\n\n・コロケーションに注意：absolutely は極端な形容詞とだけ（absolutely delicious）\n\n・対比（tiny → spacious）は1文で2語ぶんの幅\n\n・試験官の単語は言い換えて返す（influences → shape ／ sway）\n\n次のレッスンは、もうひとつの柱——文法の幅の見せ方です。',
    '• Lexical Resource = range × precision × paraphrase, not rare-word recitals.\n\n• Give each crutch word (good / nice / important / very) two or three stand-ins.\n\n• Mind collocation: absolutely pairs only with extreme adjectives (absolutely delicious).\n\n• Contrast pairs (tiny → spacious) show double range in one sentence.\n\n• Paraphrase the examiner’s words back (influences → shape / sway).\n\nNext lesson: the other pillar — grammatical range.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// SPEAKING LESSON 3 — 文法の幅を見せる (ielts-speaking-grammar-range)
// ════════════════════════════════════════════════════════════════════════════
const S3_SCREENS = [
  // 1. hook
  q(
    'まずは1問。正しい答え方はどれでしょう？',
    '【試験官】“How long have you lived in your current city?”',
    [
      '“I live in Osaka for eight years.”',
      '“I am living in Osaka since eight years.”',
      '“I’ve lived in Osaka for eight years now.”',
    ],
    2,
    '「過去から今まで続いていること」は現在完了で、I’ve lived 〜 for eight years。\n\n(A)の現在形は期間の for と組めず、(B)は since のあとに期間（eight years）は置けません（since 2018 ならOK）。時制の使い分けは、文法の幅（GRA）の最初の見せ場です。',
    'A state continuing from the past until now takes the present perfect: “I’ve lived… for eight years.” (A)’s simple present cannot carry a duration with “for”, and (B) misuses “since” with a length of time (since 2018 would work). Tense control is the first place Grammatical Range shows itself.',
  ),
  // 2. concept
  con(
    '文法の評価は「幅 × 正確さ」',
    'GRA = range × accuracy',
    'Grammatical Range and Accuracy という基準名のとおり、見られているのは2つです。\n\n①幅：多様な構造を使えるか。すべて現在形・すべて単文の答えは、ノーミスでも頭打ちになります\n\n②正確さ：ミスの密度。ゼロは要求されません——Band 7でも minor errors は許容されます\n\n幅を出す一番簡単な方法は、答えの中で時間軸を行き来すること。現在の話→これまでの経験（現在完了）→これからの予定（未来）と動くだけで、3つの時制の証拠が出せます。\n\nさらに because ／ although ／ which で文をつなげば複文が生まれ、構造の幅も同時に示せます。下の例のような「時間軸ツアー」を、口癖にしてしまいましょう。',
    'The criterion’s name says it all: ① RANGE — varied structures; an answer of all-simple-present, all-simple-sentences hits a ceiling even with zero errors. ② ACCURACY — error density; perfection is not required, and Band 7 tolerates minor slips.\n\nThe easiest way to show range is to travel across time inside one answer: present situation → experience so far (present perfect) → plans (future). That alone evidences three tenses. Join clauses with because / although / which and structural variety comes with it. Make the “time tour” below your default.',
    '現在 → I work from home most days.\n経験 → I’ve been doing that since 2022.\n未来 → I’m hoping to move closer to the office next year.',
  ),
  // 3. gap: present perfect transform
  gap(
    '動詞 live を、文に合う形に変えて入力してください（短縮形でも可）。',
    '“I ______ in Nagoya since 2019, so I know the city pretty well now.”（live）',
    ['have lived', "'ve lived", '’ve lived', 've lived', 'have been living', "'ve been living", '’ve been living', 've been living'],
    'since 2019（〜以来ずっと）なので現在完了の have lived（または have been living）。\n\n話すときは I’ve lived と短縮できると自然です。since・for ＋期間が聞こえたら現在完了——この反射を作りましょう。',
    '“Since 2019” calls for the present perfect: have lived / have been living. In speech the contraction “I’ve lived” sounds most natural. Build the reflex: hear “since” or “for + period”, reach for the perfect.',
  ),
  // 4. gap: future plan transform
  gap(
    '動詞 go を使って、決まっている予定の形にしてください（短縮形でも可）。',
    '“Next April I ______ to start a new job in Yokohama, so I’m flat-hunting at the moment.”（go）',
    ['am going', "'m going", '’m going', 'm going'],
    '決まっている予定は be going to で、I’m going to start 〜。\n\n未来の話を1文入れるだけで答えの時間軸が広がり、文法の幅の証拠になります。「現在→未来」への切り替えを、意識して答えに混ぜましょう。',
    'A settled plan takes “be going to”: I’m going to start… One future-time sentence widens the answer’s time range — instant GRA evidence. Practise pivoting from present description to future plans on purpose.',
  ),
  // 5. single_choice: tense meaning
  q(
    '「今もその会社で働いている」と伝わる文はどれでしょう？',
    '仕事について話しています。ニュアンスの違いに注意してください。',
    [
      '“I worked at the company for five years.”',
      '“I’ve worked at the company for five years.”',
      '“I was working at the company for five years.”',
    ],
    1,
    '現在完了の I’ve worked 〜 は「5年勤めて、今も勤めている」。過去形の I worked は「（今は辞めている）」を含意します。(C)の過去進行形は背景描写の時制で、単独では落ち着きません。\n\n助動詞ひとつで「現職か離職か」が変わる——時制は飾りではなく、意味そのものです。',
    '“I’ve worked there for five years” means you still do; “I worked there” implies you have left. (C)’s past continuous describes background action and sounds unfinished on its own. One auxiliary changes your employment status — tense is meaning, not decoration.',
  ),
  // 6. concept: conditionals and comparatives
  con(
    '条件文と比較で、バンドをもう一段',
    'Conditionals and comparatives: the band boosters',
    '時制の次に効くブースターが2つあります。\n\n①仮定法：If I had more time, I’d take up the piano.（実際には時間がない）——「現実と違う話」ができることは、文法の幅の強い証拠です。「もし〜なら？」系の質問は必ず来るので、If I ＋過去形, I’d 〜 の型を体に入れておきます\n\n②比較：far more convenient than（〜よりはるかに便利）／ not as quiet as（〜ほど静かではない）／ the best decision I’ve ever made——二択の質問（都会と田舎、どちらが？）への答えで自然に活躍します\n\nどちらも「型ごと」覚えて、中身だけ差し替えるのがコツです。',
    'After tenses, two boosters: ① the second conditional — “If I had more time, I’d take up the piano” (you don’t) — talking about unreal situations is strong evidence of range, and “what if” questions always come, so install the frame If I + past, I’d…; ② comparatives — “far more convenient than”, “not as quiet as”, “the best decision I’ve ever made” — which either-or questions (city or countryside?) will call for naturally.\n\nLearn both as whole frames and swap the contents.',
    'If I could live anywhere, I’d choose somewhere by the sea.\nCommuting by bike is far cheaper than driving — and honestly less stressful.',
  ),
  // 7. gap: conditional transform
  gap(
    '動詞 have を、文に合う形に変えて入力してください。',
    '“If I ______ more free time, I would probably take up the piano.”（have）',
    ['had'],
    '現実には時間がない、という仮定の話なので仮定法過去：If I had 〜, I would…。\n\nIf I have と現在形にすると「実際にあり得る話」になり、後半の would と噛み合いません。前半が過去形・後半が would——この対応をワンセットで覚えます。',
    'An unreal present calls for the second conditional: If I HAD more time, I would… The simple present “if I have” describes a real possibility and clashes with “would” in the main clause. Past form in the if-clause, would in the main clause — memorise them as a pair.',
  ),
  // 8. drag_fill: multi-tense answer
  drag(
    '時制に注意して、動詞を当てはめてください。',
    '【試験官】“Tell me about where you live.”',
    '“I ___ in Fukuoka at the moment, but I ___ up in a small town along the coast. I ___ here for about six years now, and if the chance ___, I’d happily stay another ten.”',
    ['live', 'grew', 'have lived', 'arose', 'lived', 'grow', 'will arise'],
    ['live', 'grew', 'have lived', 'arose'],
    '現在（live）→過去（grew up）→現在完了（have lived 〜 for six years now）→仮定法（if the chance arose, I’d 〜）。\n\n3つ目の空所は now があるので、過去形の lived は入れません。4つ目は後半の I’d と組む仮定法過去なので、will arise は不可。ひとつの答えの中で時間軸を行き来する——これがGRAの理想形です。',
    'Present (live) → past (grew up) → present perfect (have lived… for six years NOW, which rules out the simple past “lived”) → second conditional (if the chance AROSE, I’d stay — “will arise” cannot pair with “I’d”). One answer, four time frames: exactly what Grammatical Range means.',
  ),
  // 9. gap: comparative production
  gap(
    '比較の文を完成させてください（1語）。',
    '“Living in the countryside is far ______ stressful than living in a big city, at least in my experience.”',
    ['less'],
    'less stressful than（〜よりストレスが少ない）。比較は more 〜 than だけではありません。\n\nless ／ far less ／ not as 〜 as を使い分けられると、比較表現の幅が一気に出ます。far ＋比較級（はるかに〜）の強調も、自然に聞こえる定番です。',
    '“Far LESS stressful than” — comparison isn’t only “more… than”. Less, far less and “not as… as” give you three more tools, and “far + comparative” adds natural emphasis.',
  ),
  // 10. recap
  con(
    'まとめ：時間軸を旅する答え',
    'Recap: answers that travel through time',
    '・GRA＝幅×正確さ。ノーミスの単文連発より、多少のリスクを取った複文\n\n・since ／ for ＋期間 → 現在完了（I’ve lived 〜）\n\n・現在→過去→現在完了→未来と、時間軸を行き来して幅を見せる\n\n・仮定法の型：If I ＋過去形, I’d 〜\n\n・比較は more だけでなく less ／ not as 〜 as ／ far ＋比較級\n\n次のレッスンでは、文より大きな単位——答え全体の組み立てを鍛えます。',
    '• GRA = range × accuracy: ambitious complex sentences beat error-free monotony.\n\n• Since / for + period → present perfect (I’ve lived…).\n\n• Travel the timeline — present, past, perfect, future — inside one answer.\n\n• The conditional frame: If I + past, I’d…\n\n• Compare with less / not as… as / far + comparative, not just “more”.\n\nNext lesson: a bigger unit than the sentence — structuring the whole answer.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// SPEAKING LESSON 4 — 答えの組み立て (ielts-speaking-structure)
// ════════════════════════════════════════════════════════════════════════════
const S4_SCREENS = [
  // 1. hook
  q(
    'まずは1問。同じ材料でも、伝わり方が変わります。試験官にとって追いやすいのはどちらで、理由は何でしょう？',
    '【試験官】“Do you think people should keep learning after they leave school?”\n\n【答えX】“Definitely — mainly because the world keeps changing. My father, for example, learned video editing at sixty, and it gave him a whole new circle of friends. So yes, learning shouldn’t stop at graduation.”\n【答えY】“My father learned video editing at sixty. The world keeps changing, I think. Friends are important too. So… yes, people should learn, definitely.”',
    [
      'X——主張→理由→例→締めの順で、聞き手が今どこにいるか常にわかるから',
      'Y——例から始まっていて、具体的で印象に残るから',
      'X——Yより文法的に正確な文が多いから',
    ],
    0,
    'XとYは、使っている材料がほぼ同じです。違いは並べ方だけ。Xは主張→理由→例→締めの順なので、聞き手は迷子になりません。\n\nYは例が先に来て「なぜお父さんの話？」となり、最後も主張を繰り返すだけでまとまりません。(C)について——両者に文法の差はほとんどなく、差がついているのは一貫性（Coherence）です。',
    'X and Y contain nearly identical material — only the ORDER differs. X runs point → reason → example → wrap, so the listener always knows where they are. Y leads with an example (“why are we hearing about your father?”) and ends by circling back. Grammar (C) is roughly equal here; the gap is pure coherence.',
  ),
  // 2. concept: the mini-paragraph
  con(
    '答えは「主張→理由→例→締め」のミニ段落',
    'Answers are mini-paragraphs: point → reason → example → wrap',
    '良い答えは、口で話す小さな段落です。部品は4つ。\n\n①主張：最初に結論。I’d say yes. ／ For me, it’s the train.\n\n②理由：mainly because 〜 ／ The main thing is 〜\n\n③例：For example, 〜（固有名詞・数字が入ると強い）\n\n④締め：So overall, 〜 と1文で着地\n\n時間にして30秒前後。Coherence の採点は、まさにこの「並び」を見ています。\n\n大事なのは順番です。理由や例がどれだけ良くても、主張より先に出てくると、聞き手は行き先のわからないバスに乗せられた状態になります。慣れてきたら④は省略できますが、①が先頭——これだけは絶対に崩さないでください。',
    'A good answer is a spoken mini-paragraph with four parts: ① POINT — conclusion first: “I’d say yes.” ② REASON — “mainly because…” ③ EXAMPLE — “For example…”, with names and numbers for weight. ④ WRAP — one landing sentence: “So overall…”. About thirty seconds.\n\nCoherence is graded on exactly this ordering. However good your reasons and examples are, putting them before the point puts the listener on a bus with no destination sign. The wrap can be dropped once you are comfortable; point-first is non-negotiable.',
    '主張 → I’d say yes.\n理由 → mainly because …\n例 → For example, …\n締め → So overall, …',
  ),
  // 3. single_choice: which sentence opens (1)
  q(
    '答えの「最初の1文」として最も適切なのはどれでしょう？',
    '【試験官】“Is it important for children to learn a foreign language?”',
    [
      '“For example, my niece started English at four and absolutely loves it.”',
      '“Children’s brains absorb new sounds much faster than adults’ do.”',
      '“I’d say it’s really valuable, though maybe not for the reasons people expect.”',
    ],
    2,
    '最初の1文の仕事は、質問に答えることです。(C)は立場（really valuable）を最初に置き、続きへの興味まで作っています。\n\n(B)は理由としては優秀ですが、肝心の「で、あなたはどう思う？」に答える前に細部へ入ってしまっています。(A)の例も同じで、主張のあとに来てこそ意味を持ちます。',
    'The opening sentence has one job: answer the question. (C) states a position first and even sets up curiosity. (B) is an excellent REASON, but it dives into support before answering “so what do you think?”. (A)’s example has the same problem — examples earn their place only after the point.',
  ),
  // 4. drag_fill: linking devices
  drag(
    'つなぎ言葉を当てはめて、答えを完成させてください。',
    '【試験官】“Do you prefer paper books or e-books?”',
    '“I’d say I prefer reading on paper, mainly ___ it’s easier on my eyes. ___, I read a paperback for two hours last night with no trouble, ___ twenty minutes on my phone gives me a headache. ___, e-books do win on convenience when I travel.”',
    ['because', 'For example', 'whereas', 'However', 'so', 'In other words'],
    ['because', 'For example', 'whereas', 'However'],
    'mainly because で理由、For example で例、whereas（〜なのに対して）で紙とスマホの対比、However で譲歩への転換です。\n\nwhereas と However はどちらも「対比」ですが、whereas は1文の中で2つを比べ、However は文頭で話の方向そのものを変えます。この使い分けが、つなぎ言葉の上級編です。',
    '“Because” introduces the reason, “For example” the evidence, “whereas” contrasts paper with the phone inside one sentence, and “However” turns the whole answer toward a concession. Whereas compares two things mid-sentence; However redirects the argument from the front — knowing which job each does is the advanced move.',
  ),
  // 5. concept: signposting
  con(
    '道路標識は「曲がり角」にだけ',
    'Signpost the corners, not every step',
    '話の向きが変わる場所には、聞き手のための標識を立てます。\n\n・理由へ → The main thing is… ／ mainly because…\n\n・追加 → On top of that, …\n\n・譲歩へ → Having said that, …\n\n・締め → So overall, …\n\n注意はひとつ、使いすぎないこと。毎文の頭に Moreover ／ Furthermore ／ Additionally と並べると、暗記した型紙に聞こえて逆効果です。ひとつの答えに2〜3個、本当に向きが変わる角にだけ。\n\n標識は聞き手のためのものですが、実は話し手も助けます。詰まりかけたとき、On top of that… と口に出せば、次の内容を探す時間が自然に生まれるのです。',
    'Plant signs where the talk changes direction: into the reason (“The main thing is…”), adding (“On top of that…”), conceding (“Having said that…”), landing (“So overall…”).\n\nOne warning: don’t over-sign. A Moreover-Furthermore-Additionally pile-up at every sentence head sounds like a recited template. Two or three per answer, only at genuine corners.\n\nSigns serve the listener — but they rescue the speaker too: saying “On top of that…” out loud buys a natural beat in which to find what comes next.',
    '理由へ → The main thing is…\n追加 → On top of that…\n譲歩へ → Having said that…\n締め → So overall…',
  ),
  // 6. single_choice: coherence diagnosis
  q(
    'この答えの流れを弱くしている文はどれでしょう？',
    '【試験官】“Is exercising outdoors better than going to a gym?”\n【受験者】\n①“For me, yes — outdoor exercise wins.”\n②“The main reason is that fresh air genuinely lifts my mood.”\n③“For example, gym memberships have become surprisingly expensive in my city.”\n④“So overall, I’d choose the park over the treadmill.”',
    ['②の文', '③の文', '④の文'],
    1,
    '②が「気分が上がるから」と理由を述べたのに、③の例はジムの料金の話——理由と例がつながっていません。例は、直前の理由の証拠になっていて初めて機能します。\n\n料金の話をしたいなら、Another reason is the cost. と2つ目の理由を立ててから。For example という標識が正しくても、積み荷が違えば一貫性は崩れます。',
    '② claims the reason is MOOD, but ③’s example is about membership FEES — evidence for a reason that was never given. An example only works as proof of the reason just stated. To talk about cost, open a second reason first (“Another reason is the cost”). The signpost was right; the cargo didn’t match.',
  ),
  // 7. gap: concession signpost production
  gap(
    '譲歩へ切り返す定番フレーズを完成させてください（1語）。',
    '“I love the neighbourhood — it’s green, quiet and friendly. ______ said that, the rent is climbing every year.”',
    ['having'],
    'Having said that,（そうは言っても）は、直前の自分の発言に反対側の事情を付け足す転換の標識です。However より口語的で、スピーキング向き。\n\n良い面→ Having said that →現実的な短所、という1往復は、多面的に語れる証拠になります。',
    '“HAVING said that,” adds the other side of what you just claimed — a spoken-register cousin of “However”. Positives → having said that → a realistic drawback: that single round trip proves you can see both sides.',
  ),
  // 8. single_choice: which sentence opens (2)
  q(
    'Part 3らしい大きな質問です。最初の1文として最も良いのはどれでしょう？',
    '【試験官】“Should museums be free to visit?”',
    [
      '“On balance, I’d say yes — at least the big public ones.”',
      '“Museums preserve objects that tell the story of a society.”',
      '“For instance, the national museum in my city charges around ten pounds.”',
    ],
    0,
    '(A)は立場（yes）に、on balance（総合的には）の含みと at least 〜（少なくとも〜は）の限定を添えた、理想的な開幕です。\n\n(B)は事実として正しい前置きですが、立場がまだ見えません。(C)は例が先。背景説明から入りたくなる気持ちは自然ですが、最初の1文の仕事は常に「質問に答えること」です。',
    '(A) answers immediately, hedged with “on balance” and scoped with “at least the big public ones” — a model opener. (B) is a true statement that takes no position; (C) leads with an example again. Background feels safe to start with, but the first sentence’s job never changes: answer the question.',
  ),
  // 9. gap: contrast signpost production
  gap(
    '対比の定番フレーズを完成させてください（1語）。',
    '“Working from home saves me two hours a day. On the ______ hand, I do miss the energy of the office.”',
    ['other'],
    'On the other hand（その一方で）。両面を語るときの、最も基本的な標識です。\n\n前半でメリット、On the other hand で実感のこもったデメリット——この1往復ができるだけで、答えに立体感が出ます。',
    '“On the OTHER hand” — the fundamental two-sides signpost. One benefit, then “on the other hand” plus a felt drawback: that single exchange gives any answer dimension.',
  ),
  // 10. recap
  con(
    'まとめ：主張が先頭、標識は角に',
    'Recap: point first, signs at the corners',
    '・答えはミニ段落：主張→理由→例→締め、約30秒\n\n・最初の1文の仕事は「質問に答えること」。例や背景から始めない\n\n・例は直前の理由の証拠になっていること（標識が合っていても積み荷を確認）\n\n・標識は2〜3個、本当の曲がり角にだけ\n\n・Having said that ／ On the other hand で反対側にも目配りを\n\n次のレッスンから実戦編——Part 2キューカードの攻略です。',
    '• Answers are mini-paragraphs: point → reason → example → wrap, ~30 seconds.\n\n• The first sentence answers the question — never open with an example or background.\n\n• An example must prove the reason just given; check the cargo, not just the signpost.\n\n• Two or three signposts per answer, at genuine corners only.\n\n• “Having said that” / “On the other hand” show the other side.\n\nNext: into the exam proper — the Part 2 cue card.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// SPEAKING LESSON 5 — Part 2 キューカード攻略 (ielts-speaking-cue-card)
// ════════════════════════════════════════════════════════════════════════════
const S5_SCREENS = [
  // 1. hook
  q(
    'まずは1問。Part 2の準備時間は1分だけ。メモの取り方として最も効果的なのはどれでしょう？',
    '【キューカード】\nDescribe a journey you remember well.\nYou should say:\n・where you went\n・who you were with\n・what happened\nand explain why you remember it so well.',
    [
      '使いたい上級単語を、思いつくだけ書き出す',
      '4つの箇条書きそれぞれに、キーワードを2〜3個ずつメモする',
      '最初の2文を完全な文で書いて、出だしを固める',
    ],
    1,
    'カードの4つの箇条書きが、そのままスピーチの設計図です。各項目にキーワードを2〜3個（例：青森・夜行バス／大学の友人2人／大雪で立ち往生／人の優しさ）置けば、1分で2分ぶんの足場が組めます。\n\n(A)の単語リストは話の流れを作れません。(C)は1分が2文で終わり、しかもその2文を読み上げる不自然な出だしになります。メモは思い出すためのフックであって、原稿ではありません。',
    '(B): the card’s four bullets ARE the speech plan — two or three keywords per bullet scaffolds the whole two minutes (e.g. Aomori, night bus / two uni friends / stuck in heavy snow / strangers’ kindness). (A)’s vocabulary list builds no storyline, and (C) spends the minute producing two sentences you will then recite. Notes are hooks for memory, not a manuscript.',
  ),
  // 2. concept: the blueprint
  con(
    '4つの箇条書き＝2分間の設計図',
    'Four bullets = the two-minute blueprint',
    'Part 2の流れ：トピックの書かれたカードを受け取り、準備1分→スピーチ1〜2分。試験官は相づちも助け舟も出しません。\n\n最大の恐怖は「30秒で話が尽きる」ことですが、解決策はカードに印刷されています。箇条書きは必ず4つ。1項目を20〜30秒で話せば、それだけで1分半〜2分に届く計算です。\n\n準備の1分でやることは固定：4項目それぞれにキーワードを2〜3個、話す順に上からメモ。スピーチ中は、メモを上から順に消化するだけ。迷子になりようがありません。\n\nカードは敵ではなく、台本です。',
    'The Part 2 routine: you receive a topic card, prepare for one minute, then speak for one to two minutes — no nods, no rescue from the examiner.\n\nThe universal fear is running dry at thirty seconds, but the solution is printed on the card: there are always four bullets, and 20–30 seconds per bullet lands you at 1.5–2 minutes by arithmetic alone.\n\nThe prep minute has one fixed job: two or three keywords per bullet, listed top-to-bottom in speaking order. While speaking, walk down the list. Getting lost becomes impossible. The card is not the enemy — it is the script.',
    '【カード】Describe a journey you remember well.\n①どこへ → 青森・夜行バス\n②誰と → 大学の友人2人\n③何が → 大雪・立ち往生\n④なぜ記憶に → 人の優しさ・達成感',
  ),
  // 3. gap: opening phrase
  gap(
    '話し始めの定番フレーズを完成させてください（1語）。',
    '“I’d ______ to talk about a trip to Hokkaido I took two winters ago, which turned into a small adventure.”',
    ['like', 'love'],
    'I’d like to talk about 〜 が、Part 2の最も確実な開幕フレーズです。トピックを自分の言葉で宣言しつつ、頭を整える時間も稼げます。\n\n出だしを型で固定しておけば、本番の脳は中身だけに集中できます。',
    '“I’d LIKE to talk about ~” is the dependable Part 2 opener: it announces the topic in your own words while your nerves settle. Fix the opening line in advance and save all your thinking for the content.',
  ),
  // 4. drag_fill: answer skeleton
  drag(
    'スピーチの骨組みに、つなぎの語句を当てはめてください。',
    '【キューカード】Describe a café or restaurant you enjoy visiting.',
    '“I’d like to talk about a little café near my office. ___ where it is, it’s tucked down a side street about five minutes’ walk away. I go there ___ twice a week, usually after lunch. ___ I’m there, I always order the same hand-drip coffee and read for a while. ___, that’s why that tiny café has become my small escape from work.”',
    ['As for', 'at least', 'While', 'So', 'Even though', 'As well as', 'By far'],
    ['As for', 'at least', 'While', 'So'],
    'As for 〜（〜について言うと）でカードの項目へ移り、at least twice a week（少なくとも週2回）で頻度、While I’m there（そこにいる間）で過ごし方、So, that’s why 〜 で着地します。\n\nEven though I’m there では意味が通らず、By far は最上級の強調（by far the best）にしか使えません。骨組みのフレーズが決まっていれば、中身を差し替えるだけでどんなカードにも対応できます。',
    '“As for” steps onto the card’s next bullet, “at least twice a week” gives frequency, “While I’m there” frames the routine, and “So, that’s why…” lands the talk. “Even though I’m there” makes no sense here, and “by far” only intensifies superlatives. With the skeleton phrases fixed, any card becomes a matter of swapping the contents.',
  ),
  // 5. concept: spare-time strategy
  con(
    '時間が余ったら、感情と細部で延ばす',
    'Spare time? Extend with feelings and detail',
    '1項目20〜30秒の配分でも、早く終わりそうになることはあります。そのときの延長パーツは決まっています。\n\n・そのとき何と言ったか・何を思ったか（セリフの引用は最強の具体化）\n\n・五感の細部：見えたもの、音、匂い\n\n・その後どうなったか。今も続いているか\n\nどのトピックにも使える万能部品です。入り口のフレーズも決めておきましょう（下の例）。\n\n逆にやってはいけないのが、沈黙と、同じ話の繰り返し。沈黙は流暢さに直撃し、繰り返しは新しい評価材料を出せません。カードの最終行（and explain why ／ how you felt…）が感情パートをわざわざ用意してくれているのは、偶然ではないのです。',
    'Even at 20–30 seconds per bullet, you may finish early. The extension parts are always the same: what was said or thought at the time (quoting someone’s words is the strongest concretiser); sensory detail — sights, sounds, smells; what happened afterwards, and whether it continues today. They fit any topic. Keep entry phrases ready (below).\n\nThe two banned moves: silence, which hits Fluency directly, and repetition, which produces nothing new to grade. Notice that the card’s last line (“and explain why / how you felt…”) hands you the feelings section on purpose.',
    '延長の入り口\nWhat I remember most is…\nLooking back, …\nEven now, …',
  ),
  // 6. single_choice: spare time decision
  q(
    '4つの項目を話し終えて、まだ1分10秒。残り時間をどう使うのが最善でしょう？',
    'Part 2のスピーチ中。カードの内容はすべて話しましたが、時間が残っています。',
    [
      '同じ内容を別の言い方でもう一度まとめ、語彙の幅を見せる',
      '締めのフレーズを言って終え、試験官の次の質問を待つ',
      '「いちばん覚えていること」や後日談など、感情と細部を足して話を続ける',
    ],
    2,
    'What I remember most is… から感情・細部・後日談へ広げれば、新しい語彙と文法を見せながら2分を使い切れます。\n\n(A)の言い直しは、すでに採点済みの内容を繰り返すだけで新しい材料を出せません。(B)は減点ではありませんが、2分話せるのに1分強でやめるのは、見せられたはずの英語を見せずに終えるということです。',
    '(C): expand with “What I remember most is…”, the aftermath, the feelings — fresh language all the way to the two-minute mark. (A) re-words material the examiner has already graded. Stopping early (B) isn’t penalised directly, but it hands back time you could have filled with scoreable English.',
  ),
  // 7. gap: closing phrase
  gap(
    '締めの定番フレーズを完成させてください（1語）。',
    '“… So, that’s ______ that journey is still my favourite story to tell.”',
    ['why'],
    'So, that’s why 〜（そういうわけで〜なんです）。この1文が「スピーチは終わりました」の合図になり、試験官が次を待つ気まずい沈黙を防ぎます。\n\n開幕の I’d like to talk about 〜 とセットで、毎回同じで構いません。型を固定するほど、本番は楽になります。',
    '“So, that’s WHY ~” signals a finished talk and prevents the awkward is-there-more silence. Pair it with your fixed opener — the frame can be identical every time, and the more fixed it is, the easier the exam day.',
  ),
  // 8. single_choice: answering the final bullet
  q(
    'カードの最終行に対する答えとして最も良いのはどれでしょう？',
    '【キューカードの最終行】and explain why this person is important to you.\n\n（祖父について話しています）',
    [
      '“He’s important to me because he taught me patience — whenever I rushed my homework, he’d just smile and say, ‘Do it once, do it well.’ I still hear that voice before big decisions.”',
      '“He lives in a small town in Kyushu, in the same house where my mother grew up.”',
      '“He is a very important person for me and I respect him a lot, because he is really important in my life.”',
    ],
    0,
    '(A)は「なぜ大切か」に、教わったこと＋実際の口癖の引用＋今への影響、という細部で答えています。人のセリフを引用する技は、どんなトピックでも使える最強の具体化です。\n\n(B)は場所の説明で、別の箇条書きへの答え。(C)は important を3回繰り返しているだけで、理由がひとつもありません。',
    '(A) answers “why” with a lesson learned, an actual quoted catchphrase, and its effect today — quoting someone’s words is a universally available way to make any story concrete. (B) answers a different bullet (where he lives), and (C) circles the word “important” three times without ever producing a reason.',
  ),
  // 9. gap: reflective extension phrase
  gap(
    '振り返りの延長フレーズを完成させてください（1語）。',
    '“Looking ______, I think that trip changed the way I see my own country.”',
    ['back'],
    'Looking back,（振り返ってみると）は、話を「当時」から「今の自分」へつなぐ延長フレーズです。\n\n過去の描写から現在形の感想へ自然に時制が切り替わるので、文法の幅の証拠としても働きます。延長パーツと文法ブースターの一石二鳥です。',
    '“Looking BACK,” bridges the story from then to now — and shifts you naturally from past narration into present-tense reflection, which doubles as grammatical-range evidence. One phrase, two criteria served.',
  ),
  // 10. recap
  con(
    'まとめ：カードが台本、細部が延長',
    'Recap: the card is the script, detail is the extension',
    '・4つの箇条書き＝設計図。1項目20〜30秒×4で2分が埋まる\n\n・準備の1分はキーワードのみ。文は書かない\n\n・開幕と締めは固定：I’d like to talk about 〜 ／ So, that’s why 〜\n\n・時間が余ったら、セリフの引用・五感の細部・後日談で延長\n\n・沈黙と繰り返しだけはしない\n\n最終レッスンは、抽象的な議論で締めくくる Part 3 です。',
    '• Four bullets = the blueprint: 20–30 seconds each fills the two minutes.\n\n• Prep minute: keywords only, never sentences.\n\n• Fixed opener and closer: “I’d like to talk about ~” / “So, that’s why ~”.\n\n• Spare time → quoted words, sensory detail, the aftermath.\n\n• Never silence, never repetition.\n\nFinal lesson: the abstract finale — Part 3.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// SPEAKING LESSON 6 — Part 3 議論を組み立てる (ielts-speaking-part3)
// ════════════════════════════════════════════════════════════════════════════
const S6_SCREENS = [
  // 1. hook
  q(
    'まずは1問。Part 3の答えとして最も評価が高いのはどれでしょう？',
    '【試験官】“Should governments spend money on space exploration?”',
    [
      '“Yes, I think so. Space is interesting and important for the future.”',
      '“On the whole, I’d say yes — mainly because the technology tends to filter down into everyday life. Weather satellites, for instance, came out of space programmes. That said, I can see why people want the money spent closer to home.”',
      '“Absolutely yes. Space exploration is always worth the money, whatever it costs, and people who disagree simply don’t understand science.”',
    ],
    1,
    '(B)は立場→理由→例→譲歩の4部構成です。最後の That said 〜（とはいえ〜）が「反対側にも一理ある」と認める譲歩で、多面的に考えられる証拠になります。\n\n(A)は内容が薄く、Part 1なら通ってもPart 3では物足りません。(C)は流暢ですが、whatever it costs ／ simply don’t understand と断定が強すぎて一面的です。長く話すことと、議論を組み立てることは別の技術です。',
    '(B) runs the four moves: position → reason → example → concession. The closing “That said…” grants the other side its point — proof of multi-angle thinking. (A) is too thin for Part 3, and (C) is long and fluent but absolutist (“whatever it costs”, “simply don’t understand”), which makes it one-dimensional. Talking at length and building an argument are different skills.',
  ),
  // 2. concept: the frame
  con(
    '型は「立場→理由→例→譲歩」',
    'The frame: position → reason → example → concession',
    'Part 3は、社会や将来についての大きな質問が続く「口頭のミニエッセイ」です。手ぶらで挑むと迷子になります。持っていくのはこの型。\n\n①立場：On the whole, I’d say… ／ It depends, but…\n\n②理由：The main reason is… ／ mainly because…\n\n③例：For instance… ／ In Japan, for example…\n\n④譲歩：That said, … ／ Of course, …\n\n4ステップで30〜45秒。Part 4つのうち、バンドを最も押し上げるのが④の譲歩です。反対側を認めても立場は弱くなりません——むしろ「両面を見た上での結論」として強くなります。\n\n合図のフレーズを口が覚えていれば、頭が中身を考えている間も、構造は勝手に立ち上がります。',
    'Part 3 strings big questions about society and the future — a spoken mini-essay. The equipment to carry: ① position (“On the whole, I’d say…”), ② reason (“The main reason is…”), ③ example (“For instance…”), ④ concession (“That said…” / “Of course…”). Four moves, 30–45 seconds.\n\nThe concession is the strongest band-mover of the four: granting the other side its point doesn’t weaken your position — it upgrades it into a conclusion reached after seeing both sides. And once your mouth knows the signal phrases, the structure assembles itself while your brain works on content.',
    '立場 → On the whole, I’d say…\n理由 → mainly because…\n例 → For instance, …\n譲歩 → That said, …',
  ),
  // 3. drag_fill: order the labelled moves
  drag(
    '4つの部品を、議論の型の順番に並べてください（2つは使いません）。',
    '【試験官】“Does tourism benefit local communities?”',
    '___\n↓\n___\n↓\n___\n↓\n___',
    [
      '【立場】On the whole, I’d say it does.',
      '【理由】The main reason is that tourism creates steady work for local people.',
      '【例】In my hometown, for instance, whole families now run guesthouses.',
      '【譲歩】That said, overcrowding can make life harder for residents.',
      '【繰り返し】Tourism is good. It is really very good for everyone.',
      '【定義】Tourism means travelling to other places for pleasure.',
    ],
    [
      '【立場】On the whole, I’d say it does.',
      '【理由】The main reason is that tourism creates steady work for local people.',
      '【例】In my hometown, for instance, whole families now run guesthouses.',
      '【譲歩】That said, overcrowding can make life harder for residents.',
    ],
    '立場→理由→例→譲歩の順です。\n\n【定義】のように用語の説明から入ると、質問に答えないまま時間が過ぎます。【繰り返し】は同じ主張を重ねるだけで、議論が前に進みません。型の4部品には、それぞれ他の部品では果たせない役割があります。',
    'Position → reason → example → concession. Opening with a definition burns time without answering, and repetition restates without advancing. Each of the four moves does a job none of the others can.',
  ),
  // 4. gap: It depends production
  gap(
    '二択の質問を受ける定番フレーズです。空所の1語を入力してください。',
    '【試験官】“Is it better to work for a large company or a small one?”\n【あなた】“Honestly, it ______ on what you value — big firms offer stability, while small ones give you responsibility much earlier.”',
    ['depends'],
    'It depends on 〜（〜次第です）は、二択の質問を「場合分け」に変える最強の入り口です。\n\nそのまま while で対比を続ければ、1つの質問に2つの視点で答える、Part 3らしい立体的な答えが完成します。',
    '“It DEPENDS on ~” converts an either-or question into a case-by-case answer, and the “while” contrast that follows delivers two perspectives in one breath — exactly the dimensionality Part 3 rewards.',
  ),
  // 5. concept: hedging + buying time
  con(
    '断定を避け、考える時間は堂々と稼ぐ',
    'Hedge your claims, buy time out loud',
    'Part 3の質問は大きいので、断定（always ／ everyone ／ 100%）は反例ひとつで崩れます。主張は柔らかく出すのが上級者です。\n\n・tend to（〜しがち）／ generally ／ probably\n\n・I’d say…（I think より柔らかい）\n\n・It depends on…（場合分け）\n\nもうひとつの道具が、時間稼ぎのフレーズです。\n\n・That’s a tough one.（難しい質問ですね）\n\n・I’ve never really thought about that, but…\n\n・It’s hard to say, but on balance…\n\n沈黙の3秒は減点要素ですが、声に出して考える3秒は自然な会話です。しかもフレーズ自体が評価対象の英語になります。',
    'Part 3 questions are big, so absolutes (always / everyone / 100%) collapse at the first counter-example. Assert softly: “tend to”, “generally”, “probably”, “I’d say…” (gentler than “I think”), “It depends on…”.\n\nThe other tool is buying time aloud: “That’s a tough one.” / “I’ve never really thought about that, but…” / “It’s hard to say, but on balance…”. Three seconds of silence costs you; three seconds of audible thinking is natural conversation — and the phrase itself is scoreable English.',
    '× Everyone shops online now.\n○ These days, most people tend to do at least some of their shopping online.',
  ),
  // 6. gap: hedging production
  gap(
    '断定を避けた言い方に直します。空所の1語を入力してください。',
    '“Younger people ______ to pick up new technology more quickly than older generations.”',
    ['tend', 'seem', 'appear'],
    'tend to（〜する傾向がある）が代表的なヘッジ表現です（seem to ／ appear to も可）。\n\nYoung people always pick up… と断定すると、反例ひとつで崩れる主張になります。tend to を挟むだけで、同じ内容が「守りの堅い」主張に変わります。',
    '“TEND to” (also “seem to” / “appear to”) is the workhorse hedge. “Always” collapses at the first counter-example; “tend to” makes the same claim defensible. One small verb, a much smarter-sounding argument.',
  ),
  // 7. single_choice: the missing move
  q(
    'この答えに1つ足すとしたら、何が最も効果的でしょう？',
    '【試験官】“Should children get pocket money?”\n【受験者】“I’d say yes — mainly because handling small amounts teaches budgeting early. My parents, for instance, gave me 500 yen a week, and I still remember saving for two months to buy a game.”',
    [
      '譲歩を1文（Of course, it depends on the family’s circumstances. など）',
      '2つ目の具体例をもう1文',
      '立場をもう一度強く言い直す1文',
    ],
    0,
    'この答えには立場・理由・例がそろっていて、欠けているのは譲歩だけです。Of course, 〜 と反対側の事情をひとこと認めれば4部構成が完成し、多面的な思考の証拠になります。\n\n(B)の2つ目の例は、すでにある例と役割が重複します。(C)の言い直しは音量は増えても、新しい評価材料を生みません。',
    '(A): position, reason and example are already in place — the missing move is the concession. One “Of course, it depends on the family’s circumstances” completes the frame and evidences balanced thinking. A second example (B) duplicates a job already done, and restating the position (C) adds volume, not value.',
  ),
  // 8. gap: buy-time production
  gap(
    '考える時間を自然に稼ぐひとことです。空所の1語を入力してください。',
    '【試験官】“Will robots replace most human jobs?”\n【あなた】“That’s a ______ one — I suppose it comes down to the kind of job we’re talking about.”',
    ['tough', 'difficult', 'tricky', 'hard', 'big', 'good', 'great', 'complex', 'deep', 'interesting', 'challenging'],
    'That’s a tough one.（難しい質問ですね）が定番です（difficult ／ tricky なども可）。\n\n沈黙する代わりにこう言えば、考える時間を稼ぎながら自然な口語表現をひとつ見せられます。時間稼ぎは「ずるい技」ではなく、英語話者が実際に使う会話の道具です。',
    '“That’s a TOUGH one” (difficult / tricky also work) buys thinking time out loud instead of in silence — and the phrase itself is natural, scoreable English. Time-buying isn’t a trick; it is what fluent speakers actually do.',
  ),
  // 9. single_choice: partial agreement
  q(
    '賛否を聞かれたときの、最も評価される受け方はどれでしょう？',
    '【試験官】“Some people say city life is unhealthy. Do you agree?”',
    [
      '“I completely agree. The air, the noise, the stress — cities are bad for you in every possible way.”',
      '“Well, health is certainly something many people care about these days.”',
      '“I agree up to a point — pollution is a real issue. But cities also give people far better access to hospitals, gyms and healthy food.”',
    ],
    2,
    'I agree up to a point（ある程度は賛成です）は、認めるべき点を認めてから反対材料を出す、大人の賛否表明です。賛成・反対は全面降伏か全面対決の二択ではありません。\n\n(A)は every possible way が断定しすぎ。(B)は一般論に逃げていて、賛否の質問に答えていません。',
    '(C)’s “I agree up to a point” concedes what deserves conceding, then argues back — the adult way to handle agree-or-disagree. Agreement isn’t all-or-nothing: (A) over-commits with “every possible way”, and (B) retreats into a platitude without ever answering.',
  ),
  // 10. recap (level finale)
  con(
    'まとめ：型と柔らかさで議論する',
    'Recap: argue with a frame, assert with a hedge',
    '・Part 3の型：立場→理由→例→譲歩。30〜45秒\n\n・譲歩が最大のバンドブースター。That said ／ Of course で反対側を認める\n\n・断定よりヘッジ：tend to ／ generally ／ I’d say\n\n・二択は It depends on 〜 で場合分け、賛否は I agree up to a point で部分賛成\n\n・考える時間は That’s a tough one. と声に出して稼ぐ\n\nスピーキング攻略はこれで完了です。採点基準・語彙・文法・組み立て・Part 2・Part 3——6レッスンの型を、模試と本番で武器にしてください。',
    '• The Part 3 frame: position → reason → example → concession, 30–45 seconds.\n\n• The concession is the biggest band-booster: “That said” / “Of course”.\n\n• Hedge rather than absolutise: tend to / generally / I’d say.\n\n• Either-or → “It depends on ~”; agree-or-disagree → “I agree up to a point”.\n\n• Buy thinking time out loud: “That’s a tough one.”\n\nThat completes the Speaking level: criteria, vocabulary, grammar, structure, Part 2, Part 3 — six frames to carry into your mock tests and the real thing.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// WRITING REFRESH 1 — ielts-writing-essays (screens replaced, lesson row kept)
// ════════════════════════════════════════════════════════════════════════════
const W_ESSAYS_SCREENS = [
  // 1. hook: type identification
  q(
    'まずは1問。設問タイプの見極めです。',
    '【設問】\n“Some people believe that university education should be free for all students. To what extent do you agree or disagree?”\n\nこの設問はどのタイプでしょう？',
    [
      '両論型：2つの見方を順に論じ、最後に自分の意見を述べる',
      '意見型：立場を決め、エッセイ全体でその立場を支える',
      '原因解決型：問題の原因を分析し、解決策を提案する',
    ],
    1,
    'To what extent do you agree or disagree?（どの程度賛成／反対ですか）は意見型の決まり文句です。求められているのは、立場を決めて最後まで貫くこと。\n\nここで両論併記を始めると「設問に答えていない」と判定され、英語力に関係なく Task Response が沈みます。タイプ判定は、最初の10秒の最重要の仕事です。',
    '“To what extent do you agree or disagree?” marks an OPINION question: choose a side and defend it throughout. Drift into both-sides coverage and you are off-task, which sinks Task Response regardless of your English. Type identification is the most important ten seconds of the hour.',
  ),
  // 2. concept: skeleton + types
  con(
    'どんなテーマも、4段落で書ける',
    'Four paragraphs fit every topic',
    'Task 2は、どんなテーマが来てもこの骨格で書けます。\n\n①導入：設問の言い換え＋自分の立場（thesis）\n②本論1：理由その1＋具体例\n③本論2：理由その2＋具体例\n④結論：立場の再確認\n\n設問は2大タイプに分かれます。\n\n・意見型（agree or disagree?）：本論2つとも自分の立場を支える。または本論2で反対意見に反論する\n\n・両論型（Discuss both views and give your own opinion）：本論1＝見方A、本論2＝見方B。自分の意見は導入と結論で明示\n\n両論型で片方の見方しか書かないのは、最悪の失点パターンです。both views は文字どおり「両方」です。',
    'One skeleton fits every Task 2: ① intro — paraphrase the question + your thesis; ② body 1 — first reason + example; ③ body 2 — second reason + example; ④ conclusion — restate your position.\n\nQuestions split into two big types. OPINION (“agree or disagree?”): both bodies support your side, or body 2 rebuts the opposition. DISCUSS-BOTH-VIEWS: body 1 = view A, body 2 = view B, with YOUR opinion declared in the intro and conclusion. Covering only one view in a discuss-both question is the deadliest scoring mistake — “both” means both.',
    '意見型 → 本論1・2とも自分の側\n両論型 → 本論1＝見方A／本論2＝見方B',
  ),
  // 3. drag_fill: four-paragraph skeleton
  drag(
    '4つの段落を、エッセイの順番に並べてください（2つは使いません）。',
    '【設問】“Some people think school uniforms should be compulsory. To what extent do you agree or disagree?”',
    '___\n↓\n___\n↓\n___\n↓\n___',
    [
      '【導入】設問の言い換え＋自分の立場（thesis）',
      '【本論】理由①＋それを支える具体例',
      '【本論】理由②＋それを支える具体例',
      '【結論】立場の再確認＋ひとこと',
      '【導入】uniform という語の辞書的な定義',
      '【結論】新しい論点をもう1つ追加',
    ],
    [
      '【導入】設問の言い換え＋自分の立場（thesis）',
      '【本論】理由①＋それを支える具体例',
      '【本論】理由②＋それを支える具体例',
      '【結論】立場の再確認＋ひとこと',
    ],
    '導入→本論1→本論2→結論の4段落です。\n\n辞書的な定義から始める導入は立場を示せず、字数だけを消費します。結論で新しい論点を出すのは「論じ切っていない主張」を増やすだけ。どちらも採点者の信頼を失う動きです。',
    'Intro → body 1 → body 2 → conclusion. A dictionary-definition opening takes no position and burns words, and a brand-new argument in the conclusion is a claim you never defend — both erode the examiner’s trust in the essay’s control.',
  ),
  // 4. concept: thesis
  con(
    'thesis：導入の最後の1文が、答案の地図',
    'The thesis: the map sentence',
    '導入の最後に置く1文が thesis statement——「この答案の結論はこれです」という予告です。採点者はここで答案の地図を手に入れます。\n\n良い thesis の条件は2つ。\n\n①設問に直接答えている（賛成？反対？どちら寄り？）\n\n②理由をちらっと予告している\n\n両論型なら、While 〜（〜ではあるものの）で見方Aに目配りしてから自分の立場を述べると、1文で「両論を扱う予告＋意見表明」が完成します（下の例）。\n\n避けたいのは This essay will discuss this topic. のような中身ゼロの文。立場も理由も見えない thesis は、ないのと同じです。',
    'The last sentence of the intro is the thesis — the spoiler that hands the examiner a map. A good thesis does two things: answers the question directly (agree? disagree? leaning where?) and previews your reasons.\n\nFor discuss-both questions, a “While ~” opening nods to view A before declaring your camp — both views previewed and an opinion stated, in one sentence (below). The one to avoid: “This essay will discuss this topic.” A thesis with no position and no reasons is no thesis at all.',
    'While uniforms can limit self-expression, I largely agree that they benefit schools.',
  ),
  // 5. drag_fill: thesis construction
  drag(
    '語句を当てはめて、thesis を完成させてください。',
    '【設問】“School uniforms should be compulsory. To what extent do you agree or disagree?”\n\n導入の最後に置く1文：',
    '“___ uniforms can limit students’ self-expression, I ___ agree that they benefit schools, mainly because they ___ the pressure to follow fashion and ___ a sense of community.”',
    ['While', 'largely', 'reduce', 'create', 'Despite', 'reduces', 'creates'],
    ['While', 'largely', 'reduce', 'create'],
    'While 〜（〜ではあるものの）で反対側に目配りし、largely agree で立場の度合いを示し、理由2つ（reduce 〜 ／ create 〜）を予告する——thesis の役割すべてが1文に収まりました。\n\nDespite の後ろには名詞句しか置けないので、節（uniforms can limit…）は続けられません。主語が they なので reduces ／ creates は数が合いません。',
    '“While” concedes the other side, “largely agree” calibrates the position, and the two previewed reasons (reduce… / create…) complete the map. “Despite” cannot govern a full clause, and “reduces / creates” break agreement with the plural “they”.',
  ),
  // 6. single_choice: paragraph role
  q(
    'エッセイの中の1文です。この文の役割はどれでしょう？',
    '【両論型エッセイの中の1文】\n“On the other hand, those who favour small local shops argue that they keep money circulating within the community.”',
    [
      '本論2の冒頭——2つ目の見方を紹介するトピックセンテンス',
      '導入の thesis——筆者自身の立場の表明',
      '結論の冒頭——両方の見方をまとめ始める文',
    ],
    0,
    'On the other hand が「ここから2つ目の見方」の標識で、those who 〜 argue that…（〜と考える人々は…と主張する）は他者の見方を紹介する形です。つまり両論型の本論2を開くトピックセンテンス。\n\n筆者自身の意見なら I believe 〜 になるはずで、thesis と紛らわしいのはそのためですが、主語を見れば区別できます。結論なら In conclusion などの標識を伴います。',
    '“On the other hand” signposts the second view, and “those who… argue that…” reports OTHER people’s position — a topic sentence opening body 2. A thesis would say “I believe”; the subject gives it away. A conclusion would carry its own signpost (“In conclusion”).',
  ),
  // 7. concept: linking
  con(
    'リンキングは道路標識。立てるのは角だけ',
    'Linking phrases: signs at the corners',
    '段落と段落、文と文のつなぎ目には標識を立てます。採点基準の Coherence and Cohesion（一貫性）は、まさにここを見ています。\n\n・本論の頭：Firstly, ／ The main reason is that…\n\n・対比・転換：However, ／ On the other hand,（両論型の本論2の定位置）\n\n・具体例：For example, ／ For instance,\n\n・譲歩：Despite 〜（＋名詞句）／ Although 〜（＋節）\n\n・結論：In conclusion, ／ To sum up,\n\n注意点はひとつ、使いすぎないこと。毎文の頭に Moreover ／ Furthermore ／ Additionally と並ぶと、かえって機械的で不自然になります。1段落に2〜3個、必要な角にだけ。',
    'Plant signs at the joints — the Coherence and Cohesion criterion is graded right there. Body openers: Firstly / The main reason is that…; contrast: However / On the other hand (the natural opener for body 2 in a discuss-both essay); examples: For example / For instance; concession: Despite + noun phrase, Although + clause; conclusion: In conclusion / To sum up.\n\nOne warning: don’t over-sign the road. A Moreover-Furthermore-Additionally pile-up reads mechanical. Two or three per paragraph, only at the real corners.',
  ),
  // 8. gap: linking production (concession)
  gap(
    '「〜にもかかわらず」。空所に入る1語を入力してください。',
    '“______ its obvious convenience, online learning cannot fully replace the classroom.”',
    ['despite', 'notwithstanding', 'even with', 'for all'],
    'Despite ＋名詞句（その明らかな利便性にもかかわらず）。although は後ろに節（主語＋動詞）が必要なので、ここには置けません。\n\nDespite ／ In spite of ＋名詞、Although ＋節——この使い分けは、一貫性と文法の両方の基準で効きます。',
    '“DESPITE + noun phrase”. “Although” needs a full clause, so it cannot sit here. Despite / In spite of + noun vs. Although + clause: one distinction, marks in two criteria.',
  ),
  // 9. gap: linking production (second proposal)
  gap(
    '別の解決策を追加する標識です。空所に入る1語を入力してください。',
    '“Universities could lower their fees. ______, the government could expand scholarship schemes for low-income students.”',
    ['alternatively', 'additionally', 'furthermore', 'moreover', 'equally', 'similarly', 'likewise', 'instead', 'also'],
    'Alternatively,（あるいは／別の手として）が最も的確です（Additionally, ／ Moreover, でも文意は通ります）。\n\n解決策を並べる段落では、2つ目の案の頭にこうした標識を立てるだけで、段落の見通しが一気に良くなります。',
    '“Alternatively,” fits best — it offers the second proposal as another route (Additionally / Moreover also work). In a solutions paragraph, one signpost at the second idea transforms readability.',
  ),
  // 10. recap
  con(
    'まとめ：タイプ→骨格→thesis→標識',
    'Recap: type → skeleton → thesis → signposts',
    '・最初の10秒でタイプ判定：agree or disagree?＝意見型、Discuss both views＝両論型\n\n・骨格は4段落：導入＋thesis／本論1／本論2／結論。結論に新しい論点は持ち込まない\n\n・thesis＝立場＋理由の予告。「This essay will discuss…」は禁止\n\n・両論型の本論2は On the other hand, those who 〜 argue that… で開く\n\n・Despite＋名詞句／Although＋節。標識は角にだけ\n\n型が手に入ったら、あとは中身。模試のTask 2で骨格ごと再現してみましょう。',
    '• Ten seconds first: opinion type (“agree or disagree?”) or discuss-both (“Discuss both views”)?\n\n• Four paragraphs: intro + thesis / body 1 / body 2 / conclusion — and no new arguments in the conclusion.\n\n• Thesis = position + previewed reasons; never “This essay will discuss…”.\n\n• Open a discuss-both body 2 with “On the other hand, those who… argue that…”.\n\n• Despite + noun phrase, Although + clause; signs at the corners only.\n\nThe skeleton is yours — now rebuild it from memory in a mock Task 2.',
  ),
]

// ════════════════════════════════════════════════════════════════════════════
// WRITING REFRESH 2 — ielts-writing-charts (screens replaced, lesson row kept)
// ════════════════════════════════════════════════════════════════════════════
const W_CHARTS_SCREENS = [
  // 1. hook: accurate claim
  q(
    'まずは1問。データに対して正確な文はどれでしょう？',
    '【データ】市立博物館の年間入場者数\n2010年: 84,000人 → 2020年: 42,000人',
    [
      '“Visitor numbers fell steadily throughout the decade.”',
      '“Visitor numbers halved between 2010 and 2020.”',
      '“Visitor numbers fell by roughly a third over the decade.”',
    ],
    1,
    '84,000→42,000はちょうど半減なので halved。(C)の by a third（3分の1の減少）は計算が合いません。\n\n注意したいのは(A)です。結果として大きく減ってはいますが、データ点は2010年と2020年の2つだけ。途中の動きは不明なので、steadily throughout（10年間一貫して着実に）とまでは言えません。Task 1の文は「データで証明できる範囲」を一歩も超えてはいけないのです。',
    '84,000 → 42,000 is exactly a halving. (C)’s “by a third” fails the arithmetic. (A) is the subtle trap: with only two data points, the path between them is unknown — “steadily throughout” claims more than the data shows. A Task 1 sentence must never outrun its evidence.',
  ),
  // 2. concept: report + trend bank
  con(
    'Task 1は計器の読み上げ。語彙バンクは少数精鋭',
    'Task 1 reads the instruments — with a small bank',
    'Academic Task 1は、グラフや表を150語以上で説明するレポートです。意見（I think people should…）とデータにない理由の推測（おそらく価格のせいで…）は書けません。think ／ should ／ best が出てきたら赤信号です。\n\n必要な語彙は少数精鋭で足ります。\n\n・上昇：rose ／ increased ／ climbed ＋ sharply（急に）・steadily（着実に）・slightly（わずかに）\n\n・下降：fell ／ dropped ／ declined ＋ 同じ副詞\n\n・横ばい：remained stable ／ levelled off\n\n・倍率：doubled ／ halved ／ more than doubled\n\n・極値：peaked at 〜 ／ fell to a low of 〜\n\n基本の型は「主語＋動詞＋副詞＋期間」。この型に部品をはめれば、どんなグラフでも文が作れます。',
    'Academic Task 1 is a 150-word report on a chart. Opinions (“I think people should…”) and invented causes (“probably because of prices…”) are banned — treat think / should / best as red flags.\n\nThe vocabulary is small and high-value: rises (rose / increased / climbed + sharply / steadily / slightly), falls (fell / dropped / declined + the same adverbs), flat lines (remained stable / levelled off), multiples (doubled / halved / more than doubled), extremes (peaked at ~ / fell to a low of ~).\n\nThe frame is SUBJECT + VERB + ADVERB + PERIOD. Slot the bank’s parts into the frame and any chart becomes writable.',
    'Car use fell sharply between 2005 and 2020.\nPrices remained stable throughout the period.',
  ),
  // 3. gap: rise verb production
  gap(
    '上昇を表す動詞を、過去形の1語で入力してください。',
    '“Sales ______ sharply between March and June, from 200 to 850 units a month.”',
    ['rose', 'increased', 'climbed', 'grew', 'jumped', 'surged', 'soared', 'rocketed', 'leapt', 'leaped', 'shot up', 'went up'],
    '200→850は4倍超の伸びなので、rose のほか jumped ／ surged（急増した）など勢いのある動詞が sharply とよく合います。\n\n動詞と副詞はセットでひとつの「主張」です。データの勢いに合った組み合わせを選びましょう。',
    '200 → 850 is more than a fourfold rise, so rose / jumped / surged pair naturally with “sharply”. Verb + adverb together make one claim — match their energy to the data’s.',
  ),
  // 4. gap: fall verb production
  gap(
    '下降を表す動詞を、過去形の1語で入力してください。',
    '“After 2018, cinema attendance ______ steadily, ending the period at barely half its earlier level.”',
    ['fell', 'dropped', 'declined', 'decreased', 'went down', 'slid', 'sank', 'shrank'],
    'fell ／ declined ／ dropped ＋ steadily（着実に）。同じ「減少」でも、declined はややフォーマル、slid はなだらか、と語ごとに表情が違います。\n\n2〜3語を使い分けられると、150語のレポートが単調になりません。',
    'Fell, declined or dropped + “steadily”. Each fall-verb has its own shade — declined slightly formal, slid gentle — and rotating two or three keeps a 150-word report from going monotone.',
  ),
  // 5. gap: peaked production
  gap(
    '「ピークに達した」を1語で入力してください。',
    '“Unemployment ______ at 11% in 2012 before falling for six consecutive years.”',
    ['peaked', 'topped out', 'crested'],
    'peaked at 11%（11%でピークに達した）。極値の表現は、オーバービューでも本文でも大活躍します。\n\n対になる「底」は fell to a low of 〜 ／ bottomed out at 〜。山と谷を1語ずつ持っておきましょう。',
    '“PEAKED at 11%.” Extreme-point language earns its keep in both the overview and the body. Its valley-side partners: “fell to a low of ~” and “bottomed out at ~”. Carry one word for each.',
  ),
  // 6. concept: the overview
  con(
    'オーバービュー：数字ゼロで、最大の傾向だけ',
    'The overview: biggest trends, zero numbers',
    'Task 1の答案でバンド6と7を分けるのが、オーバービュー（全体観の1〜2文）です。\n\n・置き場所：書き出しの言い換え文（The chart shows…）のすぐあと\n\n・書き出し：Overall, が定番\n\n・中身：一番大きな傾向を1〜2個だけ。具体的な数字は入れない\n\n細かい数字は本文の段落の仕事です。オーバービューは「遠くから見たら何が起きているか」を言う文——これがない答案は、数字がどれだけ正確でも Task Achievement で頭打ちになります。\n\n注意：Overall, で始まっていても、数字の報告や意見になっていたらオーバービューではありません。形ではなく役割で判定されます。',
    'The overview separates band 6 from band 7. Position: right after your one-sentence paraphrase of the task. Opener: “Overall,”. Contents: the one or two biggest trends, with NO specific numbers — details belong to the body paragraphs. The overview says what the chart looks like from a distance, and without one the most numerically perfect answer still hits a Task Achievement ceiling.\n\nCaution: starting with “Overall,” does not make a sentence an overview — a number report or an opinion in that costume still fails. It is judged by function, not by its first word.',
    'Overall, the energy mix shifted decisively away from coal towards renewables, while gas changed little.',
  ),
  // 7. single_choice: overview selection
  q(
    'オーバービューとして最も適切な文はどれでしょう？',
    '【データ】発電源の構成比（2000年→2020年）\n石炭: 60% → 25%　／　ガス: 35% → 35%　／　再生可能エネルギー: 5% → 40%',
    [
      '“Overall, renewable energy rose from 5% in 2000 to 40% in 2020, a thirty-five-point increase.”',
      '“Overall, the figures suggest the government’s energy policy has been a clear success.”',
      '“Overall, electricity generation shifted markedly from coal towards renewables, while the share of gas remained unchanged.”',
    ],
    2,
    '(C)は最大の傾向（石炭→再エネへの移行、ガスは横ばい）だけを、数字なしでまとめています。これが教科書どおりのオーバービューです。\n\n(A)は Overall で始まっていますが、中身は具体的な数字の報告——本文の段落の仕事です。(B)は政策の評価という意見で、Task 1では書けません。',
    '(C) captures the two biggest movements with no numbers — the textbook overview. (A) opens with “Overall” but reports specific figures: body-paragraph work in disguise. (B) is an opinion about policy, banned in Task 1. Judge candidates by function, not by their first word.',
  ),
  // 8. drag_fill: trend language into a paragraph
  drag(
    'トレンド表現を当てはめて、Task 1の段落を完成させてください。',
    '【データ】各交通手段を使う世帯の割合（1990年→2020年）\n車: 35% → 64%　／　自転車: 1990年に40%でピーク→22%へ　／　バス: 約15%で横ばい',
    '“Car ownership ___ steadily over the period, from 35% to 64% of households. Bicycle use, by contrast, ___ at 40% in 1990 before falling to 22%. Bus travel ___ broadly ___ throughout, at around 15%.”',
    ['rose', 'peaked', 'remained', 'stable', 'fell', 'rising', 'stability'],
    ['rose', 'peaked', 'remained', 'stable'],
    'rose steadily（着実に上昇）、peaked at 40%（40%でピーク）、remained broadly stable（おおむね横ばい）。\n\nrising は過去形ではないので文に合わず、stability は名詞なので remained のあとには置けません（remained ＋形容詞）。fell は車の動き（35%→64%）と方向が逆です。',
    '“Rose steadily”, “peaked at 40%”, “remained broadly stable”. “Rising” lacks the required past tense, “stability” is a noun where remain needs an adjective, and “fell” points the wrong way for car ownership (35% → 64%). Small forms — but they carry the accuracy half of the score.',
  ),
  // 9. gap: multiplier production
  gap(
    '倍率の表現を1語で完成させてください。',
    '“The number of international students more than ______ between 2005 and 2015, rising from 8,000 to 19,000.”',
    ['doubled'],
    '8,000→19,000は2倍を超えるので more than doubled（2倍以上になった）。\n\n倍率の表現（doubled ／ halved ／ tripled）は、数字を2回書かずに変化の大きさを伝えられる効率の良い道具です。more than ／ almost と組み合わせれば精度も出せます。',
    '8,000 → 19,000 is beyond twofold: “more than DOUBLED”. Multiplier verbs (doubled, halved, tripled) compress a comparison into one word, and “more than / almost” tunes their precision.',
  ),
  // 10. recap
  con(
    'まとめ：見えるものだけを、正確な1語で',
    'Recap: only what is visible, in the precise word',
    '・Task 1は報告。意見・推測はNG（think ／ should ／ best ＝赤信号）\n\n・データ点が2つなら steadily throughout とは言えない。証明できる範囲だけを書く\n\n・語彙バンク：rose ／ fell ＋ sharply・steadily・slightly、remained stable、peaked at、more than doubled\n\n・型は「主語＋動詞＋副詞＋期間」\n\n・オーバービューは Overall, ＋最大の傾向、数字ゼロ。役割で判定される\n\nバンクの語彙を、模試のTask 1で実際に書いて定着させましょう。',
    '• Task 1 reports; it never opines or speculates (think / should / best = red flags).\n\n• Two data points cannot prove “steadily throughout” — write only what the data can defend.\n\n• The bank: rose / fell + sharply, steadily, slightly; remained stable; peaked at; more than doubled.\n\n• Frame: subject + verb + adverb + period.\n\n• Overview = “Overall,” + biggest trends, zero numbers — judged by function.\n\nNow cement the bank by writing a full mock Task 1.',
  ),
]

// ────────────────────────────────────────────────────────────────────────────
// Upgrade tree
// ────────────────────────────────────────────────────────────────────────────
const SPEAKING_LEVEL = {
  title: 'Speaking Strategies',
  title_ja: 'スピーキング攻略',
  lessons: [
    { slug: 'ielts-speaking-band-criteria', title: 'Know the Band Criteria', title_ja: '採点基準を知る', free: false, minutes: 10, screens: S1_SCREENS },
    { slug: 'ielts-speaking-lexical', title: 'Show Your Lexical Range', title_ja: '語彙の幅を見せる', free: false, minutes: 10, screens: S2_SCREENS },
    { slug: 'ielts-speaking-grammar-range', title: 'Show Your Grammatical Range', title_ja: '文法の幅を見せる', free: false, minutes: 10, screens: S3_SCREENS },
    { slug: 'ielts-speaking-structure', title: 'Structuring Your Answer', title_ja: '答えの組み立て', free: false, minutes: 10, screens: S4_SCREENS },
    { slug: 'ielts-speaking-cue-card', title: 'Part 2: Conquering the Cue Card', title_ja: 'Part 2 キューカード攻略', free: false, minutes: 10, screens: S5_SCREENS },
    { slug: 'ielts-speaking-part3', title: 'Part 3: Building an Argument', title_ja: 'Part 3 議論を組み立てる', free: false, minutes: 10, screens: S6_SCREENS },
  ],
}

/** Screens replaced in place; the lesson rows (slug, title, level) are kept. */
const WRITING_REPLACEMENTS = [
  { slug: 'ielts-writing-essays', screens: W_ESSAYS_SCREENS },
  { slug: 'ielts-writing-charts', screens: W_CHARTS_SCREENS },
]

// ────────────────────────────────────────────────────────────────────────────
// Local sanity checks (before touching the DB)
// ────────────────────────────────────────────────────────────────────────────
function allLessonsLocal() {
  return [
    ...SPEAKING_LEVEL.lessons,
    ...WRITING_REPLACEMENTS.map(w => ({ slug: w.slug, free: false, screens: w.screens })),
  ]
}

function validateLocal() {
  const problems = []
  const slugs = new Set()
  for (const lesson of allLessonsLocal()) {
    if (slugs.has(lesson.slug)) problems.push(`duplicate slug: ${lesson.slug}`)
    slugs.add(lesson.slug)
    if (lesson.free) problems.push(`${lesson.slug}: must not be free`)
    if (lesson.screens.length < 9 || lesson.screens.length > 11) {
      problems.push(`${lesson.slug}: ${lesson.screens.length} screens (want 9–11)`)
    }
    const first = lesson.screens[0]
    const last = lesson.screens[lesson.screens.length - 1]
    if (!first) { problems.push(`${lesson.slug}: empty lesson`); continue }
    // hook-first: open with an exercise (cold-open question), never a recap
    if (first.type !== 'question') problems.push(`${lesson.slug}: first screen is not a hook question`)
    // recap-last: a まとめ concept
    if (last.type !== 'concept' || !String(last.content.title_ja ?? '').startsWith('まとめ')) {
      problems.push(`${lesson.slug}: last screen is not a まとめ recap concept`)
    }
    lesson.screens.forEach((s, i) => {
      const c = s.content
      if (s.type === 'concept') {
        if (!c.title_ja || !c.title || !c.body_ja || !c.body) problems.push(`${lesson.slug}#${i}: concept missing fields`)
        return
      }
      if (s.type !== 'question') { problems.push(`${lesson.slug}#${i}: unknown screen type '${s.type}'`); return }
      if (!c.prompt) problems.push(`${lesson.slug}#${i}: question missing prompt`)
      if (!c.explanation_ja || !c.explanation) problems.push(`${lesson.slug}#${i}: missing explanation`)
      if (c.question_type === 'single_choice') {
        const correct = (c.options ?? []).filter(o => o.is_correct)
        if (correct.length !== 1) problems.push(`${lesson.slug}#${i}: ${correct.length} correct options`)
        if ((c.options ?? []).length < 3) problems.push(`${lesson.slug}#${i}: fewer than 3 options`)
      } else if (c.question_type === 'gap_fill') {
        if (!Array.isArray(c.accepted) || c.accepted.length === 0) problems.push(`${lesson.slug}#${i}: gap_fill without accepted answers`)
      } else if (c.question_type === 'drag_fill') {
        const blanks = String(c.text ?? '').split('___').length - 1
        const answer = c.answer ?? []
        const chips = c.chips ?? []
        if (blanks < 1 || blanks > 4) problems.push(`${lesson.slug}#${i}: drag_fill has ${blanks} blanks (want 1–4)`)
        if (answer.length !== blanks) problems.push(`${lesson.slug}#${i}: drag_fill ${blanks} blanks but ${answer.length} answers`)
        if (new Set(chips).size !== chips.length) problems.push(`${lesson.slug}#${i}: drag_fill has duplicate chips`)
        for (const a of answer) if (!chips.includes(a)) problems.push(`${lesson.slug}#${i}: drag_fill answer '${a}' not among chips`)
        const distractors = chips.length - new Set(answer).size
        if (distractors < 2 || distractors > 4) problems.push(`${lesson.slug}#${i}: drag_fill has ${distractors} distractors (want 2–4)`)
      } else {
        problems.push(`${lesson.slug}#${i}: unknown question_type '${c.question_type}'`)
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
  if (SPEAKING_LEVEL.lessons.length !== 6) problems.push(`speaking level has ${SPEAKING_LEVEL.lessons.length} lessons (want 6)`)
  if (problems.length) {
    console.error('Local validation failed:')
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }
  console.log('Local validation passed.')
}

// ────────────────────────────────────────────────────────────────────────────
// Upgrade (idempotent)
// ────────────────────────────────────────────────────────────────────────────
async function upgrade() {
  const { data: course, error: cErr } = await db.from('courses').select('id').eq('slug', COURSE_SLUG).maybeSingle()
  if (cErr) throw new Error(`find course: ${cErr.message}`)
  if (!course) throw new Error(`course '${COURSE_SLUG}' not found — run seed-course-ielts.mjs first`)
  console.log(`Course '${COURSE_SLUG}' found (${course.id})`)

  // ── A) Replace the speaking level (cascade cleans lessons/screens/progress)
  const { data: oldLevel, error: lvlErr } = await db
    .from('course_levels')
    .select('id, order_index')
    .eq('course_id', course.id)
    .eq('title_ja', SPEAKING_LEVEL.title_ja)
    .maybeSingle()
  if (lvlErr) throw new Error(`find speaking level: ${lvlErr.message}`)

  let orderIndex = 3 // the seed places スピーキング攻略 last (index 3)
  if (oldLevel) {
    orderIndex = oldLevel.order_index
    const del = await db.from('course_levels').delete().eq('id', oldLevel.id)
    if (del.error) throw new Error(`delete speaking level: ${del.error.message}`)
    console.log(`Deleted level 'スピーキング攻略' (${oldLevel.id}) at order_index ${orderIndex}`)
  } else {
    console.log(`No existing 'スピーキング攻略' level (already removed?) — creating at order_index ${orderIndex}`)
  }

  const { data: lvl, error: insLvlErr } = await db
    .from('course_levels')
    .insert({ course_id: course.id, order_index: orderIndex, title: SPEAKING_LEVEL.title, title_ja: SPEAKING_LEVEL.title_ja })
    .select('id')
    .single()
  if (insLvlErr) throw new Error(`insert speaking level: ${insLvlErr.message}`)

  for (const [ji, lesson] of SPEAKING_LEVEL.lessons.entries()) {
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

    const rows = lesson.screens.map((s, k) => ({ lesson_id: les.id, order_index: k, type: s.type, content: s.content }))
    const { error: scrErr } = await db.from('lesson_screens').insert(rows)
    if (scrErr) throw new Error(`insert screens for ${lesson.slug}: ${scrErr.message}`)
    console.log(`  ${lesson.slug}: ${rows.length} screens`)
  }

  // ── B) Replace the SCREENS of the two writing lessons (lesson rows kept)
  for (const repl of WRITING_REPLACEMENTS) {
    const { data: lesson, error: findErr } = await db.from('lessons').select('id').eq('slug', repl.slug).maybeSingle()
    if (findErr) throw new Error(`find lesson ${repl.slug}: ${findErr.message}`)
    if (!lesson) throw new Error(`lesson '${repl.slug}' not found — run seed-course-ielts.mjs first`)

    const del = await db.from('lesson_screens').delete().eq('lesson_id', lesson.id)
    if (del.error) throw new Error(`delete screens for ${repl.slug}: ${del.error.message}`)

    const rows = repl.screens.map((s, k) => ({ lesson_id: lesson.id, order_index: k, type: s.type, content: s.content }))
    const { error: scrErr } = await db.from('lesson_screens').insert(rows)
    if (scrErr) throw new Error(`insert screens for ${repl.slug}: ${scrErr.message}`)
    console.log(`  ${repl.slug}: screens replaced (${rows.length})`)
  }

  return course.id
}

// ────────────────────────────────────────────────────────────────────────────
// Self-check (runs after the upgrade, reads back from the DB)
// ────────────────────────────────────────────────────────────────────────────
async function selfCheck(courseId) {
  console.log('\n── Self-check ──────────────────────────────────────────')
  const { data: level, error: e1 } = await db
    .from('course_levels').select('id, title_ja, order_index')
    .eq('course_id', courseId).eq('title_ja', SPEAKING_LEVEL.title_ja).maybeSingle()
  if (e1) throw new Error(e1.message)
  if (!level) throw new Error('speaking level missing after upgrade')

  const { data: spkLessons, error: e2 } = await db
    .from('lessons').select('id, slug, free, order_index')
    .eq('level_id', level.id).order('order_index')
  if (e2) throw new Error(e2.message)

  const { data: wrLessons, error: e3 } = await db
    .from('lessons').select('id, slug, free, order_index')
    .in('slug', WRITING_REPLACEMENTS.map(w => w.slug))
  if (e3) throw new Error(e3.message)

  const lessons = [...spkLessons, ...wrLessons]
  const { data: screens, error: e4 } = await db
    .from('lesson_screens').select('lesson_id, order_index, type, content')
    .in('lesson_id', lessons.map(l => l.id)).order('order_index')
  if (e4) throw new Error(e4.message)

  const issues = []
  const totalDist = { A: 0, B: 0, C: 0, D: 0 }
  const report = (label, list) => {
    console.log(`\n${label}`)
    for (const lesson of list) {
      const ls = screens.filter(s => s.lesson_id === lesson.id)
      const counts = { concept: 0, single_choice: 0, gap_fill: 0, drag_fill: 0 }
      const dist = { A: 0, B: 0, C: 0, D: 0 }
      for (const s of ls) {
        if (s.type === 'concept') { counts.concept++; continue }
        const qt = s.content.question_type
        counts[qt] = (counts[qt] ?? 0) + 1
        if (qt === 'single_choice') {
          const idx = (s.content.options ?? []).findIndex(o => o.is_correct)
          const letter = 'ABCD'[idx] ?? '?'
          dist[letter] = (dist[letter] ?? 0) + 1
          totalDist[letter] = (totalDist[letter] ?? 0) + 1
        }
      }
      const distStr = Object.entries(dist).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(' ') || '—'
      console.log(`  ${lesson.slug} — ${ls.length} screens | concept:${counts.concept} choice:${counts.single_choice} gap:${counts.gap_fill} drag:${counts.drag_fill} | answers ${distStr}`)
      if (ls.length < 9 || ls.length > 11) issues.push(`${lesson.slug} has ${ls.length} screens (want 9–11)`)
      if (lesson.free) issues.push(`${lesson.slug} is marked free`)
      const last = ls[ls.length - 1]
      if (!last || last.type !== 'concept' || !String(last.content.title_ja ?? '').startsWith('まとめ')) {
        issues.push(`${lesson.slug}: last screen is not a まとめ recap`)
      }
    }
  }
  report(`スピーキング攻略 (order_index ${level.order_index})`, spkLessons)
  report('ライティング攻略（差し替え分）', wrLessons)

  console.log(`\nOverall answer positions — A:${totalDist.A} B:${totalDist.B} C:${totalDist.C} D:${totalDist.D}`)

  if (spkLessons.length !== 6) issues.push(`expected 6 speaking lessons, got ${spkLessons.length}`)
  const wantSlugs = SPEAKING_LEVEL.lessons.map(l => l.slug).join(',')
  const gotSlugs = spkLessons.map(l => l.slug).join(',')
  if (wantSlugs !== gotSlugs) issues.push(`speaking lesson slugs/order mismatch: ${gotSlugs}`)
  if (wrLessons.length !== WRITING_REPLACEMENTS.length) issues.push('a writing lesson is missing')

  if (issues.length) {
    console.error('\nSelf-check FAILED:')
    for (const i of issues) console.error('  - ' + i)
    process.exit(1)
  }
  console.log('Self-check passed. Speaking level rebuilt (6 lessons); writing screens refreshed.')
}

// ────────────────────────────────────────────────────────────────────────────
validateLocal()
if (DRY_RUN) {
  const lessons = allLessonsLocal()
  const total = lessons.reduce((n, l) => n + l.screens.length, 0)
  console.log(`Dry run only — ${SPEAKING_LEVEL.lessons.length} speaking lessons + ${WRITING_REPLACEMENTS.length} writing screen sets, ${total} screens. No DB writes.`)
  process.exit(0)
}
const courseId = await upgrade()
await selfCheck(courseId)
