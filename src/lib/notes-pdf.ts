import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import subsetFont from 'subset-font'
import { formatNoteDate, noteLabel, noteTitle, type LessonNote } from '@/lib/lesson-notes'

/**
 * Lay out lesson notes as an A4 PDF, one note per page (long notes continue onto more pages).
 * `font` is a TrueType font that covers Japanese (Noto Sans JP Regular); it is subset per file.
 */
const A4: [number, number] = [595.28, 841.89]
const MARGIN = 56
const INK = rgb(0.08, 0.08, 0.09)
const MUTED = rgb(0.45, 0.46, 0.49)
const RULE = rgb(0.88, 0.88, 0.9)

export async function renderNotesPdf(notes: LessonNote[], locale: string, font: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  // Cut the font down to the characters this file uses (HarfBuzz), then embed that small font
  // whole: pdf-lib's own subsetting drops glyphs from Noto Sans JP.
  const text = notes.map((n) => [noteLabel(n), formatNoteDate(n.date, locale), noteTitle(n), n.body].join('\n')).join('\n')
  const used = await subsetFont(Buffer.from(font), text + ' ·', { targetFormat: 'truetype' })
  // fontkit's default shaping applies 'locl', which swaps Noto Sans JP's digits for alternates that
  // come out full-width in the PDF; the font's default glyphs are already the Japanese forms.
  const jp = await doc.embedFont(used, { subset: false, features: { locl: false } })
  doc.setTitle(notes.length === 1 ? noteTitle(notes[0]) : 'eigo.io notes')
  doc.setCreator('eigo.io')

  const width = A4[0] - MARGIN * 2
  for (const n of notes) {
    let page = doc.addPage(A4)
    let y = A4[1] - MARGIN
    const write = (text: string, size: number, color = INK, lineHeight = size * 1.75) => {
      for (const line of wrap(text, jp, size, width)) {
        if (y - lineHeight < MARGIN) { page = doc.addPage(A4); y = A4[1] - MARGIN }
        y -= lineHeight
        if (line) page.drawText(line, { x: MARGIN, y: y + (lineHeight - size) / 2, size, font: jp, color })
      }
    }
    const label = [noteLabel(n), formatNoteDate(n.date, locale)].filter(Boolean).join('  ·  ')
    write(label, 10, MUTED, 16)
    y -= 2
    write(noteTitle(n), 20, INK, 28)
    y -= 12
    rule(page, y)
    y -= 14
    for (const para of n.body.replace(/\r\n?/g, '\n').split('\n')) write(para, 11.5)
  }
  return doc.save()
}

function rule(page: PDFPage, y: number) {
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.6, color: RULE })
}

// ── line breaking for mixed English / Japanese ──
// Tokens: Latin words (break at spaces), single CJK characters (break anywhere), spaces.
// Closing punctuation sticks to the token before it and opening brackets to the token after,
// so a line never starts with 。」）、 or ends with 「（.
const CLOSE = '、。，．・：；？！ー」』）】〕〉》ゝゞぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々〻)]}.,:;!?%'
const OPEN = '「『（【〔〈《([{'
const CJK = /[　-ヿ㐀-鿿豈-﫿＀-￯]/

function tokens(text: string): string[] {
  const out: string[] = []
  let word = ''
  const flush = () => { if (word) { out.push(word); word = '' } }
  for (const ch of text) {
    if (ch === ' ' || ch === '\t') { flush(); out.push(' ') }
    else if (CJK.test(ch)) { flush(); out.push(ch) }
    else word += ch
  }
  flush()
  // glue punctuation
  const glued: string[] = []
  for (const t of out) {
    const prev = glued[glued.length - 1]
    if (prev !== undefined && prev !== ' ' && CLOSE.includes(t[0])) glued[glued.length - 1] = prev + t
    else if (prev !== undefined && prev !== ' ' && OPEN.includes(prev[prev.length - 1])) glued[glued.length - 1] = prev + t
    else glued.push(t)
  }
  return glued
}

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  if (!text.trim()) return ['']
  const lines: string[] = []
  let line = ''
  const w = (s: string) => font.widthOfTextAtSize(s, size)
  for (const tok of tokens(text)) {
    if (tok === ' ' && !line) continue
    if (w(line + tok) <= max) { line += tok; continue }
    if (line.trim()) lines.push(line.trimEnd())
    line = tok === ' ' ? '' : tok
    // a single token wider than the line (a very long URL): hard-split it
    while (w(line) > max) {
      let cut = line.length - 1
      while (cut > 1 && w(line.slice(0, cut)) > max) cut--
      lines.push(line.slice(0, cut))
      line = line.slice(cut)
    }
  }
  if (line.trim()) lines.push(line.trimEnd())
  return lines
}
