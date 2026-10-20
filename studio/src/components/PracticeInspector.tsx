import type { ReactNode } from 'react'
import type { Block, CanDoBlock, GapFillBlock, ListenBlock, ListenItem, PromptBlock, RepeatBlock, RepeatItem, SayMatchBlock, TimerBlock } from '@slides'
import { move } from '../model'
import { Field, IconButton, NumberInput, Segmented, TextArea, TextInput, Toggle } from '../ui/fields'
import { IconDown, IconPlus, IconTrash, IconUp } from '../ui/icons'
import { ImageField } from './ImageField'
import { MediaField } from './MediaField'

type SetBlock = <T extends Block>(fn: (b: T) => void, key?: string) => void

/** "one per line" lists (sentence starters, goals, gap-fill frames) */
const lines = (v: string) => v.split('\n')
const joined = (a?: string[]) => (a ?? []).join('\n')

function RowCard({ n, total, onUp, onDown, onRemove, children }: { n: number; total: number; onUp: () => void; onDown: () => void; onRemove: () => void; children: ReactNode }) {
  return (
    <div className="row-card">
      <div className="row-card-head">
        <span className="muted small">#{n + 1}</span>
        <div className="row gap-2">
          <IconButton title="Move up" disabled={n === 0} onClick={onUp}>
            <IconUp size={14} />
          </IconButton>
          <IconButton title="Move down" disabled={n === total - 1} onClick={onDown}>
            <IconDown size={14} />
          </IconButton>
          <IconButton title="Remove" danger onClick={onRemove}>
            <IconTrash size={14} />
          </IconButton>
        </div>
      </div>
      {children}
    </div>
  )
}

const VOICES: [keyof NonNullable<RepeatItem['audio']>, string][] = [
  ['ukF', 'UK female'],
  ['ukM', 'UK male'],
  ['usF', 'US female'],
  ['usM', 'US male'],
]

