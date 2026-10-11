import WebSocket from 'ws'
import { ACCENT_RULE } from './settings'

/**
 * Server-only helpers for OpenAI GPT-Live (model gpt-live-1).
 *   POST /v1/live/sessions                    create a WebRTC session from the browser's SDP offer
 *   POST /v1/live/sessions/{id}/hangup        end it (documented for SIP; tried first)
 *   wss  /v1/live/sessions/{id}/attach        sideband: fallback to send session.close
 * The API key never leaves the server.
 */

const API = 'https://api.openai.com/v1/live/sessions'
export const LIVE_MODEL = 'gpt-live-1'
export const BACKEND_MODEL = process.env.AI_TUTOR_BACKEND_MODEL || 'gpt-6-luna'

/** Data-channel events the browser may send. Everything else (instructions/commentary appends,
 *  session.update) is refused by OpenAI, so a student can't rewrite the tutor's rules. */
export const BROWSER_ALLOWED_EVENTS = ['response.item.create', 'response.create', 'session.thinking.append', 'session.close']

export type FunctionTool = {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
  strict?: boolean
}

function key() {
  const k = process.env.OPENAI_API_KEY
  if (!k) throw new Error('Missing OPENAI_API_KEY')
  return k
}

export async function createLiveSession(opts: {
  sdp: string
  instructions: string
  voice: string
  backendInstructions: string
  tools: FunctionTool[]
  safetyId: string
  /** earlier conversation (text messages), e.g. after a reconnect */
  input?: unknown[]
}): Promise<{ sessionId: string; sdp: string }> {
  const body = {
    session: {
      model: LIVE_MODEL,
      instructions: opts.instructions,
      ...(opts.input?.length ? { input: opts.input } : {}),
      audio: { output: { voice: opts.voice } },
      store: false,
      client: { data_channel: { allowed_client_events: BROWSER_ALLOWED_EVENTS } },
      ...(opts.tools.length ? { delegation: {
        type: 'responses',
        responses: {
          model: BACKEND_MODEL,
          instructions: opts.backendInstructions,
          tools: opts.tools,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          reasoning: { effort: 'low' },
        },
      } } : {}),
    },
    transport: { type: 'webrtc', sdp: opts.sdp },
  }
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': opts.safetyId,
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`GPT-Live session failed (${r.status}): ${text.slice(0, 300)}`)
  }
  const j = (await r.json()) as { session?: { id?: string }; transport?: { sdp?: string } }
  if (!j.session?.id || !j.transport?.sdp) throw new Error('GPT-Live session: unexpected response')
  return { sessionId: j.session.id, sdp: j.transport.sdp }
}

/** End a session from the server. Returns how it was closed, or null if it couldn't be. */
export async function endLiveSession(sessionId: string): Promise<'hangup' | 'sideband' | 'gone' | null> {
  const id = encodeURIComponent(sessionId)
  try {
    const r = await fetch(`${API}/${id}/hangup`, { method: 'POST', headers: { Authorization: `Bearer ${key()}` } })
    if (r.ok) return 'hangup'
    if (r.status === 404 || r.status === 410) {
      // Not found: either already over, or hangup isn't offered for WebRTC; try the sideband.
      const sb = await sidebandClose(sessionId)
      return sb ? 'sideband' : 'gone'
    }
  } catch {
    /* fall through to sideband */
  }
  return (await sidebandClose(sessionId)) ? 'sideband' : null
}

function sidebandClose(sessionId: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      resolve(ok)
    }
    const ws = new WebSocket(`wss://api.openai.com/v1/live/sessions/${encodeURIComponent(sessionId)}/attach`, {
      headers: { Authorization: `Bearer ${key()}` },
    })
    const timer = setTimeout(() => finish(false), timeoutMs)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'session.close', event_id: 'eigo_sweep_close' })))
    ws.on('message', (data) => {
      try {
        const ev = JSON.parse(String(data)) as { type?: string }
        if (ev.type === 'session.closed') {
          clearTimeout(timer)
          finish(true)
        }
      } catch {
        /* ignore */
      }
    })
    ws.on('error', () => {
      clearTimeout(timer)
      finish(false)
    })
    ws.on('close', () => {
      clearTimeout(timer)
      finish(done)
    })
  })
}

