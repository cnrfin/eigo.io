import { DEFAULT_ORB_COLOR, ORB_COLORS, type OrbColor } from './orb-colors'

/**
 * AI tutor ("マイAIチューター") settings, shared by the server and the browser.
 * Stored per student in ai_tutor_profiles.settings (jsonb). Unknown or missing
 * fields fall back to DEFAULT_TUTOR_SETTINGS, so old rows keep working.
 */

/** Plan minutes charged per booked minute for AI lessons (30 min → 18). */
export const AI_MINUTE_RATIO = 0.6
export const aiMinutesFor = (durationMinutes: number) => Math.ceil(durationMinutes * AI_MINUTE_RATIO)

/**
 * GPT-Live voices offered to students (API names). OpenAI's voice table (Managing GPT-Live sessions):
 * Vesper British/m, Meridian North American/m, Willow Irish/f, Quartz Australian/f. Every voice is asked to speak
 * British English (ACCENT_RULE). Chosen by Connor after auditioning all 14.
 */
export const TUTOR_VOICES = [
  { id: 'vesper', label: 'Vesper', note: 'Male', noteJa: '男性' },
  { id: 'meridian', label: 'Meridian', note: 'Male', noteJa: '男性' },
  { id: 'willow', label: 'Willow', note: 'Female', noteJa: '女性' },
  { id: 'quartz', label: 'Quartz', note: 'Female', noteJa: '女性' },
] as const

/** GPT-Live takes its accent from the instructions (OpenAI's custom-voice guide: "Speak British English"). */
export const ACCENT_RULE = 'Speak British English with a natural, standard southern English accent, and use British vocabulary.'

/** What each voice says in its ▶ preview (made by /api/ai-tutor/voice-preview; editing it makes new clips). */
export const VOICE_SAMPLE_LINE = "Hi! I'm your AI tutor. Let's practise some English together today. Take your time, there's no rush."

export type TutorVoice = (typeof TUTOR_VOICES)[number]['id']

export type TutorSettings = {
  voice: TutorVoice
  /** the AI tutor's orb colour (ORB_COLORS) */
  orbColor: OrbColor
  speed: 'slow' | 'normal' | 'natural'
  japanese: 'english_only' | 'when_stuck' | 'grammar'
  corrections: 'relaxed' | 'end_of_activity' | 'immediate'
  pronunciation: 'relaxed' | 'normal' | 'strict'
  focus: ('speaking' | 'listening' | 'reading' | 'vocabulary')[]
  pace: 'relaxed' | 'standard' | 'brisk'
  tone: 'warm' | 'calm' | 'upbeat' | 'professional'
  formality: 'casual' | 'polite'
  tutorName: string
  callMe: string
  aboutMe: string
  warmUp: boolean
  reviewLast: boolean
  recap: boolean
  useHistory: boolean
}

export const DEFAULT_TUTOR_SETTINGS: TutorSettings = {
  voice: 'vesper',
  orbColor: DEFAULT_ORB_COLOR,
  speed: 'normal',
  japanese: 'when_stuck',
  corrections: 'end_of_activity',
  pronunciation: 'normal',
  focus: ['speaking'],
  pace: 'standard',
  tone: 'warm',
  formality: 'casual',
  tutorName: '',
  callMe: '',
  aboutMe: '',
  warmUp: true,
  reviewLast: true,
  recap: true,
  useHistory: true,
}

const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d)
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Validate and fill in a settings object from untrusted JSON. */
export function normalizeSettings(raw: unknown): TutorSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_TUTOR_SETTINGS
  const focusAll = ['speaking', 'listening', 'reading', 'vocabulary'] as const
  const focus = Array.isArray(r.focus) ? (r.focus.filter((f) => focusAll.includes(f as never)) as TutorSettings['focus']) : d.focus
  return {
    voice: pick(r.voice, TUTOR_VOICES.map((v) => v.id), d.voice),
    orbColor: pick(r.orbColor, ORB_COLORS.map((c) => c.id), d.orbColor),
    speed: pick(r.speed, ['slow', 'normal', 'natural'] as const, d.speed),
    japanese: pick(r.japanese, ['english_only', 'when_stuck', 'grammar'] as const, d.japanese),
    corrections: pick(r.corrections, ['relaxed', 'end_of_activity', 'immediate'] as const, d.corrections),
    pronunciation: pick(r.pronunciation, ['relaxed', 'normal', 'strict'] as const, d.pronunciation),
    focus: focus.length ? [...new Set(focus)] : d.focus,
    pace: pick(r.pace, ['relaxed', 'standard', 'brisk'] as const, d.pace),
    tone: pick(r.tone, ['warm', 'calm', 'upbeat', 'professional'] as const, d.tone),
    formality: pick(r.formality, ['casual', 'polite'] as const, d.formality),
    tutorName: str(r.tutorName, 30),
    callMe: str(r.callMe, 30),
    aboutMe: str(r.aboutMe, 600),
    warmUp: typeof r.warmUp === 'boolean' ? r.warmUp : d.warmUp,
    reviewLast: typeof r.reviewLast === 'boolean' ? r.reviewLast : d.reviewLast,
    recap: typeof r.recap === 'boolean' ? r.recap : d.recap,
    useHistory: typeof r.useHistory === 'boolean' ? r.useHistory : d.useHistory,
  }
}

