# EIKEN Prep Course — design (2026-06-09)

One course, four levels, one level per grade, each level teaching exactly what its mock set tests. Built on the same engine and conventions as `toeic-prep` / `ielts-prep`, with the 2026-06-09 audit findings baked in as design rules.

**Decisions (agreed):** single course `eiken-prep` with levels G3 → Pre-2 → G2 → Pre-1 · ~6 lessons per grade (standard depth) · design doc → Pre-2 pilot → remaining grades · audio via ElevenLabs (existing pipeline), images via Grok (brief files, existing attach pattern).

---

## 1. Course meta

| | |
|---|---|
| slug | `eiken-prep` |
| exam_slug | `eiken` |
| title / title_ja | EIKEN Prep Course / 英検対策コース |
| description | Master every task on the EIKEN mocks, grade by grade — from Grade 3 to Pre-1, one pattern at a time. |
| description_ja | 模試で出る英検の問題形式を、級ごとにひとつずつ攻略。3級から準1級まで、パターンを知ればスコアは伸びます。 |
| published | `false` until all four levels reviewed |
| free lesson | `eiken-g3-vocab` (first lesson of the course — engine rule) |

**Structure:** 4 levels × 6 lessons = 24 lessons, ~9–10 screens each ≈ **~230 screens**. Lesson pattern per grade (identical slugs apart from the grade token):

| # | Lesson slug | Teaches | Mock target |
|---|---|---|---|
| 0 | `eiken-{g}-vocab` | 大問1 vocab/grammar tactics | Reading 大問1 |
| 1 | `eiken-{g}-reading` | The grade's reading 大問s | Reading 大問2+ |
| 2 | `eiken-{g}-writing` | Both writing tasks | Writing form |
| 3 | `eiken-{g}-listening` | The grade's listening 部s | Listening form |
| 4 | `eiken-{g}-speaking` | Interview flow + card tasks | Speaking form |
| 5 | `eiken-{g}-review` | Mixed review — **taught content only** | whole set |

Screen budget: lessons 3–4 concept + 5–7 question screens (10 min); reviews 2 concept + 7–8 questions (8–9 min). All examples ORIGINAL — never reuse mock items, same rule as the existing courses.

A student preparing for one grade jumps straight to that level; lessons have no hard prerequisites across levels (recaps must not assume the previous grade was completed — write each level self-contained).

---

## 2. Level designs

### Level 0 — Grade 3 (CEFR A2, 中学英語)

**eiken-g3-vocab** (FREE) — The 大問1 routine: read the whole sentence, decide what KIND of word the gap needs, then choose. A2 staples: 不定詞/動名詞 (want to / enjoy -ing), 比較 (taller / the tallest), 前置詞 (on Sunday / at school), basic conjunctions, everyday vocab pairs (borrow/lend, teach/learn). 3c+6q (single_choice ×5, gap_fill ×1).

**eiken-g3-reading** — 大問2 dialogue completion: the reply must CONNECT (question→answer type-matching, same logic as TOEIC P2 but printed). 大問3A notice scanning (date/price/place labels), 3B email (who wrote what to whom), 3C essay (one fact per paragraph). 4c+5q.

