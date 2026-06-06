# TOEIC S&W Mock 1 — photographs

Seven photos are needed: two for Speaking "Describe a Picture" (Q3–4) and five
for Writing "Write a Sentence Based on a Picture" (Q1–5). The AI grader judges
answers against the descriptions below (stored as `payload.reference`), so the
key elements in **bold** must be visible. Realistic photo style, no text
overlays, no celebrities/logos. Landscape, ~1200×800, JPG.

## Speaking — Describe a Picture

| File | Scene |
|------|-------|
| `s3.jpg` | **Outdoor farmers market**, sunny day. A **woman with a basket choosing tomatoes** at a vegetable stall; a **vendor in an apron weighing produce on a scale**; other shoppers and striped awnings behind. |
| `s4.jpg` | **Modern office meeting room**. **Three colleagues seated** at a table with laptops and coffee cups; a **man standing at a whiteboard pointing at a chart**; large windows with a city skyline. |

## Writing — Sentence pictures (each pairs with two given words)

| File | Words | Scene |
|------|-------|-------|
| `w1.jpg` | woman / bicycle | A **woman in a helmet riding a bicycle** along a tree-lined park path. |
| `w2.jpg` | boxes / carry | A **delivery worker carrying a stack of cardboard boxes** up steps to an office building. |
| `w3.jpg` | umbrella / because | **Pedestrians crossing a city street holding umbrellas in heavy rain**. |
| `w4.jpg` | menu / order | A **waiter taking an order** from **two customers reading menus** at a café table. |
| `w5.jpg` | presentation / while | A **woman giving a presentation with a projected chart** while **colleagues take notes** at a conference table. |

## Attaching

Put all seven files in one folder, then:

```bash
node --env-file=.env.local scripts/attach-toeic-sw-images.mjs ./path/to/folder
```

Re-running replaces the images. The forms work without them (admin draft
preview), but don't publish until the photos are attached — the tasks are
meaningless without their pictures.
