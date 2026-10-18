#!/usr/bin/env node
/**
 * The classroom test suite: npm run test:classroom
 *
 *   npm run test:classroom               everything (unit tests, then the classroom runs)
 *   npm run test:classroom -- run15      only tests whose name contains "run15"
 *   npm run test:classroom -- unit       only the unit tests
 *   npm run test:classroom -- -v         print every check, not just failures
 *
 * unit/*.test.ts   pure logic (voice commands, the action judge, role-play ticks, cards, layout…), bundled and run
 * rooms/run*.js    a whole classroom in a simulated browser (jsdom), with the server, Supabase, Whereby and the
 *                  AI tutor's live connection mocked (harness/). Each plays a lesson and checks what's on screen and
 *                  what was sent. Nothing here calls OpenAI or the database.
 * See tests/classroom/README.md.
 */
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../..')
const src = join(repo, 'src')
const out = join(here, '.build')
mkdirSync(out, { recursive: true })

const args = process.argv.slice(2)
const verbose = args.includes('-v')
const filter = args.find((a) => !a.startsWith('-')) ?? ''

// '@/…' → src/…, the app's mocked modules → harness/
const alias = {
  name: 'alias',
  setup(b) {
    const mock = (f) => () => ({ path: join(here, 'harness', f) })
    b.onResolve({ filter: /^@whereby\.com\/browser-sdk\/react$/ }, mock('mock-whereby.tsx'))
    b.onResolve({ filter: /^@\/context\/AuthContext$/ }, mock('mock-auth.tsx'))
    b.onResolve({ filter: /^@\/context\/ThemeContext$/ }, mock('mock-theme.tsx'))
    b.onResolve({ filter: /^@\/lib\/supabase$/ }, mock('mock-supabase.ts'))
    b.onResolve({ filter: /^@\// }, (a) => b.resolve('./' + a.path.slice(2), { resolveDir: src, kind: a.kind }))
  },
}
const bundle = (entry, outfile) =>
  build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    logLevel: 'error',
    nodePaths: [join(repo, 'node_modules')],
    plugins: [alias],
  })

function run(file) {
  return new Promise((done) => {
    const p = spawn(process.execPath, [file], { cwd: repo, env: { ...process.env, NODE_PATH: join(repo, 'node_modules') } })
    let text = ''
    p.stdout.on('data', (d) => (text += d))
    p.stderr.on('data', (d) => (text += d))
    const timer = setTimeout(() => {
      text += '\nFAIL timed out after 5 minutes'
      p.kill('SIGKILL')
    }, 300_000)
    p.on('close', (code) => {
      clearTimeout(timer)
      done({ code, text })
    })
  })
}

const results = []
async function check(name, file) {
  const t0 = Date.now()
  const { code, text } = await run(file)
  const lines = text.split('\n')
  const fails = lines.filter((l) => l.startsWith('FAIL'))
  const crashed = !fails.length && code !== 0
  const oks = lines.filter((l) => l.startsWith('ok')).length
  const pass = !fails.length && !crashed
  results.push({ name, pass })
  console.log(`${pass ? '✓' : '✗'} ${name}  (${oks} checks, ${((Date.now() - t0) / 1000).toFixed(1)} s)`)
  if (verbose) for (const l of lines.filter((l) => l.startsWith('ok'))) console.log('    ' + l)
  for (const f of fails) console.log('    ' + f)
  if (crashed) console.log(lines.filter((l) => /Error|at /.test(l)).slice(0, 12).map((l) => '    ' + l).join('\n'))
}

const unitDir = join(here, 'unit')
const units = readdirSync(unitDir).filter((f) => f.endsWith('.test.ts') && `unit/${f}`.includes(filter)).sort()
const roomDir = join(here, 'rooms')
const rooms = readdirSync(roomDir).filter((f) => /^run\d+\.js$/.test(f) && `rooms/${f}`.includes(filter)).sort()

if (units.length) {
  console.log(`\nUnit tests (${units.length})`)
  for (const f of units) {
    const o = join(out, f.replace(/\.ts$/, '.cjs'))
    await bundle(join(unitDir, f), o)
    await check(`unit/${f}`, o)
  }
}
if (rooms.length) {
  console.log(`\nClassroom runs (${rooms.length}): a simulated classroom each, these take a while`)
  await bundle(join(here, 'harness', 'test.tsx'), join(out, 'harness.cjs'))
  for (const f of rooms) await check(`rooms/${f}`, join(roomDir, f))
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${failed.length ? `✗ ${failed.length} of ${results.length} failed: ${failed.map((r) => r.name).join(', ')}` : `✓ all ${results.length} passed`}`)
process.exit(failed.length ? 1 : 0)
