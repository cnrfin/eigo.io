/**
 * Slide templates and factories. Templates are starting points only: once a
 * slide is created its blocks can be moved, resized, edited, added or removed.
 */
import {
  SLIDE_SCHEMA_VERSION,
  type Block,
  type BlockType,
  type Course,
  type Frame,
  type Lesson,
  type SectionColor,
  type Slide,
  type Unit,
} from './types'

/** Stage size in px. Fonts and spacing in the renderer are authored against this. */
/** 4:3 — a slightly wide square that sits well beside the lesson video. */
export const STAGE_W = 1280
export const STAGE_H = 960
/** Top of the content area below the header band, in % of stage height. */
export const CONTENT_TOP = 14

export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return prefix ? `${prefix}_${rand}` : rand
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'course'
  )
}

const f = (x: number, y: number, w: number, h: number): Frame => ({ x, y, w, h })

/** A block of the given type with sensible defaults. */
export function createBlock(type: BlockType, frame: Frame = f(30, 35, 40, 30)): Block {
  const id = uid('b')
  switch (type) {
    case 'heading':
      return { id, type, frame, text: 'Heading', size: 'lg', align: 'left' }
    case 'text':
      return { id, type, frame, text: 'Write something here. Use **bold** for key words.', size: 'md', align: 'left', tone: 'plain' }
    case 'list':
      return { id, type, frame, items: ['First item', 'Second item', 'Third item'], style: 'numbered', size: 'md', tone: 'plain', gap: 38 }
    case 'image':
      return { id, type, frame, src: '', alt: '', fit: 'cover', rounded: true }
    case 'vocab':
      return {
        id,
        type,
        frame,
        items: [
          { id: uid('v'), term: 'word', pos: 'noun', meaning: 'meaning', ja: '意味', example: 'An example sentence.' },
        ],
        columns: 1,
        showMeaning: true,
        showJa: true,
        showExample: true,
      }
    case 'dialogue':
      return {
        id,
        type,
        frame,
        size: 'md',
        lines: [
          { speaker: 'Aki', text: 'Hi! How was your weekend?' },
          { speaker: 'Sam', text: 'Great, thanks. I went on a **road trip**.' },
        ],
      }
    case 'callout':
      return { id, type, frame, title: 'Tip', text: 'A short note or rule.', tone: 'accent' }
    case 'media':
      return { id, type, frame, kind: 'video', src: '', loop: true, fit: 'cover', rounded: true }
    case 'phrases':
      return { id, type, frame, title: 'Useful phrases', items: ['Nice to meet you.', 'How about you?', 'Would you like…?'] }
    case 'truefalse':
      return {
        id,
        type,
        frame,
        items: [
          { text: 'A first statement.', answer: true, why: '' },
          { text: 'A second statement.', answer: false, why: 'Why it is false.' },
        ],
      }
    case 'match':
      return {
        id,
        type,
        frame,
        pairs: [
          { id: uid('m'), term: 'a word', image: '' },
          { id: uid('m'), term: 'a word', image: '' },
          { id: uid('m'), term: 'a word', image: '' },
          { id: uid('m'), term: 'a word', image: '' },
        ],
      }
  }
}

export interface TemplateDef {
  id: string
  name: string
  description: string
  color: SectionColor
  build: () => Pick<Slide, 'header' | 'background' | 'blocks'>
}

