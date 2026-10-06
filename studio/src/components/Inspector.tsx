import { useEffect, useRef, useState } from 'react'
import {
  characterColor,
  cloneBlock,
  uid,
  createBlock,
  getTemplate,
  type Align,
  type Block,
  type BlockType,
  type CalloutBlock,
  type Character,
  type DialogueBlock,
  type HeadingBlock,
  type ImageBlock,
  type ListBlock,
  type MatchBlock,
  type MediaBlock,
  type PhrasesBlock,
  type TextBlock,
  type TrueFalseBlock,
  type VocabBlock,
  type Course,
  type Slide,
  type TextSize,
  type Tone,
} from '@slides'
import { draftBlock, draftLesson, draftSlide, move, type LessonRef } from '../model'
import type { CourseEditor } from '../useCourseEditor'
import { Field, IconButton, NumberInput, Section, Segmented, Select, TextArea, TextInput, Toggle } from '../ui/fields'
import { IconCopy, IconDown, IconPlus, IconTrash, IconUp } from '../ui/icons'
import { ImageField } from './ImageField'
import { BubbleColorPicker } from './BubbleColorPicker'
import { MediaField } from './MediaField'

const SIZE_OPTS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
]
const ALIGN_OPTS: { value: Align; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
]
const TONE_OPTS: { value: Tone; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'muted', label: 'Muted' },
  { value: 'panel', label: 'Panel' },
  { value: 'accent', label: 'Accent' },
]
export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  list: 'List',
  image: 'Image',
  vocab: 'Vocabulary',
  dialogue: 'Dialogue',
  callout: 'Callout',
  phrases: 'Phrases',
  media: 'Video / audio',
  truefalse: 'True / false',
  match: 'Matching',
}

interface Props {
  course: Course
  editor: CourseEditor
  lessonRef: LessonRef
  slide: Slide | null
  block: Block | null
  onSelectBlock: (id: string | null) => void
}