**eiken-g3-writing** — Both tasks in one lesson (they're short). Eメール: the iron rule — the friend asks TWO questions, answer BOTH, 15–25 words; checklist drills (which reply answers both? which is in range?). 意見文: the template — opinion + I have two reasons. First, … Second, … — 25–35 words; judgment drills on on-topic reasons. Word-count counting rule. 3c+6q (single_choice + gap_fill template lines + 1 drag_fill ordering a model answer).

**eiken-g3-listening** — 第1部: picture + dialogue, the THREE response options are SPOKEN (A–C, not printed) — teach "listen for the last line"; 2 drill items **with illustration + audio**. 第2部 dialogue MCQ, 第3部 monologue MCQ: prediction from printed options. 3c+6q, all questions audio (TEMPO 0.88).

**eiken-g3-speaking** — The interview script: greeting → 音読 (20s silent prep, read slowly) → No.1 from the passage (answer is IN the passage — find the sentence) → No.2/3 about the illustration (There is… / He is -ing…) → No.4/5 personal (2 sentences: answer + one more). Judgment MCQs (which answer fits No.1?), gap_fill sentence frames, **1 card illustration image**. 4c+5q.

**eiken-g3-review** — Mixed: 2 vocab, 1 dialogue completion, 1 notice, 1 email-writing checklist, 2 listening (audio), 1 speaking-frame item. 2c+8q.

### Level 1 — Grade Pre-2 (CEFR A2–B1, 2024 renewal) ★ PILOT

**eiken-pre2-vocab** — 大問1 (15q) now includes phrasal verbs and idioms: teach the 熟語 bank (look forward to, give up, take care of…), word-form discipline, and the eliminate-by-meaning routine for four same-class words. 3c+6q.

**eiken-pre2-reading** — 大問2 dialogue completion (B1 register), **大問3 passage gap-fill-in-context** (new vs G3: the blank is a connector or summarizing phrase — read the sentence BEFORE and AFTER), 4A email, 4B expository (paragraph = one job). 4c+5q.

**eiken-pre2-writing** — Eメール reply: 40–50 words, answer the friend's TWO questions + one question back convention; 意見文: 50–60 words, opinion + two DEVELOPED reasons (reason + one supporting sentence). Template drills, range judgment, reason-quality MCQs. 3c+7q.

**eiken-pre2-listening** — 第1部: conversation, last reply replaced by three SPOKEN options A–C (letter-only on screen) — the hardest format jump from G3; 第2部 dialogue + spoken question; 第3部 monologue + spoken question. 3c+6q audio (TEMPO 0.94).

**eiken-pre2-speaking** — Read-aloud technique (chunking, don't stop at unknown words); イラストA: FIVE people doing FIVE different actions — describe with present continuous, one sentence each; イラストB: one person with an obvious problem/intention — be going to / wants to but can't; passage question + personal questions. **2 illustration images** (one A-style, one B-style). 4c+6q.

**eiken-pre2-review** — 2 vocab, 1 dialogue, 1 passage gap, 1 email range check, 2 listening (audio), 1 イラストA description gap_fill. 2c+8q.

### Level 2 — Grade 2 (CEFR B1, 2024 renewal)

**eiken-g2-vocab** — 大問1 (17q): B1 vocabulary + collocations; suffix/prefix sense (-able, un-, re-), phrasal verbs in formal register, the "all four fit grammatically — choose by meaning" discipline. 3c+6q.

**eiken-g2-reading** — 大問2: TWO passages × 3 in-context gaps — discourse logic (however/therefore/for example as the rails of the paragraph); 3A email; 3B expository with 5 questions — question order follows paragraph order. 4c+5q.

**eiken-g2-writing** — **要約 (the new 2024 task — highest teaching value in the course):** 45–55-word summary of a ~150-word passage. Rules: keep the claim + main reasons, CUT examples and numbers, paraphrase rather than copy, NO opinion. Drills: which sentence is a main point vs an example (MCQ), choose the better paraphrase, drag_fill assembling a model summary. 意見文: 80–100 words, agree/disagree + two reasons, paragraph shape. 4c+6q.

**eiken-g2-listening** — 第1部 conversation + spoken question (no spoken-options format anymore — flag the change for students coming up from Pre-2); 第2部 60–90-word monologue + spoken question: note-the-numbers, paraphrased correct options. 3c+6q audio (TEMPO 0.97).

**eiken-g2-speaking** — 音読 (~60 words); No.2: **three-panel story narration** — past tense + the printed first sentence convention, panel-to-panel connectors (then / a few minutes later); opinion questions (Do you think…? → Yes/No + because + one more sentence). **1 three-panel image**. 4c+6q.

**eiken-g2-review** — 2 vocab, 1 discourse gap, 1 要約 main-point pick, 1 意見文 structure item, 2 listening (audio), 1 narration connector gap_fill. 2c+8q.

### Level 3 — Grade Pre-1 (CEFR B2, 2024 renewal)

**eiken-pre1-vocab** — 大問1 (18q): B2–C1 lexis — formal/Latinate vocabulary, collocation strength (heavily + rely, widely + available), phrasal verbs with abstract meanings. Tactic: eliminate by collocation, not translation. 3c+6q.

**eiken-pre1-reading** — 大問2: ~250-word passages with 3 logic gaps (concession/contrast chains); 大問3: 300–400-word expository/argumentative passages — paragraph mapping (read Q first → locate paragraph), author-stance language. 4c+5q.

**eiken-pre1-writing** — 要約: 60–70 words of a ~200-word passage — compress two viewpoints fairly. 意見文: 120–150 words using TWO of the four printed POINTS, intro/body/conclusion frame, formal register (it is essential that / a major benefit is). Drills: POINT selection (which two are easiest to develop), thesis quality, hedged vs absolute claims. 4c+6q.

**eiken-pre1-listening** — Part 1 multi-turn conversations (B2, natural speed); Part 2 academic-lite passages with TWO questions each — split attention, note both question stems in preview; Part 3 **Real-Life format**: printed SITUATION with conditions + announcement audio — teach condition-matching as elimination. 3c+6q audio (TEMPO 1.0). The Real-Life drill prints the situation in the prompt (matches the mock's `passage_text` convention).

**eiken-pre1-speaking** — Four-panel narration: 60s prep / 120s speech, past-tense storyline, the printed opening sentence, time-jump connectors (A week later…); No.1 hypothetical ("If you were the woman…" → would); No.2–4 social-issue opinions — position + reason + example in 3–4 sentences (the IELTS Part 3 frame, scaled down). **1 four-panel image**. 4c+6q.

**eiken-pre1-review** — 2 vocab, 1 logic gap, 1 要約 compression pick, 1 POINTS-essay item, 2 listening incl. 1 Real-Life (audio), 1 narration item. 2c+8q.

---

## 3. Audio plan (ElevenLabs)

Same two-stage pattern as the existing courses: the seed writes every listening screen with the full script in `content.transcript` and an instruction prompt ("Listen and choose…" / 「音声を聞いて…」); a separate audio pass voices and attaches it.

- **Script:** new `scripts/add-course-eiken-audio.mjs`, cloned from `add-course-audio.mjs` (same caching, upload bucket `test-assets`, `audio_asset_id` linking, idempotent skip; `--dry` supported). Per-lesson transformation rules keyed by the lesson slugs above.
- **Tempo matches each grade's mock** so course audio and mock audio sound identical: G3 **0.88**, Pre-2 **0.94**, G2 **0.97**, Pre-1 **1.0** (atempo stage kept in all four for cache-hash consistency, same as the mock seeds).
- **Voices:** existing pool (US_F `uYXf8XasLslADfZ2MB4u`, US_M `UgBBYS2sOqTuMpoF3BR0`, UK_F, UK_M), `eleven_v3`. Dialogues alternate M/F like the mock seeds. Spoken-option items (G3/Pre-2 第1部) read "A. … B. … C. …" with the same 0.5s/0.8s gap conventions as the mock scripts.
- **Volume:** ~8 audio screens per grade (6 in the listening lesson + 2 in the review) ≈ **32 clips** total. Optional +4: one 音読 model reading per speaking lesson (recommended — cheap and very useful).

**Player note (from the audit):** transcripts are safely hidden until post-answer by the current player. No change needed; preserve that invariant.

## 4. Image plan (Grok)

One brief file per the existing pattern: `supabase/EIKEN-COURSE-IMAGES.md` + `scripts/attach-eiken-course-images.mjs` (clone of `attach-eiken-g3-images.mjs`, but targeting `lesson_screens.image_asset_id` — the player already renders `screen.image.url`). Same base style line as the mock briefs (flat 2D cartoon, clean outlines, muted colors, white background, **no text/letters/numbers**).

| # | File | Used by | Content |
|---|---|---|---|
| 1–2 | `ec-g3-l1.jpg`, `ec-g3-l2.jpg` | g3-listening 第1部 drills | single-scene dialogue illustrations |
| 3 | `ec-g3-card.jpg` | g3-speaking | interview card scene (2–3 people, clear actions) |
| 4 | `ec-pre2-illa.jpg` | pre2-speaking | five people, five distinct actions (イラストA) |
| 5 | `ec-pre2-illb.jpg` | pre2-speaking + pre2-review | one person, obvious problem/intention (イラストB) |
| 6 | `ec-g2-panels.jpg` | g2-speaking | three-panel story, left→right |
| 7 | `ec-pre1-panels.jpg` | pre1-speaking | four-panel story, 2×2 |

7 images. Speaking-lesson questions about a picture always carry the picture (never describe-from-text), and as with the mocks, what the picture shows is restated in the explanation (post-answer) rather than the prompt.

## 5. Quality bar — audit rules encoded as design constraints

1. **Reviews test only what the level taught** (TOEIC P2/P34 review drift was a finding). Each review item must trace to a concept screen in the same level.
2. **Recap "next" pointers must be literal:** recaps name the actual next lesson (the review), and only the review's recap sends students to the mock. No "all lessons complete" before the review.
3. **Field convention is the level-0 TOEIC one, everywhere:** `prompt` = EN (with JA passage labels like 【お知らせ】 where the stimulus itself is part of the drill), `prompt_ja` = real Japanese instruction, never a category label; `prompt_ja` present on every question including reviews.
4. **Accepted lists are generous at write time:** every taught synonym must be accepted in every later gap_fill; include article/hyphen/numeric variants; if the prompt says 「1語で」 the list contains only single words (or the instruction says 句動詞も可).
5. **Hints never translate the answer** (the pushed-back/延期された finding): form hints (品詞/句動詞→1語) only.
6. **Explanations cite the right letters in BOTH languages**, and EN/JA must teach the same reasoning (JA may be richer).
7. **Answer keys balanced per lesson** (the seed self-check prints distribution, same as `seed-course-toeic.mjs`), and 第1部-style spoken-option items are never shuffled.
8. **Exam-format facts stated must match the 2024 renewal** (question counts, word ranges, 要約 formats as in the mock seed headers — those headers are the source of truth).
9. All content original; never reuse or hint at mock items.
10. Every lesson self-contained per level: no "as you learned in Grade 3" dependencies.

## 6. Build plan

| Step | Deliverable | Gate |
|---|---|---|
| 1 | This design doc | **Connor approves** |
| 2 | `scripts/seed-course-eiken.mjs` — course + 4 level skeletons + **Pre-2's 6 lessons fully written** (~58 screens). Self-check adapted: per-level lesson count, screen ranges, answer balance, accepted-list lint (taught-synonym sweep) | Connor plays Pre-2 in admin preview |
| 3 | `add-course-eiken-audio.mjs` (Pre-2 rules) + `EIKEN-COURSE-IMAGES.md` Pre-2 briefs (#4–5) + `attach-eiken-course-images.mjs` | audio/images attached, re-play |
| 4 | Remaining grades' content added to the seed (G3 → G2 → Pre-1), audio rules + image briefs extended | full-course audit pass (same 5 criteria) |
| 5 | Publish | `UPDATE courses SET published = true WHERE slug = 'eiken-prep'` |

Estimated totals: 24 lessons / ~230 screens / ~32–36 audio clips / 7 images.

**Open items (non-blocking):**
- The engine's free-lesson rule means only `eiken-g3-vocab` is free; a Pre-1 student gets no free taste of their level. If that matters commercially, the `free` flag is per-lesson — we could also flag each level's vocab lesson free. Decide before publish.
- 大問1 vocabulary is the single biggest scored chunk of every grade (15–18 of ~30 reading questions) but one lesson can only teach tactics + a sample; consider a future SRS/vocab-deck integration for actual lexis volume.
- The G3/Pre-2 第1部 spoken-options format plays three options aloud; the course player shows printed options. The lesson drills print letter-only options (A / B / C as option text) to mimic the real format — confirm that renders acceptably in the player during the pilot.
