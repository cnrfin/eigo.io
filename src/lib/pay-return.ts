/**
 * Google, Apple and LINE sign-in always land on /dashboard. When a student
 * signs in from a payment link, remember the link so the dashboard can send
 * them straight back to it. Kept for 30 minutes only.
 */

const KEY = 'eigo-pay-return'
const MAX_AGE_MS = 30 * 60 * 1000

export function savePayReturn(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }))
  } catch { /* storage blocked: they can reopen the link */ }
}

/** The saved path if it's recent, removing it either way. */
export function takePayReturn(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number }
    if (typeof path !== 'string' || !path.startsWith('/pay/') || !at || Date.now() - at > MAX_AGE_MS) return null
    return path
  } catch {
    return null
  }
}