// Layouts follow the finished Great Britain for Beginners Unit 1 Lesson 1 (Connor’s edits).
const T = <K extends Block['type']>(type: K, frame: Frame, extra: Partial<Extract<Block, { type: K }>> = {}) =>
  ({ ...(createBlock(type, frame) as Extract<Block, { type: K }>), ...extra }) as Block

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'cover',
    name: 'Cover',
    description: 'Unit label, lesson title, today’s goal and a tall image',
    color: 'teal',
    build: () => ({
      header: null,
      background: 'white',
      blocks: [
        T('text', f(6, 22, 50, 6), { text: 'Unit 1 · Topic · Lesson 1', size: 'sm', tone: 'muted' }),
        T('heading', f(6, 27, 50, 26), { text: 'Lesson title', size: 'xl' }),
        T('text', f(6, 56, 48, 22), { text: 'Today’s goal: …', size: 'md', tone: 'plain' }),
        createBlock('image', f(60, 8, 34, 84)),
      ],
    }),
  },
  {
    id: 'warmup',
    name: 'Warm-up',
    description: 'Instruction, warm-up questions and a wide image',
    color: 'teal',
    build: () => ({
      header: { label: 'Warm-up', title: "Let's get started!", color: 'teal' },
      background: 'white',
      blocks: [
        T('text', f(5, 14, 90, 6), { text: 'Talk with your teacher.', size: 'md', tone: 'muted' }),
        T('list', f(5, 25.5, 90, 22.5), { items: ['Question one?', 'Question two?', 'Question three?'] }),
        createBlock('image', f(5, 53.5, 90, 40)),
      ],
    }),
  },
  {
    id: 'lookguess',
    name: 'Watch and describe',
    description: 'A short animated scene (video): the student describes it, then two questions',
    color: 'teal',
    build: () => ({
      header: { label: 'Warm-up', title: 'Watch and describe', color: 'teal' },
      background: 'white',
      blocks: [
        T('media', f(5, 15, 90, 52), { kind: 'video', loop: true }),
        T('list', f(5, 71, 90, 24), { items: ['What does she do?', 'How does she feel? How do you know?'] }),
      ],
    }),
  },
  {
    id: 'dialogue',
    name: 'Dialogue',
    description: 'A scene line naming the speakers, then the conversation',
    color: 'pink',
    build: () => ({
      header: { label: 'Story', title: 'Dialogue title', color: 'pink' },
      background: 'white',
      blocks: [
        T('text', f(5, 14, 90, 6), { text: 'Where and when it happens. Name every speaker.', size: 'sm', tone: 'muted' }),
        createBlock('dialogue', f(13.25, 20, 73.5, 76)),
      ],
    }),
  },
  {
    id: 'check',
    name: 'Comprehension check',
    description: 'Questions about the dialogue with teacher-only answers',
    color: 'teal',
    build: () => ({
      header: { label: 'Story', title: 'Did you understand?', color: 'teal' },
      background: 'white',
      blocks: [
        T('list', f(5, 18, 90, 32), { items: ['Question one?', 'Question two?', 'Question three?', 'Question four?'] }),
        T('callout', f(5, 62, 90, 30), { title: 'Answers', text: '1. …  2. …  3. …  4. …', tone: 'neutral', tutorOnly: true }),
      ],
    }),
  },
  {
    id: 'vocabulary',
    name: 'Vocabulary',
    description: 'Up to four words: word, type, Japanese and meaning',
    color: 'blue',
    build: () => ({
      header: { label: 'Vocabulary', title: 'Key words (1/2)', color: 'blue' },
      background: 'white',
      blocks: [
        T('vocab', f(5, 14, 90, 82), {
          columns: 2,
          items: [
            { id: uid('v'), term: 'a word', pos: 'noun', meaning: 'what it means, in simple English', ja: '意味', example: 'An example sentence.' },
            { id: uid('v'), term: 'a word', pos: 'verb', meaning: 'what it means, in simple English', ja: '意味', example: 'An example sentence.' },
          ],
        }),
      ],
    }),
  },
  {
    id: 'culture',
    name: 'Culture note',
    description: 'A couple of words and a short explanation',
    color: 'teal',
    build: () => ({
      header: { label: 'Culture', title: 'Culture note', color: 'teal' },
      background: 'white',
      blocks: [
        T('vocab', f(5, 18.5, 90, 31.5), {
          columns: 2,
          items: [{ id: uid('v'), term: 'a word', pos: 'noun', meaning: 'what it means', ja: '意味', example: 'An example sentence.' }],
        }),
        T('callout', f(5, 56.5, 90, 36), { title: 'Why?', text: 'A short explanation in simple English.', tone: 'accent' }),
      ],
    }),
  },
  {
    id: 'grammar',
    name: 'Language focus',
    description: 'One-line intro, the pattern, and examples from the story',
    color: 'purple',
    build: () => ({
      header: { label: 'Language focus', title: 'Language focus', color: 'purple' },
      background: 'white',
      blocks: [
        T('text', f(5, 14, 90, 4.5), { text: 'One sentence saying what this is for.', size: 'sm', tone: 'muted' }),
        T('callout', f(5, 21.5, 90, 48), {
          title: 'The pattern',
          text: '__First part__\n\nAn example with **target language** in bold.\n\n__Second part__\n\nAnother example.\n\n__Irregular__\n\ngood → **better**',
          tone: 'accent',
        }),
        T('list', f(5, 72.5, 90, 23.5), { title: 'From the story', style: 'bulleted', gap: 12, items: ['Example from the dialogue.', 'Another example.'] }),
      ],
    }),
  },
  {
    id: 'practice',
    name: 'Practice',
    description: 'Up to six one-line items with teacher-only answers',
    color: 'purple',
    build: () => ({
      header: { label: 'Practice', title: 'Practice', color: 'purple' },
      background: 'white',
      blocks: [
        T('list', f(5, 17.5, 56, 50), { items: ['Item one → ____', 'Item two → ____', 'Item three → ____'] }),
        T('callout', f(64, 13, 31, 82), { title: 'Answers', text: '1. …\n2. …\n3. …', tone: 'neutral', tutorOnly: true }),
      ],
    }),
  },
  {
    id: 'pronunciation',
    name: 'Pronunciation',
    description: 'How it sounds (respelling) and lines to repeat',
    color: 'teal',
    build: () => ({
      header: { label: 'Pronunciation', title: 'Sounding natural', color: 'teal' },
      background: 'white',
      blocks: [
        T('callout', f(5, 16.5, 90, 30), { title: 'How it sounds', text: 'Nice to meet you → nice ta **MEE**-choo', tone: 'accent' }),
        T('list', f(5, 50, 90, 37.5), { title: 'Say it with your teacher', style: 'bulleted', items: ['Line one.', 'Line two.', 'Line three.'] }),
      ],
    }),
  },
  {
    id: 'roleplay',
    name: 'Role play',
    description: 'Two role cards and useful phrases',
    color: 'green',
    build: () => ({
      header: { label: 'Role play', title: 'Your turn', color: 'green' },
      background: 'white',
      blocks: [
        T('callout', f(5, 14, 43, 51), { title: 'Student', text: 'The student’s role and goal.' }),
        T('callout', f(52, 14, 43, 51), { title: 'Teacher', text: 'The teacher’s role.', tone: 'neutral' }),
        T('phrases', f(5, 68, 90, 28), { items: ['Phrase one…', 'Phrase two…', 'Phrase three…'] }),
      ],
    }),
  },
  {
    id: 'reading',
    name: 'Reading',
    description: 'A tall image beside a reading passage',
    color: 'purple',
    build: () => ({
      header: { label: 'Reading', title: 'Read with your teacher', color: 'purple' },
      background: 'white',
      blocks: [
        createBlock('image', f(5, 16, 37.5, 80)),
        T('text', f(45, 16, 50, 80), { text: 'Reading passage (about 120 words, one topic).\n\nUse **bold** for target vocabulary.', size: 'md' }),
      ],
    }),
  },
  {
    id: 'listening',
    name: 'Listening',
    description: 'A short audio clip (10 seconds max), questions, and teacher-only answers and transcript',
    color: 'teal',
    build: () => ({
      header: { label: 'Listening', title: 'Listen', color: 'teal' },
      background: 'white',
      blocks: [
        T('text', f(5, 14, 90, 6), { text: 'Where are we? Who is speaking? Listen and answer.', size: 'sm', tone: 'muted' }),
        T('media', f(5, 22, 90, 13), { kind: 'audio', loop: false, label: 'Clip title' }),
        T('list', f(5, 40, 90, 28), { items: ['Question one?', 'Question two?', 'Question three?'] }),
        T('callout', f(5, 71, 43, 25), { title: 'Answers', text: '1. …  2. …  3. …', tone: 'neutral', tutorOnly: true }),
        T('callout', f(52, 71, 43, 25), { title: 'Transcript', text: 'What the speaker says.', tone: 'neutral', tutorOnly: true }),
      ],
    }),
  },
  {
    id: 'truefalse',
    name: 'True or false',
    description: 'Four statements with teacher-only answers',
    color: 'teal',
    build: () => ({
      header: { label: 'Reading', title: 'True or false?', color: 'teal' },
      background: 'white',
      blocks: [
        T('list', f(5, 19.5, 90, 40), { items: ['Statement one.', 'Statement two.', 'Statement three.', 'Statement four.'] }),
        T('callout', f(5, 61.5, 90, 30), { title: 'Answers', text: '1. …  2. …  3. …  4. …', tone: 'neutral', tutorOnly: true }),
      ],
    }),
  },
  {
    id: 'discussion',
    name: 'Discussion',
    description: 'A wide image and discussion questions',
    color: 'amber',
    build: () => ({
      header: { label: 'Discussion', title: 'What do you think?', color: 'amber' },
      background: 'white',
      blocks: [
        createBlock('image', f(5, 15, 90, 35)),
        T('list', f(5, 54, 90, 37), { items: ['Question one?', 'Question two?', 'Question three?', 'Question four?'] }),
      ],
    }),
  },
  {
    id: 'wrapup',
    name: 'Wrap-up',
    description: 'What the student achieved today',
    color: 'teal',
    build: () => ({
      header: { label: 'Wrap-up', title: 'Well done!', color: 'teal' },
      background: 'white',
      blocks: [
        T('list', f(5, 20, 50, 73.5), { title: 'Today you:', style: 'check', items: ['did one thing', 'did another thing', 'learned something'] }),
        createBlock('image', f(59, 12.5, 36, 82)),
      ],
    }),
  },
  {
    id: 'extra',
    name: 'Extra practice',
    description: 'Additional questions or homework',
    color: 'grey',
    build: () => ({
      header: { label: 'Extra practice', title: 'More practice', color: 'grey' },
      background: 'white',
      blocks: [T('list', f(5, 17.5, 90, 70), { items: ['Practice one.', 'Practice two.', 'Practice three.'] })],
    }),
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Header only — add your own blocks',
    color: 'grey',
    build: () => ({
      header: { label: '', title: 'Untitled slide', color: 'grey' },
      background: 'white',
      blocks: [],
    }),
  },
]

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1]
}

