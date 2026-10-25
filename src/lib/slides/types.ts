/**
 * eigo slide format — shared by the course studio (studio/) and the eigo.io
 * lesson page. Keep this file framework-free: no Next.js, no Node, no DOM.
 *
 * A course is plain JSON. Slides are a fixed 4:3 stage (1280×960); every block is
 * positioned with a frame in PERCENT of that stage, so a slide looks identical
 * at any size. Image `src` values are relative to the course's asset base
 * (e.g. "images/beach.jpg") and resolved by the renderer's `assetBase` prop.
 */

export const SLIDE_SCHEMA_VERSION = 1

export type CefrLevel = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** Position + size in percent of the slide stage (0–100). */
export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

export type TextSize = 'sm' | 'md' | 'lg' | 'xl'
export type Align = 'left' | 'center' | 'right'
/** Visual treatment of a text-like block. */
export type Tone = 'plain' | 'panel' | 'accent' | 'muted'

interface BlockBase {
  id: string
  frame: Frame
  /** Visible to the teacher only (answers, prompts, instructions). */
  tutorOnly?: boolean
  /** Hidden from the student until someone taps "Show" (guess first, then reveal). */
  reveal?: boolean
}

export interface HeadingBlock extends BlockBase {
  type: 'heading'
  text: string
  size: TextSize
  align: Align
}

export interface TextBlock extends BlockBase {
  type: 'text'
  /** Supports **bold** and line breaks. */
  text: string
  size: TextSize
  align: Align
  tone: Tone
}

export interface ListBlock extends BlockBase {
  type: 'list'
  title?: string
  items: string[]
  style: 'numbered' | 'bulleted' | 'check'
  size: TextSize
  tone: Tone
  /** Space between items in stage px. Unset = default (18). */
  gap?: number
}

export interface ImageBlock extends BlockBase {
  type: 'image'
  src: string
  alt: string
  fit: 'cover' | 'contain'
  credit?: string
  rounded: boolean
  /** Which part of the picture shows in the frame (Fill only). x/y are 0–100 (50 = centre); zoom ≥ 1. */
  crop?: ImageCrop  /** Fade one edge out so the picture blends into the slide. size = how far the fade reaches, in % of the picture (5–90). */
  fade?: ImageFade
}

export interface ImageFade {
  edge: 'left' | 'right' | 'top' | 'bottom'
  size: number
}

export interface ImageCrop {
  x: number
  y: number
  zoom: number
}

export interface VocabItem {
  /** Stable id, so a student’s “save to my cards” can point back to this word. */
  id?: string
  term: string
  /** Word type shown under the word, e.g. "noun", "adjective", "phrase". */
  pos?: string
  meaning?: string
  /** Japanese gloss. */
  ja?: string
  example?: string
}

export interface VocabBlock extends BlockBase {
  type: 'vocab'
  items: VocabItem[]
  /** Legacy (card layout). The table layout ignores it. */
  columns: 1 | 2
  showMeaning: boolean
  showJa: boolean
  showExample: boolean
}

export interface DialogueLine {
  speaker: string
  text: string
}

export interface DialogueBlock extends BlockBase {
  type: 'dialogue'
  lines: DialogueLine[]
  size: TextSize
}

export interface CalloutBlock extends BlockBase {
  type: 'callout'
  title?: string
  text: string
  tone: 'accent' | 'warning' | 'neutral' | 'ink'
  /** Use this character's speech-bubble colour instead of the tone (e.g. on a characters slide). */
  character?: string
}

/** Short phrases shown as a grid of pills, e.g. role-play “Useful phrases”. */
export interface PhrasesBlock extends BlockBase {
  type: 'phrases'
  title?: string
  /** Supports **bold**. */
  items: string[]
}

/**
 * A short video or audio clip with play/pause controls.
 * Video: animated scenes (e.g. watch and describe). Audio: listening clips (10 seconds or less).
 */
