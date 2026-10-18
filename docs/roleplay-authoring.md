# Writing role-play scenes

How to write a role-play scene for the eigo.io AI classroom. Read all of it before writing a scene; the three existing scenes are the reference for tone, length and detail:

- `src/lib/roleplay/scenes/travel/cafe-abroad.json`
- `src/lib/roleplay/scenes/service/izakaya-guests.json`
- `src/lib/roleplay/scenes/business/work-intro.json`

The list of scenes to write, and which batch each belongs to, is in `docs/roleplay-scenes.md`.

## Who it's for

Japanese adults who need English in everyday life in Japan, at work, and when travelling: shop and restaurant staff serving tourists, office workers with overseas colleagues, people travelling abroad, people making foreign friends. Levels range from false beginner (A1–A2) to confident intermediate (B1–B2).

Every scene is **functional**: the student practises the things they will really need to say in that situation. It is not a grammar exercise and not a story. If a task wouldn't happen in real life, leave it out.

## How a scene is used

1. The student picks a scene in the classroom. They play role **a** (`studentRole: "a"`); the AI tutor plays role **b**.
2. They play the level they're due: 初級 the first time, then 中級, then 上級 (`levels[0]`, `[1]`, `[2]`).
3. On screen they see their **tasks** as a checklist. A small model ticks each task when the student says it in their own words, so tasks must be things the **student says**.
4. If they go quiet, the **hints** appear one at a time: hint 1 (Japanese: what to do), then hint 2 (an English starter), then hint 3 (the full sentence).
5. The AI tutor reads the **setting**, both **personas**, the level's **tutor** note and the task list, and plays its character so that each task comes up naturally.
6. At the end, the student can swap roles: they then play role **b**, with role b's tasks at the same level. **So both roles are written in full**, all three levels each.
7. The mission-complete screen offers up to three "phrases to keep": these are the hint-3 sentences. They must be natural, correct, reusable English.

## Files

- One JSON file per scene in `src/lib/roleplay/scenes/<category>/<id>.json`. Categories: `travel`, `help`, `service`, `friends`, `business`.
- The file name is the scene's `id`, in kebab-case: `hotel-check-in.json` → `"id": "hotel-check-in"`.
- List the scene in that folder's `index.ts` (an import plus an entry in the `scenes` array, in the order of `docs/roleplay-scenes.md`).
- `"image": ""` for now. Pictures are added later; the classroom shows a placeholder.
- Only touch your own category folder (and nothing outside it), so batches written at the same time never clash.
- When you're done: `npm run check:roleplay` must pass with **no errors** (fix warnings where they make sense).

## The format

The full type is in `src/lib/roleplay/types.ts`. Field by field:

| Field | What it is |
|---|---|
| `id` | kebab-case, same as the file name |
| `category` | the folder: `travel` · `help` · `service` · `friends` · `business` |
| `title` | `{ "ja", "en" }`. The scene name in the picker. Japanese about 10–20 characters, like 「ホテルにチェックイン」 |
| `summary` | `{ "ja", "en" }`. One line under the title: what you'll do. Japanese 60 characters max |
| `setting` | English, 1–2 sentences, for the AI tutor: where and when, who is there |
| `image` | `""` |
| `studentRole` | always `"a"` |
| `roles` | exactly two: `a` (the student's first role) and `b` |
| `roles[].name` | `{ "ja", "en" }`, short: 「店員」 / "Staff" |
| `roles[].persona` | English, one sentence: who this character is (the AI tutor plays it after a swap) |
| `roles[].levels` | exactly three: 初級, 中級, 上級 |
| `levels[].tutor` | English, 2–4 sentences: how the AI tutor plays the **other** character at this level (see Levels) |
| `levels[].tasks` | the student's tasks: 初級 3–4, 中級 4–5, 上級 4–5 |
| `levels[2].twist` | optional, 上級 only (see Twists) |
| `prop` | optional: a menu, timetable, receipt… the student can open (see Props) |

### Tasks

```json
{ "id": "size", "title": { "ja": "サイズを聞く", "en": "Ask the size" }, "hints": ["サイズを聞きましょう", "What size …?", "What size would you like?"] }
```

- `id`: short, lower case, unique within the level (`order`, `size`, `pay`).
- `title`: a short instruction for one thing the student says. Japanese like 「注文を確認する」; English like "Check the order" (7 words max). A task is something **said**, done in one or two turns ("Ask how many people"), not a vague goal ("Be polite").
- Tasks are listed in the order they naturally happen.
- Every task must be possible whatever the tutor says. Don't write "Ask for the vegetarian option" unless the tutor note makes sure there is one to ask about.
- `hints`, exactly three, each one step further:
  1. **Japanese**: what to do, short and friendly, ending 「〜しましょう」: 「サイズを聞きましょう」
  2. **English starter**: the beginning of the sentence with `…` for the gap: `"What size …?"`, `"Could I get a … with …?"`. Or a choice with `/`: `"Card / Cash, please."`
  3. **The full sentence**: natural, correct, polite-neutral English that fits the scene: `"What size would you like?"`. 4–15 words, ending with `.` `?` or `!`, no `…`. It's what a fluent speaker would really say, and it becomes a "phrase to keep", so no textbook stiffness ("I would like to inquire about…") and no slang.
- Hint 2 and hint 3 must match: hint 3 is hint 2 completed.

### Levels

The same scene at three levels. Change the **language demand**, not the situation.

| | 初級 (A1–A2) | 中級 (A2–B1) | 上級 (B1–B2) |
|---|---|---|---|
| Tasks | 3–4 short, high-frequency ones | 4–5, with one that needs a detail, reason or preference | 4–5, with one that needs explaining, handling a problem or being diplomatic |
| Student's lines | short fixed phrases ("Two people, please.") | full sentences with a detail ("Could I get a hot coffee, please?") | longer, natural, sometimes two sentences |
| AI tutor (`tutor` note) | speaks slowly and simply, short sentences, cooperative, leads gently | natural pace, a little small talk, one follow-up question | natural speed, more small talk, asks for details or reasons |

The `tutor` note tells the AI tutor, in English: its speed and sentence length, what it asks or does so each task comes up, and any concrete details it should use (names, numbers, what it orders, what's sold out). Write it to the AI tutor ("You are a tourist… Speak slowly…"). Never write the student's lines into the tutor note.

### Twists (上級 only, about half of the scenes)

Something unexpected that the student has to deal with: the card machine is broken, the room isn't ready, the dish has shellfish, the train is cancelled. It happens after one of the tasks (`after`, a task in the middle, not the last one), and adds one task for the student.

```json
"twist": {
  "after": "recommend",
  "tutor": "Say you are allergic to shellfish, and ask whether the dish you're interested in is safe.",
  "task": { "id": "allergy", "title": { "ja": "アレルギーに対応する", "en": "Handle the allergy question" }, "hints": ["確認すると伝えて、安心できる料理をすすめましょう", "Let me check with … This one …", "Let me check with the kitchen. This one has no shellfish."] }
}
```

Usually only role **a**'s 上級 has a twist. Keep twists realistic and solvable with polite, practical English. No emergencies that need real medical or legal advice.

### Props

A short document from the scene that the student can open: a menu, a timetable, a booking confirmation, a receipt, a price list, an agenda. Only add one when the scene really has it. The AI tutor sees it too, so make tasks and tutor notes match what's on it (prices, times, sizes).

```json
"prop": {
  "label": { "ja": "メニュー", "en": "Menu" },
  "title": "CORNER CAFÉ",
  "sections": [{ "heading": "Coffee", "items": [{ "name": "Latte", "value": "¥480", "key": "latte" }] }],
  "foot": "Free Wi-Fi · password on your receipt"
}
```

At most 4 sections, about 6 items each. `key` (optional) is the word that lights the item up when someone says it.

## Japan and the language

- Use the details of the real situation: tax-free shopping (免税) with a passport, お通し at an izakaya, IC cards (Suica/PASMO) and ticket machines, tipping abroad, check-in times, 1,500 yen for 90 minutes. Money as "¥480" or "480 yen" in Japan, and the local currency abroad.
- Japanese text must read as natural Japanese written by a Japanese person, not a translation.
- English is neutral international English, natural and polite. No idioms a learner can't reuse.
- No real brand names, real people or companies. Generic names: Sam, Emma, Corner Café, Sakura Hotel.
- Keep it friendly and inclusive. No stereotypes about any nationality. Alcohol is fine where it's natural (izakaya, bar, business dinner).

## Done when

- [ ] Every scene in your batch is written, with both roles × three levels
- [ ] Each is listed in your folder's `index.ts`, in the order of `docs/roleplay-scenes.md`
- [ ] `npm run check:roleplay` passes with no errors
- [ ] `npx eslint src/lib/roleplay` passes
- [ ] `npm run test:classroom -- unit` passes (it checks every scene from the app's side too)
- [ ] You read through each scene once as a learner: every task can be done, every hint 3 is something you'd really say, and the Japanese reads naturally
- [ ] Nothing outside your category folder changed