export function createSlide(templateId: string): Slide {
  const t = getTemplate(templateId)
  return { id: uid('s'), template: t.id, tutorNotes: '', ...t.build() }
}

export function createLesson(title = 'New lesson'): Lesson {
  return { id: uid('l'), title, objective: '', slides: [createSlide('cover')] }
}

export function createUnit(title = 'Unit 1'): Unit {
  return { id: uid('u'), title, lessons: [createLesson('Lesson 1')] }
}

export function createCourse(title = 'Untitled course'): Course {
  const now = new Date().toISOString()
  return {
    schemaVersion: SLIDE_SCHEMA_VERSION,
    id: uid('c'),
    slug: slugify(title),
    title,
    titleJa: '',
    description: '',
    level: '',
    category: '',
    coverImage: '',
    units: [createUnit()],
    createdAt: now,
    updatedAt: now,
  }
}

/** Deep copy with fresh ids (for duplicating slides / blocks). */
export function cloneSlide(slide: Slide): Slide {
  const copy = JSON.parse(JSON.stringify(slide)) as Slide
  copy.id = uid('s')
  copy.blocks = copy.blocks.map((b) => ({ ...b, id: uid('b') }))
  for (const b of copy.blocks) if (b.type === 'vocab') for (const it of b.items) it.id = uid('v')
  return copy
}

export function cloneBlock(block: Block): Block {
  const copy = JSON.parse(JSON.stringify(block)) as Block
  copy.id = uid('b')
  copy.frame = { ...copy.frame, x: Math.min(copy.frame.x + 2, 100 - copy.frame.w), y: Math.min(copy.frame.y + 2, 100 - copy.frame.h) }
  if (copy.type === 'vocab') for (const it of copy.items) it.id = uid('v')
  return copy
}
