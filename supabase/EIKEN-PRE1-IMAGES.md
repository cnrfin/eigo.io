# EIKEN Grade Pre-1 Mock 1 — speaking narration cartoon

ONE image is needed for the speaking narration card
(`eiken-pre1-speaking-mock-01`): `ep1-panels.jpg` — a single FOUR-PANEL comic
strip in a 2×2 grid (panel 1 top-left, panel 2 top-right, panel 3 bottom-left,
panel 4 bottom-right). The AI grader judges narrations against
`payload.reference`, so every story beat listed below must be clearly visible
and unambiguous. Landscape, ~1400×1000, JPG.

Small captions like "The next day" are traditional on real EIKEN Pre-1 cards,
but Grok renders text poorly, so this story is designed to need **NO text** —
do not allow any letters, numbers-as-words, captions, or speech bubbles. The
panels must be visually numbered instead: each panel carries a small plain
circle in its top-left corner containing only a large numeral (1, 2, 3, 4) —
numerals only, no other characters anywhere in the image. Panels separated by
clear white gutters and thin black borders.

The story (must match the narration grader reference exactly): a woman is fed
up with her husband and son staring at screens all weekend, drags them out for
a family bike ride — and in the final panel SHE is the one glued to her phone
while they wait, annoyed. Well-intentioned plan, ironic outcome. The same
three characters must look identical in every panel: the woman (short dark
hair, red sweater), the husband (glasses, blue shirt), the teenage son
(yellow T-shirt).

## ep1-panels.jpg — four-panel narration cartoon

Copy-paste Grok prompt:

```
simple flat 2D cartoon illustration in the style of Japanese EIKEN English
test materials, clean black outlines, soft muted colors, white background,
no text or letters. A single image containing a four-panel comic strip
arranged in a 2x2 grid, with thin black panel borders, white gutters
between panels, and a small plain circle in the top-left corner of each
panel containing only the numeral 1, 2, 3 or 4. The same three characters
appear in every panel: a woman with short dark hair in a red sweater, her
husband with glasses in a blue shirt, and their teenage son in a yellow
T-shirt. Panel 1 (top-left): a living room; the husband and son slump on a
sofa, the husband staring at a smartphone and the son at a tablet, a TV
glowing behind them; the woman stands facing them with her hands on her
hips and an annoyed expression. Panel 2 (top-right): the same living room;
the woman smiles and holds up a leaflet showing only a picture of a sunny
park with bicycles, pointing at it; the husband and son look up from their
devices with reluctant faces. Panel 3 (bottom-left): a sunny park with
trees and a pond; all three ride bicycles along a path, all smiling and
clearly enjoying themselves. Panel 4 (bottom-right): the same park; the
husband and son stand beside their parked bicycles with annoyed
expressions and folded arms, while the woman sits on a park bench staring
at her smartphone, holding it up as if taking a photo, completely absorbed
in it. No speech bubbles, no captions, no words anywhere — the only
characters allowed are the four panel numerals.
```

Must match the narration grader reference exactly:

| Panel | Scene | Story beat |
|-------|-------|------------|
| 1 | Living room | Husband (phone) + son (tablet) slumped on sofa, TV on; woman annoyed, hands on hips |
| 2 | Living room | Woman enthusiastically shows a leaflet picturing a sunny park with bicycles; husband and son reluctant |
| 3 | Park | All three cycling together, smiling — the plan works |
| 4 | Park (twist) | Woman absorbed in her own phone on a bench, taking/posting photos; husband and son wait by the bikes, annoyed |

The printed opening sentence on the card is: *"One day, a woman was unhappy
that her family spent the whole weekend looking at screens."* Question No. 1
("If you were the woman in the fourth picture, what would you be thinking?")
depends entirely on panel 4 being unambiguous: the woman on her phone, the
others visibly waiting and irritated.

## Attaching

Put the file in a folder, then:

```bash
node --env-file=.env.local scripts/attach-eiken-pre1-images.mjs ./path/to/folder
```

Re-running replaces the image. The form works without it (admin draft
preview), but don't publish until the cartoon is attached — the narration and
question No. 1 are meaningless without it.
