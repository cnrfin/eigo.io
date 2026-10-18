/**
 * Closing the course by voice (AI classroom). Pure, so it's easy to test.
 *
 * Two ways in, so neither depends on one exact phrase landing:
 *  - the student's own words act at once: "could we close this course?", "can we just chat?", "コースを閉じて"
 *  - the AI tutor's statements: "I'll close the course now", "we're out of the course", "back to free talk".
 *    Checked over the tutor's whole stretch of speech (AiRoom joins it up again when the student talks over it,
 *    which used to split "I'll close | the course now" and lose it). Its questions never act.
 */

const NEG = /\b(?:don'?t|do not|never|not yet|no need to|shouldn'?t)\b|閉じないで|やめないで/i

/** the student asks for the course to go away */
const STUDENT_CLOSE = [
  /\b(?:close|exit|hide|put away)\b(?:\s+\w+){0,3}?\s+(?:the\s+|this\s+|that\s+|our\s+)?(?:course|lesson|slides?)\b/i,
  /\b(?:stop|leave|quit)\b(?:\s+\w+){0,2}?\s+(?:the\s+|this\s+|that\s+)?(?:course|slides?)\b/i,
  /\b(?:switch|go|change|move)\s+(?:back\s+)?to\s+free\s*talk\b/i,
  /\bfree\s*talk\s+(?:please|instead|now)\b/i,
  /\b(?:let'?s|can we|could we|shall we|i'?d like to|i want to|i wanna)\s+(?:do\s+|have\s+|go\s+(?:back\s+)?to\s+)?(?:some\s+)?free\s*talk\b/i,
  /\b(?:can|could|shall)\s+we\s+just\s+(?:chat|talk)\b|\blet'?s\s+just\s+(?:chat|talk)\b/i,
  /(?:コース|スライド).{0,5}(?:閉じ|とじ|消し|けし|終わり|おわり|やめ|止め)/,
  /フリートーク(?:に|で|が|へ)/,
]
export function studentClosesCourse(text: string): boolean {
  const s = text.trim()
  if (!s || NEG.test(s)) return false
  return STUDENT_CLOSE.some((re) => re.test(s))
}

/** the AI tutor says the course is (being) closed. Statements only. */
const TUTOR_CLOSE = [
  /\b(?:I'll|I will|let me|let's|let us|we'll|I'm going to|I am going to|I've|I have|I just)\s+(?:close|closed|stop|stopped|put away|exit|exited)\s+(?:the|this|our|that)?\s*(?:course|lesson|slides)\b/i,
  /\b(?:closing|closed)\s+(?:the|this|our)\s+(?:course|slides)\b/i,
  /\b(?:we're|we are|we're now|we are now)\s+out of\s+the\s+(?:course|lesson|slides)\b/i,
  /\b(?:switch|move|go|change|back)\s+(?:over\s+)?to\s+free\s+talk\b/i,
  /\blet's just (?:chat|talk)\b/i,
]
export function tutorClosesCourse(sentence: string): boolean {
  const s = sentence.trim()
  if (!s || /\?\s*$/.test(s) || NEG.test(s)) return false
  return TUTOR_CLOSE.some((re) => re.test(s))
}

/**
 * The student asks for a course to open (only used in free talk): "could we open the course again?", "let's do the
 * course", "can we go back to the lesson?", "コースを開いて". Role-plays and "close" never count.
 */
const STUDENT_OPEN = [
  /\b(?:open|do|start|continue|resume|show|bring back|pick up|go back to|get back to|back to|return to)\b(?:\s+\w+){0,2}?\s+(?:the\s+|my\s+|our\s+|this\s+|that\s+|a\s+)?(?:course|lesson|slides)\b/i,
  /(?:コース|レッスン|スライド).{0,5}(?:開|ひら|やり|始め|はじめ|戻|もど|続け|つづけ|見せ|みせ)/,
]
export function studentOpensCourse(text: string): boolean {
  const s = text.trim()
  if (!s || NEG.test(s) || /\brole[- ]?plays?\b|ロールプレイ/i.test(s) || studentClosesCourse(s)) return false
  return STUDENT_OPEN.some((re) => re.test(s))
}
