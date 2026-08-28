// Compare LLM models on the Teri "converse" task, side by side.
//
//   OPENAI_API_KEY=sk-... node scripts/compare-converse-models.mjs
//   OPENAI_API_KEY=sk-... node scripts/compare-converse-models.mjs gpt-5.4-mini gpt-5.6-luna
//
// Runs the SAME converse prompt through each model across a handful of
// representative conversation states, then reports per model: JSON validity,
// rule adherence heuristics (no em dash/colon, answered a learner question,
// stayed on-thread), latency, token usage and $ cost. Nothing is written to
// the DB. Use it to decide which model to run in production.

import OpenAI from 'openai'
import { writeFileSync } from 'node:fs'

const MODELS = process.argv.slice(2).length ? process.argv.slice(2) : ['gpt-5.6-luna']

// $ per 1M tokens (input, output). Update if pricing changes.
const PRICING = {
  'gpt-5.4-mini': { in: 0.75, out: 4.50 },
  'gpt-5.6-luna': { in: 0.20, out: 1.20 },
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) { console.error('Set OPENAI_API_KEY'); process.exit(1) }
const openai = new OpenAI({ apiKey })

const MAX_TURNS = 5
const VARIANTS = [
  { key: 'full', build: buildSystem },
  { key: 'lean', build: buildSystemLean },
]

// Mirrors the production converse system prompt (keep in rough sync with
// src/app/api/memory/converse/route.ts). Identical for every model, which is
// all that matters for a fair A/B.
function buildSystem({ learner, level, words }) {
  return (
    'You are Teri, a warm, curious teacup mascot having a friendly spoken conversation with a Japanese person learning English, about a personal memory (a photo they shared). ' +
    (learner ? 'Here is what you already know about this learner: ' + learner + ' ' : '') +
    'Ask ONE short, natural question at a time and ADAPT it to what they just told you. Build each question directly on their last answer; refer back to earlier answers when natural. ' +
    'Draw your questions from what is actually in the photo (who / what / where / when / why / how). ' +
    'If the learner asks YOU something, answer it warmly in character first, then stay on that thread and reciprocate their curiosity. Do not snap back to the photo the same turn they asked you something. ' +
    `Keep the chat to about ${MAX_TURNS} questions with a gentle arc, then wrap up warmly. ` +
    'Before the question, give a SHORT warm reaction. Keep reactions varied. ' +
    'Provide THREE predicted replies the learner could plausibly give, natural spoken English, each distinct and short. ' +
    (words?.length ? 'The learner is learning these photo words: ' + words.join(', ') + '. Weave one into a reply ONLY when it fits the current topic; never force it. ' : '') +
    `Match the learner's CEFR level (${level}). ` +
    'PUNCTUATION: write like a real text. No em dashes, en dashes, colons or semicolons in the English fields. Use commas and periods. ' +
    'Return ONLY JSON of this exact shape: ' +
    '{ "done": boolean, "reaction": { "en": string, "ja": string }, "question": { "en": string, "ja": string }, "replies": [ { "en": string, "ja": string, "gap": [ { "term": string, "gloss": string, "pos": string } ] } ] }. ' +
    'No markdown, no text outside the JSON.'
  )
}

// Subtractive variant: a handful of priority-phrased instructions, no stacked
// NEVER/CRITICAL rules. Per OpenAI's GPT-5.6 guidance, shorter prompts often score
// higher on this family. Same task, same JSON shape.
function buildSystemLean({ learner, level, words }) {
  return (
    'You are Teri, a warm, curious teacup having a friendly, text-style chat with a Japanese person learning English about a photo they shared. ' +
    (learner ? 'You remember this about them: ' + learner + ' ' : '') +
    'You do not need to react every turn, and often it is more natural to just ask your question with no comment at all. React only when you genuinely have something to add, and when you do, keep it short and human, a real response to what they said (agreement, a quick feeling, light surprise, or curiosity), never a description of the photo or a restatement of their answer. Look at the reactions you have already given earlier in this chat and open this one differently, do not start two reactions the same way. Use only word pairings a native speaker would really say (a smell is not "warm"). Then ask ONE short, natural question. Build it on what they just said, and draw fresh angles from the photo (who, what, where, when, why, how), preferring angles you have not asked about yet. ' +
    'If they ask you something, answer it warmly first, then stay on that thread. ' +
    'Follow their lead: if they move to a new topic, go with them and ask about it. But if they give two turns in a row without asking you anything and without adding real new detail, the thread has gone quiet, so quietly move back to the photo with a fresh question about it (no announcement, just ask). If the photo has also gone quiet like that, or you have covered it well, wrap up warmly and set done to true. ' +
    'Let lively chats keep going and end flat ones sooner. Never go past about 20 questions. ' +
    (words?.length ? 'They are learning these photo words: ' + words.join(', ') + '. Use one in a reply only when it fits naturally. ' : '') +
    'Write English like a real text message: no emojis, and no dashes, colons or semicolons. Keep it at CEFR level ' + level + '. ' +
    'Also give three short, distinct replies the learner might say. ' +
    'Return only JSON: { "done": boolean, "reaction": { "en": string, "ja": string }, "question": { "en": string, "ja": string }, "replies": [ { "en": string, "ja": string, "gap": [ { "term": string, "gloss": string, "pos": string } ] } ] }. Japanese fields are natural translations. Each reply gap has up to 2 useful words, or [].'
  )
}

