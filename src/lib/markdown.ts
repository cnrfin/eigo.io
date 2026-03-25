/**
 * Lightweight markdown-to-HTML converter for news body text.
 * Supports: **bold**, *italic*, [links](url), `code`, line breaks,
 * and unordered lists (- item or * item).
 * No dependencies.
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''

  const lines = text.split('\n')
  const blocks: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty lines: 1 blank line = normal paragraph gap (handled by CSS margin),
    // 2+ blank lines = extra visual spacing via a spacer div
    if (line.trim() === '') {
      let emptyCount = 0
      while (i < lines.length && lines[i].trim() === '') {
        emptyCount++
        i++
      }
      if (emptyCount >= 2) {
        blocks.push(`<div style="height:${(emptyCount - 1) * 0.5}em"></div>`)
      }
      continue
    }

    // List block: collect consecutive lines starting with - or *
    if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = []
      let trailingBlanks = 0
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        // Start a new list item
        let itemText = lines[i].replace(/^\s*[-*]\s/, '')
        i++
        // Collect continuation lines (non-empty, don't start with - or *, not a blank line)
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          !/^\s*[-*]\s/.test(lines[i])
        ) {
          itemText += '<br/>' + lines[i].trim()
          i++
        }
        items.push(`<li>${inlineFormat(itemText)}</li>`)
        // Count blank lines after this list item
        trailingBlanks = 0
        while (i < lines.length && lines[i].trim() === '') {
          trailingBlanks++
          i++
        }
        // If next line isn't a list item, break out of the list
        if (i < lines.length && !/^\s*[-*]\s/.test(lines[i])) break
      }
      blocks.push(`<ul>${items.join('')}</ul>`)
      // Emit spacer for blank lines after the list (already consumed above)
      if (trailingBlanks >= 2) {
        blocks.push(`<div style="height:${(trailingBlanks - 1) * 0.5}em"></div>`)
      }
      continue
    }

    // Paragraph block: collect consecutive non-empty, non-list lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*[-*]\s/.test(lines[i])
    ) {
      paraLines.push(inlineFormat(lines[i]))
      i++
    }
    blocks.push(`<p>${paraLines.join('<br/>')}</p>`)
  }

  return blocks.join('')
}

function inlineFormat(text: string): string {
  return text
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* (but not inside bold markers)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Inline code: `text`
    .replace(/`(.+?)`/g, '<code>$1</code>')
}
