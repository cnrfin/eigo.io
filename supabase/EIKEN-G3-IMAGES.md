# EIKEN Grade 3 Mock Test 1 — illustrations (Grok image briefs)

Eleven illustrations are needed: ten for the listening 第1部 illustration
questions (`eg3-l01.jpg` … `eg3-l10.jpg`) and one for the speaking interview
card (`eg3-card.jpg`). Each scene must match its audio dialogue / interview
questions exactly — the picture is part of the test item. Landscape,
~1200×800, JPG, **no text, letters, or numbers anywhere in the image**.

Every prompt below is complete — copy-paste it into Grok as-is.

Base style (already included in every prompt):

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English
> test materials, clean black outlines, soft muted colors, white background,
> no text or letters anywhere in the image

## Listening 第1部 (Q1–10)

### eg3-l01.jpg — 第1部 Q1 (boy looking for his cap; mother calls him to breakfast)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a teenage boy in school clothes kneeling on the floor of his bedroom and looking under his bed for a baseball cap, while his mother stands in the doorway of the room calling to him, a small breakfast table visible behind her

### eg3-l02.jpg — 第1部 Q2 (boy with a new soccer ball invites a girl to play)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a teenage boy proudly holding a brand-new soccer ball and talking with a teenage girl in a park, trees and a grassy field behind them

### eg3-l03.jpg — 第1部 Q3 (girl asks a librarian for a book about dogs)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a teenage girl standing at a library counter talking to a friendly male librarian, tall bookshelves full of books behind them, the girl holding a small card in her hand

### eg3-l04.jpg — 第1部 Q4 (rainy day; girl offers to share her umbrella)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: two junior high school students standing at a school entrance on a rainy day, the girl holding an open umbrella and the boy looking worried with no umbrella, heavy rain falling outside

### eg3-l05.jpg — 第1部 Q5 (boy and father look at a white rabbit at a pet shop)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a young boy and his father looking at a cute white rabbit in a cage at a pet shop, the boy pointing at the rabbit excitedly, other small animal cages in the background

### eg3-l06.jpg — 第1部 Q6 (girl answering a phone call at home)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a teenage girl sitting on a sofa in a cozy living room talking on a phone and smiling, a small table and a window behind her

### eg3-l07.jpg — 第1部 Q7 (teacher praises a girl's drawing in art class)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a male teacher smiling and looking at a teenage girl's drawing in an art classroom, the girl holding up her picture of a dog, easels and paint supplies around them

### eg3-l08.jpg — 第1部 Q8 (boy shopping for a T-shirt; clerk asks the size)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a teenage boy talking with a friendly female shop clerk in a clothing store, folded T-shirts of different colors displayed on tables and shelves around them

### eg3-l09.jpg — 第1部 Q9 (mother cooking curry; hungry boy in the kitchen)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a mother stirring a pot of curry at the stove in a home kitchen while her hungry teenage son stands by the kitchen table looking at the pot, plates and cutlery waiting to be set on the table

### eg3-l10.jpg — 第1部 Q10 (girl asks a man about the bus at a bus stop)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a teenage girl asking a kind middle-aged man a question at a bus stop with a blank round bus stop sign on a pole, a city bus visible in the distance down the street

## Speaking interview card (eg3-card.jpg)

Used by `eiken-g3-speaking-mock-01` (card group). Must match the grader
references for No. 2 and No. 3: a **boy taking a picture of the monkeys with
a camera** (No. 2 — "What is the boy doing?") and **exactly THREE birds
sitting on a fence** (No. 3 — "How many birds are there?"). The passage also
mentions monkeys, pony rides, and the zoo shop.

### eg3-card.jpg — Interview card (passage "Our City Zoo" + No. 2 / No. 3)

> simple flat 2D cartoon illustration in the style of Japanese EIKEN English test materials, clean black outlines, soft muted colors, white background, no text or letters anywhere in the image: a cheerful city zoo scene where a young boy is taking a picture of funny monkeys in their enclosure with a small camera, a young girl nearby is eating an ice cream cone, exactly three birds are sitting in a row on a wooden fence, and in the background a child rides a pony led by a zookeeper

## Attaching

Put all eleven files in one folder, then:

```bash
node --env-file=.env.local scripts/attach-eiken-g3-images.mjs ./path/to/folder
```

Re-running replaces the images. The forms work without them (admin draft
preview), but don't publish until the illustrations are attached — the 第1部
items and the interview picture questions are meaningless without them.
