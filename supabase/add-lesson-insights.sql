-- Lesson Summaries: generated on-demand from transcript via AI
-- Contains summary, topics, and mistake analysis for each lesson
CREATE TABLE lesson_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  summary_en TEXT NOT NULL DEFAULT '',
  summary_ja TEXT NOT NULL DEFAULT '',
  key_topics JSONB NOT NULL DEFAULT '[]',
  -- mistake_patterns: [{type, example_student, correction, explanation_ja, explanation_en}]
  mistake_patterns JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary Phrases: practical phrases extracted from lesson transcripts
-- Generated alongside the summary in a single AI call
CREATE TABLE vocabulary_phrases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  phrase_en TEXT NOT NULL,
  example_en TEXT NOT NULL,
  translation_ja TEXT NOT NULL,
  explanation_ja TEXT NOT NULL,
  explanation_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary Cards: student's personal study deck
-- Created when a student adds a phrase to their deck
CREATE TABLE vocabulary_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  phrase_id UUID REFERENCES vocabulary_phrases(id) ON DELETE CASCADE NOT NULL,
  comfort_level TEXT NOT NULL DEFAULT 'learning' CHECK (comfort_level IN ('learning', 'reviewing', 'mastered')),
  last_reviewed TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phrase_id)
);

-- Indexes
CREATE INDEX idx_lesson_summaries_user ON lesson_summaries(user_id);
CREATE INDEX idx_lesson_summaries_booking ON lesson_summaries(booking_id);
CREATE INDEX idx_vocabulary_phrases_user ON vocabulary_phrases(user_id);
CREATE INDEX idx_vocabulary_phrases_booking ON vocabulary_phrases(booking_id);
CREATE INDEX idx_vocabulary_cards_user ON vocabulary_cards(user_id);
CREATE INDEX idx_vocabulary_cards_comfort ON vocabulary_cards(user_id, comfort_level);

-- RLS policies
ALTER TABLE lesson_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_cards ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own summaries" ON lesson_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own phrases" ON vocabulary_phrases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cards" ON vocabulary_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cards" ON vocabulary_cards
  FOR ALL USING (auth.uid() = user_id);