export interface MediaBlock extends BlockBase {
  type: 'media'
  kind: 'video' | 'audio'
  /** Relative asset path, e.g. "images/l1-lookguess.mp4". */
  src: string
  /** Optional still image shown before the video plays. */
  poster?: string
  /** Start again automatically at the end (good for silent animated scenes). */
  loop: boolean
  /** Label shown on the audio player, e.g. "Gwen’s voicemail". */
  label?: string
  /** What is said in the clip (teacher reference; not shown to students). */
  transcript?: string
  fit: 'cover' | 'contain'
  rounded: boolean
  /** Video only: start playing (muted) as soon as the slide opens. */
  autoplay?: boolean
  /** Studio only: prompt for generating the video's start frame as an image. */
  imagePrompt?: string
  /** Studio only: prompt for animating the start frame (image-to-video). */
  videoPrompt?: string
}

export interface TrueFalseItem {
  /** The statement. Supports **bold**. */
  text: string
  answer: boolean
  /** Short reason, e.g. "Rent in London is very expensive." Teacher only. */
  why?: string
}

/**
 * True/false statements, answered one at a time. Teacher and student can both
 * answer; the result shows as a toast in the live room. `why` is teacher only.
 */
export interface TrueFalseBlock extends BlockBase {
  type: 'truefalse'
  items: TrueFalseItem[]
}

export interface MatchPair {
  id?: string
  term: string
  /** Relative asset path. Empty = picture not added yet. */
  image: string
  alt?: string
}

/**
 * Tap a word, then its picture. Concrete words only; use sparingly
 * (about once per unit, e.g. a vocabulary recap).
 */
export interface MatchBlock extends BlockBase {
  type: 'match'
  pairs: MatchPair[]
}

/* ---------- Interactive blocks for practice (pronunciation and beyond) ---------- */

export interface ListenOption {
  /** A word, a syllable ("ho", "tel") or "↗ / ↘". */
  text?: string
  /** Relative asset path: a picture to tap instead of a word. */
  image?: string
  alt?: string
}

export interface ListenItem {
  /** Relative asset path of the clip. Empty = the tutor says it (the tutor sees what to say). */
  audio: string
  options: ListenOption[]
  /** Index of the right option. */
  answer: number
  /** What the clip says, e.g. a whole sentence (teacher view, and shown to the student after they answer). */
  says?: string
}

/**
 * Listen and choose: a clip plays (or the tutor says it), the student taps what they heard. One item at a
 * time, with a score at the end. Words, syllables (which part is strong?), pictures or intonation arrows.
 */
export interface ListenBlock extends BlockBase {
  type: 'listen'
  items: ListenItem[]
  /** How many times the student may replay a clip (0 = no limit). */
  replays: number
}

export interface RepeatItem {
  text: string
  /** Clips in the course voices (relative asset paths). */
  audio?: { ukF?: string; ukM?: string; usF?: string; usM?: string }
  /** Simple respelling shown on tap, e.g. "nice ta MEE-choo". */
  respell?: string
}

/** Model and repeat: word or phrase cards with play buttons in UK/US voices; the tutor marks each one. */
export interface RepeatBlock extends BlockBase {
  type: 'repeat'
  items: RepeatItem[]
}

/**
 * "Did you get it?": the student secretly picks one word of a pair and says it; the tutor says what it heard;
 * then the pick is revealed and a point is scored if they match. The pick stays hidden from the tutor until then.
 */
export interface SayMatchBlock extends BlockBase {
  type: 'saymatch'
  pairs: { a: string; b: string }[]
  rounds: number
}

/** A speaking task: question, optional sentence starters, an example answer hidden until tapped, and goals to tick. */
export interface PromptBlock extends BlockBase {
  type: 'prompt'
  text: string
  starters?: string[]
  /** Example answer (hidden from the student until tapped). */
  model?: string
  /** Things to do in a role-play or task; tapped off as they happen. */
  goals?: string[]
}

