# Pronunciation 101 — new exercise types: implementation spec (2026-06-12)

Instructions for the implementing model. This document is the contract: build exactly what is specified here, in the order given. Where this doc says "decide yourself," use the existing codebase's conventions as the tiebreaker. **Read the Orientation section and the referenced files before writing any code.**

Five workstreams, approved by Connor:

| # | Type | What it is | Player work | Seed work | New audio |
|---|---|---|---|---|---|
| 1 | `link_letters` | Drag the linking consonant LETTER onto the next word's vowel | New component | Convert CV link_pairs screens | none (reuse) |
| 2 | `tap_t` | Tap the t's that soften/vanish in connected speech | New component | Convert flap-T link_pairs screens | none (reuse) |
| 3 | `glide_pick` | Hear a join, pick Y glide / W glide / R link | New component | Convert VV link_pairs screens | none (reuse) |
| 4 | `sound_sorter` | Speed game: hear word, throw it in the L bin or the R bin | New component | +1 screen in each of 10 contrast lessons | none (reuse) |
| 5 | `katakana_detox` | A/B: katakana-accented take (JA voice) vs native take — pick native | **None** (reuses which_natural) | +1 screen in 2 lessons | ~7 JA clips |

---

## 0. Orientation (read first)

- **Player:** `src/app/dashboard/courses/lessons/[id]/page.tsx`. One page renders every screen type. Key integration points: the per-type grading chain in `check()` (search for `c.question_type === 'stress_pick'` to find it), the render chain (search for `c.question_type === 'which_natural' ?`), the Check-button disabled logic in the footer (search for `: c.question_type === 'which_natural' ?`), and the state-reset list in `next()`. Every new graded type must be added to ALL FOUR places. Explanations/transcripts live in the post-answer 解説 modal — never render them pre-answer.
- **Components:** `src/components/courses/` — one file per interactive type (`LinkPairs.tsx`, `WhichNatural.tsx`, `StressPick.tsx`, `SentenceStress.tsx`, `JoinType.tsx`, `ShadowGrid.tsx`, `ChallengeExercise.tsx`, `HvptPlayer.tsx`). Follow their prop pattern: `items/words`, `locale`, controlled selection state owned by the page, `revealed` for post-grade display. Styling: CSS variables (`var(--accent)`, `var(--card-inset)`, `var(--edge)`, `var(--danger)`), Squircle where the neighbors use it, framer-motion for drag (copy the drag/drop mechanics from the page's drag_fill implementation and `LinkPairs.tsx`).
- **Audio in content:** assets are referenced by id (`audioAssetId` + `audioAssetIdUs` per item); the lesson API resolves them to URLs. Reuse this convention exactly.
- **Seeds:** `scripts/seed-pron-connected.mjs` (Level 4 flow lessons), `scripts/seed-pron-consonants.mjs` + `scripts/seed-pron-vowels.mjs` (Levels 1–2), `scripts/seed-pron-stress.mjs` (Level 3). Conventions: `ensure(path, make, transcript)` reuses an existing asset row by `storage_path` (so re-runs never re-bill TTS); `tts(text, voiceId)` (ElevenLabs `eleven_v3`, trimTail on female voices); lessons are rebuilt per-slug (delete + recreate). **Seeds are the source of truth — all content changes happen in the seeds, then re-run; never hand-edit the DB.**
- **Voices:** UK/US ids are at the top of each seed. Japanese voices exist in the pipeline: `JA-Female: MXKtCrra8fvlDUbfKUT1`, `JA-Male: GKDaBI8TKSBJVhsCLD6n` (see `src/lib/sayafterme/voices.ts`; copy the ids into the seed like the UK/US ones).
- **Quality bar (from the course audits — violations are bugs):** `prompt` = EN, `prompt_ja` = real Japanese instruction on every question; explanations in BOTH languages teaching the same reasoning, JA warm and richer; nothing answer-revealing rendered pre-answer; correct answers must not follow a guessable pattern; all linguistics must be accurate (when in doubt, check the claim — e.g. flapped t's soften to a fast d, they do not disappear; deleted t's in *twenty/exactly* DO disappear).
- **Out of scope — do not touch:** ChallengeExercise and its scoring API; existing type names and shapes (`link_pairs` stays as a supported legacy type even after its screens are converted); lesson_progress; anything outside the pronunciation course.

Recommended order: 5 (zero player code — warm-up) → 3 → 2 → 1 → 4 (hardest). One commit per workstream.

---

## 1. `link_letters` — drag the consonant onto the vowel

**Replaces** the word-onto-word `link_pairs` screens in `pron-flow-intro` (screen 3) and `pron-flow-cv` (its 2 link_pairs screens). Those screens' audio assets and phrases are KEPT — only the interaction changes. `pron-flow-vv` is NOT converted to this type (vowel glides have no written letter — that's workstream 3). `pron-flow-flapt` is workstream 2. `pron-flow-weak`'s join_type screens are untouched.

