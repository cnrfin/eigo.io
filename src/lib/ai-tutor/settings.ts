/**
 * AI tutor ("マイAIチューター") settings, shared by the server and the browser.
 * Stored per student in ai_tutor_profiles.settings (jsonb). Unknown or missing
 * fields fall back to DEFAULT_TUTOR_SETTINGS, so old rows keep working.
 */

/** Plan minutes charged per booked minute for AI lessons (30 min → 18). */
export const AI_MINUTE_RATIO = 0.6
export const aiMinutesFor = (durationMinutes: number) => Math.ceil(durationMinutes * AI_MINUTE_RATIO)

/** GPT-Live voices offered to students (API names). Confirm the shortlist in the pilot. */
export const TUTOR_VOICES = [
  { id: 'vesper', label: 'Vesper', note: 'British · male' },
  { id: 'marin', label: 'Marin', note: 'female' },
  { id: 'cedar', label: 'Cedar', note: 'male' },
  { id: 'willow', label: 'Willow', note: 'Irish · female' },
  { id: 'stone', label: 'Stone', note: 'Irish · male' },
  { id: 'quartz', label: 'Quartz', note: 'Australian · female' },
] as const
export type TutorVoice = (typeof TUTOR_VOICES)[number]['id']

export type TutorSettings = {
  voice: TutorVoice
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
  recap: boolean
  useHistory: boolean
}

export const DEFAULT_TUTOR_SETTINGS: TutorSettings = {
  voice: 'vesper',
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
  const focus = s.focus.map((f) => ({ speaking: 'speaking', listening: 'listening', reading: 'reading aloud', vocabulary: 'vocabulary' })[f])
  rules.push(`Spend extra time on: ${focus.join(', ')}.`)
  rules.push(
    {
      relaxed: 'Keep a relaxed pace: cover fewer slides and give more practice on each.',
      standard: 'Keep a steady pace so the lesson covers its main parts in the booked time.',
      brisk: 'Keep a brisk pace: move on as soon as the student is comfortable.',
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
  if (s.recap) rules.push('In the last two minutes, recap three key phrases from the lesson and write them in the chat with write_in_chat.')
  return rules
}
