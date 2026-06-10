# Test-prep course audit — TOEIC & IELTS (2026-06-09)

Source of truth: live database (both courses, all screens, EN + JA fields). Scope: `toeic-prep` (4 levels / 16 lessons / 146 screens) and `ielts-prep` (4 levels / 19 lessons / 190 screens). Every one of the 336 screens was read in both languages; all 222 questions were independently re-solved; coverage was cross-checked against the published mock forms; the lesson player UI was checked for pre-answer leakage.

Fixes: **48 field corrections across 35 screens** in `course-audit-fixes-2026-06-09.json`, applied with `node --env-file=.env.local scripts/apply-course-audit-fixes.mjs` (dry-run by default, `--apply` to write). Every fix was verified against the current live value.

---

## Headline verdicts

| Criterion | TOEIC | IELTS |
|---|---|---|
| Sufficiency | B — deep on 4 parts, silent on the rest | B — high quality, "strategy sampler" breadth |
| Continuity | A− — two review-set drifts, one premature send-off | A− — three "next lesson" pointers skip the review |
| Consistency | A — uniform tone/terminology; field-convention drift | A — jargon defined on first use, both languages |
| Diligence | A — 96/96 answers correct; 1 EN letter typo | B+ — answers correct, but 4 high-severity content bugs |
| Student-facing | Clean — no teacher notes; transcripts safely gated | Clean — same |

**Bottom line:** the content quality is genuinely strong — zero wrong marked answers in 222 questions, no teacher notes or answer-key references anywhere, terminology and tone consistent across all 35 lessons in both languages. The fixable defects are concentrated in the IELTS review lessons (copy-pasted explanations, accepted-lists that reject words the course itself taught) and in recap screens that point to the wrong next lesson. The strategic gap is breadth: both courses teach a subset of what the mocks test.

---

## 1. Sufficiency

**TOEIC** — What exists is well built: every lesson follows warm-up → concept → graded practice → recap, and the four covered parts (2, 3/4, 5, 7) are the highest-value ones. But against your own published mocks (Parts 1–7 L&R + full S&W ×3 sets):