export function Inspector({ course, editor, lessonRef, slide, block, onSelectBlock }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const lessonId = lessonRef.lesson.id

  // Double-clicking a block on the canvas focuses its first text field.
  useEffect(() => {
    const focus = () => rootRef.current?.querySelector<HTMLElement>('.insp-block textarea, .insp-block input.input')?.focus()
    window.addEventListener('studio:focus-inspector', focus)
    return () => window.removeEventListener('studio:focus-inspector', focus)
  }, [])

  const setLesson = (fn: (l: NonNullable<ReturnType<typeof draftLesson>>) => void, key: string) =>
    editor.update((d) => {
      const l = draftLesson(d, lessonId)
      if (l) fn(l)
    }, key)

  const setSlide = (fn: (s: Slide) => void, key?: string) =>
    slide &&
    editor.update((d) => {
      const s = draftSlide(d, lessonId, slide.id)
      if (s) fn(s)
    }, key)

  function setBlock<T extends Block>(fn: (b: T) => void, key?: string) {
    if (!slide || !block) return
    editor.update((d) => {
      const b = draftBlock(d, lessonId, slide.id, block.id)
      if (b) fn(b as T)
    }, key && `${block.id}:${key}`)
  }

  function addBlock(type: BlockType) {
    if (!slide) return
    const b = createBlock(type)
    setSlide((s) => void s.blocks.push(b))
    onSelectBlock(b.id)
  }

  return (
    <div className="inspector" ref={rootRef}>
      {block && slide ? (
        <BlockInspector
          key={block.id}
          courseId={course.id}
          block={block}
          setBlock={setBlock}
          characters={course.characters ?? []}
          onSetAvatar={(name, src) =>
            editor.update((d) => {
              const list = (d.characters ??= [])
              const key = name.trim().toLowerCase()
              const ch = list.find((c) => c.name.trim().toLowerCase() === key)
              if (ch) ch.avatar = src
              else list.push({ id: uid('ch'), name: name.trim(), avatar: src })
            })
          }
          onSetColor={(name, color) =>
            editor.update((d) => {
              const list = (d.characters ??= [])
              const key = name.trim().toLowerCase()
              const ch = list.find((c) => c.name.trim().toLowerCase() === key)
              if (ch) ch.color = color
              else list.push({ id: uid('ch'), name: name.trim(), avatar: '', color })
            })
          }
          onDuplicate={() => {
            const copy = cloneBlock(block)
            setSlide((s) => {
              const i = s.blocks.findIndex((b) => b.id === block.id)
              s.blocks.splice(i + 1, 0, copy)
            })
            onSelectBlock(copy.id)
          }}
          onDelete={() => {
            setSlide((s) => void (s.blocks = s.blocks.filter((b) => b.id !== block.id)))
            onSelectBlock(null)
          }}
          onLayer={(dir) =>
            setSlide((s) => {
              const i = s.blocks.findIndex((b) => b.id === block.id)
              move(s.blocks, i, dir === 'up' ? i + 1 : i - 1)
            })
          }
          onBack={() => onSelectBlock(null)}
        />
      ) : null}

      {!block && slide ? (
        <>
          <Section title="Slide">
            <Toggle
              label="Header band"
              checked={slide.header !== null}
              onChange={(on) =>
                setSlide((s) => {
                  s.header = on ? { label: '', title: 'Untitled slide', color: getTemplate(s.template).color } : null
                })
              }
            />
            {slide.header ? (
              <>
                <Field label="Section label">
                  <TextInput
                    value={slide.header.label}
                    placeholder="e.g. Warm-up"
                    onChange={(v) => setSlide((s) => void (s.header && (s.header.label = v)), `${slide.id}:hl`)}
                  />
                </Field>
                <Field label="Title">
                  <TextInput
                    value={slide.header.title}
                    onChange={(v) => setSlide((s) => void (s.header && (s.header.title = v)), `${slide.id}:ht`)}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Background">
              <Segmented
                value={slide.background}
                onChange={(v) => setSlide((s) => void (s.background = v))}
                options={[
                  { value: 'white', label: 'White' },
                  { value: 'tint', label: 'Warm' },
                  { value: 'accent', label: 'Mint' },
                ]}
              />
            </Field>
            <Toggle
              label="Flashback (black and white)"
              checked={Boolean(slide.flashback)}
              onChange={(v) => setSlide((s) => void (s.flashback = v || undefined))}
            />
          </Section>

          <Section title="Add block">
            <div className="add-grid">
              {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                <button key={t} type="button" className="btn btn-sm" onClick={() => addBlock(t)}>
                  <IconPlus size={13} /> {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Teacher notes">
            <TextArea
              value={slide.tutorNotes}
              minRows={4}
              placeholder="Private notes shown only to you during the lesson — timing, prompts, answers…"
              onChange={(v) => setSlide((s) => void (s.tutorNotes = v), `${slide.id}:notes`)}
            />
          </Section>
        </>
      ) : null}

      {!block ? (
        <Section title="Lesson">
          <Field label="Lesson title">
            <TextInput value={lessonRef.lesson.title} onChange={(v) => setLesson((l) => void (l.title = v), `${lessonId}:t`)} />
          </Field>
          <Field label="Objective" hint="What the student will be able to do by the end.">
            <TextArea
              value={lessonRef.lesson.objective}
              placeholder="Students will be able to…"
              onChange={(v) => setLesson((l) => void (l.objective = v), `${lessonId}:o`)}
            />
          </Field>
        </Section>
      ) : null}
    </div>
  )
}

function BlockInspector({
  courseId,
  block,
  setBlock,
  characters,
  onSetAvatar,
  onSetColor,
  onDuplicate,
  onDelete,
  onLayer,
  onBack,
}: {
  courseId: string
  block: Block
  setBlock: <T extends Block>(fn: (b: T) => void, key?: string) => void
  characters: Character[]
  onSetAvatar: (speaker: string, src: string) => void
  onSetColor: (speaker: string, color: number) => void
  onDuplicate: () => void
  onDelete: () => void
  onLayer: (dir: 'up' | 'down') => void
  onBack: () => void
}) {
  const b = block
  return (
    <div className="insp-block">
      <Section
        title={BLOCK_LABELS[b.type]}
        actions={
          <div className="row gap-2">
            <IconButton title="Bring forward" onClick={() => onLayer('up')}>
              <IconUp size={15} />
            </IconButton>
            <IconButton title="Send backward" onClick={() => onLayer('down')}>
              <IconDown size={15} />
            </IconButton>
            <IconButton title="Duplicate (⌘D)" onClick={onDuplicate}>
              <IconCopy size={15} />
            </IconButton>
            <IconButton title="Delete (⌫)" onClick={onDelete} danger>
              <IconTrash size={15} />
            </IconButton>
          </div>
        }
      >
        {b.type === 'heading' ? (
          <>
            <Field label="Text">
              <TextArea value={b.text} onChange={(v) => setBlock<HeadingBlock>((x) => void (x.text = v), 'text')} />
            </Field>
            <Field label="Size">
              <Segmented value={b.size} options={SIZE_OPTS} onChange={(v) => setBlock<HeadingBlock>((x) => void (x.size = v))} />
            </Field>
            <Field label="Align">
              <Segmented value={b.align} options={ALIGN_OPTS} onChange={(v) => setBlock<HeadingBlock>((x) => void (x.align = v))} />
            </Field>
          </>
        ) : null}

        {b.type === 'text' ? (
          <>
            <Field label="Text" hint="**double asterisks** for bold, __double underscores__ for underline. Blank line = new paragraph.">
              <TextArea value={b.text} minRows={5} onChange={(v) => setBlock<TextBlock>((x) => void (x.text = v), 'text')} />
            </Field>
            <Field label="Style">
              <Segmented value={b.tone} options={TONE_OPTS} onChange={(v) => setBlock<TextBlock>((x) => void (x.tone = v))} />
            </Field>
            <Field label="Size">
              <Segmented value={b.size} options={SIZE_OPTS} onChange={(v) => setBlock<TextBlock>((x) => void (x.size = v))} />
            </Field>
            <Field label="Align">
              <Segmented value={b.align} options={ALIGN_OPTS} onChange={(v) => setBlock<TextBlock>((x) => void (x.align = v))} />
            </Field>
          </>
        ) : null}

        {b.type === 'list' ? (
          <>
            <Field label="Title (optional)">
              <TextInput value={b.title ?? ''} onChange={(v) => setBlock<ListBlock>((x) => void (x.title = v), 'title')} />
            </Field>
            <Field label="Items" hint="One item per line. **bold** and __underline__ work.">
              <TextArea
                value={b.items.join('\n')}
                minRows={4}
                onChange={(v) => setBlock<ListBlock>((x) => void (x.items = v.split('\n')), 'items')}
              />
            </Field>
            <Field label="Markers">
              <Segmented
                value={b.style}
                onChange={(v) => setBlock<ListBlock>((x) => void (x.style = v))}
                options={[
                  { value: 'numbered', label: '1 2 3' },
                  { value: 'bulleted', label: '• • •' },
                  { value: 'check', label: '✓ ✓ ✓' },
                ]}
              />
            </Field>
            <Field label="Style">
              <Segmented value={b.tone} options={TONE_OPTS} onChange={(v) => setBlock<ListBlock>((x) => void (x.tone = v))} />
            </Field>
            <Field label="Size">
              <Segmented value={b.size} options={SIZE_OPTS} onChange={(v) => setBlock<ListBlock>((x) => void (x.size = v))} />
            </Field>
            <Field label="Item spacing" hint="Space between items, in slide pixels. Default 18.">
              <div className="row gap-6 spacing-control">
                <input
                  type="range"
                  className="range"
                  min={0}
                  max={80}
                  step={1}
                  value={b.gap ?? 18}
                  onChange={(e) => setBlock<ListBlock>((x) => void (x.gap = Number(e.target.value)), 'gap')}
                />
                <NumberInput value={b.gap ?? 18} min={0} max={200} step={1} onChange={(v) => setBlock<ListBlock>((x) => void (x.gap = Math.max(0, v)), 'gap')} />
                {b.gap !== undefined ? (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setBlock<ListBlock>((x) => void delete x.gap)}>
                    Reset
                  </button>
                ) : null}
              </div>
            </Field>
          </>
        ) : null}

        {b.type === 'image' ? (
          <>
            <ImageField courseId={courseId} value={b.src} onChange={(v) => setBlock<ImageBlock>((x) => void (x.src = v))} />
            <Field label="Alt text" hint="Describe the image (accessibility + teacher reference).">
              <TextInput value={b.alt} onChange={(v) => setBlock<ImageBlock>((x) => void (x.alt = v), 'alt')} />
            </Field>
            <Field label="Credit (optional)">
              <TextInput
                value={b.credit ?? ''}
                placeholder="Photo: Name / Unsplash"
                onChange={(v) => setBlock<ImageBlock>((x) => void (x.credit = v), 'credit')}
              />
            </Field>
            <Field label="Fit">
              <Segmented
                value={b.fit}
                onChange={(v) => setBlock<ImageBlock>((x) => void (x.fit = v))}
                options={[
                  { value: 'cover', label: 'Fill' },
                  { value: 'contain', label: 'Fit whole image' },
                ]}
              />
            </Field>
            {b.fit === 'cover' && b.src ? (
              <Field label="Crop" hint="Double-click the picture on the slide to drag it into place. Scroll to zoom.">
                <div className="row gap-6 crop-controls">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.05}
                    value={b.crop?.zoom ?? 1}
                    onChange={(e) =>
                      setBlock<ImageBlock>((x) => void (x.crop = { x: x.crop?.x ?? 50, y: x.crop?.y ?? 50, zoom: Number(e.target.value) }), 'cropzoom')
                    }
                  />
                  <span className="muted small">{Math.round((b.crop?.zoom ?? 1) * 100)}%</span>
                  <button type="button" className="btn btn-sm btn-ghost" disabled={!b.crop} onClick={() => setBlock<ImageBlock>((x) => void delete x.crop)}>
                    Reset
                  </button>
                </div>
              </Field>
            ) : null}
            <Toggle label="Rounded corners" checked={b.rounded} onChange={(v) => setBlock<ImageBlock>((x) => void (x.rounded = v))} />
          </>
        ) : null}

        {b.type === 'media' ? (
          <>
            <Field label="Type">
              <Segmented
                value={b.kind}
                onChange={(v) =>
                  setBlock<MediaBlock>((x) => {
                    x.kind = v
                    x.src = ''
                    x.loop = v === 'video'
                  })
                }
                options={[
                  { value: 'video', label: 'Video' },
                  { value: 'audio', label: 'Audio' },
                ]}
              />
            </Field>
            <MediaField
              courseId={courseId}
              kind={b.kind}
              value={b.src}
              onChange={(v) => setBlock<MediaBlock>((x) => void (x.src = v))}
              onPoster={(p) => setBlock<MediaBlock>((x) => void (x.poster = p))}
            />
            {b.kind === 'audio' ? (
              <Field label="Label" hint="Shown on the player, e.g. “Gwen’s voicemail”.">
                <TextInput value={b.label ?? ''} onChange={(v) => setBlock<MediaBlock>((x) => void (x.label = v), 'label')} />
              </Field>
            ) : (
              <>
                <Field label="Start frame prompt" hint="Step 1: make this image first. Add the character portraits as references.">
                  <TextArea value={b.imagePrompt ?? ''} minRows={4} onChange={(v) => setBlock<MediaBlock>((x) => void (x.imagePrompt = v), 'imagePrompt')} />
                  <CopyButton text={b.imagePrompt ?? ''} />
                </Field>
                <Field label="Video prompt" hint="Step 2: animate the start frame with this prompt. Export 5–8 s as MP4 or WebM.">
                  <TextArea value={b.videoPrompt ?? ''} minRows={3} onChange={(v) => setBlock<MediaBlock>((x) => void (x.videoPrompt = v), 'videoPrompt')} />
                  <CopyButton text={b.videoPrompt ?? ''} />
                </Field>
                <Field label="Poster image (optional)" hint="Shown before the video plays.">
                  <ImageField courseId={courseId} value={b.poster ?? ''} onChange={(v) => setBlock<MediaBlock>((x) => void (x.poster = v))} />
                </Field>
                <Field label="Fit">
                  <Segmented
                    value={b.fit}
                    onChange={(v) => setBlock<MediaBlock>((x) => void (x.fit = v))}
                    options={[
                      { value: 'cover', label: 'Fill' },
                      { value: 'contain', label: 'Fit whole video' },
                    ]}
                  />
                </Field>
                <Toggle label="Rounded corners" checked={b.rounded} onChange={(v) => setBlock<MediaBlock>((x) => void (x.rounded = v))} />
              </>
            )}
            {b.kind === 'video' ? (
              <Toggle
                label="Autoplay when the slide opens (muted)"
                checked={!!b.autoplay}
                onChange={(v) => setBlock<MediaBlock>((x) => void (x.autoplay = v || undefined))}
              />
            ) : null}
            <Toggle label="Loop (play again at the end)" checked={b.loop} onChange={(v) => setBlock<MediaBlock>((x) => void (x.loop = v))} />
            <Field label="Transcript (teacher reference)" hint="What is said in the clip. Not shown to students.">
              <TextArea value={b.transcript ?? ''} minRows={2} onChange={(v) => setBlock<MediaBlock>((x) => void (x.transcript = v), 'transcript')} />
            </Field>
          </>
        ) : null}

        {b.type === 'vocab' ? (
          <>
            <div className="rows">
              {b.items.map((it, i) => (
                <div key={i} className="row-card">
                  <div className="row-card-head">
                    <span className="muted small">#{i + 1}</span>
                    <div className="row gap-2">
                      <IconButton title="Move up" disabled={i === 0} onClick={() => setBlock<VocabBlock>((x) => move(x.items, i, i - 1))}>
                        <IconUp size={14} />
                      </IconButton>
                      <IconButton
                        title="Move down"
                        disabled={i === b.items.length - 1}
                        onClick={() => setBlock<VocabBlock>((x) => move(x.items, i, i + 1))}
                      >
                        <IconDown size={14} />
                      </IconButton>
                      <IconButton title="Remove" danger onClick={() => setBlock<VocabBlock>((x) => void x.items.splice(i, 1))}>
                        <IconTrash size={14} />
                      </IconButton>
                    </div>
                  </div>
                  <TextInput value={it.term} placeholder="Word or phrase" onChange={(v) => setBlock<VocabBlock>((x) => void (x.items[i].term = v), `t${i}`)} />
                  <TextInput value={it.pos ?? ''} placeholder="Word type, e.g. noun, verb, phrase" onChange={(v) => setBlock<VocabBlock>((x) => void (x.items[i].pos = v), `p${i}`)} />
                  <TextInput value={it.meaning ?? ''} placeholder="Meaning (English)" onChange={(v) => setBlock<VocabBlock>((x) => void (x.items[i].meaning = v), `m${i}`)} />
                  <TextInput value={it.ja ?? ''} placeholder="日本語" className="jp" onChange={(v) => setBlock<VocabBlock>((x) => void (x.items[i].ja = v), `j${i}`)} />
                  <TextInput value={it.example ?? ''} placeholder="Example sentence (saved with the card; hidden on the slide)" onChange={(v) => setBlock<VocabBlock>((x) => void (x.items[i].example = v), `e${i}`)} />
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setBlock<VocabBlock>((x) => void x.items.push({ id: uid('v'), term: '', pos: '', meaning: '', ja: '', example: '' }))}
              >
                <IconPlus size={13} /> Add word
              </button>
            </div>
            <Toggle label="Show meaning" checked={b.showMeaning} onChange={(v) => setBlock<VocabBlock>((x) => void (x.showMeaning = v))} />
            <Toggle label="Show Japanese" checked={b.showJa} onChange={(v) => setBlock<VocabBlock>((x) => void (x.showJa = v))} />
            <Toggle label="Show example on the slide" checked={b.showExample} onChange={(v) => setBlock<VocabBlock>((x) => void (x.showExample = v))} />
          </>
        ) : null}

        {b.type === 'phrases' ? (
          <>
            <Field label="Title (optional)">
              <TextInput value={b.title ?? ''} onChange={(v) => setBlock<PhrasesBlock>((x) => void (x.title = v), 'title')} />
            </Field>
            <Field label="Phrases" hint="One phrase per line. Each one becomes a pill. **bold** works.">
              <TextArea
                value={b.items.join('\n')}
                minRows={4}
                onChange={(v) => setBlock<PhrasesBlock>((x) => void (x.items = v.split('\n')), 'items')}
              />
            </Field>
          </>
        ) : null}

        {b.type === 'dialogue' ? (
          <>
            <div className="speaker-pics">
              <div className="field-label">Characters</div>
              <p className="field-hint">Click or drop an image on a circle, and pick a bubble colour. Both are used for that character in every dialogue in the course.</p>
              {[...new Map(b.lines.filter((l) => l.speaker.trim()).map((l) => [l.speaker.trim().toLowerCase(), l.speaker.trim()])).values()].map(
                (name) => {
                  const ch = characters.find((c) => c.name.trim().toLowerCase() === name.toLowerCase())
                  return (
                    <div key={name} className="speaker-pic-row">
                      <ImageField compact courseId={courseId} value={ch?.avatar ?? ''} onChange={(src) => onSetAvatar(name, src)} />
                      <span className="speaker-pic-name">{name}</span>
                      <BubbleColorPicker value={characterColor(name, characters)} onChange={(v) => onSetColor(name, v)} />
                    </div>
                  )
                },
              )}
            </div>
            <div className="rows">
              {b.lines.map((l, i) => (
                <div key={i} className="row-card">
                  <div className="row-card-head">
                    <TextInput
                      className="input-speaker"
                      value={l.speaker}
                      placeholder="Speaker"
                      onChange={(v) => setBlock<DialogueBlock>((x) => void (x.lines[i].speaker = v), `s${i}`)}
                    />
                    <div className="row gap-2">
                      <IconButton title="Move up" disabled={i === 0} onClick={() => setBlock<DialogueBlock>((x) => move(x.lines, i, i - 1))}>
                        <IconUp size={14} />
                      </IconButton>
                      <IconButton
                        title="Move down"
                        disabled={i === b.lines.length - 1}
                        onClick={() => setBlock<DialogueBlock>((x) => move(x.lines, i, i + 1))}
                      >
                        <IconDown size={14} />
                      </IconButton>
                      <IconButton title="Remove" danger onClick={() => setBlock<DialogueBlock>((x) => void x.lines.splice(i, 1))}>
                        <IconTrash size={14} />
                      </IconButton>
                    </div>
                  </div>
                  <TextArea value={l.text} placeholder="Line" onChange={(v) => setBlock<DialogueBlock>((x) => void (x.lines[i].text = v), `l${i}`)} />
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  setBlock<DialogueBlock>((x) => {
                    const speakers = [...new Set(x.lines.map((l) => l.speaker))]
                    const last = x.lines[x.lines.length - 1]?.speaker
                    const next = speakers.find((s) => s !== last) ?? 'Speaker'
                    x.lines.push({ speaker: next, text: '' })
                  })
                }
              >
                <IconPlus size={13} /> Add line
              </button>
            </div>
            <Field label="Size">
              <Segmented value={b.size} options={SIZE_OPTS} onChange={(v) => setBlock<DialogueBlock>((x) => void (x.size = v))} />
            </Field>
          </>
        ) : null}

        {b.type === 'truefalse' ? (
          <>
            <p className="field-hint">Shown one statement at a time. Teacher and student can both answer. The reason is only shown to the teacher.</p>
            <div className="rows">
              {b.items.map((it, i) => (
                <div key={i} className="row-card">
                  <div className="row-card-head">
                    <span className="muted small">#{i + 1}</span>
                    <div className="row gap-2">
                      <IconButton title="Move up" disabled={i === 0} onClick={() => setBlock<TrueFalseBlock>((x) => move(x.items, i, i - 1))}>
                        <IconUp size={14} />
                      </IconButton>
                      <IconButton
                        title="Move down"
                        disabled={i === b.items.length - 1}
                        onClick={() => setBlock<TrueFalseBlock>((x) => move(x.items, i, i + 1))}
                      >
                        <IconDown size={14} />
                      </IconButton>
                      <IconButton title="Remove" danger onClick={() => setBlock<TrueFalseBlock>((x) => void x.items.splice(i, 1))}>
                        <IconTrash size={14} />
                      </IconButton>
                    </div>
                  </div>
                  <TextArea value={it.text} minRows={1} onChange={(v) => setBlock<TrueFalseBlock>((x) => void (x.items[i].text = v), `t${i}`)} />
                  <Segmented
                    value={it.answer ? 'true' : 'false'}
                    options={[
                      { value: 'true', label: 'True' },
                      { value: 'false', label: 'False' },
                    ]}
                    onChange={(v) => setBlock<TrueFalseBlock>((x) => void (x.items[i].answer = v === 'true'))}
                  />
                  <TextInput
                    value={it.why ?? ''}
                    placeholder="Reason (teacher only), e.g. rent in London is very expensive"
                    onChange={(v) => setBlock<TrueFalseBlock>((x) => void (x.items[i].why = v), `w${i}`)}
                  />
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => setBlock<TrueFalseBlock>((x) => void x.items.push({ text: '', answer: true, why: '' }))}>
                <IconPlus size={13} /> Add statement
              </button>
            </div>
          </>
        ) : null}

        {b.type === 'match' ? (
          <>
            <p className="field-hint">Tap a word, then its picture. Use concrete words only, about once per unit. Words are shuffled on the slide.</p>
            <div className="rows">
              {b.pairs.map((p, i) => (
                <div key={p.id ?? i} className="row-card">
                  <div className="row-card-head">
                    <span className="muted small">#{i + 1}</span>
                    <IconButton title="Remove" danger disabled={b.pairs.length <= 2} onClick={() => setBlock<MatchBlock>((x) => void x.pairs.splice(i, 1))}>
                      <IconTrash size={14} />
                    </IconButton>
                  </div>
                  <TextInput value={p.term} placeholder="Word, e.g. a kettle" onChange={(v) => setBlock<MatchBlock>((x) => void (x.pairs[i].term = v), `t${i}`)} />
                  <ImageField courseId={courseId} value={p.image} onChange={(v) => setBlock<MatchBlock>((x) => void (x.pairs[i].image = v))} />
                  <TextInput value={p.alt ?? ''} placeholder="Picture description (alt text)" onChange={(v) => setBlock<MatchBlock>((x) => void (x.pairs[i].alt = v), `a${i}`)} />
                </div>
              ))}
              {b.pairs.length < 6 ? (
                <button type="button" className="btn btn-sm" onClick={() => setBlock<MatchBlock>((x) => void x.pairs.push({ id: uid('m'), term: '', image: '' }))}>
                  <IconPlus size={13} /> Add pair
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {b.type === 'callout' ? (
          <>
            <Field label="Title">
              <TextInput value={b.title ?? ''} onChange={(v) => setBlock<CalloutBlock>((x) => void (x.title = v), 'title')} />
            </Field>
            <Field label="Text" hint="**bold** and __underline__ work. A blank line starts a new paragraph.">
              <TextArea value={b.text} minRows={3} onChange={(v) => setBlock<CalloutBlock>((x) => void (x.text = v), 'text')} />
            </Field>
            <Field label="Match a character" hint="Use that character’s speech-bubble colour.">
              <Select
                value={b.character ?? ''}
                onChange={(v) => setBlock<CalloutBlock>((x) => void (x.character = v || undefined))}
                options={[{ value: '', label: 'No (use the colour below)' }, ...characters.map((ch) => ({ value: ch.name, label: ch.name }))]}
              />
            </Field>
            <Field label="Colour">
              <Segmented
                value={b.tone}
                onChange={(v) => setBlock<CalloutBlock>((x) => void (x.tone = v))}
                options={[
                  { value: 'accent', label: 'Mint' },
                  { value: 'warning', label: 'Peach' },
                  { value: 'neutral', label: 'Grey' },
                  { value: 'ink', label: 'Ink' },
                ]}
              />
            </Field>
          </>
        ) : null}
      </Section>

      <Section title="Visibility">
        <Toggle
          label="Teacher only (hidden from the student)"
          checked={Boolean(b.tutorOnly)}
          onChange={(v) => setBlock((x) => void (x.tutorOnly = v))}
        />
      </Section>

      <Section title="Position (% of slide)">
        <div className="frame-grid">
          {(['x', 'y', 'w', 'h'] as const).map((k) => (
            <label key={k} className="frame-field">
              <span>{k.toUpperCase()}</span>
              <NumberInput
                value={b.frame[k]}
                min={k === 'w' || k === 'h' ? 3 : 0}
                max={100}
                onChange={(v) =>
                  setBlock((x) => {
                    x.frame[k] = Math.max(0, Math.min(100, v))
                  }, `f${k}`)
                }
              />
            </label>
          ))}
        </div>
      </Section>

      <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
        ← Slide settings
      </button>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-sm copy-prompt"
      disabled={!text}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      <IconCopy size={13} /> {copied ? 'Copied' : 'Copy prompt'}
    </button>
  )
}
