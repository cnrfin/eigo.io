# course-ja 日本語監査メモ（2026-06-07）

対象: `supabase/course-ja-dump.json` — 218 スクリーン / 436 日本語フィールド（title_ja・body_ja・explanation_ja・prompt_ja）をすべて読了。
修正: 15 フィールド（`course-ja-fixes.json` に完全な置換値を収録）。方針どおり保守的に、明確な問題のみ修正。技術用語・例文・段落構造（\n\n）はすべて維持。

## レッスン別の内訳（レビュー数 / 修正数）

| lesson | reviewed | changed |
|---|---|---|
| toeic-p2-wh-questions | 18 | 1 |
| toeic-p2-yesno-tag-questions | 18 | 0 |
| toeic-p2-sound-traps | 18 | 1 |
| toeic-p34-question-preview | 18 | 0 |
| toeic-p34-paraphrase | 18 | 0 |
| toeic-p34-speaker-intent | 18 | 0 |
| toeic-p5-word-forms | 18 | 0 |
| toeic-p5-verb-forms | 18 | 0 |
| toeic-p5-prepositions-conjunctions | 18 | 0 |
| toeic-p7-scanning | 18 | 0 |
| toeic-p7-not-inference | 18 | 0 |
| toeic-p7-double-passage | 18 | 0 |
| ielts-listening-numbers | 20 | 2 |
| ielts-listening-paraphrase | 18 | 0 |
| ielts-listening-option-traps | 18 | 2 |
| ielts-reading-tfng | 20 | 0 |
| ielts-reading-headings | 18 | 1 |
| ielts-reading-completion | 18 | 1 |
| ielts-writing-letters | 18 | 2 |
| ielts-writing-charts | 18 | 1 |
| ielts-writing-essays | 18 | 0 |
| ielts-speaking-part1 | 18 | 2 |
| ielts-speaking-cue-card | 18 | 1 |
| ielts-speaking-part3 | 18 | 1 |
| **計** | **436** | **15** |

## 問題のカテゴリ

1. **直訳調のレトリック**（4件）: 「怖いのは〜」「〜世界へようこそ」「地雷がこれ——」「あなたはジャーナリストではなく計器の読み上げ係」
2. **外国語の混入**（4件): 地の文に英語の生残り（long / friend / each bullet / mentioned ≠ correct）、ハングル「논외」
3. **文の破綻・誤字**（3件）: 「語数こそ2語…ではなく3語ですし」「full に -ly ではなく」「譲歲」
4. **スラング・馴れ馴れしい語**（4件）: 「全集中」×2、「会話が即死します」、「消去レース」

なお、講座全体の声（待ち伏せ・ワナ・貯金などの一貫したメタファー、「読むな、探せ」式の見出し、適度な「〜んです」）は日本の学参として自然な範囲と判断し、温存した。——（ダーシ）は単発使用は許容し、修正対象の文中にあるもののみ読点等に直した。

## 代表的な修正例

1. **b0dd6680 / body_ja**: 「怖いのは、聞き取れた音に脳が飛びつくこと」→「注意したいのは、聞き取れた音に脳が飛びついてしまうこと」 — "The scary part is..." の直訳。学参の定型は「注意したいのは」。
2. **cc23bbad / explanation_ja**: 「『聞こえた＝正解』がまったく通用しない世界へようこそ」→「このように、『聞こえた＝正解』はまったく通用しません」 — "Welcome to a world where..." の直訳調。
3. **a88e0e20 / body_ja**: 「あなたはジャーナリストではなく、計器の読み上げ係」→「求められているのは、感想や評論ではなく報告です」 — 英語的な "You are not X, you are Y" レトリックで、比喩も日本語として据わりが悪い。
4. **d8156281 / explanation_ja**: 「でも会話が即死します」→「会話がそこで止まってしまいます」 — ゲーム系スラングで教材の声に合わない。
5. **6b626bc0 / explanation_ja**: 「(C)は논외。」→「(C)は論外です。」 — ハングルが混入（生成時の事故と思われる）。前後の文末も整えた。
6. **0a0da7d8 / explanation_ja**: 「電話番号は long なので」→「電話番号は桁数が多いので」 — 英単語がそのまま残った翻訳痕。
7. **12b92954 / explanation_ja**: 「カードの each bullet に、ちゃんと答えを返しましょう」→「カードの箇条書き一つひとつに、きちんと答えを返しましょう」 — 同上。
8. **b4f3ff9c / title_ja・cbc7d155 / body_ja**: 「全集中」→「集中」 — 流行語（鬼滅の刃由来）で時事スラング。標準語に。
9. **8c4ce9b1 / explanation_ja**: 「(C) は語数こそ2語…ではなく3語ですし」→「(C) も同じく3語ある上に」 — 文として破綻していた箇所の修復。
10. **77971a22 / explanation_ja**: 「譲歲」→「譲歩」 — 誤字（同レッスン内の用語表記に統一）。
