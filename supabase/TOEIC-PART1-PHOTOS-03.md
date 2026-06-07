# TOEIC Mock 3 — Part 1 photographs

Six photos are needed for the Part 1 items of `toeic-lr-listening-mock-03`.
Find or generate images matching the descriptions below — the spoken
statements were written against these exact scenes, so the key details
(bolded) must be visible. TOEIC photos are everyday/workplace scenes,
realistic photo style, no text overlays, no celebrities/logos.

Recommended: landscape, ~1200×800, JPG.

| # | File name | Scene (key details in bold) |
|---|-----------|------------------------------|
| 1 | `m3p1-1.jpg` | A florist **arranging flowers in a shop window display**; buckets of cut flowers visible inside the shop. (Wrong answers mention watering plants / loading flowers into a van / sweeping the floor — none of those should be happening.) |
| 2 | `m3p1-2.jpg` | A chef in a white uniform at a stainless-steel counter in a restaurant kitchen, **arranging food on a plate**. (No chopping of vegetables, no dishes being washed, no waiter taking an order.) |
| 3 | `m3p1-3.jpg` | Commuters **stepping through the open doors of a train** stopped at a station platform. (No ticket machines in use, the train is stationary — not departing, no one on a staircase.) |
| 4 | `m3p1-4.jpg` | A gardener **using hedge trimmers to trim a tall hedge** alongside a garden path. (No lawn mowing, no raking of leaves, no planting of flowers.) |
| 5 | `m3p1-5.jpg` | A receptionist behind a front desk **handing a visitor badge to a man in a suit** in an office lobby. (The man is not signing anything, the woman is not on the phone, no one seated in a waiting area.) |
| 6 | `m3p1-6.jpg` | Two movers **loading a sofa into the back of a moving truck** parked at the curb. (No furniture being assembled, no truck repairs, the sofa is not wrapped in plastic.) |

## Attaching the images

Put the six files in one folder, then run:

```bash
node --env-file=.env.local scripts/attach-toeic-part1-images-03.mjs ./path/to/folder
```

The script uploads them to the `test-assets` bucket, creates the asset rows
(with the descriptions above as alt text) and links each one to the right
Part 1 question group. Re-running replaces the images.
