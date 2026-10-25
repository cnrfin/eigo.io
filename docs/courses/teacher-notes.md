# Teacher notes: one format for the AI tutor and a human teacher

Every slide's teacher notes are a private guide for whoever teaches the slide, the AI tutor or a human. Both use the same notes. They are never read out to the student.

The AI tutor gets the notes with each slide, after the slide's content and a checklist of what's on it. Before sending them, the app removes:
- time estimates such as "(~2 min)" (humans still see them);
- `Sources:` lines;
- `[IMAGE / AUDIO / VIDEO TO ADD …]` briefs and everything after them.

Everything else reaches the AI, so write only what helps teach the slide.

## Format

Short lines, in this order. Use only the labels the slide needs.

1. **Steps.** What to do, in teaching order, one per line, each starting with a verb ("Ask…", "Read…", "Play…"). Put the exact words to say in quotes.
2. **`Video:`** on video slides: what happens in the clip, in one or two plain sentences, naming the characters. The AI can't see the video, so this is all it knows.
3. **`Answers:`** expected answers for questions, true/false or gap-fills. Use them only after the student has tried.
4. **`If asked:`** background, culture or word facts. Share them only if the student asks or seems confused, in one short sentence.
5. **`Watch for:`** typical mistakes to correct, with the correct form.
6. The time estimate, "(~N min)", at the end.

Keep each note under about 450 characters, not counting the time, sources and briefs. That's long enough for 3 to 6 short lines.

## Rules

- **Instructions, not commentary.** "Ask: Which character is most like you?" not "This slide introduces the characters, who…".
- **Nothing that only makes sense to the writer:**
  - no references to other slides by number;
  - no "this slide is for…";
  - no lesson-planning talk ("skip if short");
  - no IPA symbols.
  
  Pronunciation goes in plain respelling ("KET-l").
- **Never the word "homework".** Optional practice is "a sentence for next time".
- **No things the AI can't do:** pointing, writing on the board, watching the student's mouth. "Write it in the chat" is fine.
- **Don't repeat the slide.** The AI already gets the slide's text, questions and vocabulary.
- **Vocabulary slides follow one flow:**
  - the student reads each word aloud;
  - ask if they have questions about any word;
  - practise only those (a sentence of their own);
  - then move on.
  
  No drilling every word.
- **Dialogues:** the student is Haruka (or the named character), the tutor reads the others, once. Then one or two quick questions or one phrase to notice.
- **Cover note (slide 1):**
  - one line welcoming the student;
  - the goal;
  - the total time.
  
  Which slides to drop for a shorter lesson goes in a final `Shorter lesson:` line, which humans use and the AI ignores.

## Example

Before:

> After pressing play, and watching the whole clip (8 seconds), Ask the student to describe what happens, then ask the questions. Watch again to check. (~1.5 min)
> If the video isn't ready yet, describe the scene to the student.

After:

> Play the clip, then ask the student to describe what happens.
> Ask the two questions on the slide. Play it again if they're unsure.
> Video: Haruka pulls her suitcase up the last step, stops, looks up at the house, takes a deep breath and knocks twice.
> Answers: She's arriving at her new home. She feels nervous but excited.
> (~1.5 min)
