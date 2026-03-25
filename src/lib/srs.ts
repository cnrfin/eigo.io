/**
 * Simplified SM-2 Spaced Repetition Algorithm
 *
 * After each review, the student rates their confidence:
 *   1 = "Again"   — Didn't know it, reset
 *   2 = "Hard"    — Remembered with difficulty
 *   3 = "Good"    — Remembered correctly
 *   4 = "Easy"    — Knew it instantly
 *
 * The algorithm adjusts:
 *   - interval_days: how many days until the next review
 *   - ease_factor: multiplier for interval growth (min 1.3)
 *   - comfort_level: derived from interval (learning < 7d, reviewing < 30d, mastered >= 30d)
 */

export type ReviewRating = 1 | 2 | 3 | 4

export type SRSUpdate = {
  interval_days: number
  ease_factor: number
  comfort_level: 'learning' | 'reviewing' | 'mastered'
  next_review_at: string // ISO timestamp
}

export function calculateNextReview(
  currentInterval: number,
  currentEase: number,
  rating: ReviewRating
): SRSUpdate {
  let newInterval: number
  let newEase: number

  switch (rating) {
    case 1: // Again — reset to start
      newInterval = 0.007 // ~10 minutes (for within same session)
      newEase = Math.max(1.3, currentEase - 0.2)
      break

    case 2: // Hard — small step forward, ease decreases slightly
      if (currentInterval < 1) {
        newInterval = 1
      } else {
        newInterval = Math.max(1, currentInterval * 1.2)
      }
      newEase = Math.max(1.3, currentEase - 0.15)
      break

    case 3: // Good — normal progression
      if (currentInterval < 1) {
        newInterval = 1
      } else if (currentInterval < 3) {
        newInterval = 3
      } else {
        newInterval = currentInterval * currentEase
      }
      newEase = currentEase // stays the same
      break

    case 4: // Easy — accelerated progression, ease increases
      if (currentInterval < 1) {
        newInterval = 3
      } else if (currentInterval < 3) {
        newInterval = 7
      } else {
        newInterval = currentInterval * currentEase * 1.3
      }
      newEase = currentEase + 0.15
      break
  }

  // Cap interval at 180 days
  newInterval = Math.min(180, newInterval)

  // Derive comfort level from interval
  let comfortLevel: SRSUpdate['comfort_level']
  if (newInterval < 7) {
    comfortLevel = 'learning'
  } else if (newInterval < 30) {
    comfortLevel = 'reviewing'
  } else {
    comfortLevel = 'mastered'
  }

  // Calculate next review timestamp
  const now = new Date()
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000)

  return {
    interval_days: Math.round(newInterval * 1000) / 1000, // 3 decimal places
    ease_factor: Math.round(newEase * 100) / 100,
    comfort_level: comfortLevel,
    next_review_at: nextReview.toISOString(),
  }
}

/**
 * Format the next review time as a human-readable string
 */
export function formatNextReview(nextReviewAt: string, locale: string): string {
  const now = new Date()
  const next = new Date(nextReviewAt)
  const diffMs = next.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / (1000 * 60))
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs <= 0) {
    return locale === 'ja' ? '復習可能' : 'Due now'
  }
  if (diffMins < 60) {
    return locale === 'ja' ? `${diffMins}分後` : `${diffMins}m`
  }
  if (diffHours < 24) {
    return locale === 'ja' ? `${diffHours}時間後` : `${diffHours}h`
  }
  if (diffDays === 1) {
    return locale === 'ja' ? '明日' : 'Tomorrow'
  }
  if (diffDays < 7) {
    return locale === 'ja' ? `${diffDays}日後` : `${diffDays}d`
  }
  if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7)
    return locale === 'ja' ? `${weeks}週間後` : `${weeks}w`
  }
  const months = Math.round(diffDays / 30)
  return locale === 'ja' ? `${months}ヶ月後` : `${months}mo`
}

/**
 * Preview what each rating would do (for showing in the UI)
 */
export function previewIntervals(
  currentInterval: number,
  currentEase: number
): { rating: ReviewRating; label_en: string; label_ja: string; preview_en: string; preview_ja: string }[] {
  return [
    { rating: 1 as ReviewRating, label_en: 'Again', label_ja: 'もう一度' },
    { rating: 2 as ReviewRating, label_en: 'Hard', label_ja: '難しい' },
    { rating: 3 as ReviewRating, label_en: 'Good', label_ja: '良い' },
    { rating: 4 as ReviewRating, label_en: 'Easy', label_ja: '簡単' },
  ].map(r => {
    const result = calculateNextReview(currentInterval, currentEase, r.rating)
    const previewEn = formatNextReview(result.next_review_at, 'en')
    const previewJa = formatNextReview(result.next_review_at, 'ja')
    return { ...r, preview_en: previewEn, preview_ja: previewJa }
  })
}
