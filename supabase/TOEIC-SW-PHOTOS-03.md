# TOEIC S&W Mock 3 — photographs

Seven photos are needed: two for Speaking "Describe a Picture" (Q3–4) and five
for Writing "Write a Sentence Based on a Picture" (Q1–5). The AI grader judges
answers against the descriptions below (stored as `payload.reference`), so the
key elements in **bold** must be visible. Realistic photo style, no text
overlays, no celebrities/logos. Landscape, ~1200×800, JPG.

## Speaking — Describe a Picture

| File | Scene |
|------|-------|
| `m3s3.jpg` | **City bus stop in the daytime**. **Several people waiting under a glass bus shelter** — a **young man standing and checking his phone** while a woman with a shoulder bag and an older man sit on the bench; a **city bus approaching along the street** toward the stop; shops in the background. |
| `m3s4.jpg` | **Bright open-plan office**. **Two colleagues — a man and a woman — standing at a desk looking at a tablet together**; the woman holds the tablet while the **man points at the screen**; other employees at rows of desks with monitors; large windows with daylight. |

## Writing — Sentence pictures (each pairs with two given words)

| File | Words | Scene |
|------|-------|-------|
| `m3w1.jpg` | flowers / sell | A **florist in an apron selling colorful flowers to a customer** at an outdoor market stall. |
| `m3w2.jpg` | train / board | **Passengers boarding a train through its open doors** at a station platform. |
| `m3w3.jpg` | laptop / while | A **woman eating a salad while working on a laptop** at a café table. |
| `m3w4.jpg` | sign / point | A **tour guide pointing at a large information sign** while a **group of tourists looks on**. |
| `m3w5.jpg` | chairs / arrange | A **man arranging chairs around a long table** in an empty meeting room. |

## Attaching

Put all seven files in one folder, then:

```bash
node --env-file=.env.local scripts/attach-toeic-sw-images-03.mjs ./path/to/folder
```

Re-running replaces the images. The forms work without them (admin draft
preview), but don't publish until the photos are attached — the tasks are
meaningless without their pictures.
