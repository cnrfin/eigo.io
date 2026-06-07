# TOEIC Mock 2 — Part 1 photographs

Six photos are needed for the Part 1 items of `toeic-lr-listening-mock-02`.
Find or generate images matching the descriptions below — the spoken
statements were written against these exact scenes, so the key details
(bolded) must be visible. TOEIC photos are everyday/workplace scenes,
realistic photo style, no text overlays, no celebrities/logos.

Recommended: landscape, ~1200×800, JPG.

| # | File name | Scene (key details in bold) |
|---|-----------|------------------------------|
| 1 | `m2p1-1.jpg` | A mechanic in overalls **leaning over the open hood of a car in a repair garage, examining the engine**. Tools visible nearby. (Wrong answers mention washing the car / changing a tire / driving out — none of those should be happening.) |
| 2 | `m2p1-2.jpg` | A woman with a shopping cart in a supermarket aisle, **reaching for an item on a shelf**. (No cash register or payment in view, no staff stocking shelves, no scales/vegetable weighing.) |
| 3 | `m2p1-3.jpg` | Passengers **seated in an airport departure-gate waiting area with suitcases beside them**; an **airplane visible through the window**. (No one boarding, no check-in counters, the plane is parked — not taking off.) |
| 4 | `m2p1-4.jpg` | A man **standing on a stepladder, painting an interior wall with a roller**; a tray of paint on the floor. (Not climbing down, not installing a window, not hanging a picture.) |
| 5 | `m2p1-5.jpg` | An **outdoor market stall under an awning with fruit and vegetables displayed in crates**; a few customers browsing. (No weighing of fruit, no truck being unloaded, no queue at a till.) |
| 6 | `m2p1-6.jpg` | A man in a library **placing a book onto a shelf while holding several other books**; reading tables **unoccupied**. (No one reading at a table, no books stacked on the floor, no checkout desk activity.) |

## Attaching the images

Put the six files in one folder, then run:

```bash
node --env-file=.env.local scripts/attach-toeic-part1-images-02.mjs ./path/to/folder
```

The script uploads them to the `test-assets` bucket, creates the asset rows
(with the descriptions above as alt text) and links each one to the right
Part 1 question group. Re-running replaces the images.
