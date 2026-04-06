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

/**
 * Clean up a messy auto-generated transcript from an online English lesson.
 * Reconstructs a coherent, natural conversation from noisy transcription output.
 */
export async function cleanTranscript(rawTranscript: string): Promise<string> {
  const systemPrompt = `You are an expert transcript editor. You are cleaning up an auto-generated transcript from an online English lesson between a native English teacher (Connor) and a Japanese student.

The auto-transcription is VERY messy because of online video call issues. You need to reconstruct a coherent, natural-sounding conversation. Think of yourself as a professional subtitler — the cleaned version should read like a proper conversation.

## Common problems you MUST fix

### 1. Speaker attribution errors (MOST IMPORTANT)
Online lag causes crosstalk. The transcriber often assigns words to the wrong speaker. Use conversational context to fix this:
- Response phrases like "Oh really?", "I see", "Right", "That's interesting" belong to the LISTENER, not the current speaker. If Speaker 0 is telling a story and the transcript shows Speaker 0 saying "Oh really?" mid-sentence, that "Oh really?" was actually said by Speaker 1.
- If a speaker appears to answer their own question, the answer likely belongs to the other speaker.
- If a speaker's turn contains an abrupt topic shift mid-sentence, the second part likely belongs to the other speaker.

### 2. Japanese words misheard as English
The student is Japanese and sometimes uses Japanese words. The English transcriber phonetically guesses these. Common examples:
- "Nantiuka" → なんていうか (nanteiuka — "how do you say...")
- "Sodesune" → そうですね (sou desu ne — "that's right")
- "Chotto" → ちょっと (chotto — "a little/wait")
- "Jia" / "Ja" → じゃあ (jaa — "well then/so")
- "Honto" / "Hontoni" → 本当に (hontou ni — "really")
- "Sugoi" → すごい (sugoi — "amazing")
- "Naru hodo" / "Naruhodo" → なるほど (naruhodo — "I see/makes sense")
- Any word that looks like garbled nonsense but sounds Japanese when read aloud → convert it to the actual Japanese word in Japanese characters
- Names that don't belong in the conversation (like "Vanessa", "Kate", "Mira") may be misheard Japanese words or transcription noise — remove them or replace with the correct word based on context

### 3. Incoherent sentences
The transcriber sometimes produces sentences that make no sense. Use the surrounding context to figure out what was actually said:
- "Because I set a reminder about thirty minutes before Vanessa" → "Because I set a reminder about thirty minutes before the lesson" (Vanessa is noise)
- "How much news?" → probably "How about news?" or just remove if it doesn't fit the flow
- If a sentence is truly unrecoverable, omit it rather than leaving in gibberish

### 4. Filler and repetition
- Remove filler sounds: mmhm, uh, um, ah, etc.
- Remove meaningless repetition: "yeah yeah yeah", "I I I think", "so so so"
- Keep meaningful short responses: "Yeah." "Right." "I see." — these show the listener is engaged

### 5. Conversation flow
- Each speaker turn should be a coherent, complete thought
- Don't let a speaker's turn contain both a statement and the other person's response
- Break up long messy blocks into proper back-and-forth dialogue
- The conversation should read naturally — like you're reading a screenplay

### 6. Preserving student mistakes (CRITICAL for lesson analysis)
The cleaned transcript will be used to identify the student's real English mistakes. You MUST preserve genuine grammar/vocabulary errors the student made — do NOT correct their English. Only fix TRANSCRIPTION errors.

To help you distinguish real mistakes from transcription errors, here are the most common mistakes Japanese English learners make. If you see these patterns in the student's speech, they are almost certainly REAL mistakes — keep them exactly as spoken:

- Missing articles: "I went to store" "She is teacher" "I have cat"
- Wrong article: "I ate a rice" "She is a Japanese"
- Missing/wrong prepositions: "I go to there" "I arrived to Tokyo" "I listen music"
- L/R confusion in word choice: "I was really relaxed" when they mean "I was really relapsed" — but note the transcriber may also mishear L/R sounds
- Tense errors: "Yesterday I go to..." "I have been there last year" "I didn't went"
- Missing plural -s: "I have two cat" "many student"
- Subject-verb agreement: "He don't" "She have" "It don't matter"
- Word order: "I yesterday went" "I think is good"
- Direct Japanese translation patterns: "I am exciting" (instead of "excited"), "The typhoon is coming so I am scary" (instead of "scared"), "I could see Mt. Fuji" when meaning "I was able to see"
- Omitting subjects: "Is very good" "Yesterday went to park"
- Confusing "borrow/lend", "teach/learn", "say/tell", "listen/hear", "see/watch/look"
- "I can't hear" instead of "I don't understand" (直訳 of 聞こえない/わからない)
- Overuse of "so" as a connector: "So I went to the store so I bought milk so..."

When in doubt about whether something is a transcription error or a genuine student mistake, lean toward KEEPING it. It's better to preserve a possible mistake than to accidentally correct one.

## Rules

- Use "Teacher:" and "Student:" as speaker labels (not "Speaker 0" / "Speaker 1"). Figure out which speaker is the teacher (native English, explains things, asks teaching questions) and which is the student (Japanese speaker, learning English, sometimes uses Japanese).
- Keep the student's actual English grammar mistakes — do NOT correct their English. If they said "I go to store yesterday" that stays as-is. Only fix TRANSCRIPTION errors (words the transcriber got wrong), not the student's real speech.
- Japanese words should appear in Japanese characters, not romanized gibberish.
- Remove names of people who are clearly not part of the conversation (transcription hallucinations).
- If something is completely unintelligible and context doesn't help, omit it.
- Return ONLY the cleaned transcript. No commentary, notes, or explanations.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the raw auto-generated transcript to clean up:\n\n${rawTranscript}` },
    ],
    temperature: 0.3,
    max_completion_tokens: 8000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from AI')
  }

  return content.trim()
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
 * Analyze a lesson transcript using GPT-5.4 Nano.
 * Prefers the cleaned transcript (which preserves genuine student mistakes).
 * Falls back to raw transcript if no cleaned version is available.
 */