- **Part 1 (6q) and Part 6 (16q): zero coverage.** A student hits 22 mock questions with no course support.
- **The entire TOEIC S&W product has no course support** — you sell 3 S&W mock sets; the course never mentions speaking or writing.
- Within covered parts: no Part 5 vocabulary-choice items (roughly a third of the real part — the course's form-based tactics actively don't apply to them and students aren't told), no Part 2 statement prompts, no P3/4 graphic or 3-speaker questions, no P7 synonym-in-context / sentence-insertion / chat sets.
- Several taught sub-patterns get only 1–2 reps (tag questions: 2; future perfect: 1).

**IELTS** — Speaking is the standout level (the criteria-diagnosis drills are excellent, 7 lessons). Against the mocks:

- **Listening:** mocks contain matching (who-does-what, floor/place plans) and choose-TWO multi-select in every test; the course covers neither. All course clips are Section-1/2-style micro-clips.
- **Reading:** Yes/No/Not Given is never mentioned even once (one recap line fixes 90% of this — included in fixes); matching-information and reading time management (3 passages / 60 min) uncovered.
- **Writing:** Task 2 teaches only 2 of the 4+ question types; the 250-word minimum was never stated anywhere (fixed); Academic Task 1 covers trend charts only — no process/map/table, though your Academic mock currently uses chart data, so the live gap is small.
- **Academic vs GT:** writing serves both, but the course never said which Task 1 belongs to which exam type (fixed with one sentence). Academic has 1 published mock set vs GT's 3.

*Recommended (not in fixes file — these are content builds, in priority order):* TOEIC Part 6 lesson; TOEIC Part 5 vocab concept screen ("these exist, form tactics don't apply"); IELTS listening maps/matching lesson; IELTS Task 2 type-breadth screen; a TOEIC S&W primer level if S&W mock sales matter.

## 2. Continuity

Within-lesson sequencing is excellent in both courses, and almost all cross-references resolve (Part 5 correctly back-references Part 2's sound traps; "corrections covered in a later lesson" is delivered as promised). Defects, all fixed:

- Three IELTS recaps and one TOEIC recap announced the **wrong next lesson** — "Next level: Reading/Writing" or "all twelve lessons complete" while the level's review lesson still follows (the TOEIC one also said "twelve lessons"; there are now 16).
- **toeic-p2-review tests two untaught patterns** (choice questions, request responses) and **toeic-p34-review omits speaker-intent entirely** — the level's hardest skill gets zero review reps. *Not in fixes file (needs new content): teach choice/requests in toeic-p2-yesno-tag-questions or trim the review intro; add one intent item to toeic-p34-review.*

## 3. Consistency

The strongest criterion. Coined terms (ワナ, 先読み, 言い換え, 消し込み, クロス問題) are introduced once and reused; IELTS band jargon (Lexical Resource, Coherence and Cohesion, register, hedging) is defined in plain language on first use in both languages; JA register is natural throughout. No explanation in either course relies on grammar terminology beyond standard Japanese school vocabulary (品詞, 過去分詞 etc.). Fixed: one garbled JA sentence (「Part 4つのうち」), "GT" never expanded, an EN/JA mismatch on the 150-word minimum, "scanning" used in a review as a never-taught label, 7 "Challenge:" tags missing a space, one gibberish distractor, one dangling EN sentence.

*Systemic, decision needed (not in fixes):* from TOEIC level 1 onward, the `prompt` field carries Japanese text while `prompt_ja` holds a short category label — inverting the level-0 convention — and most TOEIC review questions have no `prompt_ja` at all. Either normalize the fields or document the label convention; it's a player-rendering decision, not per-screen patching.

## 4. Diligence

All 222 marked answers are correct, and distractors were checked for defensibility: every TFNG item passes the same/opposite/silent test, all 10 drag_fills have a unique correct arrangement, arithmetic/logic items (the $115 invoice, the shuttle-time question) check out. Bugs found and fixed:

- **Two copy-pasted EN explanations** (ielts-speaking-lexical#10, ielts-speaking-structure#5) — students got an explanation for a different question; JA was correct in both.
- **One accepted answer that is wrong English** — "keen" accepted in "I'm really ___ in photography", contradicting the course's own keen-ON drill.
- **One review item contradicting the course's own rule and real IELTS** (ielts-reading-review#6 demanded morphing "sniff out"→"smelling"; completion answers are verbatim). Rewritten to a verbatim item ("beak").
- One EN explanation citing the correct answer as a contradiction (toeic-p7-review#5, letter typo).
- **Stingy accepted lists in review lessons** rejecting words the lessons themselves taught ("declined", "superb", "impressive") plus missing common formats (hyphenated phone numbers, "10:30 am", "recent photos", "nevertheless/nonetheless/yet/still"). All widened.
- One genuinely ambiguous gap-fill ("reviewed ___ it is sent" — "after"/"once" were defensible) disambiguated in the prompt.

## 5. Student-facing check

**Clean.** No internal/teacher notes, no references to mock-test answers, no meta text anywhere in 336 screens (the one "teacher" hit is exam content: "Tell me about a teacher you remember").

- **Transcripts:** 69 listening screens carry the audio script, which contains the answer verbatim. **Verified in the player code: transcripts and explanations render only inside the post-answer "Why?" modal — nothing shows pre-answer.** Keep this invariant: any future UI change that surfaces `transcript` (or review-mode screens) before submission would trivialize every listening question in both courses. Note the API does deliver full content (including `is_correct` and `transcript`) to the client before answering — a determined student can read answers in dev tools. Acceptable for a learning course; worth knowing.
- Two prompt-level leaks fixed: a hint that was the direct JA translation of the expected answer (pushed back = 延期された → postponed), and a hint naming both evidence lines (left as-is, noted only).
- One conscious-decision item left alone: ielts-listening-numbers#8 warns 「最後まで聞いてから書くこと」 right before springing a correction trap — defensible scaffolding in lesson 1, but it softens the trap. Keep or cut knowingly.

---

## Suggested order of operations

1. Review and run the fixes: `node --env-file=.env.local scripts/apply-course-audit-fixes.mjs` (dry-run), then `--apply`. 48 fixes, 35 screens; dry run currently validates 48/48 against the live DB; the script skips any screen edited since this audit.
2. Re-sync `scripts/seed-course-*.mjs` with the live DB at some point — the seeds (12 lessons) are now well behind the DB (16/19 lessons) and re-running one would destroy the review lessons and all applied fixes.
3. Decide the two non-mechanical items: review-set drift (P2 untaught patterns / P3-4 missing intent item) and the prompt/prompt_ja field convention.
4. Content roadmap from the sufficiency gaps, in the priority order above, before publishing the courses (both are currently `published: false`).
