# Video kit: Great Britain for Beginners (lessons 3–12)

How to make the 10 "watch" clips with Digen (Flux dev for the start frame, Real Motion 3.5 for the video) in as few attempts as possible. The start-frame and video prompts for each clip are in the studio (select the video block); the "VIDEO TO ADD" teacher note on each slide lists which references to use.

## The routine for each clip

1. **References (3 max):** 1 = the cast sheet (or one character), 2 = the empty location, 3 = an optional layout guide.
2. **Start frame:** paste the slide's start-frame prompt. Generate 4 at once, at **16:9** (e.g. 1920 × 1080), leaving space above and below the people (the slide crops to a wide strip). Guidance about 2.5–3.5 if Digen shows it.
3. **Nearly right?** Keep the seed and change one word at a time. A wrong hand or face: fix it with an edit/inpaint tool rather than starting again.
4. **Video:** paste the slide's video prompt (one action, about 5 seconds). Generate a few at once.
5. **Two batches with no luck:** simplify the shot (fewer people moving, hands out of view) instead of trying again.

Prompt habits for Flux: framing first, then who, action, place, light; refer to "the woman from image 1" instead of describing her again; say what you want, not what you don't ("empty hands", "plain unbranded bottles"); no "8k, realistic, masterpiece".

## Layout guide (optional reference 3)

When the people keep landing in the wrong places, make a 30-second rough: drop cut-outs (or simple shapes) of the characters onto the empty location in any editor, roughly where they should be, and use it as reference 3. If Digen has image-to-image with a strength slider, use the rough as the starting image at about 0.6–0.75 instead: the layout stays and Flux makes it real.

## 1. Character references

One clean image per character and outfit: full body, standing, facing the camera (a three-quarter view next to it is even better), plain light-grey background, soft even light. Reuse the same image every time.