/** Editors for the practice blocks (listen, repeat, "Did you get it?", prompt, gap-fill, timer, can-do). */
export function PracticeInspector({ courseId, block: b, setBlock }: { courseId: string; block: Block; setBlock: SetBlock }) {
  if (b.type === 'listen') {
    const set = (fn: (x: ListenBlock) => void, key?: string) => setBlock<ListenBlock>(fn, key)
    return (
      <>
        <p className="field-hint">
          One item at a time: a clip plays (or the teacher says it, if there&apos;s no clip) and the student taps what they heard. Options can be words,
          syllables (“ho”, “tel”), pictures or ↗ / ↘. A score shows at the end.
        </p>
        <Field label="Replays per clip" hint="0 = no limit.">
          <NumberInput value={b.replays} min={0} max={5} step={1} onChange={(v) => set((x) => void (x.replays = v))} />
        </Field>
        <div className="rows">
          {b.items.map((it, i) => (
            <RowCard
              key={i}
              n={i}
              total={b.items.length}
              onUp={() => set((x) => move(x.items, i, i - 1))}
              onDown={() => set((x) => move(x.items, i, i + 1))}
              onRemove={() => set((x) => void x.items.splice(i, 1))}
            >
              <MediaField courseId={courseId} kind="audio" value={it.audio} onChange={(v) => set((x) => void (x.items[i].audio = v))} />
              <TextInput
                value={it.says ?? ''}
                placeholder="What the clip says (optional, e.g. the whole sentence)"
                onChange={(v) => set((x) => void (x.items[i].says = v), `s${i}`)}
              />
              {it.options.map((o, k) => (
                <div key={k} className="row gap-2">
                  <input
                    type="radio"
                    name={`ans-${b.id}-${i}`}
                    title="The right answer"
                    checked={it.answer === k}
                    onChange={() => set((x) => void (x.items[i].answer = k))}
                  />
                  <TextInput value={o.text ?? ''} placeholder={`Option ${k + 1}`} onChange={(v) => set((x) => void (x.items[i].options[k].text = v), `o${i}.${k}`)} />
                  <IconButton
                    title="Remove option"
                    danger
                    disabled={it.options.length <= 2}
                    onClick={() =>
                      set((x) => {
                        const item: ListenItem = x.items[i]
                        item.options.splice(k, 1)
                        if (item.answer >= item.options.length) item.answer = 0
                      })
                    }
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </div>
              ))}
              <details>
                <summary className="muted small">Pictures instead of words</summary>
                {it.options.map((o, k) => (
                  <Field key={k} label={`Picture for option ${k + 1}`}>
                    <ImageField courseId={courseId} value={o.image ?? ''} onChange={(v) => set((x) => void (x.items[i].options[k].image = v || undefined))} />
                    <TextInput value={o.alt ?? ''} placeholder="What the picture shows" onChange={(v) => set((x) => void (x.items[i].options[k].alt = v), `a${i}.${k}`)} />
                  </Field>
                ))}
              </details>
              {it.options.length < 4 ? (
                <button type="button" className="btn btn-sm" onClick={() => set((x) => void x.items[i].options.push({ text: '' }))}>
                  <IconPlus size={13} /> Add option
                </button>
              ) : null}
            </RowCard>
          ))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => set((x) => void x.items.push({ audio: '', options: [{ text: '' }, { text: '' }], answer: 0 }))}
          >
            <IconPlus size={13} /> Add item
          </button>
        </div>
      </>
    )
  }

  if (b.type === 'repeat') {
    const set = (fn: (x: RepeatBlock) => void, key?: string) => setBlock<RepeatBlock>(fn, key)
    return (
      <>
        <p className="field-hint">Word or phrase cards. Tapping a card plays its first clip; voice buttons play the others. The teacher marks “Understood” or “Once more”.</p>
        <div className="rows">
          {b.items.map((it, i) => (
            <RowCard
              key={i}
              n={i}
              total={b.items.length}
              onUp={() => set((x) => move(x.items, i, i - 1))}
              onDown={() => set((x) => move(x.items, i, i + 1))}
              onRemove={() => set((x) => void x.items.splice(i, 1))}
            >
              <TextInput value={it.text} placeholder="Word or phrase" onChange={(v) => set((x) => void (x.items[i].text = v), `t${i}`)} />
              <TextInput
                value={it.respell ?? ''}
                placeholder="How it sounds (optional), e.g. nice ta MEE-choo"
                onChange={(v) => set((x) => void (x.items[i].respell = v || undefined), `r${i}`)}
              />
              <details>
                <summary className="muted small">Clips ({VOICES.filter(([k]) => it.audio?.[k]).length} of 4)</summary>
                {VOICES.map(([k, label]) => (
                  <Field key={k} label={label}>
                    <MediaField
                      courseId={courseId}
                      kind="audio"
                      value={it.audio?.[k] ?? ''}
                      onChange={(v) => set((x) => void (x.items[i].audio = { ...(x.items[i].audio ?? {}), [k]: v || undefined }))}
                    />
                  </Field>
                ))}
              </details>
            </RowCard>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => set((x) => void x.items.push({ text: '' }))}>
            <IconPlus size={13} /> Add card
          </button>
        </div>
      </>
    )
  }

  if (b.type === 'saymatch') {
    const set = (fn: (x: SayMatchBlock) => void, key?: string) => setBlock<SayMatchBlock>(fn, key)
    return (
      <>
        <p className="field-hint">
          The student secretly picks one word of a pair and says it; the tutor says which it heard; then the pick is checked. Pairs repeat in order
          until the rounds are done. The pick is never shown to the tutor first.
        </p>
        <Field label="Rounds">
          <NumberInput value={b.rounds} min={1} max={20} step={1} onChange={(v) => set((x) => void (x.rounds = v))} />
        </Field>
        <div className="rows">
          {b.pairs.map((p, i) => (
            <div key={i} className="row gap-2">
              <TextInput value={p.a} placeholder="Word A" onChange={(v) => set((x) => void (x.pairs[i].a = v), `a${i}`)} />
              <TextInput value={p.b} placeholder="Word B" onChange={(v) => set((x) => void (x.pairs[i].b = v), `b${i}`)} />
              <IconButton title="Remove" danger onClick={() => set((x) => void x.pairs.splice(i, 1))}>
                <IconTrash size={14} />
              </IconButton>
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => set((x) => void x.pairs.push({ a: '', b: '' }))}>
            <IconPlus size={13} /> Add pair
          </button>
        </div>
      </>
    )
  }

  if (b.type === 'prompt') {
    const set = (fn: (x: PromptBlock) => void, key?: string) => setBlock<PromptBlock>(fn, key)
    return (
      <>
        <Field label="Question or task" hint="**bold** for key words.">
          <TextArea value={b.text} minRows={2} onChange={(v) => set((x) => void (x.text = v), 'text')} />
        </Field>
        <Field label="Sentence starters" hint="One per line. Shown as chips.">
          <TextArea value={joined(b.starters)} minRows={2} onChange={(v) => set((x) => void (x.starters = lines(v)), 'starters')} />
        </Field>
        <Field label="Goals to tick (optional)" hint="One per line, e.g. for a role-play: your name, 2 people, 7:30.">
          <TextArea value={joined(b.goals)} minRows={2} onChange={(v) => set((x) => void (x.goals = lines(v)), 'goals')} />
        </Field>
        <Field label="Example answer (optional)" hint="Hidden from the student until someone taps “Show an example”.">
          <TextArea value={b.model ?? ''} minRows={2} onChange={(v) => set((x) => void (x.model = v), 'model')} />
        </Field>
      </>
    )
  }

  if (b.type === 'gapfill') {
    const set = (fn: (x: GapFillBlock) => void, key?: string) => setBlock<GapFillBlock>(fn, key)
    return (
      <Field label="Frames" hint="One per line. Type … (or ...) for each gap the student fills with their own details. Filled lines can be saved to their phrases.">
        <TextArea value={joined(b.lines)} minRows={4} onChange={(v) => set((x) => void (x.lines = lines(v)), 'lines')} />
      </Field>
    )
  }

  if (b.type === 'timer') {
    const set = (fn: (x: TimerBlock) => void, key?: string) => setBlock<TimerBlock>(fn, key)
    return (
      <>
        <Field label="Seconds">
          <NumberInput value={b.seconds} min={5} max={600} step={5} onChange={(v) => set((x) => void (x.seconds = v))} />
        </Field>
        <Field label="Label (optional)">
          <TextInput value={b.label ?? ''} placeholder="e.g. Can you do it in 20 seconds?" onChange={(v) => set((x) => void (x.label = v), 'label')} />
        </Field>
      </>
    )
  }

  if (b.type === 'cando') {
    const set = (fn: (x: CanDoBlock) => void, key?: string) => setBlock<CanDoBlock>(fn, key)
    return (
      <>
        <Field label="Goal" hint="“Today’s goal: …” on the cover; the same goal on the wrap-up with the rating on.">
          <TextArea value={b.goal} minRows={2} onChange={(v) => set((x) => void (x.goal = v), 'goal')} />
        </Field>
        <Field label="Progress label (optional)">
          <TextInput value={b.progress ?? ''} placeholder="Lesson 4 of 14" onChange={(v) => set((x) => void (x.progress = v), 'progress')} />
        </Field>
        <Segmented
          value={b.rate ? 'rate' : 'show'}
          options={[
            { value: 'show', label: 'Show the goal' },
            { value: 'rate', label: 'Ask for a rating' },
          ]}
          onChange={(v) => set((x) => void (x.rate = v === 'rate'))}
        />
      </>
    )
  }

  return null
}

/** The "hidden until Show" switch, for any block. */
export function RevealToggle({ block, setBlock }: { block: Block; setBlock: SetBlock }) {
  return (
    <Toggle
      label="Hidden until someone taps “Show” (guess first)"
      checked={Boolean(block.reveal)}
      onChange={(v) => setBlock((x) => void (x.reveal = v || undefined))}
    />
  )
}
