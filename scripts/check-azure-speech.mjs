/**
 * Diagnose the Azure Speech pronunciation assessment.
 *
 * Grading has been timing out and, worse, cancellations were being recorded as
 * genuine 0/100 scores. This talks to Azure directly with the same key, region
 * and config the app uses, and prints exactly why it fails — auth, quota,
 * region mismatch or network — rather than leaving it behind a 502.
 *
 *   node --env-file=.env.local scripts/check-azure-speech.mjs
 *
 * Needs AZURE_SPEECH_KEY + AZURE_SPEECH_REGION. Uses ffmpeg to make a short test
 * clip; no microphone required.
 */
import sdk from 'microsoft-cognitiveservices-speech-sdk'
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const key = process.env.AZURE_SPEECH_KEY
const region = process.env.AZURE_SPEECH_REGION
// Length only — never echo key material, since this output gets pasted around.
console.log('AZURE_SPEECH_KEY   :', key ? `set (${key.length} chars)` : 'MISSING')
console.log('AZURE_SPEECH_REGION:', region || 'MISSING')
if (!key || !region) process.exit(1)

// 1. Can we even reach the region's token endpoint? Separates "key/region wrong"
//    from "the speech websocket is blocked", which look identical from the SDK.
const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
try {
  const t0 = Date.now()
  const res = await fetch(tokenUrl, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key }, signal: AbortSignal.timeout(10_000) })
  const body = await res.text()
  console.log(`\ntoken endpoint     : ${res.status} ${res.statusText} in ${Date.now() - t0}ms`)
  if (!res.ok) {
    console.log('response           :', body.slice(0, 300))
    console.log('\n→ The key or region is rejected. 401 = wrong/expired key; 403 = key valid but')
    console.log('  not entitled (or quota exhausted); 404 = region wrong for this resource.')
    process.exit(1)
  }
  console.log('                     (key + region accepted)')
} catch (e) {
  console.log('\ntoken endpoint     : UNREACHABLE —', e.message)
  console.log('\n→ Network egress to Azure is blocked or DNS is failing.')
  process.exit(1)
}

// 2. Full assessment against a real spoken clip.
const ffmpeg = existsSync(join(process.cwd(), 'bin', 'ffmpeg')) ? join(process.cwd(), 'bin', 'ffmpeg') : 'ffmpeg'
const dir = mkdtempSync(join(tmpdir(), 'azcheck-'))
const wavPath = join(dir, 'test.wav')
// A tone, not speech: recognition will come back NoMatch, which is fine — the
// point is to prove a full assessment round-trip completes without cancelling.
const gen = spawnSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=200:duration=2', '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', wavPath], { stdio: ['ignore', 'ignore', 'pipe'] })
if (gen.status !== 0) {
  console.log('\nffmpeg             : FAILED to create a test clip')
  console.log(gen.stderr?.toString().slice(-300))
  console.log('\n→ ffmpeg is missing or broken. Grading needs it to transcode recordings,')
  console.log('  so this alone would break the whole flow.')
  rmSync(dir, { recursive: true, force: true })
  process.exit(1)
}
console.log('ffmpeg             : OK')

const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
speechConfig.speechRecognitionLanguage = 'en-GB'
const audioConfig = sdk.AudioConfig.fromWavFileInput(readFileSync(wavPath))
const pa = sdk.PronunciationAssessmentConfig.fromJSON(JSON.stringify({
  referenceText: 'hello', gradingSystem: 'HundredMark', granularity: 'Phoneme',
  phonemeAlphabet: 'IPA', nbestPhonemeCount: 5, enableMiscue: true,
}))
const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig)
pa.applyTo(reco)

const t1 = Date.now()
const timer = setTimeout(() => {
  console.log(`\nassessment         : TIMED OUT after 25s`)
  console.log('\n→ The token endpoint works but the speech websocket never answered.')
  console.log('  Usually a proxy/firewall blocking wss://, or the region is overloaded.')
  try { reco.close() } catch {}
  rmSync(dir, { recursive: true, force: true })
  process.exit(1)
}, 25_000)

reco.recognizeOnceAsync(
  (r) => {
    clearTimeout(timer)
    const ms = Date.now() - t1
    console.log(`\nassessment         : responded in ${ms}ms`)
    console.log('reason             :', sdk.ResultReason[r.reason])
    if (r.reason === sdk.ResultReason.Canceled) {
      const c = sdk.CancellationDetails.fromResult(r)
      console.log('cancel reason      :', sdk.CancellationReason[c.reason])
      console.log('error code         :', c.ErrorCode ? sdk.CancellationErrorCode[c.ErrorCode] : '(none)')
      console.log('details            :', c.errorDetails || '(none)')
      console.log('\n→ This is the exact failure the app was silently recording as 0/100.')
    } else {
      console.log('\n→ Round-trip OK. NoMatch is expected here (the clip is a tone, not speech),')
      console.log('  so Azure is reachable and the key/region/config are all working.')
    }
    try { reco.close() } catch {}
    rmSync(dir, { recursive: true, force: true })
    process.exit(0)
  },
  (e) => {
    clearTimeout(timer)
    console.log('\nassessment         : ERROR —', String(e))
    try { reco.close() } catch {}
    rmSync(dir, { recursive: true, force: true })
    process.exit(1)
  },
)
