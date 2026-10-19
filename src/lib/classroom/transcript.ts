/**
 * AI lessons: one lesson's transcript (bookings.transcript_text) is made of its sessions (reconnects make new ones),
 * each after a "[session <id>]" marker. A save replaces its own session's text and keeps the earlier sessions'.
 */
export function mergeTranscript(prev: string, sessionId: string | null, text: string): string {
  const marker = sessionId ? `\n[session ${sessionId}]\n` : '\n'
  // (the first session's marker is at the very start, without the newline before it: it wasn't found, and every
  // save added the whole transcript again)
  const at = sessionId ? prev.indexOf(marker.trim()) : -1
  // (cut with the newline before it, or every save of a later session added another blank line)
  const before = at >= 0 ? prev.slice(0, at).replace(/\n+$/, '') : prev
  return text ? `${before}${marker}${text}`.trim() : prev
}
