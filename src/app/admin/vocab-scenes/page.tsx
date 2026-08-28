'use client'

/**
 * Vocab scene editor — local admin tool to view, audit and edit the dialogue
 * scenes for the vocab courses. Reads/writes via /api/admin/vocab-scenes
 * (service role). Admin-email gated; not student-facing.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']
const GOALS = ['travel', 'business', 'conversation'] as const

type Sense = { id: string; slug: string; gloss_ja: string; headword: string }
type Line = {
  speaker: 'user' | 'npc'
  text_en: string
  text_ja: string | null
  blank_answer: string | null
  blank_sense_id: string | null
  options: string[] | null
  note: string | null
}
type Scene = {
  id?: string
  goal: string | null
  order_index: number
  title_en: string
  title_ja: string
  setting: string | null
  npc_role: string | null
  published: boolean
  lines: Line[]
}
type Lesson = { id: string; slug: string; title_en: string; title_ja: string; senses: Sense[]; scenes: Scene[] }

const emptyLine = (): Line => ({ speaker: 'user', text_en: '', text_ja: '', blank_answer: '', blank_sense_id: '', options: ['', '', '', ''], note: '' })
const emptyScene = (): Scene => ({ goal: 'travel', order_index: 0, title_en: '', title_ja: '', setting: '', npc_role: '', published: true, lines: [emptyLine()] })

/** Client-side mirror of the scene audit checks (see lib/vocabAudit). */
function auditLine(line: Line, lessonSenseIds: Set<string>): string[] {
  const w: string[] = []
  const en = line.text_en || ''
  const noVar = en.replace(/\{\{[^}]*\}\}/g, '')
  const braces = [...noVar.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1])
  if (line.blank_answer) {
    if (braces.length !== 1) w.push(`blank line needs exactly one {token} in the English (found ${braces.length})`)
    else if (braces[0] !== line.blank_answer) w.push(`token {${braces[0]}} ≠ answer "${line.blank_answer}"`)
    const opts = (line.options ?? []).map((o) => o.trim()).filter(Boolean)
    if (opts.length !== 4) w.push(`needs 4 options (has ${opts.length})`)
    if (new Set(opts).size !== opts.length) w.push('options must be distinct')
    if (!opts.includes(line.blank_answer)) w.push('answer must be one of the options')
    if (!line.blank_sense_id) w.push('choose the word this blank teaches (sense)')
    else if (!lessonSenseIds.has(line.blank_sense_id)) w.push('sense is not in this lesson')
  } else if (braces.length > 0) {
    w.push('play line has a {blank} but no answer set')
  }
  return w
}

