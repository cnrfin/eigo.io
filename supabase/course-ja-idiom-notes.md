# Japanese idiom-translation audit (course-ja-dump2.json)

Scope: caught Japanese fields that **literally rendered an English metaphor/idiom** that had just
been scrubbed from the English. Most Japanese fields were already written idiomatically (e.g.
「最初の一語がすべて」「ひっかけの定番」), not calqued, so they were left alone. Only genuine
metaphor-translation artifacts were rewritten. Standard prep-book vocabulary (攻略・戦略・関門・
最終関門・ワナ／罠・待ち伏せ・エサ／釣る・反射・鍛える・足場・地図・標識) was treated as natural
Japanese and kept.

## Changes per lesson (10 fields total)

| Lesson | Fields changed |
| --- | --- |
| toeic-p34-question-preview | 1 |
| toeic-p7-scanning | 1 |
| toeic-p7-double-passage | 2 |
| ielts-listening-option-traps | 1 |
| ielts-writing-letters | 1 |
| ielts-speaking-structure | 1 |
| ielts-speaking-cue-card | 1 |
| ielts-speaking-part3 | 2 |

## Before → after examples (metaphor named)

1. **war / battle** (toeic-p34-question-preview, title_ja)
   「音声が流れる前に、勝負は始まっている」→「音声が流れる前に、設問を読んでおく」
   "the contest starts before the audio" battle framing dropped for the plain instruction.

2. **war / battle** (toeic-p7-scanning, body_ja)
   「時間との戦いです」→「時間が足りなくなりやすいパートです」
   "battle against time" → plainly "you tend to run out of time".

3. **war / battle** (ielts-listening-option-traps, body_ja)
   「勝負を分けるのは、それぞれの選択肢が…」→「正解を決めるのは、それぞれの選択肢が…」
   "what decides the battle" → "what decides the answer".

4. **weapon** (toeic-p7-double-passage, body_ja summary)
   「学んだパターンを武器に、模試で腕試し」→「学んだパターンを使って、模試で力を試しましょう」
   "patterns as a weapon" weapon metaphor removed.

5. **weapon** (ielts-speaking-part3, body_ja summary)
   「6レッスンの型を、模試と本番で武器にしてください」→「…使いこなしてください」
   same weapon calque, made plain.

6. **fear + enemy** (ielts-speaking-cue-card, body_ja)
   「最大の恐怖は『30秒で話が尽きる』こと」→「多くの人がいちばん不安に感じるのが…」 and
   「カードは敵ではなく、台本です」→「カードは困らせるものではなく、台本です」
   "the greatest fear" / "the card is not an enemy" (war framing) → natural Japanese.

7. **vehicle / being lost** (ielts-speaking-structure, body_ja)
   「聞き手は行き先のわからないバスに乗せられた状態になります」→「聞き手は話の行き先がわからない
   まま聞かされることになります」
   the "passenger on a bus with no destination" image (calque of "leaves the listener without a
   clear direction") replaced.

8. **warehouse / storage** (toeic-p7-double-passage, body_ja)
   「『条件・料金・日程』の倉庫」→「『条件・料金・日程』がまとまっている」
   "a warehouse of conditions" → plainly "the conditions are gathered here".

9. **costume / clothing** (ielts-writing-letters, explanation_ja)
   「急にスーツを着たような違和感が出ます」→「急に堅すぎて浮いてしまいます」
   "as if suddenly wearing a suit" clothing metaphor dropped for "suddenly too stiff and out of place".

10. **machine / things acting on their own** (ielts-speaking-part3, body_ja)
    「構造は勝手に立ち上がります」→「構造はひとりでに整います」
    "the structure stands itself up" (calque of "the structure builds itself") softened to natural
    Japanese; in the same field 「手ぶらで挑むと迷子になります」(empty-handed travel image) was also
    rephrased to 「何も準備せずに臨むと、話があちこちに散らかってしまいます」.

## Validation
- JSON parses.
- Every `before_snippet` matches the start of the original field.
- No em dash (—) or full-width dash (―) in any `after` value.
- です・ます調, exam terms (Part 2/3/7, バンド, Coherence, クロス問題 など), examples, and \n\n
  paragraph structure preserved.
