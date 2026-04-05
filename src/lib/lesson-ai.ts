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
 * Analyze a lesson transcript using GPT-4.1 Nano.
 * Takes both raw and cleaned transcripts — uses cleaned for context and attribution,
 * cross-references raw to confirm mistakes are real (not transcription errors).
 */
export async function analyzeLesson(rawTranscript: string, cleanedTranscript?: string): Promise<LessonAnalysis> {
  const systemPrompt = `You are an expert English language teaching assistant for Japanese students learning English.

You will be given ${cleanedTranscript ? 'TWO versions of the same lesson transcript' : 'a lesson transcript'}:
${cleanedTranscript ? `
- RAW TRANSCRIPT: The original auto-generated transcription from Whereby. Contains transcription errors, misheard words, speaker misattributions, and hallucinations.
- CLEANED TRANSCRIPT: A corrected version where transcription noise has been removed and speakers have been properly attributed as "Teacher:" and "Student:".

Use the CLEANED transcript to understand the conversation, identify what the student actually said, and extract vocabulary phrases.
Use the RAW transcript as a cross-reference when identifying student mistakes — only flag a mistake if the error is clearly visible in the CLEANED transcript AND makes sense in context as something the student genuinely said.
` : ''}

Return a JSON object with:

1. "summary_en": A brief 2-3 sentence summary of the lesson in English (what topics were discussed, what the student practiced)
2. "summary_ja": The same summary in natural Japanese
3. "key_topics": An array of 2-5 topic tags in English (e.g. "travel", "business email", "daily conversation")
4. "mistake_patterns": An array of genuine grammar/vocabulary mistakes the student made. Rules:
   - ONLY include lines clearly attributed to "Student:" — never flag anything the Teacher said
   - ONLY flag mistakes where the student's version is clearly wrong AND your correction is meaningfully different from what they said
   - NEVER flag a sentence that is already correct — if the correction would be essentially the same as the original, omit it
   - SKIP anything that looks like a transcription error or garbled text (incoherent phrases, random words, things that make no grammatical or contextual sense) — these are recording artifacts, not real student mistakes
   - SKIP anything that looks like it could be a transcription hallucination — if a phrase seems unnatural or out of context, it was likely misheard by the transcriber, not actually said by the student
   - IGNORE self-corrections and natural repetition (e.g. "Maid. Maid. Classical maid.") — in conversation, people repeat words to correct themselves or think aloud. This is normal speech, not a mistake
   - If you are not confident it's a genuine student mistake, omit it
   - Quality over quantity — only include mistakes that would genuinely help the student improve. An empty array is fine if there are no clear mistakes.
   - Maximum 5 mistakes
   For each genuine mistake:
   - "type": Category (e.g. "grammar", "vocabulary", "word choice")
   - "example_student": Exactly what the student said (from the cleaned transcript)
   - "correction": The corrected version (must be meaningfully different from example_student)
   - "explanation_ja": A clear, friendly explanation in Japanese of why it's wrong and how to fix it
   - "explanation_en": Same explanation in English
5. "vocabulary_phrases": An array of useful English phrases or expressions from the lesson. STRICT rules:
   - Extract the GENERAL collocation or pattern, not the overly specific version from the lesson. For example: "room temperature" NOT "room-temperature beer", "twice as [adjective]" NOT "twice as expensive", "fuel surcharge" is fine but "fuel surcharge will start charging from this June" is too specific
   - The phrase should be REUSABLE in many contexts — if it only makes sense in the exact situation discussed in the lesson, don't include it
   - Do NOT include phrases that aren't genuinely useful for an English learner (e.g. "walk through the streets and rob stores" teaches nothing practical)
   - Do NOT pad the list to reach a quota. If only 3-4 phrases are genuinely useful, return only 3-4. Quality matters far more than quantity.
   - Focus on: natural collocations, useful multi-word expressions, phrasal verbs, idioms, and patterns the teacher taught or used
   - NOT single common words like "run", "play"
   For each phrase:
   - "phrase_en": The general English phrase/collocation (e.g. "room temperature", "look forward to", "twice as [adjective]")
   - "example_en": A full example sentence using the phrase
   - "translation_ja": Natural Japanese translation of the phrase
   - "explanation_ja": Brief explanation in Japanese of when/how to use this phrase
   - "explanation_en": Same explanation in English
   - "category": One of "daily", "business", "travel", "academic", "social", "general"

IMPORTANT:
- Write all Japanese naturally and casually — not overly formal
- If the transcript is too short or unclear, still provide what you can
- Return ONLY valid JSON, no markdown or explanation`

  const userContent = cleanedTranscript
    ? `RAW TRANSCRIPT:\n\n${rawTranscript}\n\n---\n\nCLEANED TRANSCRIPT:\n\n${cleanedTranscript}`
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