/**
 * Add a trusted instruction to a running session through the sideband WebSocket
 * (session.instructions.append influences what the AI tutor does and says next;
 * thinking.append, which the browser may send, is only quiet background).
 * Resolves true once OpenAI acknowledges it.
 */
export function appendInstructions(sessionId: string, content: string, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const eventId = 'eigo_' + Math.random().toString(36).slice(2, 10)
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      resolve(ok)
    }
    const ws = new WebSocket(`wss://api.openai.com/v1/live/sessions/${encodeURIComponent(sessionId)}/attach`, {
      headers: { Authorization: `Bearer ${key()}` },
    })
    const timer = setTimeout(() => finish(false), timeoutMs)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'session.instructions.append', event_id: eventId, delegation_id: null, content: content.slice(0, 1800) })))
    ws.on('message', (data) => {
      try {
        const ev = JSON.parse(String(data)) as { type?: string; client_event_id?: string; error?: { client_event_id?: string } }
        if (ev.type === 'session.instructions.appended') finish(true)
        else if (ev.type === 'error' && (!ev.error?.client_event_id || ev.error.client_event_id === eventId)) finish(false)
      } catch {
        /* ignore */
      }
    })
    ws.on('error', () => finish(false))
    ws.on('close', () => finish(false))
  })
}

/**
 * A short spoken clip in one of the voices, for the ▶ preview in the AI tutor settings.
 * Uses GPT-Live itself over a server-side WebSocket (session.start → session.output_audio.delta),
 * so the preview is the exact voice the student will hear in the lesson. GPT-Live expects a
 * live audio stream, so we feed it silence at real-time pace while it speaks.
 * Returns 24 kHz mono 16-bit PCM.
 */
export function speakSample(voice: string, line: string, timeoutMs = 25000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = []
    let done = false
    let started = false
    let lastAudio = 0
    const silence = Buffer.alloc(4800).toString('base64') // 100 ms of 24 kHz PCM16
    const finish = (err?: Error) => {
      if (done) return
      done = true
      clearTimeout(timer)
      clearInterval(pump)
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'session.close' }))
        setTimeout(() => ws.close(), 1500)
      } catch {
        /* ignore */
      }
      if (err && !parts.length) reject(err)
      else if (!parts.length) reject(new Error('No audio returned'))
      else resolve(Buffer.concat(parts))
    }
    const ws = new WebSocket('wss://api.openai.com/v1/live/sessions', { headers: { Authorization: `Bearer ${key()}` } })
    const timer = setTimeout(() => finish(new Error('Timed out')), timeoutMs)
    const pump = setInterval(() => {
      if (!started || ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ type: 'session.input_audio.append', audio: silence }))
      // GPT-Live has no output-done event on the WebSocket: stop after 1.2 s without new audio
      if (parts.length && Date.now() - lastAudio > 1200) finish()
    }, 100)
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          type: 'session.start',
          session: {
            model: LIVE_MODEL,
            instructions: `${ACCENT_RULE} You are recording a short voice sample. As soon as the session starts, without waiting for the user, say exactly this, warmly and at a relaxed, natural pace, then stop and stay silent: "${line}"`,
            audio: { format: { type: 'audio/pcm', rate: 24000 }, output: { voice } },
            store: false,
          },
        }),
      )
    })
    ws.on('message', (data) => {
      let ev: { type?: string; delta?: string; error?: { message?: string } }
      try {
        ev = JSON.parse(String(data))
      } catch {
        return
      }
      if (ev.type === 'session.started') started = true
      else if (ev.type === 'session.output_audio.delta' && ev.delta) {
        parts.push(Buffer.from(ev.delta, 'base64'))
        lastAudio = Date.now()
      } else if (ev.type === 'session.closed') finish()
      else if (ev.type === 'error') finish(new Error(ev.error?.message || 'GPT-Live error'))
    })
    ws.on('error', (e) => finish(e instanceof Error ? e : new Error(String(e))))
    ws.on('close', () => finish(new Error('Closed before audio')))
  })
}

/** Wrap 24 kHz mono 16-bit PCM in a WAV header. */
export function pcmToWav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + pcm.length, 4)
  h.write('WAVE', 8)
  h.write('fmt ', 12)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}
