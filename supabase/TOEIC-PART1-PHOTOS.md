# TOEIC Mock 1 — Part 1 photographs

Six photos are needed for the Part 1 items of `toeic-lr-listening-mock-01`.
Find or generate images matching the descriptions below — the spoken
statements were written against these exact scenes, so the key details
(bolded) must be visible. TOEIC photos are everyday/workplace scenes,
realistic photo style, no text overlays, no celebrities/logos.

Recommended: landscape, ~1200×800, JPG.

| # | File name | Scene (key details in bold) |
|---|-----------|------------------------------|
| 1 | `p1-1.jpg` | A woman **sitting at an office desk, typing on a laptop**. A coffee mug and some documents are on the desk. She is alone. (Wrong answers mention pouring coffee / filing documents / closing a window — none of those should be happening.) |
| 2 | `p1-2.jpg` | **Two workers in safety vests loading cardboard boxes into the back of a delivery van** parked on a street. (They must be lifting/loading — not taping boxes, repairing the van, or sweeping.) |
| 3 | `p1-3.jpg` | Four colleagues **seated around a meeting-room table**; one **woman standing and pointing at a chart on a screen**. (No one leaving, no stacked chairs, no folders being handed out.) |
| 4 | `p1-4.jpg` | A man **watering potted plants displayed outside a small shop entrance** (watering can or hose). (Not planting a tree, not carrying pots, not locking the door.) |
| 5 | `p1-5.jpg` | **Several cyclists riding along a paved riverside path**, a **bridge visible in the background**. (No fishing, no boats docked, no bike repairs.) |
| 6 | `p1-6.jpg` | A **waiter arranging glasses and cutlery on outdoor café tables**; the chairs are **empty** — no customers. (No food being served, no orders being taken.) |

## Attaching the images

Put the six files in one folder, then run:

```bash
node --env-file=.env.local scripts/attach-toeic-part1-images.mjs ./path/to/folder
```

The script uploads them to the `test-assets` bucket, creates the asset rows
(with the descriptions above as alt text) and links each one to the right
Part 1 question group. Re-running replaces the images.