**Why:** dragging word-onto-word is a no-stakes gesture. The skill is knowing WHICH consonant jumps to WHICH vowel. Users are not familiar with phonetic symbols, so everything is plain spelling letters: in *take it back*, the user taps the **k** and drags it onto the **i**.

**UX:**
- The phrase is rendered as words, each word as a row of letter tiles (normal text size, tiles only visually distinct enough to look tappable — don't make it look like a ransom note; letter spacing + subtle hover/active states).
- SOURCE letters (consonants that could move) are draggable. TARGET letters (word-initial vowels) are drop zones. Both should be discoverable on touch: a short shake/highlight animation on first render of the first link_letters screen only (a `seen` flag in component state is fine; no persistence needed).
- A correct drop draws a visible arc/bridge from the consonant to the vowel and plays the existing `select` sound; the consonant visually "leans" toward the next word (e.g. slides half a tile toward the gap). The pair stays marked.
- Wrong drops bounce back (framer-motion `dragSnapToOrigin`, same as drag_fill). Do NOT grade on drop — grading happens on Check, like every other type (count a link as "made" only if dropped on a target; user can remove a made link by tapping it, mirroring drag_fill's tap-to-remove).
- Check: correct iff the set of made (sourceIdx → targetIdx) pairs exactly equals the answer set. After grading, reveal: correct links turn accent, missed links draw in danger color, the audio replays via the existing play button, and the joined reading ("tay-ki-tit") shows under the item as link_pairs does today.
- Multi-item screens: 2–3 phrases per screen, stacked, same as link_pairs today.

**Content shape** (new `question_type: 'link_letters'`):

```json
{
  "question_type": "link_letters",
  "prompt": "Drag each linking consonant onto the vowel it jumps to.",
  "prompt_ja": "つながる子音を、次の語の母音までドラッグしよう。",
  "items": [
    {
      "words": ["take", "it", "back"],
      "chunks": [["t","a","k","e"], ["i","t"], ["b","a","ck"]],
      "sources": [[0,2]],
      "targets": [[1,0]],
      "links":   [{ "from": [0,2], "to": [1,0] }],
      "joined": "\"tay-ki-tit\"  …",
      "joined_ja": "「テイ・キッ・バック」…",
      "note": "...", "note_ja": "...",
      "audioAssetId": "…", "audioAssetIdUs": "…"
    }
  ],
  "explanation": "…", "explanation_ja": "…"
}
```

- `chunks` are the tappable units per word — a digraph that moves as one sound is ONE chunk (`"ck"`, `"ch"`, `"sh"`). Tiles render chunk-by-chunk.
- `sources` lists every DRAGGABLE chunk as `[wordIdx, chunkIdx]` — include 1–2 plausible decoys per item beyond the real movers (e.g. in *take it back*, make the **t** of *it* draggable too: dragging it onto *back*'s **a**? No — *back* starts with a consonant, so there is no target there; instead the decoy fails because there's no valid drop. Prefer decoy SOURCES over decoy TARGETS; a target is only ever a word-initial vowel chunk of a following word).
- `targets` = droppable chunks. `links` = the answer key. Seed-side validator must assert: every `links.from` ∈ `sources`, every `links.to` ∈ `targets`, every target is word-initial in a word that follows the source's word.
- **Silent-e caution (the *take* case):** the draggable chunk is the consonant LETTER (`k`), even when a silent e follows it. Never make the silent e part of the chunk and never make it draggable. The post-answer note should mention it once in flow-cv ("the silent e was never a sound — the k was already the last sound").
- Word-final consonant SOUND vs spelling mismatches that can't be expressed in letters (e.g. *what* flapping) don't belong in this type — keep those phrases in tap_t or which_natural instead. When converting existing items, drop/replace any item that can't be expressed cleanly in letters; replacement phrases must reuse only words whose audio already exists, or add the phrase to the seed's audio generation (genSentence) — phrases get fresh TTS via ensure(), which is acceptable for a handful.

**Seed work:** in `seed-pron-connected.mjs`, rewrite the flow-intro and flow-cv link_pairs screen definitions into the new shape (a `linkLetters(...)` builder mirroring the existing `L(...)` builder). Keep each phrase's audio asset generation lines unchanged so ensure() reuses the clips. Keep the explanations, updated where the interaction wording changed.

**Grading wiring (page.tsx):** correct = every item's made-links set equals its `links` set. Check disabled until every item has ≥1 made link. Reset state in `next()`.

---

## 2. `tap_t` — tap the t's that soften

**Replaces** the link_pairs screens in `pron-flow-flapt` (screens with t-tap items, including the *Get it out of it* sentence screen). The which_natural and shadow/challenge screens in that lesson stay.

**UX:**
- A sentence rendered word by word; every letter **t** (and **tt**) in the sentence is a tappable tile inside its word (visual treatment consistent with link_letters tiles).
- The user plays the audio (existing play button), then taps every t that SOFTENS into the fast-d flap. Tapping toggles. On tap, the t visually shrinks (~70% scale, muted color) — per Connor: softened t's get SMALLER, they do not disappear. Tapping again restores it.
- Items may also contain TRUE-DELETION t's (*twenty*, *exactly*, *internet*) in a dedicated second screen — for those, the correct interaction is also a tap, but on reveal the deleted t renders ghosted (~40% opacity, strikethrough-free) to show it vanished entirely, vs the flap's "small t". The distinction is made at reveal time by the answer data, not by a different gesture.
- Hard t's (t starting a stressed syllable: *hoTEL*, *aTTENtion*; t after n where it stays, etc.) are the distractors — tappable but wrong.
- Check: correct iff the tapped set exactly equals the answer set, per item. Reveal: correctly-tapped t's accent + small; missed ones danger + small (they soften in the audio even though the user missed them); wrongly-tapped t's danger + full size.

**Content shape** (`question_type: 'tap_t'`):

```json
{
  "question_type": "tap_t",
  "prompt": "Listen, then tap every t that softens into the fast d.",
  "prompt_ja": "音声を聞いて、やわらかい d に変わる t を全部タップしよう。",
  "items": [
    {
      "text": "Get it out of it",
      "tSpots": [{ "word": 0, "char": 2 }, { "word": 1, "char": 1 }, { "word": 2, "char": 2 }, { "word": 4, "char": 1 }],
      "answer": [0, 1, 2],
      "deleted": [],
      "joined": "\"ge-di-tou-do-vit\"", "joined_ja": "「ゲ・ディ・タウ・ド・ヴィッ」",
      "note": "…", "note_ja": "…",
      "audioAssetId": "…", "audioAssetIdUs": "…"
    }
  ],
  "explanation": "…", "explanation_ja": "…"
}
```

- `tSpots` enumerates every tappable t ("tt" = one spot); `answer` = indices into tSpots that soften; `deleted` = subset of `answer` that fully vanishes (rendered ghosted on reveal). Seed validator: every answer/deleted index in range; `deleted ⊆ answer`; the audio must genuinely match the key — **the implementer must LISTEN to each reused clip once and adjust the answer to what the recording does** (US clips flap; UK clips often don't — see the per-accent note below).
- **Accent honesty:** flapping is American. The lesson already frames it that way. For each item, the answer key follows the US clip; keep the UK clip available on the screen but label it in the note as the comparison take ("UK keeps the hard t — listen to both"), or — simpler and acceptable — drop `audioAssetId` (UK) from converted tap_t items and keep only `audioAssetIdUs`. Decide per item by listening; document the choice in the seed comment.
- New second screen (true deletion): 1 screen, 2–3 items using *twenty / exactly / internet / I don't know*-style sentences. These need fresh sentence TTS via genSentence/genSentenceUS — a handful of new clips is fine. Keep the lesson at ≤8 screens total.

**Concept-screen tie-in:** the flap concept body was already fixed in the seed (stress condition, "*hoTEL* does not"). Add one sentence introducing the smaller-t visual: EN "In this drill, a t you tap shrinks — softened, not gone." / JA「このドリルでは、タップした t は小さくなります。消えるのではなく、やわらぐのです。」 Plus a short concept lead-in for the deletion screen (t between n and a weak vowel often disappears completely: *twenty* → "twenny").

---

## 3. `glide_pick` — Y, W, or R?

**Replaces** the 3 link_pairs screens in `pron-flow-vv`. Audio is reused; the lesson's items already cover y-glides, w-glides and the linking r (the concept screen teaches all three).

**UX:** per item: a play button + the written phrase (*go ahead*) + three fat answer buttons: **Y** /j/, **W** /w/, **R** /r/ (letter big, tiny example under each: "ee→ / day→", "oo→ / go→", "her→ / far→"). User listens, picks the bridge they heard. Multiple items per screen (3–4). Check enabled when every item has a pick. Reveal: per-item correct/wrong coloring + the joined rendering ("go-wahead") appears under each item.

**Content shape** (`question_type: 'glide_pick'`):

```json
{
  "question_type": "glide_pick",
  "prompt": "Listen. Which sound bridges the two words?",
  "prompt_ja": "音声を聞いて、二つの語をつなぐ橋の音を選ぼう。",
  "items": [
    { "text": "go ahead", "answer": "w", "joined": "\"go-wahead\"", "joined_ja": "「ゴ・ワヘッド」", "note": "…", "note_ja": "…", "audioAssetId": "…", "audioAssetIdUs": "…" }
  ],
  "explanation": "…", "explanation_ja": "…"
}
```

`answer` ∈ `"y" | "w" | "r"`. Seed validator: the answer must follow from the FIRST word's final sound (ee/i/ay/eye → y; oo/oh/ow → w; a vowel spelled with final r → r) — assert with a small word-ending map, and ensure each screen mixes at least two different answers (no all-same-answer screens; that's the HVPT flaw).
**R-link accent note:** linking r is audible in both accents (it's the one place UK pronounces the r), but verify by listening that each reused r-item clip clearly carries it; if a clip is ambiguous, regenerate that one phrase.

---

## 4. `sound_sorter` — the bin game

**New screen added to each of the 10 contrast lessons** (5 consonant lessons in `seed-pron-consonants.mjs` + L&R in `seed-course-pronunciation.mjs`, 5 vowel lessons in `seed-pron-vowels.mjs`; skip `pron-clusters` and `pron-vowel-diphthongs`). Position: after the last shadow grid, immediately before the challenge (the lesson becomes 10 screens). It is the lesson's automaticity step: discrimination under light time pressure.

**UX:**
- Two bins, left and right, labeled with the lesson's two sounds (reuse the shadow screens' `sounds` codes for scoring labels, but display friendly labels: "L" / "R", 「シーソーの s」は不要 — keep the short codes the lesson already uses in its UI language).
- Rounds: ~10. Each round: a word's audio auto-plays (no text shown — this is ears only), the user taps the left or right bin (or drags the pulsing word-dot into a bin — tap is the required input; drag is optional polish). Immediate per-round feedback: bin flashes accent/danger + the word's text appears briefly with its sound colored, then the next round auto-plays after ~700ms.
- A streak counter and a progress bar (n/10). Mistakes don't end the game. No hard timer on v1 — "speed" comes from auto-advance pacing, not a countdown (less stressful, same automaticity effect). If a round's audio hasn't been answered in ~6s, gently replay it once.
- End state: score X/10 + best streak + a one-line verdict (8+ "Your ear has it." / 5–7 "Getting there — replay the shadow screens." / <5 "Go back to the mechanics screen and listen again." — bilingual). The screen reports `correct = score >= 8` into the normal answers flow so the lesson's progress dots stay meaningful, but show no red "incorrect" banner — use the result banner's existing neutral finish styling for <8 (this is a practice game, not a test; mirror how shadow/challenge screens skip the correct/incorrect flow — see `isPractice` in page.tsx — BUT unlike shadow, persist the score like challenge does if trivially possible; otherwise treat exactly like a practice screen).
- The 解説 modal post-game lists the words that were missed, with their audio replayable.

**Content shape** (`question_type: 'sound_sorter'`):

```json
{
  "question_type": "sound_sorter",
  "prompt": "Ears only: throw each word into the right bin.",
  "prompt_ja": "耳だけで勝負。聞こえた単語を正しい箱へ。",
  "left":  { "sound": "r", "label": "R" },
  "right": { "sound": "l", "label": "L" },
  "rounds": [
    { "word": "right", "sound": "r", "audioAssetId": "…", "audioAssetIdUs": "…" }
  ],
  "explanation": "…", "explanation_ja": "…"
}
```

- **Rounds use the lesson's existing shadow-grid words and their existing clips** — zero new TTS. Pull ~10 of the 24 shadow words (mix of both sounds and all three position blocks), order them with the same constraint discipline as the mock seeds: no sound 3× in a row, 5/5 or 6/4 balance, and the per-round accent alternates UK/US clips so the same voice never carries one side (avoid "female = R" leakage).
- **Round order must be FIXED in the seed data** (not shuffled at runtime) so the no-pattern constraint is verifiable — but verify in the validator that the fixed order passes the constraints.
- Seed: add a `sorter(...)` builder + insert the screen in each lesson definition. The L&R lesson lives in `seed-course-pronunciation.mjs` — same builder copied there (these seeds don't share modules; follow the existing duplication pattern).

**Why this also matters:** it gives every contrast lesson confirmed exemplars of BOTH sounds with real feedback — the mitigation for the audit's HVPT same-answer flaw until the HVPT flip itself is done (separate task, not this spec).

---

## 5. `katakana_detox` — hear the katakana, pick the native

**No player work.** This reuses `which_natural` exactly as it exists (A/B, hash-randomized order, pick-the-natural-take). Only the seeds and audio change.

**Where:** one new screen in `pron-clusters` (epenthesis is THE katakana habit: ストップ vs *stop*) and one in `pron-stress-katakana` (flat katakana rhythm vs English stress). Both lessons' seeds already exist (`seed-pron-consonants.mjs`, `seed-pron-stress.mjs`).

**Audio:** for each item, the "choppy" slot holds the KATAKANA take — generated with the **Japanese ElevenLabs voices** reading katakana text (`JA-Female: MXKtCrra8fvlDUbfKUT1`, `JA-Male: GKDaBI8TKSBJVhsCLD6n`; alternate them across items, as Connor asked for an M/F mix). The "natural" slot reuses the existing native word clips where the word already has one, else one new EN clip via the normal pipeline.

| Lesson | Items (katakana → native) | Katakana TTS text |
|---|---|---|
| pron-clusters | ストップ→stop, ストライク→strike, デスク→desk | 「ストップ」「ストライク」「デスク」 |
| pron-stress-katakana | items from that lesson's existing word list (pick 3 its concept screens already discuss) | their katakana forms |

- Storage paths: `courses/pron/kana/<word>.mp3` via `ensure()`. Asset transcript = the katakana string.
- **Listen-check required:** JA voices reading bare katakana sometimes add list intonation; if a clip sounds like a question or has trailing particles, wrap the TTS text as 「ストップ。」 or regenerate once. The katakana take should sound like a Japanese speaker confidently saying the loanword — that's the point.
- Screen content: standard which_natural shape, with prompts: EN "One of these is the katakana version. Pick the ENGLISH one." / JA「片方はカタカナ発音です。英語の方を選ぼう。」 Explanations name what changed (added vowels for clusters; flat beats for stress) in both languages.
- Placement: clusters → after its last shadow screen, before the challenge; stress-katakana → after its last stress_pick, before its shadow. Validator: both audio ids differ per item; ≥3 items per screen.

---

## 6. Acceptance checklist (run all before finishing)

1. `node --check` passes on every touched seed; every seed re-runs idempotently twice in a row without re-billing TTS (watch ensure() logs) and without duplicate lessons.
2. Each new type added to all four page.tsx integration points (grading, render, footer-disabled, state reset) — and to the lesson API's content pass-through if it filters fields (verify it doesn't; it shouldn't).
3. Play through every converted lesson in admin preview: pron-flow-intro, -cv, -vv, -flapt, two sorter lessons (one consonant, one vowel), pron-clusters, pron-stress-katakana. Confirm: nothing answer-revealing pre-answer; 解説 modal correct in EN and JA; mobile-width drag works (test at ~380px).
4. Listen-checks done and noted in seed comments: tap_t answer keys vs actual clips (per accent), glide r-link clips, katakana takes.
5. No screen has an all-same-answer set (sorter order constraints, glide_pick mixes, tap_t includes distractor t's).
6. The audit fixes already in these seeds (guard-rails, "almost never", fər əm, etc.) are preserved — diff the seed text before/after your edits to confirm you only changed what this spec covers.
7. Total screen counts after work: flow lessons stay ≤8 screens; contrast lessons become 10; clusters and stress-katakana grow by exactly 1.

## 7. Explicitly deferred (do NOT build now)

Echo chain (growing-phrase mic drill), "Which did they mean?" (meaning-stakes minimal pairs), HVPT answer flips + fragile-pair audio swaps (separate audio task from the 2026-06-12 audit §6), intonation lessons, reverse join_type dictation.