/** The settings as short rule lines for the tutor's instructions. */
export function settingsToRules(s: TutorSettings): string[] {
  const rules: string[] = []
  rules.push(
    {
      slow: 'Speak slowly and clearly, with short sentences and a pause between ideas.',
      normal: 'Speak at a relaxed, clear pace for a learner.',
      natural: 'Speak at a natural native pace, but still clearly.',
    }[s.speed],
  )
  rules.push(
    {
      english_only: 'Use English only. If the student is stuck, rephrase more simply or give an example; never switch to Japanese.',
      when_stuck: 'Use English. Only if the student is clearly stuck, give a very short explanation in simple Japanese, then return to English.',
      grammar: 'Use English for conversation, but explain grammar points briefly in simple Japanese.',
    }[s.japanese],
  )
  rules.push(
    {
      relaxed: 'Let small mistakes go; only correct mistakes that change the meaning.',
      end_of_activity: 'Note mistakes and correct them briefly at the end of each activity, not mid-sentence.',
      immediate: 'Correct important mistakes straight away: give the correct form and have the student say it again.',
    }[s.corrections],
  )
  rules.push(
    {
      relaxed: 'Only correct pronunciation when it stops you understanding.',
      normal: 'Correct clear pronunciation problems on key words: model the word once and let them repeat.',
      strict: 'Correct pronunciation carefully: model the word or sound, have them repeat, and praise improvement.',
    }[s.pronunciation],
  )
  // lesson focus changes how the lesson is run, not what's in it
  for (const f of s.focus)
    rules.push(
      {
        speaking: 'Speaking focus: ask open questions and follow-ups so the student does most of the talking; ask them to say more when an answer is short.',
        listening: 'Listening focus: talk the student through explanations, meanings and examples yourself (in a course, the slide text outside the dialogues), then check they understood with a quick question.',
        reading: 'Reading-aloud focus: have the student read slide text aloud beyond the dialogues and turn-taking exercises, including explanations, meanings and recaps. In free talk, have them read the phrases you write in the chat.',
        vocabulary: 'Vocabulary focus: stop on key words and phrases, check the student knows the meaning, and have them use each in a sentence of their own.',
      }[f],
    )
  rules.push(
    {
      relaxed: 'Pace: relaxed. Still cover every item on every slide, but give extra practice on each one before moving on (in free talk, spend longer on each topic).',
      standard: 'Pace: steady. Cover every item on every slide with normal practice (in free talk, a good mix of topics).',
      brisk: 'Pace: brisk. Still cover every item on every slide, but move on as soon as the student has it (in free talk, change topics more often).',
    }[s.pace],
  )
  rules.push(
    {
      warm: 'Be warm and encouraging.',
      calm: 'Be calm and patient.',
      upbeat: 'Be upbeat, friendly and a little funny.',
      professional: 'Be friendly but professional.',
    }[s.tone],
  )
  rules.push(s.formality === 'polite' ? 'Use polite, slightly formal English.' : 'Use casual, friendly English.')
  if (s.tutorName) rules.push(`Your name is ${s.tutorName}.`)
  if (s.callMe) rules.push(`Call the student "${s.callMe}".`)
  rules.push(s.warmUp ? 'Start with one or two minutes of light warm-up chat.' : 'Start the lesson straight away after a short greeting.')
  if (s.reviewLast) rules.push('After the greeting (and warm-up, if any), spend two or three minutes reviewing the student\'s last lesson (see "Last lesson" in the student data): ask what they remember and have them use one or two of its phrases. If there is no last lesson, skip this.')
  if (s.recap) rules.push('In the last three minutes, recap the vocabulary taught in this lesson: go through each key word or phrase, have the student use it in a short sentence, and write the list in the chat with write_in_chat.')
  return rules
}
