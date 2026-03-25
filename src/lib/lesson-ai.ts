import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

export type LessonAnalysis = {
  summary_en: string
  summary_ja: string
  key_topics: string[]
  mistake_patterns: {
    type: string
    example_student: string
    correction: string
    explanation_ja: string
    explanation_en: string
  }[]
  vocabulary_phrases: {
    phrase_en: string
    example_en: string
    translation_ja: string
    explanation_ja: string
    explanation_en: string
    category: string
  }[]
}

/**
 * Analyze a lesson transcript using GPT-4.1 Nano.
 * Returns summary, vocabulary phrases, and mistake patterns in one call.
 */
export async function analyzeLesson(transcript: string): Promise<LessonAnalysis> {
  const systemPrompt = `You are an expert English language teaching assistant for Japanese students learning English.

Analyze the following lesson transcript between a teacher and student. Return a JSON object with:

1. "summary_en": A brief 2-3 sentence summary of the lesson in English (what topics were discussed, what the student practiced)
2. "summary_ja": The same summary in natural Japanese
3. "key_topics": An array of 2-5 topic tags in English (e.g. "travel", "business email", "daily conversation")
4. "mistake_patterns": An array of grammar/vocabulary mistakes the student made. For each:
   - "type": Category (e.g. "grammar", "vocabulary", "pronunciation", "word choice")
   - "example_student": What the student actually said (or close approximation)
   - "correction": The corrected version
   - "explanation_ja": A clear, friendly explanation in Japanese of why it's wrong and how to fix it
   - "explanation_en": Same explanation in English
   Only include clear mistakes, not minor hesitations. Maximum 5 mistakes.
5. "vocabulary_phrases": An array of 5-10 useful English phrases or expressions from the lesson that would help the student. Focus on:
   - Multi-word phrases and expressions (NOT single common words like "run", "play")
   - Phrases the teacher used or taught
   - Natural collocations and idioms
   - Practical phrases the student can reuse
   For each phrase:
   - "phrase_en": The English phrase (e.g. "I'm looking forward to")
   - "example_en": A full example sentence using the phrase
   - "translation_ja": Natural Japanese translation of the phrase
   - "explanation_ja": Brief explanation in Japanese of when/how to use this phrase
   - "explanation_en": Same explanation in English
   - "category": One of "daily", "business", "travel", "academic", "social", "general"

IMPORTANT:
- Write all Japanese naturally and casually — not overly formal
- Focus on practical, reusable phrases rather than topic-specific vocabulary
- If the transcript is too short or unclear, still provide what you can
- Return ONLY valid JSON, no markdown or explanation`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-5.4-nano',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Lesson transcript:\n\n${transcript}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_completion_tokens: 3000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from AI')
  }

  const parsed = JSON.parse(content) as LessonAnalysis

  // Validate required fields with defaults
  return {
    summary_en: parsed.summary_en || '',
    summary_ja: parsed.summary_ja || '',
    key_topics: parsed.key_topics || [],
    mistake_patterns: (parsed.mistake_patterns || []).map(m => ({
      type: m.type || 'grammar',
      example_student: m.example_student || '',
      correction: m.correction || '',
      explanation_ja: m.explanation_ja || '',
      explanation_en: m.explanation_en || '',
    })),
    vocabulary_phrases: (parsed.vocabulary_phrases || []).map(v => ({
      phrase_en: v.phrase_en || '',
      example_en: v.example_en || '',
      translation_ja: v.translation_ja || '',
      explanation_ja: v.explanation_ja || '',
      explanation_en: v.explanation_en || '',
      category: v.category || 'general',
    })),
  }
}
