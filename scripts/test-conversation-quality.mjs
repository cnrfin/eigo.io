// Pre-push quality tests for the converse + repair prompt changes.
//   OPENAI_API_KEY=sk-... node scripts/test-conversation-quality.mjs
//
// Part 1 - REPAIR: natural spoken ellipsis must pass (ok=true), real errors must be
//          corrected (ok=false). Deterministic pass/fail.
// Part 2 - REACTIONS: runs a full multi-turn conversation and checks Teri's reactions
//          are varied (no "that sounds ADJ and ADJ" rut) and free of the awkward
//          collocations we flagged. Writes an HTML report.

import OpenAI from 'openai'
import { writeFileSync } from 'node:fs'

const MODEL = process.argv[2] || 'gpt-5.6-luna'
const EFFORT = process.env.EFFORT || 'low'   // try EFFORT=medium or high to test naturalness vs cost
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) { console.error('Set OPENAI_API_KEY'); process.exit(1) }
const openai = new OpenAI({ apiKey })

async function chat(system, user, maxTok = 600) {
  const base = { model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_object' }, max_completion_tokens: maxTok }
  try { return await openai.chat.completions.create({ ...base, reasoning_effort: EFFORT }) }
  catch (e) { if (/reasoning|effort/i.test(e?.message || '')) return await openai.chat.completions.create(base); throw e }
}
const parse = (res) => { try { return JSON.parse(res.choices[0]?.message?.content ?? '{}') } catch { return null } }

// ── PART 1: repair (mirrors src/app/api/memory/repair/route.ts) ───────────────
const repairSystem =
  'You are a warm, supportive English tutor helping a Japanese learner speak during a friendly conversation about a personal memory (a photo). ' +
  'Your job is to fix GENUINE mistakes only, never to rewrite a sentence that is already fine. ' +
  'Return ONLY a JSON object with this exact shape: ' +
  '{ "ok": boolean, "corrected": string, "correctedJa": string, "note": string, "gap": [{ "term": string, "gloss": string, "pos": string }] }. ' +
  'Rules: ' +
  '1) If the learner\'s English is already correct and natural for SPOKEN conversation, set "ok" to true and return it UNCHANGED as "corrected". Do NOT paraphrase, reword, shorten, expand, or improve a sentence that is already fine. ' +
  '2) SPOKEN ELLIPSIS IS CORRECT, NOT AN ERROR. Dropping the subject or verb is exactly how native speakers answer a question, so judge the learner\'s words as an ANSWER to the question. These are all perfect and MUST stay unchanged with "ok" true: Q "Who are you having brunch with?" -> "With my mum"; Q "Where are you going?" -> "To the shops"; also "Last Sunday", "Because it was fun". Only touch a fragment if it uses wrong grammar or is genuinely unclear, never just because it is short. ' +
  '3) Preserve the learner\'s meaning and wording. ' +
  '4) Set "ok" to false ONLY when there is a real grammar error, a wrong word, or it is genuinely unnatural or unclear (not merely short or incomplete). Then "corrected" is the SMALLEST fix. ' +
  '"correctedJa" = natural Japanese of "corrected". "note" = a short Japanese explanation of the fix, empty when ok is true. "gap" = up to 3 useful words from "corrected", or []. No text outside the JSON.'

const repairUser = ({ said, question }) =>
  `The learner said this in English. Correct it only if needed:\n"${said}"\n\nThey are answering the question: "${question}"`

const repairCases = [
  { said: 'With my mum', question: 'Who are you having brunch with?', wantOk: true, why: 'natural ellipsis' },
  { said: 'To the shops', question: 'Where are you going?', wantOk: true, why: 'natural ellipsis' },
  { said: 'Last Sunday', question: 'When did you go?', wantOk: true, why: 'natural ellipsis' },
  { said: 'Because it was fun', question: 'Why did you go back?', wantOk: true, why: 'natural ellipsis' },
  { said: "I don't use milk or sugar. I just like it black", question: 'How do you like your coffee?', wantOk: true, why: 'already natural' },
  { said: 'I love the bitter taste', question: 'Why do you like black coffee?', wantOk: true, why: 'already natural' },
  { said: 'I very like coffee', question: 'Do you like coffee?', wantOk: false, why: 'real error (adverb)' },
  { said: 'She go there every weekend', question: 'How often do you go?', wantOk: false, why: 'real error (agreement)' },
  { said: 'I eated a sandwich', question: 'What did you eat?', wantOk: false, why: 'real error (past tense)' },
]

// ── PART 2: converse (mirrors src/app/api/memory/converse/route.ts) ───────────
const countWords = (s) => (String(s || '').match(/[a-z0-9']+/gi) || []).length
const hasQuestion = (s) => /\?/.test(String(s || ''))
const DISENGAGED = /(i (don'?t|do not) know|not sure|it'?s fine|it was fine|nothing much|nothing really|no idea|dunno|i guess|maybe$)/i
const isFlat = (a) => !hasQuestion(a) && (countWords(a) <= 4 || DISENGAGED.test(String(a || '')))
function engagementDirective(history) {
  if (!history.length) return ''
  const latest = history[history.length - 1].a
  if (hasQuestion(latest)) return 'NOTE: The learner just asked you a question. Send your warm answer as a short FIRST message, then your question as a SECOND message (two bubbles). Stay on this thread, do not switch back to the photo this turn.'
  const last2 = history.slice(-2)
  if (last2.length === 2 && last2.every((h) => isFlat(h.a))) return 'NOTE: The learner has gone quiet. If the conversation has drifted from the photo, return to it now with a fresh question. If already on the photo, wrap up: set done true, put a closing line in the question field, empty replies.'
  return ''
}
const converseSystem = (level) =>
  'You are Teri, a warm, curious teacup having a friendly, text-style chat with a Japanese person learning English about a photo they shared. ' +
  'Reply the way you would in a real text chat, as ONE or TWO short messages. Usually ONE is enough: your next question, with a couple of words of acknowledgement folded in. Send TWO messages (a short first message, then your question) at the moments a real person naturally would: when you are answering a question the learner asked you (answer first, then ask yours), or when they just shared something notable or emotional that deserves a genuine reaction of its own. Never add a second message just to comment on the photo or restate what they said, and never force it. Your LAST message is always your question. ' +
  'Build your question on what they just said, and draw fresh angles from the photo (who, what, where, when, why, how), preferring angles you have not asked about yet. If they ask you something, answer it first, then stay on that thread. Follow their lead. Be warm and friendly, and let your punctuation match the moment: an exclamation mark only for the genuinely exciting, happy or surprising things (not every friendly line, most turns need none), and a gentle trailing tone (like "that is too bad...") when they share something sad or hard. Match their mood and keep it natural, never over the top. ' +
  'Write English like real text messages: no emojis, no dashes, colons or semicolons, and only word pairings a native speaker would really say (a smell is not "warm"). Keep everything at CEFR level ' + level + '. ' +
  'Also give three short, distinct replies the learner might say. ' +
  'Return only JSON: { "done": boolean, "bubbles": [ { "en": string, "ja": string } ], "replies": [ { "en": string, "ja": string, "gap": [] } ] }. bubbles is one or two messages and the last is your question.'
const converseUser = (context, level, history) => {
  const convo = history.length ? history.map((h) => `Teri: ${h.q}\nLearner: ${h.a}`).join('\n') : '(not started, ask your first question about the photo)'
  const d = engagementDirective(history)
  return `Memory: ${context}\nLearner level: ${level}\n\nConversation so far:\n${convo}\n\n${d ? d + '\n\n' : ''}Give the next turn as JSON.`
}

const SCENE = 'a bright, colourful brunch at a cozy cafe, the learner is with their mum and there is coffee'
const LEVEL = 'A2'
// scripted learner answers to drive a full, varied conversation
const LEARNER = [
  "That's my mum. We come here most weekends.",
  "I don't use milk or sugar. I just like it black.",
  "I love the bitter taste. Do you like coffee too, Teri?",
  "We usually stay for about an hour.",
  "The greenery makes it feel calm.",
  "Yes, I would love to come back.",
]

// emotional beats to check Teri matches mood with expressive punctuation
const TONE_CASES = [
  { mood: 'sad', ctx: "a family photo with the learner's late grandmother", q: 'Who is this with you in the photo?', last: 'This is my grandmother. She passed away last month.', expectExcl: false },
  { mood: 'happy', ctx: "a photo from the learner's graduation day", q: 'What a big day, what happened here?', last: 'I passed all my exams and graduated. I was so happy.', expectExcl: true },
  { mood: 'surprising', ctx: 'a night photo at a campsite', q: 'What was the best part of that night?', last: 'We suddenly saw a shooting star. It was amazing.', expectExcl: true },
  { mood: 'neutral', ctx: 'a cozy cafe with a matcha latte', q: 'What did you order here?', last: 'I had a matcha latte.', expectExcl: null },
]

// ── run ───────────────────────────────────────────────────────────────────────
const BAD_COLLOCATIONS = /(smell|smells|smelled)\s+\w*\s*warm|warm\s+(smell|scent)|taste\s+\w*\s*warm/i
const SOUNDS_CRUTCH = /\bsounds\b/i   // catches 'sounds like', 'that sounds', 'sounds X and Y'

;(async () => {
  console.log(`\n(model ${MODEL}, reasoning_effort ${EFFORT})`)
  console.log('\n=== PART 1: REPAIR (spoken ellipsis vs real errors) ===\n')
  const repairRows = []
  let rPass = 0
  for (const c of repairCases) {
    const res = await chat(repairSystem, repairUser(c), 400)
    const o = parse(res) || {}
    const gotOk = !!o.ok
    const pass = gotOk === c.wantOk
    if (pass) rPass++
    repairRows.push({ ...c, gotOk, corrected: String(o.corrected ?? ''), note: String(o.note ?? ''), pass })
    console.log(`${pass ? '✓' : '✗ FAIL'}  ok=${gotOk} (want ${c.wantOk})  "${c.said}"  [${c.why}]`)
    if (!gotOk) console.log(`        -> "${o.corrected}"  ${o.note ? '(' + o.note + ')' : ''}`)
  }
  console.log(`\nREPAIR: ${rPass}/${repairCases.length} passed`)

  console.log('\n=== PART 2: REACTIONS (variety + collocations over a full chat) ===\n')
  const history = []
  const reactions = []
  const turns = []
  // first turn (opening) then one per scripted learner answer
  for (let i = 0; i <= LEARNER.length; i++) {
    const res = await chat(converseSystem(LEVEL), converseUser(SCENE, LEVEL, history), 600)
    const o = parse(res) || {}
    const bubbles = Array.isArray(o.bubbles) ? o.bubbles.map((b) => String(b.en ?? '').trim()).filter(Boolean) : []
    const question = bubbles.length ? bubbles[bubbles.length - 1] : ''
    const reaction = bubbles.length > 1 ? bubbles[0] : ''
    turns.push({ reaction, question, done: !!o.done, n: bubbles.length })
    if (reaction) reactions.push(reaction)
    console.log(`T${i}  bubbles(${bubbles.length}): ${bubbles.join('  //  ') || '—'}${o.done ? '  [done]' : ''}`)
    if (i < LEARNER.length) { history.push({ q: bubbles.join(' ') || question, a: LEARNER[i] }); console.log(`     learner: ${LEARNER[i]}`) }
  }

  const openings = reactions.map((r) => r.toLowerCase().split(/\s+/).slice(0, 2).join(' '))
  const repeatedOpenings = [...new Set(openings.filter((o, i) => openings.indexOf(o) !== i))]
  const norm = (r) => r.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const seen = {}
  reactions.forEach((r) => { const k = norm(r); seen[k] = (seen[k] || 0) + 1 })
  const exactDupes = Object.entries(seen).filter(([, n]) => n > 1).map(([k]) => k)
  const soundsHits = reactions.filter((r) => SOUNDS_CRUTCH.test(r))   // info only, not a fail
  const collocationHits = reactions.filter((r) => BAD_COLLOCATIONS.test(r))
  const variety = reactions.length ? new Set(openings).size / reactions.length : 1
  // Long reactions are usually observational narration ("X has a Y taste, it looks ...").
  // Genuine reactions run short, so treat >13 words as a likely observation.
  const wordy = reactions.filter((r) => countWords(r) > 13)
  const avgWords = reactions.length ? Math.round(reactions.reduce((a, r) => a + countWords(r), 0) / reactions.length) : 0

  const withLeadIn = turns.filter((t) => t.reaction).length
  console.log('\n--- reaction analysis (bubbles: most turns should be 1 message) ---')
  console.log(`turns with a separate lead-in message: ${withLeadIn}/${turns.length}`)
  console.log(`total reactions: ${reactions.length}   variety ${(variety * 100).toFixed(0)}%   avg length ${avgWords} words`)
  console.log(`exact duplicate reactions: ${exactDupes.length || 'none'}`)
  console.log(`repeated opening patterns: ${repeatedOpenings.length ? repeatedOpenings.join(', ') : 'none'}`)
  console.log(`long/observational reactions (>13 words): ${wordy.length}${wordy.length ? '\n   - ' + wordy.join('\n   - ') : ''}`)
  console.log(`bad collocations: ${collocationHits.length ? collocationHits.join(' | ') : 'none'}`)
  console.log(`("sounds ..." used ${soundsHits.length}x, informational only)`)

  const reactPass = exactDupes.length === 0 && repeatedOpenings.length === 0 && collocationHits.length === 0 && variety >= 0.75 && wordy.length <= 2
  console.log(`\nREACTIONS: ${reactPass ? 'PASS' : 'NEEDS WORK'} (want 0 duplicates, 0 repeated openings, <=2 long/observational, 0 bad collocations, variety >=75%)`)

  // HTML report
  console.log('')
  console.log('=== PART 3: TONE (warmth + expressive punctuation to context) ===')
  console.log('')
  const toneRows = []
  for (const tc of TONE_CASES) {
    const res = await chat(converseSystem(LEVEL), converseUser(tc.ctx, LEVEL, [{ q: tc.q, a: tc.last }]), 600)
    const o = parse(res) || {}
    const bubbles = Array.isArray(o.bubbles) ? o.bubbles.map((b) => String(b.en ?? '').trim()).filter(Boolean) : []
    const text = bubbles.join(' ')
    const excl = text.includes('!')
    const soft = text.includes('...') || /so sorry|i'?m sorry|that is hard|take care/i.test(text)
    let verdict
    if (tc.expectExcl === true) verdict = excl ? 'ok (excited !)' : 'flat, no !'
    else if (tc.expectExcl === false) verdict = excl ? 'too upbeat for sad' : (soft ? 'ok (gentle)' : 'neutral, read it')
    else verdict = 'read it'
    toneRows.push({ ...tc, bubbles, excl, verdict })
    console.log('[' + tc.mood + '] learner: "' + tc.last + '"')
    bubbles.forEach((b, i) => console.log('   Teri ' + (i + 1) + ': ' + b))
    console.log('   -> ' + verdict)
    console.log('')
  }

  const esc = (x) => String(x ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
  const rrows = repairRows.map((r) => `<tr class="${r.pass ? 'ok' : 'bad'}"><td>${r.pass ? '✓' : '✗'}</td><td>${esc(r.said)}</td><td>${esc(r.why)}</td><td>ok=${r.gotOk} (want ${r.wantOk})</td><td>${r.gotOk ? '<i>unchanged</i>' : esc(r.corrected) + (r.note ? '<br><span class=note>' + esc(r.note) + '</span>' : '')}</td></tr>`).join('')
  const treact = turns.map((t, i) => `<div class="turn"><div class="rx ${BAD_COLLOCATIONS.test(t.reaction) || countWords(t.reaction) > 13 || repeatedOpenings.includes(t.reaction.toLowerCase().split(/\s+/).slice(0,2).join(' ')) ? 'flagrx' : ''}">${esc(t.reaction) || '—'}</div><div class="qq">${esc(t.question)}${t.done ? ' <b>[done]</b>' : ''}</div>${i < LEARNER.length ? '<div class="lr">↳ ' + esc(LEARNER[i]) + '</div>' : ''}</div>`).join('')
  const doc = `<!doctype html><meta charset=utf-8><title>Conversation quality tests</title><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#faf8f6;color:#1d1c1a;max-width:900px;margin:0 auto;padding:28px 20px 60px;line-height:1.45}h1{font-size:22px}h2{font-size:17px;margin-top:28px}.badge{display:inline-block;padding:3px 10px;border-radius:8px;font-weight:700;font-size:13px}.pass{background:#e6f7ee;color:#1a8a4f}.warn{background:#fdeaea;color:#c62b30}table{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}td,th{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}tr.bad{background:#fff5f5}tr.ok td:first-child{color:#1a8a4f}tr.bad td:first-child{color:#c62b30}.note{color:#7a746e;font-size:11px}.turn{background:#fff;border-radius:10px;padding:11px 13px;margin-bottom:9px;box-shadow:0 1px 3px rgba(0,0,0,.05)}.rx{font-style:italic;color:#7a746e;font-size:13px}.flagrx{color:#c62b30;font-weight:600;font-style:normal}.qq{font-weight:600;font-size:15px;margin-top:2px}.lr{color:#4a453f;font-size:13px;margin-top:5px}.metrics{font-size:13px;color:#4a453f;background:#f1ede7;border-radius:10px;padding:12px 14px;margin:8px 0}</style>
<h1>Conversation quality tests <span class="sub">(${MODEL})</span></h1>
<h2>Repair: spoken ellipsis vs real errors &nbsp;<span class="badge ${rPass === repairCases.length ? 'pass' : 'warn'}">${rPass}/${repairCases.length}</span></h2>
<table><tr><th></th><th>Learner said</th><th>Case</th><th>Result</th><th>Correction</th></tr>${rrows}</table>
<h2>Reactions: variety &amp; collocations &nbsp;<span class="badge ${reactPass ? 'pass' : 'warn'}">${reactPass ? 'PASS' : 'NEEDS WORK'}</span></h2>
<div class="metrics">variety ${(variety * 100).toFixed(0)}% · avg ${avgWords} words · duplicate reactions: ${exactDupes.length} · repeated openings: ${repeatedOpenings.length ? repeatedOpenings.join(', ') : 'none'} · long/observational (>13w): ${wordy.length} · bad collocations: ${collocationHits.length}</div>
${treact}<h2>Tone: warmth and expressive punctuation</h2><table><tr><th>Mood</th><th>Learner said</th><th>Teri</th><th>Check</th></tr>${toneRows.map((t) => `<tr class="${t.verdict.startsWith('ok') ? 'ok' : (t.verdict.includes('too upbeat') || t.verdict.includes('flat')) ? 'bad' : ''}"><td>${esc(t.mood)}</td><td>${esc(t.last)}</td><td>${t.bubbles.map(esc).join('<br>')}</td><td>${esc(t.verdict)}</td></tr>`).join('')}</table>`
  writeFileSync('conversation-quality.html', doc)
  console.log('\n📄 HTML report: conversation-quality.html')
})()
