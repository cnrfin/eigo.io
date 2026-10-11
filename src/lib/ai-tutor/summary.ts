import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { analyzeLesson } from '@/lib/lesson-ai'

/**
 * Lesson summary for an AI lesson, made automatically when it ends.
 * GPT-Live's transcript is already clean text, so it skips the Whereby cleanup
 * step and goes straight to the same analysis tutor lessons use. Idempotent:
 * does nothing if the booking already has a summary or the transcript is tiny.
 */
export async function summarizeAiLesson(bookingId: string) {
  const db = getSupabaseAdmin()
  const [{ data: booking }, { data: existing }] = await Promise.all([
    db.from('bookings').select('id, user_id, transcript_text').eq('id', bookingId).maybeSingle(),
    db.from('lesson_summaries').select('id').eq('booking_id', bookingId).maybeSingle(),
  ])
  if (!booking || existing) return
  const text = ((booking.transcript_text as string | null) ?? '').replace(/\n\[session [^\]]+\]\n/g, '\n').trim()
  if (text.length < 200) return

  const analysis = await analyzeLesson(text, text)
  const { error } = await db.from('lesson_summaries').insert({
    booking_id: bookingId,
    user_id: booking.user_id,
    summary_en: analysis.summary_en,
    summary_ja: analysis.summary_ja,
    key_topics: analysis.key_topics,
    mistake_patterns: analysis.mistake_patterns,
  })
  if (error) {
    if (error.code === '23505') return // another request made it first
    throw error
  }
  if (analysis.vocabulary_phrases.length) {
    await db.from('vocabulary_phrases').insert(
      analysis.vocabulary_phrases.map((v) => ({
        booking_id: bookingId,
        user_id: booking.user_id,
        phrase_en: v.phrase_en,
        example_en: v.example_en,
        translation_ja: v.translation_ja,
        explanation_ja: v.explanation_ja,
        explanation_en: v.explanation_en,
        category: v.category,
      })),
    )
  }
}