export default function VocabSceneEditor() {
  const { user, session } = useAuth()
  const token = session?.access_token
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email)

  type LessonListItem = Pick<Lesson, 'id' | 'slug' | 'title_en' | 'title_ja'>
  const [lessons, setLessons] = useState<LessonListItem[]>([])
  const [detail, setDetail] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonId, setLessonId] = useState<string>('')
  const [sceneKey, setSceneKey] = useState<string>('') // scene id or 'new'
  const [draft, setDraft] = useState<Scene | null>(null)
  const [msg, setMsg] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const authFetch = useCallback((url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { ...(opts.headers || {}), 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }), [token])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const res = await authFetch('/api/admin/vocab-scenes')
    const data = await res.json()
    setLessons(data.lessons ?? [])
    setLoading(false)
  }, [authFetch, token])

  const loadDetail = useCallback(async (id: string) => {
    if (!token || !id) { setDetail(null); return }
    const res = await authFetch(`/api/admin/vocab-scenes?lessonId=${id}`)
    const data = await res.json()
    setDetail(data.lesson ?? null)
  }, [authFetch, token])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])
  // Load the selected lesson's scenes/senses on demand (scoped, avoids row caps).
  useEffect(() => { loadDetail(lessonId) }, [lessonId, loadDetail])

  const lesson = detail
  const senseIds = useMemo(() => new Set((lesson?.senses ?? []).map((s) => s.id)), [lesson])

  // Group lessons by course (vocab-101 / vocab-102 / …) for the dropdown, since
  // both courses share level_index and would otherwise be interleaved.
  const lessonGroups = useMemo(() => {
    const g = new Map<string, LessonListItem[]>()
    for (const l of lessons) {
      const m = l.slug.match(/^(vocab-\d+)/)
      const label = m ? m[1].replace('vocab-', 'Vocab ') : 'Other'
      if (!g.has(label)) g.set(label, [])
      g.get(label)!.push(l)
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [lessons])

  // Load a draft when lesson/scene selection changes.
  useEffect(() => {
    if (!lesson) { setDraft(null); return }
    if (sceneKey === 'new') { setDraft({ ...emptyScene(), order_index: lesson.scenes.length }) }
    else {
      const sc = lesson.scenes.find((s) => s.id === sceneKey)
      setDraft(sc ? JSON.parse(JSON.stringify(sc)) : null)
    }
  }, [lesson, sceneKey])

  const setLine = (i: number, patch: Partial<Line>) => setDraft((d) => d ? { ...d, lines: d.lines.map((ln, j) => j === i ? { ...ln, ...patch } : ln) } : d)
  const setOption = (i: number, oi: number, val: string) => setDraft((d) => d ? { ...d, lines: d.lines.map((ln, j) => j === i ? { ...ln, options: (ln.options ?? ['', '', '', '']).map((o, k) => k === oi ? val : o) } : ln) } : d)
  const shuffleArr = (a: string[]) => { const x = [...a]; for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1));[x[k], x[j]] = [x[j], x[k]] } return x }
  const shuffleOptions = (i: number) => setDraft((d) => d ? { ...d, lines: d.lines.map((ln, j) => j === i ? { ...ln, options: shuffleArr((ln.options ?? ['', '', '', '']).slice(0, 4)) } : ln) } : d)
  const shuffleAll = () => setDraft((d) => d ? { ...d, lines: d.lines.map((ln) => ln.blank_answer ? { ...ln, options: shuffleArr((ln.options ?? ['', '', '', '']).slice(0, 4)) } : ln) } : d)
  const addLine = () => setDraft((d) => d ? { ...d, lines: [...d.lines, emptyLine()] } : d)
  const removeLine = (i: number) => setDraft((d) => d ? { ...d, lines: d.lines.filter((_, j) => j !== i) } : d)
  const moveLine = (i: number, dir: -1 | 1) => setDraft((d) => {
    if (!d) return d
    const j = i + dir
    if (j < 0 || j >= d.lines.length) return d
    const lines = [...d.lines];[lines[i], lines[j]] = [lines[j], lines[i]]
    return { ...d, lines }
  })

  const sceneErrors = useMemo(() => {
    if (!draft) return [] as string[]
    return draft.lines.flatMap((ln, i) => auditLine(ln, senseIds).map((w) => `Line ${i + 1}: ${w}`))
  }, [draft, senseIds])

  const save = async () => {
    if (!draft || !lesson) return
    setSaving(true); setMsg('')
    const res = await authFetch('/api/admin/vocab-scenes', {
      method: 'POST',
      body: JSON.stringify({
        lessonId: lesson.id,
        scene: { id: draft.id, goal: draft.goal, order_index: draft.order_index, title_en: draft.title_en, title_ja: draft.title_ja, setting: draft.setting, npc_role: draft.npc_role, published: draft.published },
        lines: draft.lines.map((ln) => ({
          speaker: ln.speaker, text_en: ln.text_en, text_ja: ln.text_ja,
          blank_answer: ln.blank_answer || null,
          blank_sense_id: ln.blank_answer ? (ln.blank_sense_id || null) : null,
          options: ln.blank_answer ? (ln.options ?? []).map((o) => o.trim()).filter(Boolean) : null,
          note: ln.note,
        })),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(`Error: ${data.error}`); return }
    setMsg('Saved ✓')
    await loadDetail(lesson.id)
    if (sceneKey === 'new' && data.sceneId) setSceneKey(data.sceneId)
  }

  const del = async () => {
    if (!draft?.id) return
    if (!confirm('Delete this scene?')) return
    const res = await authFetch(`/api/admin/vocab-scenes?sceneId=${draft.id}`, { method: 'DELETE' })
    if (res.ok) { setSceneKey('new'); await loadDetail(lessonId); setMsg('Deleted') }
  }

  if (!isAdmin) return <div style={S.wrap}><p>Not authorized.</p></div>

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Vocab scene editor</h1>
      <p style={S.sub}>Local admin tool · edits write straight to the database.</p>

      {loading ? <p>Loading…</p> : (
        <>
          <div style={S.row}>
            <label style={S.lbl}>Lesson
              <select value={lessonId} onChange={(e) => { setLessonId(e.target.value); setSceneKey('') }} style={S.select}>
                <option value="">— select —</option>
                {lessonGroups.map(([label, ls]) => (
                  <optgroup key={label} label={`${label} (${ls.length})`}>
                    {ls.map((l) => <option key={l.id} value={l.id}>{l.slug} · {l.title_en}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {lesson && (
              <label style={S.lbl}>Scene
                <select value={sceneKey} onChange={(e) => setSceneKey(e.target.value)} style={S.select}>
                  <option value="">— select —</option>
                  {lesson.scenes.map((s) => <option key={s.id} value={s.id}>{s.goal} · {s.title_en}</option>)}
                  <option value="new">+ New scene</option>
                </select>
              </label>
            )}
          </div>

          {lesson && (
            <p style={S.senseHint}>Lesson words: {lesson.senses.map((s) => s.headword).join(', ') || '—'}</p>
          )}

          {draft && (
            <>
              <div style={S.metaGrid}>
                <label style={S.lbl}>Goal
                  <select value={draft.goal ?? ''} onChange={(e) => setDraft({ ...draft, goal: e.target.value || null })} style={S.select}>
                    {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
                <label style={S.lbl}>Title (EN)<input value={draft.title_en} onChange={(e) => setDraft({ ...draft, title_en: e.target.value })} style={S.input} /></label>
                <label style={S.lbl}>Title (JA)<input value={draft.title_ja} onChange={(e) => setDraft({ ...draft, title_ja: e.target.value })} style={S.input} /></label>
                <label style={S.lbl}>Setting<input value={draft.setting ?? ''} onChange={(e) => setDraft({ ...draft, setting: e.target.value })} style={S.input} /></label>
                <label style={S.lbl}>NPC role<input value={draft.npc_role ?? ''} onChange={(e) => setDraft({ ...draft, npc_role: e.target.value })} style={S.input} /></label>
                <label style={{ ...S.lbl, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Published
                </label>
              </div>

              <div style={{ marginTop: 16 }}>
                {draft.lines.map((ln, i) => {
                  const warns = auditLine(ln, senseIds)
                  const isBlank = !!ln.blank_answer
                  return (
                    <div key={i} style={{ ...S.lineCard, borderColor: warns.length ? '#e0a63d' : '#e3e3e6' }}>
                      <div style={S.lineTop}>
                        <span style={S.lineNo}>{i + 1}</span>
                        <select value={ln.speaker} onChange={(e) => setLine(i, { speaker: e.target.value as 'user' | 'npc' })} style={S.selectSm}>
                          <option value="user">user (you)</option>
                          <option value="npc">npc</option>
                        </select>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => moveLine(i, -1)} style={S.iconBtn}>↑</button>
                        <button onClick={() => moveLine(i, 1)} style={S.iconBtn}>↓</button>
                        <button onClick={() => removeLine(i)} style={{ ...S.iconBtn, color: '#c0392b' }}>✕</button>
                      </div>
                      <textarea value={ln.text_en} onChange={(e) => setLine(i, { text_en: e.target.value })} placeholder="English. {Word} = blank · {{user_name}} = name · {{a_profession}} = a/an + job · {{profession}} = job" style={S.textarea} rows={2} />
                      <textarea value={ln.text_ja ?? ''} onChange={(e) => setLine(i, { text_ja: e.target.value })} placeholder="Japanese" style={{ ...S.textarea, background: '#fafafa' }} rows={1} />
                      <div style={S.blankRow}>
                        <label style={S.lblSm}>Blank answer
                          <input value={ln.blank_answer ?? ''} onChange={(e) => setLine(i, { blank_answer: e.target.value })} placeholder="(leave empty = play line)" style={S.inputSm} />
                        </label>
                        {isBlank && (
                          <label style={S.lblSm}>Teaches (sense)
                            <select value={ln.blank_sense_id ?? ''} onChange={(e) => setLine(i, { blank_sense_id: e.target.value })} style={S.selectSm}>
                              <option value="">— sense —</option>
                              {(lesson?.senses ?? []).map((s) => <option key={s.id} value={s.id}>{s.headword} ({s.gloss_ja})</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                      {isBlank && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Options (green = answer)</span>
                            <button type="button" onClick={() => shuffleOptions(i)} style={S.shuffleBtn}>🔀 Shuffle</button>
                          </div>
                          <div style={S.optsRow}>
                            {[0, 1, 2, 3].map((oi) => (
                              <input key={oi} value={(ln.options ?? [])[oi] ?? ''} onChange={(e) => setOption(i, oi, e.target.value)}
                                placeholder={`option ${oi + 1}`}
                                style={{ ...S.inputSm, borderColor: (ln.options ?? [])[oi]?.trim() === ln.blank_answer ? '#2aa775' : '#ddd' }} />
                            ))}
                          </div>
                        </>
                      )}
                      {warns.length > 0 && <div style={S.warn}>⚠ {warns.join(' · ')}</div>}
                    </div>
                  )
                })}
                <button onClick={addLine} style={S.addBtn}>+ Add line</button>
              </div>

              <div style={S.footer}>
                <div style={{ flex: 1 }}>
                  {sceneErrors.length > 0
                    ? <span style={{ color: '#c0392b' }}>{sceneErrors.length} issue(s) — {sceneErrors[0]}{sceneErrors.length > 1 ? ' …' : ''}</span>
                    : <span style={{ color: '#2aa775' }}>No issues ✓</span>}
                  {msg && <span style={{ marginLeft: 12, color: '#555' }}>{msg}</span>}
                </div>
                <button onClick={shuffleAll} style={{ ...S.btn, background: '#fff', color: '#1a1a1a', borderColor: '#ddd' }}>🔀 Shuffle all</button>
                {draft.id && <button onClick={del} style={{ ...S.btn, background: '#fff', color: '#c0392b', borderColor: '#e3b1ab' }}>Delete scene</button>}
                <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save scene'}</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

const S: Record<string, CSSProperties> = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#1a1a1a' },
  h1: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { color: '#777', marginTop: 4, marginBottom: 20, fontSize: 14 },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  lbl: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#555', fontWeight: 600 },
  lblSm: { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: '#666', fontWeight: 600, flex: 1 },
  select: { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 220 },
  selectSm: { padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 },
  input: { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  inputSm: { padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' },
  senseHint: { fontSize: 12, color: '#888', marginTop: 10 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, padding: 16, background: '#f7f7f8', borderRadius: 12 },
  lineCard: { border: '1px solid #e3e3e6', borderRadius: 12, padding: 12, marginBottom: 10, background: '#fff' },
  lineTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  lineNo: { width: 22, height: 22, borderRadius: 11, background: '#eee', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  textarea: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', marginBottom: 6, boxSizing: 'border-box' },
  blankRow: { display: 'flex', gap: 10, marginTop: 4 },
  optsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6 },
  shuffleBtn: { fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer' },
  warn: { marginTop: 8, fontSize: 12, color: '#a06a1b', background: '#fdf5e6', padding: '6px 8px', borderRadius: 6 },
  iconBtn: { border: '1px solid #ddd', background: '#fff', borderRadius: 6, width: 28, height: 26, cursor: 'pointer', fontSize: 13 },
  addBtn: { border: '1px dashed #bbb', background: '#fafafa', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, width: '100%' },
  footer: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, position: 'sticky', bottom: 0, background: '#fff', paddingTop: 12, borderTop: '1px solid #eee' },
  btn: { padding: '10px 18px', borderRadius: 999, border: '1px solid #1a1a1a', background: '#1a1a1a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
