# EIKEN course illustrations — Grok image briefs (all four levels)

Seven illustrations are needed for the `eiken-prep` course. After generating,
attach with `node --env-file=.env.local scripts/attach-eiken-course-images.mjs <folder>`.
The attach script is incremental: images already uploaded (e.g. the two Pre-2
ones) do not need their files in the folder again — only put NEW files there.

The pictures are part of the exercises, so the scenes must match the prompts
exactly — the questions reference specific people and actions. Landscape,
~1200×800, JPG, **no text, letters, or numbers anywhere in the image**.

Every prompt below is complete — copy-paste it into Grok as-is.

Base style (already included in every prompt):

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English
> test materials, clean black outlines, soft muted colors, white background,
> no text or letters anywhere in the image

## Grade 3

### ec-g3-l1.jpg — listening 第1部 drill (girl shows her cat drawing)

Used by: `eiken-g3-listening` screen 1. Dialogue: she finished a picture of
their cat; Dad asks if she drew it at school; she answers "in my art class."

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a cheerful teenage girl in a living room proudly holding up a large drawing of a cat on paper, showing it to her father who looks impressed, a sofa and a window in the background, a real cat sitting near the sofa looking up at the drawing

### ec-g3-l2.jpg — listening 第1部 drill (rainy morning at the front door)

Used by: `eiken-g3-listening` screen 2. Dialogue: the boy is leaving for
school; his mother tells him to take his umbrella; he says he'll get it from
his room — so the boy must NOT be holding an umbrella.

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a Japanese house entryway with the front door open showing heavy rain outside, a junior-high-school boy with a school backpack about to leave, his mother standing beside him pointing toward the rain with a concerned face, the boy holding nothing in his hands

### ec-g3-card.jpg — speaking interview card scene

Used by: `eiken-g3-speaking` screens 5–6 and `eiken-g3-review` screen 8.
Questions reference: the BOY drinking water, the MAN washing his car, the
GIRL reading a book under a tree — all three must be unmistakable.

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a small park scene with exactly three people doing clearly different things — a teenage boy sitting on a bench drinking from a water bottle, a teenage girl sitting under a large tree reading a book, and a man washing a small car with a sponge and a bucket at the edge of the park, all three clearly separated

## Grade Pre-2 (already generated and attached — listed for reference)

### ec-pre2-illa.jpg — イラストA practice (five people, five different actions)

Used by: `eiken-pre2-speaking` screen 5 and `eiken-pre2-review` screen 8.

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a city park scene with exactly five people each doing a clearly different activity — a teenage boy riding a bicycle on a path, a middle-aged man walking a small dog on a leash, a young woman sitting on a bench reading a book, a young girl flying a kite, and a man sitting under a tree eating a sandwich; all five people clearly separated and easy to point at, grass and a few trees in the background

### ec-pre2-illb.jpg — イラストB practice (one person, an obvious problem)

Used by: `eiken-pre2-speaking` screens 6 and 7.

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a sad-looking teenage boy standing in front of a drink vending machine, holding his wallet wide open to show it is completely empty, one hand scratching his head, a single drink bottle visible behind the glass of the machine

## Grade 2

### ec-g2-panels.jpg — three-panel narration story (the lost cat)

Used by: `eiken-g2-speaking` screens 5–6 and `eiken-g2-review` screen 8.
Story: ① girl walking home sees a lost-cat poster on a pole → ② she finds the
cat under a park bench → ③ she returns it to its happy elderly owner.

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a three-panel comic strip arranged left to right with thin borders between panels — first panel: a high-school girl walking home looks at a poster on a utility pole, the poster showing only a picture of a cat with no words; second panel: the same girl kneeling in a park, discovering the cat hiding under a bench; third panel: the girl handing the cat to a smiling elderly woman at the front door of a house

### ec-pre1-panels.jpg — four-panel narration story (the bike-sharing program)

Used by: `eiken-pre1-speaking` screens 2, 3 and 5, and `eiken-pre1-review`
screen 8. Story: ① a couple talks about crowded buses → ② the husband
proposes a bike-sharing program at a town meeting → ③ bicycle stations appear
and people ride happily → ④ he finds rental bicycles dumped in a pile in
front of the station.

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a four-panel comic strip arranged in a two-by-two grid with thin borders between panels — first panel: a middle-aged Japanese couple at a bus stop looking unhappily at an overcrowded bus; second panel: the husband standing and speaking at a community meeting, gesturing at a board showing a simple bicycle pictogram, seated residents listening; third panel: a tidy bicycle-sharing station on a street with several people happily riding bicycles; fourth panel: the same man looking shocked at a messy pile of identical rental bicycles dumped on the ground in front of a train station

## Checklist after generating

- Scenes match the bullet descriptions above EXACTLY — the questions name
  specific people and actions (the boy drinking water, the man washing his
  car, the girl under the tree, etc.).
- ec-g3-l2: the boy holds NOTHING (the dialogue says he will go get his
  umbrella).
- Panel strips: clear panel borders, correct order (G2 left→right; Pre-1
  2×2: top-left → top-right → bottom-left → bottom-right).
- No text/letters/numbers anywhere (posters and signs must be picture-only).
