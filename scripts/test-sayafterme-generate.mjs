#!/usr/bin/env node
/**
 * Smoke test for /api/sayafterme/generate.
 *
 * Exercises every error path the iOS app could plausibly hit, then —
 * if you supply a real Pro RC user ID — runs the happy path and
 * saves the returned audio to /tmp/sayafterme-test.mp3 so you can
 * listen to it.
 *
 * Usage:
 *   # validation + entitlement tests only (no real RC user needed)
 *   node scripts/test-sayafterme-generate.mjs
 *
 *   # full run including a real generation
 *   RC_USER_ID="your-rc-user-id" node scripts/test-sayafterme-generate.mjs
 *
 *   # against a different host (e.g. a Vercel preview)
 *   BASE_URL="https://eigo-web-xxx.vercel.app" node scripts/test-sayafterme-generate.mjs
 *
 * Where to find your RC user ID:
 *   - RC Dashboard → Customers → click the most recent user
 *   - Or in the iOS app: lib/purchases.ts has Purchases.getAppUserID()
 *     — temporarily console.log it
 */

import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const ENDPOINT = `${BASE_URL}/api/sayafterme/generate`
const RC_USER_ID = process.env.RC_USER_ID

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  passed++
}

function fail(name, detail) {
  console.log(`  \x1b[31m✗\x1b[0m ${name}`)
  if (detail) console.log(`     ${detail}`)
  failed++
}

async function postGenerate({ headers = {}, body = {} } = {}) {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  let json = null
  try {
    json = await resp.json()
  } catch {}
  return { status: resp.status, body: json }
}

const VALID_BODY = {
  phrase: 'Where is the train station?',
  sourceLang: 'en',
  targetLang: 'ja',
  voice: 'JA-Female',
}

// ────────────────────────────────────────────────────────────
console.log(`\n→ Testing ${ENDPOINT}\n`)

// ── Validation tests (no RC needed) ─────────────────────────
console.log('Validation:')

{
  const { status, body } = await postGenerate({ body: VALID_BODY })
  if (status === 401 && body?.error === 'missing_rc_user_id') {
    pass('rejects request with no X-RC-User-Id header (401)')
  } else {
    fail(
      'no header should produce 401',
      `got ${status} ${JSON.stringify(body)}`,
    )
  }
}

{
  const { status, body } = await postGenerate({
    headers: { 'X-RC-User-Id': 'ignored' },
    body: { ...VALID_BODY, phrase: '' },
  })
  if (status === 400 && body?.error === 'invalid_input') {
    pass('rejects empty phrase (400)')
  } else {
    fail('empty phrase should produce 400', `got ${status} ${JSON.stringify(body)}`)
  }
}

{
  const { status, body } = await postGenerate({
    headers: { 'X-RC-User-Id': 'ignored' },
    body: { ...VALID_BODY, voice: 'JA-Female', targetLang: 'en' },
  })
  if (status === 400 && body?.error === 'invalid_input') {
    pass('rejects voice/targetLang mismatch (400)')
  } else {
    fail(
      'voice/lang mismatch should produce 400',
      `got ${status} ${JSON.stringify(body)}`,
    )
  }
}

{
  const { status, body } = await postGenerate({
    headers: { 'X-RC-User-Id': 'ignored' },
    body: { ...VALID_BODY, voice: 'CN-Female' },
  })
  if (status === 400 && body?.error === 'invalid_input') {
    pass('rejects unknown voice (400)')
  } else {
    fail('unknown voice should produce 400', `got ${status} ${JSON.stringify(body)}`)
  }
}

// ── Entitlement check (no real Pro needed) ──────────────────
console.log('\nEntitlement:')

{
  // RC's GET /subscribers/{id} AUTO-CREATES a subscriber record on
  // first lookup rather than returning 404 — so for an unknown ID
  // we get back an empty subscriber and our route maps that to
  // `entitlement_missing`. Either reason proves the RC call went
  // out cleanly (auth accepted, JSON parsed) and the gate fires.
  const fakeId = `smoke-test-${Date.now()}`
  const { status, body } = await postGenerate({
    headers: { 'X-RC-User-Id': fakeId },
    body: VALID_BODY,
  })
  if (
    status === 403 &&
    body?.error === 'not_pro' &&
    (body?.reason === 'no_such_user' ||
      body?.reason === 'entitlement_missing')
  ) {
    pass(`unknown RC user gets 403 not_pro (reason: ${body.reason})`)
  } else if (status === 503 && body?.reason === 'rc_misconfigured') {
    fail(
      'REVENUECAT_SECRET_KEY is missing or invalid',
      'check eigo-web/.env.local — server must be restarted after editing',
    )
  } else if (status === 503 && body?.reason === 'rc_unavailable') {
    fail(
      'RevenueCat API not reachable',
      'check network / RC status; this would also block real users',
    )
  } else {
    fail(
      'unknown RC user should produce 403 with no_such_user',
      `got ${status} ${JSON.stringify(body)}`,
    )
  }
}

// ── Happy path (requires real Pro user) ─────────────────────
if (RC_USER_ID) {
  console.log('\nHappy path:')

  const { status, body } = await postGenerate({
    headers: { 'X-RC-User-Id': RC_USER_ID },
    body: VALID_BODY,
  })

  if (status !== 200) {
    fail(
      'real Pro user should produce 200',
      `got ${status} ${JSON.stringify(body)}`,
    )
  } else {
    pass('200 OK')

    if (typeof body?.translation === 'string' && body.translation.length > 0) {
      pass(`translation: "${body.translation}"`)
    } else {
      fail('translation missing or empty')
    }

    // Romanization: required for JA / KO targets (the test sends JA),
    // empty string for EN. We test JA, so a non-empty romanization
    // string is what we expect.
    if (typeof body?.romanization === 'string' && body.romanization.length > 0) {
      pass(`romanization: "${body.romanization}"`)
    } else {
      fail(
        'romanization missing or empty (JA target should have Hepburn)',
        `got ${JSON.stringify(body?.romanization)}`,
      )
    }

    if (
      typeof body?.audio_base64 === 'string' &&
      body.audio_base64.length > 1000
    ) {
      const audioPath = join(tmpdir(), 'sayafterme-test.mp3')
      const buf = Buffer.from(body.audio_base64, 'base64')
      await writeFile(audioPath, buf)
      pass(`audio decoded: ${buf.length} bytes saved to ${audioPath}`)
      console.log(`     play it with: open "${audioPath}"`)
    } else {
      fail('audio_base64 missing or too small')
    }

    if (
      body?.usage?.limit === 100 &&
      typeof body?.usage?.count === 'number' &&
      body.usage.count >= 1 &&
      body.usage.count <= 100
    ) {
      pass(`usage counter: ${body.usage.count} / ${body.usage.limit}`)
    } else {
      fail(`usage shape unexpected: ${JSON.stringify(body?.usage)}`)
    }
  }
} else {
  console.log(
    '\n(Skipping happy-path test — set RC_USER_ID=<your-pro-user-id> to run it)',
  )
}

// ────────────────────────────────────────────────────────────
console.log(
  `\n${passed} passed, ${failed} failed${failed === 0 ? ' \x1b[32m✓\x1b[0m' : ' \x1b[31m✗\x1b[0m'}\n`,
)
process.exit(failed === 0 ? 0 : 1)