| Character / outfit | Have it? | Prompt (if you need to make it) |
|---|---|---|
| Haruka, everyday | yes (lessons 1–2) | |
| Haruka, winter | make | Full-body photo of the woman from image 1 standing facing the camera, wearing a camel wool coat over a cream knitted cardigan and a knitted hat, jeans and ankle boots. Plain light-grey studio background, soft even light. Natural photo, 35mm. |
| Tom, navy hoodie | yes | |
| Tom, hoodie + denim jacket | make | Full-body photo of the man from image 1 standing facing the camera, wearing a navy hoodie under a dark denim jacket, jeans and trainers. Plain light-grey studio background, soft even light. Natural photo, 35mm. |
| Priya, mustard blazer | yes | |
| Callum | make | Full-body photo of a 28-year-old Scottish man with short, slightly wavy dark-blond hair and a short neat beard, wearing a dark green waxed jacket over a grey jumper, dark jeans and boots, standing facing the camera. Plain light-grey studio background, soft even light. Natural photo, 35mm. |
| Linda (Tom's mum) | make | Full-body photo of a cheerful 60-year-old woman from the north of England with short layered auburn hair, wearing a colourful patterned blouse and light trousers, standing facing the camera, smiling. Plain light-grey studio background, soft even light. Natural photo, 35mm. |
| Kenta | make | Full-body photo of a 20-year-old Japanese man with neat black hair and thin round glasses, wearing a long red-and-gold knitted scarf over a navy jumper, chinos and trainers, standing facing the camera. Plain light-grey studio background, soft even light. Natural photo, 35mm. |

Extras (barman, waitress, street performer) don't need references; the prompt describes them.

## 2. Cast sheets

A cast sheet puts two or three characters side by side in **one** image, so they use only one of the three reference slots. Make each once: place the character references next to each other in any editor, or generate it with the character references as images 1–3:

> Full-body photo of [the woman from image 1] and [the man from image 2] standing side by side, facing the camera, plain light-grey studio background, soft even light. Natural photo, 35mm.

| Cast sheet | Used in |
|---|---|
| Haruka (everyday) + Tom (navy hoodie) | L4 |
| Haruka (everyday) + Tom (hoodie + denim jacket) | L10 |
| Haruka (winter) + Tom (hoodie + denim jacket) + Callum | L5 |
| Haruka (everyday) + Priya | L6, L8, L11 |
| Linda + Haruka (everyday) + Tom (navy hoodie) | L9 |
| Haruka (everyday) + Kenta + Callum | L12 |

L3 and L7 use Haruka's everyday reference on its own.

## 3. Empty locations

Make each place once with nobody in it, at 16:9, and reuse it.

| Location | Used in | Prompt |
|---|---|---|
| Pub bar, busy evening | L3 | Wide shot of a traditional British pub interior on a Friday evening, a long wooden bar with plain unbranded beer taps and bottles, warm lamps, wooden floor, empty of people. Natural photo, 35mm, warm modern colour grade. |
| Café, window table | L4 | Wide shot of a small, bright British café with a wooden table for two by the window, morning light, empty of people. Natural photo, 35mm, warm modern colour grade. |
| Park at night with a bonfire | L5 | Wide shot of a park at night with a large bonfire on the right, a straw figure in old clothes sitting on top, warm firelight, distant fireworks in the dark sky, empty of people. Natural photo, 35mm. |
| Open-plan design office | L6, L11 | Wide shot of a modern, bright open-plan design office with desks, computers, plants and a meeting table by the window, daylight, empty of people. Natural photo, 35mm, warm modern colour grade. |
| Underground carriage | L7 | Wide shot inside a London Underground carriage in the daytime, rows of patterned seats, bright carriage lights, empty of people. Natural photo, 35mm. |
| Cotswold bus stop | L8 | Wide shot of a country bus stop in an English Cotswold village in the early evening, honey-coloured stone cottages behind, an empty narrow road, empty of people. Natural photo, 35mm, warm light. |
| Gwen's back garden (London) | L9 | Wide shot of a sunny back garden of a London terraced house, a barbecue grill with a little smoke, a small lawn, a folding table with paper plates, empty of people. Natural photo, 35mm, warm modern colour grade. |
| Music venue at night, rain | L10 | Wide shot of a street outside a small London music venue at night, light rain, wet pavement shining, warm light from the open doors, a brick wall along the pavement, empty of people. Natural photo, 35mm. |
| Royal Mile, Edinburgh | L12 | Wide shot looking up Edinburgh's Royal Mile on a sunny August day, old stone buildings, the castle far up the street, empty of people. Natural photo, 35mm, bright natural light. |

## 4. The clips at a glance

| Lesson | Start frame (who, where) | One action |
|---|---|---|
| L3 Sorry, sorry, sorry | Haruka edging between people at the pub bar | A man lifts a hand apologetically; she keeps going |
| L4 A full English | Haruka and Tom at the café table, breakfasts served | She photographs her plate; Tom laughs |
| L5 (bonfire) | Haruka, Tom, Callum watching the bonfire | She points at the figure, shocked; Tom laughs |
| L6 (Christmas jumper) | Haruka at her desk, Priya holding up the jumper | Haruka laughs and shakes her head; Priya nods |
| L7 (Underground) | Haruka alone on the train, looking up | Eyes wide, hand on head, she stands up |
| L8 (bus stop) | Priya and Haruka at the stop, Priya looking down the road | Priya shrugs; they laugh and walk off |
| L9 Sorry, what did you say? | Linda talking to Haruka, Tom by the grill | Linda talks fast; Haruka nods, a little lost |
| L10 (queue in the rain) | Haruka and Tom in the queue under his jacket | Rain gets heavier; she laughs; the queue moves |
| L11 (meeting) | Priya with a laptop, Haruka with a notebook | Priya points at the screen; Haruka gives a thumbs up |
| L12 Edinburgh | Haruka, Kenta, Callum on the Royal Mile, a juggler behind | Callum points to the castle; the others look |

Changes from the old prompts: each clip now has one main action (the extra beats are gone or set up in the start frame, e.g. Tom already holding the jacket in L10, the breakfasts already on the table in L4), and L9's barbecue is in Gwen's London garden, as in the story (the old prompt said Manchester).
