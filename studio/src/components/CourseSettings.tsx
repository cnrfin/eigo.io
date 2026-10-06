import { BubbleColorPicker } from './BubbleColorPicker'
import { characterColor, slugify, summarizeCourse, uid, type CefrLevel, type Course } from '@slides'
import type { CourseEditor } from '../useCourseEditor'
import { Field, IconButton, Select, TextArea, TextInput } from '../ui/fields'
import { IconPlus, IconTrash } from '../ui/icons'
import { ImageField } from './ImageField'

/** Keep empty entries while typing ("a, "); they're dropped when the course is used. */
const splitChips = (v: string) => v.split(/[,、]/).map((x) => x.trimStart())

const LEVELS: (CefrLevel | '')[] = ['', 'Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function CourseSettings({ course, editor, onDelete }: { course: Course; editor: CourseEditor; onDelete: () => void }) {
  const set = (fn: (d: Course) => void, key?: string) => editor.update(fn, key && `course:${key}`)
  const s = summarizeCourse(course)

  // Speaker names used in dialogues, with how many lines each speaks.
  const lines = new Map<string, { name: string; n: number }>()
  for (const u of course.units)
    for (const l of u.lessons)
      for (const sl of l.slides)
        for (const b of sl.blocks)
          if (b.type === 'dialogue')
            for (const line of b.lines) {
              const key = line.speaker.trim().toLowerCase()
              if (!key) continue
              const e = lines.get(key) ?? { name: line.speaker.trim(), n: 0 }
              e.n++
              lines.set(key, e)
            }
  const lineCount = (name: string) => lines.get(name.trim().toLowerCase())?.n ?? 0
  const known = new Set((course.characters ?? []).map((c) => c.name.trim().toLowerCase()))
  const speakersMissing = [...lines.entries()].filter(([k]) => !known.has(k)).map(([, v]) => v.name)

  return (
    <div className="settings">
      <div className="settings-inner">
        <h1 className="settings-title">Course details</h1>
        <p className="muted">
          {s.units} unit{s.units === 1 ? '' : 's'} · {s.lessons} lesson{s.lessons === 1 ? '' : 's'} · {s.slides} slide
          {s.slides === 1 ? '' : 's'}
        </p>

        <div className="settings-grid">
          <div className="card">
            <Field label="Title">
              <TextInput value={course.title} onChange={(v) => set((d) => void (d.title = v), 'title')} />
            </Field>
            <Field label="Japanese title">
              <TextInput value={course.titleJa} className="jp" placeholder="例：旅行英会話" onChange={(v) => set((d) => void (d.titleJa = v), 'titleJa')} />
            </Field>
            <Field
              label="Slug"
              hint={
                <>
                  Used in eigo.io URLs. Lowercase letters, numbers and hyphens.{' '}
                  <button type="button" className="link" onClick={() => set((d) => void (d.slug = slugify(d.title)))}>
                    Generate from title
                  </button>
                </>
              }
            >
              <TextInput
                value={course.slug}
                onChange={(v) => set((d) => void (d.slug = v.toLowerCase().replace(/[^a-z0-9-]/g, '-')), 'slug')}
              />
            </Field>
            <Field label="Description" hint="Shown to students in the course library.">
              <TextArea value={course.description} minRows={4} onChange={(v) => set((d) => void (d.description = v), 'desc')} />
            </Field>
            <Field label="Japanese description" hint="Shown to students in the booking course picker.">
              <TextArea
                value={course.descriptionJa ?? ''}
                minRows={3}
                onChange={(v) => set((d) => void (d.descriptionJa = v), 'descJa')}
              />
            </Field>
            <div className="row gap-12">
              <Field label="CEFR level">
                <Select
                  value={course.level}
                  onChange={(v) => set((d) => void (d.level = v))}
                  options={LEVELS.map((l) => ({ value: l, label: l || 'Not set' }))}
                />
              </Field>
              <Field label="Category">
                <TextInput value={course.category} placeholder="e.g. Travel, Business, Culture" onChange={(v) => set((d) => void (d.category = v), 'cat')} />
              </Field>
            </div>
          </div>

          <div className="card">
            <div className="row gap-12">
              <Field label="Series" hint="Courses in the same series share a row in the picker.">
                <TextInput value={course.series ?? ''} placeholder="e.g. Great Britain" onChange={(v) => set((d) => void (d.series = v), 'series')} />
              </Field>
              <Field label="Order">
                <TextInput
                  value={course.sortOrder == null ? '' : String(course.sortOrder)}
                  placeholder="1"
                  onChange={(v) => set((d) => void (d.sortOrder = v.trim() === '' || isNaN(+v) ? undefined : +v), 'order')}
                />
              </Field>
            </div>
            <Field label="Topic chips (Japanese)" hint="3–4, separated by commas. Shown on the course banner when booking.">
              <TextInput
                value={(course.chips?.ja ?? []).join(', ')}
                className="jp"
                placeholder="日常会話, 旅行, 文化"
                onChange={(v) => set((d) => void (d.chips = { ja: splitChips(v), en: d.chips?.en ?? [] }), 'chipsJa')}
              />
            </Field>
            <Field label="Topic chips (English)">
              <TextInput
                value={(course.chips?.en ?? []).join(', ')}
                placeholder="Everyday English, Travel, Culture"
                onChange={(v) => set((d) => void (d.chips = { ja: d.chips?.ja ?? [], en: splitChips(v) }), 'chipsEn')}
              />
            </Field>
          </div>

          <div className="card">
            <Field label="Cover image">
              <ImageField courseId={course.id} value={course.coverImage} onChange={(v) => set((d) => void (d.coverImage = v))} />
            </Field>
          </div>
        </div>

        <div className="card characters">
          <div className="characters-head">
            <div>
              <h2 className="characters-title">Characters</h2>
              <p className="muted small">
                Add a picture and choose a bubble colour once, and they’re used for every dialogue line spoken by that
                character. The name must match the speaker name in dialogues (capitals don’t matter).
              </p>
            </div>
            <div className="row gap-6">
              {speakersMissing.length ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  title={`Add: ${speakersMissing.join(', ')}`}
                  onClick={() =>
                    set((d) => {
                      d.characters = [...(d.characters ?? []), ...speakersMissing.map((name) => ({ id: uid('ch'), name, avatar: '' }))]
                    })
                  }
                >
                  Add {speakersMissing.length} from dialogues
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => set((d) => void (d.characters = [...(d.characters ?? []), { id: uid('ch'), name: '', avatar: '' }]))}
              >
                <IconPlus size={14} /> Add character
              </button>
            </div>
          </div>
          {(course.characters ?? []).length === 0 ? (
            <p className="muted small">No characters yet.</p>
          ) : (
            <div className="character-list">
              {(course.characters ?? []).map((ch, i) => (
                <div key={ch.id} className="character-row">
                  <div className={`character-avatar es-speaker-${characterColor(ch.name, course.characters)}`}>
                    <ImageField
                      compact
                      courseId={course.id}
                      value={ch.avatar}
                      onChange={(v) => set((d) => void (d.characters![i].avatar = v))}
                    />
                  </div>
                  <TextInput
                    value={ch.name}
                    placeholder="Name, e.g. Haruka"
                    onChange={(v) => set((d) => void (d.characters![i].name = v), `ch${ch.id}`)}
                  />
                  <BubbleColorPicker
                    value={characterColor(ch.name, course.characters)}
                    onChange={(v) => set((d) => void (d.characters![i].color = v))}
                  />
                  <span className="muted small character-count">
                    {lineCount(ch.name)} line{lineCount(ch.name) === 1 ? '' : 's'}
                  </span>
                  <IconButton
                    title="Remove character"
                    danger
                    onClick={() => set((d) => void d.characters!.splice(i, 1))}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="danger-zone">
          <div>
            <strong>Delete course</strong>
            <p className="muted small">Moves the course to studio/data/trash. Nothing on eigo.io is affected.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Delete course
          </button>
        </div>
      </div>
    </div>
  )
}
