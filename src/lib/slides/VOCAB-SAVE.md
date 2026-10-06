# Saving slide vocabulary to review cards (design, not live yet)

Every row in a vocabulary table has a round **+** button. On eigo.io a student taps it to turn that word into a review card. It turns into a teal ✓ when saved; tapping again removes it.

## What's already built

- `VocabItem` has a stable `id` (`v_…`), a word type (`pos`), meaning, Japanese and an example sentence, shown under the meaning and saved with the card.
- `cloneSlide` / `cloneBlock` give copied words new ids, so ids stay unique within a course.
- The renderer reads a `SlideVocabSave` provider. With no provider (studio, teacher view) the button is a faded preview that does nothing.

```tsx
<SlideVocabSave value={{ isSaved: (item) => savedIds.has(item.id!), toggle: (item) => save(item) }}>
  <SlideRenderer slide={slide} mode="student" />
</SlideVocabSave>
```

## What to add when it goes live

1. **Database.** Add `source_course_id text` and `source_item_id text` to `vocabulary_phrases`, with a unique index on `(user_id, source_course_id, source_item_id)`. Check `booking_id` is nullable (course words may not belong to a booking).
2. **API.** In `POST /api/vocabulary`, add `{ action: 'saveFromCourse', courseId, itemId, term, pos, meaning, ja, example }`. Upsert the phrase (`phrase_en` = term, `translation_ja` = ja, `explanation_en` = meaning, `example_en` = example, `category` = pos), then upsert the card as the existing "add new card" branch does. Add `GET /api/vocabulary?courseId=…` returning the saved `source_item_id`s, and allow `DELETE` by `courseId` + `itemId`.
3. **Lesson page.** On load, fetch the saved ids for the course into a `Set`. Provide `SlideVocabSave` with optimistic toggling (update the set first, roll back on error). Only provide it in student mode for a signed-in student.
4. **Review list.** Saved course words then appear in the existing card review with no other changes.
