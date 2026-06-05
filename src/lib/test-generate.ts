import OpenAI from 'openai'

/**
 * AI-assisted item generation for the authoring pipeline.
 *
 * Produces ORIGINAL practice items in the exact shape the import endpoint
 * (POST /api/admin/tests) accepts, so the flow is: generate → review/edit →
 * import (unpublished) → QA → publish. Nothing is saved here; a human always
 * reviews the draft before it enters the catalogue.
 */
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const GENERATION_MODEL = process.env.OPENAI_GENERATION_MODEL || 'gpt-5.4-mini'

export type Skill = 'reading' | 'listening' | 'writing' | 'speaking'

export interface GenerateOptions {
  examSlug: string          // 'eiken' | 'toeic' | 'ielts'
  examName: string
  trackSlug: string
  trackName: string
  levelLabel: string        // e.g. 'Grade 3', 'Academic'
  skill: Skill
  count: number             // number of questions to draft
  topic?: string
  partLabel?: string        // e.g. 'Part 1'
  extraInstructions?: string
}

// Per-exam formatting guidance so drafts come out faithful by default.
function examFormatHints(o: GenerateOptions): string {
  const numbered = "Use NUMBERED answer options ('1','2','3','4')."
  const letters = "Use LETTER answer options ('A','B','C','D')."
  if (o.examSlug === 'eiken') {
    return [
      `EIKEN ${o.levelLabel}. All reading/listening items are 4-choice multiple choice. ${numbered}`,
      o.skill === 'reading' ? 'Reading has NO free-text answers — every item is single_choice with 4 options.' : '',
      o.skill === 'listening' ? 'For listening, put the spoken script in the group passage_text (it will be turned into audio later); options are printed (not in the script).' : '',
      o.skill === 'writing' ? 'Writing tasks: an e-mail reply (15-25 words) or an opinion (25-35 words, give two reasons). Use question_type "email_response" or "essay", scoring_method "ai_rubric".' : '',
      o.skill === 'speaking' ? 'Speaking: a short passage to read aloud plus questions; use question_type "speaking_response", scoring_method "ai_rubric". For picture questions, put the intended scene + expected answer in payload.reference.' : '',
    ].filter(Boolean).join(' ')
  }
  if (o.examSlug === 'toeic') {
    return `TOEIC ${o.levelLabel}. 4-choice multiple choice. ${letters} Listening parts use a spoken script (put it in passage_text). Reading parts: incomplete sentences, text completion, single/multiple passages.`
  }
  if (o.examSlug === 'ielts') {
    return [
      `IELTS ${o.levelLabel}. Question types may include single_choice, multiple_choice, gap_fill (with payload.accepted list), matching, true_false_notgiven.`,
      'For gap_fill use scoring_method "auto_text" and put acceptable answers in payload.accepted (array).',
      o.skill === 'writing' ? 'Writing: Task 1 and/or Task 2 prompts; question_type "essay", scoring_method "ai_rubric". Weight Task 2 double via payload.weight=2.' : '',
      o.skill === 'speaking' ? 'Speaking: Part 1/2/3 prompts; question_type "speaking_response", scoring_method "ai_rubric".' : '',
    ].filter(Boolean).join(' ')
  }
  return '4-choice multiple choice unless the skill requires free response.'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

export interface GeneratedDraft {
  trackSlug: string
  form: Json
  warnings: string[]
}

export async function generateForm(o: GenerateOptions): Promise<GeneratedDraft> {
  const count = Math.min(20, Math.max(1, Math.floor(o.count) || 5))
  const autoSkill = o.skill === 'reading' || o.skill === 'listening'

  const systemPrompt = `You author ORIGINAL English-test practice items. Everything you produce must be your own original content — never copy real exam questions, passages, or trademarked text.

You output a single JSON object describing ONE test form, in EXACTLY this shape:
{
  "form": {
    "title": string,
    "title_ja": string,
    "mode": "skill_practice",
    "sections": [
      {
        "skill": "${o.skill}",
        "part_label": string,
        "title": string,
        "instructions": string,
        "groups": [
          {
            "stimulus_type": "none" | "passage" | "audio" | "image" | "prompt",
            "passage_text": string,   // a reading passage OR a listening script; "" if none
            "prompt": string,         // shared prompt for the group; "" if none
            "questions": [
              {
                "question_type": "single_choice" | "multiple_choice" | "gap_fill" | "true_false_notgiven" | "matching" | "short_answer" | "essay" | "email_response" | "speaking_response",
                "scoring_method": "auto_choice" | "auto_text" | "ai_rubric",
                "prompt": string,
                "payload": object,    // {} unless needed (gap_fill: {"accepted":[...]}; speaking picture: {"reference":"..."}; writing: {"min_words":..,"max_words":..})
                "max_score": number,
                "options": [ { "label": string, "content": string, "is_correct": boolean } ]  // omit/empty for free-response
              }
            ]
          }
        ]
      }
    ]
  }
}

RULES:
- Generate ${count} question(s) for the ${o.skill} skill.
- ${autoSkill ? 'Objective items: question_type "single_choice" (one correct) with scoring_method "auto_choice"; exactly one option has is_correct=true.' : 'Free-response items: scoring_method "ai_rubric"; no options.'}
- ${examFormatHints(o)}
- Level: write to ${o.examName} ${o.levelLabel} difficulty. Natural, correct English.
- Set max_score to a sensible point value (objective items: 1).
- Return ONLY the JSON object — no markdown, no commentary.`

  const userPrompt = `Exam: ${o.examName} (${o.trackName})
Skill: ${o.skill}
${o.partLabel ? `Part: ${o.partLabel}` : ''}
${o.topic ? `Topic/theme: ${o.topic}` : ''}
${o.extraInstructions ? `Extra: ${o.extraInstructions}` : ''}
Generate ${count} original ${o.skill} item(s).`

  const completion = await getOpenAI().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_completion_tokens: 4000,
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('No response from generator')
  const parsed = JSON.parse(raw) as Json
  return normalizeDraft(parsed, o)
}

// Coerce the model output into a valid, importable draft + collect warnings.
function normalizeDraft(parsed: Json, o: GenerateOptions): GeneratedDraft {
  const warnings: string[] = []
  const form: Json = parsed.form ?? parsed
  const slugBase = `${o.trackSlug}-${o.skill}-${Date.now().toString(36)}`

  const sections = Array.isArray(form.sections) ? form.sections : []
  let qCount = 0
  for (const s of sections) {
    s.skill = o.skill
    s.groups = Array.isArray(s.groups) ? s.groups : []
    for (const g of s.groups) {
      g.questions = Array.isArray(g.questions) ? g.questions : []
      for (const q of g.questions) {
        qCount++
        const opts = Array.isArray(q.options) ? q.options : []
        if ((q.question_type === 'single_choice' || q.question_type === 'multiple_choice' || q.question_type === 'true_false_notgiven')) {
          if (opts.length < 2) warnings.push(`A ${q.question_type} question has too few options.`)
          if (!opts.some((op: Json) => op.is_correct)) warnings.push(`A ${q.question_type} question has no correct option marked.`)
        }
        if (typeof q.max_score !== 'number') q.max_score = 1
      }
    }
  }
  if (qCount === 0) warnings.push('The model returned no questions — try again or adjust the prompt.')

  return {
    trackSlug: o.trackSlug,
    form: {
      slug: slugBase,
      title: form.title || `${o.trackName} — ${o.skill} (draft)`,
      title_ja: form.title_ja || '',
      mode: 'skill_practice',
      published: false,
      sections,
    },
    warnings,
  }
}
