/**
 * Expo Push Notification sender
 *
 * Sends push notifications to iOS/Android devices via Expo's push service.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export type ExpoPushMessage = {
  to: string                         // Expo push token
  title?: string
  body: string
  data?: Record<string, unknown>     // custom payload (e.g. { screen: 'lesson', id: '...' })
  sound?: 'default' | null
  badge?: number
  categoryId?: string
}

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error: string } }

/**
 * Send push notifications to one or more Expo push tokens.
 * Automatically chunks into batches of 100 (Expo limit).
 */
export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return []

  const tickets: ExpoPushTicket[] = []

  // Expo accepts up to 100 messages per request
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(process.env.EXPO_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(chunk),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('[ExpoPush] API error:', res.status, text)
        // Push error tickets for this chunk
        chunk.forEach(() =>
          tickets.push({ status: 'error', message: `HTTP ${res.status}: ${text}` }),
        )
        continue
      }

      const json = await res.json()
      const data = json.data as ExpoPushTicket[]
      tickets.push(...data)

      // Log any errors
      data.forEach((ticket, idx) => {
        if (ticket.status === 'error') {
          console.error(`[ExpoPush] Error for token ${chunk[idx].to}:`, ticket.message, ticket.details)
        }
      })
    } catch (err) {
      console.error('[ExpoPush] Network error:', err)
      chunk.forEach(() =>
        tickets.push({ status: 'error', message: 'Network error' }),
      )
    }
  }

  return tickets
}

/**
 * Helper: send a push notification to a single user by their tokens.
 * Sends to ALL registered tokens for the user (they may have multiple devices).
 */
export async function sendPushToUser(
  tokens: string[],
  notification: { title?: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (tokens.length === 0) return

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
  }))

  await sendExpoPushNotifications(messages)
}
