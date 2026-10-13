/**
 * The AI tutor avatar's kaomoji expressions (design: mockups/ai-avatar-faces.html).
 * The face is picked from what the AI tutor is saying (simple word rules: free and instant)
 * and from what is happening in the lesson (the student speaking, the slide changing).
 */

export type Face =
  | 'calm'
  | 'listen'
  | 'happy'
  | 'delighted'
  | 'gentle'
  | 'curious'
  | 'thinking'
  | 'surprised'
  | 'oops'
  | 'wink'
  | 'proud'
  | 'waiting'

type Eye = 'dot' | 'caret' | 'chevL' | 'chevR' | 'line' | 'bar' | 'ring'
type Mouth = 'w' | 'tri' | 'triF' | 'o' | 'O' | 'line' | 'under' | 'wave' | 'eps'

export type FaceSpec = {
  /** left eye, mouth, right eye, mouth while talking (open), extra mark */
  eyes: [Eye, Eye]
  mouth: Mouth
  open: Mouth
  extra?: '?' | '…' | 'drop'
  /** head turn (radians): yaw + = to the right, pitch + = up; roll in degrees */
  pose?: [number, number]
  roll?: number
  /** where the eyes look, in face units (the face is 100 units wide), independent of the mouth */
  gaze?: [number, number]
}

export const FACES: Record<Face, FaceSpec> = {
  calm: { eyes: ['dot', 'dot'], mouth: 'w', open: 'o' },
  listen: { eyes: ['dot', 'dot'], mouth: 'line', open: 'o', pose: [-0.18, -0.1], gaze: [-3, 1.6] },
  happy: { eyes: ['caret', 'caret'], mouth: 'tri', open: 'triF' },
  delighted: { eyes: ['chevL', 'chevR'], mouth: 'tri', open: 'triF' },
  gentle: { eyes: ['caret', 'caret'], mouth: 'line', open: 'o', roll: -6 },
  curious: { eyes: ['dot', 'dot'], mouth: 'eps', open: 'o', extra: '?', pose: [0.14, 0.06], roll: 8, gaze: [1.6, -1] },
  thinking: { eyes: ['bar', 'bar'], mouth: 'wave', open: 'o', extra: '…', pose: [-0.12, 0.16], roll: -5, gaze: [-2.6, -3] },
  surprised: { eyes: ['ring', 'ring'], mouth: 'o', open: 'O', pose: [0, 0.1] },
  oops: { eyes: ['dot', 'dot'], mouth: 'under', open: 'o', extra: 'drop', pose: [0.2, -0.04], gaze: [3, 0.8] },
  wink: { eyes: ['caret', 'line'], mouth: 'tri', open: 'triF', roll: 4 },
  proud: { eyes: ['bar', 'bar'], mouth: 'tri', open: 'triF', pose: [0, 0.1], roll: -4, gaze: [0, -1] },
  waiting: { eyes: ['line', 'line'], mouth: 'w', open: 'o', pose: [0, -0.14], gaze: [-1.5, 2] },
}

const RULES: [RegExp, Face][] = [
  [/\b(perfect|well done|excellent|amazing|brilliant|fantastic|spot on)\b/i, 'delighted'],
  [/\b(sorry|my mistake|oops)\b/i, 'oops'],
  [/\b(you remembered|you got it)\b/i, 'proud'],
  [/\b(oh|wow|really\?|no way)\b/i, 'surprised'],
  [/\b(almost|nearly|try again|so close)\b/i, 'gentle'],
  [/\b(hmm|let me think|let's see|good question)\b/i, 'thinking'],
  [/\b(don't worry|just kidding|only joking)\b/i, 'wink'],
  [/\b(good|great|nice|lovely|yes|right|that's it)\b/i, 'happy'],
]

/**
 * The expression for the sentence the AI tutor is saying now (or null: keep the current one).
 * Pass the text of the current sentence; a question mark at its end means curious.
 */
export function faceForText(sentence: string): Face | null {
  for (const [re, face] of RULES) if (re.test(sentence)) return face
  if (/\?\s*$/.test(sentence)) return 'curious'
  return null
}

/**
 * What the classroom tells the avatar (a ref read every frame): the current expression and until when
 * to hold it, whether the student is speaking, and until when to look at the slide.
 */
export type AvatarMood = { face: Face; until: number; listening: boolean; slideUntil: number }
export const newMood = (): AvatarMood => ({ face: 'calm', until: 0, listening: false, slideUntil: 0 })
