import WebSocket from 'ws'

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
}): Promise<{ sessionId: string; sdp: string }> {
  const body = {
    session: {
      model: LIVE_MODEL,
      instructions: opts.instructions,
      audio: { output: { voice: opts.voice } },
      store: false,
      client: { data_channel: { allowed_client_events: BROWSER_ALLOWED_EVENTS } },
      delegation: {
        type: 'responses',
        responses: {
          model: BACKEND_MODEL,
          instructions: opts.backendInstructions,
          tools: opts.tools,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          reasoning: { effort: 'low' },
        },
      },
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