// ── engagement signal (deterministic dryness detection) ──────────────────────
// We compute whether the learner (a) just asked Teri something, or (b) has gone
// quiet (two flat turns: short, no question, no new detail), and hand the model a
// crisp directive. Keeps the fuzzy judgment out of the prompt.
const countWords = (s) => (String(s || '').match(/[a-z0-9']+/gi) || []).length
const hasQuestion = (s) => /\?/.test(String(s || ''))
const DISENGAGED = /(i (don'?t|do not) know|not sure|it'?s fine|it was fine|nothing much|nothing really|no idea|dunno|i guess|maybe$)/i
const isFlat = (a) => !hasQuestion(a) && (countWords(a) <= 4 || DISENGAGED.test(String(a || '')))

function engagementDirective(history) {
  if (!history.length) return ''
  const latest = history[history.length - 1].a
  if (hasQuestion(latest)) {
    return 'NOTE: The learner just asked you a question. Answer it warmly in character, then ask a question that stays on this same thread. Do not switch back to the photo this turn.'
  }
  const last2 = history.slice(-2)
  if (last2.length === 2 && last2.every((h) => isFlat(h.a))) {
    return 'NOTE: The learner has gone quiet (two short turns, no question, no new detail). If the conversation has drifted away from the photo, return to it now with one fresh question about the photo. If you are already talking about the photo, warmly wrap up: set done to true, put your warm closing line in the question field (not reaction), and use an empty replies array.'
  }
  return ''
}

function buildUser({ context, level, words, history }) {
  const convo = history.length
    ? history.map((h) => `Teri: ${h.q}\nLearner: ${h.a}`).join('\n')
    : '(not started yet, ask your first question about the photo)'
  const directive = engagementDirective(history)
  return (
    `Memory: ${context}\n` +
    `Learner level: ${level}\n` +
    (words?.length ? `Words the learner is learning: ${words.join(', ')}\n` : '') +
    `Questions asked so far: ${history.length}\n\n` +
    `Conversation so far:\n${convo}\n\n` +
    (directive ? directive + '\n\n' : '') +
    'Give the next turn as JSON.'
  )
}

// Representative conversation states covering the tricky cases.
const SCENARIOS = [
  {
    name: 'opening (fresh photo)', goal: 'Open naturally on the photo.',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'A2', words: ['matcha', 'greenery', 'cafe', 'calming'], learner: '', history: [],
  },
  {
    name: 'on-topic follow-up (should build on answer)', goal: "Build on the learner's answer.",
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'A2', words: ['matcha', 'greenery', 'cafe', 'calming'], learner: '',
    history: [{ q: "Who's that with you in the photo?", a: "That's my mum. We go there every weekend." }],
  },
  {
    name: 'learner asks Teri a question (must answer + reciprocate)', goal: 'Answer it AND reciprocate, do not snap back to the photo.',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'A2', words: ['matcha', 'greenery', 'cafe'], learner: '',
    history: [
      { q: "Who's that with you?", a: "My mum. Do you like coffee, Teri?" },
    ],
  },
  {
    name: 'tangent gone dry (should ease back to photo, silently)', goal: 'Ease back to the photo silently.',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'B1', words: ['matcha', 'greenery', 'cafe'], learner: '',
    history: [
      { q: "Who's that with you?", a: "My mum." },
      { q: "Do you like movies?", a: "Yes." },
      { q: "What kind?", a: "Action." },
    ],
  },
  {
    name: 'near end (should wrap up warmly)', goal: 'Learner is still warm and substantive, so under adaptive length continuing is fine; wrapping is also acceptable.',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'A2', words: ['matcha', 'greenery', 'cafe'], learner: '',
    history: [
      { q: "Who's that with you?", a: "My mum." },
      { q: "What did you order?", a: "A matcha latte." },
      { q: "How was it?", a: "Really nice and calming." },
      { q: "What was the best part?", a: "Just relaxing with my mum." },
    ],
  },
  {
    name: 'engaged tangent (should KEEP following, not return)',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'B1', words: ['matcha', 'greenery', 'cafe'], learner: '',
    goal: 'Learner is asking questions and adding detail, so Teri should answer and stay on the tangent, NOT pivot to the photo.',
    history: [
      { q: "Who's that with you?", a: "My mum. Do you like tea, Teri?" },
      { q: "I love tea, especially green tea! Do you drink it a lot?", a: "Yes, every morning. What is your favourite kind, Teri?" },
    ],
  },
  {
    name: 'tangent went quiet (2 flat turns, should return to photo)',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'A2', words: ['matcha', 'greenery', 'cafe'], learner: '',
    goal: 'Learner gave two flat turns with no question and no new detail, so Teri should quietly return to the photo (no announcement).',
    history: [
      { q: "Who's that with you?", a: "My mum." },
      { q: "Do you watch movies?", a: "Yes." },
      { q: "What kind do you like?", a: "Action." },
    ],
  },
  {
    name: 'photo went quiet (should wrap up, done=true)',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'A2', words: ['matcha', 'greenery', 'cafe'], learner: '',
    goal: 'The learner is flat and disengaged on the photo itself for two turns, so Teri should wrap up warmly with done=true.',
    history: [
      { q: "Who's that with you?", a: "My mum." },
      { q: "What did you order?", a: "Matcha." },
      { q: "How was it?", a: "Good." },
      { q: "What was the best part of the visit?", a: "I don't know. It was fine." },
    ],
  },
  {
    name: 'deep but lively (should keep going, not wrap early)',
    context: 'a cozy cafe full of greenery, the learner had a matcha latte with their mum',
    level: 'B1', words: ['matcha', 'greenery', 'cafe'], learner: '',
    goal: 'Six turns in but the learner is still adding rich detail, so Teri should keep the conversation going, not wrap prematurely.',
    history: [
      { q: "Who's that with you?", a: "My mum. It is our special weekend spot." },
      { q: "That sounds lovely, what makes it special?", a: "We started going after my dad passed away. It became our time together." },
      { q: "That is really touching. What do you usually talk about?", a: "Everything. Her garden, my work, old memories of holidays." },
      { q: "Her garden sounds nice, what does she grow?", a: "Tomatoes and herbs, and lots of flowers. She loves it." },
      { q: "What is your favourite thing she grows?", a: "The basil, because we cook with it together on Sundays." },
    ],
  },
]

const hasBadPunct = (s) => /[—–:;]/.test(s || '')
const hasEmoji = (s) => /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}]/u.test(s || '')

function evalTurn(scn, obj) {
  const issues = []
  if (typeof obj.done !== 'boolean') issues.push('done not boolean')
  if (!obj.question?.en) issues.push('missing question.en')
  const replies = Array.isArray(obj.replies) ? obj.replies : []
  if (!obj.done && replies.length !== 3) issues.push(`replies=${replies.length} (want 3)`)
  const allText = [obj.reaction?.en, obj.question?.en, ...replies.map((r) => r?.en)].filter(Boolean)
  if (allText.some(hasBadPunct)) issues.push('em dash/colon/semicolon in EN')
  if (allText.some(hasEmoji)) issues.push('emoji in EN')
  // heuristic: when the learner asked a question, the reaction should answer it
  if (scn.name.includes('learner asks') && !(obj.reaction?.en || '').trim()) issues.push('no reaction to answer learner')
  return issues
}

function cost(model, usage) {
  const p = PRICING[model]
  if (!p || !usage) return null
  return (usage.prompt_tokens / 1e6) * p.in + (usage.completion_tokens / 1e6) * p.out
}

async function runOne(model, variant, scn) {
  const messages = [
    { role: 'system', content: variant.build(scn) },
    { role: 'user', content: buildUser(scn) },
  ]
  // Start with our preferred knobs, then strip any the model rejects (temperature is
  // locked on GPT-5-era models; reasoning_effort is unsupported on older ones). This
  // makes the harness robust across model generations and runs each at low reasoning
  // so Luna behaves the cheap/fast way we'd deploy it.
  let params = { model, messages, response_format: { type: 'json_object' }, max_completion_tokens: 700, temperature: 0.7, reasoning_effort: 'low' }
  const used = { temp: '0.7', effort: 'low' }
  const t0 = Date.now()
  try {
    let res
    for (let attempt = 0; attempt < 4; attempt++) {
      try { res = await openai.chat.completions.create(params); break }
      catch (e) {
        const m = e?.message || ''
        if (/temperature/i.test(m) && 'temperature' in params) { delete params.temperature; used.temp = 'default'; continue }
        if (/reasoning|effort/i.test(m) && 'reasoning_effort' in params) { delete params.reasoning_effort; used.effort = 'n/a'; continue }
        throw e
      }
    }
    if (!res) throw new Error('no response after param fallbacks')
    const ms = Date.now() - t0
    const raw = res.choices[0]?.message?.content ?? '{}'
    let obj, jsonOk = true
    try { obj = JSON.parse(raw) } catch { jsonOk = false; obj = {} }
    const issues = jsonOk ? evalTurn(scn, obj) : ['invalid JSON']
    return { ms, temp: used.temp, effort: used.effort, usage: res.usage, cost: cost(model, res.usage), jsonOk, issues, obj }
  } catch (err) {
    return { error: err?.message || String(err) }
  }
}

const line = (s = '') => console.log(s)
;(async () => {
  const totals = {}
  const report = []
  const combos = []
  for (const model of MODELS) for (const v of VARIANTS) {
    const key = `${model} [${v.key}]`
    combos.push({ model, variant: v, key })
    totals[key] = { ms: 0, cost: 0, calls: 0, clean: 0, jsonOk: 0 }
  }

  for (const scn of SCENARIOS) {
    line('\n' + '='.repeat(72))
    line('SCENARIO: ' + scn.name)
    if (scn.history.length) line('  last learner said: "' + scn.history[scn.history.length - 1].a + '"')
    line('='.repeat(72))
    for (const combo of combos) {
      const r = await runOne(combo.model, combo.variant, scn)
      report.push({ scn: scn.name, goal: scn.goal || '', last: scn.history.length ? scn.history[scn.history.length - 1].a : '', combo: combo.key, r })
      line('\n  ▸ ' + combo.key)
      if (r.error) { line('    ERROR: ' + r.error); continue }
      const t = totals[combo.key]
      t.calls++; t.ms += r.ms; t.cost += r.cost || 0
      if (r.jsonOk) t.jsonOk++
      if (r.jsonOk && r.issues.length === 0) t.clean++
      line('    reaction: ' + (r.obj.reaction?.en ?? '—'))
      line('    question: ' + (r.obj.question?.en ?? '—') + (r.obj.done ? '   [done=true]' : ''))
      const reps = Array.isArray(r.obj.replies) ? r.obj.replies : []
      reps.forEach((rp, i) => line(`      reply ${i + 1}: ${rp.en}${rp.gap?.length ? '   {' + rp.gap.map((g) => g.term).join(', ') + '}' : ''}`))
      line(`    JSON: ${r.jsonOk ? 'ok' : 'INVALID'}   issues: ${r.issues.length ? r.issues.join('; ') : 'none'}`)
      line(`    ${r.ms}ms   temp ${r.temp}   effort ${r.effort}   tokens ${r.usage?.prompt_tokens}->${r.usage?.completion_tokens}   $${(r.cost ?? 0).toFixed(5)}`)
    }
  }

  line('\n' + '#'.repeat(72))
  line('SUMMARY  (' + SCENARIOS.length + ' scenarios each; full = current verbose prompt, lean = subtractive)')
  line('#'.repeat(72))
  for (const combo of combos) {
    const t = totals[combo.key]
    if (!t.calls) { line(`  ${combo.key}: no successful calls`); continue }
    line(`  ${combo.key.padEnd(26)}  clean ${t.clean}/${t.calls}   jsonOk ${t.jsonOk}/${t.calls}   avg ${Math.round(t.ms / t.calls)}ms   total $${t.cost.toFixed(5)}`)
  }
  line('\n"clean" = valid JSON AND no rule-heuristic issues (punctuation, reply count, answered learner).')
  line('Read the transcripts above for voice/naturalness — that part is a human judgement.')

  // also emit a readable HTML report
  const esc = (x) => String(x ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
  const accent = (c) => (c.includes('luna') && c.includes('lean')) ? '#FF7A00' : c.includes('luna') ? '#E86A45' : '#9aa0a6'
  const srows = combos.map((cb) => { const t = totals[cb.key]; if (!t.calls) return ''
    return `<tr><td>${esc(cb.key)}</td><td>${t.clean}/${t.calls}</td><td>${t.jsonOk}/${t.calls}</td><td>${Math.round(t.ms / t.calls)} ms</td><td>$${t.cost.toFixed(5)}</td></tr>` }).join('')
  const scnNames = [...new Set(report.map((x) => x.scn))]
  const sections = scnNames.map((name) => {
    const items = report.filter((x) => x.scn === name)
    const goal = items[0]?.goal, last = items[0]?.last
    const cards = items.map(({ combo, r }) => {
      if (r.error) return `<div class="card" style="--a:#c62b30"><div class="combo">${esc(combo)}</div><div class="flag bad">ERROR: ${esc(r.error)}</div></div>`
      const reps = (Array.isArray(r.obj.replies) ? r.obj.replies : []).map((rp) => `<li>${esc(rp.en)}${rp.gap?.length ? ` <span class=gap>${esc(rp.gap.map((g) => g.term).join(', '))}</span>` : ''}</li>`).join('')
      const flags = (r.issues?.length ? r.issues : ['clean']).map((f) => `<span class="flag ${f === 'clean' ? 'good' : 'warn'}">${esc(f)}</span>`).join('')
      const done = r.obj.done ? '<span class="done">done ✓</span>' : ''
      return `<div class="card" style="--a:${accent(combo)}"><div class="chd"><span class="combo">${esc(combo)}</span><span class="cost">$${(r.cost ?? 0).toFixed(5)} · ${r.usage?.prompt_tokens}→${r.usage?.completion_tokens}</span></div><div class="react">${esc(r.obj.reaction?.en)}</div><div class="q">${esc(r.obj.question?.en)} ${done}</div><ul class="reps">${reps}</ul><div class="flags">${flags}</div></div>`
    }).join('')
    return `<section class="scn"><h2>${esc(name)}</h2>${goal ? `<div class="goal">🎯 ${esc(goal)}</div>` : ''}${last ? `<div class="last">Learner just said: <em>"${esc(last)}"</em></div>` : ''}<div class="grid">${cards}</div></section>`
  }).join('')
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Converse model comparison</title><style>*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#faf8f6;color:#1d1c1a;line-height:1.45;padding:28px 20px 60px}.wrap{max-width:1080px;margin:0 auto}h1{font-size:23px;margin:0 0 4px}.sub{color:#7a746e;font-size:13px;margin-bottom:22px}table{width:100%;border-collapse:collapse;margin-bottom:30px;font-size:14px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #efeae4}th{background:#f3efe9;font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:#7a746e}.scn{margin-bottom:30px}.scn h2{font-size:17px;margin:0 0 4px}.goal{font-size:13px;color:#4a453f;background:#f1ede7;display:inline-block;padding:4px 10px;border-radius:8px;margin-bottom:6px}.last{font-size:13px;color:#7a746e;margin:2px 0 12px}.last em{color:#1d1c1a}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:720px){.grid{grid-template-columns:1fr}}.card{background:#fff;border-radius:12px;padding:13px 14px;border-left:4px solid var(--a);box-shadow:0 1px 3px rgba(0,0,0,.05)}.chd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.combo{font-weight:700;font-size:13px;color:var(--a)}.cost{font-size:11px;color:#9aa0a6}.react{font-size:13px;color:#7a746e;font-style:italic;margin-bottom:3px}.q{font-size:15px;font-weight:600;margin-bottom:7px}.done{font-size:11px;background:#2FBF71;color:#fff;padding:1px 6px;border-radius:6px;font-weight:600}.reps{margin:0 0 9px;padding-left:18px}.reps li{font-size:13px;margin:2px 0;color:#33302c}.gap{font-size:10px;background:#f0f7f0;color:#2c8a4a;border-radius:4px;padding:1px 5px;margin-left:4px}.flags{display:flex;flex-wrap:wrap;gap:5px}.flag{font-size:11px;padding:2px 7px;border-radius:6px;font-weight:600}.flag.good{background:#e6f7ee;color:#1a8a4f}.flag.warn{background:#fdf3e0;color:#b5731a}.flag.bad{background:#fdeaea;color:#c62b30}</style></head><body><div class="wrap"><h1>Teri “converse” — model &amp; prompt comparison</h1><div class="sub">${combos.length} combos × ${scnNames.length} scenarios · reasoning effort low · temperature default</div><table><thead><tr><th>Combo</th><th>Clean</th><th>JSON</th><th>Avg latency</th><th>Total cost</th></tr></thead><tbody>${srows}</tbody></table>${sections}</div></body></html>`
  const outPath = 'converse-model-comparison.html'
  writeFileSync(outPath, doc)
  line('\n📄 HTML report written to ' + outPath + '  (open it in a browser)')
})()
