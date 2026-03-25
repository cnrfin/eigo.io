const WHEREBY_API = 'https://api.whereby.dev/v1'

function getApiKey() {
  const key = process.env.WHEREBY_API_KEY
  if (!key) throw new Error('Missing WHEREBY_API_KEY')
  return key
}

type CreateMeetingParams = {
  endDate: string          // ISO date string — room available until this time
  roomNamePrefix?: string  // Optional prefix for the room URL
  recording?: boolean      // Enable cloud recording
}

type WherebyMeeting = {
  meetingId: string
  roomUrl: string          // Student joins here
  hostRoomUrl: string      // Host (Connor) joins here — has host controls
  startDate: string
  endDate: string
}

/**
 * Create a unique Whereby room for a lesson.
 * Room is available from now until 1 hour after endDate.
 */
export async function createWherebyRoom({
  endDate,
  roomNamePrefix = 'eigo',
  recording = true,
}: CreateMeetingParams): Promise<WherebyMeeting> {
  const res = await fetch(`${WHEREBY_API}/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endDate,
      roomNamePrefix,
      roomMode: 'normal',
      fields: ['hostRoomUrl'],
      ...(recording && { recording: { type: 'cloud', startTrigger: 'automatic-2nd-participant', destination: { provider: 'whereby' } } }),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Whereby create room failed:', res.status, body)

    // Retry without recording config in case plan doesn't support it
    if (recording) {
      const retryRes = await fetch(`${WHEREBY_API}/meetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endDate,
          roomNamePrefix,
          roomMode: 'normal',
          fields: ['hostRoomUrl'],
        }),
      })

      if (retryRes.ok) {
        return retryRes.json()
      }

      const retryBody = await retryRes.text()
      console.error('Whereby create room retry failed:', retryRes.status, retryBody)
    }

    throw new Error(`Failed to create Whereby room: ${res.status}`)
  }

  return res.json()
}

/**
 * Delete a Whereby room when a lesson is cancelled.
 */
export async function deleteWherebyRoom(meetingId: string): Promise<void> {
  const res = await fetch(`${WHEREBY_API}/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok && res.status !== 404) {
    console.error('Whereby delete room failed:', res.status)
  }
}

type WherebyRecording = {
  recordingId: string
  roomName: string
  startDate: string
  endDate: string
  status: string
}

/**
 * Get recordings for a specific room name.
 */
export async function getRecordings(roomName: string): Promise<WherebyRecording[]> {
  const res = await fetch(`${WHEREBY_API}/recordings?roomName=${encodeURIComponent(roomName)}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok) {
    console.error('Whereby get recordings failed:', res.status)
    return []
  }

  const data = await res.json()
  return data.results || []
}

/**
 * Get a temporary download/access link for a recording.
 */
export async function getRecordingAccessLink(recordingId: string): Promise<string | null> {
  const res = await fetch(`${WHEREBY_API}/recordings/${recordingId}/access-link`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok) {
    console.error('Whereby get access link failed:', res.status)
    return null
  }

  const data = await res.json()
  return data.accessLink || null
}

// ─── Transcription helpers ───

type WherebyTranscription = {
  transcriptionId: string
  state: 'started' | 'finished' | 'ready' | 'failed'
  roomName?: string
  startDate?: string
  endDate?: string
}

/**
 * List transcriptions for a given room name.
 */
export async function getTranscriptionsByRoom(roomName: string): Promise<WherebyTranscription[]> {
  const res = await fetch(`${WHEREBY_API}/transcriptions?roomName=${encodeURIComponent(roomName)}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok) {
    console.error('Whereby list transcriptions failed:', res.status)
    return []
  }

  const data = await res.json()
  return data.results || []
}

/**
 * Request a transcription for a recording.
 * If one already exists (403), fetches the existing transcription instead.
 * Returns the transcriptionId if found or created.
 */
export async function createTranscription(recordingId: string, roomName?: string): Promise<string | null> {
  const res = await fetch(`${WHEREBY_API}/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recordingId }),
  })

  if (res.ok) {
    const data = await res.json()
    return data.transcriptionId || null
  }

  // If transcription already exists, find it
  if (res.status === 403 && roomName) {
    const existing = await getTranscriptionsByRoom(roomName)
    if (existing.length > 0) {
      return existing[0].transcriptionId
    }
  }

  const body = await res.text()
  console.error('Whereby create transcription failed:', res.status, body)
  return null
}

/**
 * Get transcription details (including state).
 */
export async function getTranscription(transcriptionId: string): Promise<WherebyTranscription | null> {
  const res = await fetch(`${WHEREBY_API}/transcriptions/${transcriptionId}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok) {
    console.error('Whereby get transcription failed:', res.status)
    return null
  }

  return res.json()
}

/**
 * Get a temporary download link for a finished transcription (.md file).
 */
export async function getTranscriptionAccessLink(transcriptionId: string): Promise<string | null> {
  const res = await fetch(`${WHEREBY_API}/transcriptions/${transcriptionId}/access-link`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok) {
    console.error('Whereby get transcription access link failed:', res.status)
    return null
  }

  const data = await res.json()
  return data.accessLink || null
}
