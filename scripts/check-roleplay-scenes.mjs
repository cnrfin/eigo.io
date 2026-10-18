#!/usr/bin/env node
/**
 * Checks every role-play scene (src/lib/roleplay/scenes/<category>/*.json) against the format in
 * src/lib/roleplay/types.ts and the rules in docs/roleplay-authoring.md.
 *   npm run check:roleplay            all scenes
 *   npm run check:roleplay -- travel  one category
 * Exits 1 if there are errors. Warnings are printed but don't fail.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scenesDir = join(root, 'src/lib/roleplay/scenes')
const CATEGORIES = ['travel', 'help', 'service', 'friends', 'business']
const only = process.argv[2]

const JA = /[぀-ヿ一-鿿]/
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TASK_ID = /^[a-z][a-z0-9-]*$/
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
// the same normalising the classroom uses for prop keys (normText in src/lib/ai-tutor/actions.ts)
const norm = (t) => t.toLowerCase().normalize('NFKC').replace(/[’'`"“”「」『』]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const str = (v) => typeof v === 'string' && v.trim().length > 0

// prop keys that light rows up on unrelated sentences ("video call", "check in", "by card")
const COMMON = new Set(['the', 'a', 'an', 'and', 'or', 'it', 'this', 'that', 'here', 'there', 'you', 'we', 'i', 'yes', 'no', 'ok', 'okay', 'time', 'day', 'today', 'now', 'call', 'video', 'check', 'change', 'more', 'one', 'two', 'three', 'first', 'next', 'last', 'new', 'good', 'great', 'nice', 'please', 'thanks', 'thank you', 'hello', 'hi', 'sorry'])

let errors = 0
let warnings = 0
const ids = new Map()
const counts = {}

for (const cat of CATEGORIES) {
  if (only && only !== cat) continue
  const dir = join(scenesDir, cat)
  if (!existsSync(dir)) {
    console.log(`✗ missing folder: scenes/${cat}`)
    errors++
    continue
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  counts[cat] = files.length
  const indexSrc = existsSync(join(dir, 'index.ts')) ? readFileSync(join(dir, 'index.ts'), 'utf8') : ''
  if (!indexSrc) {
    console.log(`✗ scenes/${cat}/index.ts is missing`)
    errors++
  }
  // every file listed in the folder's index.ts, and nothing listed that isn't there
  for (const f of files) if (!indexSrc.includes(`'./${f}'`)) report(`${cat}/${f}`, `not imported in scenes/${cat}/index.ts`)
  for (const m of indexSrc.matchAll(/from '\.\/([^']+\.json)'/g)) if (!files.includes(m[1])) report(`${cat}/index.ts`, `imports ${m[1]}, which doesn't exist`)

  for (const f of files) {
    const where = `${cat}/${f}`
    let s
    try {
      s = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    } catch (e) {
      report(where, `not valid JSON: ${e.message}`)
      continue
    }
    checkScene(s, cat, f, where)
  }
}

function report(where, msg) {
  console.log(`✗ ${where}: ${msg}`)
  errors++
}
function warn(where, msg) {
  console.log(`! ${where}: ${msg}`)
  warnings++
}
function ja(v, where, what) {
  if (!v || !str(v.ja) || !str(v.en)) return report(where, `${what} needs both "ja" and "en"`)
  if (!JA.test(v.ja)) report(where, `${what}.ja should be in Japanese`)
  if (JA.test(v.en)) report(where, `${what}.en should be in English`)
}

function checkTask(t, where, seen) {
  if (!t || typeof t !== 'object') return report(where, 'task is not an object')
  if (!TASK_ID.test(t.id ?? '')) report(where, `task id "${t.id}" should be lower case, e.g. "order"`)
  if (seen.has(t.id)) report(where, `task id "${t.id}" is used twice in this level`)
  seen.add(t.id)
  ja(t.title, `${where} task "${t.id}"`, 'title')
  if (t.title?.en && words(t.title.en) > 7) warn(`${where} task "${t.id}"`, 'title.en is long: keep it a short instruction ("Ask the size")')
  const h = t.hints
  if (!Array.isArray(h) || h.length !== 3 || !h.every(str)) return report(`${where} task "${t.id}"`, 'hints must be exactly 3 strings: [Japanese instruction, English starter with …, full English sentence]')
  if (!JA.test(h[0])) report(`${where} task "${t.id}"`, 'hint 1 must be Japanese (what to do)')
  if (JA.test(h[1]) || !(h[1].includes('…') || h[1].includes(' / '))) report(`${where} task "${t.id}"`, 'hint 2 must be an English starter with … ("Could I get a …?") or a choice with / ("Card / Cash, please.")')
  if (JA.test(h[2])) report(`${where} task "${t.id}"`, 'hint 3 must be the full sentence in English')
  else if (!/[.?!]$/.test(h[2].trim())) report(`${where} task "${t.id}"`, 'hint 3 should end with . ? or !')
  else if (h[2].includes('…')) report(`${where} task "${t.id}"`, 'hint 3 is the full sentence: no …')
  if (words(h[2]) > 22) warn(`${where} task "${t.id}"`, 'hint 3 is long (over 22 words)')
}

function checkScene(s, cat, file, where) {
  const id = file.replace(/\.json$/, '')
  if (s.id !== id) report(where, `id "${s.id}" must match the file name "${id}"`)
  if (!ID.test(id)) report(where, 'file name / id should be kebab-case, e.g. "hotel-check-in"')
  if (ids.has(s.id)) report(where, `id "${s.id}" is also used by ${ids.get(s.id)}`)
  ids.set(s.id, where)
  if (s.category !== cat) report(where, `category "${s.category}" must be "${cat}" (its folder)`)
  ja(s.title, where, 'title')
  ja(s.summary, where, 'summary')
  if (s.summary?.ja && s.summary.ja.length > 60) warn(where, 'summary.ja is long (over 60 characters): it is one line in the picker')
  if (!str(s.setting) || JA.test(s.setting)) report(where, 'setting must be English text (for the AI tutor)')
  // the setting goes to the AI tutor whichever role the student plays, so it can't say what "the student" does or is
  else if (/\b(the )?student'?s?\b/i.test(s.setting)) report(where, 'setting mentions "the student": it is used in both roles, so name the characters instead ("Emma calls a Japanese friend…")')
  if (typeof s.image !== 'string') report(where, 'image must be a string ("" until the picture is added)')
  else if (s.image) {
    if (!/^\/roleplay\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(s.image)) report(where, `image "${s.image}" should be like "/roleplay/${id}.jpg"`)
    else if (!existsSync(join(root, 'public', s.image))) report(where, `image file public${s.image} doesn't exist (use "" until it's added)`)
  }
  if (s.studentRole !== 'a' && s.studentRole !== 'b') report(where, 'studentRole must be "a" or "b"')
  if (!Array.isArray(s.roles) || s.roles.length !== 2) return report(where, 'roles must have exactly 2 roles')
  const rids = s.roles.map((r) => r?.id).sort().join(',')
  if (rids !== 'a,b') report(where, 'the two roles must have ids "a" and "b"')
  for (const r of s.roles) {
    const rw = `${where} role ${r?.id}`
    ja(r?.name, rw, 'name')
    // after a swap the AI tutor plays this role ("You play: <name>"), so a role can't be called "You"
    if (/^\s*you\b/i.test(r?.name?.en ?? '') || /^\s*あなた/.test(r?.name?.ja ?? '')) report(rw, `name "${r?.name?.ja} / ${r?.name?.en}" reads wrong when the AI plays this role after a swap: describe the character ("日本人の友だち / Japanese friend")`)
    if (!str(r?.persona) || JA.test(r.persona)) report(rw, 'persona must be English text (for the AI tutor)')
    if (!Array.isArray(r?.levels) || r.levels.length !== 3) {
      report(rw, 'levels must have exactly 3 levels (初級, 中級, 上級)')
      continue
    }
    r.levels.forEach((L, i) => {
      const lw = `${rw} level ${i + 1}`
      if (!str(L?.tutor) || L.tutor.length < 40) report(lw, 'tutor: how the AI tutor plays its character at this level (a few sentences, English)')
      const [min, max] = i === 0 ? [3, 4] : [4, 5]
      if (!Array.isArray(L?.tasks) || L.tasks.length < min || L.tasks.length > max) report(lw, `needs ${min}–${max} tasks (has ${L?.tasks?.length ?? 0})`)
      const seen = new Set()
      for (const t of L?.tasks ?? []) checkTask(t, lw, seen)
      if (L?.twist) {
        if (i !== 2) report(lw, 'a twist only goes at 上級 (level 3)')
        if (!(L.tasks ?? []).some((t) => t.id === L.twist.after)) report(lw, `twist.after "${L.twist.after}" isn't one of this level's task ids`)
        if (L.twist.after === L.tasks?.[L.tasks.length - 1]?.id) warn(lw, 'twist.after is the last task: the twist should happen mid-scene')
        if (!str(L.twist.tutor)) report(lw, 'twist.tutor: what the AI tutor does to cause the twist (English)')
        checkTask(L.twist.task, `${lw} twist`, seen)
      }
    })
  }
  if (s.prop !== undefined) {
    const p = s.prop
    ja(p?.label, where, 'prop.label')
    if (!str(p?.title)) report(where, 'prop.title is needed (e.g. the café name)')
    if (!Array.isArray(p?.sections) || !p.sections.length) report(where, 'prop.sections needs at least one section')
    for (const sec of p?.sections ?? []) {
      if (!str(sec?.heading)) report(where, 'every prop section needs a heading')
      if (!Array.isArray(sec?.items) || !sec.items.length || !sec.items.every((x) => str(x?.name))) report(where, `prop section "${sec?.heading}" needs items with a name`)
    }
    // keys light the rows up when they're said (src/lib/roleplay/prop.ts): whole phrases, "|" between spellings
    const keys = []
    for (const it of (p?.sections ?? []).flatMap((sec) => sec?.items ?? [])) {
      if (it?.key === undefined) {
        warn(where, `prop item "${it?.name}" has no key: it lights up only on the first word of its name`)
        continue
      }
      if (typeof it.key !== 'string' || !it.key.trim()) {
        report(where, `prop item "${it?.name}": key must be a word or phrase`)
        continue
      }
      for (const alt of it.key.split('|')) {
        const k = norm(alt)
        if (k.length < 2) report(where, `prop item "${it.name}": key "${alt}" is too short to match`)
        else if (/^\d{1,2}$/.test(k)) warn(where, `prop item "${it.name}": key "${alt}" is just "${k}", which lights up on any ${k} ("${k} minutes", "the ${k}th"): use the phrase people say ("${k} dollars", "${k} percent")`)
        else if (COMMON.has(k)) warn(where, `prop item "${it.name}": key "${alt}" is a common word that comes up in other sentences: use a phrase that's only said about this item`)
        else keys.push({ k, name: it.name })
      }
    }
    for (const a of keys)
      for (const b of keys)
        if (a !== b && a.name !== b.name && (a.k === b.k || ` ${b.k} `.includes(` ${a.k} `)))
          report(where, `prop items "${a.name}" and "${b.name}": key "${a.k}" also matches "${b.k}", so both would light up`)
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0)
console.log(`\n${Object.entries(counts).map(([c, n]) => `${c}: ${n}`).join('  ·  ')}  ·  total: ${total}`)
console.log(errors ? `✗ ${errors} error(s), ${warnings} warning(s)` : `✓ all scenes OK${warnings ? ` (${warnings} warning(s))` : ''}`)
process.exit(errors ? 1 : 0)
