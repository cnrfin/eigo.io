'use client'

/**
 * Microphone recorder with automatic stop on silence (a light VAD).
 *
 * The mic (stream + AudioContext + analyser) is set up ONCE as a reusable `Mic`
 * and kept warm, so every recording starts instantly and the level analysis is
 * stable from the first attempt (a fresh stream's automatic gain control takes a
 * second or two to settle, which made early auto-stops inconsistent). Each
 * recording attaches a fresh MediaRecorder + VAD loop to the warm mic.
 */

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

export interface Mic {
  stream: MediaStream
  ctx: AudioContext
  analyser: AnalyserNode
  close(): void
}

/** Acquire + warm a reusable mic. Create once, reuse for every recording. */
export async function createMic(): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const Ac: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ac()
  if (ctx.state === 'suspended') { try { await ctx.resume() } catch { /* ignore */ } }
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  source.connect(analyser) // runs continuously so it stays warm between takes
  return {
    stream, ctx, analyser,
    close() { stream.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => {}) },
  }
}

export interface SmartRecOptions {
  silenceMs?: number   // trailing silence after speech before auto-stop
  maxMs?: number       // hard cap on total length
  noSpeechMs?: number  // give up if no speech is ever detected
  threshold?: number   // RMS level that counts as speech
  onStart?: () => void // fired the instant capture actually begins
}

/** Record from a warm mic; returns a manual stop(). `onStop` receives the clip
 *  and `hadSpeech` — false when the level never crossed the speech threshold
 *  (silent take / no speech), so callers can ask the learner to try again. */
export function startSmartRecording(mic: Mic, onStop: (blob: Blob, hadSpeech: boolean) => void, opts: SmartRecOptions = {}): () => void {
  const silenceMs = opts.silenceMs ?? 700
  const maxMs = opts.maxMs ?? 7000
  const noSpeechMs = opts.noSpeechMs ?? 5000
  const threshold = opts.threshold ?? 0.015

  const mime = pickMime()
  const mr = new MediaRecorder(mic.stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

  const analyser = mic.analyser
  const buf = new Uint8Array(analyser.fftSize)

  let stopped = false
  let raf = 0
  let heardSpeech = false // set once the level crosses the speech threshold long enough to arm
  mr.onstop = () => { cancelAnimationFrame(raf); onStop(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), heardSpeech) }
  const finish = () => {
    if (stopped) return
    stopped = true
    try { if (mr.state !== 'inactive') mr.stop() } catch { cancelAnimationFrame(raf) }
  }

  // Arm the silence-stop only after sustained speech, so a breath/click can't
  // end the clip before the word.
  const minMs = 600
  const speechArmMs = 250
  const t0 = performance.now()
  let last = t0
  let speechMs = 0
  let silenceStart = 0
  const tick = () => {
    if (stopped) return
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
    const rms = Math.sqrt(sum / buf.length)
    const now = performance.now()
    const dt = now - last
    last = now

    if (rms > threshold) { speechMs += dt; silenceStart = 0 }
    const armed = speechMs >= speechArmMs
    if (armed) heardSpeech = true
    if (armed && rms <= threshold) {
      if (!silenceStart) silenceStart = now
      else if (now - silenceStart > silenceMs && now - t0 > minMs) { finish(); return }
    }
    if (now - t0 > maxMs) { finish(); return }
    if (!armed && now - t0 > noSpeechMs) { finish(); return }
    raf = requestAnimationFrame(tick)
  }

  mr.start()
  opts.onStart?.()
  raf = requestAnimationFrame(tick)
  return finish
}
