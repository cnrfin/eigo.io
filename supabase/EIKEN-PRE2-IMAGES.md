# EIKEN Grade Pre-2 Mock 1 — speaking card illustrations

Two illustrations are needed for the speaking interview card
(`eiken-pre2-speaking-mock-01`): イラストA (`ep2-a.jpg`, question No. 2) and
イラストB (`ep2-b.jpg`, question No. 3). The AI grader judges answers against
`payload.reference`, so every element listed below must be clearly visible and
unambiguous. Landscape, ~1200×800, JPG, no text or letters anywhere in the
image (the SOLD OUT state in B is shown with a universally readable red ✕-style
lamp/icon, not words).

## ep2-a.jpg — イラストA (five people, five different actions)

Question No. 2 asks the student to describe what each of the five people is
doing. Each action must be the **only** plausible verb for that figure —
nobody else in the scene may be doing anything describable.

Copy-paste Grok prompt:

```
simple flat 2D cartoon illustration in the style of Japanese EIKEN English
test materials, clean black outlines, soft muted colors, white background,
no text or letters anywhere. A small flea market in a park with simple
stalls and tables. Exactly five people, spread out clearly, each doing one
clearly different action: (1) a man in a green shirt carrying a large
cardboard box with both arms, walking; (2) a woman in an apron hanging a
yellow T-shirt on a clothes rack at her stall; (3) a young boy drinking
orange juice from a cup with a straw; (4) a girl holding a camera up to her
face and taking a picture of some toys displayed on a table; (5) an elderly
man with white hair sitting on a park bench reading an open newspaper. No
other people in the scene. Each person's action must be obvious at a
glance, with space between the five figures.
```

Must match the No. 2 grader reference exactly:

| # | Figure | Action (present continuous) |
|---|--------|------------------------------|
| 1 | Man (green shirt) | is **carrying a large box** |
| 2 | Woman (apron, at stall) | is **hanging a T-shirt** on a clothes rack |
| 3 | Boy | is **drinking juice** |
| 4 | Girl (camera) | is **taking a picture** of some toys |
| 5 | Elderly man (bench) | is **reading a newspaper** |

## ep2-b.jpg — イラストB (one person, obvious problem/intention)

Question No. 3 asks the student to describe the situation: *she wants to buy
tea, but it is sold out*. Both the intention (thought bubble) and the problem
(sold-out lamp) must be unmistakable.

Copy-paste Grok prompt:

```
simple flat 2D cartoon illustration in the style of Japanese EIKEN English
test materials, clean black outlines, soft muted colors, white background,
no text or letters anywhere. A single scene: a woman standing on a sidewalk
in front of a drinks vending machine, looking disappointed with one hand
raised toward the machine. A round thought bubble above her head shows a
green bottle of tea. In the vending machine, the slot holding the same
green tea bottle is empty and has a small red lamp with a red X symbol
under that bottle's position, while the other drink slots are full. Nobody
else in the scene. The thought bubble and the red X lamp must be large and
clearly visible.
```

Must match the No. 3 grader reference: a woman in front of a vending machine,
**thought bubble = bottle of tea** (her intention), **red ✕ lamp on the tea
slot = sold out** (her problem). Expected answer: "She wants to buy a bottle
of tea, but it is sold out."

## Attaching

Put both files in one folder, then:

```bash
node --env-file=.env.local scripts/attach-eiken-pre2-images.mjs ./path/to/folder
```

Re-running replaces the images. The form works without them (admin draft
preview), but don't publish until both illustrations are attached — questions
No. 2 and No. 3 are meaningless without their pictures.
