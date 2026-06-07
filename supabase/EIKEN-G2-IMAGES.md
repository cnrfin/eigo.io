# EIKEN Grade 2 Mock 1 — speaking card illustration

ONE illustration is needed for the speaking interview card
(`eiken-g2-speaking-mock-01`): a single THREE-PANEL comic strip
(`eg2-panels.jpg`) for the No. 2 narration. The AI grader judges the
student's story against `payload.reference`, so the three panels must tell
exactly the sequence described below (situation → action → outcome) and every
element must be clearly visible and unambiguous. Landscape, ~1500×600 (three
roughly square panels side by side), JPG. No speech bubbles and no text or
letters anywhere in the image — the only allowed marks are a small circled
numeral (1, 2, 3) in the top corner of each panel so the reading order is
obvious.

## eg2-panels.jpg — three-panel story (question No. 2)

Printed opening sentence on the card: *"One day, Mr. and Mrs. Sato were
talking about buying a new bookshelf."*

Copy-paste Grok prompt (v2 — the first version produced ambiguous story
beats; this one forces visual anchors that LINK the panels: the bookshelf
appears in panel 1's flyer, printed on the box in panel 3, and in the store
window behind them; panel 2's unlock gesture is explicit):

```
simple flat 2D cartoon illustration in the style of Japanese EIKEN English
test materials, clean black outlines, soft muted colors, white background,
no text or letters. A single image containing a three-panel comic strip,
three equal panels arranged left to right, each panel surrounded by a thin
black border, with a small circled number 1, 2, or 3 in the top-left corner
of each panel, no speech bubbles, no words anywhere. Panel 1: inside a
living room, a middle-aged woman holds up a large store flyer so the viewer
can clearly see a big drawing of a tall brown wooden bookshelf filling most
of the flyer; her husband points at the bookshelf drawing with a happy
expression; behind them is a noticeably empty bare wall. Panel 2: a close
view at a roadside parking bay: the same husband presses his smartphone
flat against the door handle of a small blue car, and a large round sign
directly above the car shows a simple blue car icon together with a clock
icon; small radio-wave arcs appear between the phone and the car door to
show the car is being unlocked; his wife stands beside the car holding her
handbag. Panel 3: in front of a shop whose large display window is full of
wooden bookshelves and chairs, the same couple smile while together sliding
one very large flat cardboard box into the open rear hatch of the same
small blue car; on the side of the cardboard box is a simple line drawing
of the same tall brown bookshelf from panel 1. The same two characters
appear in all three panels wearing the same clothes, and each panel shows
one single clear action that is obvious at a glance.
```

Must match the No. 2 grader reference exactly:

| Panel | Scene | Story beat |
|-------|-------|------------|
| 1 | Living room — Mrs. Sato shows Mr. Sato a flyer with a large bookshelf | Situation: they decide to buy a bookshelf (they have no car) |
| 2 | Car-sharing parking space — Mr. Sato unlocks a small blue car with his smartphone, Mrs. Sato waits beside it | Action: they rent a shared car |
| 3 | Outside the furniture store — the couple load a large box into the back of the same car, smiling | Outcome: they take the bookshelf home easily |

Checklist before attaching:

- Three clearly separated panels, left to right, with borders and circled
  numerals 1–3 — nothing else written anywhere.
- The SAME couple (same clothes, same hair) in all three panels.
- The SAME small blue car in panels 2 and 3.
- The bookshelf must be visible THREE times: big on the flyer (panel 1),
  drawn on the box (panel 3), and echoed by shelves in the store window —
  this is what ties the story together.
- Panel 2 must read as "unlocking the car with a phone" (phone touching the
  door handle + radio-wave arcs) — NOT as taking a photo. If Grok still
  draws photo-taking, regenerate; this is the panel that failed in v1.
- Panel 3's shop window must clearly contain furniture (no bed icons or
  ambiguous signage).
- No speech bubbles or thought bubbles.

## Attaching

Put the file in a folder, then:

```bash
node --env-file=.env.local scripts/attach-eiken-g2-images.mjs ./path/to/folder
```

Re-running replaces the image. The form works without it (admin draft
preview), but don't publish until the illustration is attached — question
No. 2 is meaningless without its pictures.