/** Personal gap-fill: phrase frames with gaps (…) the student fills with their own details, then can save. */
export interface GapFillBlock extends BlockBase {
  type: 'gapfill'
  /** One frame per line; "…" marks each gap. */
  lines: string[]
}

/** A countdown for races and timed tasks. */
export interface TimerBlock extends BlockBase {
  type: 'timer'
  seconds: number
  label?: string
}

/** Today's goal, and at the end of the lesson the student's own rating: ✓ / with help / not yet. */
export interface CanDoBlock extends BlockBase {
  type: 'cando'
  goal: string
  /** e.g. "Lesson 4 of 14" */
  progress?: string
  /** Show the rating buttons (on the wrap-up). */
  rate: boolean
}

export type Block =
  | HeadingBlock
  | TextBlock
  | ListBlock
  | ImageBlock
  | VocabBlock
  | DialogueBlock
  | CalloutBlock
  | PhrasesBlock
  | MediaBlock
  | TrueFalseBlock
  | MatchBlock
  | ListenBlock
  | RepeatBlock
  | SayMatchBlock
  | PromptBlock
  | GapFillBlock
  | TimerBlock
  | CanDoBlock

export type BlockType = Block['type']

/** Section colour used for the header chip — mirrors the eigo category palette. */
export type SectionColor = 'teal' | 'blue' | 'pink' | 'amber' | 'purple' | 'green' | 'grey'

export interface SlideHeader {
  /** Small chip, e.g. "Warm-up". Empty hides the chip. */
  label: string
  title: string
  color: SectionColor
}

export interface Slide {
  id: string
  /** Template the slide was created from (informational; blocks are the truth). */
  template: string
  /** null = no header band (e.g. cover slides). */
  header: SlideHeader | null
  background: 'white' | 'tint' | 'accent'
  blocks: Block[]
  /** Private notes for the teacher, shown beside the slide in teacher view. */
  tutorNotes: string
  /** Show the whole slide in black and white (e.g. a story flashback). */
  flashback?: boolean
}

export interface Lesson {
  id: string
  title: string
  objective: string
  slides: Slide[]
}

export interface Unit {
  id: string
  title: string
  lessons: Lesson[]
}

/** A recurring character. Dialogue lines whose speaker matches `name`
 * (case-insensitive) show this avatar picture. */
export interface Character {
  id: string
  name: string
  /** Relative asset path, e.g. "images/haruka.jpg". Empty = initial letter. */
  avatar: string
  /** Speech-bubble colour: index into BUBBLE_COLORS. Unset = picked from the name. */
  color?: number
}

export interface Course {
  schemaVersion: typeof SLIDE_SCHEMA_VERSION
  id: string
  /** URL-safe identifier, unique across courses. */
  slug: string
  title: string
  titleJa: string
  description: string
  level: CefrLevel | ''
  category: string
  /** Relative asset path, e.g. "images/cover.jpg". */
  coverImage: string
  /** Optional short looping video (relative asset path) that plays instead of the cover picture in the course picker. */
  reel?: string
  /** Japanese description shown in the booking course picker (optional). */
  descriptionJa?: string
  /** Series the course belongs to, e.g. "Great Britain" (one row per series in the picker). */
  series?: string
  /** 3–4 short topic chips for the picker, per language. */
  chips?: { ja: string[]; en: string[] }
  /** Order within the series (lower first). */
  sortOrder?: number
  /** The soft teal shapes framing every slide. Unset = shown (older courses); false = plain slides. */
  decor?: boolean
  /** Recurring characters (optional; older courses don't have it). */
  characters?: Character[]
  units: Unit[]
  createdAt: string
  updatedAt: string
}

/** Lightweight listing entry. */
export interface CourseSummary {
  id: string
  slug: string
  title: string
  level: CefrLevel | ''
  units: number
  lessons: number
  slides: number
  updatedAt: string
}
