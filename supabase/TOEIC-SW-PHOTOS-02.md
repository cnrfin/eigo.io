# TOEIC S&W Mock 2 — photographs

Seven photos are needed: two for Speaking "Describe a Picture" (Q3–4) and five
for Writing "Write a Sentence Based on a Picture" (Q1–5). The AI grader judges
answers against the descriptions below (stored as `payload.reference`), so the
key elements in **bold** must be visible. Realistic photo style, no text
overlays, no celebrities/logos. Landscape, ~1200×800, JPG.

## Speaking — Describe a Picture

| File | Scene |
|------|-------|
| `m2s3.jpg` | **Busy coffee shop interior**. A **barista in an apron handing a paper cup** to a **woman customer across a wooden counter**; shelves with mugs and bags of coffee behind the counter; other customers seated at small tables working on laptops. |
| `m2s4.jpg` | **City park on a clear day**. **Two joggers running along a paved path** while a **man walks a small dog** nearby; wooden benches and tall trees along the path; office buildings in the background. |

## Writing — Sentence pictures (each pairs with two given words)

| File | Words | Scene |
|------|-------|-------|
| `m2w1.jpg` | man / dog | A **man walking a small dog on a leash** along a path in a park. |
| `m2w2.jpg` | mechanic / repair | A **mechanic in overalls repairing a car with its hood open** in a garage. |
| `m2w3.jpg` | luggage / so | **Travelers standing in a long line with their luggage** at an airport check-in counter. |
| `m2w4.jpg` | shelf / put | A **supermarket employee in uniform putting canned goods on a shelf** in a grocery store aisle. |
| `m2w5.jpg` | hands / after | **Two businesspeople shaking hands across a table** after a meeting, with **documents and laptops on the table**. |

## Attaching

Put all seven files in one folder, then:

```bash
node --env-file=.env.local scripts/attach-toeic-sw-images-02.mjs ./path/to/folder
```

Re-running replaces the images. The forms work without them (admin draft
preview), but don't publish until the photos are attached — the tasks are
meaningless without their pictures.