export async function analyzeLesson(rawTranscript: string, cleanedTranscript?: string): Promise<LessonAnalysis> {
  const systemPrompt = `You are an expert English language teaching assistant for Japanese students learning English.

You will be given ${cleanedTranscript ? 'a CLEANED lesson transcript' : 'a lesson transcript'}.
${cleanedTranscript ? `
The transcript has been cleaned up from a messy auto-generated transcription. Speaker labels ("Teacher:" and "Student:") have been corrected, transcription noise removed, but the student's genuine English mistakes have been intentionally preserved. Trust this transcript as the source of truth for everything — summary, mistakes, and phrases. Do NOT reference or consider the raw transcript.
` : ''}

Return a JSON object with:

1. "summary_en": A brief 2-3 sentence summary of the lesson in English (what topics were discussed, what the student practiced)
2. "summary_ja": The same summary in natural Japanese
3. "key_topics": An array of 2-5 topic tags in English (e.g. "travel", "business email", "daily conversation")
4. "mistake_patterns": An array of genuine grammar/vocabulary mistakes the student made. Rules:
   - ONLY include lines clearly attributed to "Student:" — never flag anything the Teacher said
   - ONLY flag mistakes where the student's version is clearly wrong AND your correction is meaningfully different
   - NEVER flag a sentence that is already correct
   - IGNORE incomplete thoughts and trailing off — this is normal in conversation (e.g. "I felt like it's just... it's a little odd", "Maybe I should..." are NOT mistakes, they're natural speech patterns)
   - IGNORE repeated words during pronunciation practice — in English lessons the teacher often has the student repeat a word multiple times. This is drilling, not a mistake
   - IGNORE self-corrections (e.g. "Maid. Maid. Classical maid.") — people repeat words to correct themselves or think aloud
   - IGNORE filler phrases and hesitation markers — "how do I say", "what's the word", etc.
   - Focus on clear, teachable grammar/vocabulary errors common among Japanese English learners: missing articles, wrong prepositions, tense errors, subject-verb agreement, word order, confusing similar words (borrow/lend, say/tell), direct Japanese translation patterns
   - If you are not confident it's a genuine student mistake, leave it out
   - Quality over quantity — an empty array is perfectly fine if there are no clear mistakes
   - Maximum 5 mistakes
   For each genuine mistake:
   - "type": Category (e.g. "grammar", "vocabulary", "word choice")
   - "example_student": Exactly what the student said
   - "correction": The corrected version
   - "explanation_ja": A clear, friendly explanation in Japanese of why it's wrong and how to fix it
   - "explanation_en": Same explanation in English
5. "vocabulary_phrases": An array of 5-10 useful English phrases or expressions from the lesson. Focus on:
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

  const userContent = cleanedTranscript
    ? `LESSON TRANSCRIPT:\n\n${cleanedTranscript}`
    : `Lesson transcript:\n\n${rawTranscript}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-5.4-nano',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
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
